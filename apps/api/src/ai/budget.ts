import { AppError } from '@unforked/contracts';
import type { Env } from '../env';
export class GenerationBudget {
  private calls = 0; private remainingInput = 30000; private remainingOutput = 3000;
  start(promptBytes: number, schemaBytes: number): number {
    // UTF-8 byte count is deliberately conservative for the configured text-only tokenizers.
    const inputBound = promptBytes + schemaBytes + 1024;
    if (this.calls >= 3 || inputBound > this.remainingInput || this.remainingOutput < 100) throw new AppError('BUDGET_EXHAUSTED', 'This action reached its analysis limit. Try a narrower request.', 429);
    this.calls++; this.remainingInput -= inputBound;
    const output = Math.min(1800, this.remainingOutput); this.remainingOutput -= output; return output;
  }
  finish(reserved: number, used: number) { if (used < 0 || used > reserved) throw new AppError('BUDGET_EXHAUSTED', 'The provider exceeded the configured generation limit.', 429); this.remainingOutput += reserved - used; }
}
export function configuredCostBound(env: Env): number {
  const input = Number(env.AI_INPUT_USD_PER_MILLION), output = Number(env.AI_OUTPUT_USD_PER_MILLION);
  if (!Number.isFinite(input) || !Number.isFinite(output) || input <= 0 || output <= 0) throw new AppError('PROVIDER_UNAVAILABLE', 'Set the current model input and output prices before enabling hosted AI.', 503);
  return Math.ceil(30000 * input + 3000 * output);
}
