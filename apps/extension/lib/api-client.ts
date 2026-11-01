import { AnswerSchema, IssueCheckSchema, LearningSchema, SearchResultSchema, SummarySchema, type ApiInput, type ApiResponse } from '@unforked/contracts';
import { z } from 'zod';
import { SourceSchema } from '@unforked/contracts';
export const apiOrigin = __API_ORIGIN__;
export class ApiError extends Error { constructor(public code: string, message: string, public retryAfterSeconds?: number) { super(message); } }
export async function callApi(action: string, input: ApiInput, signal: AbortSignal): Promise<ApiResponse<any>> {
  let response: Response;
  const session = globalThis.chrome?.storage?.session ? (await chrome.storage.session.get('sessionToken')).sessionToken : sessionStorage.getItem('unforked:session');
  try { response = await fetch(`${apiOrigin}/v1/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}) }, body: JSON.stringify(input), signal }); }
  catch (e) { if (signal.aborted) throw e; throw new ApiError('CONNECTION_FAILED', 'Cannot reach Unforked. Start the local API with npm run dev:api, then retry.'); }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.error?.code || 'SERVER_ERROR', body?.error?.userMessage || 'The action could not finish. Try again.', body?.error?.retryAfterSeconds);
  const schema = action === 'search' ? SearchResultSchema : action === 'summary' ? SummarySchema : action === 'learning-path' ? LearningSchema : action === 'issue-check' ? IssueCheckSchema : AnswerSchema;
  const envelope = z.object({ data: schema, demo: z.boolean(), aiProvider: z.enum(['gemini', 'ollama']).optional(), requestId: z.string(), sources: SourceSchema.array().max(80), checkedAt: z.string() }).safeParse(body);
  if (!envelope.success || envelope.data.requestId !== input.requestId) throw new ApiError('INVALID_RESPONSE', 'The response could not be verified. Please retry.');
  return envelope.data;
}
