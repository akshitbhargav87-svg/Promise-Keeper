import type { ID, Money, DatePrecision, DeadlineContract } from "./reminder.ts";

export type CaseStage =
  | "to_prepare"
  | "drafts"
  | "awaiting_response"
  | "follow_up"
  | "resolved";

export type CaseType =
  | "breach_dispute"
  | "refund_delayed"
  | "price_lock_violation"
  | "trial_unwanted_charge"
  | "delivery_overdue"
  | "warranty_claim";

export interface SourceSpanRef {
  evidenceId: ID;
  assetVersion: number;
  spanId: ID;
  excerpt: string;
}

export interface CaseFact {
  id: string;
  factType: "promised_amount" | "observed_amount" | "promised_date" | "breach_delta" | "condition";
  description: string;
  sourceSpanRef?: SourceSpanRef;
  userAllegationOnly: boolean; // Distinguishes user's allegation from verified document facts
}

export type RecipientProvenance = "source_backed" | "user_entered";

export interface CaseRecipient {
  value: string;
  provenance: RecipientProvenance;
  channel: "email" | "portal" | "phone" | "helpline";
}

export interface CaseDraft {
  version: number;
  subject: string;
  body: string;
  tone: "polite" | "assertive" | "formal_legal";
  language: string; // e.g. "en-IN", "hi-IN"
  recipient: CaseRecipient;
  citedSources: SourceSpanRef[];
  desiredOutcome: string;
  createdAtUtc: string;
}

export type SentChannel =
  | "email_client"
  | "portal"
  | "national_consumer_helpline_1915"
  | "registered_post"
  | "customer_support_chat"
  | "other";

export interface SentSelfReport {
  /**
   * Deliberate user action: Opening an email client or exporting an evidence pack
   * NEVER marks sent as true.
   */
  isSent: boolean;
  sentAtUtc: string | null;
  channel: SentChannel | null;
  externalReferenceNumber: string | null;
  confirmationEvidenceId: ID | null;
  recordedByUserId: ID | null;
}

export type ResolutionStatus =
  | "full_recovery"
  | "partial_recovery"
  | "rejected"
  | "waived";

export interface PartialOutcome {
  disputedAmount: Money;
  recoveredAmount: Money;
  remainingAmount: Money;
  status: ResolutionStatus;
  resolutionDateUtc: string;
  resolutionNotes: string;
}

export interface CaseRecord {
  id: ID;
  workspaceId: ID;
  brandId: ID;
  brandName: string;
  caseType: CaseType;
  stage: CaseStage;
  linkedPromiseIds: ID[];
  linkedEvidenceIds: ID[];
  disputedAmount: Money;
  expectedAmount: Money;
  facts: CaseFact[];
  unansweredQuestions: string[];
  contactSource: CaseRecipient;
  desiredOutcome: string;
  nextFollowUpDate: DeadlineContract | null;
  drafts: CaseDraft[];
  sentReport: SentSelfReport;
  outcome: PartialOutcome | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  version: number;
}

/**
 * Validates and calculates explicit outcome arithmetic.
 * Enforces: disputedMinor - recoveredMinor = remainingMinor, with matching currencies.
 */
export function calculateOutcomeArithmetic(
  disputed: Money,
  recovered: Money
): { remaining: Money; isFullyRecovered: boolean } {
  if (disputed.currency !== recovered.currency) {
    throw new Error(
      `Currency mismatch in outcome calculation: disputed (${disputed.currency}) vs recovered (${recovered.currency})`
    );
  }

  const disputedMinor = BigInt(disputed.minor);
  const recoveredMinor = BigInt(recovered.minor);

  if (recoveredMinor < 0n) {
    throw new Error("Recovered amount cannot be negative");
  }

  const remainingMinor = disputedMinor - recoveredMinor;
  const isFullyRecovered = remainingMinor <= 0n;

  return {
    remaining: {
      minor: (remainingMinor < 0n ? 0n : remainingMinor).toString(),
      currency: disputed.currency,
    },
    isFullyRecovered,
  };
}
