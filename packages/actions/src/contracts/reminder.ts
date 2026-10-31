import { createHash } from "node:crypto";

export type ID = string;

export type DatePrecision = "exact" | "estimated" | "unknown";
export type DeadlineKind =
  | "calendar_days"
  | "business_days"
  | "calendar_date"
  | "instant"
  | "unknown";

export interface Money {
  minor: string;
  currency: string;
}

export interface DeadlineContract {
  raw: string | null;
  precision: DatePrecision;
  kind: DeadlineKind;
  date: string | null; // ISO YYYY-MM-DD or ISO-8601 UTC
  timezone: string | null;
  anchor: string | null;
  count: number | null;
  calendarId: string | null;
  includeStartDay: boolean | null;
}

export type DeliveryChannel = "in_app" | "email" | "browser_push";

export type InAppNotificationState = "unread" | "read" | "dismissed" | "snoozed";

export type DeliveryReceiptStatus =
  | "pending"
  | "delivered"
  | "failed"
  | "skipped_quiet_hours";

export interface QuietHoursPolicy {
  enabled: boolean;
  startLocalHour: number; // 0-23
  endLocalHour: number; // 0-23
  timezone: string; // IANA timezone e.g. "Asia/Kolkata"
}

export interface ReminderRule {
  id: ID;
  workspaceId: ID;
  targetType: "promise" | "subscription" | "case" | "custom";
  targetId: ID;
  title: string;
  deadline: DeadlineContract;
  leadTimeMinutes: number; // e.g., 1440 for 24h before
  channels: DeliveryChannel[];
  quietHours: QuietHoursPolicy;
  status: "active" | "paused" | "completed" | "cancelled";
  createdAtUtc: string;
  updatedAtUtc: string;
  version: number;
}

export interface ReminderOccurrence {
  /**
   * Deterministic ID computed from (workspaceId, ruleId, targetScheduledUtc, channel).
   * Guarantees worker replay or idempotent re-evaluation does not duplicate occurrences.
   */
  occurrenceId: string;
  workspaceId: ID;
  ruleId: ID;
  targetId: ID;
  targetType: string;
  title: string;
  targetScheduledUtc: string;
  adjustedDeliveryUtc: string;
  channel: DeliveryChannel;
  // External delivery receipt is tracked independently
  deliveryStatus: DeliveryReceiptStatus;
  externalReceiptId?: string | null;
  deliveryAttemptedAtUtc?: string | null;
  failureReason?: string | null;
  // In-app user interaction state is strictly separate from external transport
  inAppState: InAppNotificationState;
  readAtUtc?: string | null;
  snoozedUntilUtc?: string | null;
  dismissedAtUtc?: string | null;
  // Retains deadline precision for UI badges
  deadlinePrecision: DatePrecision;
}

/**
 * Computes deterministic occurrence ID to ensure idempotency.
 */
export function computeDeterministicOccurrenceId(
  workspaceId: string,
  ruleId: string,
  targetScheduledUtc: string,
  channel: DeliveryChannel
): string {
  const payload = `${workspaceId}:${ruleId}:${targetScheduledUtc}:${channel}`;
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 24);
  return `occ_${hash}`;
}

/**
 * Checks if a given UTC timestamp falls inside the user's quiet hours window.
 */
export function isWithinQuietHours(
  utcDate: Date,
  policy: QuietHoursPolicy
): boolean {
  if (!policy.enabled) return false;

  // Format to hour in target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: policy.timezone,
    hour: "numeric",
    hourCycle: "h23",
  });
  const localHour = parseInt(formatter.format(utcDate), 10);

  if (policy.startLocalHour <= policy.endLocalHour) {
    return localHour >= policy.startLocalHour && localHour < policy.endLocalHour;
  }
  // Wraps over midnight (e.g. 22:00 to 07:00)
  return localHour >= policy.startLocalHour || localHour < policy.endLocalHour;
}
