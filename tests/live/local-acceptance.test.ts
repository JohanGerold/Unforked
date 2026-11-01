import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { expect, it } from 'vitest';
import { defaultProfile } from '@unforked/contracts';
import type { Env } from '../../apps/api/src/env';
import { createLocalModel } from '../../apps/api/src/ai/local-provider';
import { analyzeSummary, answerQuestion, boundary, buildLearningPath, compactEvidence, validateMatches } from '../../apps/api/src/ai/analysis';
import { GitHubClient } from '../../apps/api/src/github/client';
import { fetchEvidence } from '../../apps/api/src/github/evidence';
import { rankSchema, recommend } from '../../apps/api/src/search/recommend';

it.skipIf(process.env.UNFORKED_LOCAL_SMOKE !== '1')('accepts real public evidence through the local model for all four journeys', async () => {
  const { LOCAL_AI_KEY } = parseEnv(readFileSync('apps/local-ai/.env', 'utf8'));
  const env = { ENVIRONMENT: 'development', LOCAL_AI_ORIGIN: 'http://127.0.0.1:11435', LOCAL_AI_KEY } as Env;
  const calls: { status: number; input: number; output: number; data?: unknown }[] = [];
  const transport: typeof fetch = async (url, init) => {
    expect(String(url)).toBe('http://127.0.0.1:11435/v1/generate');
    if (calls.length >= 6) throw new Error('Local acceptance call cap reached.');
    const response = await fetch(url, init); const body = await response.clone().json();
    calls.push({ status: response.status, input: body.usage?.inputTokens || 0, output: body.usage?.outputTokens || 0, data: body.data });
    return response;
  };
  const evidence = await fetchEvidence({ owner: 'psf', name: 'requests' }, new GitHubClient());
  const profile = { ...defaultProfile, languages: ['Python'], knownConcepts: ['functions', 'classes', 'pytest'], interests: ['developer tools'] };
  const model = () => createLocalModel(env, undefined, transport);
  const actions: [string, () => Promise<unknown>][] = [
    ['summary', () => analyzeSummary(evidence, model())],
    ['question', () => answerQuestion('What does this repository do, and what contribution setup is actually documented?', evidence, model())],
    ['learning', () => buildLearningPath('Prepare for a first Python test contribution', profile, evidence, model())],
    ['search', () => recommend('Python developer tools; first contribution writing tests, about four hours. Only Python tasks.', profile, new GitHubClient(undefined, fetch, undefined, 40), model())],
    ['ranking', async () => {
      const result = rankSchema.parse(await model().generate(rankSchema, `${boundary}\nAssess this supplied candidate for a student who knows Python functions and pytest and wants to understand HTTP libraries. Return one concise match, with readiness learn_first when setup or work availability is uncertain. One short sentence per field, at most two items per list. Use issueNumber null unless availability is proven. Copy checkedAt and source IDs from evidence. Keep JSON under 1000 tokens. Evidence: ${JSON.stringify(compactEvidence(evidence, 250))}`));
      const matches = validateMatches(result.matches, [evidence]); expect(matches).toHaveLength(1); return { ...result, matches };
    }]
  ];
  const outcomes: { action: string; ok: boolean; milliseconds: number; result?: unknown; error?: string }[] = [];
  const selected = process.env.UNFORKED_LIVE_ACTION ? actions.filter(([action]) => action === process.env.UNFORKED_LIVE_ACTION) : actions;
  expect(selected.length).toBeGreaterThan(0);
  for (const [action, run] of selected) {
    const start = Date.now();
    try { outcomes.push({ action, ok: true, milliseconds: 0, result: await run() }); }
    catch (error) { outcomes.push({ action, ok: false, milliseconds: 0, error: error instanceof Error ? error.message : 'Action failed' }); }
    outcomes.at(-1)!.milliseconds = Date.now() - start;
    console.log(JSON.stringify({ action, ok: outcomes.at(-1)!.ok, milliseconds: outcomes.at(-1)!.milliseconds }));
  }
  mkdirSync('.superpowers/local-ai', { recursive: true });
  writeFileSync(`.superpowers/local-ai/acceptance-${process.env.UNFORKED_LIVE_ACTION || 'all'}.json`, JSON.stringify({ checkedAt: new Date().toISOString(), calls, outcomes }, null, 2));
  expect(outcomes.filter(item => item.ok).map(item => item.action)).toEqual(selected.map(([action]) => action));
}, 240000);
