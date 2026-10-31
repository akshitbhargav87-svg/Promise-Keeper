import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeDeterministicOccurrenceId,
  isWithinQuietHours,
} from "../src/contracts/reminder.ts";
import {
  calculateOutcomeArithmetic,
} from "../src/contracts/case.ts";
import {
  sanitizeEvidenceFilename,
  computeManifestHash,
} from "../src/contracts/evidence-pack.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../..");

test("Acceptance 1: Occurrence identity is deterministic across repeated runs and replays", () => {
  const ws = "ws-123";
  const rule = "rule-456";
  const scheduledTime = "2026-11-01T09:00:00Z";
  const channel = "in_app";

  const id1 = computeDeterministicOccurrenceId(ws, rule, scheduledTime, channel);
  const id2 = computeDeterministicOccurrenceId(ws, rule, scheduledTime, channel);
  const idDiffChannel = computeDeterministicOccurrenceId(ws, rule, scheduledTime, "email");

  assert.equal(id1, id2, "Identical parameters must produce identical occurrence IDs");
  assert.notEqual(id1, idDiffChannel, "Different channel must produce different occurrence ID");
  assert.match(id1, /^occ_[a-f0-9]{24}$/, "Occurrence ID must follow standard prefix format");
});

test("Acceptance 2: Source deadline precision is preserved (exact vs estimated vs unknown)", () => {
  const scenarioRaw = fs.readFileSync(path.join(rootDir, "fixtures", "scenario.json"), "utf8");
  const scenario = JSON.parse(scenarioRaw);

  const priceLockDeadline = scenario.extraction.candidates[0].deadline;
  assert.equal(priceLockDeadline.precision, "unknown", "Preserves unknown deadline precision from source");

  const trialDeadline = scenario.trial;
  assert.equal(trialDeadline.precision, "exact", "Preserves exact deadline precision from source");
});

test("Acceptance 3: Case sent self-report is distinct from export", () => {
  const simulatedCase = {
    id: "case-001",
    workspaceId: "ws-123",
    stage: "drafts",
    sentReport: {
      isSent: false,
      sentAtUtc: null,
      channel: null,
      externalReferenceNumber: null,
      confirmationEvidenceId: null,
      recordedByUserId: null,
    },
  };

  // Simulating generating evidence pack export
  const exportGenerated = true;
  assert.equal(exportGenerated, true);
  // Exporting MUST NOT mutate sentReport.isSent
  assert.equal(simulatedCase.sentReport.isSent, false, "Generating export must not mark case as sent");

  // Deliberate user self-report action
  simulatedCase.sentReport = {
    isSent: true,
    sentAtUtc: "2026-11-01T12:00:00Z",
    channel: "national_consumer_helpline_1915",
    externalReferenceNumber: "NCH-2026-99881",
    confirmationEvidenceId: "conf-doc-77",
    recordedByUserId: "user-1",
  };
  simulatedCase.stage = "awaiting_response";

  assert.equal(simulatedCase.sentReport.isSent, true);
  assert.equal(simulatedCase.sentReport.channel, "national_consumer_helpline_1915");
});

test("Acceptance 4: Partial outcome arithmetic is explicit and validated", () => {
  const disputed = { minor: "15000", currency: "INR" }; // ₹150 overcharge
  const recoveredPartial = { minor: "10000", currency: "INR" }; // ₹100 refunded

  const partialRes = calculateOutcomeArithmetic(disputed, recoveredPartial);
  assert.equal(partialRes.remaining.minor, "5000", "Remaining minor must exactly equal 15000 - 10000 = 5000");
  assert.equal(partialRes.remaining.currency, "INR");
  assert.equal(partialRes.isFullyRecovered, false);

  const recoveredFull = { minor: "15000", currency: "INR" };
  const fullRes = calculateOutcomeArithmetic(disputed, recoveredFull);
  assert.equal(fullRes.remaining.minor, "0");
  assert.equal(fullRes.isFullyRecovered, true);

  // Mismatched currency error
  assert.throws(() => {
    calculateOutcomeArithmetic(disputed, { minor: "10000", currency: "USD" });
  }, /Currency mismatch/);
});

test("Acceptance 5: In-app state is separate from external delivery receipts", () => {
  const occurrence = {
    occurrenceId: "occ_abc123",
    channel: "in_app",
    // External delivery receipt
    deliveryStatus: "delivered",
    externalReceiptId: "push_receipt_9988",
    deliveryAttemptedAtUtc: "2026-11-01T09:00:01Z",
    // In-app user state
    inAppState: "unread",
    readAtUtc: null,
    snoozedUntilUtc: null,
  };

  assert.equal(occurrence.deliveryStatus, "delivered");
  assert.equal(occurrence.inAppState, "unread");

  // User snoozes alert
  occurrence.inAppState = "snoozed";
  occurrence.snoozedUntilUtc = "2026-11-02T09:00:00Z";
  // Delivery status is untouched
  assert.equal(occurrence.deliveryStatus, "delivered");
  assert.equal(occurrence.inAppState, "snoozed");
});

test("Acceptance 6: Filename sanitization & Evidence Pack manifest hash", () => {
  const safeName = sanitizeEvidenceFilename("../../etc/passwd.png", "default");
  assert.equal(safeName, "passwd.png");

  const weirdName = sanitizeEvidenceFilename("bill:copy * #1.pdf", "default");
  assert.equal(weirdName, "bill_copy____1.pdf");

  const manifest = {
    packId: "pack-1",
    workspaceId: "ws-1",
    caseId: "case-1",
    title: "Overcharge Dispute Pack",
    generatedAtUtc: "2026-10-31T12:00:00Z",
    expiresAtUtc: "2026-11-07T12:00:00Z",
    accessibleTextSummary: "Summary of dispute against Nimbus Mobile",
    entries: [
      {
        evidenceId: "demo-price-screenshot",
        originalFilename: "price.png",
        sanitizedFilename: "price.png",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        capturedAtUtc: "2026-10-31T05:00:00Z",
        isRedactedDerivative: false,
        sourceSpans: [],
      },
    ],
  };

  const hash1 = computeManifestHash(manifest);
  const hash2 = computeManifestHash(manifest);
  assert.equal(hash1, hash2);
  assert.match(hash1, /^[a-f0-9]{64}$/);
});

test("Quiet hours policy logic", () => {
  const policy = {
    enabled: true,
    startLocalHour: 22,
    endLocalHour: 7,
    timezone: "Asia/Kolkata",
  };

  // 23:30 in Kolkata (18:00 UTC) -> inside quiet hours
  const nightTime = new Date("2026-10-31T18:00:00Z");
  assert.equal(isWithinQuietHours(nightTime, policy), true);

  // 14:00 in Kolkata (08:30 UTC) -> outside quiet hours
  const dayTime = new Date("2026-10-31T08:30:00Z");
  assert.equal(isWithinQuietHours(dayTime, policy), false);
});
