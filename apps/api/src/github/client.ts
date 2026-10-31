import { AppError } from '@unforked/contracts';
const cache = new Map<string, { body: unknown; etag: string | null; expires: number }>();
export class GitHubClient {
  remaining = 80;
  constructor(private token?: string, private fetcher: typeof fetch = fetch, private signal?: AbortSignal) {}
  async get(path: string, refresh = false): Promise<any> {
    if (!/^\/(?:repos\/[\w-]+\/[\w.-]+(?:\/(?:readme|languages|contents(?:\/[\w./-]+)?|issues|pulls))?|search\/repositories)(?:\?[^#]*)?$/.test(path) || path.includes('..') || path.includes('\\')) throw new AppError('INVALID_INPUT', 'Unsupported GitHub resource.');
    // Authenticated caches are request-local: never share token-scoped response data.
    const store = this.token || this.fetcher !== fetch ? this.privateCache : cache;
    const cached = store.get(path);
    if (cached && cached.expires > Date.now() && !refresh) return cached.body;
    if (this.remaining-- <= 0) throw new AppError('BUDGET_EXHAUSTED', 'This search reached its GitHub request limit. Narrow your request.', 429);
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Unforked/0.1' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (cached?.etag) headers['If-None-Match'] = cached.etag;
    let response: Response;
    try { response = await this.fetcher(`https://api.github.com${path}`, { headers, redirect: 'error', signal: this.signal ? AbortSignal.any([this.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) }); }
    catch (e) { if (this.signal?.aborted) throw e; throw new AppError('PROVIDER_UNAVAILABLE', 'GitHub could not be reached. Try again shortly.', 503); }
    if (response.status === 304 && cached) { cached.expires = Date.now() + 3600000; return cached.body; }
    if (response.status === 429 || (response.status === 403 && (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')))) {
      const retry = Number(response.headers.get('retry-after')) || Math.max(1, Number(response.headers.get('x-ratelimit-reset')) - Math.floor(Date.now() / 1000)) || 60;
      throw new AppError('RATE_LIMITED', 'GitHub is limiting requests. Please wait before retrying.', 429, retry);
    }
    if (response.status === 404) throw new AppError('NOT_FOUND', 'This public GitHub resource could not be found.', 404);
    if (!response.ok) throw new AppError('PROVIDER_UNAVAILABLE', `GitHub returned ${response.status}. Try again later.`, 503);
    const reader = response.body?.getReader(); const chunks: Uint8Array[] = []; let length = 0;
    if (reader) while (true) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; if (length > 768000) { await reader.cancel(); throw new AppError('INVALID_INPUT', 'GitHub returned more data than this action can inspect.'); } chunks.push(part.value); }
    const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let body: unknown; try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new AppError('PROVIDER_UNAVAILABLE', 'GitHub returned an unreadable response.', 503); }
    if (store.size >= 200) store.delete(store.keys().next().value!);
    store.set(path, { body, etag: response.headers.get('etag'), expires: Date.now() + 3600000 });
    return body;
  }
  private privateCache = new Map<string, { body: unknown; etag: string | null; expires: number }>();
}
