export interface OutboundMessage {
  occurrenceId: string;
  workspaceId: string;
  channel: "in_app" | "email" | "browser_push";
  recipient: string; // user email or push subscription ID
  brandName: string;
  title: string;
  deadlineDateStr: string;
  actionUrl: string;
  isUrgentQuietHourOverride?: boolean;
}

export interface DeliveryReceipt {
  receiptId: string;
  occurrenceId: string;
  channel: string;
  status: "delivered" | "failed" | "skipped_duplicate" | "blocked_quiet_hours";
  deliveredAtUtc?: string;
  error?: string;
}

export interface UserNotificationPreferences {
  emailOptIn: boolean; // Explicit opt-in required; never bundled with marketing
  browserPushOptIn: boolean;
  deliveryMode: "immediate" | "digest" | "off";
  quietHours: {
    enabled: boolean;
    startHour: number;
    endHour: number;
    timezone: string;
    allowUrgentOverride: boolean; // User choice required for quiet-hour exceptions
  };
}

export interface DeliverySink {
  send(msg: OutboundMessage): Promise<DeliveryReceipt>;
  getSentMessages(): OutboundMessage[];
}

/**
 * Local delivery sink for development and test validation.
 */
export class LocalDeliverySink implements DeliverySink {
  private sent: OutboundMessage[] = [];
  private seenDeliveryKeys = new Set<string>();

  async send(msg: OutboundMessage): Promise<DeliveryReceipt> {
    const dedupKey = `${msg.occurrenceId}:${msg.channel}`;

    // Retry deduplication by occurrence + channel
    if (this.seenDeliveryKeys.has(dedupKey)) {
      return {
        receiptId: `dup_${msg.occurrenceId}`,
        occurrenceId: msg.occurrenceId,
        channel: msg.channel,
        status: "skipped_duplicate",
      };
    }

    this.seenDeliveryKeys.add(dedupKey);
    this.sent.push({ ...msg });

    return {
      receiptId: `rec_${Date.now()}_${msg.occurrenceId}`,
      occurrenceId: msg.occurrenceId,
      channel: msg.channel,
      status: "delivered",
      deliveredAtUtc: new Date().toISOString(),
    };
  }

  getSentMessages(): OutboundMessage[] {
    return [...this.sent];
  }

  clear(): void {
    this.sent = [];
    this.seenDeliveryKeys.clear();
  }
}

/**
 * Builds privacy-conscious email message with minimal sensitive content.
 * Never dumps raw confidential evidence or unredacted financial attachments inline.
 */
export function buildPrivacySafeEmailContent(msg: OutboundMessage): {
  subject: string;
  bodyText: string;
  bodyHtml: string;
} {
  const subject = `Promise Alert: ${msg.brandName} deadline on ${msg.deadlineDateStr}`;
  const bodyText = [
    `Hello,`,
    ``,
    `You have an upcoming commitment regarding ${msg.brandName}.`,
    `Deadline: ${msg.deadlineDateStr}`,
    ``,
    `View details and evidence securely in your private Promise Keeper vault:`,
    `${msg.actionUrl}`,
    ``,
    `---`,
    `To manage notification preferences or quiet hours, visit your account settings.`,
    `Functional notification - no promotional content.`,
  ].join("\n");

  const bodyHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
      <h2>Promise Keeper Notification</h2>
      <p>Upcoming commitment with <strong>${msg.brandName}</strong> on <strong>${msg.deadlineDateStr}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${msg.actionUrl}" style="background-color: #0f172a; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">
          View Secure Evidence in App
        </a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 32px;" />
      <p style="font-size: 12px; color: #64748b;">
        This functional email was sent because you enabled deadline alerts. Strictly operational.
      </p>
    </div>
  `;

  return { subject, bodyText, bodyHtml };
}
