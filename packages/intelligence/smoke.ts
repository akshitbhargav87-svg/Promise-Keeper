import { GemmaHttpAdapter } from "./adapter.ts";

const mode = process.env.GEMMA_MODE === "self-hosted" ? "self-hosted" : "hosted";
const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
const modelId = process.env.GEMMA_MODEL_ID;
if (!modelId) { console.error("BLOCKED: set GEMMA_MODEL_ID to the exact approved model identifier. No provider call made."); process.exitCode = 2; }
else if (mode === "hosted" && !apiKey) { console.error("BLOCKED: hosted smoke requires GEMINI_API_KEY or GOOGLE_API_KEY in the server environment. No provider call made."); process.exitCode = 2; }
else {
  try {
    const adapter = new GemmaHttpAdapter({ mode, modelId, apiKey, endpoint: process.env.GEMMA_ENDPOINT, maxInputBytes: Number(process.env.GEMMA_MAX_INPUT_BYTES ?? 1_000_000), timeoutMs: Number(process.env.GEMMA_TIMEOUT_MS ?? 15_000), inputCostMinorPerMillion: process.env.GEMMA_INPUT_COST_MINOR_PER_MILLION ? Number(process.env.GEMMA_INPUT_COST_MINOR_PER_MILLION) : undefined, outputCostMinorPerMillion: process.env.GEMMA_OUTPUT_COST_MINOR_PER_MILLION ? Number(process.env.GEMMA_OUTPUT_COST_MINOR_PER_MILLION) : undefined, costCurrency: process.env.GEMMA_COST_CURRENCY });
    const capabilities = await adapter.probe();
    const sample = await adapter.generate({ input: "Return exactly: PROMISE_KEEPER_SMOKE_OK", promptVersion: "smoke-v1", schemaVersion: "smoke-v1", timeoutMs: 15_000 });
    console.log(JSON.stringify({ capabilities, smoke: sample.text === "PROMISE_KEEPER_SMOKE_OK" ? "passed" : "response_received_check_text", metadata: sample.metadata }, null, 2));
    if (capabilities.reviewRequired) process.exitCode = 3;
  } catch (error) {
    const e = error as { code?: string; retryable?: boolean; retryAfterMs?: number | null; message?: string };
    console.error(JSON.stringify({ status: "blocked", code: e.code ?? "unknown", retryable: e.retryable ?? false, retryAfterMs: e.retryAfterMs ?? null, message: e.message ?? "Probe failed" })); process.exitCode = 1;
  }
}
