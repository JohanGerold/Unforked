import { MatchSchema, ProfileSchema, SourceSchema, repoKey, type Match, type RepoRef, type Source } from '@unforked/contracts';
import { z } from 'zod';
const SavedSchema = MatchSchema.extend({ savedSources: SourceSchema.array().max(10).default([]), demo: z.boolean().default(false) });
export type SavedMatch = z.infer<typeof SavedSchema>;
export interface StorageAdapter { get(key: string): Promise<unknown>; set(key: string, value: unknown): Promise<void>; remove(key: string): Promise<void> }
export function createLocalStore(adapter: StorageAdapter) {
  let queue = Promise.resolve();
  const enqueue = (work: () => Promise<void>) => { const next = queue.then(work); queue = next.catch(() => {}); return next; };
  const store = {
    async loadProfile() { const result = ProfileSchema.safeParse(await adapter.get('profile')); return result.success ? result.data : null; },
    async saveProfile(profile: unknown) { await adapter.set('profile', ProfileSchema.parse(profile)); },
    async listSaved(): Promise<SavedMatch[]> { const result = SavedSchema.array().max(100).safeParse(await adapter.get('saved')); return result.success ? result.data : []; },
    saveRepo(card: Match, sources: Source[] = [], demo = false) { return enqueue(async () => { const saved = await store.listSaved(); const entry = SavedSchema.parse({ ...card, savedSources: sources.filter(s => card.sourceIds.includes(s.id)), demo }); await adapter.set('saved', [entry, ...saved.filter(c => repoKey(c.repo) !== repoKey(card.repo))].slice(0, 100)); }); },
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
