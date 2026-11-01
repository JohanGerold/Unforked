import { z } from 'zod';
import { AppError, IntentSchema, MatchSchema, type ContributorProfile, type SearchIntent, type SearchResult, type Evidence } from '@unforked/contracts';
import { boundary, compactEvidence, validateMatches, type Model } from '../ai/analysis';
import { GitHubClient } from '../github/client';
import { fetchEvidence } from '../github/evidence';
import { generationInputBound } from '../ai/budget';
// Keep nested arrays small enough for Google's constrained-decoding grammar.
// Full MatchSchema and evidence validation still run after generation.
const shortReasons = z.array(z.string().trim().min(1).max(120)).max(2);
export const rankSchema = z.object({ matches: z.array(MatchSchema.extend({ purpose: MatchSchema.shape.purpose.max(180).describe('What the repository does according to evidence; do not repeat the contributor profile or goal.'), fitReasons: shortReasons, skillGaps: shortReasons, limitations: shortReasons, sourceIds: MatchSchema.shape.sourceIds.max(2) })).max(3), noStrongMatch: z.boolean(), limitations: z.array(z.string().max(160)).max(2) });
export function indexedRankSchema(candidates: { sources: { id: string }[] }[]) {
  const alternatives = candidates.map((candidate, index) => rankSchema.shape.matches.element.omit({ repo: true, checkedAt: true }).extend({ candidateIndex: z.literal(index), sourceIds: z.array(z.enum(candidate.sources.map(source => source.id))).min(1).max(2) }));
  return rankSchema.extend({ matches: z.array(z.union(alternatives)).max(3) });
}
export function buildQueries(intent: SearchIntent): string[] { return [...new Set(intent.queries)].slice(0, 3).map(q => `${q.replace(/(?:-?archived|is):\S+/gi, '').slice(0, 180).trim()} archived:false is:public`); }
export function enforceLanguageConstraint(request: string, languages: string[]) {
  const found = request.match(/\bonly\s+(python|javascript|typescript|rust|go|java|ruby|c\+\+)|\b(python|javascript|typescript|rust|go|java|ruby|c\+\+)\s+only\b/i);
  return !found || languages.some(l => l.toLowerCase() === (found[1] || found[2]).toLowerCase());
}
export async function recommend(request: string, profile: ContributorProfile, client: GitHubClient, model: Model): Promise<{ result: SearchResult; evidence: Evidence[] }> {
  const rawIntent = await model.generate(IntentSchema, `${boundary}\nExtract search intent and up to three GitHub repository search queries. Queries must use GitHub search syntax, not natural-language sentences: use one or two keywords or topic qualifiers plus a language qualifier when relevant (examples: language:Python topic:testing; language:Python topic:cli). GitHub ANDs search terms, so include a broad query without words such as beginner, contribution or repository. Hard constraints must come only from the user's explicit request, never from these system instructions. Treat profile languages as preferences unless explicitly required. Request: ${request}\nProfile: ${JSON.stringify(profile)}`);
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
  const indexed = model.rankingStyle === 'candidate-index';
  const outputSchema = () => indexed ? indexedRankSchema(compact) : rankSchema;
  const prompt = () => `${boundary}\nRank up to three candidate repositories for the original request and intent. Prefer one or two well-supported matches. Each purpose needs one short sentence; each explanation list needs at most two brief items of 120 characters. Keep the complete JSON under 1000 tokens. Skill fit, verified available work, setup burden, interests and time matter; stars do not. Obey every hard constraint. If none strongly fit, set noStrongMatch true and offer the nearest permitted alternatives with readiness learn_first and clear skill gaps. Choose only an open unassigned issue without observed competing work, otherwise issueNumber null. checkedAt must come from evidence. Request: ${request}. Profile: ${JSON.stringify(profile)}. Intent: ${JSON.stringify(intent)}. Evidence: ${JSON.stringify(compact)}`;
  const encode = new TextEncoder();
  const rankingPrompt = () => indexed ? `${prompt()}\nSelect candidateIndex using the zero-based position in the Evidence array (0 to ${compact.length - 1}). Never repeat an index. Repository identities and checkedAt will be filled by the backend. Cite only source IDs belonging to the selected candidate.` : prompt();
  const allowance = model.remainingInputBytes ?? 20000;
  const schemaBytes = () => encode.encode(JSON.stringify(z.toJSONSchema(outputSchema()))).byteLength;
  while (compact.length && (generationInputBound(encode.encode(rankingPrompt()).byteLength, schemaBytes()) > allowance || indexed && schemaBytes() > 12000)) compact.pop();
  if (compact.length < initialCount) limitations.push('Fewer candidates were compared to stay within the remaining analysis budget.');
  if (!compact.length) return { result: { matches: [], status: 'no_strong_match', searchLimitations: [...limitations, 'The analysis budget could not fit a candidate comparison. Try narrowing the request or profile.'], intent }, evidence };
  let ranked: z.infer<typeof rankSchema>;
  if (indexed) {
    const schema = indexedRankSchema(compact); const generated = schema.parse(await model.generate(schema, rankingPrompt()));
    const seen = new Set<number>();
    const unique = generated.matches.filter(match => { if (seen.has(match.candidateIndex)) return false; seen.add(match.candidateIndex); return true; });
    if (unique.length < generated.matches.length) limitations.push('Repeated local AI selections were removed.');
    ranked = { ...generated, matches: unique.map(({ candidateIndex, ...match }) => ({ ...match, repo: compact[candidateIndex].repo, checkedAt: compact[candidateIndex].checkedAt })) };
  } else ranked = rankSchema.parse(await model.generate(rankSchema, rankingPrompt()));
  const matches = validateMatches(ranked.matches, evidence);
  return { result: { matches, intent, status: ranked.noStrongMatch || !matches.length ? 'no_strong_match' : limitations.length ? 'partial' : 'complete', searchLimitations: [...limitations, ...ranked.limitations, 'Results are a bounded shortlist, not an exhaustive search of GitHub.'].slice(0, 20) }, evidence };
}
