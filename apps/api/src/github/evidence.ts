import { AppError, EvidenceSchema, repoKey, repoUrl, type RepoRef, type Evidence, type Source, type Issue } from '@unforked/contracts';
import type { GitHubClient } from './client';
export async function fetchEvidence(repo: RepoRef, client: GitHubClient): Promise<Evidence> {
  const base = `/repos/${repo.owner}/${repo.name}`; const key = repoKey(repo); const url = repoUrl(repo);
  const metadata = await client.get(base, true);
  if (metadata.private !== false || metadata.visibility === 'private') throw new AppError('INVALID_INPUT', 'Unforked currently supports public repositories only.');
  const sources: Source[] = [{ id: `${key}:repo`, label: 'Repository overview', url, excerpt: JSON.stringify({ description: metadata.description, topics: metadata.topics, archived: metadata.archived, pushedAt: metadata.pushed_at }) }];
  const limitations: string[] = []; let calls = 1;
  const optional = async (path: string) => { if (++calls > 8) return null; try { return await client.get(path); } catch (e) { if (e instanceof AppError && e.code === 'NOT_FOUND') return null; if (e instanceof AppError && e.code === 'RATE_LIMITED') throw e; limitations.push('Some GitHub evidence could not be retrieved.'); return null; } };
  const document = async (path: string, id: string, label: string) => {
    const data = await optional(path); if (!data?.content || data.encoding !== 'base64') return false;
    try { const content = new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\s/g, '')), c => c.charCodeAt(0))); sources.push({ id: `${key}:${id}`, label, url: id === 'readme' ? `${url}#readme` : `${url}/blob/${encodeURIComponent(metadata.default_branch || 'HEAD')}/${id === 'contributing-dotgithub' ? '.github/' : ''}CONTRIBUTING.md`, excerpt: content.slice(0, 12000) }); if (content.length > 12000) limitations.push(`${label} was shortened for this analysis.`); return true; } catch { return false; }
  };
  if (!await document(`${base}/readme`, 'readme', 'README')) limitations.push('README was not available.');
  if (!await document(`${base}/contents/CONTRIBUTING.md`, 'contributing', 'Contribution guide') && !await document(`${base}/contents/.github/CONTRIBUTING.md`, 'contributing-dotgithub', 'Contribution guide')) limitations.push('No contribution guide was verified.');
  const languages = await optional(`${base}/languages`);
  const files = await optional(`${base}/contents`);
  if (Array.isArray(files)) sources.push({ id: `${key}:files`, label: 'Root files', url, excerpt: files.slice(0, 60).map(f => f.name).join(', ') });
  const issueData = await optional(`${base}/issues?state=open&sort=updated&per_page=20`);
  const issues: Issue[] = (Array.isArray(issueData) ? issueData : []).filter(i => !i.pull_request).map(i => ({ number: i.number, title: String(i.title).slice(0, 2000), body: String(i.body || '').slice(0, 4000), labels: (i.labels || []).map((l: any) => typeof l === 'string' ? l : l.name).slice(0, 20), assignees: i.assignees?.length || 0, updatedAt: i.updated_at || '', state: i.state === 'closed' ? 'closed' : 'open', competingWork: /(?:\/pull\/\d+|working on this|PR\s*#\d+)/i.test(i.body || '') ? 'observed' : 'not_checked' }));
  sources.push({ id: `${key}:issues`, label: 'Sampled open issues', url: `${url}/issues`, excerpt: JSON.stringify(issues).slice(0, 14000) });
  const pulls = await optional(`${base}/pulls?state=closed&sort=updated&per_page=10`);
  const mergedPulls = (Array.isArray(pulls) ? pulls : []).filter(p => p.merged_at).length;
  sources.push({ id: `${key}:pulls`, label: 'Sampled pull requests', url: `${url}/pulls`, excerpt: `${mergedPulls} merged among up to 10 recently updated closed PRs. This sample does not measure response time.` });
  limitations.push('Issue comments and all competing pull requests were not exhaustively checked. Availability can change.');
  return EvidenceSchema.parse({ repo, description: metadata.description || '', languages: languages ? Object.keys(languages).slice(0, 20) : metadata.language ? [metadata.language] : [], topics: (metadata.topics || []).slice(0, 20), archived: !!metadata.archived, isPublic: true, updatedAt: metadata.pushed_at || '', checkedAt: new Date().toISOString(), sources, issues, mergedPulls, completeness: 'partial', limitations });
}
