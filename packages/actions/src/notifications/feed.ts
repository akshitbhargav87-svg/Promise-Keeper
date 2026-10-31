export type NotificationCategory =
  | "all"
  | "unread"
  | "deadlines"
  | "reviews"
  | "connection_health"
  | "cases";

export interface NotificationItem {
  id: string;
  workspaceId: string;
  category: "deadlines" | "reviews" | "connection_health" | "cases";
  title: string;
  supportingContext: string;
  exactDateUtc: string;
  sourceRecordUrl: string;
  ruleId?: string;
  criticalDeadlineUtc?: string;
  isRead: boolean;
  readAtUtc: string | null;
  snoozedUntilUtc: string | null;
  isDismissed: boolean;
  createdAtUtc: string;
}

export interface SnoozeResult {
  item: NotificationItem;
  criticalDeadlineWarning: string | null;
  scope: "alert_only" | "entire_rule";
}

export interface DayGroupedNotifications {
  dayLabel: string; // e.g. "Today", "Yesterday", "2026-10-29"
  items: NotificationItem[];
}

export class NotificationFeedService {
  private items: Map<string, NotificationItem> = new Map();
  private lastBulkMarkedReadIds: string[] = [];

  constructor(initialItems: NotificationItem[] = []) {
    for (const item of initialItems) {
      this.items.set(item.id, { ...item });
    }
  }

  add(item: NotificationItem): void {
    this.items.set(item.id, { ...item });
  }

  get(id: string): NotificationItem | null {
    return this.items.get(id) || null;
  }

  list(filter: NotificationCategory = "all", nowUtc: Date = new Date()): NotificationItem[] {
    const nowMs = nowUtc.getTime();

    return Array.from(this.items.values())
      .filter((item) => {
        if (item.isDismissed) return false;

        // If snoozed, hide until snooze expires
        if (item.snoozedUntilUtc && new Date(item.snoozedUntilUtc).getTime() > nowMs) {
          return false;
        }

        if (filter === "unread") return !item.isRead;
        if (filter === "deadlines") return item.category === "deadlines";
        if (filter === "reviews") return item.category === "reviews";
        if (filter === "connection_health") return item.category === "connection_health";
        if (filter === "cases") return item.category === "cases";
        return true;
      })
      .sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime());
  }

  groupByDay(filter: NotificationCategory = "all", nowUtc: Date = new Date()): DayGroupedNotifications[] {
    const filtered = this.list(filter, nowUtc);
    const groups: Map<string, NotificationItem[]> = new Map();

    const nowDateStr = nowUtc.toISOString().split("T")[0];
    const yesterdayDate = new Date(nowUtc.getTime() - 86400000);
    const yesterdayDateStr = yesterdayDate.toISOString().split("T")[0];

    for (const item of filtered) {
      const itemDateStr = item.createdAtUtc.split("T")[0];
      let label = itemDateStr;
      if (itemDateStr === nowDateStr) label = "Today";
      else if (itemDateStr === yesterdayDateStr) label = "Yesterday";

      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label)!.push(item);
    }

    return Array.from(groups.entries()).map(([dayLabel, items]) => ({
      dayLabel,
      items,
    }));
  }

  markAsRead(id: string, nowUtc: Date = new Date()): boolean {
    const item = this.items.get(id);
    if (!item) return false;
    item.isRead = true;
    item.readAtUtc = nowUtc.toISOString();
    return true;
  }

  markAllAsRead(filter: NotificationCategory = "all", nowUtc: Date = new Date()): number {
    const eligible = this.list(filter, nowUtc).filter((i) => !i.isRead);
    this.lastBulkMarkedReadIds = eligible.map((i) => i.id);

    for (const item of eligible) {
      item.isRead = true;
      item.readAtUtc = nowUtc.toISOString();
    }
    return eligible.length;
  }

  /**
   * Reversible bulk mark as read.
   */
  undoBulkMarkAsRead(): number {
    let count = 0;
    for (const id of this.lastBulkMarkedReadIds) {
      const item = this.items.get(id);
      if (item) {
        item.isRead = false;
        item.readAtUtc = null;
        count++;
      }
    }
    this.lastBulkMarkedReadIds = [];
    return count;
  }

  snooze(
    id: string,
    untilUtc: string,
    scope: "alert_only" | "entire_rule" = "alert_only"
  ): SnoozeResult {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Notification not found: ${id}`);
    }

    item.snoozedUntilUtc = untilUtc;

    let warning: string | null = null;
    if (item.criticalDeadlineUtc) {
      const snoozeMs = new Date(untilUtc).getTime();
      const deadlineMs = new Date(item.criticalDeadlineUtc).getTime();

      if (snoozeMs >= deadlineMs) {
        warning = "Caution: Snooze time is AFTER the critical deadline!";
      } else if (deadlineMs - snoozeMs < 2 * 3600 * 1000) {
        warning = "Warning: Alert is snoozed until within 2 hours of the critical deadline.";
      }
    }

    return {
      item: { ...item },
      criticalDeadlineWarning: warning,
      scope,
    };
  }

  dismiss(id: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;
    item.isDismissed = true;
    return true;
  }
}
