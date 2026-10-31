import { describe, expect, it } from 'vitest';
import { parseRepoRef } from '../../packages/contracts/src/repo-ref';
import { createLocalStore } from '../../apps/extension/lib/storage';
import { resolveSelection } from '../../apps/extension/features/selection/resolve-selection';
import { RequestGate } from '../../apps/extension/lib/request-state';

describe('repository identity', () => {
  it.each(['https://github.com.evil.test/a/b', 'https://evil.test/a/b', 'http://github.com/a/b', 'https://u:p@github.com/a/b', 'https://github.com/topics/python', 'https://github.com/a'])('rejects unsafe or non-repository input %s', input => {
    expect(parseRepoRef(input)).toBeNull();
  });
  it('canonicalizes nested repository links without preserving queries', () => {
    expect(parseRepoRef('https://github.com/psf/requests/issues/12?x=y#top')).toEqual({ owner: 'psf', name: 'requests' });
    expect(parseRepoRef('psf/requests.git')).toEqual({ owner: 'psf', name: 'requests' });
  });
});
describe('local profile and saves', () => {
  const profile = { schemaVersion: 1, languages: ['Python'], knownConcepts: ['classes'], interests: ['developer tools'], gitExperience: 'basic', availableHours: 4, preferences: '' };
  it('profile survives storage reinitialization', async () => {
    const data: Record<string, unknown> = {};
    const adapter = { get: async (key: string) => data[key], set: async (key: string, value: unknown) => { data[key] = value; }, remove: async (key: string) => { delete data[key]; } };
    await createLocalStore(adapter).saveProfile(profile);
    expect(await createLocalStore(adapter).loadProfile()).toEqual(profile);
  });
  it('corrupt profiles recover to the empty state', async () => {
    const store = createLocalStore({ get: async () => ({ schemaVersion: 99 }), set: async () => {}, remove: async () => {} });
    expect(await store.loadProfile()).toBeNull();
  });
});
describe('selection and navigation', () => {
  const links = [ { repo: { owner: 'psf', name: 'requests' }, bounds: { left: 10, top: 10, right: 90, bottom: 30 } }, { repo: { owner: 'pallets', name: 'flask' }, bounds: { left: 10, top: 100, right: 90, bottom: 120 } } ];
  it('selects only an enclosed link and deduplicates references', () => {
    const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }];
    expect(resolveSelection(points, [links[0], links[0], links[1]])).toEqual({ kind: 'selected', repo: { owner: 'psf', name: 'requests' } });
  });
  it('returns candidates rather than guessing when two repositories are enclosed', () => {
    expect(resolveSelection([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 150 }, { x: 0, y: 150 }], links).kind).toBe('ambiguous');
  });
  it('rejects empty and tiny gestures', () => { expect(resolveSelection([], links).kind).toBe('none'); });
  it('prevents a cancelled or older request from replacing a newer result', () => {
    const gate = new RequestGate(); const a = gate.start(); const b = gate.start();
    expect(a.signal.aborted).toBe(true); expect(gate.isCurrent(a.id)).toBe(false); expect(gate.isCurrent(b.id)).toBe(true);
    gate.cancel(); expect(gate.isCurrent(b.id)).toBe(false);
  });
});
