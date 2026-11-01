import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { Readable } from 'node:stream';
import { createGateway } from './gateway';

const local = parseEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8'));
const gateway = createGateway({ token: local.LOCAL_AI_KEY || '' });
const server = createServer(async (incoming, outgoing) => {
  const controller = new AbortController();
  outgoing.on('close', () => { if (!outgoing.writableEnded) controller.abort(); });
  try {
    const headers = new Headers(); for (const [name, value] of Object.entries(incoming.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(',') : value);
    const body = ['GET', 'HEAD'].includes(incoming.method || 'GET') ? undefined : Readable.toWeb(incoming);
    const request = new Request(`http://127.0.0.1:11435${incoming.url || '/'}`, { method: incoming.method, headers, body, duplex: 'half', signal: controller.signal } as RequestInit);
    const response = await gateway.fetch(request);
    outgoing.writeHead(response.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...Object.fromEntries(response.headers) });
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { if (!outgoing.headersSent) outgoing.writeHead(503, { 'Content-Type': 'application/json' }); outgoing.end('{"error":{"code":"LOCAL_AI_OFFLINE","userMessage":"The local AI gateway could not finish."}}'); }
});
server.headersTimeout = 15000; server.requestTimeout = 125000;
server.listen(11435, '127.0.0.1', () => console.log('Unforked local AI gateway listening on 127.0.0.1:11435.'));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { server.close(); server.closeAllConnections(); });
