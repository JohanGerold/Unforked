const reserved = new Set(['topics', 'settings', 'search', 'explore', 'marketplace', 'collections', 'orgs', 'users', 'login', 'signup', 'notifications', 'pulls', 'issues', 'features', 'about', 'sponsors', 'apps', 'new', 'codespaces', 'dashboard', 'discussions', 'enterprise', 'security', 'site']);
export function parseRepoRef(input: string): { owner: string; name: string } | null {
  try {
    const raw = input.trim();
    const url = new URL(raw.includes('://') ? raw : raw.startsWith('github.com/') ? `https://${raw}` : `https://github.com/${raw}`);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password) return null;
    const [owner, originalName] = url.pathname.split('/').filter(Boolean);
    const name = originalName?.replace(/\.git$/, '');
    if (!owner || !name || reserved.has(owner.toLowerCase()) || !/^[a-z\d][a-z\d-]{0,38}$/i.test(owner) || !/^[\w.-]{1,100}$/.test(name) || name === '.' || name === '..') return null;
    return { owner, name };
  } catch { return null; }
}
