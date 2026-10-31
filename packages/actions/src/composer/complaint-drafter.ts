import type { CaseFact, CaseDraft, CaseType, CaseRecipient } from "../contracts/case.ts";
import type { Money, DeadlineContract } from "../contracts/reminder.ts";
import type { SourceSpanRef } from "../contracts/case.ts";

export type DraftTone = "polite" | "assertive" | "formal_legal";
export type DraftLanguage = "en-IN" | "hi-IN";

export interface ComparisonBreach {
  promisedAmount: Money;
  observedAmount: Money;
  deltaAmount: Money;
  period?: { start: string; endExclusive: string };
  sourceCitations: SourceSpanRef[];
}

export interface ComplaintDraftInput {
  brandName: string;
  recipientName: string | null;
  caseType: CaseType;
  tone: DraftTone;
  language: DraftLanguage;
  facts: CaseFact[];
  breach: ComparisonBreach;
  deadline: DeadlineContract | null;
  desiredOutcome: string;
  userConfirmedEvidenceIds: string[]; // Only cite confirmed, retained evidence
}

export interface ComplaintDraftOutput {
  subject: string;
  body: string;
  tone: DraftTone;
  language: DraftLanguage;
  citedSources: SourceSpanRef[];
  warnings: string[];
  disclaimer: string;
}

const AMOUNT_DISCLAIMER = `This is a draft for your review. Please verify all amounts, dates and facts before sending. 
The sender is solely responsible for the accuracy of this complaint. 
No legal guarantee or fabricated statute is claimed.`;

/**
 * Formats a Money value for human-readable display.
 */
function formatMoney(money: Money): string {
  const symbol = money.currency === "INR" ? "₹" : money.currency + " ";
  const major = (Number(money.minor) / 100).toFixed(2);
  return `${symbol}${major}`;
}

/**
 * Returns the date string for a deadline, or a placeholder if unknown.
 */
function formatDeadline(deadline: DeadlineContract | null): string {
  if (!deadline || deadline.precision === "unknown" || !deadline.date) {
    return "[date not stated in source evidence — please confirm]";
  }
  return deadline.date.split("T")[0];
}

/**
 * Generates grounded English complaint draft.
 * Rules:
 * - Only cites retained, user-confirmed evidence
 * - Labels user allegations separately from verified document facts
 * - No invented statutes, fabricated helpline numbers, or guaranteed outcomes
 * - Does not send email or auto-submit — draft is for user review and export only
 */
