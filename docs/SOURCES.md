# Source basis and research notes

Reviewed 31 October 2026. Web content can change; check again when implementing a provider or preparing a public launch. TinyFish was not available during preparation, so the available browser and web research tools were used.

## Original concept and user requirements

- [Shared Claude conversation](https://claude.ai/share/77d87614-90fe-4d15-a493-49fd45102fbd), read in the side browser: save company commitments from messages/screenshots, retain evidence, track dates, compare later documents, and prepare a sourced response. Its SQLite/Streamlit suggestion was a prototype option. The user's request expands it into a complete multi-screen platform with mail automation, brands, offers, subscriptions, chat, and parallel execution.
- [Target repository](https://github.com/akshitbhargav87-svg/Promise-Keeper). Local workspace initially contained only an unborn Git repository. Both HEAD and full-ref Git lookups returned no refs before the initial blueprint was pushed; the initial remote was empty.
- [Event page](https://www.mlh.com/events/hacktoberfest-hack-day-delhi-x-braveon-ai), content supplied by the user: Hacktoberfest Hack Day Delhi x Braveon AI & RoundTable DTU, 31 October 2026; categories Best Open-Source AI Project and Best Use of Gemma 4. The pasted event text conflicts between its descriptive time and details block; do not derive a new schedule from it. The user explicitly said not to constrain product scope to the submission timing.
- [Submission page](https://www.mlh.com/events/hacktoberfest-hack-day-delhi-x-braveon-ai/submissions/new), pasted submission text supplied by the user: project name, source repository, Markdown description, technologies, actual runtime AI, links, categories, coding tools/model disclosure, optional draft/team workflow. No submission was made while preparing this repository.

## Gemma deployment

[Google's Gemma API guide](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api) lists Gemini API access to `gemma-4-26b-a4b-it` and `gemma-4-31b-it`. This supports the proposed hosted adapter. Access, quotas, pricing, JSON behavior, and image handling must still be tested with the actual project credentials. The API key is server-side.

[Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4) documents the model family and multimodal variants. This supports planning screenshot interpretation; the selected deployed variant must pass the project's own evaluations. [Gemma deployment options](https://ai.google.dev/gemma/docs) support a separately configured self-hosted path. Model availability does not prove the web application runs on-device.

## Gmail

[Gmail scope reference](https://developers.google.com/workspace/gmail/api/auth/scopes) classifies broad mail-reading access. [Restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) explains that public use of restricted scopes can require verification and security assessment, depending on processing and applicable exceptions. This is a deployment readiness task, not a reason to fake a connected account in the UI.

[Gmail push guide](https://developers.google.com/workspace/gmail/api/guides/push) describes watch-based change notifications. [Gmail synchronization guide](https://developers.google.com/workspace/gmail/api/guides/sync) describes incremental history and full synchronization recovery. The plan therefore uses renewable watches, durable checkpoints, and reconciliation rather than treating notifications as a complete message log. Implementers must confirm current watch expiry, rate limits, and history-gap behavior from those guides.

## Microsoft mail

[Microsoft Graph message delta](https://learn.microsoft.com/en-us/graph/api/message-delta) documents folder-based incremental message changes and permission choices. Full-body ingestion needs the appropriate delegated body-reading permission; the design selects Mail.Read and does not request inbox write/send access. Subscription validation/renewal and tenant restrictions must be verified in A03-T05 against the current official Graph documentation.

## Implementation choices versus sourced facts

The stack, retention defaults, UI dimensions, ten areas, task sequencing, budgets, and Git coordination method are project design decisions. They are not claims made by the linked sources. Performance figures are test targets. The original chat's claims about what other assistants can or cannot do are not used as verified competitor comparisons. The project value is its integrated persistent evidence workflow.
