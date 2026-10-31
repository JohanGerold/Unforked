import { expect, it } from 'vitest';
import { GenerationBudget, configuredCostBound } from '../../apps/api/src/ai/budget';
it('rejects an oversized prompt before generation can start', () => {
  expect(() => new GenerationBudget().start(30000, 200)).toThrowError(/limit/i);
});
it('limits output across multiple calls and refuses a fourth call', () => {
  const budget = new GenerationBudget();
  for (let i = 0; i < 3; i++) { const reserved = budget.start(100, 100); expect(reserved).toBeLessThanOrEqual(1800); budget.finish(reserved, 100); }
  expect(() => budget.start(100, 100)).toThrow();
});
it('requires explicit provider prices for a shared live cost bound', () => {
  expect(() => configuredCostBound({})).toThrow();
  expect(configuredCostBound({ AI_INPUT_USD_PER_MILLION: '0.1', AI_OUTPUT_USD_PER_MILLION: '0.4' })).toBe(4200);
});
