import { APICallError, generateText, NoObjectGeneratedError, Output } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { AppError } from '@unforked/contracts';
import type { Model } from './analysis';
import { z } from 'zod';
import { GenerationBudget } from './budget';
export function createModel(apiKey?: string, modelId?: string, signal?: AbortSignal): Model {
  if (!apiKey || !modelId) throw new AppError('PROVIDER_UNAVAILABLE', 'Live AI is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY and AI_MODEL to the backend environment, or use demo mode.', 503);
  const budget = new GenerationBudget();
  let calls = 0;
  return { get remainingInputBytes() { return budget.inputBytesRemaining; }, async generate(schema, prompt) {
    const encode = new TextEncoder(); const outputLimit = budget.start(encode.encode(prompt).byteLength, encode.encode(JSON.stringify(z.toJSONSchema(schema))).byteLength);
    const started = Date.now(); const call = ++calls; const timeout = AbortSignal.timeout(45000);
    try {
      const result = await generateText({ model: createGoogleGenerativeAI({ apiKey })(modelId), output: Output.object({ schema }), prompt, maxOutputTokens: outputLimit, maxRetries: 0, abortSignal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      budget.finish(outputLimit, result.usage.outputTokens ?? outputLimit);
      return result.output;
    } catch (e) {
      if (e instanceof AppError || signal?.aborted) throw e;
      // SDK errors can embed prompts, headers and generated text. Log metadata only.
      console.error(JSON.stringify({ event: 'ai_failed', call, status: APICallError.isInstance(e) ? e.statusCode : undefined, kind: APICallError.isInstance(e) ? 'http' : NoObjectGeneratedError.isInstance(e) ? 'output' : 'other', finishReason: NoObjectGeneratedError.isInstance(e) ? e.finishReason : undefined, timedOut: timeout.aborted, milliseconds: Date.now() - started }));
      if (timeout.aborted) throw new AppError('PROVIDER_UNAVAILABLE', 'The AI provider did not respond within 45 seconds. Please try again shortly.', 503);
      if (APICallError.isInstance(e) && e.statusCode === 429) {
        const wait = Number(e.responseHeaders?.['retry-after']);
        throw new AppError('RATE_LIMITED', 'The AI provider is limiting requests. Please wait before trying again.', 429, Number.isFinite(wait) && wait > 0 ? Math.min(86400, Math.ceil(wait)) : 60);
      }
      throw new AppError('PROVIDER_UNAVAILABLE', 'The AI provider could not complete this action. Please retry or use demo mode.', 503);
    }
  } };
}
