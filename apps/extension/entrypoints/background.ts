import { defineBackground } from 'wxt/utils/define-background';
import { parseRepoRef } from '@unforked/contracts';
export default defineBackground(() => {
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
    void chrome.storage.session.set({ selectedRepo: repo, selectedTab: tab.id, selectedPageUrl: info.pageUrl || tab.url, selectionCreatedAt: Date.now(), selectionNonce: crypto.randomUUID() });
  });
  chrome.commands.onCommand.addListener(async command => {
    if (command !== 'circle-repository') return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url?.startsWith('https://github.com/')) {
      try { await chrome.tabs.sendMessage(tab.id, { type: 'UNFORKED_CIRCLE' }); } catch { /* Page may have navigated; user can retry from sidebar. */ }
    }
  });
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== chrome.runtime.id || !sender.tab?.id || !sender.tab.url?.startsWith('https://github.com/') || message.type !== 'UNFORKED_SELECTED') return;
    const repo = parseRepoRef(`${message.repo?.owner}/${message.repo?.name}`); if (!repo) return;
    void chrome.sidePanel.open({ tabId: sender.tab.id });
    void chrome.storage.session.set({ selectedRepo: repo, selectedTab: sender.tab.id, selectedPageUrl: sender.tab.url, selectionCreatedAt: Date.now(), selectionNonce: crypto.randomUUID() });
  });
});
