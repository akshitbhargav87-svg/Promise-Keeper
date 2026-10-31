import type { ID, Money, ReminderRule, ReminderOccurrence } from "./reminder.ts";
import type { CaseRecord, CaseDraft, SentSelfReport, PartialOutcome, CaseStage } from "./case.ts";
import type { EvidencePackManifest } from "./evidence-pack.ts";

export interface PrincipalContext {
  userId: ID;
  workspaceId: ID;
  sessionId: ID;
  roles: string[];
}

export interface HomeAttentionActionsSummary {
  workspaceId: ID;
  pendingDeadlinesCount: number;
  upcomingReminders: Array<{
    occurrenceId: string;
    title: string;
    dueAtUtc: string;
    precision: string;
    targetRef: { type: string; id: string };
  }>;
  activeCasesCount: number;
  overdueCases: Array<{
    caseId: ID;
    brandName: string;
    disputedAmount: Money;
    stage: CaseStage;
  }>;
  totalDisputedByCurrency: Record<string, string>; // currency -> minor string
  totalRecoveredByCurrency: Record<string, string>;
}

export interface CreateReminderInput {
  targetType: "promise" | "subscription" | "case" | "custom";
  targetId: ID;
  title: string;
  leadTimeMinutes?: number;
  channels?: ("in_app" | "email" | "browser_push")[];
}

export interface CreateCaseFromComparisonInput {
  promiseId: ID;
  brandId: ID;
  brandName: string;
  disputedAmount: Money;
  expectedAmount: Money;
  desiredOutcome: string;
  recipientEmail?: string;
  unansweredQuestions?: string[];
}

export interface AssistantActionToolProposal {
  proposalId: string;
  targetRevision: number;
  expiresAtUtc: string;
  actionType: "create_reminder" | "draft_complaint" | "snooze_reminder" | "record_sent";
  payload: Record<string, unknown>;
  previewDescription: string;
}

export interface ActionsServicePort {
  // Case operations
  createCase(ctx: PrincipalContext, input: CreateCaseFromComparisonInput): Promise<CaseRecord>;
  getCase(ctx: PrincipalContext, caseId: ID): Promise<CaseRecord | null>;
  listCases(ctx: PrincipalContext, filter?: { stage?: CaseStage }): Promise<CaseRecord[]>;
  createDraft(ctx: PrincipalContext, caseId: ID, draft: Omit<CaseDraft, "version" | "createdAtUtc">): Promise<CaseDraft>;
  recordSent(ctx: PrincipalContext, caseId: ID, report: SentSelfReport): Promise<CaseRecord>;
  recordOutcome(ctx: PrincipalContext, caseId: ID, outcome: PartialOutcome): Promise<CaseRecord>;
  generateEvidencePack(ctx: PrincipalContext, caseId: ID): Promise<EvidencePackManifest>;

  // Reminder operations
  createReminderRule(ctx: PrincipalContext, input: CreateReminderInput): Promise<ReminderRule>;
  snoozeOccurrence(ctx: PrincipalContext, occurrenceId: string, untilUtc: string): Promise<ReminderOccurrence>;
  listUpcomingOccurrences(ctx: PrincipalContext, limit?: number): Promise<ReminderOccurrence[]>;

  // Home summary port for A02
  getHomeAttentionSummary(ctx: PrincipalContext): Promise<HomeAttentionActionsSummary>;

  // Grounded Assistant proposal handler for A07
  proposeAssistantAction(ctx: PrincipalContext, action: AssistantActionToolProposal): Promise<{ proposalId: string; status: "pending_user_review" }>;
  executeAssistantActionProposal(ctx: PrincipalContext, proposalId: string): Promise<{ success: boolean; resultRecordId: string }>;
}
