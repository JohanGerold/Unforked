import { defineBackground } from 'wxt/utils/define-background';
import { parseRepoRef } from '@unforked/contracts';
import { captureCircle } from '../features/selection/capture-image';
import { circleCommand } from '../features/selection/circle-command';
export default defineBackground(() => {
  const captures = new Map<number, number>();
  const invalidate = (windowId: number) => captures.set(windowId, (captures.get(windowId) || 0) + 1);
  const imageKeys = ['selectedImage', 'selectedTab', 'selectedPageUrl', 'selectedWindow', 'selectionCreatedAt', 'selectionNonce'];
  chrome.tabs.onActivated.addListener(info => { invalidate(info.windowId); void chrome.storage.session.get(imageKeys).then(data => { if (data.selectedImage && data.selectedWindow === info.windowId && data.selectedTab !== info.tabId) return chrome.storage.session.remove(imageKeys); }); });
  chrome.tabs.onUpdated.addListener((id, change, tab) => { if (!change.url && change.status !== 'loading') return; invalidate(tab.windowId); void chrome.storage.session.get(imageKeys).then(data => { if (data.selectedImage && data.selectedTab === id) return chrome.storage.session.remove(imageKeys); }); });
  chrome.tabs.onRemoved.addListener((id, info) => { invalidate(info.windowId); void chrome.storage.session.get(imageKeys).then(data => { if (data.selectedImage && data.selectedTab === id) return chrome.storage.session.remove(imageKeys); }); });
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({ id: 'explain-repository', title: 'Explain repository with Unforked', contexts: ['link', 'page'], documentUrlPatterns: ['https://github.com/*'] });
    });
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== 'explain-repository' || !tab?.id) return;
    const repo = parseRepoRef(info.linkUrl || info.pageUrl || '');
    if (!repo) return;
    // Open synchronously in the user gesture, then persist context for a newly mounted panel.
    void chrome.sidePanel.open({ tabId: tab.id });
    void chrome.storage.session.set({ selectedImage: null, selectedRepo: repo, selectedTab: tab.id, selectedPageUrl: info.pageUrl || tab.url, selectionCreatedAt: Date.now(), selectionNonce: crypto.randomUUID() });
  });
  chrome.commands.onCommand.addListener((command, tab) => { void circleCommand(command, tab).catch(() => {}); });
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== chrome.runtime.id || !sender.tab?.id || !sender.tab.url?.startsWith('https://github.com/')) return;
    if (message.type === 'UNFORKED_NAVIGATED') { invalidate(sender.tab.windowId); return; }
    if (message.type === 'UNFORKED_CAPTURE_IMAGE') {
      const tab = sender.tab; const windowId = tab.windowId; const nonce = (captures.get(windowId) || 0) + 1; captures.set(windowId, nonce);
      void (async () => {
        try {
          if (typeof message.createdAt !== 'number' || Date.now() - message.createdAt > 5000 || message.createdAt > Date.now() + 1000) throw new Error('The selection expired. Draw the circle again.');
          const selectedImage = await captureCircle(tab, message, undefined, () => captures.get(windowId) === nonce);
          if (captures.get(windowId) !== nonce) return reply({ ok: false });
          await chrome.storage.session.set({ selectedImage, selectedRepo: null, selectedTab: tab.id, selectedWindow: windowId, selectedPageUrl: tab.url, selectionCreatedAt: Date.now(), selectionNonce: crypto.randomUUID(), circleError: null });
          reply({ ok: true });
        } catch (error) {
          if (captures.get(windowId) !== nonce) return reply({ ok: false });
          const message = error instanceof Error && /^(?:Click Unforked|The active page|The page moved|The selection expired|Open a GitHub|This image|The captured)/.test(error.message) ? error.message : 'Could not capture this selection. Try drawing a larger circle.';
          await chrome.storage.session.set({ circleError: message }); reply({ ok: false });
        }
      })();
      return true;
    }
    if (message.type !== 'UNFORKED_SELECTED') return;
    const repo = parseRepoRef(`${message.repo?.owner}/${message.repo?.name}`); if (!repo) return;
    void chrome.sidePanel.open({ tabId: sender.tab.id });
    void chrome.storage.session.set({ selectedImage: null, selectedRepo: repo, selectedTab: sender.tab.id, selectedPageUrl: sender.tab.url, selectionCreatedAt: Date.now(), selectionNonce: crypto.randomUUID() });
  });
});
