import test from "node:test";
import assert from "node:assert/strict";

import {
  projectDeadline,
  calculateBusinessDays,
  adjustForQuietHours,
  scheduleRuleOccurrences,
  replaceFutureOccurrences,
} from "../src/scheduling/projector.ts";
import {
  generateIcsCalendar,
} from "../src/scheduling/ics.ts";
import {
  formatChronologicalList,
  isTargetStale,
} from "../src/scheduling/calendar.ts";

test("T02-Acceptance 1: Business calendar calculation matches scenario.json refund anchor", () => {
  // Anchor 2026-10-26 (Monday), 5 business days, includeStartDay: false
  // Day 1: 27 (Tue), Day 2: 28 (Wed), Day 3: 29 (Thu), Day 4: 30 (Fri), skip 31/01, Day 5: 2026-11-02 (Mon)!
  const projected = calculateBusinessDays("2026-10-26", 5, false, "fixture-mon-fri-no-holidays-v1");
  assert.equal(projected, "2026-11-02", "Must project exactly to Monday Nov 2, 2026");
});

test("T02-Acceptance 2: Unknown date NEVER magically becomes exact", () => {
  const unknownDeadline = {
    raw: "Your price is locked for 12 billing periods",
    precision: "unknown",
    kind: "unknown",
    date: null,
    timezone: "Asia/Kolkata",
    anchor: null,
    count: null,
    calendarId: null,
    includeStartDay: null,
  };

  const projection = projectDeadline(unknownDeadline);
  assert.equal(projection.precision, "unknown");
  assert.equal(projection.targetDateUtc, null);
  assert.equal(projection.isAllDay, false);
});

test("T02-Acceptance 3: Quiet hours adjustment shifts delivery forward", () => {
  const quietPolicy = {
    enabled: true,
    startLocalHour: 22,
    endLocalHour: 7,
    timezone: "Asia/Kolkata",
  };

  // 23:30 local time in Kolkata = 18:00 UTC
  const lateNight = new Date("2026-10-31T18:00:00Z");
  const adjusted = adjustForQuietHours(lateNight, quietPolicy);

  // Next morning in Kolkata when quiet hours end (07:30 local = 02:00 UTC)
  assert.equal(adjusted.toISOString(), "2026-11-01T02:00:00.000Z");
});

test("T02-Acceptance 4: Near deadline prioritizes immediate alert over backfill", () => {
  // Mock clock: Nov 6, 2026 12:00:00 UTC
  const mockNow = new Date("2026-11-06T12:00:00Z");
  const clock = { now: () => mockNow };

  // Trial renewal at Nov 7 04:30 UTC (less than 24h lead time!)
  const rule = {
    id: "rule-trial-01",
    workspaceId: "ws-demo",
    targetType: "subscription",
    targetId: "sub-netflix",
    title: "Netflix free trial ending soon",
    deadline: {
      raw: "Free trial ends on Nov 7",
      precision: "exact",
      kind: "instant",
      date: "2026-11-07T04:30:00Z",
      timezone: "UTC",
      anchor: null,
      count: null,
      calendarId: null,
      includeStartDay: null,
    },
    leadTimeMinutes: 1440, // 24 hours lead time
    channels: ["in_app"],
    quietHours: { enabled: false, startLocalHour: 22, endLocalHour: 7, timezone: "UTC" },
    status: "active",
    createdAtUtc: mockNow.toISOString(),
    updatedAtUtc: mockNow.toISOString(),
    version: 1,
  };

  const occurrences = scheduleRuleOccurrences(rule, clock);
  assert.equal(occurrences.length, 1);
  // Target scheduled time should be immediate (now), not dropped or ignored
  assert.equal(occurrences[0].targetScheduledUtc, mockNow.toISOString());
});

