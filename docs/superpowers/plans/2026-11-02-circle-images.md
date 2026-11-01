# Circle image explanations

User requirement: circle GitHub content and have the local AI understand the selected image like an image attachment in chat. Existing authorization covers implementation and updating the owner-only beta. Keep the GitHub-only/public-repository scope and existing repo-link selection available.

Design: the sidebar Circle button and keyboard shortcut start image mode. Draw a freehand circle around code, a diagram, an error or text; hide the overlay before capture, crop and mask locally to the selected polygon, show a preview, allow an optional question, then Explain image. Existing repo-link mode remains available separately. Only the crop is uploaded, never the full viewport. No stored image history: temporary Chrome session handoff and in-memory panel/request data, cleared on context changes or dismissal. Image answers explicitly describe visual interpretation rather than claiming a full repository audit.

Platform: existing Chrome MV3 + hosted auth/API + authenticated Node gateway + installed qwen3.5:4b. Installed Ollama reports vision capability. Add activeTab for user-invoked capture, retaining the exact GitHub/API host permissions. No all-sites permission. Toolbar action/keyboard grants capture; failure gives a toolbar retry instruction. A before/after active-tab and page/viewport check discards captures after navigation or switching.

Bounds: one JPEG,32–1024px per edge, <=240000decodedbytes; strict base64/JPEG header/dimension validation at API and gateway, no image URLs. Dedicated350000byte body limit, while text endpoints retain64000/API and48000/gateway. Vision text/schema bound fits local32K context with8192reserved image-token margin;900outputtokens and6000promptbytes. Native output/context checks remain. Same one-active/two-waiting queue,120sdeadline, cancellation, auth/invitation/public-repo checks and local usage reservations. Vision is local-only; never Gemini fallback. No raw image/prompt/output logs or D1 persistence.

Tasks (inline TDD):
1. Probe real installed model on a synthetic code image and record numeric latency/GPU context evidence. Add shared strict image/region/request/answer contracts with failing payload/dimension/path tests.
2. Add a gateway vision endpoint sharing the serial queue; test authorization, forwarding fixed-model images, bounds, cancellation and cross-text/vision serialization. Add backend local vision transport and public-repo/auth/allowance route tests; preserve other behavior.
3. Add bounded polygon crop/capture with stale-tab guards, overlay image mode and temporary selection consumer; test pixel masking/viewport scaling and stale navigation. Keep repository mode tests.
4. Add preview/question/explanation UI and browser tests including cancellation/navigation/320px/permission errors. Update activeTab preflight and privacy/store/operator disclosures.
5. Run offline/type/lint/browser/build/package/credential checks; perform one fresh read-only review, fix Important findings with regressions; restart the rebuilt gateway/tunnel, deploy backend, verify public health/offline/auth and real bounded vision. Provide reload/toolbar instructions. Do not invite friends or change existing usage records.

Ruling: preview + optional question is the chosen interaction, matching an image attachment; it is a normal product control, not an assistant approval pause. All image processing runs on the existing local model, through the existing authenticated Cloudflare transport. Larger selections are downscaled, with explicit uncertainty for unreadable content.
