import { expect, it } from 'vitest';
import { gatewaySecrets, parseTunnelOrigin, validateLocalKey, redact } from '../../scripts/local-ai.mjs';
it('accepts only the configured local credential shape without echoing malformed secrets', () => {
  expect(() => validateLocalKey('private-short-secret')).toThrow('64 hexadecimal');
  expect(validateLocalKey('a'.repeat(64))).toBe('a'.repeat(64));
});
it('extracts a Quick Tunnel HTTPS origin and rejects deceptive origins', () => {
  expect(parseTunnelOrigin('Your URL: https://example-gateway.trycloudflare.com')).toBe('https://example-gateway.trycloudflare.com');
  expect(parseTunnelOrigin('https://example.trycloudflare.com.attacker.test')).toBe(null);
  expect(() => gatewaySecrets('http://example.trycloudflare.com', 'a'.repeat(64))).toThrow();
});
it('keeps the service credential in the protected payload and redacts provider-tool output', () => {
  const key = 'b'.repeat(64), origin = 'https://example-gateway.trycloudflare.com';
  expect(JSON.parse(gatewaySecrets(origin, key))).toEqual({ LOCAL_AI_ORIGIN: origin, LOCAL_AI_KEY: key });
  expect(redact(`Tool error ${key}`, key)).toBe('Tool error [redacted]');
});
