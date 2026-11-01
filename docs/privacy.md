# Unforked private beta privacy disclosure

Last updated: November 2, 2026. Support and privacy contact: johangerold385@gmail.com. The beta policy is published at https://unforked-beta.unforked-api.workers.dev/privacy. Live beta access is restricted to invited GitHub identities.

## Local data

Your language skills, known concepts, interests, Git experience, available time, preferences, and saved repository snapshots are stored in Chrome local storage on your device. They are not synced through Chrome. Settings provides a clear-local-data action. Uninstalling the extension also removes its local storage.

The extension reads GitHub page URLs and repository links to identify the project you select. Circle gestures are processed locally. It does not request browser history, continuously upload screenshots, or inspect other websites.

Image mode uses Chrome's user-invoked `activeTab` permission to capture the visible GitHub tab locally. It crops to the selected bounds, masks pixels outside the drawn polygon, resizes/encodes one bounded JPEG, then shows a preview. Nothing is uploaded until you choose **Explain image**. Only that crop, your optional question and the repository page URL pass through the authenticated backend to the owner's local Qwen vision model. The full viewport stays on your device. Settings and draft-editor pages are excluded, and the backend checks that the repository is public before forwarding the image to the model. Image actions never fall back to Google.

Crops use Chrome session storage for the temporary handoff to the sidebar, then are removed when consumed. Pending selections become unusable after30seconds and are cleared on tab navigation/switch/closure in their window. A displayed image and its explanation live in panel memory until discarded, the page context changes or the panel closes. They are not added to Chrome local storage, saved repositories, D1 or application logs. No image history is kept.

## Requested analysis

When you explicitly request an action, the selected repository identity, typed request/question, and relevant profile fields are sent to the configured Unforked backend. The backend retrieves public GitHub documentation and bounded activity samples. Settings identifies the selected AI provider.

Knowledge roadmaps also inspect selected public dependency manifests and source snippets to identify relevant languages, concepts and libraries. Retrieval is bounded; this is not a complete code audit. Repository content is treated as data and never executed.

With local AI selected, this material travels through an authenticated Cloudflare Tunnel connection to the beta owner's laptop. Ollama and Qwen3.5 4B process prompts and answers in memory; the gateway does not persist them or log their content. GitHub access tokens remain on the hosted backend and are never sent to the laptop. The laptop must be awake and online. There is one active generation slot and a bounded waiting queue. Local AI never automatically falls back to Google.

If the owner explicitly selects Gemini instead, requested text and repository evidence are sent to Google. The configured Google project uses the free tier: submitted content may be used to improve Google's products under its API terms. Read [Google's terms](https://ai.google.dev/gemini-api/terms) and [data-use/pricing details](https://ai.google.dev/gemini-api/docs/pricing). Avoid personal or confidential information with either provider. The extension does not upload private repositories intentionally, but you control the text entered into requests.

Demo mode uses fixed, clearly labeled example snapshots. It does not query GitHub or call a model for those actions.

## Hosted authentication and usage

Hosted sign-in shares your public GitHub identity with the backend. GitHub access tokens are encrypted on the server; the extension receives a separate short-lived session token kept in session storage, not a GitHub token. Sessions expire within eight hours. Sign out revokes the Unforked session. You can revoke the OAuth app grant in GitHub account settings.

The hosted backend stores account IDs, invitation status/usernames, hashed session tokens, encrypted GitHub tokens, OAuth state, request IDs, UTC dates and usage reservations. It does not persist raw prompts or contributor profiles in its database. OAuth state expires after ten minutes. Expired authentication rows are removed hourly. Usage records are pruned at the 90-day UTC date boundary by hourly cleanup; current-month allowance accounting is preserved. Invitation records remain until the owner removes them.

## Services and controls

GitHub supplies public repository information and authentication. Cloudflare hosts the API and D1 database and transports local AI traffic. The selected model provider is either the owner's Ollama/Qwen runtime or Google. These services process relevant network and account data under their own terms. The build contains no advertising, tracking analytics, or data-selling functionality. Worker invocation logs are disabled, query strings are redacted, and traces are not persisted. Application code does not log raw prompts, profiles, tokens, OAuth codes or repository text. Infrastructure providers still process normal network metadata and aggregate operational metrics.

Delete local data in Settings, sign out to revoke the current backend session, and revoke the GitHub grant to remove app authorization. Contact johangerold385@gmail.com to revoke your beta invitation and remove server authentication data. Usage records needed to enforce the current allowance expire under the retention schedule above.
