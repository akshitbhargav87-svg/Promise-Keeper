export interface OutboxMessage<T = unknown> {
  id: string;
  workspaceId: string;
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateVersion: number;
  payload: T;
  createdAt: Date;
  publishedAt?: Date;
}

export type OutboxConsumer<T = unknown> = (
  msg: OutboxMessage<T>,
) => Promise<void>;

export class OutboxDispatcher {
  private consumers: Map<string, OutboxConsumer> = new Map();
  private processedRecords: Set<string> = new Set(); // `${consumerId}:${eventId}`

  public registerConsumer(consumerId: string, handler: OutboxConsumer): void {
    if (this.consumers.has(consumerId)) {
      throw new Error(`Consumer already registered: ${consumerId}`);
    }
    this.consumers.set(consumerId, handler);
  }

  public async dispatch<T>(msg: OutboxMessage<T>): Promise<{ dispatched: number; skipped: number }> {
    let dispatched = 0;
    let skipped = 0;

    for (const [consumerId, handler] of this.consumers.entries()) {
      const dedupKey = `${consumerId}:${msg.eventId}`;
      if (this.processedRecords.has(dedupKey)) {
        skipped++;
        continue;
      }

      await handler(msg);
      this.processedRecords.add(dedupKey);
      dispatched++;
    }

    return { dispatched, skipped };
  }

  public isProcessed(consumerId: string, eventId: string): boolean {
    return this.processedRecords.has(`${consumerId}:${eventId}`);
  }
}
