import { generateText, Output } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { AppError } from '@unforked/contracts';
import type { Model } from './analysis';
import { z } from 'zod';
import { GenerationBudget } from './budget';
export function createModel(apiKey?: string, modelId?: string, signal?: AbortSignal): Model {
  if (!apiKey || !modelId) throw new AppError('PROVIDER_UNAVAILABLE', 'Live AI is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY and AI_MODEL to the backend environment, or use demo mode.', 503);
  const budget = new GenerationBudget();
  return { async generate(schema, prompt) {
    const encode = new TextEncoder(); const outputLimit = budget.start(encode.encode(prompt).byteLength, encode.encode(JSON.stringify(z.toJSONSchema(schema))).byteLength);
    try {
      const result = await generateText({ model: createGoogleGenerativeAI({ apiKey })(modelId), output: Output.object({ schema }), prompt, maxOutputTokens: outputLimit, maxRetries: 0, abortSignal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000) });
      budget.finish(outputLimit, result.usage.outputTokens ?? outputLimit);
      return result.output;
    } catch (e) { if (e instanceof AppError || signal?.aborted) throw e; throw new AppError('PROVIDER_UNAVAILABLE', 'The AI provider could not complete this action. Please retry or use demo mode.', 503); }
  } };
}
