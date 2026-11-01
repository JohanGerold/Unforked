import { expect, it } from 'vitest';
import { fetchLearningEvidence } from '../../apps/api/src/github/learning-evidence';
import { GitHubClient } from '../../apps/api/src/github/client';

function fixture(isPrivate = false, treeAvailable = true) {
  const paths: string[] = [];
  const file = (text: string) => Response.json({ encoding: 'base64', content: btoa(text) });
  const client = new GitHubClient('test', async input => {
    const path = new URL(String(input)).pathname; paths.push(path);
    if (path === '/repos/example/tool') return Response.json({ private: isPrivate, description: 'A Python CLI', default_branch: 'main', language: 'Python' });
    if (path.endsWith('/languages')) return Response.json({ Python: 100 });
    if (path.endsWith('/readme')) return file('A Python CLI with a plugin system.');
    if (path.endsWith('/contents')) return Response.json(['pyproject.toml', 'CONTRIBUTING.rst', 'src', 'tests'].map(name => ({ name, type: name.includes('.') ? 'file' : 'dir' })));
    if (path.endsWith('/contents/pyproject.toml')) return file('[project]\ndependencies = ["pluggy>=1"]');
    if (path.endsWith('/contents/CONTRIBUTING.rst')) return file('Contributor guide with Python tests.');
    if (path.includes('/git/trees/')) return treeAvailable ? Response.json({ truncated: false, tree: [{ path: 'src/main.py', type: 'blob', mode: '100644', size: 600 }, { path: 'tests/test_main.py', type: 'blob', mode: '100644', size: 600 }, { path: '../secret.py', type: 'blob', mode: '100644', size: 60 }, { path: 'vendor/other.py', type: 'blob', mode: '100644', size: 60 }] }) : Response.json({}, { status: 404 });
    if (path.endsWith('/contents/src/main.py')) return file('import pluggy\nclass Plugin:\n    def run(self): return 1');
    if (path.endsWith('/contents/tests/test_main.py')) return file('import pytest\n@pytest.fixture\ndef plugin(): return object()');
    return Response.json({}, { status: 404 });
  }, undefined, 40);
  return { client, paths };
}
it('reads detected manifests, RST guides and source/test samples without inspecting issues', async () => {
  const { client, paths } = fixture(); const evidence = await fetchLearningEvidence({ owner: 'example', name: 'tool' }, client);
  expect(evidence.languages).toEqual(['Python']);
  expect(evidence.sources.find(source => source.label.includes('pyproject.toml'))?.excerpt).toContain('pluggy');
  expect(evidence.sources.find(source => source.label.includes('src/main.py'))?.excerpt).toContain('class Plugin');
  expect(evidence.sources.find(source => source.label.includes('tests/test_main.py'))?.excerpt).toContain('pytest.fixture');
  expect(evidence.sources.some(source => source.label.includes('CONTRIBUTING.rst'))).toBe(true);
  expect(paths.some(path => /\/issues|\/pulls|secret|vendor/.test(path))).toBe(false);
  expect(paths.length).toBeLessThanOrEqual(14); expect(evidence.sources.length).toBeLessThanOrEqual(10);
  expect(evidence.limitations.join(' ')).not.toContain('No contribution guide');
});
it('rejects private repositories before reading project files', async () => {
  const { client, paths } = fixture(true);
  await expect(fetchLearningEvidence({ owner: 'example', name: 'tool' }, client)).rejects.toMatchObject({ code: 'INVALID_INPUT' }); expect(paths).toHaveLength(1);
});
it('returns explicit partial evidence when source discovery is unavailable', async () => {
  const { client } = fixture(false, false); const evidence = await fetchLearningEvidence({ owner: 'example', name: 'tool' }, client);
  expect(evidence.limitations.join(' ')).toMatch(/source|sample/i); expect(evidence.completeness).toBe('partial');
});
