import type { Env } from '../env';
import { createModel } from './provider';
import { createLocalModel, localHealth } from './local-provider';
import { selectedProvider } from './provider-selection';
export function createConfiguredModel(env: Env, signal?: AbortSignal, fetcher: typeof fetch = fetch) {
  return selectedProvider(env) === 'ollama' ? createLocalModel(env, signal, fetcher) : createModel(env.GOOGLE_GENERATIVE_AI_API_KEY, env.AI_MODEL, signal);
}
export async function providerHealth(env: Env) {
  const aiProvider = selectedProvider(env);
  return { aiProvider, ...(aiProvider === 'ollama' ? await localHealth(env) : { configured: !!(env.GOOGLE_GENERATIVE_AI_API_KEY && env.AI_MODEL) }) };
}
