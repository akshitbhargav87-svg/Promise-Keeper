import { pgTable, text, timestamp, integer, uuid, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  ownerUserId: uuid('owner_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceUserIdx: uniqueIndex('memberships_workspace_user_idx').on(
      table.workspaceId,
      table.userId,
    ),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('sessions_workspace_idx').on(table.workspaceId),
  }),
);

export const consents = pgTable(
  'consents',
  {
    id: uuid('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    purpose: text('purpose').notNull(),
    scopes: text('scopes').notNull(),
    consentVersion: integer('consent_version').notNull().default(1),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => ({
    workspaceProviderIdx: index('consents_workspace_provider_idx').on(
      table.workspaceId,
      table.provider,
    ),
  }),
);

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    jobType: text('job_type').notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    status: text('status').notNull().default('queued'),
    priority: text('priority').notNull().default('normal'),
    attempt: integer('attempt').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    leaseOwner: text('lease_owner'),
    leasedUntil: timestamp('leased_until', { withTimezone: true }),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
    idempotencyKey: text('idempotency_key'),
    correlationId: text('correlation_id'),
    payload: text('payload').notNull(),
    result: text('result'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('jobs_workspace_idx').on(table.workspaceId),
    statusPriorityIdx: index('jobs_status_priority_idx').on(
      table.status,
      table.priority,
      table.nextAttemptAt,
    ),
    idempotencyIdx: uniqueIndex('jobs_idempotency_idx').on(
      table.workspaceId,
      table.idempotencyKey,
    ),
  }),
);

export const outbox = pgTable(
  'outbox',
  {
    id: uuid('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id').notNull().unique(),
    eventType: text('event_type').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    aggregateVersion: integer('aggregate_version').notNull(),
    payload: text('payload').notNull(),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index('outbox_workspace_idx').on(table.workspaceId),
    statusIdx: index('outbox_status_idx').on(table.status, table.createdAt),
  }),
);
