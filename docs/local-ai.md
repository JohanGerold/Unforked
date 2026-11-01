# Running Unforked with your laptop

The hosted backend still handles GitHub sign-in, invitations and repository retrieval. It sends only requested text and public evidence to your authenticated gateway. Qwen3.5 4B runs in Ollama on your laptop. Gemini is kept for an explicit rollback and is never an automatic fallback.

## Daily use

Open Ollama, then open PowerShell:

```powershell
cd C:\Codex\Unforked
npm run local-ai:share
```

Keep that terminal open. Once it reports sharing is ready, the new temporary tunnel address has been checked and synced to the Worker using your existing Cloudflare CLI login. Every restart creates a new address and updates the backend connection. The script leaves your selected provider unchanged. Press **Ctrl+C** in that terminal to stop sharing. Closing the laptop, sleeping, disconnecting the internet or stopping Ollama makes local AI unavailable. Use Settings → Check connection in Unforked after restarting.

Ollama listens on `127.0.0.1:11434`; the authenticated gateway listens on `127.0.0.1:11435`. The tunnel points only to the gateway. Do not expose Ollama itself, open router ports or set `OLLAMA_HOST=0.0.0.0`.

The launcher can use public DNS for its Quick Tunnel health probe if the system resolver returns NXDOMAIN. It retains TLS hostname verification and does not change Windows DNS settings.

## Capacity and limits

There is one active generation and room for two waiting requests. Overflow returns a retry instruction. A generation has a 120-second total deadline, including queue time, with no automatic retries. Qwen uses a 32K context, thinking disabled, and at most 1,200 output tokens per call. Each action keeps the existing cumulative input budget, 3,000 output tokens and three-call cap. Discovery normally uses two calls, and a recommendation remains an estimate based on bounded public evidence.

The beta owner has 100 local actions per UTC day; invited friends have 20 each. There are 1,000 shared local actions per UTC month. Failed and cancelled actions retain their slot. These are configurable fairness limits, not token charges. GitHub limits and Cloudflare platform limits still apply. Gemini's previous reservations and separate reference budget remain intact. Only explicitly invited GitHub accounts can use the live API; no friends are automatically added.

The temporary Quick Tunnel has no uptime guarantee. It is suitable for this owner pilot and supervised friend testing. A stable named tunnel/domain and a shared-load check are prerequisites for dependable public availability. See [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## Setup and maintenance

Already configured on this laptop: Ollama, `qwen3.5:4b`, a random ignored gateway credential, and an official checksum-verified portable `cloudflared` in `.local-tools/`.

On a fresh checkout, use Node 24 or later, run `npm ci`, install Ollama and pull the model, then:

```powershell
npm run local-ai:init
npm run local-ai:install-tools
npm run local-ai:share
```

Never put `apps/local-ai/.env` in the extension ZIP or share it with friends. The launcher passes `LOCAL_AI_KEY` and `LOCAL_AI_ORIGIN` directly to Wrangler through standard input. Only the owner needs Cloudflare CLI access. `npm run local-ai:sync` rechecks and syncs the currently running connection without restarting it.

Changing the provider is explicit: set `vars.AI_PROVIDER` to `gemini` or `ollama` in `apps/api/wrangler.beta.jsonc`, save, then deploy:

```powershell
npx wrangler deploy --config apps/api/wrangler.beta.jsonc
```

For Gemini, its configured Worker key/model and Google allowance must still be valid. To return to local AI, start sharing first, select `ollama`, and deploy. Never reset usage reservations when switching providers. Migration `0003_usage_provider.sql` must be applied before deploying this integration; earlier rows are tagged Gemini automatically.

## Verification scope

The automated checks cover authentication, bounded payloads, a serial queue, cancellation, busy/offline errors, provider isolation, fair-use accounting and extension UI. Bounded real-model probes use public GitHub evidence for summary, question, learning and ranking. These probes do not establish broad recommendation quality or multi-user capacity. Reload the unpacked extension after installing a new UI build and test a real signed-in action before inviting anyone.
