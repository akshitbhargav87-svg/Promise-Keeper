# A04 provider capability matrix

Status date: 2026-10-31. No live provider probe has been run from this environment.

| Capability | Hosted Gemma 4 | Explicit self-hosted Gemma |
| --- | --- | --- |
| Model ID/access | Not verified; credential unavailable | Not configured |
| Text input | Probe implemented; live result pending | Probe implemented when endpoint is configured |
| Image input | Probe implemented; live result pending | Unknown until explicitly probed |
| Structured output | JSON-schema conformance probe implemented; live result pending | Probe implemented when endpoint supports Gemini-compatible JSON schema |
| Timeout/cancellation | Request deadline and AbortSignal; remote cancellation best-effort | Same |
| Rate limits/retry | HTTP 429 classified with retry-after; retries left to bounded job policy | Same for compatible HTTP errors |
| Usage/cost | Provider token counts captured; cost only with supplied rate card | Token counts captured when returned; cost only with supplied rate card |
| Input caps | Configured serialized-byte cap enforced. Probe token count is not a context-window limit. | Configured serialized-byte cap enforced; model limit deployment-specific |

### Smoke test record

- Result: blocked before live request; no `GEMINI_API_KEY` or `GOOGLE_API_KEY` is configured in this session. Mocked probe and adapter checks pass.
- Model ID: unverified. Do not infer the deployed model from prior conversation or assume model names remain available.
- Next: configure an approved server-side credential, execute the smoke probe, and record timestamp, model ID, capabilities, latency, usage and sanitized errors. `CapabilityReport.maxInputTokens` intentionally remains null; `probeInputTokens` is only a count for the probe string, not the model limit. Never store credentials or raw private evidence here.

## A10 budget handoff

- Adapter hard limits are configured through `maxInputBytes` and `timeoutMs`; production composition must set explicit finite values and reject missing/invalid settings.
- Every successful request reports elapsed milliseconds and provider-reported input/output token counts. Estimated cost remains null unless an externally verified rate card and currency are configured.
- Fake-provider test timing is harness latency, not a provider budget measurement. No live latency, token distribution, rate-limit frequency or cost budget is available yet.
- A10 should initially budget against a configurable byte cap and timeout, then replace provisional values with measured p50/p95 latency, token counts and current provider pricing. Unknown image/JSON capability sets `reviewRequired=true` with explicit reasons.
