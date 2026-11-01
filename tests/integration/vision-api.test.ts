import { afterEach, expect, it, vi } from 'vitest';
import { app } from '../../apps/api/src/index';
import { visionAnswer, visionInput } from '../helpers/vision';
afterEach(() => vi.unstubAllGlobals());
const env = { MODE: 'live', ENVIRONMENT: 'development', AI_PROVIDER: 'ollama', LOCAL_AI_ORIGIN: 'https://gateway.example.test', LOCAL_AI_KEY: 'a'.repeat(64), GITHUB_REQUEST_LIMIT: '40' };
const post = (input: unknown, config = env, hosted = false) => app.request(`${hosted ? 'https://api.example.test' : 'http://127.0.0.1'}/v1/vision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }, config);
it('requires hosted authentication and never sends private repo captures to the model', async () => {
  const fetcher = vi.fn(async () => Response.json({ private: true })); vi.stubGlobal('fetch', fetcher);
  expect((await post(visionInput(), { ...env, ENVIRONMENT: 'production' }, true)).status).toBe(401); expect(fetcher).not.toHaveBeenCalled();
  expect((await post(visionInput())).status).toBe(400); expect(fetcher).toHaveBeenCalledTimes(1);
});
it('verifies the public repo and uses only the authenticated local image endpoint', async () => {
  const urls: string[] = [];
  vi.stubGlobal('fetch', async (url: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(url)); if (String(url).startsWith('https://api.github.com/')) return Response.json({ private: false });
    expect(String(url)).toBe('https://gateway.example.test/v1/vision'); const input = JSON.parse(String(init?.body));
    expect(input.maxOutputTokens).toBe(900); expect(input.image.width).toBe(640); expect(init?.redirect).toBe('manual');
    return Response.json({ requestId: input.requestId, model: 'qwen3.5:4b', data: visionAnswer, usage: { inputTokens: 500, outputTokens: 100 } });
  });
  const response = await post(visionInput()); expect(response.status).toBe(200); const body = await response.json();
  expect(body.data).toEqual(visionAnswer); expect(body.aiProvider).toBe('ollama'); expect(urls).toHaveLength(2);
});
it('does not substitute Gemini for visual explanations and keeps text body limits intact', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect((await post(visionInput(), { ...env, AI_PROVIDER: 'gemini' })).status).toBe(503); expect(fetcher).not.toHaveBeenCalled();
  const input = { ...visionInput(), image: { ...visionInput().image, data: 'a'.repeat(350001) } };
  expect((await post(input)).status).toBe(413);
  const text = await app.request('http://127.0.0.1/v1/search', { method: 'POST', body: JSON.stringify({ requestId: crypto.randomUUID(), request: 'x'.repeat(65000) }) }, env); expect(text.status).toBe(413);
});
