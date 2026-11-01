import { expect, it, vi } from 'vitest';
import { createGateway } from '../../apps/local-ai/src/gateway';
import { imageFixture, visionAnswer } from '../helpers/vision';
const token = 'a'.repeat(64);
const body = () => ({ requestId: crypto.randomUUID(), image: imageFixture(), prompt: 'Explain only the circled image.', schema: { type: 'object' }, maxOutputTokens: 900 });
const request = (input = body(), key = token, path = 'vision') => new Request(`http://127.0.0.1:11435/v1/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify(input) });
const result = () => Response.json({ model: 'qwen3.5:4b', done: true, done_reason: 'stop', prompt_eval_count: 500, eval_count: 100, message: { content: JSON.stringify(visionAnswer) } });
it('authenticates images before inference and forwards only the bounded local image to Ollama', async () => {
  const fetcher = vi.fn(async (url, init) => {
    expect(String(url)).toBe('http://127.0.0.1:11434/api/chat'); const data = JSON.parse(String(init?.body));
    expect(data).toMatchObject({ model: 'qwen3.5:4b', think: false, options: { num_ctx: 32768, num_predict: 900 } });
    expect(data.messages[0].images).toEqual([imageFixture().data]); expect(JSON.stringify(init)).not.toContain(token); return result();
  });
  const gateway = createGateway({ token, fetcher });
  expect((await gateway.fetch(request(body(), 'b'.repeat(64)))).status).toBe(401); expect(fetcher).not.toHaveBeenCalled();
  expect((await gateway.fetch(request())).status).toBe(200); expect(fetcher).toHaveBeenCalledTimes(1);
});
it('shares one generation slot between text and vision and refuses invalid image dimensions', async () => {
  let release!: () => void; let calls = 0;
  const gateway = createGateway({ token, fetcher: async () => { calls++; if (calls === 1) await new Promise<void>(done => { release = done; }); return result(); } });
  const input = body(); const text = { requestId: input.requestId, prompt: input.prompt, schema: input.schema, maxOutputTokens: input.maxOutputTokens };
  const first = gateway.fetch(request(text as any, token, 'generate')); await vi.waitFor(() => expect(calls).toBe(1));
  const second = gateway.fetch(request()); await new Promise(done => setTimeout(done, 10)); expect(calls).toBe(1);
  release(); expect((await first).status).toBe(200); expect((await second).status).toBe(200);
  const invalid = await gateway.fetch(request({ ...body(), image: { ...imageFixture(), width: 2000 } }));
  expect(invalid.status).toBe(400); expect(calls).toBe(2);
});
