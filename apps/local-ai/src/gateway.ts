import { timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { AppError, LOCAL_BODY_LIMIT, LOCAL_CONTEXT, LOCAL_MODEL, LocalGenerateSchema, PayloadError, readBoundedJson } from '@unforked/contracts';
import { SerialQueue } from './queue';

export function createGateway(options: { token: string; fetcher?: typeof fetch; timeoutMs?: number }) {
  if (!/^[a-f\d]{64}$/i.test(options.token)) throw new Error('Configure a random 64-hex-character LOCAL_AI_KEY before starting the gateway.');
  const fetcher = options.fetcher || globalThis.fetch; const queue = new SerialQueue(); const inFlight = new Set<string>();
  return { async fetch(request: Request): Promise<Response> {
    const provided = request.headers.get('Authorization')?.match(/^Bearer ([a-f\d]{64})$/i)?.[1];
    if (!provided || !timingSafeEqual(Buffer.from(provided), Buffer.from(options.token))) return Response.json({ error: { code: 'AUTH_REQUIRED', userMessage: 'Gateway authorization is required.' } }, { status: 401 });
    const timeout = new AbortController(); const timer = setTimeout(() => timeout.abort(), options.timeoutMs ?? 120000);
    const signal = AbortSignal.any([request.signal, timeout.signal]); let requestId: string | undefined;
    try {
      const path = new URL(request.url).pathname;
      if (path === '/health' && request.method === 'GET') {
        const response = await fetcher('http://127.0.0.1:11434/api/tags', { signal, redirect: 'manual' });
        if (!response.ok) throw new Error('Ollama unavailable');
        const tags = await readBoundedJson(response, 128000);
        if (!tags.models?.some((model: any) => model.name === LOCAL_MODEL)) throw new Error('Model missing');
        return Response.json({ ready: true, model: LOCAL_MODEL, active: queue.active, queued: queue.pending });
      }
      if (path !== '/v1/generate' || request.method !== 'POST') return Response.json({ error: { code: 'NOT_FOUND', userMessage: 'Unknown gateway action.' } }, { status: 404 });
      const parsed = LocalGenerateSchema.safeParse(await readBoundedJson(request, LOCAL_BODY_LIMIT));
      if (!parsed.success) throw new AppError('INVALID_INPUT', 'Check the local analysis request and its size.', 400);
      const input = parsed.data; requestId = input.requestId;
      if (inFlight.has(requestId)) { requestId = undefined; throw new AppError('DUPLICATE_REQUEST', 'This generation is already running.', 409); }
      inFlight.add(requestId);
      const result = await queue.run(async () => {
        const response = await fetcher('http://127.0.0.1:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'manual', signal, body: JSON.stringify({ model: LOCAL_MODEL, stream: false, think: false, keep_alive: '5m', messages: [{ role: 'user', content: `${input.prompt}\nReturn JSON matching this schema: ${JSON.stringify(input.schema)}` }], format: input.schema, options: { num_ctx: LOCAL_CONTEXT, num_predict: input.maxOutputTokens, temperature: 0.2 } }) });
        if (!response.ok) throw new AppError('LOCAL_AI_OFFLINE', 'The local AI could not finish. Ask the beta owner to check Ollama.', 503, 15);
        const generated = await readBoundedJson(response, 128000);
        if (generated.model !== LOCAL_MODEL || generated.done !== true || generated.done_reason !== 'stop' || generated.message?.thinking || !Number.isSafeInteger(generated.prompt_eval_count) || generated.prompt_eval_count < 0 || generated.prompt_eval_count + input.maxOutputTokens > LOCAL_CONTEXT || !Number.isSafeInteger(generated.eval_count) || generated.eval_count < 0 || generated.eval_count > input.maxOutputTokens) throw new AppError('UNSUPPORTED_OUTPUT', 'The local AI answer did not finish within its limits. Try a narrower request.', 502);
        let data: unknown; try { data = JSON.parse(generated.message.content); } catch { throw new AppError('UNSUPPORTED_OUTPUT', 'The local AI returned an unreadable answer. Please try again.', 502); }
        return { requestId: input.requestId, model: LOCAL_MODEL, data, usage: { inputTokens: generated.prompt_eval_count, outputTokens: generated.eval_count } };
      }, signal);
      return Response.json(result);
    } catch (error) {
      const safe = request.signal.aborted ? new AppError('CANCELLED', 'This request was cancelled.', 499) : timeout.signal.aborted ? new AppError('LOCAL_AI_TIMEOUT', 'The local AI took too long. Please try a narrower request.', 503, 15) : error instanceof AppError ? error : error instanceof PayloadError ? new AppError('INVALID_INPUT', error.message, error.status) : new AppError('LOCAL_AI_OFFLINE', 'The local AI server is offline. Ask the beta owner to start it.', 503, 15);
      return Response.json({ error: { code: safe.code, userMessage: safe.message, retryAfterSeconds: safe.retryAfterSeconds } }, { status: safe.status, headers: safe.retryAfterSeconds ? { 'Retry-After': String(safe.retryAfterSeconds) } : {} });
    } finally { clearTimeout(timer); if (requestId) inFlight.delete(requestId); }
  } };
}
