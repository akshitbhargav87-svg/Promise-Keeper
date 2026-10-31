# Intelligence adapter (A04)

Provider calls are server-side only. The adapter is selected explicitly; `self-hosted` never falls through to a hosted provider. This package provides the A04 model and evidence interpretation core. Live capability smoke is credential-gated; mocked behavior is testable without provider access.

## Adapter contract

Implementations expose `probe`, `generate`, and `cancel`. Results include model, prompt and schema versions, elapsed time, token usage when the provider reports it, and estimated cost only when a configured rate card is supplied. Unsupported image or structured-output capabilities must be surfaced to callers so they can request review.

See `CAPABILITIES.md` for verification status and the A10 budget handoff. Run deterministic checks with `node --experimental-strip-types --test packages/intelligence/*.test.ts`. Run a live smoke probe with `node --experimental-strip-types packages/intelligence/smoke.ts` after setting `GEMMA_MODEL_ID` and the credential in the server environment. Hosted mode uses `GEMINI_API_KEY` or `GOOGLE_API_KEY`; self-hosted mode requires `GEMMA_MODE=self-hosted` and an explicit `GEMMA_ENDPOINT`. The script never prints credentials.
