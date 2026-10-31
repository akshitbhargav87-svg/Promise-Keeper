import type { CaseDraft } from "../contracts/case.ts";
import type { SourceSpanRef } from "../contracts/case.ts";

export interface DraftVersion {
  version: number;
  subject: string;
  body: string;
  editedAtUtc: string;
  citedSources: SourceSpanRef[];
  redactionPreviewed: boolean;
}

/**
 * Manages editable draft lifecycle.
 * Rules (per PRODUCT.md):
 * - Draft stays editable at all times before export
 * - Opening email client ≠ sent; only deliberate Record Sent marks it
 * - Source deletion before export blocks or prompts revision
 * - Draft version history is maintained (non-destructive)
 */
export class DraftManager {
  private versions: Map<string, DraftVersion[]> = new Map(); // caseId → versions
  private retainedEvidenceIds: Set<string> = new Set();

  addRetainedEvidence(ids: string[]): void {
    for (const id of ids) this.retainedEvidenceIds.add(id);
  }

  removeEvidence(id: string): void {
    this.retainedEvidenceIds.delete(id);
  }

  saveDraft(caseId: string, draft: Omit<DraftVersion, "version">, nowUtc: Date = new Date()): DraftVersion {
    const existing = this.versions.get(caseId) || [];
    const newVersion: DraftVersion = {
      ...draft,
      version: existing.length + 1,
      editedAtUtc: nowUtc.toISOString(),
    };
    existing.push(newVersion);
    this.versions.set(caseId, existing);
    return { ...newVersion };
  }

  getLatestDraft(caseId: string): DraftVersion | null {
    const all = this.versions.get(caseId);
    if (!all || all.length === 0) return null;
    return { ...all[all.length - 1] };
  }

  getDraftHistory(caseId: string): DraftVersion[] {
    return (this.versions.get(caseId) || []).map((d) => ({ ...d }));
  }

  /**
   * Checks if all cited sources in a draft are still retained (not deleted).
   * Returns array of missing evidence IDs.
   */
  checkMissingSources(draft: DraftVersion): string[] {
    const missing: string[] = [];
    for (const cite of draft.citedSources) {
      if (!this.retainedEvidenceIds.has(cite.evidenceId)) {
        missing.push(cite.evidenceId);
      }
    }
    return missing;
  }

  /**
   * Checks export readiness and returns warnings if sources were deleted.
   */
  preExportCheck(caseId: string): { canExport: boolean; warnings: string[]; missingIds: string[] } {
    const draft = this.getLatestDraft(caseId);
    if (!draft) {
      return { canExport: false, warnings: ["No draft exists for this case."], missingIds: [] };
    }

    const missingIds = this.checkMissingSources(draft);
    if (missingIds.length > 0) {
      return {
        canExport: false,
        warnings: [
          `The following evidence items cited in the draft have been deleted: ${missingIds.join(", ")}.`,
          "Please revise the draft to remove deleted source references before exporting.",
        ],
        missingIds,
      };
    }

    return { canExport: true, warnings: [], missingIds: [] };
  }
}
