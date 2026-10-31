export type ProviderMode = "hosted" | "self-hosted";

export interface CapabilityReport {
  provider: string;
  modelId: string;
  text: "supported" | "unsupported" | "unknown";
  image: "supported" | "unsupported" | "unknown";
  structuredOutput: "supported" | "unsupported" | "unknown";
  maxInputTokens: number | null;
  probeInputTokens: number | null;
  reviewRequired: boolean;
  reviewReasons: string[];
  cancellation: "supported" | "unsupported" | "unknown";
  rateLimitHandling: "supported" | "unsupported" | "unknown";
}

export interface GenerationMetadata {
  provider: string;
  modelId: string;
  promptVersion: string;
  schemaVersion: string;
  elapsedMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostMinor: string | null;
  currency: string | null;
}

export interface GenerationResult {
  text: string;
  metadata: GenerationMetadata;
}

export interface GenerateRequest {
  input: string;
  image?: { mimeType: string; dataBase64: string };
  responseSchema?: Record<string, unknown>;
  promptVersion: string;
  schemaVersion: string;
  signal?: AbortSignal;
  timeoutMs: number;
}

export type AdapterErrorCode = "configuration" | "unsupported_capability" | "input_too_large" | "timeout" | "cancelled" | "rate_limited" | "provider_unavailable" | "provider_error" | "invalid_response";
export class AdapterError extends Error {
  readonly code: AdapterErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs: number | null;
  constructor(code: AdapterErrorCode, message: string, retryable = false, retryAfterMs: number | null = null) { super(message); this.name = "AdapterError"; this.code = code; this.retryable = retryable; this.retryAfterMs = retryAfterMs; }
}

export interface GemmaAdapterConfig {
  modelId: string;
  apiKey?: string;
  endpoint?: string;
  mode: ProviderMode;
  /** Maximum serialized request bytes, enforced before network access. */
  maxInputBytes: number;
  timeoutMs: number;
  /** Optional externally maintained rate card, in minor currency units per million tokens. */
  inputCostMinorPerMillion?: number;
  outputCostMinorPerMillion?: number;
  costCurrency?: string;
  fetchImpl?: typeof fetch;
}

const unknown = "unknown" as const;
const asRecord = (v: unknown): Record<string, any> => v && typeof v === "object" ? v as Record<string, any> : {};

/** REST adapter compatible with Gemini API's generateContent endpoint. Credentials are never returned or logged. */
export class GemmaHttpAdapter implements ModelAdapter {
  readonly mode: ProviderMode;
  private readonly fetcher: typeof fetch;
  private readonly baseUrl: string;
  private readonly config: GemmaAdapterConfig;
  constructor(config: GemmaAdapterConfig) {
    this.config = config;
    this.mode = config.mode;
    this.fetcher = config.fetchImpl ?? fetch;
    this.baseUrl = (config.endpoint ?? (config.mode === "hosted" ? "https://generativelanguage.googleapis.com/v1beta" : "")).replace(/\/$/, "");
    if (!config.modelId.trim() || !Number.isInteger(config.maxInputBytes) || config.maxInputBytes < 1) throw new AdapterError("configuration", "A model ID and positive maxInputBytes are required");
    if (!this.baseUrl) throw new AdapterError("configuration", "Self-hosted mode requires an explicit endpoint; hosted fallback is disabled");
    if (config.mode === "hosted" && !config.apiKey) throw new AdapterError("configuration", "Hosted Gemma requires a server-side API key");
    if (config.mode === "self-hosted" && !config.endpoint) throw new AdapterError("configuration", "Self-hosted Gemma requires an explicit endpoint");
  }
  private url(suffix: string) { return `${this.baseUrl}/models/${encodeURIComponent(this.config.modelId)}:${suffix}`; }
  private headers() { return { "content-type": "application/json", ...(this.config.mode === "hosted" ? { "x-goog-api-key": this.config.apiKey! } : {}) }; }

