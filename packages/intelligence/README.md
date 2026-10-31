# Intelligence adapter (A04)

Provider calls are server-side only. The adapter is selected explicitly; `self-hosted` never falls through to a hosted provider. This package is an initial A04-T01 port and capability report scaffold. No provider has been verified in this environment because no model credential is configured.

## Adapter contract

Implementations expose `probe`, `generate`, and `cancel`. Results include model, prompt and schema versions, elapsed time, token usage when the provider reports it, and estimated cost only when a configured rate card is supplied. Unsupported image or structured-output capabilities must be surfaced to callers so they can request review.

See `CAPABILITIES.md` for the verification status and required smoke checks.
