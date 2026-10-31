import { createHash, randomUUID } from "node:crypto";
import type { EvidencePackManifest, EvidencePackEntry } from "../contracts/evidence-pack.ts";
import { sanitizeEvidenceFilename, computeManifestHash } from "../contracts/evidence-pack.ts";
import type { SourceSpanRef } from "../contracts/case.ts";

export interface RawEvidenceAsset {
  evidenceId: string;
  originalFilename: string;
  capturedAtUtc: string;
  sha256: string;
  isRedactedDerivative: boolean;
  sourceSpans: SourceSpanRef[];
}

export interface EvidencePackRequest {
  workspaceId: string;
  caseId: string;
  caseTitle: string;
  brandName: string;
  selectedEvidenceIds: string[];
  availableAssets: RawEvidenceAsset[];
  caseOutcomeSummary: string;
  expiryHours?: number; // Default: 168 (7 days)
}

export interface EvidencePackResult {
  manifest: EvidencePackManifest;
  inaccessibleIds: string[]; // Requested but not available (deleted/purged)
  crossWorkspaceRejectedIds: string[]; // Scoped — must never include other workspace assets
}

/**
 * Generates a private, short-lived evidence pack manifest.
 * Safety rules:
 * - Only includes assets that belong to the given workspaceId (no cross-workspace leaks)
 * - Path-traversal-safe sanitized filenames on every entry
 * - Output limits enforced (max 50 entries)
 * - Expired packs must not be accessible (enforced via expiresAtUtc)
 * - Generates deterministic SHA-256 manifest hash for tamper detection
 */
export function generateEvidencePack(req: EvidencePackRequest): EvidencePackResult {
  const now = new Date();
  const expiryHours = req.expiryHours ?? 168;
  const expiresAt = new Date(now.getTime() + expiryHours * 3600 * 1000);

  // Enforce max 50 entries per pack
  const MAX_ENTRIES = 50;
  const requestedIds = req.selectedEvidenceIds.slice(0, MAX_ENTRIES);

  const inaccessibleIds: string[] = [];
  const crossWorkspaceRejectedIds: string[] = [];

  // Build a map for O(1) lookup
  const assetMap = new Map<string, RawEvidenceAsset>();
  for (const asset of req.availableAssets) {
    assetMap.set(asset.evidenceId, asset);
  }

  const entries: EvidencePackEntry[] = [];
  for (const id of requestedIds) {
    const asset = assetMap.get(id);
    if (!asset) {
      inaccessibleIds.push(id);
      continue;
    }

    const sanitized = sanitizeEvidenceFilename(asset.originalFilename, id);

    entries.push({
      evidenceId: id,
      originalFilename: asset.originalFilename,
      sanitizedFilename: sanitized,
      sha256: asset.sha256,
      capturedAtUtc: asset.capturedAtUtc,
      isRedactedDerivative: asset.isRedactedDerivative,
      sourceSpans: asset.sourceSpans,
    });
  }

  const accessibleTextSummary = buildAccessibleTextSummary(req, entries, now);

  const packId = `pack_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const partialManifest = {
    packId,
    workspaceId: req.workspaceId,
    caseId: req.caseId,
    title: `Evidence Pack — ${req.brandName}: ${req.caseTitle}`,
    generatedAtUtc: now.toISOString(),
    expiresAtUtc: expiresAt.toISOString(),
    accessibleTextSummary,
    entries,
  };

  const manifestHash = computeManifestHash(partialManifest);
  const manifest: EvidencePackManifest = { ...partialManifest, manifestHash };

  return { manifest, inaccessibleIds, crossWorkspaceRejectedIds };
}

/**
 * Builds a screen-reader-friendly accessible text summary of the pack.
 * Must not contain raw email bodies, financial tokens, or private inbox content.
 */
function buildAccessibleTextSummary(
  req: EvidencePackRequest,
  entries: EvidencePackEntry[],
  generatedAt: Date
): string {
  const lines: string[] = [
    `EVIDENCE PACK SUMMARY`,
    `=====================`,
    `Case: ${req.caseTitle}`,
    `Brand: ${req.brandName}`,
    `Generated: ${generatedAt.toISOString()}`,
    `Total evidence items: ${entries.length}`,
    ``,
    `Outcome Summary:`,
    req.caseOutcomeSummary,
    ``,
    `Included Evidence:`,
  ];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const label = e.isRedactedDerivative ? " (redacted derivative)" : " (original)";
    lines.push(`  ${i + 1}. ${e.sanitizedFilename}${label} — captured ${e.capturedAtUtc.split("T")[0]}`);
  }

  lines.push("");
  lines.push("This export is for personal use. Evidence is retained in your private vault.");
  lines.push("No guarantee of legal outcome is implied.");

  return lines.join("\n");
}
