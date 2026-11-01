import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { expect, it } from 'vitest';
import { EvidenceSchema } from '@unforked/contracts';
import type { Env } from '../../apps/api/src/env';
import { createLocalModel } from '../../apps/api/src/ai/local-provider';
import { boundary, compactEvidence, validateMatches } from '../../apps/api/src/ai/analysis';
import { indexedRankSchema } from '../../apps/api/src/search/recommend';

it.skipIf(process.env.UNFORKED_LOCAL_SMOKE !== '1')('ranks three public README candidates using bounded candidate identities', async () => {
  // Separate provider-quality probe: public READMEs avoid the anonymous REST quota.
  // This does not stand in for authenticated hosted search acceptance.
  const candidates = [['psf', 'requests', 'main'], ['Textualize', 'rich', 'master'], ['pallets', 'flask', 'main']];
  const evidence = await Promise.all(candidates.map(async ([owner, name, branch]) => {
    const response = await fetch(`https://raw.githubusercontent.com/${owner}/${name}/${branch}/README.md`);
    if (!response.ok) throw new Error('Public README unavailable.');
    const excerpt = (await response.text()).slice(0, 12000);
    return EvidenceSchema.parse({ repo: { owner, name }, description: `${owner}/${name}: public README candidate`, languages: ['Python'], topics: [], archived: false, isPublic: true, updatedAt: '', checkedAt: new Date().toISOString(), sources: [{ id: `${owner.toLowerCase()}/${name.toLowerCase()}:readme`, label: 'README', url: `https://github.com/${owner}/${name}#readme`, excerpt }], issues: [], mergedPulls: 0, completeness: 'partial', limitations: ['Provider probe uses only public READMEs. Repository metadata, issue availability and contribution setup were not verified.'] });
  }));
  const { LOCAL_AI_KEY } = parseEnv(readFileSync('apps/local-ai/.env', 'utf8'));
  const env = { ENVIRONMENT: 'development', LOCAL_AI_ORIGIN: 'http://127.0.0.1:11435', LOCAL_AI_KEY } as Env;
  const metrics: unknown[] = [];
  const model = createLocalModel(env, undefined, async (url, init) => {
    const response = await fetch(url, init); const data = await response.clone().json(); metrics.push({ status: response.status, usage: data.usage }); return response;
  });
  const schema = indexedRankSchema(evidence); const start = Date.now();
  const result = schema.parse(await model.generate(schema, `${boundary}\nRank one or two of the following candidates for a Python student who knows functions and classes and wants to learn test contributions. Give short explanations. Each candidateIndex is its zero-based position in the Evidence array. Never repeat indices. Use learn_first when readiness is uncertain. issueNumber must be null because no issues were verified. Cite only that candidate's source IDs. JSON must stay under 1000 tokens. Evidence: ${JSON.stringify(evidence.map(e => compactEvidence(e, 500)))}`));
  const seen = new Set<number>();
  writeFileSync('.superpowers/local-ai/indexed-raw.json', JSON.stringify(result, null, 2));
  const matches = validateMatches(result.matches.filter(match => { if (seen.has(match.candidateIndex)) return false; seen.add(match.candidateIndex); return true; }).map(({ candidateIndex, ...match }) => ({ ...match, repo: evidence[candidateIndex].repo, checkedAt: evidence[candidateIndex].checkedAt })), evidence);
  writeFileSync('.superpowers/local-ai/indexed-ranking.json', JSON.stringify({ checkedAt: new Date().toISOString(), milliseconds: Date.now() - start, metrics, result: { ...result, matches } }, null, 2));
  expect(matches.length).toBeGreaterThan(0);
}, 120000);
