import { z } from 'zod';
import { ID, IDSchema } from './primitives.js';

export interface DomainEvent<T = unknown> {
  eventId: ID;
  eventType: string;
  schemaVersion: 1;
  workspaceId: ID;
  aggregateId: ID;
  aggregateVersion: number;
  occurredAt: string; // ISO-8601 UTC string ending in Z
  recordedAt: string; // ISO-8601 UTC string ending in Z
  correlationId: ID;
  payload: T;
}

export const DomainEventSchema = z.object({
  eventId: IDSchema,
  eventType: z.string().min(1),
  schemaVersion: z.literal(1),
  workspaceId: IDSchema,
  aggregateId: IDSchema,
  aggregateVersion: z.number().int().min(1),
  occurredAt: z.string().datetime({ offset: false }),
  recordedAt: z.string().datetime({ offset: false }),
  correlationId: IDSchema,
  payload: z.unknown(),
});

export const STANDARD_EVENT_TYPES = [
  'evidence.ready.v1',
  'candidate.extracted.v1',
  'candidate.confirmed.v1',
  'promise.changed.v1',
  'comparison.ready.v1',
  'subscription.changed.v1',
  'offer.changed.v1',
  'connection.state_changed.v1',
  'reminder.due.v1',
  'case.changed.v1',
  'privacy.deletion_scheduled.v1',
] as const;

export type StandardEventType = (typeof STANDARD_EVENT_TYPES)[number];
