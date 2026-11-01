import { expect, it } from 'vitest';
import { circleCommand } from '../../apps/extension/features/selection/circle-command';
it('opens from the command gesture before awaiting anything, then starts image selection', async () => {
  const events: string[] = []; let release!: () => void;
  const pending = circleCommand('circle-repository', { id: 1, url: 'https://github.com/psf/requests' }, { open: async () => { events.push('open'); await new Promise<void>(done => { release = done; }); }, current: async () => { events.push('query'); return undefined; }, start: async () => { events.push('draw'); } });
  expect(events).toEqual(['open']); release(); await pending; expect(events).toEqual(['open', 'draw']);
});
it('a panel-opening rejection does not swallow the drawing command', async () => {
  let drawn = false;
  await circleCommand('circle-repository', { id: 1, url: 'https://github.com/psf/requests' }, { open: async () => { throw new Error('no panel gesture'); }, current: async () => undefined, start: async () => { drawn = true; } });
  expect(drawn).toBe(true);
});
