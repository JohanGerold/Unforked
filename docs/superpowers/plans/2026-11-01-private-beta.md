# Unforked Private Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy an invite-only beta of Unforked for the owner and up to five initial testers, with real GitHub search, live AI, repeatable extension installation, controlled usage, and a documented shutdown/rollback path.

**Architecture:** Keep the existing Chrome extension, Hono/Cloudflare Workers API, and D1 storage. Add a stable unpacked-extension identity, server-enforced membership, retention cleanup, deployment configuration, and real-provider verification. Start on free service tiers where eligible; do not activate paid plans automatically.

**Tech Stack:** Existing WXT/React/TypeScript extension; Hono/Workers; D1; GitHub public-information OAuth; Vercel AI SDK with Google provider. GitHub Student Developer Pack benefits are optional supplements, not dependencies.

**Spec:** The Beta contract and Global constraints below extend `docs/build-plan.md`. Current implementation and limits are in `docs/build-notes.md` and `docs/hosted-setup.md`.

**Date:** November 1, 2026. This document is a plan; no cloud resources, keys, billing plans, or accounts were created by writing it.

## Confirmed Owner Context

- Owner has GitHub and Google AI Studio accounts.
- Owner does not yet have Cloudflare.
- Owner has the GitHub Student Developer Pack.
- Cost should be free or low; start with a small private beta.
- Existing local MVP passed 48 offline checks, 9 browser checks, and a separate public GitHub retrieval test. Real AI, real OAuth accounts, production CPU and human matching quality remain unverified.

## Global Constraints

- Public GitHub repositories only; no voice assistant or autonomous GitHub writes.
- Only explicitly invited GitHub identities may use hosted live actions. Keeping a ZIP or URL unlisted is not access control.
- Use `ENVIRONMENT=production` for every hosted deployment. Never expose the local authentication bypass.
- All tester installations must use the same pinned Chrome extension ID.
- Keep the current demo working while preparing beta configuration.
- Owner enters secret values directly in the local ignored backend file or Cloudflare Secret fields. Never request pasted keys, passwords, cookies, recovery codes or client secrets in chat.
- No paid model requests or paid service upgrades until the owner authorizes the applicable testing allowance. A free-tier quota check comes first.
- AI/provider prices, free quotas and student offers must be checked again when redeemed or enabled. Credits on one provider do not imply coverage on another.
- Credentials, raw requests, profiles and repository text must not be written to application logs.
- Beta launch requires a real OAuth round trip and real model evaluation, not only fixture-backed tests.

## Beta Contract

The first beta targets the owner plus up to five invited testers for roughly one week. The server restricts access by stable numeric GitHub user ID, resolved from owner-provided public usernames. A tester can sign in, search from a skills profile, obtain sourced summaries, select repository links through circle mode, save projects, ask questions, and request a learning path. Model limits, unverified issue availability and checked dates remain visible.

Proposed initial generation allowance is five actions per tester per UTC day and a workspace monthly allowance equivalent to $5 at configured model rates. Keep the current conservative reservation floor until a real-model sample establishes a safe smaller floor; a $0.05 reservation permits at most 100 such actions under a $5 allowance. Free-tier calls still count toward the app's allowance even if no provider invoice is incurred. Actual provider billing is separate and must be checked against current terms.

The beta ZIP is distributed privately and loaded through Chrome Developer mode. The invite list is the actual access boundary. A Chrome Web Store account, public store listing, paid domain, marketing website, payment system and general-purpose admin console are not requirements for this beta.

## Student Developer Pack Decisions

| Benefit | Proposed use | Decision |
|---|---|---|
| Azure for Students | Hosting fallback if the current Worker cannot meet CPU/runtime requirements economically | Optional. Microsoft currently offers eligible higher-education students $100 credit for one year without a credit card. Its use is governed by the educational offer terms. Moving this backend would require a runtime/database adapter, so do not migrate before measuring Workers. |
| Namecheap domain benefit | Optional recognizable project or privacy URL | The Pack currently lists one year of .me registration. Verify availability and renewal terms. A workers.dev address is sufficient initially. |
| Codespaces Pro-level student access | Optional development/recovery environment | Useful later; not production hosting. The existing local environment already works. |
| Other databases or cloud credits | Only if they solve a measured requirement | Do not add a second database or service just because a credit exists. |

