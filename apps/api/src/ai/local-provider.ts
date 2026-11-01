import { z } from 'zod';
import { AppError, LOCAL_BODY_LIMIT, LOCAL_MAX_OUTPUT, LOCAL_MODEL, LocalGenerateSchema, LocalVisionGenerateSchema, LocalResponseSchema, readBoundedJson, VISION_BODY_LIMIT, VISION_MAX_OUTPUT, VISION_IMAGE_TOKENS, type CircleImage } from '@unforked/contracts';
import type { Env } from '../env';
import type { Model } from './analysis';
import { GenerationBudget } from './budget';

export function localConnection(env: Env) {
  if (!env.LOCAL_AI_ORIGIN || !/^[a-f\d]{64}$/i.test(env.LOCAL_AI_KEY || '')) throw new AppError('LOCAL_AI_OFFLINE', 'The local AI connection is not configured. Ask the beta owner to start it.', 503);
  let origin: URL; try { origin = new URL(env.LOCAL_AI_ORIGIN); } catch { throw new AppError('LOCAL_AI_OFFLINE', 'The local AI connection is not configured.', 503); }
  const loopback = env.ENVIRONMENT === 'development' && origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname);
  if ((!loopback && origin.protocol !== 'https:') || origin.origin !== env.LOCAL_AI_ORIGIN || origin.username || origin.password) throw new AppError('LOCAL_AI_OFFLINE', 'The local AI connection must use its configured secure origin.', 503);
  return { origin: origin.origin, headers: { Authorization: `Bearer ${env.LOCAL_AI_KEY}`, 'Content-Type': 'application/json' } };
}
export function createLocalModel(env: Env, signal?: AbortSignal, fetcher: typeof fetch = fetch, image?: CircleImage): Model {
  const connection = localConnection(env); const budget = new GenerationBudget(image ? VISION_MAX_OUTPUT : LOCAL_MAX_OUTPUT);
  return { rankingStyle: 'candidate-index', get remainingInputBytes() { return budget.inputBytesRemaining; }, async generate(schema, prompt) {
    if (signal?.aborted) throw signal.reason;
    const jsonSchema = z.toJSONSchema(schema); const encode = new TextEncoder();
    const output = budget.start(encode.encode(prompt).byteLength + (image ? VISION_IMAGE_TOKENS : 0), encode.encode(JSON.stringify(jsonSchema)).byteLength);
    const request = (image ? LocalVisionGenerateSchema : LocalGenerateSchema).safeParse({ requestId: crypto.randomUUID(), prompt, schema: jsonSchema, maxOutputTokens: output, ...(image ? { image } : {}) });
    if (!request.success) throw new AppError('BUDGET_EXHAUSTED', 'This analysis is too large for the local AI. Try a narrower request.', 429);
    const body = JSON.stringify(request.data);
    if (encode.encode(body).byteLength > (image ? VISION_BODY_LIMIT : LOCAL_BODY_LIMIT)) throw new AppError('BUDGET_EXHAUSTED', 'This analysis is too large for the local connection. Try a narrower request.', 429);
    const timeout = AbortSignal.timeout(125000);
    try {
      const response = await fetcher(`${connection.origin}/v1/${image ? 'vision' : 'generate'}`, { method: 'POST', headers: connection.headers, body, redirect: 'manual', signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      const payload = await readBoundedJson(response, 128000);
      if (!response.ok) {
        const code = payload?.error?.code;
        if (code === 'LOCAL_AI_BUSY') throw new AppError(code, 'The local AI is busy. Please wait and try again.', 429, 15);
        if (code === 'LOCAL_AI_TIMEOUT') throw new AppError(code, 'The local AI took too long. Please try a narrower request.', 503, 15);
        if (code === 'UNSUPPORTED_OUTPUT') throw new AppError(code, 'The local AI answer did not finish within its limits. Try a narrower request.', 502);
        throw new AppError('LOCAL_AI_OFFLINE', 'The local AI server is offline. Ask the beta owner to start it.', 503, 15);
      }
      const parsed = LocalResponseSchema.safeParse(payload);
      if (!parsed.success || parsed.data.requestId !== request.data.requestId || parsed.data.usage.outputTokens > output) throw new AppError('UNSUPPORTED_OUTPUT', 'The local AI response could not be verified.', 502);
      const result = schema.safeParse(parsed.data.data);
      if (!result.success) throw new AppError('UNSUPPORTED_OUTPUT', 'The local AI answer did not match the requested format. Try a narrower request.', 502);
      budget.finish(output, parsed.data.usage.outputTokens); return result.data;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof AppError) throw error;
      throw new AppError(timeout.aborted ? 'LOCAL_AI_TIMEOUT' : 'LOCAL_AI_OFFLINE', timeout.aborted ? 'The local AI took too long. Please try a narrower request.' : 'The local AI server is offline. Ask the beta owner to start it.', 503, 15);
    }
  } };
}
export async function localHealth(env: Env, fetcher: typeof fetch = fetch): Promise<{ configured: boolean; aiAvailable: boolean; visionAvailable: boolean }> {
  let connection; try { connection = localConnection(env); } catch { return { configured: false, aiAvailable: false, visionAvailable: false }; }
  try {
    const response = await fetcher(`${connection.origin}/health`, { headers: connection.headers, redirect: 'manual', signal: AbortSignal.timeout(2500) });
    const body = await readBoundedJson(response, 4096);
    const ready = response.ok && body.ready === true && body.model === LOCAL_MODEL;
    return { configured: true, aiAvailable: ready, visionAvailable: ready && body.visionAvailable === true };
  } catch { return { configured: true, aiAvailable: false, visionAvailable: false }; }
}
