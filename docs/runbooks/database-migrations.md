# Database Schema and Migration Runbook

This runbook defines the database migration contribution workflow, tenant-key conventions, RLS policies, and safe forward/rollback operations for Promise Keeper.

## Architectural Principles

1. **Explicit Multi-Tenancy**: Every user-owned row includes `workspace_id`. Cross-tenant links are prohibited by schema and enforced by composite foreign keys.
2. **Transaction Isolation**: Pooled connections execute with scoped workspace context. Transactions atomically commit domain writes and outbox records together.
3. **Migration Workflow**:
   - Domain owners place migration proposals in their respective area branches.
   - Area A01 reviews, assigns the next contiguous sequence number (e.g. `0002_...`), and runs consolidated migrations.
   - No destructive migrations on startup.
4. **Row-Level Security (RLS)**:
   - Scaffolding enabled on multi-tenant tables (`jobs`, `outbox`, domain entities).
   - Enforced by PostgreSQL session variable `app.current_workspace_id`.

## Migration Operations

Run migrations:
```powershell
npm run --workspace=@promise-keeper/db migrate
```

Rollback strategy:
- Every forward migration must provide an associated down/repair script.
- For emergency recovery: execute the corresponding compensation script and record an audit note.