test("T02-Acceptance 5: Revised deadline replaces future occurrences while preserving history", () => {
  const mockNow = new Date("2026-11-01T10:00:00Z");
  const clock = { now: () => mockNow };

  const pastDeliveredOcc = {
    occurrenceId: "occ-past-1",
    workspaceId: "ws-demo",
    ruleId: "rule-1",
    targetId: "target-1",
    targetType: "promise",
    title: "Old reminder",
    targetScheduledUtc: "2026-10-25T09:00:00Z",
    adjustedDeliveryUtc: "2026-10-25T09:00:00Z",
    channel: "in_app",
    deliveryStatus: "delivered",
    inAppState: "read",
    deadlinePrecision: "exact",
  };

  const pendingOldOcc = {
    occurrenceId: "occ-pending-old",
    workspaceId: "ws-demo",
    ruleId: "rule-1",
    targetId: "target-1",
    targetType: "promise",
    title: "Pending old reminder",
    targetScheduledUtc: "2026-11-05T09:00:00Z",
    adjustedDeliveryUtc: "2026-11-05T09:00:00Z",
    channel: "in_app",
    deliveryStatus: "pending",
    inAppState: "unread",
    deadlinePrecision: "exact",
  };

  const newRule = {
    id: "rule-1",
    workspaceId: "ws-demo",
    targetType: "promise",
    targetId: "target-1",
    title: "Revised delivery promise",
    deadline: {
      raw: "Delivery delayed to Nov 15",
      precision: "exact",
      kind: "instant",
      date: "2026-11-15T18:00:00Z",
      timezone: "UTC",
      anchor: null,
      count: null,
      calendarId: null,
      includeStartDay: null,
    },
    leadTimeMinutes: 1440,
    channels: ["in_app"],
    quietHours: { enabled: false, startLocalHour: 22, endLocalHour: 7, timezone: "UTC" },
    status: "active",
    createdAtUtc: mockNow.toISOString(),
    updatedAtUtc: mockNow.toISOString(),
    version: 2,
  };

  const { preservedHistory, newOccurrences } = replaceFutureOccurrences(
    [pastDeliveredOcc, pendingOldOcc],
    newRule,
    clock
  );

  assert.equal(preservedHistory.length, 1);
  assert.equal(preservedHistory[0].occurrenceId, "occ-past-1");
  assert.equal(newOccurrences.length, 1);
  assert.equal(newOccurrences[0].targetScheduledUtc, "2026-11-14T18:00:00.000Z");
});

test("T02-Acceptance 6: RFC 5545 iCalendar correctly differentiates all-day versus timed events", () => {
  const events = [
    {
      id: "ev-timed",
      workspaceId: "ws-1",
      title: "Studio Example Trial Cancellation",
      brandName: "Studio Example",
      description: "Cancel before renewal at INR 499",
      startUtc: "2026-11-06T04:30:00.000Z",
      isAllDay: false,
      precision: "exact",
    },
    {
      id: "ev-allday",
      workspaceId: "ws-1",
      title: "Refund Due: Nimbus Mobile",
      brandName: "Nimbus Mobile",
      description: "5 business days refund window",
      startUtc: "2026-11-02T00:00:00.000Z",
      isAllDay: true,
      precision: "exact",
    },
  ];

  const ics = generateIcsCalendar(events);
  assert.match(ics, /DTSTART:20261106T043000Z/, "Timed event must have instant timestamp");
  assert.match(ics, /DTSTART;VALUE=DATE:20261102/, "All-day event must have VALUE=DATE format");

  // Minimal privacy titles option
  const privateIcs = generateIcsCalendar(events, { minimalPrivacyTitles: true });
  assert.match(privateIcs, /SUMMARY:Promise Deadline \(Studio Example\)/);
});

test("T02-Acceptance 7: Accessible chronological list and JIT stale-target check", () => {
  const events = [
    {
      id: "ev-1",
      workspaceId: "ws-1",
      title: "Airtel Price Lock",
      brandName: "Airtel",
      startUtc: "2026-11-10T00:00:00Z",
      isAllDay: true,
      precision: "estimated",
    },
    {
      id: "ev-2",
      workspaceId: "ws-1",
      title: "Unknown contract",
      brandName: "Gym",
      startUtc: "",
      isAllDay: false,
      precision: "unknown",
    },
  ];

  const list = formatChronologicalList(events, new Date("2026-11-01T00:00:00Z"));
  assert.equal(list.length, 2);
  assert.equal(list[0].precisionBadgeLabel, "Estimated");
  assert.equal(list[1].precisionBadgeLabel, "Unknown Date");

  // JIT stale check
  assert.equal(isTargetStale("resolved"), true);
  assert.equal(isTargetStale("cancelled"), true);
  assert.equal(isTargetStale("active"), false);
});
