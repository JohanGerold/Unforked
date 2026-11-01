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