Redeem offers from the owner's signed-in Pack dashboard; account eligibility, prior redemptions and current terms determine actual availability. Do not rely on old lists promising historical DigitalOcean or other offers. The Gemini key remains a separate setup step.

Sources checked November 1, 2026: [GitHub Student Developer Pack](https://education.github.com/pack), [Azure for Students](https://learn.microsoft.com/azure/education-hub/about-azure-for-students), [Azure education FAQ and usage terms](https://learn.microsoft.com/en-us/azure/education-hub/faq).

## Owner Setup Walkthrough

### 1. Create Cloudflare Free

Open [Cloudflare signup](https://dash.cloudflare.com/sign-up), create a personal account, and verify the email. Choose the free starting option; do not buy a domain or add a website to DNS just to host this API. Cloudflare supplies a workers.dev hostname for a Worker. Let the agent know when the account is ready.

The agent will initiate the already-installed Wrangler login. The owner signs in and approves access in the browser. No Cloudflare global API key is needed. If doing this manually, the login-only command is:

```powershell
Set-Location C:\Codex\Unforked\apps\api
npx wrangler login
```

This authenticates the CLI; it does not by itself deploy Unforked. Reference: [Workers CLI setup](https://developers.cloudflare.com/workers/get-started/guide/).

### 2. Prepare a dedicated Gemini project/key

In [Google AI Studio](https://aistudio.google.com/), open the dashboard's Projects/API Keys area. Prefer a dedicated project named `Unforked Beta` so its usage is separate from other experiments. Import or create a project if needed and create a new API key. Use AI Studio's current default key type rather than an older unrestricted key.

Keep the key in a password manager or enter it directly into the ignored backend config for the initial local test. Do not send it in chat. Keep `MODE=demo` until the live test is deliberately started. The backend secret name is `GOOGLE_GENERATIVE_AI_API_KEY`; the variable name may differ from Google's generic examples because our adapter reads this specific name.

Check the project's available models and free quotas. The agent will select and test an available low-cost text model with structured output, then record its exact model ID and current reference prices. Do not enable billing solely to complete account creation. If free access is unavailable, the owner decides whether to use a paid allowance or another provider before any paid tests.

Free-tier availability is account/project/model dependent, and free-tier data-use conditions must be disclosed to testers. References: [API keys](https://ai.google.dev/gemini-api/docs/api-key), [billing](https://ai.google.dev/gemini-api/docs/billing/), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [pricing](https://ai.google.dev/gemini-api/docs/pricing).

### 3. Let the agent establish the deployment URL and extension ID

After Cloudflare login, the agent prepares a separate beta configuration, creates the D1 database, applies migrations, and obtains the actual Worker URL from a demo-only bootstrap deployment. Hosting actions happen during the deployment execution phase, not while writing this plan.

The agent also generates a non-secret public manifest key and verifies that the resulting extension ID is identical when the unpacked build is loaded from two different directories. The public key belongs in the manifest; it is not the AI key, an OAuth secret, or a secret to enter manually. No Chrome Web Store upload is necessary for this proposed private-beta identity method. Verify this in Chrome before configuring OAuth.

The API will need the fixed extension ID in `EXTENSION_ID`, and the extension build will need the actual API origin in `UNFORKED_API_ORIGIN`. Reference: [Chrome extension manifest key](https://developer.chrome.com/docs/extensions/reference/manifest/key).

### 4. Create the GitHub OAuth application after the URL is known

Open [GitHub Developer settings](https://github.com/settings/developers), choose OAuth Apps, and create a new OAuth application. Use the exact values the agent supplies after bootstrap:

- Application name: `Unforked Private Beta`.
- Homepage URL: the deployed Unforked beta homepage.
- Authorization callback URL: `<actual API origin>/auth/callback`.
- Keep the web authorization-code flow; device flow is not needed.
- Expiring user access tokens can remain enabled; the current implementation signs the user in again after expiry rather than persisting refresh tokens.

Copy the Client ID, which is non-secret and can be shared for configuration. Generate a Client Secret and enter it directly in Cloudflare as `GITHUB_CLIENT_SECRET`. Do not paste it into chat or the extension.

Do not register the extension's chromiumapp.org redirect as the GitHub callback: GitHub calls the server's `/auth/callback`; the server then completes the extension flow. No personal access token is required for beta users; public-read GitHub access comes from their sign-in.

Reference: [Creating a GitHub OAuth app](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).

### 5. Enter secrets in Cloudflare

Once the demo Worker exists, open it in Cloudflare: Settings → Variables and Secrets → Add → Secret. Add:

| Name | Value source |
|---|---|
| GOOGLE_GENERATIVE_AI_API_KEY | Owner's dedicated AI Studio API key |
| GITHUB_CLIENT_SECRET | Owner's new GitHub OAuth app |
| TOKEN_ENCRYPTION_KEY | A cryptographically random 32-byte key, stored as 64 hex characters; the agent can generate and securely install it |

Non-secret values such as Client ID, API origin, model ID, current prices, extension ID and allowances go in the beta configuration. The agent can prepare them once known.

Cloudflare also supports interactive `wrangler secret put`; enter values at its prompt, never as command-line arguments. Secret updates can create/deploy Worker versions, so use only the intended beta configuration and keep demo mode until the live release gate. Reference: [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

### 6. Provide non-secret beta details

The owner supplies their GitHub username, up to five tester usernames, and a support contact suitable for those testers. The agent resolves numeric IDs and adds the approved members server-side. No school ID, student-verification documents, passwords, or private email inbox access are needed.

For an owner-only pilot, start with only the owner's GitHub ID. Add friends after the owner test passes.

## Credential Inventory

| Item | Secret? | Who provides it | Storage |
|---|---|---|---|
| Google API key | Yes | Owner through AI Studio | Local ignored backend config for testing; Worker Secret for hosting |
| GitHub OAuth Client ID | No | Owner after registration | Beta server configuration |
| GitHub OAuth Client Secret | Yes | Owner | Worker Secret |
| Token encryption key | Yes | Agent generates during setup | Worker Secret; protected owner recovery copy |
| Cloudflare CLI authorization | Yes, managed session | Owner completes browser login | Wrangler's protected local authentication storage |
| Worker origin, account ID, D1 database ID | No | Cloudflare after setup | Beta deployment configuration |
| Extension public key and ID | No | Agent generates/verifies | WXT manifest/build configuration |
| Invited GitHub usernames and resolved IDs | Public identifiers | Owner | D1 membership table |

## Implementation Tasks

### Task 1: Stable beta extension identity

**Files:** `apps/extension/wxt.config.ts`; create `scripts/prepare-beta-identity.mjs`, `apps/extension/beta-identity.json`, and `tests/e2e/beta-identity.spec.ts`.

**Interfaces:** `loadBetaIdentity(): { publicKey: string; extensionId: string }`. The manifest key is a base64 DER public key; all beta builds use the same committed public identity. No signing private key is exposed in the extension or required by testers.

- [ ] Add a failing Chrome test that loads identical builds from two different directories and asserts their extension IDs are equal and match the configured expected ID.
- [ ] Implement public-key generation/validation and wire the beta manifest key into WXT. Keep ordinary local demo builds working.
- [ ] Run the identity test and the existing installed-extension/circle test; both must pass. Record the actual ID and the warning that a future store-assigned identity may need a migration.

### Task 2: Enforce beta membership

**Files:** create `apps/api/migrations/0002_beta_members.sql` and `apps/api/src/auth/membership.ts`; modify `auth/security.ts`, `env.ts`, and `index.ts`; create `tests/integration/beta-membership.test.ts`.

**Interfaces:** `requireBetaMember(db: Database, githubUserId: string): Promise<void>`. Store stable user IDs and an active flag; usernames are display metadata.

- [ ] Add failing tests: an uninvited identity cannot get a usable session; an inactive member's existing session is rejected; an invited member can perform permitted actions; denial happens before AI generation and usage reservation. Missing membership storage fails closed in beta mode.
- [ ] Enforce membership at OAuth exchange and every authenticated live action, including issue checks. Add no frontend-only bypass or invitation secret in the ZIP.
- [ ] Run membership and existing auth/budget tests. Removing membership must immediately prevent further live actions.

### Task 3: Retention, support, and operational controls

**Files:** create `apps/api/src/maintenance.ts` and `tests/integration/retention.test.ts`; update `index.ts`, beta configuration, `docs/privacy.md`, and the deployed homepage/privacy response.

**Interfaces:** `cleanupExpiredData(env: Env, now: Date): Promise<void>`; expose an hourly scheduled handler, plus a small public homepage and policy containing the owner's real contact.

- [ ] Add failing SQL-backed tests: expired OAuth states/sessions are deleted; active sessions remain; usage older than 90 days is deleted; current-month allowance rows are never removed by cleanup; membership access decisions remain intact.
- [ ] Implement cleanup and a plain public beta-information/privacy page. Do not log raw prompts, keys, authorization codes or profile contents.
- [ ] Add an operator runbook for revoking a member, stopping generation through demo/maintenance mode, checking only aggregate errors/usage, and restoring a previously working version.

### Task 4: Verify real AI locally before hosting live mode

**Files:** create `tests/live/provider-smoke.ts` and `docs/beta-evaluation.md`; modify `ai/provider.ts`, prompts, or limits only when test evidence requires changes.

**Interfaces:** An explicit opt-in live test command using the owner's ignored environment file; it does not run under ordinary `npm test`.

- [ ] Verify that the new API key works with the installed adapter and current Google authentication rules. Identify a supported available model; confirm schema output, input/output usage, reasoning behavior and applicable quota.
- [ ] Run a bounded owner-approved sample of summary, search, question and learning-path requests. Record token usage, rate-limit behavior, costs/quotas, latency, grounding failures and truncation.
- [ ] Evaluate the 20 prompts in `docs/evaluation.md` manually. Target useful top-three results on 16/20, zero invented repo/issue identities, and no hard-constraint violations. Missing evidence must produce an honest limitation.
- [ ] Confirm the 30,000 conservative input allowance and 3,000 generated-token cap actually work with this model and the size of ranking output. Do not enlarge them silently or infer quality from demo examples.

### Task 5: Configure and bootstrap Cloudflare

**Files:** create `apps/api/wrangler.beta.jsonc` and deployment preflight/validation scripts. Keep `wrangler.jsonc` local/demo defaults intact.

**Interfaces:** Separate beta name, complete production vars, exact extension ID and API origin, D1 `DB` binding, scheduled cleanup, and secret-name requirements. The beta build must not contain localhost backend permissions.

- [ ] Owner creates the free Cloudflare account and completes Wrangler browser login.
- [ ] Create a dedicated beta D1 database and apply both schema migrations before live requests can run. Bind it to `DB`.
- [ ] Bootstrap the Worker in demo mode to obtain its actual HTTPS workers.dev origin. Supply that origin for GitHub OAuth registration and final extension configuration.
- [ ] Configure the owner-only membership, secrets, model/rates and conservative allowances. Do not assume CI or a global Cloudflare API key is necessary.
- [ ] Validate a dry-run bundle and production manifest: correct hosts/ID, no secrets, correct callback URLs, no dev authentication bypass and no missing bindings.

### Task 6: Owner-only hosted acceptance

**Files:** extend `tests/e2e` with an explicit hosted smoke suite; update `docs/beta-evaluation.md` with actual results.

- [ ] After the owner authorizes hosted live testing, deploy production mode for the owner alone and rebuild the extension against the real origin.
- [ ] Complete real GitHub login in the installed beta extension, then test live search, summary, circle, questions, save/reopen, learning path, logout, revoked access and session expiry.
- [ ] Test an uninvited GitHub account, missing/expired sessions, duplicated request IDs, exhausted quotas, cancellation, unavailable providers and a closed/assigned issue. No denied action may call the model.
- [ ] Measure actual Worker CPU, response sizes and subrequest behavior. Cloudflare Free currently lists 10 ms CPU per invocation; 100,000 requests/day is not proof of adequate compute. If it does not fit, first profile/reduce work, then compare a paid Worker tier with an Azure student-credit adaptation. Obtain the owner's budget/platform choice before changing hosting.
- [ ] Verify retention cleanup and the documented rollback/shutdown procedure against deployed resources.

### Task 7: Package and distribute to the first testers

**Files:** create `docs/beta-tester-guide.md`, a versioned release ZIP, and a non-secret feedback template.

- [ ] Run the complete offline suite, typecheck, lint, browser tests, stable-ID check, build and ZIP inspection. Preserve the last working release.
- [ ] Share the beta ZIP and installation guide only with invited testers. Each enables Developer mode, loads the unpacked folder, confirms the stable ID, signs in with their invited account, and receives a clear live-mode indicator.
- [ ] Add up to five GitHub IDs after owner acceptance. Give each tester five initial tasks and ask for relevance feedback, failure descriptions and request IDs; do not request keys or sensitive screenshots.
- [ ] Observe the first week using aggregate errors, quota consumption and owner-solicited feedback. Disable generation or revoke an individual member when needed. No automatic expansion beyond this group.

## Review Focus

1. Extension IDs and redirects must survive installation from different folders/computers; otherwise GitHub sign-in breaks.
2. Nonmembers and removed members must be rejected server-side before provider work or reservation changes.
3. Cleanup must not reset current-month allowance accounting or delete active sessions.
4. Real structured outputs must fit the configured model budget and cite only fetched repository/issue evidence.
5. Free-tier throttling, CPU limits, missing secrets and provider failures must leave the beta recoverable and prevent silent paid upgrades.

## Ownership and Order

| Stage | Owner action | Agent action | Gate |
|---|---|---|---|
| Accounts | Create Cloudflare; prepare dedicated Gemini key | Prepare stable identity, membership, retention and tests | No payment or deployment merely from planning |
| Local live test | Enter key privately; authorize limited testing | Verify model compatibility, grounded output and quotas | Usable real output within budget |
| Bootstrap | Approve CLI login/deployment when ready | D1, demo Worker, exact URLs | Known HTTPS origin and extension ID |
| OAuth | Register app; enter its secret privately | Configure callback, secret names and beta allowlist | Owner can sign in; outsiders cannot |
| Hosted pilot | Exercise the app with own GitHub account | Run full hosted acceptance and CPU/cost checks | All go/no-go items pass |
| Small beta | Supply up to five tester usernames and support contact | Package, invite, monitor and document | Controlled one-week rollout |

The earlier 2–4 focused development day estimate remains a working estimate after credentials are ready. Provider eligibility, account approval, a required hosting adaptation or weak model quality can extend it. Store review is not in the critical path for this unpacked private beta.

## Ready-to-Invite Checklist

- [ ] Stable ID verified from two install paths; real API origin compiled into the beta ZIP.
- [ ] Production settings, D1 and secret storage verified; no shared developer token in the extension.
- [ ] Owner OAuth login and membership denial/revocation pass against real services.
- [ ] Live evaluation recorded; uncertainty, sources and fresh issue checks work.
- [ ] Current model rates, free quotas, per-user allowance and workspace ceiling verified.
- [ ] Hosted CPU and failure behavior pass; rollback/shutdown procedure tested.
- [ ] Data-use disclosure, 90-day usage retention, cleanup, real support contact and tester guide are ready.
- [ ] Only the agreed initial tester IDs are active.

Cloudflare references: [D1 setup](https://developers.cloudflare.com/d1/get-started/), [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Workers pricing and CPU limits](https://developers.cloudflare.com/workers/platform/pricing/).