  async probe(signal?: AbortSignal): Promise<CapabilityReport> {
    const unavailable: CapabilityReport = { provider: this.mode === "hosted" ? "google-gemini-api" : "self-hosted-gemma", modelId: this.config.modelId, text: unknown, image: unknown, structuredOutput: unknown, maxInputTokens: null, probeInputTokens: null, reviewRequired: true, reviewReasons: [], cancellation: "unknown", rateLimitHandling: "supported" };
    const text = await this.probeGenerate({ contents: [{ role: "user", parts: [{ text: "Reply exactly: OK" }] }], generationConfig: { maxOutputTokens: 8 } }, signal);
    unavailable.text = text.ok ? "supported" : text.unsupported ? "unsupported" : unknown;
    if (!text.ok) { unavailable.reviewReasons.push("Text generation was not confirmed; review or configure a supported model."); return unavailable; }
    unavailable.cancellation = "supported"; // AbortSignal is wired to fetch; endpoint cancellation remains best-effort.
    const schema = { type: "OBJECT", properties: { ok: { type: "BOOLEAN" } }, required: ["ok"] };
    const structured = await this.probeGenerate({ contents: [{ role: "user", parts: [{ text: 'Return JSON {"ok":true}.' }] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema, maxOutputTokens: 16 } }, signal);
    if (structured.ok) {
      try { const parsed = JSON.parse(structured.text!); unavailable.structuredOutput = parsed?.ok === true ? "supported" : "unsupported"; }
      catch { unavailable.structuredOutput = "unsupported"; }
    } else if (structured.unsupported) unavailable.structuredOutput = "unsupported";
    if (this.mode === "hosted") {
      const image = await this.probeGenerate({ contents: [{ role: "user", parts: [{ text: "Reply with one word describing this image." }, { inlineData: { mimeType: "image/png", data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/g6sAAAAASUVORK5CYII=" } }] }], generationConfig: { maxOutputTokens: 8 } }, signal);
      unavailable.image = image.ok ? "supported" : image.unsupported ? "unsupported" : unknown;
      // Gemini countTokens gives a real request token count, not a context-window maximum.
      const count = await this.call("countTokens", { contents: [{ role: "user", parts: [{ text: "Promise Keeper capability probe" }] }] }, signal);
      if (count.ok) unavailable.probeInputTokens = numberOrNull(asRecord(count.json).totalTokens);
    }
    if (unavailable.text !== "supported") unavailable.reviewReasons.push("Text capability is unavailable or unknown.");
    if (unavailable.structuredOutput !== "supported") unavailable.reviewReasons.push("Structured output is unavailable or unknown; manual review is required for extracted fields.");
    if (this.mode === "hosted" && unavailable.image !== "supported") unavailable.reviewReasons.push("Image input is unavailable or unknown; image evidence requires OCR/text or manual review.");
    if (!unavailable.probeInputTokens && this.mode === "hosted") unavailable.reviewReasons.push("Token counting was not confirmed; enforce byte cap and review usage before production budgets.");
    unavailable.reviewRequired = unavailable.reviewReasons.length > 0;
    return unavailable;
  }

  private async probeGenerate(body: Record<string, unknown>, signal?: AbortSignal): Promise<{ ok: boolean; unsupported?: boolean; text?: string }> {
    const result = await this.call("generateContent", body, signal);
    if (result.ok) return { ok: !!extractText(result.json), text: extractText(result.json) };
    if (result.error?.code === "provider_error") return { ok: false, unsupported: result.error.message.includes("HTTP 400") || result.error.message.includes("HTTP 404") || result.error.message.includes("HTTP 422") };
    return { ok: false };
  }

  private async call(method: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<{ ok: true; json: unknown } | { ok: false; error: AdapterError }> {
    if (signal?.aborted) throw new AdapterError("cancelled", "Gemma capability probe cancelled");
    const controller = new AbortController(); let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.config.timeoutMs);
    const abort = () => controller.abort(signal?.reason); signal?.addEventListener("abort", abort, { once: true });
    try {
      const res = await this.fetcher(this.url(method), { method: "POST", headers: this.headers(), signal: controller.signal, body: JSON.stringify(body) });
      if (!res.ok) return { ok: false, error: await this.responseError(res) };
      return { ok: true, json: await res.json() };
    } catch {
      if (signal?.aborted) throw new AdapterError("cancelled", "Gemma capability probe cancelled");
      return { ok: false, error: new AdapterError(timedOut ? "timeout" : "provider_unavailable", "Gemma capability probe unavailable", true) };
    } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
  }

  async generate(request: GenerateRequest): Promise<GenerationResult> {
    if (request.signal?.aborted) throw new AdapterError("cancelled", "Gemma request cancelled", false);
    const contentParts: Record<string, unknown>[] = [{ text: request.input }];
    if (request.image) contentParts.push({ inlineData: { mimeType: request.image.mimeType, data: request.image.dataBase64 } });
    const body: Record<string, unknown> = { contents: [{ role: "user", parts: contentParts }] };
    if (request.responseSchema) body.generationConfig = { responseMimeType: "application/json", responseSchema: request.responseSchema };
    const serialized = JSON.stringify(body);
    if (new TextEncoder().encode(serialized).byteLength > this.config.maxInputBytes) throw new AdapterError("input_too_large", "Input exceeds the configured adapter byte cap; review or split the evidence");
    const controller = new AbortController();
    const timeout = Math.min(request.timeoutMs || this.config.timeoutMs, this.config.timeoutMs);
    const started = Date.now(); let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
    const abort = () => controller.abort(request.signal?.reason);
    request.signal?.addEventListener("abort", abort, { once: true });
    try {
      const res = await this.fetcher(this.url("generateContent"), { method: "POST", headers: this.headers(), body: serialized, signal: controller.signal });
      if (!res.ok) throw await this.responseError(res);
      const json = asRecord(await res.json()); const text = extractText(json);
      if (!text) throw new AdapterError("invalid_response", "Gemma response contained no text; human review required");
      const usage = asRecord(json.usageMetadata); const inTok = numberOrNull(usage.promptTokenCount); const outTok = numberOrNull(usage.candidatesTokenCount);
      const price = inTok !== null && outTok !== null && this.config.inputCostMinorPerMillion !== undefined && this.config.outputCostMinorPerMillion !== undefined
        ? String(Math.ceil((inTok * this.config.inputCostMinorPerMillion + outTok * this.config.outputCostMinorPerMillion) / 1_000_000)) : null;
      return { text, metadata: { provider: this.mode === "hosted" ? "google-gemini-api" : "self-hosted-gemma", modelId: this.config.modelId, promptVersion: request.promptVersion, schemaVersion: request.schemaVersion, elapsedMs: Date.now() - started, inputTokens: inTok, outputTokens: outTok, estimatedCostMinor: price, currency: price === null ? null : this.config.costCurrency ?? null } };
    } catch (e) {
      if (e instanceof AdapterError) throw e;
      if (timedOut) throw new AdapterError("timeout", "Gemma request timed out; retry or request review", true);
      if (request.signal?.aborted) throw new AdapterError("cancelled", "Gemma request cancelled", false);
      throw new AdapterError("provider_unavailable", "Gemma provider unavailable; retry or request review", true);
    } finally { clearTimeout(timer); request.signal?.removeEventListener("abort", abort); }
  }

  private async responseError(res: Response): Promise<AdapterError> {
    const retryAfter = Number(res.headers.get("retry-after"));
    if (res.status === 429) return new AdapterError("rate_limited", "Gemma provider rate limit; retry after the indicated delay", true, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null);
    if (res.status >= 500) return new AdapterError("provider_unavailable", "Gemma provider unavailable; retry or request review", true);
    return new AdapterError("provider_error", `Gemma request rejected (HTTP ${res.status}); check model configuration and capability`);
  }
}

function extractText(value: unknown): string { const root = asRecord(value); const candidates = Array.isArray(root.candidates) ? root.candidates : []; return candidates.flatMap(c => Array.isArray(asRecord(c).content?.parts) ? asRecord(c).content.parts : []).map((p: unknown) => asRecord(p).text).filter((x: unknown): x is string => typeof x === "string").join(""); }
function numberOrNull(v: unknown): number | null { return typeof v === "number" && Number.isFinite(v) ? v : null; }

export interface ModelAdapter {
  readonly mode: ProviderMode;
  probe(signal?: AbortSignal): Promise<CapabilityReport>;
  generate(request: GenerateRequest): Promise<GenerationResult>;
}

/** Selection is explicit. A failed self-hosted selection must never call hosted. */
export function selectAdapter(
  mode: ProviderMode,
  adapters: { hosted?: ModelAdapter; selfHosted?: ModelAdapter },
): ModelAdapter {
  const adapter = mode === "hosted" ? adapters.hosted : adapters.selfHosted;
  if (!adapter || adapter.mode !== mode) {
    throw new Error(`Selected ${mode} model adapter is not configured`);
  }
  return adapter;
}
