import { createHash, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../apps/extension/beta-identity.json', import.meta.url);
const derive = key => createHash('sha256').update(Buffer.from(key, 'base64')).digest('hex').slice(0, 32).replace(/[0-9a-f]/g, hex => String.fromCharCode(97 + parseInt(hex, 16)));
if (!existsSync(file)) {
  // Only the public identity is persisted. Unpacked beta installs need no signing key.
  const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const key = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  writeFileSync(file, JSON.stringify({ publicKey: key, extensionId: derive(key) }, null, 2) + '\n', { flag: 'wx' });
}
const identity = JSON.parse(readFileSync(file, 'utf8'));
createPublicKey({ key: Buffer.from(identity.publicKey, 'base64'), format: 'der', type: 'spki' });
if (identity.extensionId !== derive(identity.publicKey)) throw new Error('Beta identity does not match its public key.');
console.log(`Beta extension ID: ${identity.extensionId}`);
