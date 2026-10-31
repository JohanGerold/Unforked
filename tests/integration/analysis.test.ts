import { expect, it } from 'vitest';
import { analyzeSummary, validateMatches, buildLearningPath, answerQuestion } from '../../apps/api/src/ai/analysis';
import { demoEvidence } from '../../apps/api/src/demo';
import { defaultProfile } from '@unforked/contracts';
const evidence = demoEvidence()[0];
const validSummary = { purpose: 'HTTP client', stack: ['Python'], contributionNotes: [], limitations: [], sourceIds: [evidence.sources[0].id] };
const model = (output: unknown) => ({ generate: async () => output });
it('rejects model citations absent from repository evidence', async () => {
  await expect(analyzeSummary(evidence, model({ ...validSummary, sourceIds: ['invented'] }))).rejects.toMatchObject({ code: 'UNSUPPORTED_OUTPUT' });
});
it('returns a schema-checked summary without rendering repository instructions as HTML', async () => {
  const result = await analyzeSummary(evidence, model(validSummary)); expect(result.purpose).toBe('HTTP client'); expect(result.sourceIds).toEqual([evidence.sources[0].id]);
});
it('rejects invented repositories and closed, assigned or unknown issues', () => {
  const card = { repo: evidence.repo, purpose: 'HTTP client', readiness: 'ready_now', fitReasons: ['Python'], skillGaps: [], issueNumber: 999999, limitations: [], sourceIds: [evidence.sources[0].id], checkedAt: evidence.checkedAt };
  expect(() => validateMatches([card], [evidence])).toThrow();
  expect(() => validateMatches([{ ...card, repo: { owner: 'invented', name: 'project' }, issueNumber: null }], [evidence])).toThrow();
});
it('rejects assigned and competing work even when a model selects it', () => {
  const issue = { number: 1, title: 'Fix test', body: '', labels: [], assignees: 1, updatedAt: evidence.checkedAt, state: 'open' as const, competingWork: 'not_checked' as const };
  const card = { repo: evidence.repo, purpose: 'HTTP client', readiness: 'ready_now', fitReasons: [], skillGaps: [], issueNumber: 1, limitations: [], sourceIds: [evidence.sources[0].id], checkedAt: evidence.checkedAt };
  expect(() => validateMatches([card], [{ ...evidence, issues: [issue] }])).toThrow();
});
it('learning paths cannot cite invented resources', async () => {
  await expect(buildLearningPath('Learn tests', defaultProfile, evidence, model({ gaps: ['pytest'], steps: [{ title: 'Test', practice: 'Write a test', readinessCheck: 'Test passes' }], sourceIds: ['fake-course'] }))).rejects.toMatchObject({ code: 'UNSUPPORTED_OUTPUT' });
});
it('repository questions disclose that deep code has not been read', async () => {
  const answer = await answerQuestion('Which source file implements sessions?', evidence, model({ answer: 'Read the source.', sourceIds: [evidence.sources[0].id], limitation: '' }));
  expect(answer.limitation.length).toBeGreaterThan(0);
});
