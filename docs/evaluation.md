# Evaluation record

The automated suite covers transport/schema validation, repository identity, public-only evidence, rate limits, conditional requests, contributor storage, stale responses, selection ambiguity, model citation boundaries, unavailable issues, explicit language filtering, secondary languages, OAuth replay, encryption, session expiry/logout, and atomic cost reservations. Browser tests exercise user journeys and an actual sideloaded extension.

A bounded live GitHub retrieval check passed for psf/requests without using an AI provider. Live model generation, real OAuth credentials, production CPU performance and human recommendation quality have not been evaluated because no provider/deployment credentials were supplied. Demo results are not evidence of live matching quality.

## Human evaluation set

Run each of these against the chosen live model. Record its top three candidates, a verified starting point, constraint adherence, usefulness, latency, token usage and estimated cost. Initial acceptance goal: useful top-three results on at least 16 of 20 prompts, zero invented repository/issue identities, and no hard-constraint violations. Do not publish a general accuracy claim from this small set.

1. Python functions/classes, basic Git, four hours, developer tools, first contribution.
2. Python HTTP requests, no web frameworks, two hours, tests rather than documentation.
3. Python only, one weekend, terminal utilities.
4. Python and pandas, eight hours, data validation.
5. JavaScript DOM basics, three hours, accessibility.
6. TypeScript and React, four hours, developer tooling.
7. Rust beginner, no async knowledge, two hours, CLI projects.
8. Go and table-driven tests, six hours, small backend libraries.
9. Java student, collections and JUnit, four hours, education tools.
10. C++ beginner, no build-system knowledge, three hours, learning-first options.
11. Comfortable Python, new to Git, contribution-workflow preparation.
12. Documentation-only request, plain English, two hours.
13. Tests-only request, Python, no machine-learning dependencies.
14. Python only, no JavaScript, mixed-language repositories allowed if the task is Python.
15. Frontend experience, wants to learn backend testing through a small task.
16. Very specific niche with no verified matches; honest alternatives without claiming nonexistence.
17. An archived repository supplied directly; summary identifies its archived status.
18. Familiar project whose labeled issue is assigned or has a competing PR.
19. “Smaller projects” refinement of a concrete original goal; preserve existing constraints.
20. An unrealistic one-hour request requiring several new frameworks; disclose the mismatch.

## Outstanding release checks

Select the live model using measured quality/cost, verify provider billing assumptions, complete a real GitHub OAuth round trip, measure hosted CPU, agree a server retention policy, and obtain the owner's privacy/support details before public distribution.
