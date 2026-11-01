# Implementation decisions and verification

Local MVP built November 1, 2026. The original MVP verification below predates the private beta setup; see the appended beta record for current deployment status.

## Decisions made during implementation

1. Created a new repository at `C:\Codex\Unforked` on `feat/unforked`, separate from existing projects. There was no existing checkout to isolate with a worktree and no base branch or remote to merge into. The branch remains local; integration can be decided later.
2. Used a Windows-native progress ledger in ignored `.superpowers/progress.md` rather than POSIX helper scripts. This keeps progress recoverable, but task bookkeeping is manual.
3. Added an explicit demo workspace and browser preview alongside the live backend. This makes evaluation possible without credentials. Its fixed examples require maintenance and must never be presented as live search results.
4. Git had no configured author. Implementation commits use a per-command `Codex <codex@localhost>` automation identity, without changing global or repository user settings. Reattribute those commits before sharing if a different authorship policy is preferred.
5. Hosted actions retain their full estimated-cost reservations, including failed or cancelled provider work. This protects allowance accounting after partially billed work, but gives users less usable allowance than actual-cost reconciliation. Provider-side controls and current configured rates remain necessary.
6. Installed-extension tests use installed Chrome's extension-debugging protocol and a fresh temporary profile because the downloaded full Chromium binary failed to launch. The preview uses Playwright's headless browser. This test arrangement requires compatible local Chrome and never touches the user's regular profile.

## Independent review and fixes

One independent read-only review found four Important issues: cross-view repository identity mismatch, missing full-navigation invalidation, hidden recommendation limitations/timestamps, and stale actionable issue data. All were addressed in one fix pass with failing regression cases followed by passing checks.

Two initially minor findings were treated as functional issues because they affect ordinary usage or allowance consumption: accepting the scheme-less GitHub URL advertised by the input, and consuming page-bound pending selections only once. Both received regression coverage and fixes. No review findings were deferred as polish.

Repository activity is refreshed before recommending actionable issues. A separate read-only issue check now precedes the issue link; its uncertainty is visible. Documentation and sampled PR data can be cached for up to one hour and are disclosed as such.

## Verified

- 48 offline unit/integration checks passed; the optional network test is skipped by default.
- 9 browser checks passed, including an actual installed extension, circle selection/cancellation, full-navigation context, issue-link checking, data clearing, and a 320 px sidebar.
- A separate public GitHub evidence smoke test passed without a model call.
- Type checking and lint passed; extension and backend dry-run bundles succeeded.
- The extension ZIP was inspected for referenced assets, icon sizes, MV3 permissions, unwanted dependency directories, environment files, and source maps.
- Dependency audit reported zero vulnerabilities after patching the transitive minimatch package. The design detector returned no findings; screenshots were inspected at normal and narrow widths.

## Limits of this verification

No live AI credential or real GitHub OAuth app was supplied. Therefore real-model answer quality, prompt-injection behavior beyond validation boundaries, account sign-in end to end, provider pricing assumptions, hosted CPU performance, browser zoom behavior, and human relevance evaluation remain unverified. The local demo and the tested live-service code are available, while public launch still requires the setup and evaluation gates documented elsewhere.

## Private beta preparation

The owner later supplied credentials privately and confirmed Gemini free tier. A dedicated D1 database and demo Worker were deployed, with only JohanGerold invited. The extension public identity is pinned and verified across two install paths. Membership is checked at OAuth exchange and before every hosted live action; scheduled expiry/usage retention and a real policy/support contact were added.

Live summaries, questions and learning paths passed schema/citation checks. Google's rejection of the original nested ranking schema was isolated to its output complexity; concise three-candidate output passed a real schema probe. A complete corrected search, real hosted OAuth round trip, human evaluation, remote cleanup observation and CPU measurements remain launch gates. Public GitHub retrieval reached the unauthenticated rate limit during repeated search diagnostics. See `beta-evaluation.md` and `beta-operations.md` for evidence and limitations. No paid upgrades were enabled.

## Shared local AI owner pilot — November 2, 2026

The owner later confirmed hosted OAuth and core Gemini journeys worked. The backend now explicitly selects Ollama/Qwen3.5 4B through an authenticated loopback gateway and temporary Cloudflare Tunnel. Gateway secrets are held in ignored local configuration and Worker Secrets; the Chrome build still has only GitHub and the hosted API permissions. The latest activation/restart version is `67a7e762-60e4-4874-a72a-c691322da6a4`; the code deployment version was `877d653a-a60e-4147-950c-c57e58fef183`. Endpoint secret updates create new versions without changing provider selection.

Migration0003 preserved all ten Gemini reservations (500,000 reference-cost units). Local generation has separate fair-use accounting: owner100/day, invited friends20/day, shared1,000/month. Failed/cancelled reservations remain counted. No friends were invited. Gemini's key/configuration remain available for an explicit rollback; missing provider selection now fails closed.

Real GPU probes passed summaries, questions, learning paths and non-empty indexed ranking. Initial 4B discovery probes exposed overly long output, invented/duplicate identities and citations crossing candidate boundaries. Local ranking now uses bounded fields, candidate indices and a schema binding each index to its actual source IDs. The backend supplies identity/date, discloses duplicate removal and keeps full evidence/issue validation. Dynamic schema size counts against both the input budget and 12KB schema transport ceiling. A final three-public-README probe passed after rebuilding the strict gateway. Generic explanations and broad relevance still need human evaluation.

