import { RepoRefSchema, type RepoRef } from '@unforked/contracts';
interface SelectionStorage { get(keys: string[]): Promise<Record<string, unknown>>; remove(keys: string[]): Promise<void> }
export function createSelectionConsumer(storage: SelectionStorage) {
  let queue = Promise.resolve();
  return (tab: { id?: number; url?: string }): Promise<RepoRef | null> => {
    const result = queue.then(async () => {
      const keys = ['selectedRepo', 'selectedTab', 'selectedPageUrl', 'selectionNonce', 'selectionCreatedAt'];
      const data = await storage.get(keys);
      if (typeof data.selectionNonce !== 'string' || data.selectedTab !== tab.id) return null;
      await storage.remove(keys);
      if (data.selectedPageUrl !== tab.url || typeof data.selectionCreatedAt !== 'number' || Date.now() - data.selectionCreatedAt > 30000) return null;
      const repo = RepoRefSchema.safeParse(data.selectedRepo); return repo.success ? repo.data : null;
    });
    queue = result.then(() => {}, () => {}); return result;
  };
}
