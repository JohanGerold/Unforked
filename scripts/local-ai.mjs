import { createHash, randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { request as httpsRequest } from 'node:https';
import { lookup } from 'node:dns';
import { Resolver } from 'node:dns/promises';
import { Buffer } from 'node:buffer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(root, 'apps/local-ai/.env');
const toolsDir = resolve(root, '.local-tools');
const tunnelExe = resolve(toolsDir, 'cloudflared.exe');
const runtimeFile = resolve(root, '.superpowers/local-ai/runtime.json');
export function validateLocalKey(key) {
  if (!/^[a-f\d]{64}$/i.test(key || '')) throw new Error('LOCAL_AI_KEY must contain 64 hexadecimal characters. Keep it in the ignored local config.');
  return key;
}
export function parseTunnelOrigin(text) {
  return text.match(/https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.trycloudflare\.com(?=$|[\s/|])/i)?.[0] || null;
}
export function gatewaySecrets(origin, key) {
  const url = new URL(origin);
  if (url.origin !== origin || url.protocol !== 'https:' || !/^[a-z0-9-]+\.trycloudflare\.com$/i.test(url.hostname)) throw new Error('Expected an exact HTTPS Quick Tunnel origin.');
  return JSON.stringify({ LOCAL_AI_ORIGIN: origin, LOCAL_AI_KEY: validateLocalKey(key) });
}
export function redact(text, key) { return String(text).split(key).join('[redacted]'); }
const delay = ms => new Promise(done => setTimeout(done, ms));
// Some home DNS resolvers return NXDOMAIN for new Quick Tunnel names. Only this
// launcher's TLS health probe can fall back to public DNS; OS settings stay intact.
export function healthLookup(hostname, options, callback) {
  lookup(hostname, options, async (error, address, family) => {
    if (error?.code !== 'ENOTFOUND' || !/^[a-z0-9-]+\.trycloudflare\.com$/i.test(hostname)) return callback(error, address, family);
    try {
      const resolver = new Resolver({ timeout: 2000, tries: 1 }); resolver.setServers(['1.1.1.1', '1.0.0.1']);
      const addresses = await resolver.resolve4(hostname);
      callback(null, options.all ? addresses.map(address => ({ address, family: 4 })) : addresses[0], 4);
    } catch { callback(error); }
  });
}
async function healthResponse(origin, key) {
  if (origin.startsWith('http://127.0.0.1:')) return fetch(`${origin}/health`, { headers: { Authorization: `Bearer ${key}` }, redirect: 'manual', signal: AbortSignal.timeout(4000) });
  gatewaySecrets(origin, key);
  return new Promise((done, reject) => {
    const request = httpsRequest(`${origin}/health`, { headers: { Authorization: `Bearer ${key}` }, lookup: healthLookup, signal: AbortSignal.timeout(5000) }, response => {
      const chunks = []; let size = 0;
      response.on('data', chunk => { size += chunk.length; if (size > 4096) request.destroy(new Error('Health response too large')); else chunks.push(chunk); });
      response.on('end', () => done(new Response(Buffer.concat(chunks), { status: response.statusCode })));
      response.on('error', reject);
    });
    request.on('error', reject); request.end();
  });
}
async function keyFromFile() { return validateLocalKey(parseEnv(await readFile(envFile, 'utf8')).LOCAL_AI_KEY); }
async function init() {
  try { await access(envFile); await keyFromFile(); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeFile(envFile, `LOCAL_AI_KEY=${randomBytes(32).toString('hex')}\n`, { flag: 'wx', mode: 0o600 });
  }
  console.log('Local AI credential is configured in the ignored gateway .env.');
}
async function installTools() {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('This portable installer supports Windows x64 only.');
  await mkdir(toolsDir, { recursive: true });
  const response = await fetch('https://api.github.com/repos/cloudflare/cloudflared/releases/latest', { headers: { 'User-Agent': 'Unforked-local-ai', Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Could not read the official cloudflared release.');
  const release = await response.json(); const asset = release.assets.find(item => item.name === 'cloudflared-windows-amd64.exe');
  if (!asset || !/^sha256:[a-f\d]{64}$/i.test(asset.digest || '') || !asset.browser_download_url.startsWith('https://github.com/cloudflare/cloudflared/releases/download/')) throw new Error('Official release checksum is missing; installation stopped.');
  const download = await fetch(asset.browser_download_url, { signal: AbortSignal.timeout(180000) });
  if (!download.ok || !download.body) throw new Error('Could not download official cloudflared.');
  const temp = resolve(toolsDir, 'cloudflared.download'); const hash = createHash('sha256');
  try {
    await pipeline(Readable.fromWeb(download.body), new Transform({ transform(chunk, _encoding, callback) { hash.update(chunk); callback(null, chunk); } }), createWriteStream(temp));
    if (`sha256:${hash.digest('hex')}` !== asset.digest.toLowerCase()) throw new Error('cloudflared checksum verification failed.');
    await rename(temp, tunnelExe);
    await writeFile(resolve(toolsDir, 'cloudflared-release.json'), JSON.stringify({ version: release.tag_name, sha256: asset.digest, source: asset.browser_download_url }, null, 2));
    console.log(`Verified official cloudflared ${release.tag_name}.`);
  } finally { await rm(temp, { force: true }); }
}
async function ready(origin, key, attempts = 1) {
  let failure = 'No response';
  for (let index = 0; index < attempts; index++) {
    try {
      const response = await healthResponse(origin, key);
      const data = await response.json();
      if (response.ok && data.ready === true && data.model === 'qwen3.5:4b') return;
      failure = `HTTP ${response.status}`;
    } catch (error) { const code = error.cause?.code || error.code; failure = /^[A-Z_0-9]{1,60}$/.test(code || '') ? code : error.name; }
    if (index + 1 < attempts) await delay(1000);
  }
  throw new Error(`The authenticated local AI health check failed at ${origin} (${failure}). Start Ollama and check the tunnel connection.`);
}
async function sync(origin, key) {
  const payload = gatewaySecrets(origin, key); await ready(origin, key);
  await new Promise((done, reject) => {
    const child = spawn(process.execPath, [resolve(root, 'node_modules/wrangler/bin/wrangler.js'), 'secret', 'bulk', '--config', 'apps/api/wrangler.beta.jsonc'], { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = ''; const collect = chunk => { output = (output + redact(chunk.toString(), key)).slice(-12000); };
    child.stdout.on('data', collect); child.stderr.on('data', collect); child.on('error', reject);
    child.on('close', code => code === 0 ? done() : reject(new Error(`Worker secret sync failed. ${redact(output, key)}`)));
    child.stdin.on('error', () => {}); child.stdin.end(payload);
  });
  console.log('Authenticated gateway connection synced to the beta Worker. Provider selection is unchanged.');
}
async function share(noSync) {
  const key = await keyFromFile(); await access(tunnelExe);
  // Never adopt an unrelated listener: this launcher owns the processes it stops.
  try { await fetch('http://127.0.0.1:11435/health', { signal: AbortSignal.timeout(1000) }); throw new Error('Port 11435 is already occupied. Stop the previous gateway first.'); }
  catch (error) { if (error.message.startsWith('Port ')) throw error; }
  const children = []; let stopped = false;
  const stop = () => { if (stopped) return; stopped = true; for (const child of children) child.kill(); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    const gateway = spawn(process.execPath, [resolve(root, 'apps/local-ai/dist/server.js')], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); children.push(gateway);
    let gatewayError = ''; gateway.stderr.on('data', chunk => { gatewayError = redact(chunk.toString(), key).slice(-2000); });
    const gatewayExit = new Promise((_, reject) => { gateway.once('error', reject); gateway.once('exit', () => reject(new Error(`Gateway stopped. ${gatewayError}`))); });
    await Promise.race([ready('http://127.0.0.1:11435', key, 15), gatewayExit]);
    const tunnel = spawn(tunnelExe, ['tunnel', '--no-autoupdate', '--protocol', 'http2', '--url', 'http://127.0.0.1:11435'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); children.push(tunnel);
    let tunnelLog = '';
    const origin = await Promise.race([new Promise((done, reject) => {
      const timer = setTimeout(() => reject(new Error('Quick Tunnel did not start within 45 seconds.')), 45000);
      const collect = chunk => { tunnelLog = (tunnelLog + chunk.toString()).slice(-16000); const url = parseTunnelOrigin(tunnelLog); if (url) { clearTimeout(timer); done(url); } };
      tunnel.stdout.on('data', collect); tunnel.stderr.on('data', collect);
      tunnel.once('error', error => { clearTimeout(timer); reject(error); });
      tunnel.once('exit', () => { clearTimeout(timer); reject(new Error('Quick Tunnel stopped before connecting.')); });
    }), gatewayExit]);
    await mkdir(dirname(runtimeFile), { recursive: true });
    await writeFile(resolve(dirname(runtimeFile), 'tunnel-start.log'), redact(tunnelLog, key));
    await ready(origin, key, 20);
    await mkdir(dirname(runtimeFile), { recursive: true });
    await writeFile(runtimeFile, JSON.stringify({ origin, startedAt: new Date().toISOString(), gatewayPid: gateway.pid, tunnelPid: tunnel.pid }, null, 2));
    if (!noSync) await sync(origin, key);
    console.log(`Local AI is shared through ${origin}\nKeep this terminal and Ollama running. Ctrl+C stops sharing. No automatic cloud fallback.`);
    await new Promise((done, reject) => {
      for (const child of children) child.once('exit', () => stopped ? done() : reject(new Error('A local AI process stopped; sharing is offline.')));
    });
  } finally { stop(); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
}
async function main() {
  const command = process.argv[2];
  if (command === 'init') await init();
  else if (command === 'install-tools') await installTools();
  else if (command === 'share') await share(process.argv.includes('--no-sync'));
  else if (command === 'sync') { const { origin } = JSON.parse(await readFile(runtimeFile, 'utf8')); await sync(origin, await keyFromFile()); }
  else throw new Error('Use init, install-tools, share [--no-sync], or sync.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
