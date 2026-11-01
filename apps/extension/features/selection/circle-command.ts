interface Tab { id?: number; url?: string }
interface Api { open(tabId: number): Promise<unknown>; current(): Promise<Tab | undefined>; start(tabId: number): Promise<unknown> }
const chromeApi: Api = { open: id => chrome.sidePanel.open({ tabId: id }), current: async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0], start: id => chrome.tabs.sendMessage(id, { type: 'UNFORKED_CIRCLE', mode: 'image' }) };
export async function circleCommand(command: string, invokedTab?: Tab, api: Api = chromeApi) {
  if (command !== 'circle-repository') return;
  const tab = invokedTab || await api.current();
  if (tab?.id === undefined || !tab.url?.startsWith('https://github.com/')) return;
  // With the onCommand tab, open() is invoked before the first await so Chrome's
  // user gesture reaches the side-panel API. Drawing still works if it rejects.
  await api.open(tab.id).catch(() => {});
  await api.start(tab.id);
}
