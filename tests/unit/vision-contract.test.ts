import { expect, it } from 'vitest';
import { CircleImageSchema, CircleRegionSchema, LocalVisionGenerateSchema, VisionRequestSchema } from '@unforked/contracts';
import { imageFixture, visionInput } from '../helpers/vision';
it('accepts a bounded JPEG and rejects image URLs, lying dimensions, corrupt and oversized images', () => {
  const image = imageFixture(); expect(CircleImageSchema.safeParse(image).success).toBe(true);
  for (const invalid of [{ ...image, width: 1025 }, { ...image, width: 100 }, { ...image, data: 'https://evil.test/image.jpg' }, { ...image, data: image.data.slice(0, 80) }, { ...image, data: 'a'.repeat(400000) }]) expect(CircleImageSchema.safeParse(invalid).success).toBe(false);
});
it('binds image requests to a GitHub repository page without query credentials', () => {
  expect(VisionRequestSchema.safeParse(visionInput()).success).toBe(true);
  for (const pageUrl of ['https://evil.test/psf/requests', 'https://github.com/pallets/flask', 'https://github.com/psf/requests?token=secret']) expect(VisionRequestSchema.safeParse({ ...visionInput(), pageUrl }).success).toBe(false);
  for (const pageUrl of ['https://github.com/psf/requests/settings/secrets', 'https://github.com/psf/requests/issues/new']) expect(VisionRequestSchema.safeParse({ ...visionInput(), pageUrl }).success).toBe(false);
  for (const pageUrl of ['https://github.com/psf/requests/wiki/_new', 'https://github.com/psf/requests/wiki/Page/_edit', 'https://github.com/psf/requests/wiki/Page/%5Fedit']) expect(VisionRequestSchema.safeParse({ ...visionInput(), pageUrl }).success).toBe(false);
});
it('validates viewport-contained selection geometry and reserves vision context space', () => {
  const region = { points: [{ x: 10, y: 10 }, { x: 110, y: 10 }, { x: 110, y: 110 }, { x: 10, y: 110 }], viewport: { width: 640, height: 300, scrollX: 0, scrollY: 0 } };
  expect(CircleRegionSchema.safeParse(region).success).toBe(true);
  expect(CircleRegionSchema.safeParse({ ...region, points: [{ x: -10, y: 0 }, { x: 800, y: 0 }, { x: 800, y: 400 }] }).success).toBe(false);
  expect(CircleRegionSchema.safeParse({ ...region, points: [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 200 }] }).success).toBe(false);
  const input = { requestId: crypto.randomUUID(), image: imageFixture(), prompt: 'Explain the image.', schema: { type: 'object' }, maxOutputTokens: 900 };
  expect(LocalVisionGenerateSchema.safeParse(input).success).toBe(true);
  expect(LocalVisionGenerateSchema.safeParse({ ...input, prompt: 'x'.repeat(6001) }).success).toBe(false);
  expect(LocalVisionGenerateSchema.safeParse({ ...input, maxOutputTokens: 1200 }).success).toBe(false);
});
