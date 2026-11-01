# Unforked private beta privacy disclosure

Last updated: November 1, 2026. Support and privacy contact: johangerold385@gmail.com. The beta policy is published at https://unforked-beta.unforked-api.workers.dev/privacy. Live beta access is restricted to invited GitHub identities.

## Local data

Your language skills, known concepts, interests, Git experience, available time, preferences, and saved repository snapshots are stored in Chrome local storage on your device. They are not synced through Chrome. Settings provides a clear-local-data action. Uninstalling the extension also removes its local storage.

The extension reads GitHub page URLs and repository links to identify the project you select. Circle gestures are processed locally. It does not request browser history, continuously upload screenshots, or inspect other websites.

## Requested analysis

When you explicitly request an action, the selected repository identity, typed request/question, and relevant profile fields are sent to the configured Unforked backend. The backend retrieves public GitHub documentation and bounded activity samples. In live mode, this material is sent to Google for the requested answer. The beta uses a free-tier project: submitted content may be used to improve Google's products under its API terms. Avoid personal or confidential information. Read [Google's terms](https://ai.google.dev/gemini-api/terms) and [data-use/pricing details](https://ai.google.dev/gemini-api/docs/pricing). The extension does not upload private repositories intentionally, but you control the text entered into requests.

Demo mode uses fixed, clearly labeled example snapshots. It does not query GitHub or call a model for those actions.

## Hosted authentication and usage

Hosted sign-in shares your public GitHub identity with the backend. GitHub access tokens are encrypted on the server; the extension receives a separate short-lived session token kept in session storage, not a GitHub token. Sessions expire within eight hours. Sign out revokes the Unforked session. You can revoke the OAuth app grant in GitHub account settings.

The hosted backend stores account IDs, invitation status/usernames, hashed session tokens, encrypted GitHub tokens, OAuth state, request IDs, UTC dates and usage reservations. It does not persist raw prompts or contributor profiles in its database. OAuth state expires after ten minutes. Expired authentication rows are removed hourly. Usage records are pruned at the 90-day UTC date boundary by hourly cleanup; current-month allowance accounting is preserved. Invitation records remain until the owner removes them.

## Services and controls

GitHub supplies public repository information and authentication. Google supplies live AI generation. Cloudflare hosts the API and D1 database. These services process relevant network and account data under their own terms. The build contains no advertising, tracking analytics, or data-selling functionality. Worker invocation logs are disabled, query strings are redacted, and traces are not persisted. Application code does not log raw prompts, profiles, tokens, OAuth codes or repository text. Infrastructure providers still process normal network metadata and aggregate operational metrics.

Delete local data in Settings, sign out to revoke the current backend session, and revoke the GitHub grant to remove app authorization. Contact johangerold385@gmail.com to revoke your beta invitation and remove server authentication data. Usage records needed to enforce the current allowance expire under the retention schedule above.
