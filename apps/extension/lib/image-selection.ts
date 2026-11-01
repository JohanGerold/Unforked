import { ImageSelectionSchema, type ImageSelection } from '@unforked/contracts';
interface Storage { get(keys: string[]): Promise<Record<string, unknown>>; remove(keys: string[]): Promise<void> }
export function createImageSelectionConsumer(storage: Storage) {
  let queue = Promise.resolve();
  return (tab: { id?: number; url?: string }): Promise<ImageSelection | null> => {
    const result = queue.then(async () => {
      const keys = ['selectedImage', 'selectedRepo', 'selectedTab', 'selectedWindow', 'selectedPageUrl', 'selectionNonce', 'selectionCreatedAt'];
      const data = await storage.get(keys);
      if (!data.selectedImage || typeof data.selectionNonce !== 'string' || data.selectedTab !== tab.id) return null;
      await storage.remove(keys);
      if (data.selectedPageUrl !== tab.url || typeof data.selectionCreatedAt !== 'number' || Date.now() - data.selectionCreatedAt > 30000 || data.selectionCreatedAt > Date.now() + 1000) return null;
      const parsed = ImageSelectionSchema.safeParse(data.selectedImage); return parsed.success ? parsed.data : null;
    });
    queue = result.then(() => {}, () => {}); return result;
  };
}
