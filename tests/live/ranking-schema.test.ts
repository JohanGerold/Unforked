import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { expect, it, vi } from 'vitest';
import { createModel } from '../../apps/api/src/ai/provider';
import { rankSchema } from '../../apps/api/src/search/recommend';

it.skipIf(process.env.UNFORKED_LIVE_SMOKE !== '1')('ranking schema accepts a minimal public fixture', async () => {
  const config = parseEnv(readFileSync('apps/api/.dev.vars', 'utf8'));
  const actualFetch = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await actualFetch(input, init);
    if (!response.ok) {
      const payload = await response.clone().json();
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      writeFileSync('.superpowers/sdd/2026-11-01-private-beta/provider-rejection.json', JSON.stringify({ request: body, error: payload.error }, null, 2));
      console.log(JSON.stringify({ status: response.status, error: payload.error }));
    }
    return response;
  });
  try {
    const schema = rankSchema;
    const result = await createModel(config.GOOGLE_GENERATIVE_AI_API_KEY, config.AI_MODEL).generate(schema, 'Return no matches, noStrongMatch true, limitations: ["Schema compatibility probe using no repository evidence"].');
    expect(schema.parse(result).matches).toEqual([]);
  } finally { vi.unstubAllGlobals(); }
});
