import test from "node:test";
import assert from "node:assert/strict";

import { generateComplaintDraft } from "../src/composer/complaint-drafter.ts";
import { DraftManager } from "../src/composer/draft-manager.ts";

const SCENARIO_BREACH = {
  promisedAmount: { minor: "19900", currency: "INR" },
  observedAmount: { minor: "34900", currency: "INR" },
  deltaAmount: { minor: "15000", currency: "INR" },
  period: { start: "2026-10-01", endExclusive: "2026-11-01" },
  sourceCitations: [
    {
      evidenceId: "demo-price-screenshot",
      assetVersion: 1,
      spanId: "span-price",
      excerpt: "locked at INR 199 including taxes",
    },
  ],
};

const SCENARIO_FACTS = [
  {
    id: "fact-1",
    factType: "promised_amount",
    description: "Nimbus Mobile plan locked at INR 199 for 12 billing periods",
    sourceSpanRef: {
      evidenceId: "demo-price-screenshot",
      assetVersion: 1,
      spanId: "span-199",
      excerpt: "INR 199 including taxes",
    },
    userAllegationOnly: false,
  },
  {
    id: "fact-2",
    factType: "condition",
    description: "Customer support agent on phone promised same price on Oct 15",
    userAllegationOnly: true,
  },
];

test("T05-Acceptance 1: Draft only cites retained, confirmed evidence sources", () => {
  const draft = generateComplaintDraft({
    brandName: "Nimbus Mobile",
    recipientName: "Nodal Officer",
    caseType: "price_lock_violation",
    tone: "formal_legal",
    language: "en-IN",
    facts: SCENARIO_FACTS,
    breach: SCENARIO_BREACH,
    deadline: null,
    desiredOutcome: "Restore INR 199/month plan and refund INR 150 overcharge",
    userConfirmedEvidenceIds: ["demo-price-screenshot"], // Confirmed
  });

  assert.equal(draft.citedSources.length > 0, true);
  assert.equal(draft.citedSources.every((c) => c.evidenceId === "demo-price-screenshot"), true);
  assert.equal(draft.warnings.length, 0);
});

test("T05-Acceptance 2: Unconfirmed evidence is excluded with a warning, not silently cited", () => {
  const draft = generateComplaintDraft({
    brandName: "Nimbus Mobile",
    recipientName: null,
    caseType: "price_lock_violation",
    tone: "formal_legal",
    language: "en-IN",
    facts: SCENARIO_FACTS,
    breach: {
      ...SCENARIO_BREACH,
      sourceCitations: [
        {
          evidenceId: "unconfirmed-deleted-bill",
          assetVersion: 1,
          spanId: "span-del",
          excerpt: "charge INR 349",
        },
      ],
    },
    deadline: null,
    desiredOutcome: "Refund",
    userConfirmedEvidenceIds: [], // Nothing confirmed
  });

  assert.equal(draft.citedSources.length, 0, "No sources should be cited if none are confirmed");
  assert.equal(draft.warnings.length > 0, true);
  assert.match(draft.warnings[0], /not confirmed|not included/i);
});

test("T05-Acceptance 3: User allegation is explicitly labelled, not passed as verified fact", () => {
  const draft = generateComplaintDraft({
    brandName: "Nimbus Mobile",
    recipientName: null,
    caseType: "price_lock_violation",
    tone: "assertive",
    language: "en-IN",
    facts: SCENARIO_FACTS,
    breach: SCENARIO_BREACH,
    deadline: null,
    desiredOutcome: "Refund overcharge",
    userConfirmedEvidenceIds: ["demo-price-screenshot"],
  });

  // Allegation should not appear as a document-verified claim — check wording
  assert.match(draft.body, /on my own account|I also wish to note|personal recollection/i,
    "Unverified user allegation must be clearly distinguished in text");
});

test("T05-Acceptance 4: No invented statutes, helpline guarantees, or auto-sending", () => {
  const draft = generateComplaintDraft({
    brandName: "Nimbus Mobile",
    recipientName: null,
    caseType: "price_lock_violation",
    tone: "formal_legal",
    language: "en-IN",
    facts: SCENARIO_FACTS,
    breach: SCENARIO_BREACH,
    deadline: null,
    desiredOutcome: "Refund",
    userConfirmedEvidenceIds: ["demo-price-screenshot"],
  });

  // Disclaimer must exist
  assert.match(draft.disclaimer, /no legal guarantee/i);
  // Draft body must not contain fabricated statute numbers
  assert.doesNotMatch(draft.body, /Section \d{3}|IPC|CPC|RERA/i);
  // Body must not contain a send command or auto-submit signal
  assert.doesNotMatch(draft.body, /automatically sent|auto-submitted/i);
});

test("T05-Acceptance 5: Hindi draft preserves exact cited amounts correctly", () => {
  const draft = generateComplaintDraft({
    brandName: "Nimbus Mobile",
    recipientName: null,
    caseType: "price_lock_violation",
    tone: "polite",
    language: "hi-IN",
    facts: SCENARIO_FACTS,
    breach: SCENARIO_BREACH,
    deadline: null,
    desiredOutcome: "अतिरिक्त शुल्क वापस करें",
    userConfirmedEvidenceIds: ["demo-price-screenshot"],
  });

  // Exact amounts must appear in Hindi draft
  assert.match(draft.body, /₹199\.00/);
  assert.match(draft.body, /₹349\.00/);
  assert.match(draft.body, /₹150\.00/);
  assert.equal(draft.language, "hi-IN");
});

test("T05-Acceptance 6: Source deletion before export blocks export with warning", () => {
  const manager = new DraftManager();
  manager.addRetainedEvidence(["demo-price-screenshot"]);

  const version = manager.saveDraft("case-001", {
    subject: "Formal Complaint",
    body: "Dear Sir, I was charged INR 349 instead of INR 199...",
    redactionPreviewed: false,
    editedAtUtc: new Date().toISOString(),
    citedSources: [
      {
        evidenceId: "demo-price-screenshot",
        assetVersion: 1,
        spanId: "span-199",
        excerpt: "INR 199",
      },
    ],
  });

  // Initially export is allowed
  const before = manager.preExportCheck("case-001");
  assert.equal(before.canExport, true);

  // Evidence gets deleted (user triggers deletion)
  manager.removeEvidence("demo-price-screenshot");

  // Export now blocked
  const after = manager.preExportCheck("case-001");
  assert.equal(after.canExport, false);
  assert.equal(after.missingIds.includes("demo-price-screenshot"), true);
  assert.match(after.warnings[0], /deleted/i);
});

test("T05-Acceptance 7: Draft versioning is non-destructive (history preserved on edit)", () => {
  const manager = new DraftManager();
  manager.addRetainedEvidence(["ev-1"]);

  manager.saveDraft("case-002", {
    subject: "Version 1 Subject",
    body: "Version 1 body",
    redactionPreviewed: false,
    editedAtUtc: new Date().toISOString(),
    citedSources: [],
  });

  manager.saveDraft("case-002", {
    subject: "Version 2 Subject",
    body: "Version 2 body (revised)",
    redactionPreviewed: true,
    editedAtUtc: new Date().toISOString(),
    citedSources: [],
  });

  const history = manager.getDraftHistory("case-002");
  assert.equal(history.length, 2);
  assert.equal(history[0].version, 1);
  assert.equal(history[1].version, 2);
  assert.equal(manager.getLatestDraft("case-002")?.subject, "Version 2 Subject");
});
