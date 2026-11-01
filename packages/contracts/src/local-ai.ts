import { z } from 'zod';

export const LOCAL_MODEL = 'qwen3.5:4b';
export const LOCAL_CONTEXT = 32768;
export const LOCAL_MAX_OUTPUT = 1200;
export const LOCAL_INPUT_LIMIT = 30000;
export const INPUT_OVERHEAD_BYTES = 1024;
export const LOCAL_BODY_LIMIT = 48000;
const size = (value: string) => new TextEncoder().encode(value).byteLength;
export const LocalGenerateSchema = z.object({ requestId: z.string().uuid(), prompt: z.string().min(1).max(30000), schema: z.record(z.string(), z.unknown()), maxOutputTokens: z.number().int().min(1).max(LOCAL_MAX_OUTPUT) }).strict().superRefine((value, context) => {
  const schema = JSON.stringify(value.schema); const bound = size(value.prompt) + size(schema) + INPUT_OVERHEAD_BYTES;
  if (size(schema) > 12000 || bound > LOCAL_INPUT_LIMIT || bound + value.maxOutputTokens > LOCAL_CONTEXT || value.schema.type !== 'object') context.addIssue({ code: 'custom', message: 'The requested analysis exceeds the local model limits.' });
});
export const LocalResponseSchema = z.object({ requestId: z.string().uuid(), model: z.literal(LOCAL_MODEL), data: z.unknown(), usage: z.object({ inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative().max(LOCAL_MAX_OUTPUT) }) });
export class PayloadError extends Error { constructor(public status: number) { super(status === 413 ? 'The request is too large.' : 'The request is not valid JSON.'); } }
export async function readBoundedJson(message: { body: ReadableStream<Uint8Array> | null }, limit: number): Promise<any> {
  const reader = message.body?.getReader(); if (!reader) throw new PayloadError(400);
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; if (length > limit) { await reader.cancel(); throw new PayloadError(413); } chunks.push(part.value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new PayloadError(400); }
}
