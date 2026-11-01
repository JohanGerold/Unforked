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

Offline/provider compatibility is not a human relevance score. The 20-prompt set in `evaluation.md` has **not** been completed. No 16/20 claim is made. Do not invite testers until real OAuth, corrected full search, constraint adherence, outsider denial, hosted CPU and provider/quota failure behavior are recorded.

Explicit opt-in commands (network calls; check authorization and current tier first):

```powershell
$env:UNFORKED_LIVE_SMOKE='1'
npx vitest run --config vitest.live.config.ts
```

The smoke suite reads ignored `.dev.vars`, caps its AI calls, disables retries through the production adapter, and uses public example inputs. It writes public outputs and numeric usage to ignored `.superpowers` artifacts. It never runs under ordinary `npm test`. A narrow failed action can be rerun with `UNFORKED_LIVE_ACTION=search` rather than repeating already-passed generation actions.
