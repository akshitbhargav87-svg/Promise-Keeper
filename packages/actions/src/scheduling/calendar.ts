import type { CalendarEvent } from "./ics.ts";
import type { DatePrecision } from "../contracts/reminder.ts";

export interface CalendarFilter {
  brandId?: string;
  kind?: string;
  precision?: DatePrecision;
  fromUtc?: string;
  toUtc?: string;
}

export interface AccessibleChronologicalListItem {
  id: string;
  brandName: string;
  title: string;
  kind: string;
  targetDateUtc: string | null;
  displayDateText: string;
  precision: DatePrecision;
  precisionBadgeLabel: "Exact" | "Estimated" | "Unknown Date";
  isOverdue: boolean;
  recordUrl: string;
  rawSourceWording: string | null;
}

/**
 * Transforms calendar events into an accessible chronological list for S20.
 */
export function formatChronologicalList(
  events: CalendarEvent[],
  nowUtc: Date = new Date()
): AccessibleChronologicalListItem[] {
  return events
    .slice()
    .sort((a, b) => {
      // Put known dates in chronological order; unknown dates at the bottom
      if (a.precision === "unknown" && b.precision !== "unknown") return 1;
      if (b.precision === "unknown" && a.precision !== "unknown") return -1;
      return new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime();
    })
    .map((event) => {
      const isUnknown = event.precision === "unknown";
      const eventTime = isUnknown ? 0 : new Date(event.startUtc).getTime();
      const isOverdue = !isUnknown && eventTime < nowUtc.getTime();

      let badgeLabel: "Exact" | "Estimated" | "Unknown Date" = "Exact";
      if (event.precision === "estimated") badgeLabel = "Estimated";
      if (event.precision === "unknown") badgeLabel = "Unknown Date";

      return {
        id: event.id,
        brandName: event.brandName,
        title: event.title,
        kind: event.description || "deadline",
        targetDateUtc: isUnknown ? null : event.startUtc,
        displayDateText: isUnknown
          ? "Unstated date (needs confirmation)"
          : event.startUtc.split("T")[0],
        precision: event.precision,
        precisionBadgeLabel: badgeLabel,
        isOverdue,
        recordUrl: event.recordUrl || `/app/promises/${event.id}`,
        rawSourceWording: null,
      };
    });
}

/**
 * JIT (Just-In-Time) stale target check:
 * Returns true if target has been resolved or cancelled, indicating scheduled reminder should be skipped.
 */
export function isTargetStale(targetStatus: string): boolean {
  const staleStatuses = new Set(["cancelled", "resolved", "dismissed", "deleted"]);
  return staleStatuses.has(targetStatus.toLowerCase());
}