function generateEnglishDraft(input: ComplaintDraftInput): ComplaintDraftOutput {
  const warnings: string[] = [];
  const citedSources: SourceSpanRef[] = [];

  // Collect verified (non-allegation-only) facts with source citations
  const verifiedFacts = input.facts.filter((f) => !f.userAllegationOnly && f.sourceSpanRef);
  const allegationFacts = input.facts.filter((f) => f.userAllegationOnly);

  for (const fact of verifiedFacts) {
    if (fact.sourceSpanRef) {
      if (input.userConfirmedEvidenceIds.includes(fact.sourceSpanRef.evidenceId)) {
        citedSources.push(fact.sourceSpanRef);
      } else {
        warnings.push(
          `Evidence ${fact.sourceSpanRef.evidenceId} referenced in fact "${fact.description}" has not been confirmed as retained. Removed from draft.`
        );
      }
    }
  }

  if (input.breach.sourceCitations) {
    for (const cite of input.breach.sourceCitations) {
      if (input.userConfirmedEvidenceIds.includes(cite.evidenceId)) {
        if (!citedSources.find((c) => c.spanId === cite.spanId)) {
          citedSources.push(cite);
        }
      }
    }
  }

  const promisedFmt = formatMoney(input.breach.promisedAmount);
  const observedFmt = formatMoney(input.breach.observedAmount);
  const deltaFmt = formatMoney(input.breach.deltaAmount);
  const periodStr = input.breach.period
    ? ` for the billing period ${input.breach.period.start} to ${input.breach.period.endExclusive}`
    : "";

  let body = "";

  if (input.tone === "formal_legal") {
    body = `Dear ${input.recipientName || "Nodal Officer / Customer Grievance Team"},

I am writing to formally bring to your attention a billing discrepancy and to seek resolution of the same.

**Background**
I was provided a written assurance${verifiedFacts.length > 0 ? " (as evidenced by the attached screenshot/document)" : ""} that my ${input.brandName} plan would be priced at ${promisedFmt} per billing cycle. This commitment is documented in the attached evidence.

**The Issue**
I have been charged ${observedFmt}${periodStr}, which exceeds the promised amount by ${deltaFmt}. This constitutes a material departure from the terms communicated to me in writing.

${allegationFacts.length > 0 ? `**Additional Context (User-Reported)**\nThe following points are based on my personal account and recollection:\n${allegationFacts.map((f) => `- ${f.description}`).join("\n")}\n` : ""}
**Desired Resolution**
${input.desiredOutcome}

I have attached the relevant documentary evidence including the original price communication and the bill showing the excess charge. I request a written response and resolution within a reasonable timeframe.

Please treat this as a formal complaint for your records.

Yours sincerely,
[Your Full Name]
[Contact Number]
[Date]`;
  } else if (input.tone === "assertive") {
    body = `Dear ${input.recipientName || "Customer Support / Nodal Officer"},

I am contacting you regarding a billing overcharge on my ${input.brandName} account that requires immediate correction.

**What was promised:** ${promisedFmt}/billing cycle (documented in attached evidence)
**What I was charged:** ${observedFmt}${periodStr}
**Excess charged:** ${deltaFmt}

This overcharge is not acceptable, and I request a full refund of ${deltaFmt} and restoration of the correct billing at ${promisedFmt}.

${allegationFacts.length > 0 ? `I also wish to note (on my own account): ${allegationFacts.map((f) => f.description).join("; ")}.\n` : ""}
**Required Action:** ${input.desiredOutcome}

I have retained the original screenshots and billing records. If this is not resolved promptly, I will escalate through available consumer grievance channels.

[Your Name]`;
  } else {
    // polite
    body = `Dear ${input.recipientName || "Customer Support Team"},

I hope this message finds you well. I am reaching out because I have noticed a discrepancy in my ${input.brandName} billing.

When I signed up, I was informed that my plan would be priced at ${promisedFmt} per billing cycle. However, my latest bill shows a charge of ${observedFmt}${periodStr} — a difference of ${deltaFmt}.

I have attached the original communication showing the promised price along with my current bill for your reference.

${allegationFacts.length > 0 ? `I would also like to mention (based on my personal recollection): ${allegationFacts.map((f) => f.description).join("; ")}.\n` : ""}
I kindly request: ${input.desiredOutcome}

I would appreciate a prompt response. Thank you for your assistance.

Warm regards,
[Your Name]`;
  }

  const subject =
    input.tone === "formal_legal"
      ? `Formal Complaint: Billing Discrepancy — ${input.brandName} — Overcharge of ${deltaFmt}`
      : `Billing Issue with ${input.brandName}: Overcharge of ${deltaFmt}`;

  if (warnings.length > 0) {
    warnings.unshift("Some evidence items were not included because they were not confirmed as retained:");
  }

  return {
    subject,
    body,
    tone: input.tone,
    language: input.language,
    citedSources,
    warnings,
    disclaimer: AMOUNT_DISCLAIMER,
  };
}

/**
 * Generates Hindi complaint draft.
 */
function generateHindiDraft(input: ComplaintDraftInput): ComplaintDraftOutput {
  const warnings: string[] = [];
  const citedSources: SourceSpanRef[] = [];
  const promisedFmt = formatMoney(input.breach.promisedAmount);
  const observedFmt = formatMoney(input.breach.observedAmount);
  const deltaFmt = formatMoney(input.breach.deltaAmount);

  for (const fact of input.facts) {
    if (!fact.userAllegationOnly && fact.sourceSpanRef) {
      if (input.userConfirmedEvidenceIds.includes(fact.sourceSpanRef.evidenceId)) {
        citedSources.push(fact.sourceSpanRef);
      } else {
        warnings.push(`साक्ष्य ${fact.sourceSpanRef.evidenceId} की पुष्टि नहीं हुई है।`);
      }
    }
  }

  const body = `प्रिय ${input.recipientName || "ग्राहक सेवा टीम"},

मैं आपको सूचित करना चाहता/चाहती हूँ कि ${input.brandName} के मेरे खाते में बिलिंग में गड़बड़ी हुई है।

मुझे बताया गया था कि मेरी योजना ${promisedFmt} प्रति बिलिंग चक्र में होगी, लेकिन मुझसे ${observedFmt} का शुल्क लिया गया है — यानी ${deltaFmt} का अतिरिक्त शुल्क।

मूल संदेश और बिल संलग्न हैं।

मेरी अपेक्षा: ${input.desiredOutcome}

कृपया इस मामले को शीघ्र सुलझाएं।

धन्यवाद,
[आपका नाम]`;

  return {
    subject: `शिकायत: ${input.brandName} — अतिरिक्त शुल्क ${deltaFmt}`,
    body,
    tone: input.tone,
    language: input.language,
    citedSources,
    warnings,
    disclaimer: AMOUNT_DISCLAIMER,
  };
}

/**
 * Main complaint draft generator — routes by language.
 */
export function generateComplaintDraft(input: ComplaintDraftInput): ComplaintDraftOutput {
  if (input.language === "hi-IN") {
    return generateHindiDraft(input);
  }
  return generateEnglishDraft(input);
}
