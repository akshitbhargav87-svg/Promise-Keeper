import type {
  DeadlineContract,
  DatePrecision,
  QuietHoursPolicy,
  ReminderOccurrence,
  ReminderRule,
  DeliveryChannel,
} from "../contracts/reminder.ts";
import { computeDeterministicOccurrenceId, isWithinQuietHours } from "../contracts/reminder.ts";

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export interface ProjectedDeadline {
  targetDateUtc: string | null; // ISO string or null for unknown
  isAllDay: boolean;
  precision: DatePrecision;
  rawWording: string | null;
  explanation: string;
}

/**
 * Projects a deadline contract into a concrete target date/time.
 * Guarantees: unknown dates NEVER magically become exact.
 */
export function projectDeadline(
  deadline: DeadlineContract,
  clock: Clock = new SystemClock()
): ProjectedDeadline {
  if (deadline.precision === "unknown" || !deadline.date && !deadline.anchor) {
    return {
      targetDateUtc: null,
      isAllDay: false,
      precision: "unknown",
      rawWording: deadline.raw,
      explanation: "Deadline date is unknown or unstated in source evidence",
    };
  }

  if (deadline.kind === "instant" && deadline.date) {
    return {
      targetDateUtc: new Date(deadline.date).toISOString(),
      isAllDay: false,
      precision: deadline.precision,
      rawWording: deadline.raw,
      explanation: "Exact timestamp deadline",
    };
  }

  if (deadline.kind === "calendar_date" && deadline.date) {
    // All-day calendar date e.g. YYYY-MM-DD
    const tz = deadline.timezone || "UTC";
    const dateStr = deadline.date.split("T")[0];
    const target = new Date(`${dateStr}T00:00:00Z`);
    return {
      targetDateUtc: target.toISOString(),
      isAllDay: true,
      precision: deadline.precision,
      rawWording: deadline.raw,
      explanation: `All-day deadline on ${dateStr} (${tz})`,
    };
  }

  if (deadline.kind === "business_days" && deadline.anchor && deadline.count !== null) {
    const projectedDateStr = calculateBusinessDays(
      deadline.anchor,
      deadline.count,
      deadline.includeStartDay ?? false,
      deadline.calendarId ?? "standard_mon_fri"
    );
    return {
      targetDateUtc: new Date(`${projectedDateStr}T00:00:00Z`).toISOString(),
      isAllDay: true,
      precision: deadline.precision,
      rawWording: deadline.raw,
      explanation: `${deadline.count} business days after anchor ${deadline.anchor}`,
    };
  }

  if (deadline.kind === "calendar_days" && deadline.anchor && deadline.count !== null) {
    const anchor = new Date(deadline.anchor);
    const offset = (deadline.includeStartDay ? deadline.count - 1 : deadline.count) * 86400000;
    const target = new Date(anchor.getTime() + offset);
    return {
      targetDateUtc: target.toISOString(),
      isAllDay: true,
      precision: deadline.precision,
      rawWording: deadline.raw,
      explanation: `${deadline.count} calendar days after anchor ${deadline.anchor}`,
    };
  }

  return {
    targetDateUtc: deadline.date ? new Date(deadline.date).toISOString() : null,
    isAllDay: false,
    precision: deadline.precision,
    rawWording: deadline.raw,
    explanation: "Fallback projection",
  };
}

/**
 * Calculates business days skipping weekends (Mon-Fri).
 * Explicitly tested against scenario.json refund anchor.
 */
export function calculateBusinessDays(
  anchorDateStr: string,
  count: number,
  includeStartDay: boolean,
  calendarId: string
): string {
  const parts = anchorDateStr.split("-").map(Number);
  const current = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

  let remaining = count;
  if (includeStartDay) {
    // If start day is a business day, count it
    const dayOfWeek = current.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remaining -= 1;
    }
  }

  while (remaining > 0) {
    current.setUTCDate(current.getUTCDate() + 1);
    const dayOfWeek = current.getUTCDay();
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remaining -= 1;
    }
  }

  const y = current.getUTCFullYear();
  const m = String(current.getUTCMonth() + 1).padStart(2, "0");
  const d = String(current.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Adjusts delivery timestamp forward to end of quiet hours if it falls inside quiet hours.
 */
export function adjustForQuietHours(
  targetUtc: Date,
  policy: QuietHoursPolicy
): Date {
  if (!isWithinQuietHours(targetUtc, policy)) {
    return targetUtc;
  }

  // Adjust to next occurrence of endLocalHour
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: policy.timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  });

  // Advance by hours until no longer in quiet hours
  const adjusted = new Date(targetUtc.getTime());
  while (isWithinQuietHours(adjusted, policy)) {
    adjusted.setTime(adjusted.getTime() + 60 * 60 * 1000);
  }
  // Round to start of hour
  adjusted.setUTCMinutes(0, 0, 0);
  return adjusted;
}

/**
 * Schedules occurrences for a reminder rule based on projected deadline.
 * Prioritizes near deadlines over backfill.
 */
export function scheduleRuleOccurrences(
  rule: ReminderRule,
  clock: Clock = new SystemClock()
): ReminderOccurrence[] {
  const projection = projectDeadline(rule.deadline, clock);
  if (!projection.targetDateUtc) {
    // Unknown dates do not get scheduled delivery occurrences, but exist in attention lists
    return [];
  }

  const deadlineTime = new Date(projection.targetDateUtc).getTime();
  const leadTimeMs = (rule.leadTimeMinutes || 1440) * 60 * 1000;
  const scheduledTimeMs = deadlineTime - leadTimeMs;
  const nowMs = clock.now().getTime();

  // If scheduled time is in the past but deadline is still future, schedule immediate urgent alert
  const targetScheduledMs = scheduledTimeMs < nowMs ? nowMs : scheduledTimeMs;
  const targetScheduledDate = new Date(targetScheduledMs);

  const occurrences: ReminderOccurrence[] = [];

  for (const channel of rule.channels) {
    const adjustedDate = adjustForQuietHours(targetScheduledDate, rule.quietHours);
    const occurrenceId = computeDeterministicOccurrenceId(
      rule.workspaceId,
      rule.id,
      targetScheduledDate.toISOString(),
      channel
    );

    occurrences.push({
      occurrenceId,
      workspaceId: rule.workspaceId,
      ruleId: rule.id,
      targetId: rule.targetId,
      targetType: rule.targetType,
      title: rule.title,
      targetScheduledUtc: targetScheduledDate.toISOString(),
      adjustedDeliveryUtc: adjustedDate.toISOString(),
      channel,
      deliveryStatus: "pending",
      inAppState: "unread",
      deadlinePrecision: rule.deadline.precision,
    });
  }

  return occurrences;
}

/**
 * Replaces future pending occurrences when a deadline changes, preserving delivery history.
 */
export function replaceFutureOccurrences(
  existingOccurrences: ReminderOccurrence[],
  newRule: ReminderRule,
  clock: Clock = new SystemClock()
): { preservedHistory: ReminderOccurrence[]; newOccurrences: ReminderOccurrence[] } {
  const nowMs = clock.now().getTime();

  // Preserved history includes delivered, failed, or historical occurrences
  const preservedHistory = existingOccurrences.filter(
    (occ) =>
      occ.deliveryStatus === "delivered" ||
      new Date(occ.adjustedDeliveryUtc).getTime() <= nowMs
  );

  const newOccurrences = scheduleRuleOccurrences(newRule, clock);

  return {
    preservedHistory,
    newOccurrences,
  };
}
