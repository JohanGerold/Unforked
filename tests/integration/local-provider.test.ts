import { expect, it } from 'vitest';
import { z } from 'zod';
import { createConfiguredModel } from '../../apps/api/src/ai/configured-provider';
import type { Env } from '../../apps/api/src/env';
const env = { AI_PROVIDER: 'ollama', LOCAL_AI_ORIGIN: 'https://gateway.example.test', LOCAL_AI_KEY: 'a'.repeat(64), GOOGLE_GENERATIVE_AI_API_KEY: 'must-not-be-used', AI_MODEL: 'gemini-3.5-flash-lite' } as Env;
it('uses only the configured gateway, bounds tokens and checks schema/request identity', async () => {
  const model = createConfiguredModel(env, undefined, async (url, init) => {
    expect(String(url)).toBe('https://gateway.example.test/v1/generate'); expect(init?.redirect).toBe('manual');
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${env.LOCAL_AI_KEY}`);
    const body = JSON.parse(String(init?.body)); expect(body.maxOutputTokens).toBe(1200);
    return Response.json({ requestId: body.requestId, model: 'qwen3.5:4b', data: { purpose: 'Grounded tool' }, usage: { inputTokens: 50, outputTokens: 20 } });
  });
  expect(await model.generate(z.object({ purpose: z.string() }), 'Supplied public evidence')).toEqual({ purpose: 'Grounded tool' });
});
it('missing local configuration and unknown providers fail closed', () => {
  expect(() => createConfiguredModel({ ...env, LOCAL_AI_KEY: '' })).toThrow();
  expect(() => createConfiguredModel({ ...env, LOCAL_AI_ORIGIN: 'http://outside.example.test' })).toThrow();
  expect(() => createConfiguredModel({ ...env, AI_PROVIDER: 'unknown' })).toThrow();
});
it('offline, busy, redirects and invalid outputs never fall back to Google', async () => {
  for (const fixture of [new Response(null, { status: 302, headers: { Location: 'https://outside.example.test' } }), Response.json({ error: { code: 'LOCAL_AI_BUSY' } }, { status: 429 }), Response.json({ data: { purpose: 'no identity' } })]) {
    let calls = 0;
    const model = createConfiguredModel(env, undefined, async url => { calls++; expect(String(url).startsWith(env.LOCAL_AI_ORIGIN!)).toBe(true); return fixture; });
    await expect(model.generate(z.object({ purpose: z.string() }), 'Public evidence')).rejects.toBeDefined(); expect(calls).toBe(1);
  }
});
it('a cancelled request does not start gateway inference', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  const model = createConfiguredModel(env, controller.signal, async () => { calls++; throw new Error('should not run'); });
  await expect(model.generate(z.object({ ok: z.boolean() }), 'Public evidence')).rejects.toBeDefined(); expect(calls).toBe(0);
});
