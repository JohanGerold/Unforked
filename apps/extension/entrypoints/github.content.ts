import { defineContentScript } from 'wxt/utils/define-content-script';
import { parseRepoRef } from '@unforked/contracts';
import { startCircle } from '../features/selection/circle-overlay';
export default defineContentScript({ matches: ['https://github.com/*'], main(ctx) {
  let cleanup: (() => void) | undefined;
  const cancel = () => { cleanup?.(); cleanup = undefined; };
  const listener = (message: { type?: string }, sender: chrome.runtime.MessageSender, reply: (value: unknown) => void) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === 'UNFORKED_CIRCLE') { cancel(); cleanup = startCircle(); reply({ ok: true }); }
    if (message.type === 'UNFORKED_CONTEXT') reply({ repo: parseRepoRef(location.href) });
  };
  chrome.runtime.onMessage.addListener(listener);
  let previous = location.href;
  const observer = new MutationObserver(() => {
    if (previous === location.href) return; previous = location.href; cancel();
    void chrome.runtime.sendMessage({ type: 'UNFORKED_NAVIGATED', repo: parseRepoRef(location.href) }).catch(() => {});
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ctx.onInvalidated(() => { cancel(); observer.disconnect(); chrome.runtime.onMessage.removeListener(listener); });
} });
