import { expect, it } from 'vitest';
import { z } from 'zod';
import { LearningSchema, defaultProfile } from '@unforked/contracts';
import { buildLearningPath } from '../../apps/api/src/ai/analysis';
import { demoEvidence } from '../../apps/api/src/demo';
import { generationInputBound } from '../../apps/api/src/ai/budget';
const original = demoEvidence()[0]; const evidence = { ...original, sources: original.sources.map(source => ({ ...source, excerpt: 'Python HTTP library. Tests use pytest fixtures and parametrization.' })) }; const sourceIds = [evidence.sources[0].id];
const roadmap = { overview: 'Knowledge for a Python HTTP library.', languages: [{ name: 'Python', priority: 'core', depth: 'working', concepts: ['functions', 'classes', 'exceptions'], libraries: [{ name: 'pytest', priority: 'core', concepts: ['fixtures', 'parametrization'], sourceIds }], reason: 'The project and tests use Python.', sourceIds }], supportingSkills: [], limitations: [] };
it('returns knowledge grouped by language and library, with verified aggregate citations', async () => {
  const result = await buildLearningPath('Contribute tests', defaultProfile, evidence, { generate: async (_schema, prompt) => {
    expect(prompt).toMatch(/knowledge roadmap/i); expect(prompt).toMatch(/unlisted.*unknown|missing.*unknown/i); return roadmap;
  } });
  expect(LearningSchema.safeParse(result).success).toBe(true);
  expect(result.languages[0].concepts).toContain('functions'); expect(result.languages[0].libraries[0].concepts).toContain('fixtures');
  expect(result.sourceIds).toEqual(sourceIds); expect(result).not.toHaveProperty('steps'); expect(result).not.toHaveProperty('gaps');
});
it('rejects unsupported per-library citations and languages outside the repository evidence', async () => {
  const library = { ...roadmap.languages[0].libraries[0], sourceIds: ['invented'] };
  for (const output of [{ ...roadmap, languages: [{ ...roadmap.languages[0], libraries: [library] }] }, { ...roadmap, languages: [{ ...roadmap.languages[0], name: 'C++' }] }]) {
    await expect(buildLearningPath('Learn', defaultProfile, evidence, { generate: async () => output })).rejects.toMatchObject({ code: 'UNSUPPORTED_OUTPUT' });
  }
});
it('keeps the knowledge grammar within the local schema transport ceiling', async () => {
  await buildLearningPath('Learn', defaultProfile, evidence, { generate: async (schema) => { expect(new TextEncoder().encode(JSON.stringify(z.toJSONSchema(schema))).byteLength).toBeLessThanOrEqual(12000); return roadmap; } });
});
it('shrinks sampled excerpts to the remaining input budget before generation', async () => {
  const large = { ...evidence, sources: Array.from({ length: 10 }, (_, index) => ({ ...evidence.sources[0], id: index === 0 ? sourceIds[0] : `psf/requests:source-${index}`, excerpt: 'pytest import. '.repeat(900) })) };
  await buildLearningPath('Learn the project', defaultProfile, large, { remainingInputBytes: 20000, generate: async (schema, prompt) => {
    expect(generationInputBound(new TextEncoder().encode(prompt).byteLength, new TextEncoder().encode(JSON.stringify(z.toJSONSchema(schema))).byteLength)).toBeLessThanOrEqual(20000); return roadmap;
  } });
});
it('keeps retrieval failures visible even when the model fills every limitation slot', async () => {
  const failure = 'No source-code sample could be read; requirements are limited to documentation.';
  const limited = { ...evidence, limitations: [failure] };
  const result = await buildLearningPath('Learn', defaultProfile, limited, { generate: async () => ({ ...roadmap, limitations: Array.from({ length: 5 }, (_, index) => `Model uncertainty ${index}`) }) });
  expect(result.limitations).toContain(failure); expect(result.limitations.length).toBeLessThanOrEqual(5);
});
