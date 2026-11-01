import type { Env } from './env';

export function betaInformation(env: Env): string {
  const contact = env.SUPPORT_EMAIL || 'Contact the person who invited you before using this beta.';
  const generation = env.AI_PROVIDER === 'ollama' ? 'Local AI is selected. Requested text and public repository evidence are sent through an authenticated Cloudflare connection to the beta owner’s laptop and processed by Ollama/Qwen in memory. The gateway does not persist prompts or answers. GitHub tokens are not sent to the laptop. There is no automatic Google fallback. The laptop must be awake and online; bounded queueing and request allowances apply.' : 'Google AI is selected. Requested text and public repository evidence are sent to Google. Under Google’s free-tier terms, submitted content may be used to improve its products. See https://ai.google.dev/gemini-api/terms and https://ai.google.dev/gemini-api/docs/pricing .';
  return `Unforked — private beta

Find public GitHub projects, understand repositories, and plan contributions.
Access to live actions is restricted to invited GitHub accounts.

Privacy policy — updated November 2, 2026

Your profile and saved repositories stay in Chrome local storage on your device. Clear them in Settings or uninstall the extension. Circle gestures are processed locally. In image mode, Chrome captures the visible GitHub tab locally, masks/crops the selected shape and shows a preview. Only when you choose Explain image are the cropped JPEG, optional question and GitHub page URL sent through this backend to the owner's local model. The full viewport is never uploaded. Image explanations are local-only and currently support public repository pages; settings and draft editors are excluded. Crops use temporary Chrome session storage for handoff and panel memory until discarded or the page context changes; they are not saved with your repositories, in D1 or in application logs. Unforked does not inspect other websites or capture continuously.

When you request an analysis, your request/question, relevant profile fields and the selected public repository are sent to this backend. Public repository documentation and bounded activity samples are retrieved from GitHub. Knowledge roadmaps additionally inspect selected public dependency manifests and source-code snippets to identify languages, concepts and libraries. Repository files are treated as data and never executed. ${generation} Avoid personal or confidential information. Demo responses do not call an AI provider.

GitHub handles sign-in. Cloudflare hosts the API and D1 database. We store your numeric GitHub ID, invitation status and username, hashed session tokens, encrypted GitHub access tokens, OAuth state, request IDs, UTC usage dates and allowance reservations. Profiles, raw prompts and repository text are not saved in D1 or application logs. Provider services process network metadata under their own terms. No advertising or tracking analytics are installed.

Sessions expire within eight hours and OAuth states within ten minutes. Expired authentication records are removed hourly. Usage reservations are retained for up to 90 days, then removed hourly; current-month accounting is preserved. Invitations remain until the owner removes them. Sign out removes the current session; revoke the OAuth grant in GitHub to remove authorization. Contact support to revoke your invitation and remove server authentication data. Usage records needed to enforce the current allowance expire under this retention schedule.

Support and privacy requests: ${contact}
Beta availability and AI answers are experimental. Repository evidence and issue availability can change.
`;
}
