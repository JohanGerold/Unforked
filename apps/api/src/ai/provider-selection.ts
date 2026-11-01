import { AppError } from '@unforked/contracts';
import type { Env } from '../env';
export function selectedProvider(env: Env): 'gemini' | 'ollama' {
  const value = env.AI_PROVIDER || 'gemini';
  if (value !== 'gemini' && value !== 'ollama') throw new AppError('PROVIDER_UNAVAILABLE', 'The AI provider selection is not configured correctly.', 503);
  return value;
}
