import { z } from 'zod';
import { LocalGenerateSchema, LOCAL_CONTEXT, INPUT_OVERHEAD_BYTES } from './local-ai';
export const VISION_BODY_LIMIT = 350000;
export const VISION_IMAGE_BYTES = 240000;
export const VISION_MAX_OUTPUT = 900;
export const VISION_IMAGE_TOKENS = 8192;
export function jpegDimensions(data: string): { width: number; height: number } | null {
  if (!data || data.length > Math.ceil(VISION_IMAGE_BYTES / 3) * 4 || data.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
  let bytes: string; try { bytes = atob(data); } catch { return null; }
  if (bytes.length > VISION_IMAGE_BYTES || bytes.length < 20 || bytes.charCodeAt(0) !== 0xff || bytes.charCodeAt(1) !== 0xd8 || bytes.charCodeAt(bytes.length - 2) !== 0xff || bytes.charCodeAt(bytes.length - 1) !== 0xd9) return null;
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes.charCodeAt(offset++) !== 0xff) return null;
    while (bytes.charCodeAt(offset) === 0xff) offset++;
    const marker = bytes.charCodeAt(offset++);
    if (marker === 0xda || marker === 0xd9) return null;
    const length = bytes.charCodeAt(offset) * 256 + bytes.charCodeAt(offset + 1);
    if (length < 2 || offset + length > bytes.length) return null;
    if (marker === 0xc0 || marker === 0xc2) {
      if (length < 8 || bytes.charCodeAt(offset + 2) !== 8) return null;
      return { height: bytes.charCodeAt(offset + 3) * 256 + bytes.charCodeAt(offset + 4), width: bytes.charCodeAt(offset + 5) * 256 + bytes.charCodeAt(offset + 6) };
    }
    offset += length;
  }
  return null;
}
export const CircleImageSchema = z.object({ mime: z.literal('image/jpeg'), data: z.string().min(1).max(320000), width: z.number().int().min(32).max(1024), height: z.number().int().min(32).max(1024) }).strict().refine(image => { const size = jpegDimensions(image.data); return size?.width === image.width && size.height === image.height; }, 'The selected image must be a bounded JPEG with matching dimensions.');
export type CircleImage = z.infer<typeof CircleImageSchema>;
export const CircleRegionSchema = z.object({ points: z.array(z.object({ x: z.number().finite(), y: z.number().finite() }).strict()).min(3).max(240), viewport: z.object({ width: z.number().int().min(32).max(6000), height: z.number().int().min(32).max(4000), scrollX: z.number().min(0).max(10000000), scrollY: z.number().min(0).max(10000000) }).strict() }).strict().refine(region => {
  const xs = region.points.map(point => point.x), ys = region.points.map(point => point.y);
  const area = Math.abs(region.points.reduce((sum, point, index) => { const next = region.points[(index + 1) % region.points.length]; return sum + point.x * next.y - next.x * point.y; }, 0)) / 2;
  return area >= 256 && region.points.every(point => point.x >= 0 && point.y >= 0 && point.x <= region.viewport.width && point.y <= region.viewport.height) && Math.max(...xs) - Math.min(...xs) >= 32 && Math.max(...ys) - Math.min(...ys) >= 32;
}, 'Draw a larger circle inside the visible page.');
export type CircleRegion = z.infer<typeof CircleRegionSchema>;
export const VisionAnswerSchema = z.object({ title: z.string().trim().min(1).max(120), explanation: z.string().trim().min(1).max(2600), visibleText: z.array(z.string().max(350)).max(6), uncertainty: z.string().max(500) });
export type VisionAnswer = z.infer<typeof VisionAnswerSchema>;
export const LocalVisionGenerateSchema = LocalGenerateSchema.safeExtend({ prompt: z.string().min(1).max(6000), image: CircleImageSchema, maxOutputTokens: z.number().int().min(1).max(VISION_MAX_OUTPUT) }).superRefine((input, context) => {
  const encode = new TextEncoder(); const bytes = encode.encode(input.prompt).byteLength; const schema = encode.encode(JSON.stringify(input.schema)).byteLength;
  if (bytes > 6000 || bytes + schema + INPUT_OVERHEAD_BYTES + VISION_IMAGE_TOKENS + input.maxOutputTokens > LOCAL_CONTEXT) context.addIssue({ code: 'custom', message: 'This image analysis exceeds the local context limit.' });
});
