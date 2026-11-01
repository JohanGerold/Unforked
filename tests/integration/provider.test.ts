import { expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createModel } from '../../apps/api/src/ai/provider';

it('records provider failure metadata without logging keys, prompts or response bodies', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', async () => Response.json({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'private-response-do-not-log' } }, { status: 429 }));
  try {
    await expect(createModel('private-key-do-not-log', 'gemini-3.5-flash-lite').generate(z.object({ ok: z.boolean() }), 'private-prompt-do-not-log')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(log).toHaveBeenCalled();
    const diagnostic = JSON.parse(String(log.mock.calls[0][0]));
    expect(diagnostic).toMatchObject({ event: 'ai_failed', status: 429, timedOut: false });
    const serialized = JSON.stringify(diagnostic);
    for (const secret of ['private-key-do-not-log', 'private-prompt-do-not-log', 'private-response-do-not-log']) expect(serialized).not.toContain(secret);
  } finally { vi.unstubAllGlobals(); log.mockRestore(); }
});
it('reports a provider timeout clearly without increasing the deadline or retrying', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort());
  try {
    await expect(createModel('test-key', 'gemini-3.5-flash-lite').generate(z.object({ ok: z.boolean() }), 'Return ok')).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE', message: 'The AI provider did not respond within 45 seconds. Please try again shortly.' });
  } finally { timeout.mockRestore(); log.mockRestore(); }
});
