import { createHash } from "node:crypto";
import type { ID } from "./reminder.ts";
import type { SourceSpanRef } from "./case.ts";

export interface EvidencePackEntry {
  evidenceId: ID;
  originalFilename: string;
  sanitizedFilename: string;
  sha256: string;
  capturedAtUtc: string;
  isRedactedDerivative: boolean;
  sourceSpans: SourceSpanRef[];
}

export interface EvidencePackManifest {
  packId: ID;
  workspaceId: ID;
  caseId: ID;
  title: string;
  generatedAtUtc: string;
  expiresAtUtc: string; // Private short-lived export
  accessibleTextSummary: string;
  entries: EvidencePackEntry[];
  manifestHash: string;
}

/**
 * Sanitizes external filenames to prevent path traversal or filesystem escapes.
 */
export function sanitizeEvidenceFilename(filename: string, fallbackId: string): string {
  // Strip path traversal elements and characters outside safe alphanumeric, dash, underscore, dot
  const base = filename.replace(/^.*[\\\/]/, "").trim();
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!cleaned || cleaned === "." || cleaned === "..") {
    return `evidence_${fallbackId}.bin`;
  }
  return cleaned;
}

/**
 * Computes deterministic manifest SHA-256 hash.
 */
export function computeManifestHash(manifest: Omit<EvidencePackManifest, "manifestHash">): string {
  const payload = JSON.stringify({
    packId: manifest.packId,
    workspaceId: manifest.workspaceId,
    caseId: manifest.caseId,
    generatedAtUtc: manifest.generatedAtUtc,
    entries: manifest.entries.map((e) => ({
      evidenceId: e.evidenceId,
      sha256: e.sha256,
      sanitizedFilename: e.sanitizedFilename,
    })),
  });
  return createHash("sha256").update(payload).digest("hex");
}
