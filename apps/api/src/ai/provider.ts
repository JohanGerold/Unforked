import { generateText, Output } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { AppError } from '@unforked/contracts';
import type { Model } from './analysis';
export function createModel(apiKey?: string, modelId?: string, signal?: AbortSignal): Model {
  if (!apiKey || !modelId) throw new AppError('PROVIDER_UNAVAILABLE', 'Live AI is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY and AI_MODEL to the backend environment, or use demo mode.', 503);
  let calls = 0; let inputChars = 0;
  return { async generate(schema, prompt) {
    if (++calls > 3 || (inputChars += prompt.length) > 90000) throw new AppError('BUDGET_EXHAUSTED', 'This action reached its analysis limit. Try a narrower request.', 429);
    try {
      const result = await generateText({ model: createGoogleGenerativeAI({ apiKey })(modelId), output: Output.object({ schema }), prompt, maxOutputTokens: 1000, maxRetries: 0, abortSignal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000) });
      return result.output;
    } catch (e) { if (e instanceof AppError || signal?.aborted) throw e; throw new AppError('PROVIDER_UNAVAILABLE', 'The AI provider could not complete this action. Please retry or use demo mode.', 503); }
  } };
}
