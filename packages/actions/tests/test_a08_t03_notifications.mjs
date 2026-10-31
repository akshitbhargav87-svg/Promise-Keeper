import test from "node:test";
import assert from "node:assert/strict";

import { NotificationFeedService } from "../src/notifications/feed.ts";
import {
  LocalDeliverySink,
  buildPrivacySafeEmailContent,
} from "../src/notifications/delivery.ts";

test("T03-Acceptance 1: S19 Filters and day grouping", () => {
  const now = new Date("2026-10-31T12:00:00Z");
  const yesterday = new Date("2026-10-30T10:00:00Z");

  const feed = new NotificationFeedService([
    {
      id: "n-1",
      workspaceId: "ws-1",
      category: "deadlines",
      title: "Free trial ending: Studio Example",
      supportingContext: "Renews at INR 499 on Nov 7",
      exactDateUtc: "2026-11-07T04:30:00Z",
      sourceRecordUrl: "/app/promises/p-1",
      isRead: false,
      readAtUtc: null,
      snoozedUntilUtc: null,
      isDismissed: false,
      createdAtUtc: now.toISOString(),
    },
    {
      id: "n-2",
      workspaceId: "ws-1",
      category: "cases",
      title: "Case update: Nimbus Mobile breach",
      supportingContext: "Overcharge of INR 150 identified",
      exactDateUtc: "2026-11-01T00:00:00Z",
      sourceRecordUrl: "/app/actions/c-1",
      isRead: true,
      readAtUtc: now.toISOString(),
      snoozedUntilUtc: null,
      isDismissed: false,
      createdAtUtc: yesterday.toISOString(),
    },
  ]);

  // All vs unread filters
  assert.equal(feed.list("all", now).length, 2);
  assert.equal(feed.list("unread", now).length, 1);
  assert.equal(feed.list("deadlines", now).length, 1);
  assert.equal(feed.list("cases", now).length, 1);

  // Group by day
  const grouped = feed.groupByDay("all", now);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].dayLabel, "Today");
  assert.equal(grouped[1].dayLabel, "Yesterday");
});

test("T03-Acceptance 2: Reversible bulk mark-as-read", () => {
  const now = new Date("2026-10-31T12:00:00Z");
  const feed = new NotificationFeedService([
    {
      id: "n-1",
      workspaceId: "ws-1",
      category: "deadlines",
      title: "Item 1",
      supportingContext: "",
      exactDateUtc: now.toISOString(),
      sourceRecordUrl: "",
      isRead: false,
      readAtUtc: null,
      snoozedUntilUtc: null,
      isDismissed: false,
      createdAtUtc: now.toISOString(),
    },
    {
      id: "n-2",
      workspaceId: "ws-1",
      category: "deadlines",
      title: "Item 2",
      supportingContext: "",
      exactDateUtc: now.toISOString(),
      sourceRecordUrl: "",
      isRead: false,
      readAtUtc: null,
      snoozedUntilUtc: null,
      isDismissed: false,
      createdAtUtc: now.toISOString(),
    },
  ]);

  assert.equal(feed.list("unread", now).length, 2);

  const markedCount = feed.markAllAsRead("all", now);
  assert.equal(markedCount, 2);
  assert.equal(feed.list("unread", now).length, 0);

  // Reversible within normal use
  const restoredCount = feed.undoBulkMarkAsRead();
  assert.equal(restoredCount, 2);
  assert.equal(feed.list("unread", now).length, 2);
});

test("T03-Acceptance 3: Snooze warning when snooze time nears or exceeds critical deadline", () => {
  const feed = new NotificationFeedService([
    {
      id: "n-critical",
      workspaceId: "ws-1",
      category: "deadlines",
      title: "Cancellation Cutoff",
      supportingContext: "Must cancel by Nov 6 04:30 UTC",
      exactDateUtc: "2026-11-06T04:30:00Z",
      criticalDeadlineUtc: "2026-11-06T04:30:00Z",
      sourceRecordUrl: "",
      isRead: false,
      readAtUtc: null,
      snoozedUntilUtc: null,
      isDismissed: false,
      createdAtUtc: "2026-10-31T12:00:00Z",
    },
  ]);

  // Snoozing PAST the critical deadline produces warning
  const snoozePast = feed.snooze("n-critical", "2026-11-06T05:00:00Z");
  assert.match(snoozePast.criticalDeadlineWarning, /AFTER the critical deadline/);

  // Snoozing within 1 hour before critical deadline produces warning
  const snoozeNear = feed.snooze("n-critical", "2026-11-06T03:30:00Z");
  assert.match(snoozeNear.criticalDeadlineWarning, /within 2 hours/);
});

test("T03-Acceptance 4: Delivery retry deduplication by occurrence + channel", async () => {
  const sink = new LocalDeliverySink();

  const msg = {
    occurrenceId: "occ-dedup-101",
    workspaceId: "ws-1",
    channel: "email",
    recipient: "user@example.com",
    brandName: "Nimbus Mobile",
    title: "Bill mismatch alert",
    deadlineDateStr: "2026-11-02",
    actionUrl: "https://promisekeeper.local/app/actions/case-1",
  };

  const receipt1 = await sink.send(msg);
  assert.equal(receipt1.status, "delivered");
  assert.equal(sink.getSentMessages().length, 1);

  // Re-transmitting exact same occurrence on same channel must be deduplicated
  const receipt2 = await sink.send(msg);
  assert.equal(receipt2.status, "skipped_duplicate");
  assert.equal(sink.getSentMessages().length, 1, "Must not send second email on retry");
});

test("T03-Acceptance 5: Minimal private email content without marketing bundling", () => {
  const email = buildPrivacySafeEmailContent({
    occurrenceId: "occ-priv-1",
    workspaceId: "ws-1",
    channel: "email",
    recipient: "user@example.com",
    brandName: "Nimbus Mobile",
    title: "Refund Deadline",
    deadlineDateStr: "2026-11-02",
    actionUrl: "https://promisekeeper.local/app/actions/c-1",
  });

  // Verify privacy: authenticated link present, no financial documents dumped
  assert.match(email.subject, /Promise Alert: Nimbus Mobile/);
  assert.match(email.bodyText, /https:\/\/promisekeeper\.local\/app\/actions\/c-1/);
  assert.match(email.bodyText, /Functional notification - no promotional content/);
  assert.doesNotMatch(email.bodyHtml, /special offer|buy now|discount|marketing/i);
});
