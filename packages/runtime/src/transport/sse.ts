export interface SSEEvent<T = unknown> {
  id: number;
  event: string;
  data: T;
}

export class SSEStreamBuffer {
  private events: SSEEvent[] = [];
  private currentId = 0;

  public emit<T>(eventType: string, data: T): SSEEvent<T> {
    this.currentId += 1;
    // Deep clone and sanitize data so tokens/credentials are stripped
    const sanitized = this.sanitize(data);
    const sseEvent: SSEEvent<T> = {
      id: this.currentId,
      event: eventType,
      data: sanitized as T,
    };
    this.events.push(sseEvent as SSEEvent);
    return sseEvent;
  }

  public getEventsSince(lastEventId: number): SSEEvent[] {
    return this.events.filter((e) => e.id > lastEventId);
  }

  public getAllEvents(): SSEEvent[] {
    return [...this.events];
  }

  public formatEvent(e: SSEEvent): string {
    return `id: ${e.id}\nevent: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`;
  }

  private sanitize(input: unknown): unknown {
    if (!input || typeof input !== 'object') {
      return input;
    }
    if (Array.isArray(input)) {
      return input.map((item) => this.sanitize(item));
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('secret') ||
        lower.includes('token') ||
        lower.includes('password') ||
        lower.includes('key')
      ) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = this.sanitize(value);
      }
    }
    return result;
  }
}
