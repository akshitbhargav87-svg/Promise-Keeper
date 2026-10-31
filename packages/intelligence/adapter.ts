export type ProviderMode = "hosted" | "self-hosted";

export interface CapabilityReport {
  provider: string;
  modelId: string;
  text: "supported" | "unsupported" | "unknown";
  image: "supported" | "unsupported" | "unknown";
  structuredOutput: "supported" | "unsupported" | "unknown";
  maxInputTokens: number | null;
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
  promptVersion: string;
  schemaVersion: string;
  signal?: AbortSignal;
  timeoutMs: number;
}

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
