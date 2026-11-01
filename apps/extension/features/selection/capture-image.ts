import { CircleImageSchema, CircleRegionSchema, ImageSelectionSchema, VISION_IMAGE_BYTES, imagePageRepo, type CircleImage, type CircleRegion, type ImageSelection } from '@unforked/contracts';
type CaptureTab = { id?: number; windowId?: number; url?: string; active?: boolean };
interface CaptureApi {
  current(windowId: number): Promise<CaptureTab | undefined>;
  context(tabId: number): Promise<{ url: string; width: number; height: number; scrollX: number; scrollY: number }>;
  capture(windowId: number): Promise<string>;
  crop(data: string, region: CircleRegion): Promise<CircleImage>;
}
export async function cropCapture(dataUrl: string, raw: CircleRegion): Promise<CircleImage> {
  const region = CircleRegionSchema.parse(raw); const prefix = 'data:image/png;base64,';
  if (!dataUrl.startsWith(prefix) || dataUrl.length > 16000000) throw new Error('The captured page is too large. Try a smaller browser window.');
  const header = atob(dataUrl.slice(prefix.length, prefix.length + 44));
  const uint = (offset: number) => [0, 1, 2, 3].reduce((value, index) => value * 256 + header.charCodeAt(offset + index), 0);
  const width = uint(16), height = uint(20);
  if (header.slice(1, 4) !== 'PNG' || !width || !height || width * height > 16000000) throw new Error('The captured page size could not be verified.');
  const ratioX = width / region.viewport.width, ratioY = height / region.viewport.height;
  const left = Math.floor(Math.min(...region.points.map(point => point.x)) * ratioX), top = Math.floor(Math.min(...region.points.map(point => point.y)) * ratioY);
  const right = Math.min(width, Math.ceil(Math.max(...region.points.map(point => point.x)) * ratioX)), bottom = Math.min(height, Math.ceil(Math.max(...region.points.map(point => point.y)) * ratioY));
  const sourceWidth = right - left, sourceHeight = bottom - top; const scale = Math.min(1, 1024 / sourceWidth, 1024 / sourceHeight);
  const baseWidth = Math.max(1, Math.round(sourceWidth * scale)), baseHeight = Math.max(1, Math.round(sourceHeight * scale));
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob(), left, top, sourceWidth, sourceHeight, { resizeWidth: baseWidth, resizeHeight: baseHeight });
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const factor = attempt === 3 ? 0.75 : 1; const contentWidth = Math.max(1, Math.round(baseWidth * factor)), contentHeight = Math.max(1, Math.round(baseHeight * factor));
      const canvas = new OffscreenCanvas(Math.max(32, contentWidth), Math.max(32, contentHeight)); const context = canvas.getContext('2d')!;
      const padX = (canvas.width - contentWidth) / 2, padY = (canvas.height - contentHeight) / 2;
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.beginPath();
      region.points.forEach((point, index) => { const x = (point.x * ratioX - left) * contentWidth / sourceWidth + padX, y = (point.y * ratioY - top) * contentHeight / sourceHeight + padY; if (!index) context.moveTo(x, y); else context.lineTo(x, y); });
      context.closePath(); context.clip(); context.drawImage(bitmap, padX, padY, contentWidth, contentHeight);
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: [0.86, 0.72, 0.58, 0.64][attempt] });
      if (blob.size > VISION_IMAGE_BYTES) continue;
      const bytes = new Uint8Array(await blob.arrayBuffer()); let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      return CircleImageSchema.parse({ mime: blob.type, data: btoa(binary), width: canvas.width, height: canvas.height });
    }
    throw new Error('This image is too large. Circle a smaller area.');
  } finally { bitmap.close(); }
}
const chromeCapture: CaptureApi = {
  current: async windowId => (await chrome.tabs.query({ active: true, windowId }))[0],
  context: async tabId => chrome.tabs.sendMessage(tabId, { type: 'UNFORKED_CAPTURE_CONTEXT' }),
  capture: async windowId => chrome.tabs.captureVisibleTab(windowId, { format: 'png' }),
  crop: cropCapture
};
export async function captureCircle(tab: CaptureTab, input: { pageUrl: string; region: CircleRegion }, api: CaptureApi = chromeCapture, isCurrent: () => boolean = () => true): Promise<ImageSelection> {
  if (tab.id === undefined || tab.windowId === undefined || !tab.url || tab.url !== input.pageUrl) throw new Error('The GitHub page changed. Draw the selection again.');
  const url = new URL(input.pageUrl); url.search = ''; url.hash = ''; const repo = imagePageRepo(url.href);
  if (!repo) throw new Error('Open a GitHub repository README, code or issue page to explain an image. Settings and drafts are not supported.');
  const region = CircleRegionSchema.parse(input.region);
  const unchanged = async () => {
    if (!isCurrent()) throw new Error('The active page changed during capture. Draw the selection again.');
    const current = await api.current(tab.windowId!);
    if (!current || current.id !== tab.id || current.url !== input.pageUrl) throw new Error('The active page changed. Draw the selection again.');
    const context = await api.context(tab.id!);
    if (context.url !== input.pageUrl || context.width !== region.viewport.width || context.height !== region.viewport.height || Math.abs(context.scrollX - region.viewport.scrollX) > 1 || Math.abs(context.scrollY - region.viewport.scrollY) > 1) throw new Error('The page moved or changed. Draw the selection again.');
    if (!isCurrent()) throw new Error('The active page changed during capture. Draw the selection again.');
  };
  await unchanged();
  let screenshot: string; try { screenshot = await api.capture(tab.windowId); } catch { throw new Error('Click Unforked’s toolbar icon on GitHub, then try Circle again. Chrome needs that action before image capture.'); }
  await unchanged(); const image = await api.crop(screenshot, region); await unchanged();
  return ImageSelectionSchema.parse({ repo, pageUrl: url.href, image });
}
