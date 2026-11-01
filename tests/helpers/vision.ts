import { readFileSync } from 'node:fs';
export const imageFixture = () => ({ mime: 'image/jpeg' as const, data: readFileSync(new URL('../fixtures/code-snippet.jpg', import.meta.url)).toString('base64'), width: 640, height: 300 });
export const visionInput = () => ({ requestId: crypto.randomUUID(), repo: { owner: 'psf', name: 'requests' }, pageUrl: 'https://github.com/psf/requests', image: imageFixture(), question: 'What does this code do?' });
export const visionAnswer = { title: 'Python function', explanation: 'The square function multiplies its argument by itself.', visibleText: ['def square(x):', 'return x * x'], uncertainty: 'Only the selected image was inspected.' };
