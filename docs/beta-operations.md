# Private beta operations

Account: JohanGerold (GitHub numeric ID `181932151`). Cloudflare account `9ec319b41a97b87c3d1e32d3bab0a36c`.

API: https://unforked-beta.unforked-api.workers.dev

Privacy: https://unforked-beta.unforked-api.workers.dev/privacy

Extension ID: `afgkgdnejdfeacijhmcgajbgmgamhced`. The committed manifest public key fixes this ID for unpacked installations. Keep it unchanged when updating beta builds. A future Chrome Web Store identity may require migration.

Dedicated D1 database: `unforked-beta`, `81fa3b79-cb10-463d-8b28-75226664412c`, APAC. Both migrations were applied remotely. Only the owner is invited. No paid service upgrades were enabled.

## Current launch gate

The Worker is deployed as an **owner-only live pilot**, version `19c6d8ae-6363-48d0-9781-a7aeb067ee44`. The owner supplied GitHub OAuth credentials privately; all three secrets are installed. The real GitHub → callback → extension → session flow succeeded, confirmed by the owner and numeric session identity `181932151`. Live search evaluation and hosted generation CPU measurements are still required. Three local real-Gemini actions and the corrected ranking-schema probe passed. No testers are invited yet.

## Deployment

Run commands from `C:\Codex\Unforked`. Keep local `wrangler.jsonc` separate from the complete `apps/api/wrangler.beta.jsonc` config. Never deploy development authentication settings.

```powershell
node scripts/beta-preflight.mjs
npm test
npm run lint
npm run typecheck
npx wrangler deploy --config apps/api/wrangler.beta.jsonc --dry-run --outdir apps/api/dist/beta
```

After the release gate passes, deploy using the same explicit configuration. `MODE=live` requires real OAuth configuration and previously installed Cloudflare secrets. Local `.dev.vars` is ignored and is **not** deployed as secrets automatically.

```powershell
npx wrangler deploy --config apps/api/wrangler.beta.jsonc
$env:UNFORKED_API_ORIGIN='https://unforked-beta.unforked-api.workers.dev'
npm run build:extension
node scripts/beta-preflight.mjs --manifest
npm run test:e2e
npm run package
```

Do not run the opt-in live suite without checking the owner's current free-tier/budget authorization. Models and quotas can change. No automatic retries are configured. Production generation reserves at least $0.05-equivalent of the internal allowance per action, with ten actions per UTC day for the owner-only pilot and $5-equivalent per UTC month across the app. These controls do not create a paid Google budget or guarantee an invoice amount. They apply even when the provider is free. Current model reference rates were checked November 1, 2026: Gemini 3.5 Flash-Lite $0.30 input / $2.50 output per million tokens on its paid tier. [Google pricing](https://ai.google.dev/gemini-api/docs/pricing).

The beta additionally caps GitHub calls at 40 per action, leaving room for authentication, AI and accounting under Workers Free's 50-subrequest limit. The general local client defaults to an 80-call ceiling; every beta action receives the configured lower allowance. Results disclose retrieval/analysis limits. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

## Invitations and revocation

Resolve the public username through `GET https://api.github.com/users/USERNAME` and verify its numeric ID. Add only people the owner explicitly names. Never store an invitation secret in the ZIP. An example for an already approved numeric ID:

```powershell
npx wrangler d1 execute DB --remote --config apps/api/wrangler.beta.jsonc --command "INSERT INTO beta_members (user_id,login,active) VALUES ('APPROVED_NUMERIC_ID','APPROVED_LOGIN',1) ON CONFLICT(user_id) DO UPDATE SET login=excluded.login,active=1;"
```

To revoke, set `active=0` for that numeric ID. Every subsequent hosted live action checks membership before external API calls or allowance reservations, including issue checks. Existing sessions stop working immediately. Delete the member's sessions as well for a privacy removal request; keep current allowance records until their disclosed expiry to prevent allowance resets. The owner can then remove the membership row.

## Shutdown and rollback

For a generation shutdown, set `MODE=demo` in the beta configuration and deploy it; responses become labeled demonstrations and no new model calls are made. Revoke members for individual access problems. Already-started provider calls may finish and retain their reservations.

Record the working deployment version before changing a live release. Initial demo version: `ca2a4c6c-30e1-4598-8484-428db67b735b`. Demo version with OAuth configuration: `f4df3e87-2e4d-4e10-a1d4-6f0a78e62810`. Verify current Wrangler help before rolling back to a known version; D1 data, secrets and other bound resources do not roll back with code. An old version must understand the current schema and retain the invite-only access check. Never roll back to code that lacks those controls.

## Privacy and monitoring

Support: johangerold385@gmail.com. Public policy is served at `/privacy`. Auth rows expire and an hourly cron removes them; usage dates are pruned at the 90-day UTC boundary without removing the current month's allowance. Invitations persist until removed. Scheduled cleanup has SQL-backed automated coverage; remote execution must still be observed before launch.

Workers invocation logs are disabled, URL query strings are redacted, and traces are not persisted. Unexpected application errors emit only a fixed route category, whitelisted error class and function names; exception messages and request contents are omitted. Application code does not log prompts, profile contents, OAuth codes, tokens or repository text. Use Cloudflare aggregate request/error/CPU metrics and aggregate D1 counts; never paste raw request headers, OAuth callback queries or secret files into reports. Providers still process normal network metadata.

Before a tester invitation, record the OAuth round trip, outsider denial/revocation, actual live search quality, quota failure behavior and Worker CPU. The deployment's startup time is not a per-request CPU measurement. Benchmark against the current Workers plan rather than assuming the free request quota proves sufficient compute.

Owner testing allowance: temporarily ten daily actions while only JohanGerold is invited. Restore five before adding testers. The three failed debugging actions and two successful actions remain recorded; no reservations were erased or monthly ceiling increased.
