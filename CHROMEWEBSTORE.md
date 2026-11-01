# Chrome Web Store Listing — Unforked

Last updated: November 1, 2026. Hosted owner-only live pilot; store listing draft, not submitted.

## Store listing

**Name:** Unforked

**Short description:** Find GitHub projects that fit your skills, understand repositories, and plan your next open-source contribution.

**Detailed description:**

Unforked helps you find a realistic way into open source on GitHub.

Describe what you know and what you want to work on. Explore a short list of projects with reasons they fit, knowledge gaps, and starting issues when availability can be verified. Open a repository for a sourced explanation, or circle its title or link on GitHub. Save interesting projects and ask for a learning path toward your next contribution.

Learning paths show the languages, language concepts and relevant library knowledge for the selected project, based on public dependency manifests and sampled source files. Core and area-specific requirements are distinguished; evidence limits remain visible. This is a knowledge roadmap rather than an automated contribution checklist.

Open the sidebar from the toolbar. Add your skills, describe a goal, and explore the results. You can also enter a repository URL or use the GitHub link context menu.

The current beta requires an invited GitHub account for live recommendations. Usage allowances apply. Suggestions are estimates, not guarantees of issue availability or contribution acceptance.

Profiles and saved projects stay on your device. Explicit analysis requests send relevant text and public repository information to the configured service. No microphone or browsing-history access is requested.

**Category:** Developer Tools

**Single purpose:** Help GitHub contributors discover and understand projects suited to their skills and next contribution.

**Language:** English

## Graphics and assets

- Icon: `apps/extension/public/icons/icon-128.png`; additional 16/32/48 px icons accompany the manifest.
- Product captures: `docs/screenshots/discover.png` and `results.png`.
- Store-size screenshot: `docs/screenshots/store-preview.png` at 1280 x 800, captured from the functioning demo UI. Final live-service screenshots must be reviewed before submitting.

## Permissions justification

| Permission | Reason |
|---|---|
| sidePanel | Keep repository explanations and contribution recommendations next to GitHub |
| storage | Save contributor preferences and a shortlist locally; hold session context while browsing |
| contextMenus | Offer “Explain repository with Unforked” for GitHub page links |
| identity | Complete GitHub sign-in for a configured hosted live service |
| https://github.com/* | Resolve selected repository links and render the user-invoked circle overlay on GitHub |
| https://unforked-beta.unforked-api.workers.dev/* | Send requested repository analysis and complete GitHub sign-in with the hosted service |

The content script is restricted to GitHub. The manifest does not request history, microphone, broad all-site access, or repository write access. The beta ZIP targets the hosted HTTPS backend; ordinary local demo builds default to loopback and must not be uploaded accidentally. Run beta preflight against the exact store build.

## Privacy and data use

Data is handled: local skills/preferences and saved snapshots; explicitly submitted requests/profile context; public website content used as evidence; hosted public GitHub identity, session credentials, and allowance records. This data must be disclosed accurately in the store form. No health or financial data is requested. User-entered free text may contain personal information.

The implementation has no sale, advertising, creditworthiness, or unrelated-use functionality. The publisher must verify model-provider data-use settings and operational retention before certifying store disclosures.

**Policy:** https://unforked-beta.unforked-api.workers.dev/privacy. Source disclosure is maintained in `docs/privacy.md`. Support: johangerold385@gmail.com. Disclose the selected local provider: requested text and public evidence travel through authenticated Cloudflare Tunnel to the owner's laptop, where Ollama/Qwen processes them in memory. There is no automatic cloud fallback. Explicit Gemini selection uses Google's free-tier data terms. Provider choice, encrypted authentication storage and hourly cleanup of expired authentication/90-day usage records must match the store disclosure form. The extension only contacts its existing hosted API; it gains no tunnel or localhost host permissions.

## Distribution and publisher

Owner GitHub account: JohanGerold. Support contact and live privacy URL are configured above. Store publisher name, developer registration, target regions, final visibility and reviewer access are not configured. No listing was created or submitted.

Friends beta: first finish the remaining hosting/acceptance checks, separate the owner's testing allowance from small per-friend allowances, and add only owner-provided GitHub identities to the backend invitation list. Friends extract the beta ZIP, load its folder through chrome://extensions Developer mode and sign in with their invited GitHub account. They do not receive backend credentials. See `docs/beta-tester-guide.md`.

Store distribution: register a Chrome Web Store developer account (one-time registration fee), upload the release ZIP, supply final screenshots/listing/privacy/permissions/reviewer instructions, choose Private, Unlisted or Public, and submit for review. All visibility choices require review. Unlisted permits installation by anyone with the store link; backend invitations remain the live-access boundary. Public availability also requires a deliberate self-service signup or waitlist policy rather than simply removing the invite check.

Before store distribution, verify the store-assigned extension ID/public key and align the backend extension origin and OAuth return URL. The unpacked beta's locally generated identity must not be assumed to match the store identity. Test actual store-installed sign-in before sharing its link.

Official references: [Registration](https://developer.chrome.com/docs/webstore/register/), [distribution visibility](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution/), [publishing](https://developer.chrome.com/docs/webstore/publish/), [stable identity](https://developer.chrome.com/docs/extensions/reference/manifest/key).

## Version history

| Version | Date | Change | Status |
|---|---|---|---|
| 0.1.0 | 2026-11-01 | Sidebar, discovery, summaries, learning paths, saved list, circle selection and hosted invite-only service | Owner live pilot; store draft |

## Release prerequisites

- Complete the remaining hosted acceptance, actual free-tier CPU/capacity profiling and broader matching-quality checks. The owner reports the core journeys working; that is not load-test evidence.
- Verify deployed cleanup and rollback, and match the live policy/retention/support details in the store forms.
- Agree sufficient shared capacity before inviting friends. Local mode separates the owner's 100 actions/day from invited friends' 20/day, with 1,000 shared local actions/month. Failed and cancelled actions retain their reservation. Gemini retains a separate reference budget and prior records. Only the owner is currently invited. A temporary Quick Tunnel is a development connection; stable availability and real shared-load acceptance remain release prerequisites.
- Verify the store identity, OAuth and final HTTPS permissions; refresh screenshots and demo/live labeling.
- Inspect the packaged ZIP for secrets and development-only files; load that exact build.
- Submit only after the owner requests publication.
