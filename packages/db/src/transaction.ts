import { ScopedEntity, ScopedRepository } from './repository.js';

export interface OutboxEntry {
  id: string;
  workspaceId: string;
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateVersion: number;
  payload: unknown;
  status: 'pending' | 'published';
  createdAt: string;
}

export class UnitOfWork {
  private rollbackActions: (() => void)[] = [];
  public readonly outbox: ScopedRepository<OutboxEntry & ScopedEntity>;

  constructor(public readonly workspaceId: string) {
    this.outbox = new ScopedRepository<OutboxEntry & ScopedEntity>(workspaceId, 'outbox');
  }

  public registerRollback(action: () => void): void {
    this.rollbackActions.push(action);
  }

  public rollback(): void {
    while (this.rollbackActions.length > 0) {
      const action = this.rollbackActions.pop();
      try {
        action?.();
      } catch (err) {
        console.error('Error during rollback action:', err);
      }
    }
  }
}

export async function withTransaction<T>(
  workspaceId: string,
  operation: (uow: UnitOfWork) => Promise<T>,
): Promise<T> {
  const uow = new UnitOfWork(workspaceId);
  try {
    const result = await operation(uow);
    return result;
  } catch (error) {
    uow.rollback();
    throw error;
  }
}
