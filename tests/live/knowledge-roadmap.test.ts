import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { expect, it } from 'vitest';
import { defaultProfile, EvidenceSchema, type Source } from '@unforked/contracts';
import type { Env } from '../../apps/api/src/env';
import { fetchLearningEvidence } from '../../apps/api/src/github/learning-evidence';
import { GitHubClient } from '../../apps/api/src/github/client';
import { buildLearningPath } from '../../apps/api/src/ai/analysis';
import { createLocalModel } from '../../apps/api/src/ai/local-provider';

async function publicFileProbe() {
  const sources: Source[] = [];
  for (const [path, label] of [['README.rst', 'README'], ['pyproject.toml', 'Dependency manifest: pyproject.toml'], ['src/_pytest/main.py', 'Source sample: src/_pytest/main.py'], ['testing/test_main.py', 'Source sample: testing/test_main.py'], ['CONTRIBUTING.rst', 'Contribution guide: CONTRIBUTING.rst']]) {
    const response = await fetch(`https://raw.githubusercontent.com/pytest-dev/pytest/main/${path}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) continue;
    const text = await response.text();
    const excerpt = label.startsWith('Source') ? text.split('\n').filter(line => /^\s*(?:import |from |class |def |@pytest\.)/.test(line)).slice(0, 35).join('\n') : text.slice(0, 6500);
    sources.push({ id: `pytest-dev/pytest:probe-${sources.length}`, label, url: `https://github.com/pytest-dev/pytest/blob/main/${path}`, excerpt });
  }
  expect(sources.length).toBeGreaterThanOrEqual(3);
  return EvidenceSchema.parse({ repo: { owner: 'pytest-dev', name: 'pytest' }, description: 'The pytest testing framework: public-file provider probe.', languages: ['Python'], topics: [], archived: false, isPublic: true, updatedAt: '', checkedAt: new Date().toISOString(), sources, issues: [], mergedPulls: 0, completeness: 'partial', limitations: ['Provider probe uses public file samples; repository metadata and activity were not refreshed through the REST API.'] });
}

it.skipIf(process.env.UNFORKED_KNOWLEDGE_SMOKE !== '1')('builds a knowledge roadmap from pytest project files using real Qwen', async () => {
  mkdirSync('.superpowers/knowledge-roadmap', { recursive: true });
  const evidence = process.env.UNFORKED_KNOWLEDGE_CACHED === '1' ? EvidenceSchema.parse(JSON.parse(readFileSync('.superpowers/knowledge-roadmap/evidence.json', 'utf8'))) : process.env.UNFORKED_KNOWLEDGE_RAW === '1' ? await publicFileProbe() : await fetchLearningEvidence({ owner: 'pytest-dev', name: 'pytest' }, new GitHubClient(undefined, fetch, undefined, 40));
  writeFileSync('.superpowers/knowledge-roadmap/evidence.json', JSON.stringify(evidence, null, 2));
  const { LOCAL_AI_KEY } = parseEnv(readFileSync('apps/local-ai/.env', 'utf8'));
  const env = { ENVIRONMENT: 'development', LOCAL_AI_ORIGIN: 'http://127.0.0.1:11435', LOCAL_AI_KEY } as Env;
  const metrics: unknown[] = [];
  const model = createLocalModel(env, undefined, async (url, init) => {
    const response = await fetch(url, init); const body = await response.clone().json(); metrics.push({ status: response.status, usage: body.usage }); return response;
  });
  const start = Date.now();
  const result = await buildLearningPath('What knowledge is needed to understand and contribute to pytest?', { ...defaultProfile, languages: ['Python'], knownConcepts: ['functions'] }, evidence, model);
  writeFileSync('.superpowers/knowledge-roadmap/result.json', JSON.stringify({ checkedAt: new Date().toISOString(), milliseconds: Date.now() - start, metrics, result }, null, 2));
  console.log(JSON.stringify({ milliseconds: Date.now() - start, metrics, languages: result.languages.map(language => language.name) }));
  expect(result.languages.some(language => language.name === 'Python')).toBe(true);
  expect(result.languages.flatMap(language => language.libraries).some(library => library.name === 'pluggy')).toBe(true);
  expect(result).not.toHaveProperty('steps');
  expect(result.languages.flatMap(language => language.libraries).some(library => /numpy|pandas/i.test(library.name))).toBe(false);
}, 180000);
