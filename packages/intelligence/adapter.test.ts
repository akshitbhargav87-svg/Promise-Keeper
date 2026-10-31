import test from "node:test";
import assert from "node:assert/strict";
import { AdapterError, GemmaHttpAdapter, selectAdapter } from "./adapter.ts";

const response = (status: number, value: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(value), { status, headers });
const ok = (text: string, usageMetadata = {}) => ({ candidates: [{ content: { parts: [{ text }] } }], usageMetadata });
const config = (fetchImpl: typeof fetch, extra: Record<string, unknown> = {}) => ({ mode: "hosted" as const, modelId: "gemma-test", apiKey: "test-secret", maxInputBytes: 100_000, timeoutMs: 250, fetchImpl, ...extra });

test("requires explicit self-hosted endpoint and never falls back", () => {
  assert.throws(() => new GemmaHttpAdapter({ mode: "self-hosted", modelId: "local", maxInputBytes: 1000, timeoutMs: 100 }), { name: "AdapterError" });
  const local = new GemmaHttpAdapter({ mode: "self-hosted", modelId: "local", endpoint: "http://127.0.0.1:8000/v1beta", maxInputBytes: 1000, timeoutMs: 100, fetchImpl: fetch });
  assert.equal(selectAdapter("self-hosted", { selfHosted: local }).mode, "self-hosted");
  assert.throws(() => selectAdapter("self-hosted", {}), /not configured/);
});

test("sends credentials only in server header and captures versions and usage", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const adapter = new GemmaHttpAdapter(config(async (input, init) => {
    calls.push({ url: String(input), init });
    return response(200, ok("ok", { promptTokenCount: 12, candidatesTokenCount: 4 }));
  }));
  const out = await adapter.generate({ input: "hello", promptVersion: "p7", schemaVersion: "s3", timeoutMs: 200 });
  assert.equal(out.metadata.modelId, "gemma-test");
  assert.equal(out.metadata.promptVersion, "p7");
  assert.equal(out.metadata.schemaVersion, "s3");
  assert.equal(out.metadata.inputTokens, 12);
  assert.equal(out.metadata.outputTokens, 4);
  assert.equal(calls[0].init?.headers && (calls[0].init?.headers as Record<string, string>)["x-goog-api-key"], "test-secret");
  assert.equal(JSON.stringify(calls[0].init?.body).includes("test-secret"), false);
});

test("reports rate limits with retry delay and rejects over-cap input before request", async () => {
  let n = 0;
  const adapter = new GemmaHttpAdapter(config(async () => { n++; return response(429, {}, { "retry-after": "3" }); }));
  await assert.rejects(adapter.generate({ input: "x", promptVersion: "p", schemaVersion: "s", timeoutMs: 100 }), (e: unknown) => e instanceof AdapterError && e.code === "rate_limited" && e.retryAfterMs === 3000);
  const capped = new GemmaHttpAdapter(config(async () => { n++; return response(200, ok("ok")); }, { maxInputBytes: 2 }));
  await assert.rejects(capped.generate({ input: "long input", promptVersion: "p", schemaVersion: "s", timeoutMs: 100 }), { code: "input_too_large" });
  assert.equal(n, 1);
});

test("times out and respects caller cancellation", async () => {
  const hanging = new GemmaHttpAdapter(config((_input, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true }))));
  await assert.rejects(hanging.generate({ input: "x", promptVersion: "p", schemaVersion: "s", timeoutMs: 10 }), { code: "timeout" });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(hanging.generate({ input: "x", promptVersion: "p", schemaVersion: "s", timeoutMs: 100, signal: controller.signal }), { code: "cancelled" });
});

test("capability probe distinguishes tested features and probe count from model cap", async () => {
  const adapter = new GemmaHttpAdapter(config(async (input, init) => {
    const url = String(input); const body = JSON.parse(String(init?.body));
    if (url.endsWith(":countTokens")) return response(200, { totalTokens: 7 });
    if (body.generationConfig?.responseMimeType === "application/json") return response(200, ok('{"ok":true}'));
    return response(200, ok("OK"));
  }));
  const report = await adapter.probe();
  assert.equal(report.text, "supported");
  assert.equal(report.structuredOutput, "supported");
  assert.equal(report.probeInputTokens, 7);
  assert.equal(report.maxInputTokens, null);
  assert.equal(report.reviewRequired, false);
});

test("unknown capability explicitly requires review", async()=>{
  const a=new GemmaHttpAdapter(config(async()=>response(401,{error:{message:"unauthorized"}})));
  const report=await a.probe();
  assert.equal(report.reviewRequired,true);
  assert.match(report.reviewReasons[0],/Text generation/);
});
