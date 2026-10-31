# Unforked privacy disclosure — draft

Last updated: November 1, 2026. This describes the shipped local build and proposed hosted mode. The publisher must provide a real contact and publish this policy at a stable URL before distribution.

## Local data

Your language skills, known concepts, interests, Git experience, available time, preferences, and saved repository snapshots are stored in Chrome local storage on your device. They are not synced through Chrome. Settings provides a clear-local-data action. Uninstalling the extension also removes its local storage.

The extension reads GitHub page URLs and repository links to identify the project you select. Circle gestures are processed locally. It does not request browser history, continuously upload screenshots, or inspect other websites.

## Requested analysis

When you explicitly request an action, the selected repository identity, typed request/question, and relevant profile fields are sent to the configured Unforked backend. The backend retrieves public GitHub documentation and bounded activity samples. In live mode, this material is sent to the configured Google model provider for the requested answer. Read the provider's current API data-use terms, particularly when using a free quota. The extension does not upload private repositories intentionally, but you control the text entered into requests.

Demo mode uses fixed, clearly labeled example snapshots. It does not query GitHub or call a model for those actions.

## Hosted authentication and usage

Hosted sign-in shares your public GitHub identity with the backend. GitHub access tokens are encrypted on the server; the extension receives a separate short-lived session token kept in session storage, not a GitHub token. Sessions expire within eight hours. Sign out revokes the Unforked session. You can revoke the OAuth app grant in GitHub account settings.

The hosted backend stores account IDs, hashed session tokens, encrypted GitHub tokens, OAuth state, request IDs, UTC dates and usage reservations. It does not persist raw prompts or a copy of contributor profiles in its database. OAuth state expires after ten minutes; expired authentication rows are cleaned up during later sign-in activity. Usage-row retention is an outstanding deployment decision and requires scheduled cleanup before public launch.

## Services and controls

GitHub supplies public repository information and authentication. Google supplies live AI generation. Cloudflare is the intended hosted API/database provider. These services process relevant network and account data under their own terms. The local build contains no advertising, tracking analytics, or data-selling functionality. Shared-hosting infrastructure may process normal request metadata; the publisher must disclose its operational logging choices.

Delete local data in Settings, sign out to revoke the current backend session, and revoke the GitHub grant to remove app authorization. A real publisher contact, deletion process for server usage records, and public policy URL are required before distribution.
