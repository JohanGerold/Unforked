import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { afterEach, expect, it, vi } from 'vitest';
import { defaultProfile } from '@unforked/contracts';
import { createModel } from '../../apps/api/src/ai/provider';
import { analyzeSummary, answerQuestion, buildLearningPath } from '../../apps/api/src/ai/analysis';
import { GitHubClient } from '../../apps/api/src/github/client';
import { fetchEvidence } from '../../apps/api/src/github/evidence';
import { recommend } from '../../apps/api/src/search/recommend';

afterEach(() => vi.unstubAllGlobals());
it.skipIf(process.env.UNFORKED_LIVE_SMOKE !== '1')('bounded live-provider acceptance using public repository evidence', async () => {
  const config = parseEnv(readFileSync('apps/api/.dev.vars', 'utf8'));
  const apiKey = config.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('Local Gemini key is missing.');
  const modelId = config.AI_MODEL;
  expect(modelId).toBeTruthy();
  const actualFetch = globalThis.fetch;
  const calls: { status: number; input: number; output: number; thinking: number }[] = [];
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const isGoogle = new URL(input instanceof Request ? input.url : String(input)).hostname === 'generativelanguage.googleapis.com';
    if (isGoogle && calls.length >= 6) throw new Error('Live smoke call cap reached.');
    const response = await actualFetch(input, init);
    if (isGoogle) {
      const payload = await response.clone().json().catch(() => ({})) as any;
      if (!response.ok) {
        console.log(JSON.stringify({ providerStatus: response.status, reason: String(payload.error?.message || 'Request failed').replaceAll(apiKey, '[redacted]') }));
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        writeFileSync('.superpowers/sdd/2026-11-01-private-beta/provider-rejection.json', JSON.stringify({ request: body, error: payload.error }, null, 2).replaceAll(apiKey, '[redacted]'));
      }
      calls.push({ status: response.status, input: payload.usageMetadata?.promptTokenCount || 0, output: payload.usageMetadata?.candidatesTokenCount || 0, thinking: payload.usageMetadata?.thoughtsTokenCount || 0 });
    }
    return response;
  });
  const client = () => new GitHubClient(config.GITHUB_TOKEN);
  const evidence = await fetchEvidence({ owner: 'psf', name: 'requests' }, client());
  const model = () => createModel(config.GOOGLE_GENERATIVE_AI_API_KEY, modelId);
  const profile = { ...defaultProfile, languages: ['Python'], knownConcepts: ['functions', 'classes', 'pytest'], interests: ['developer tools'] };
  const outcomes: { action: string; ok: boolean; milliseconds: number; result?: unknown; error?: string }[] = [];
  const actions: [string, () => Promise<unknown>][] = [
    ['summary', () => analyzeSummary(evidence, model())],
    ['repo-question', () => answerQuestion('What is this project for and what evidence is missing about contribution setup?', evidence, model())],
    ['learning-path', () => buildLearningPath('Prepare for a first Python test contribution', profile, evidence, model())],
    ['search', () => recommend('Python developer tools; first contribution writing tests, about four hours. Only Python tasks.', profile, client(), model())]
  ];
  const selected = process.env.UNFORKED_LIVE_ACTION ? actions.filter(([action]) => action === process.env.UNFORKED_LIVE_ACTION) : actions;
  expect(selected.length).toBeGreaterThan(0);
  for (const [action, run] of selected) {
    const started = Date.now();
    try { outcomes.push({ action, ok: true, milliseconds: Date.now() - started, result: await run() }); outcomes.at(-1)!.milliseconds = Date.now() - started; }
    catch (error) { outcomes.push({ action, ok: false, milliseconds: Date.now() - started, error: error instanceof Error ? error.message : 'Action failed' }); }
    console.log(JSON.stringify({ action, ok: outcomes.at(-1)!.ok, milliseconds: outcomes.at(-1)!.milliseconds }));
    if (calls.some(call => call.status === 429)) break;
  }
  // Only public example inputs/results and numeric metrics; never credentials, headers or SDK errors.
  mkdirSync('.superpowers/sdd/2026-11-01-private-beta', { recursive: true });
  writeFileSync('.superpowers/sdd/2026-11-01-private-beta/live-sample.json', JSON.stringify({ modelId, checkedAt: new Date().toISOString(), calls, outcomes }, null, 2));
  console.log(JSON.stringify({ modelId, calls }));
  expect(outcomes.filter(result => result.ok).map(result => result.action)).toEqual(selected.map(([action]) => action));
});
