import { AppError, EvidenceSchema, repoKey, repoUrl, type RepoRef, type Source } from '@unforked/contracts';
import type { GitHubClient } from './client';

const manifestNames = ['pyproject.toml', 'package.json', 'Cargo.toml', 'go.mod', 'CMakeLists.txt', 'pom.xml', 'build.gradle', 'meson.build', 'setup.cfg', 'setup.py', 'requirements.txt', 'Gemfile'];
const safePath = (path: string) => path.length <= 220 && /^[\w./-]+$/.test(path) && !path.split('/').some(part => !part || part === '.' || part === '..') && !/(?:^|\/)(?:vendor|node_modules|dist|build|generated|\.git|fixtures|testdata)(?:\/|$)/i.test(path);
const isTest = (path: string) => /(?:^|\/)(?:tests?|testing)(?:\/|$)|(?:test_|[._]test\.)/i.test(path);
function symbols(text: string) {
  const definitions = text.split('\n').filter(line => /^\s*(?:from\s+\S+\s+import|import\s+|(?:async\s+)?def\s+|class\s+|(?:export\s+)?(?:async\s+)?function\s+|(?:export\s+)?(?:class|interface)\s+|#include\s*|use\s+|(?:pub\s+)?(?:fn|struct|trait)\s+|func\s+|@pytest\.)/.test(line)).slice(0, 35).join('\n').slice(0, 2200);
  return `Observed imports and definitions:\n${definitions || 'No recognized definitions in this sample.'}\nOpening code excerpt:\n${text.slice(0, 1200)}`;
}
export async function fetchLearningEvidence(repo: RepoRef, client: GitHubClient) {
  const base = `/repos/${repo.owner}/${repo.name}`; const key = repoKey(repo); const url = repoUrl(repo);
  const metadata = await client.get(base, true);
  if (metadata.private !== false || metadata.visibility === 'private') throw new AppError('INVALID_INPUT', 'Unforked currently supports public repositories only.');
  const sources: Source[] = [{ id: `${key}:repo`, label: 'Repository overview', url, excerpt: JSON.stringify({ description: metadata.description, topics: metadata.topics }) }];
  const limitations: string[] = []; let calls = 1;
  const optional = async (path: string) => {
    if (++calls > 14) return null;
    try { return await client.get(path); }
    catch (error) {
      if (error instanceof AppError && ['RATE_LIMITED', 'BUDGET_EXHAUSTED'].includes(error.code)) throw error;
      if (!(error instanceof AppError && error.code === 'NOT_FOUND')) limitations.push('Some project files could not be inspected.');
      return null;
    }
  };
  const branch = String(metadata.default_branch || 'HEAD');
  const document = async (path: string, label: string, sourceCode = false, readme = false) => {
    if (!safePath(path) || sources.length >= 10) return false;
    const data = await optional(readme ? `${base}/readme` : `${base}/contents/${path.split('/').map(encodeURIComponent).join('/')}`);
    if (!data?.content || data.encoding !== 'base64' || data.type === 'symlink' || data.type === 'submodule') return false;
    try {
      const content = new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\s/g, '')), c => c.charCodeAt(0)));
      const id = sourceCode ? `source-${sources.filter(source => source.label.startsWith('Source sample:')).length}` : label.startsWith('Contribution guide:') ? 'guide' : path;
      sources.push({ id: `${key}:${id}`, label, url: readme ? `${url}#readme` : `${url}/blob/${encodeURIComponent(branch)}/${path.split('/').map(encodeURIComponent).join('/')}`, excerpt: sourceCode ? symbols(content) : content.slice(0, 6500) });
      return true;
    } catch { return false; }
  };
  if (!await document('README', 'README', false, true)) limitations.push('README was not available.');
  const languages = await optional(`${base}/languages`);
  if (languages && !Array.isArray(languages)) sources.push({ id: `${key}:languages`, label: 'Repository languages', url, excerpt: JSON.stringify(languages).slice(0, 2000) });
  const root = await optional(`${base}/contents`);
  const entries = (Array.isArray(root) ? root : []).slice(0, 100);
  sources.push({ id: `${key}:files`, label: 'Root files', url, excerpt: entries.map(entry => entry.name).join(', ').slice(0, 4000) });
  const treeData = await optional(`${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  const files: string[] = (Array.isArray(treeData?.tree) ? treeData.tree : []).filter((entry: any) => entry.type === 'blob' && ['100644', '100755'].includes(entry.mode) && typeof entry.path === 'string' && safePath(entry.path) && Number(entry.size) <= 80000).map((entry: any) => entry.path);
  if (treeData?.truncated) limitations.push('The repository file listing was incomplete.');
  const guide = entries.map(entry => entry.name).find((name: unknown) => typeof name === 'string' && /^CONTRIBUTING\.(?:md|rst|txt)$/i.test(name)) || files.find(path => /(?:^|\/)CONTRIBUTING\.(?:md|rst|txt)$/i.test(path));
  if (guide) await document(guide, `Contribution guide: ${guide}`);
  const manifests = manifestNames.filter(name => entries.some(entry => entry.name === name && entry.type !== 'dir')).slice(0, 2);
  for (const path of manifests) await document(path, `Dependency manifest: ${path}`);
  if (!manifests.length) limitations.push('No recognized root dependency manifest was available; nested dependencies were not exhaustively inspected.');
  const candidates = files.filter(path => /\.(?:py|js|jsx|ts|tsx|cpp|cc|c|h|hpp|rs|go|java|rb)$/.test(path) && !manifestNames.includes(path) && !/(?:^|\/)(?:__init__|__main__|index\.d)\./.test(path));
  const score = (path: string) => (/(?:^|\/)(?:src|lib|app|internal)(?:\/|$)/.test(path) ? 100 : 0) + (/(?:^|\/)(?:main|core|client|session)\./.test(path) ? 30 : 0) - path.length / 100;
  candidates.sort((a, b) => score(b) - score(a) || a.localeCompare(b));
  const implementation = candidates.find(path => !isTest(path)); const test = candidates.find(isTest);
  const samples = [...new Set([implementation, test || candidates.find(path => path !== implementation)].filter((path): path is string => !!path))];
  let sampled = 0; for (const path of samples) if (await document(path, `Source sample: ${path}`, true)) sampled++;
  if (!sampled) limitations.push('No source-code sample could be read; concept requirements are limited to documentation and dependency evidence.');
  limitations.push('Only selected manifests and source snippets were inspected; requirements can differ by contribution area.', 'Project files may be cached for up to one hour. A listed optional dependency is not automatically a prerequisite.');
  return EvidenceSchema.parse({ repo, description: metadata.description || '', languages: languages ? Object.keys(languages).slice(0, 20) : metadata.language ? [metadata.language] : [], topics: (metadata.topics || []).slice(0, 20), archived: !!metadata.archived, isPublic: true, updatedAt: metadata.pushed_at || '', checkedAt: new Date().toISOString(), sources, issues: [], mergedPulls: 0, completeness: 'partial', limitations: [...new Set(limitations)].slice(0, 10) });
}
