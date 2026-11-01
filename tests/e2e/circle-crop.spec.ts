import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
test('crop uses viewport scale and masks every pixel outside the selected polygon', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async path => {
    const { cropCapture } = await import(path);
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 400;
    const context = canvas.getContext('2d')!; context.fillStyle = '#ff0000'; context.fillRect(0, 0, 400, 400); context.fillStyle = '#00ff00'; context.fillRect(150, 150, 100, 100);
    const region = { points: [{ x: 100, y: 40 }, { x: 160, y: 100 }, { x: 100, y: 160 }, { x: 40, y: 100 }], viewport: { width: 200, height: 200, scrollX: 0, scrollY: 1000 } };
    const image = await cropCapture(canvas.toDataURL('image/png'), region);
    const bitmap = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${image.data}`)).blob());
    const output = document.createElement('canvas'); output.width = image.width; output.height = image.height; const pixels = output.getContext('2d')!; pixels.drawImage(bitmap, 0, 0);
    return { width: image.width, height: image.height, corner: Array.from(pixels.getImageData(1, 1, 1, 1).data), center: Array.from(pixels.getImageData(image.width / 2, image.height / 2, 1, 1).data) };
  }, `/@fs/${resolve('apps/extension/features/selection/capture-image.ts').replaceAll('\\', '/')}`);
  expect(result.width).toBe(240); expect(result.height).toBe(240);
  expect(result.corner.slice(0, 3).every(channel => channel > 235)).toBe(true);
  expect(result.center[1]).toBeGreaterThan(200); expect(result.center[0]).toBeLessThan(30);
});
test('image circle removes its overlay before requesting capture without requiring a repository link', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async path => {
    const state = globalThis as any;
    state.chrome = { runtime: { sendMessage: async (message: unknown) => { state.__capture = { message, overlayVisible: !!document.getElementById('unforked-circle-overlay') }; return { ok: true }; } } };
    const { startCircle } = await import(path); startCircle('image');
  }, `/@fs/${resolve('apps/extension/features/selection/circle-overlay.ts').replaceAll('\\', '/')}`);
  await page.mouse.move(30, 300); await page.mouse.down(); await page.mouse.move(300, 300, { steps: 10 }); await page.mouse.move(300, 500, { steps: 10 }); await page.mouse.move(30, 500, { steps: 10 }); await page.mouse.move(30, 300, { steps: 10 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (globalThis as any).__capture?.message?.type)).toBe('UNFORKED_CAPTURE_IMAGE');
  expect(await page.evaluate(() => (globalThis as any).__capture.overlayVisible)).toBe(false);
});
