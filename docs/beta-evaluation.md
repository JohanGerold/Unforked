# Private beta evaluation — November 1, 2026

Model: `gemini-3.5-flash-lite`, stable, listed by the owner's working key. Owner confirmed **free tier** after correcting an earlier answer. No paid plan or paid request allowance was enabled. [Model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [pricing](https://ai.google.dev/gemini-api/docs/pricing).

Using actual public `psf/requests` evidence and the production adapter:

| Action | Result | Input / output / thinking tokens | Generation action latency |
|---|---|---|---|
| Summary | Schema/citation checks passed | 2,135 / 327 / 0 | 2.94 s |
| Repo question | Schema/citation checks passed | 2,141 / 150 / 0 | 1.36 s |
| Learning path | Schema/citation checks passed | 2,201 / 268 / 0 | 1.58 s |
| Search | Intent extraction passed; initial ranking request rejected | Intent: 150 / 171 / 0 | 12.64 s including retrieval/failure |

The default ranking schema's nested arrays of up to 20 items produced Google `400 INVALID_ARGUMENT`, even with a minimal prompt. Independent probes ruled out repository regex and numeric bounds, and demonstrated that reducing nested array limits succeeds. Ranking now asks for up to three concise candidates and three items in each explanation list. Full source, repository and issue validation remains unchanged. The corrected production ranking schema passed a separate real-provider probe and an offline adapter regression. It still needs a complete real search with GitHub sign-in; repeated unauthenticated retrieval reached GitHub's public rate limit.

The recorded generation calls fit the existing per-action input/output bounds. No output-limit or reasoning change was necessary. The reference paid-rate equivalent for the three successful initial calls plus intent extraction is about $0.0043, although this run used the owner's confirmed free tier; this is neither a provider invoice nor an estimate of every attempted test.

Independent review also reproduced an ordinary six-candidate search exceeding the cumulative 30,000-byte allowance before ranking. A regression failed with the real `GenerationBudget`, then passed after ranking was changed to measure its exact serialized prompt, schema and overhead against the remaining allowance and reduce compared candidates as needed. The cap was not raised; reduced coverage is disclosed in search limitations.

The owner's first real OAuth attempt exposed a Worker runtime incompatibility: `redirect: 'error'` throws before an outbound request. Authentication and public retrieval now use `manual`, preserving redirect isolation. Regression cases failed before the fix and passed afterwards; a deployed controlled OAuth flow now reaches GitHub and returns the expected `401 AUTH_REQUIRED` for an intentionally invalid test code instead of `503`. This control is not a completed real-account sign-in. [Workers Request behavior](https://developers.cloudflare.com/workers/runtime-apis/request/).

The owner subsequently completed real GitHub sign-in, confirmed against the invited numeric ID in D1. The first live search timed out at about 45 seconds; later attempts passed the AI intent step but failed in GitHub retrieval. A separate actual local Worker reproduced the latter failure. Native Workers `fetch` was invoked as a client-instance method, causing an incorrect receiver; invoking the injected function without that receiver fixed it. A regression failed before the change and passed after it. The same actual local Worker search then returned HTTP 200 in about 4.5 seconds with no matches; this is transport/runtime evidence, not recommendation-quality acceptance. [Workers illegal invocation guidance](https://developers.cloudflare.com/workers/observability/errors/#illegal-invocation-errors).

Provider failures now emit only call number, HTTP status, timeout/output category and elapsed time. Keys, raw errors, prompts, response bodies and generated text are excluded. Timeout and quota responses have distinct user-facing messages, with no automatic retries or enlarged limits. Hosted CPU samples for the failed searches ranged from 14 to 101 ms, despite runtime outcome `ok`; these samples do not establish reliable fit on the free plan. Hosted successful-search verification, CPU profiling and human matching evaluation remain pending. Latest offline result: 64 passing checks, one optional network check skipped.

Offline/provider compatibility is not a human relevance score. The 20-prompt set in `evaluation.md` has **not** been completed. No 16/20 claim is made. Do not invite testers until real OAuth, corrected full search, constraint adherence, outsider denial, hosted CPU and provider/quota failure behavior are recorded.

Explicit opt-in commands (network calls; check authorization and current tier first):

```powershell
$env:UNFORKED_LIVE_SMOKE='1'
npx vitest run --config vitest.live.config.ts
```

The smoke suite reads ignored `.dev.vars`, caps its AI calls, disables retries through the production adapter, and uses public example inputs. It writes public outputs and numeric usage to ignored `.superpowers` artifacts. It never runs under ordinary `npm test`. A narrow failed action can be rerun with `UNFORKED_LIVE_ACTION=search` rather than repeating already-passed generation actions.

## First successful hosted search

The owner confirmed one live recommendation: codepiyusss/open_source_issue_contribution, described as a beginner Python CLI project for first contributions. No starting issue was claimed verified. Trace evidence: search HTTP200, 7.74seconds wall/71msCPU; one learning-path HTTP200, 5.07seconds wall/34msCPU. A subsequent learning request was denied429beforegeneration because three retained failed debugging requests plus these two completed actions reached the initial five-action daily allowance. This is the application's internal limit, not evidence of exhausted Google credits.

The owner-only pilot allowance was temporarily increased to ten daily actions; the $5-equivalent monthly ceiling and all prior reservations remain unchanged. Restore five before inviting testers. The real search and server learning response now pass basic hosted transport acceptance; the 20-prompt quality set, a confirmed learning-path display, additional failure/revocation checks and reliable free-tier CPU fit remain outstanding. Do not infer public readiness from these samples.
