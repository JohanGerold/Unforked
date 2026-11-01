# Repository knowledge roadmap

User requirement: replace contribution-task learning paths with a repository-specific breakdown of languages, language concepts and libraries to learn. Examples such as NumPy/pandas are examples, not universal prerequisites. Existing authorization covers implementation and the owner-only beta update; no new product choice requires clarification.

Design: show language sections (core or area-specific), necessary concepts, relevant libraries and their concepts, and a short explanation of their use in the repository. Supporting tools get a separate section. Display observed profile matches without interpreting missing profile fields as lack of knowledge. Evidence limitations appear separately, never as knowledge gaps. No numbered workflow, issue selection, PR tasks or readiness questions. Keep the existing dark design, local model budget and invitation boundary.

Learning-only retrieval reads public metadata, README, languages/root files, a detected contribution guide, up to two dependency manifests and two sampled source files. A bounded tree listing discovers source paths. Never execute repository content. Keep at most10sources and at most14GitHubcalls, within the hosted40requestcap. Other actions retain existing retrieval. Source snippets include imports/definitions; all requirements cite evidence. Missing samples produce explicit limits, not fabricated requirements.

Response: overview; up to3language groups with priority, depth, at most6concepts and2libraries; up to2supporting-skills groups; separate limitations; aggregate source IDs. Per-group source references are validated. Use concise output within1200tokens/call; no model/runtime or credentials in extension.

Implementation sequence (TDD, inline):
1. Contracts and learning-specific retrieval: add failing bounded retrieval/public-only/path-safety cases, implement manifests/source sampling and route only learning through it.
2. Generation: add failing structured requirements/citation/profile cases, implement constrained response and skill-oriented prompt; update demo fixture.
3. Sidebar: add failing browser cases for language/concept/library display, profile-match labels and separated limits; implement responsive semantic sections.
4. Verify offline/type/lint/browser, real Qwen probe with pytest evidence, build/inspect package. Perform one fresh read-only review, fix Important findings with regressions, then deploy the existing owner-only beta and provide reload instructions.

Release check: user already confirmed local integration works. Preserve provider and all usage records; no gateway restart or extra model/API keys needed for this feature. Authenticated owner acceptance follows the rebuilt extension.
