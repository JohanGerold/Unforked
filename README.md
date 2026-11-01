# Unforked

A GitHub-only Chrome extension for finding your next open-source contribution. Describe your skills and goals, explore a grounded shortlist, understand a repository, and build a learning path. Circle repository links on GitHub to get context without leaving the page.

**Status:** Owner-only hosted beta with an explicit demonstration mode, public-only GitHub OAuth, and durable usage limits. The backend supports Gemini or an authenticated Ollama/Qwen gateway on the owner's laptop, with no automatic fallback. Chrome Web Store publication, broader recommendation quality and shared capacity remain separate release gates.

## Try it locally

Requirements: Node.js 24+, npm, and current desktop Chrome. Use PowerShell in this directory.

```powershell
npm ci
Copy-Item apps/api/.dev.vars.example apps/api/.dev.vars
npm run dev:api
```

Keep that terminal running. In a second terminal:

```powershell
npm run build:extension
```

Open Chrome's Extensions page, enable **Developer mode**, choose **Load unpacked**, and select:

```text
C:\Codex\Unforked\apps\extension\.output\chrome-mv3
```

Pin Unforked, open GitHub, and click its toolbar button. The sidebar opens. The local backend starts in **demo mode**: Requests, Rich, and Flask are illustrative snapshots; no live issue availability or AI calls are implied. Profiles and saved results persist on the device.

For a browser-only preview, keep the API running and run `npm run preview` in a second terminal, then open http://127.0.0.1:5173. Circle selection and extension sign-in require the installed extension.

For extension development with automatic rebuilds, use `npm run dev:extension` and load the development output directory printed by WXT. `npm run dev` starts the local API and extension development server together.

## Enable live GitHub + AI locally

Edit the git-ignored file `apps/api/.dev.vars`:

```dotenv
ENVIRONMENT=development
MODE=live
AI_PROVIDER=gemini
GOOGLE_GENERATIVE_AI_API_KEY=your-own-key
AI_MODEL=a-current-google-text-model
# Optional: improve GitHub public-read rate limits.
GITHUB_TOKEN=your-public-read-token
```

Choose an available model in your provider account; do not copy an outdated model identifier. Restart the API after changing environment variables. The health banner switches to live mode. Missing keys produce an actionable error rather than substituting fake AI answers. A free provider quota may be sufficient for testing, subject to that provider's current limits and data-use terms.

Keys never go in the extension, public `.env` variables, or Git. Do not enter private code or secrets in contribution requests.

For the shared laptop provider, see [local AI setup and daily use](docs/local-ai.md). Once configured, `npm run local-ai:share` starts the gateway and protected temporary tunnel and syncs its connection to the hosted backend. The selected provider is visible in Unforked Settings.

## Features

- Contributor profile: languages, concrete concepts, interests, Git experience, time, preferences.
- Bounded repository search; explained fit, skill gaps, and verified issue identities.
- Documentation-based summaries and follow-up questions, with sources and limitations.
- Project knowledge roadmaps grouped by language, concepts and libraries, based on dependency manifests and sampled source files; profile-listed concepts are marked without assuming unlisted knowledge is missing.
- Nearby alternatives and task-oriented learning steps when strong matches are absent.
- Circle mode, context-menu explanation, repository URL input, and the `Alt+Shift+U` shortcut.
- Local saved shortlist with demo provenance and source references.
- Cancel/retry, rate-limit errors, stale-response prevention, and keyboard-accessible controls.
- Visible recommendation dates and limitations, plus fresh issue checks before opening suggested work.
- Hosted-backend authentication, encrypted GitHub tokens, PKCE, one-time exchanges, and atomic usage reservations.

Repository summaries inspect documentation, root file names and bounded activity samples. They do not inspect all implementation code or guarantee contribution acceptance. Issue availability must be rechecked on GitHub.

## Commands

| Command | Purpose |
|---|---|
| `npm test` | Offline unit and integration tests; paid providers are replaced at the external boundary |
| `npm run typecheck` | Generate extension types and check the workspace |
| `npm run lint` | Lint all project code |
| `npm run test:e2e` | Preview journeys and an installed-extension circle test |
| `npm run build` | Extension build and backend dry-run bundle; does not deploy |
| `npm run package` | Build the Chrome extension ZIP |

Browser tests use Playwright's headless Chromium for the preview and installed Chrome's extension-debugging protocol in a temporary profile for the actual extension. Install test browsers with `npx playwright install chromium`. Set `EXTENSION_TEST_CHANNEL=chromium` if you prefer a working Chrome-for-Testing installation. Build the extension before its E2E test. Test profiles remain under ignored `.superpowers/` and do not touch your normal Chrome profile.

Optional, bounded live GitHub smoke test (no model calls):

```powershell
$env:UNFORKED_LIVE_SMOKE='1'
npm test -- tests/integration/github-live.test.ts
Remove-Item Env:UNFORKED_LIVE_SMOKE
```

## Shared live workspace

See [hosted setup](docs/hosted-setup.md) before deploying. Production live routes fail closed without a valid GitHub session, D1 storage, model credentials, and explicit pricing/usage settings. The default production configuration is demo mode. Publishing or enabling paid usage is a separate step.

## Project map

`apps/extension` contains the sidebar and GitHub overlay. `apps/api` contains the Hono/Workers backend. `packages/contracts` contains versioned schemas and canonical repository identities. `tests` contains offline, browser, and optional live checks. The implementation plan and evaluation checklist are under `docs`.

Implementation decisions, independent-review fixes, verification evidence and remaining limits are recorded in [build notes](docs/build-notes.md).
