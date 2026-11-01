# Hosted setup

The local build remains available. A separate demo beta is deployed; see [beta operations](beta-operations.md) for its actual configuration and remaining launch gates. Keep `ENVIRONMENT=production` in a hosted service. The local authentication bypass additionally requires a loopback request URL; never deploy development settings.

## Required configuration

1. Choose the API's HTTPS origin and your stable Chrome extension ID. Set `UNFORKED_API_ORIGIN` before building the extension so its permissions target exactly that origin. Rebuild/reload after a change.
2. Create a D1 database and apply all migrations in `apps/api/migrations` in order, including provider accounting migration `0003_usage_provider.sql`. Add a `d1_databases` binding named `DB` to the deployment configuration with the real database name and ID. Use Wrangler's `d1 migrations apply` for the selected deployment configuration.
3. Register a GitHub OAuth app with callback `https://YOUR_API_ORIGIN/auth/callback`. Request public information only. Existing grants with broader scopes are rejected; revoke old broader grants before signing in again. Enable expiring tokens where available. Unforked sessions expire after at most eight hours and do not retain refresh tokens.
4. Configure server secrets: `GITHUB_CLIENT_SECRET` and `TOKEN_ENCRYPTION_KEY` (64 hexadecimal characters representing 32 cryptographically random bytes). Gemini additionally needs `GOOGLE_GENERATIVE_AI_API_KEY`. Local mode needs `LOCAL_AI_ORIGIN` and `LOCAL_AI_KEY`, synced by the owner launcher; see [local AI operations](local-ai.md). Never put these in the extension.
5. Configure `GITHUB_CLIENT_ID`, `API_ORIGIN`, `EXTENSION_ID`, `MODE=live`, and an explicit `AI_PROVIDER=gemini` or `ollama`. Missing or unknown provider selection fails closed. Gemini also requires `AI_MODEL`. There is no automatic provider fallback.
6. For Gemini, set `AI_INPUT_USD_PER_MILLION` and `AI_OUTPUT_USD_PER_MILLION` to the chosen model's current billed text rates, including reasoning where relevant. Gemini generation fails closed when rates are absent. Verify that the model's tokenizer/billing and output limits agree with the text-only conservative byte budget before enabling live traffic. Local generation uses separate action-count fairness limits, without token-price accounting.
7. Configure `DAILY_LIMIT` (default 10 actions), `MONTHLY_BUDGET_MICRODOLLARS` (default 10,000,000 = $10), and optionally `ACTION_RESERVATION_MICRODOLLARS` (default 50,000 = $0.05). Reservations use the greater of that floor or the calculated maximum token cost at your configured rates.
8. Test sign-in, expiry, logout, revoked GitHub grants, failure recovery, provider limits, and actual CPU time with real credentials before inviting others. Benchmark Workers CPU use; the free request allowance alone does not establish that the backend fits its CPU limit.

Example D1 binding to add to the production Wrangler configuration:

```json
{
  "d1_databases": [{
    "binding": "DB",
    "database_name": "your-database-name",
    "database_id": "your-real-database-id",
    "migrations_dir": "migrations"
  }]
}
```

## Allowance accounting

An atomic SQL statement reserves allowance before any hosted generation starts. Reservations are keyed by user and request ID, count toward UTC daily and monthly windows, and cannot race past the configured allowance. Retries from the UI are new explicit actions.

For this first version, the entire reservation is retained even when a request fails, is cancelled, or uses fewer tokens. This is deliberately conservative: partial provider work may already have been billed. It reduces usable allowance compared with actual-usage reconciliation. The allowance is a server-side control relative to configured prices, not an invoice guarantee if model prices change, a key is used outside Unforked, or provider accounting differs. Also configure provider-side limits and recheck rates before changing models.

The model adapter permits at most three calls and 3,000 generated tokens per action. It uses a conservative cumulative UTF-8 byte allowance, schema size and overhead margin to bound input. Exceeding analysis size produces a clear error rather than silently increasing cost. Retrieval is bounded to 80 GitHub calls and at most eight calls per inspected repository.

## Retention and operations

No raw prompts, profiles or repository text are written to D1. Sessions store hashed Unforked tokens, GitHub user IDs, encrypted GitHub tokens and expiry. OAuth state expires after ten minutes. The beta configuration adds an hourly cleanup for expired auth rows and usage dates at the 90-day boundary, while protecting current-month allowance accounting. Usage reservations contain account ID, request ID, date, reserved allowance and outcome. Beta membership uses numeric GitHub IDs and is enforced at exchange and every hosted live action.

The owner supplied the beta contact and its policy is served at `/privacy`; see `docs/privacy.md`. Verify the deployed cleanup, OAuth, live quality and CPU gates before inviting testers. Review `CHROMEWEBSTORE.md` before any later store release.
