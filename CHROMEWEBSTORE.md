# Chrome Web Store Listing — Unforked

Last updated: November 1, 2026. Local package only; not submitted.

## Store listing

**Name:** Unforked

**Short description:** Find GitHub projects that fit your skills, understand repositories, and plan your next open-source contribution.

**Detailed description:**

Unforked helps you find a realistic way into open source on GitHub.

Describe what you know and what you want to work on. Explore a short list of projects with reasons they fit, knowledge gaps, and starting issues when availability can be verified. Open a repository for a sourced explanation, or circle its title or link on GitHub. Save interesting projects and ask for a learning path toward your next contribution.

Open the sidebar from the toolbar. Add your skills, describe a goal, and explore the results. You can also enter a repository URL or use the GitHub link context menu.

The current local package starts with clearly labeled demonstration examples. Live recommendations require a configured service. Suggestions are estimates, not guarantees of issue availability or contribution acceptance.

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
| Configured backend origin | Send explicit requests and receive repository analysis; the local build permits loopback port 8787 |

The content script is restricted to GitHub. The manifest does not request history, microphone, broad all-site access, or repository write access. Replace the localhost backend origin and rebuild before any public release.

## Privacy and data use

Data is handled: local skills/preferences and saved snapshots; explicitly submitted requests/profile context; public website content used as evidence; hosted public GitHub identity, session credentials, and allowance records. This data must be disclosed accurately in the store form. No health or financial data is requested. User-entered free text may contain personal information.

The implementation has no sale, advertising, creditworthiness, or unrelated-use functionality. The publisher must verify model-provider data-use settings and operational retention before certifying store disclosures.

**Policy:** Draft at `docs/privacy.md`. A real, publicly accessible URL is required.

## Distribution and publisher

Not configured. Publisher name, contact email, support URL, target regions, privacy URL, model-provider disclosures and hosted-service setup require the owner's real details. Do not invent them or submit this draft.

## Version history

| Version | Date | Change | Status |
|---|---|---|---|
| 0.1.0 | 2026-11-01 | Local sidebar, discovery, summaries, learning paths, saved list, circle selection and hosted-service controls | Draft |

## Release prerequisites

- Configure and test the hosted service, OAuth redirects, production permissions, rate limits and actual model quality.
- Choose and enforce usage-record retention; publish a matching privacy policy and support contact.
- Replace local backend permissions; review screenshots, store description and demo/live labeling.
- Inspect the packaged ZIP for secrets and development-only files; load that exact build.
- Submit only after the owner requests publication.
