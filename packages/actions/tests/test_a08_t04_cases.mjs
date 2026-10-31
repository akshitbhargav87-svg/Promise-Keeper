import test from "node:test";
import assert from "node:assert/strict";

import { CaseManager } from "../src/cases/case-manager.ts";

test("T04-Acceptance 1: Case creation surfaces missing facts and user allegation labels", () => {
  const manager = new CaseManager();

  const createdCase = manager.createCase({
    workspaceId: "ws-test",
    brandId: "brand-nimbus",
    brandName: "Nimbus Mobile",
    caseType: "price_lock_violation",
    linkedPromiseIds: ["promise-nimbus-199"],
    linkedEvidenceIds: ["ev-screenshot-1", "ev-bill-oct"],
    disputedAmount: { minor: "15000", currency: "INR" },
    expectedAmount: { minor: "19900", currency: "INR" },
    contactSource: {
      value: "nodal.officer@nimbus.example",
      provenance: "source_backed",
      channel: "email",
    },
    desiredOutcome: "Restore INR 199 monthly plan and refund INR 150 overcharge",
    facts: [
      {
        id: "fact-1",
        factType: "promised_amount",
        description: "Plan promised at INR 199 locked for 12 billing periods",
        sourceSpanRef: {
          evidenceId: "ev-screenshot-1",
          assetVersion: 1,
          spanId: "span-199",
          excerpt: "locked at INR 199",
        },
        userAllegationOnly: false,
      },
      {
        id: "fact-2",
        factType: "condition",
        description: "User alleges support agent confirmed over phone on Oct 15",
        userAllegationOnly: true, // Clearly labeled user allegation
      },
    ],
    unansweredQuestions: [
      "Confirm seat count: was the bill for 1 seat or multiple seats?",
    ],
  });

  assert.equal(createdCase.stage, "to_prepare");
  assert.equal(createdCase.unansweredQuestions.length, 1);
  assert.equal(createdCase.facts[0].userAllegationOnly, false);
  assert.equal(createdCase.facts[1].userAllegationOnly, true);
  assert.equal(createdCase.version, 1);
});

test("T04-Acceptance 2: Version conflict rejection prevents dirty writes", () => {
  const manager = new CaseManager();
  const c = manager.createCase({
    workspaceId: "ws-test",
    brandId: "b-1",
    brandName: "Brand",
    caseType: "breach_dispute",
    linkedPromiseIds: [],
    linkedEvidenceIds: [],
    disputedAmount: { minor: "1000", currency: "INR" },
    expectedAmount: { minor: "500", currency: "INR" },
    contactSource: { value: "test@example.com", provenance: "user_entered", channel: "email" },
    desiredOutcome: "Refund",
    facts: [],
  });

  // Updating with expectedVersion: 1 succeeds and bumps to version 2
  const updated = manager.updateStage("ws-test", c.id, "drafts", 1);
  assert.equal(updated.version, 2);
  assert.equal(updated.stage, "drafts");

  // Attempting another update with stale version 1 must throw conflict
  assert.throws(() => {
    manager.updateStage("ws-test", c.id, "awaiting_response", 1);
  }, /Version conflict/);
});

test("T04-Acceptance 3: Case stage doesn't falsely mark underlying subscription cancelled", () => {
  const manager = new CaseManager();
  const c = manager.createCase({
    workspaceId: "ws-test",
    brandId: "b-sub",
    brandName: "Gym Membership",
    caseType: "trial_unwanted_charge",
    linkedPromiseIds: ["sub-gym-1"],
    linkedEvidenceIds: [],
    disputedAmount: { minor: "200000", currency: "INR" },
    expectedAmount: { minor: "0", currency: "INR" },
    contactSource: { value: "support@gym.example", provenance: "user_entered", channel: "email" },
    desiredOutcome: "Refund charge",
    facts: [],
  });

  // Advance case stage to resolved
  const resolved = manager.recordResponse({
    caseId: c.id,
    workspaceId: "ws-test",
    responseSummary: "Refund issued",
    recoveredAmount: { minor: "200000", currency: "INR" },
    isResolved: true,
    expectedVersion: 1,
  });

  assert.equal(resolved.stage, "resolved");
  assert.equal(resolved.outcome?.status, "full_recovery");
  // The case object tracks dispute outcome, NOT subscription status
  assert.equal(resolved.linkedPromiseIds[0], "sub-gym-1");
});

test("T04-Acceptance 4: Response recording calculates partial outcome arithmetic accurately", () => {
  const manager = new CaseManager();
  const c = manager.createCase({
    workspaceId: "ws-test",
    brandId: "b-telecom",
    brandName: "Telco",
    caseType: "breach_dispute",
    linkedPromiseIds: [],
    linkedEvidenceIds: [],
    disputedAmount: { minor: "15000", currency: "INR" }, // ₹150 disputed
    expectedAmount: { minor: "0", currency: "INR" },
    contactSource: { value: "support@telco.example", provenance: "source_backed", channel: "email" },
    desiredOutcome: "Refund",
    facts: [],
  });

  // Company offers ₹100 refund (partial resolution)
  const partialCase = manager.recordResponse({
    caseId: c.id,
    workspaceId: "ws-test",
    responseSummary: "Credited ₹100 goodwill gesture",
    recoveredAmount: { minor: "10000", currency: "INR" },
    isResolved: false,
    expectedVersion: 1,
  });

  assert.equal(partialCase.stage, "follow_up");
  assert.equal(partialCase.outcome?.recoveredAmount.minor, "10000");
  assert.equal(partialCase.outcome?.remainingAmount.minor, "5000"); // ₹50 remaining
  assert.equal(partialCase.outcome?.status, "partial_recovery");
});
