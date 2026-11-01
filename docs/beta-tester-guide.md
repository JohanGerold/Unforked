# Unforked private beta installation

Distribution is held until owner acceptance passes. Only the owner's account is currently invited; a shared ZIP does not grant live access.

1. Receive the versioned ZIP from the beta owner and extract it to a permanent folder.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`.
3. Confirm the ID is `afgkgdnejdfeacijhmcgajbgmgamhced`. Stop and contact the owner if it differs.
4. Pin Unforked, open GitHub, click the extension icon, and use **Sign in with GitHub**. Use the exact GitHub account the owner invited. No API key is needed.
5. Enter your actual skills and available time, then request a small contribution shortlist. Demo indicators mean live analysis is unavailable.

To try circle selection, open a GitHub page, press **Alt+Shift+U**, and draw around a repository link or title. Use Escape to cancel. The AI reads public repository evidence, not implementation code. Issue availability is checked again before an actionable issue link is offered; maintainers decide whether contributions are accepted.

Try a profile-based search, a repo summary, a repo question, saving/reopening a result, and a learning path. Learning now shows a project knowledge roadmap: languages, language concepts, relevant libraries and their concepts, plus supporting tools. The backend inspects dependency manifests and selected source snippets. Concepts saved in your profile are marked; unlisted topics are not assumed unfamiliar. Check the separate evidence limits. Report relevance and failures to johangerold385@gmail.com with the action, public repo URL, approximate time, request ID if shown, and a short description. Never send API keys, sign-in URLs/codes or a screenshot of credentials.

With local AI selected, invited friends have 20 generation actions per UTC day, subject to 1,000 shared local actions per UTC month. The owner's allowance is separate. The laptop processes one generation at a time and holds at most two waiting requests. It must stay awake and online. Busy requests show a retry instruction; offline requests do not switch automatically to Google. Failed or cancelled work can still consume allowance. If the owner explicitly switches to Gemini, friends have five actions per UTC day and its separate shared budget/provider quotas apply.

Settings identifies the selected AI provider and clears local profiles and saved data. Local mode sends requested text and public repository evidence through an authenticated Cloudflare connection to the owner's laptop for in-memory Ollama/Qwen processing; GitHub tokens remain on the hosted backend. Sign out revokes the current session. You can revoke the OAuth grant in GitHub Settings → Applications. For server data requests, email the beta owner. Read the [privacy policy](https://unforked-beta.unforked-api.workers.dev/privacy) before submitting text. Explicit Gemini selection uses Google's free-tier processing, which may use submitted content to improve its products.

For an update, replace the extracted files with the new package and click Reload in `chrome://extensions`. Keep the same extension ID and verify it after updating.
