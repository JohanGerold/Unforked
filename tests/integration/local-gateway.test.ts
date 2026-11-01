import { expect, it, vi } from 'vitest';
import { createGateway } from '../../apps/local-ai/src/gateway';

const token = 'a'.repeat(64);
const payload = () => ({ requestId: crypto.randomUUID(), prompt: 'Return a grounded purpose from the supplied evidence.', schema: { type: 'object', properties: { purpose: { type: 'string' } }, required: ['purpose'], additionalProperties: false }, maxOutputTokens: 1200 });
function request(body = payload(), signal?: AbortSignal, key = token) { return new Request('http://127.0.0.1:11435/v1/generate', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }); }
const answer = () => Response.json({ model: 'qwen3.5:4b', message: { content: '{"purpose":"Public Python tool"}' }, done: true, done_reason: 'stop', prompt_eval_count: 50, eval_count: 20 });

it('rejects unknown credentials before contacting Ollama', async () => {
  const fetcher = vi.fn(async () => answer()); const gateway = createGateway({ token, fetcher });
  expect((await gateway.fetch(request(payload(), undefined, 'b'.repeat(64)))).status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});
it('rejects oversized or arbitrary-model requests before inference', async () => {
  const fetcher = vi.fn(async () => answer()); const gateway = createGateway({ token, fetcher });
  expect((await gateway.fetch(request({ ...payload(), prompt: 'x'.repeat(65000) }))).status).toBe(413);
  expect((await gateway.fetch(request({ ...payload(), model: 'arbitrary-model' } as any))).status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
it('forwards only bounded generation options to the fixed local model', async () => {
  const gateway = createGateway({ token, fetcher: async (url, init) => {
    expect(String(url)).toBe('http://127.0.0.1:11434/api/chat');
    expect(init?.redirect).toBe('manual');
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({ model: 'qwen3.5:4b', stream: false, think: false, options: { num_ctx: 32768, num_predict: 1200 } });
    expect(JSON.stringify(init)).not.toContain(token);
    return answer();
  } });
  const body = payload(); const response = await gateway.fetch(request(body));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ requestId: body.requestId, data: { purpose: 'Public Python tool' }, usage: { inputTokens: 50, outputTokens: 20 } });
});
it('runs one generation, queues two and rejects overflow without an extra Ollama call', async () => {
  const release: (() => void)[] = []; let calls = 0;
  const gateway = createGateway({ token, fetcher: async () => { calls++; await new Promise<void>(resolve => release.push(resolve)); return answer(); } });
  const first = gateway.fetch(request()); await vi.waitFor(() => expect(calls).toBe(1));
  const second = gateway.fetch(request()), third = gateway.fetch(request());
  await new Promise(resolve => setTimeout(resolve, 10));
  const fourth = await gateway.fetch(request());
  expect(fourth.status).toBe(429); expect(fourth.headers.get('Retry-After')).toBe('15'); expect(calls).toBe(1);
  release.shift()!(); expect((await first).status).toBe(200);
  await vi.waitFor(() => expect(calls).toBe(2)); release.shift()!(); expect((await second).status).toBe(200);
  await vi.waitFor(() => expect(calls).toBe(3)); release.shift()!(); expect((await third).status).toBe(200);
});
it('never starts cancelled queued work', async () => {
  let release!: () => void; let calls = 0;
  const gateway = createGateway({ token, fetcher: async () => { calls++; await new Promise<void>(resolve => { release = resolve; }); return answer(); } });
  const first = gateway.fetch(request()); await vi.waitFor(() => expect(calls).toBe(1));
  const controller = new AbortController(); const queued = gateway.fetch(request(payload(), controller.signal));
  await new Promise(resolve => setTimeout(resolve, 10)); controller.abort();
  expect((await queued).status).toBe(499); release(); await first; expect(calls).toBe(1);
});
it('propagates deadlines to inference and rejects truncated or redirected outputs', async () => {
  const timeoutGateway = createGateway({ token, timeoutMs: 20, fetcher: async (_url, init) => new Promise((_resolve, reject) => { init!.signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true }); }) });
  const timedOut = await timeoutGateway.fetch(request()); expect(timedOut.status).toBe(503); expect((await timedOut.json()).error.code).toBe('LOCAL_AI_TIMEOUT');
  for (const fixture of [new Response(null, { status: 302, headers: { Location: 'https://outside.example.test' } }), Response.json({ done_reason: 'length', message: { content: '{"purpose":"unfinished' } })]) {
    const gateway = createGateway({ token, fetcher: async () => fixture });
    expect((await gateway.fetch(request())).status).toBeGreaterThanOrEqual(400);
  }
});
