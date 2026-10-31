import type {
  CaseRecord,
  CaseStage,
  CaseType,
  CaseFact,
  CaseRecipient,
  SentSelfReport,
  PartialOutcome,
  ResolutionStatus,
} from "../contracts/case.ts";
import type { Money, DeadlineContract } from "../contracts/reminder.ts";
import { calculateOutcomeArithmetic } from "../contracts/case.ts";

export interface CreateCaseParams {
  workspaceId: string;
  brandId: string;
  brandName: string;
  caseType: CaseType;
  linkedPromiseIds: string[];
  linkedEvidenceIds: string[];
  disputedAmount: Money;
  expectedAmount: Money;
  contactSource: CaseRecipient;
  desiredOutcome: string;
  facts: CaseFact[];
  unansweredQuestions?: string[];
  nextFollowUpDate?: DeadlineContract | null;
}

export interface RecordResponseParams {
  caseId: string;
  workspaceId: string;
  responseSummary: string;
  responseEvidenceId?: string;
  recoveredAmount?: Money;
  isResolved: boolean;
  resolutionStatus?: ResolutionStatus;
  nextFollowUpDate?: DeadlineContract | null;
  expectedVersion: number;
}

export class CaseManager {
  private cases: Map<string, CaseRecord> = new Map();

  createCase(params: CreateCaseParams, nowUtc: Date = new Date()): CaseRecord {
    const id = `case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const newCase: CaseRecord = {
      id,
      workspaceId: params.workspaceId,
      brandId: params.brandId,
      brandName: params.brandName,
      caseType: params.caseType,
      stage: "to_prepare",
      linkedPromiseIds: [...params.linkedPromiseIds],
      linkedEvidenceIds: [...params.linkedEvidenceIds],
      disputedAmount: { ...params.disputedAmount },
      expectedAmount: { ...params.expectedAmount },
      facts: params.facts.map((f) => ({ ...f })),
      unansweredQuestions: params.unansweredQuestions ? [...params.unansweredQuestions] : [],
      contactSource: { ...params.contactSource },
      desiredOutcome: params.desiredOutcome,
      nextFollowUpDate: params.nextFollowUpDate ? { ...params.nextFollowUpDate } : null,
      drafts: [],
      sentReport: {
        isSent: false,
        sentAtUtc: null,
        channel: null,
        externalReferenceNumber: null,
        confirmationEvidenceId: null,
        recordedByUserId: null,
      },
      outcome: null,
      createdAtUtc: nowUtc.toISOString(),
      updatedAtUtc: nowUtc.toISOString(),
      version: 1,
    };

    this.cases.set(id, newCase);
    return { ...newCase };
  }

  getCase(workspaceId: string, caseId: string): CaseRecord | null {
    const c = this.cases.get(caseId);
    if (!c || c.workspaceId !== workspaceId) return null;
    return { ...c };
  }

  listCases(
    workspaceId: string,
    filter?: { stage?: CaseStage; brandId?: string }
  ): CaseRecord[] {
    return Array.from(this.cases.values())
      .filter((c) => {
        if (c.workspaceId !== workspaceId) return false;
        if (filter?.stage && c.stage !== filter.stage) return false;
        if (filter?.brandId && c.brandId !== filter.brandId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.updatedAtUtc).getTime() - new Date(a.updatedAtUtc).getTime());
  }

  updateStage(
    workspaceId: string,
    caseId: string,
    newStage: CaseStage,
    expectedVersion: number,
    nowUtc: Date = new Date()
  ): CaseRecord {
    const existing = this.cases.get(caseId);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error(`Case not found: ${caseId}`);
    }
    if (existing.version !== expectedVersion) {
      throw new Error(`Version conflict: current ${existing.version}, expected ${expectedVersion}`);
    }

    existing.stage = newStage;
    existing.version += 1;
    existing.updatedAtUtc = nowUtc.toISOString();
    return { ...existing };
  }

  recordSent(
    workspaceId: string,
    caseId: string,
    sentReport: SentSelfReport,
    expectedVersion: number,
    nowUtc: Date = new Date()
  ): CaseRecord {
    const existing = this.cases.get(caseId);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error(`Case not found: ${caseId}`);
    }
    if (existing.version !== expectedVersion) {
      throw new Error(`Version conflict: current ${existing.version}, expected ${expectedVersion}`);
    }

    existing.sentReport = { ...sentReport, isSent: true, sentAtUtc: sentReport.sentAtUtc || nowUtc.toISOString() };
    existing.stage = "awaiting_response";
    existing.version += 1;
    existing.updatedAtUtc = nowUtc.toISOString();
    return { ...existing };
  }

  recordResponse(
    params: RecordResponseParams,
    nowUtc: Date = new Date()
  ): CaseRecord {
    const existing = this.cases.get(params.caseId);
    if (!existing || existing.workspaceId !== params.workspaceId) {
      throw new Error(`Case not found: ${params.caseId}`);
    }
    if (existing.version !== params.expectedVersion) {
      throw new Error(`Version conflict: current ${existing.version}, expected ${params.expectedVersion}`);
    }

    if (params.recoveredAmount) {
      const arithmetic = calculateOutcomeArithmetic(existing.disputedAmount, params.recoveredAmount);

      existing.outcome = {
        disputedAmount: { ...existing.disputedAmount },
        recoveredAmount: { ...params.recoveredAmount },
        remainingAmount: arithmetic.remaining,
        status: params.isResolved
          ? arithmetic.isFullyRecovered
            ? "full_recovery"
            : "partial_recovery"
          : (params.resolutionStatus || "partial_recovery"),
        resolutionDateUtc: nowUtc.toISOString(),
        resolutionNotes: params.responseSummary,
      };

      if (params.isResolved) {
        existing.stage = "resolved";
      } else {
        existing.stage = "follow_up";
      }
    } else if (params.isResolved) {
      existing.stage = "resolved";
    } else {
      existing.stage = "follow_up";
    }

    if (params.nextFollowUpDate) {
      existing.nextFollowUpDate = { ...params.nextFollowUpDate };
    }

    existing.version += 1;
    existing.updatedAtUtc = nowUtc.toISOString();
    return { ...existing };
  }
}
