# A04 provider capability matrix

Status date: 2026-10-31. No live provider probe has been run from this environment.

| Capability | Hosted Gemma 4 | Explicit self-hosted Gemma |
| --- | --- | --- |
| Model ID/access | Not verified; credential unavailable | Not configured |
| Text input | Pending smoke test | Pending endpoint configuration |
| Image input | Pending model-specific smoke test | Pending model-specific smoke test |
| Structured output | Pending schema-conformance probe | Pending schema-conformance probe |
| Timeout/cancellation | Adapter must enforce deadline and abort signal | Adapter must enforce deadline and abort signal |
| Rate limits/retry | Pending provider response verification; bounded retry only | Endpoint-specific, pending |
| Usage/cost | Capture provider usage; cost unavailable absent rate card | Capture usage if exposed; cost unavailable absent rate card |
| Input caps | Pending provider/model verification | Deployment-specific, pending |

### Smoke test record

- Result: blocked before request; no `GEMINI_API_KEY` or `GOOGLE_API_KEY` is configured.
- Model ID: unverified. Do not infer the deployed model from prior conversation or assume model names remain available.
- Next: configure an approved server-side credential, execute the smoke probe, and record timestamp, model ID, capabilities, latency, usage and sanitized errors. Never store credentials or raw private evidence here.
