export interface CalendarEvent {
  id: string;
  workspaceId: string;
  title: string;
  brandName: string;
  description?: string;
  startUtc: string; // ISO string
  endUtc?: string; // ISO string
  isAllDay: boolean;
  precision: "exact" | "estimated" | "unknown";
  recordUrl?: string;
}

function formatIcsDate(isoString: string): string {
  // Converts ISO string "2026-11-06T04:30:00.000Z" to "20261106T043000Z"
  return isoString.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function formatIcsAllDayDate(isoString: string): string {
  // Converts ISO string to "20261102"
  return isoString.split("T")[0].replace(/-/g, "");
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generates RFC 5545 compliant iCalendar string for user-triggered private calendar export.
 * Correctly distinguishes all-day VALUE=DATE from timezone-aware instant timestamps.
 */
export function generateIcsCalendar(
  events: CalendarEvent[],
  options: { minimalPrivacyTitles?: boolean } = {}
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Promise Keeper//S20 Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    if (event.precision === "unknown") {
      // Unknown dates are excluded from strict calendar timeline
      continue;
    }

    const uid = `pk-${event.workspaceId}-${event.id}@promisekeeper.local`;
    const title = options.minimalPrivacyTitles
      ? `Promise Deadline (${event.brandName})`
      : event.title;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`SUMMARY:${escapeIcsText(title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }
    if (event.recordUrl) {
      lines.push(`URL:${escapeIcsText(event.recordUrl)}`);
    }

    if (event.isAllDay) {
      // RFC 5545 All-day date format: DTSTART;VALUE=DATE:20261102
      const allDayStart = formatIcsAllDayDate(event.startUtc);
      lines.push(`DTSTART;VALUE=DATE:${allDayStart}`);
      // End date for single-day all-day is same or next day
      lines.push(`DTEND;VALUE=DATE:${allDayStart}`);
    } else {
      // Timed instant format: DTSTART:20261106T043000Z
      lines.push(`DTSTART:${formatIcsDate(event.startUtc)}`);
      const endUtc = event.endUtc || new Date(new Date(event.startUtc).getTime() + 3600000).toISOString();
      lines.push(`DTEND:${formatIcsDate(endUtc)}`);
    }

    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
