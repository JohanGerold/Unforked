import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';

const root = new URL('../', import.meta.url);
const config = JSON.parse(readFileSync(new URL('apps/api/wrangler.beta.jsonc', root), 'utf8'));
const identity = JSON.parse(readFileSync(new URL('apps/extension/beta-identity.json', root), 'utf8'));
const fail = message => { throw new Error(`Beta preflight: ${message}`); };
const vars = config.vars;
if (!Number.isSafeInteger(Number(vars.GITHUB_REQUEST_LIMIT)) || Number(vars.GITHUB_REQUEST_LIMIT) < 1 || Number(vars.GITHUB_REQUEST_LIMIT) > 40) fail('Use at most 40 GitHub requests per beta action to reserve Workers Free subrequests for authentication and AI.');
if (vars.ENVIRONMENT !== 'production' || vars.BETA_ACCESS !== 'invite-only') fail('Production and invite-only settings are required.');
if (!['demo', 'live'].includes(vars.MODE)) fail('Invalid mode.');
const derived = createHash('sha256').update(Buffer.from(identity.publicKey, 'base64')).digest('hex').slice(0, 32).replace(/[0-9a-f]/g, digit => String.fromCharCode(97 + parseInt(digit, 16)));
if (identity.extensionId !== derived || vars.EXTENSION_ID !== derived) fail('Extension identities do not match.');
if (!config.d1_databases?.some(db => db.binding === 'DB' && /^[\da-f-]{36}$/.test(db.database_id))) fail('DB binding is required.');
for (const key of ['GOOGLE_GENERATIVE_AI_API_KEY', 'GITHUB_CLIENT_SECRET', 'TOKEN_ENCRYPTION_KEY', 'GITHUB_TOKEN']) if (key in vars) fail(`${key} must be a secret, not a config variable.`);
for (const key of ['AI_INPUT_USD_PER_MILLION', 'AI_OUTPUT_USD_PER_MILLION', 'DAILY_LIMIT', 'MONTHLY_BUDGET_MICRODOLLARS', 'ACTION_RESERVATION_MICRODOLLARS']) if (!(Number(vars[key]) > 0)) fail(`${key} must be positive.`);
if (vars.API_ORIGIN) { const url = new URL(vars.API_ORIGIN); if (url.protocol !== 'https:' || url.origin !== vars.API_ORIGIN || url.username || url.password) fail('API_ORIGIN must be an exact HTTPS origin.'); }
if (vars.MODE === 'live' && (!vars.API_ORIGIN || !vars.GITHUB_CLIENT_ID || !vars.AI_MODEL)) fail('Live configuration is incomplete.');
if (process.argv.includes('--manifest')) {
  if (!vars.API_ORIGIN) fail('Set the actual API origin before packaging.');
  const manifest = JSON.parse(readFileSync(new URL('apps/extension/.output/chrome-mv3/manifest.json', root), 'utf8'));
  if (manifest.key !== identity.publicKey || manifest.manifest_version !== 3) fail('Built identity/manifest version mismatch.');
  const expected = ['https://github.com/*', `${vars.API_ORIGIN}/*`].sort();
  if (JSON.stringify([...manifest.host_permissions].sort()) !== JSON.stringify(expected)) fail('Built hosts do not match the beta API and GitHub.');
  if (manifest.permissions.some(permission => !['sidePanel', 'storage', 'contextMenus', 'identity'].includes(permission))) fail('Unexpected extension permission.');
}
console.log(`Beta preflight passed: ${config.name}, ${vars.MODE}, ${derived}`);