One fresh read-only review found two Important issues: implicit Gemini selection and child exits missed during launcher synchronization. Both received failing regressions and one fix pass. The final suite passed86offline checks (one optional live check skipped), typecheck, lint and12browser checks. HTTPS/stable-ID packaging passed preflight; tracked files and all ten ZIP entries passed the private-credential scan. The package excludes local runtime/configuration.

Hosted health reports `aiProvider: ollama`, configured and available. An unauthenticated generation request returns401. Stopping sharing produced `aiAvailable:false` while retaining Ollama; restarting synced a new endpoint and restored true. The updated privacy page describes laptop processing and no automatic Google fallback. A signed-in owner summary/search on the final build is requested and remains pending confirmation. Anonymous REST quota was exhausted during repeated diagnostic discovery; this is separate from the signed-in GitHub path. Shared-load/GPU cancellation profiling, broad matching quality, stable endpoint availability and store distribution remain future gates. See [daily start/stop/rollback instructions](local-ai.md).

## Project knowledge roadmap — November 2, 2026

The owner confirmed local integration works, then requested knowledge prerequisites instead of contribution tasks. Learning now returns languages, language concepts, relevant libraries and their concepts, supporting tools and separate evidence limits. Core versus area-specific requirements and depth are explicit. Saved profile concepts are marked by exact text match; unlisted concepts are treated as unknown. The former exercise/readiness checklist and warning-as-gap display were removed.

Learning-only retrieval now reads detected dependency manifests (up to two), contribution guides including RST, and up to two source/test snippets discovered from a bounded Git tree. It remains public-only, never executes repository content, uses at most14GitHubcalls and10sources, and leaves other retrieval paths intact. Generation validates per-group citations, observed repository languages and literal library names in their cited files. Sample excerpts shrink to the existing input budget; local output limits and allowances are unchanged. Privacy disclosures cover selected public source snippets.

New regressions failed against the old implementation, then passed. Final verification:94offline checks (one optional live check skipped), typecheck/lint,13browser checks, a320px visual/overflow check, HTTPS/stable-ID packaging and a clean credential scan over tracked files and10ZIPentries. Real Qwen accepted public pytest file samples in roughly13–16seconds, producing Python concepts and evidenced libraries including pluggy. Anonymous REST quota blocked a separate live retrieval probe; that is not represented as successful authenticated retrieval or a broad model-quality evaluation.

One fresh read-only review found an Important limitation-truncation issue. Its failing regression demonstrated that five model caveats hid missing source reads; the fix prioritizes retrieval facts within the cap. A minor README wording mismatch was also corrected. The owner-only backend update is deployed as `ce1fab7f-e0e7-42a2-8384-7415f0a8b0ca`. Reload the rebuilt unpacked extension for the new schema/layout, then generate a fresh roadmap; an already displayed old response does not transform automatically.

## Circle images — November 2, 2026

Circle now has a local-image mode: select GitHub content, preview a cropped/masked JPEG, optionally ask a question, then Explain image. Repository-link circle mode remains available separately. The full viewport stays on-device; only the crop is uploaded after the explicit button. Temporary session handoff is removed when consumed or on relevant context changes, and visible image/request state is cleared on discard/navigation. No saved image history, D1 image records or image application logs were added. activeTab is the only new permission; exact GitHub/API host permissions and the stable extension ID remain unchanged.

The API authenticates hosted requests, checks invitation/allowance and confirms the repository is public before forwarding image data to the local gateway. Known settings/draft routes, including encoded wiki editors, are rejected. One bounded JPEG (240KB,1024px) is accepted; text endpoint limits remain unchanged. Vision shares the existing one-active/two-waiting gateway queue,120sdeadline, fixed Qwen model/32Kcontext and cancellation. Output is capped at900tokens, with a conservative8192-token image-context margin. Image explanations are local-only; Gemini selection does not activate a fallback.

The installed model reports vision capability. A synthetic code image was correctly explained directly by Ollama in22seconds while loading vision, then by the actual authenticated gateway/provider path in6.5seconds warm (364input/96output). The model remained100%GPU, with about5GB observed resident use. These are bounded synthetic probes, not broad OCR/diagram accuracy or multi-user load evidence.

One fresh review found two Important issues: wiki editor URLs and A→B→A capture races. Both received failing regressions and a fix pass. In-flight capture generations now invalidate synchronously on activation/loading/navigation/removal as well as sampled page/viewport checks. Final verification passed107offline checks, typecheck/lint,17browser checks, HTTPS/stable-ID packaging and a credential scan over tracked files/10ZIPentries. Pixel tests cover viewport scaling and masking outside the polygon; UI tests cover preview-before-upload, question/dismiss and stale-answer rejection.

Fresh-profile native Chrome correctly denied screenshot capture without a toolbar/command grant and displayed the retry instruction. Synthetic CDP keyboard input does not invoke Chrome's extension accelerator; positive human toolbar capture remains owner acceptance after reload. The rebuilt gateway/tunnel is running, and deployment `5dd64d09-7278-4c76-903d-d15997f08b81` reports `visionAvailable:true`. The updated image privacy disclosure is live and unauthenticated vision requests return401. No invitation, usage record or provider key was reset.
