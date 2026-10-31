import { MatchSchema, ProfileSchema, repoKey, type Match, type RepoRef } from '@unforked/contracts';
export interface StorageAdapter { get(key: string): Promise<unknown>; set(key: string, value: unknown): Promise<void>; remove(key: string): Promise<void> }
export function createLocalStore(adapter: StorageAdapter) {
  let queue = Promise.resolve();
  const enqueue = (work: () => Promise<void>) => { const next = queue.then(work); queue = next.catch(() => {}); return next; };
  const store = {
    async loadProfile() { const result = ProfileSchema.safeParse(await adapter.get('profile')); return result.success ? result.data : null; },
    async saveProfile(profile: unknown) { await adapter.set('profile', ProfileSchema.parse(profile)); },
    async listSaved(): Promise<Match[]> { const result = MatchSchema.array().max(100).safeParse(await adapter.get('saved')); return result.success ? result.data : []; },
    saveRepo(card: Match) { return enqueue(async () => { const saved = await store.listSaved(); await adapter.set('saved', [MatchSchema.parse(card), ...saved.filter(c => repoKey(c.repo) !== repoKey(card.repo))].slice(0, 100)); }); },
    removeRepo(repo: RepoRef) { return enqueue(async () => { await adapter.set('saved', (await store.listSaved()).filter(c => repoKey(c.repo) !== repoKey(repo))); }); },
    async clear() { await queue; await adapter.remove('profile'); await adapter.remove('saved'); }
  };
  return store;
}
const browserAdapter: StorageAdapter = {
  async get(key) { if (globalThis.chrome?.storage?.local) return (await chrome.storage.local.get(key))[key]; try { return JSON.parse(localStorage.getItem(`unforked:${key}`) ?? 'null'); } catch { return null; } },
  async set(key, value) { if (globalThis.chrome?.storage?.local) await chrome.storage.local.set({ [key]: value }); else localStorage.setItem(`unforked:${key}`, JSON.stringify(value)); },
  async remove(key) { if (globalThis.chrome?.storage?.local) await chrome.storage.local.remove(key); else localStorage.removeItem(`unforked:${key}`); }
};
export const localStore = createLocalStore(browserAdapter);
