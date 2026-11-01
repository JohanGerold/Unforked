import { z } from 'zod';
import { AppError, IntentSchema, MatchSchema, type ContributorProfile, type SearchIntent, type SearchResult, type Evidence } from '@unforked/contracts';
import { boundary, compactEvidence, validateMatches, type Model } from '../ai/analysis';
import { GitHubClient } from '../github/client';
import { fetchEvidence } from '../github/evidence';
import { generationInputBound } from '../ai/budget';
// Keep nested arrays small enough for Google's constrained-decoding grammar.
// Full MatchSchema and evidence validation still run after generation.
export const rankSchema = z.object({ matches: z.array(MatchSchema.extend({ fitReasons: MatchSchema.shape.fitReasons.max(3), skillGaps: MatchSchema.shape.skillGaps.max(3), limitations: MatchSchema.shape.limitations.max(3), sourceIds: MatchSchema.shape.sourceIds.max(3) })).max(3), noStrongMatch: z.boolean(), limitations: z.array(z.string().max(1000)).max(3) });
export function buildQueries(intent: SearchIntent): string[] { return [...new Set(intent.queries)].slice(0, 3).map(q => `${q.replace(/(?:-?archived|is):\S+/gi, '').slice(0, 180).trim()} archived:false is:public`); }
export function enforceLanguageConstraint(request: string, languages: string[]) {
  const found = request.match(/\bonly\s+(python|javascript|typescript|rust|go|java|ruby|c\+\+)|\b(python|javascript|typescript|rust|go|java|ruby|c\+\+)\s+only\b/i);
  return !found || languages.some(l => l.toLowerCase() === (found[1] || found[2]).toLowerCase());
}
export async function recommend(request: string, profile: ContributorProfile, client: GitHubClient, model: Model): Promise<{ result: SearchResult; evidence: Evidence[] }> {
  const rawIntent = await model.generate(IntentSchema, `${boundary}\nExtract search intent and up to three useful GitHub repository search queries. Include broad topic searches. Preserve all explicit user constraints, and treat profile languages as preferences unless explicitly required. Request: ${request}\nProfile: ${JSON.stringify(profile)}`);
  const intent = IntentSchema.parse(rawIntent); const candidates = new Map<string, any>(); const limitations: string[] = [];
  for (const query of buildQueries(intent)) {
    try { const result = await client.get(`/search/repositories?q=${encodeURIComponent(query)}&per_page=10&sort=updated`); if (result.incomplete_results) limitations.push('GitHub returned incomplete search results.'); for (const repo of result.items || []) if (!repo.private && !repo.archived && candidates.size < 30) candidates.set(String(repo.full_name).toLowerCase(), repo); }
    catch (e) { if (!candidates.size) throw e; limitations.push('A search could not finish; these results are partial.'); break; }
  }
  const sorted = [...candidates.values()].sort((a, b) => {
    const fit = (r: any) => (profile.languages.some(l => l.toLowerCase() === String(r.language).toLowerCase()) ? 2 : 0) + (r.has_issues ? 1 : 0);
    return fit(b) - fit(a);
  });
  const evidence: Evidence[] = [];
  for (const repo of sorted.slice(0, 8)) {
    try { const data = await fetchEvidence({ owner: repo.owner.login, name: repo.name }, client); if (!data.archived && enforceLanguageConstraint(request, data.languages)) evidence.push(data); }
    catch (e) { if (e instanceof AppError && ['RATE_LIMITED', 'BUDGET_EXHAUSTED'].includes(e.code)) { limitations.push(e.message); break; } limitations.push(`Could not verify ${repo.full_name}.`); }
  }
  if (!evidence.length) return { result: { matches: [], status: 'no_strong_match', searchLimitations: [...limitations, 'No suitable public candidates were verified within this search. Try a broader interest or explicitly relax a constraint.'], intent }, evidence };
  const compact = evidence.slice(0, 6).map(e => compactEvidence(e, 250));
  const initialCount = compact.length;
  const prompt = () => `${boundary}\nRank at most three candidate repositories for the original request and intent. Keep each explanation concise and each list to at most three items. Skill fit, verified available work, setup burden, interests and time matter; stars do not. Obey every hard constraint. If none strongly fit, set noStrongMatch true and offer the nearest permitted alternatives with readiness learn_first and clear skill gaps. Choose only an open unassigned issue without observed competing work, otherwise issueNumber null. checkedAt must come from evidence. Request: ${request}. Profile: ${JSON.stringify(profile)}. Intent: ${JSON.stringify(intent)}. Evidence: ${JSON.stringify(compact)}`;
  const encode = new TextEncoder();
  const schemaBytes = encode.encode(JSON.stringify(z.toJSONSchema(rankSchema))).byteLength;
  const allowance = model.remainingInputBytes ?? 20000;
  while (compact.length && generationInputBound(encode.encode(prompt()).byteLength, schemaBytes) > allowance) compact.pop();
  if (compact.length < initialCount) limitations.push('Fewer candidates were compared to stay within the remaining analysis budget.');
  if (!compact.length) return { result: { matches: [], status: 'no_strong_match', searchLimitations: [...limitations, 'The analysis budget could not fit a candidate comparison. Try narrowing the request or profile.'], intent }, evidence };
  const ranked = rankSchema.parse(await model.generate(rankSchema, prompt()));
  const matches = validateMatches(ranked.matches, evidence);
  return { result: { matches, intent, status: ranked.noStrongMatch || !matches.length ? 'no_strong_match' : limitations.length ? 'partial' : 'complete', searchLimitations: [...limitations, ...ranked.limitations, 'Results are a bounded shortlist, not an exhaustive search of GitHub.'].slice(0, 20) }, evidence };
}
