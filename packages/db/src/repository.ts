export interface ScopedEntity {
  id: string;
  workspaceId: string;
  version?: number;
  [key: string]: unknown;
}

export class VersionConflictError extends Error {
  constructor(entityName: string, id: string, expected: number, actual: number) {
    super(
      `Version conflict on ${entityName} with ID ${id}. Expected version: ${expected}, actual: ${actual}`,
    );
    this.name = 'VersionConflictError';
  }
}

export class CrossTenantAccessError extends Error {
  constructor(requestedWorkspace: string, entityWorkspace: string) {
    super(
      `Cross-tenant access violation: operation workspace (${requestedWorkspace}) does not match entity workspace (${entityWorkspace})`,
    );
    this.name = 'CrossTenantAccessError';
  }
}

export class ScopedRepository<T extends ScopedEntity> {
  private storage: Map<string, T> = new Map();

  constructor(
    public readonly workspaceId: string,
    public readonly entityName: string,
  ) {
    if (!workspaceId) {
      throw new Error('ScopedRepository requires a valid non-empty workspaceId');
    }
  }

  public async findById(id: string): Promise<T | null> {
    const item = this.storage.get(id);
    if (!item) return null;
    if (item.workspaceId !== this.workspaceId) {
      // Return null or throw to prevent cross-tenant discovery
      return null;
    }
    return structuredClone(item);
  }

  public async findMany(predicate?: (item: T) => boolean): Promise<T[]> {
    const results: T[] = [];
    for (const item of this.storage.values()) {
      if (item.workspaceId === this.workspaceId) {
        if (!predicate || predicate(item)) {
          results.push(structuredClone(item));
        }
      }
    }
    return results;
  }

  public async insert(data: Omit<T, 'workspaceId'> & { workspaceId?: string }): Promise<T> {
    if (data.workspaceId && data.workspaceId !== this.workspaceId) {
      throw new CrossTenantAccessError(this.workspaceId, data.workspaceId);
    }
    const id = typeof data.id === 'string' && data.id ? data.id : crypto.randomUUID();
    if (this.storage.has(id)) {
      throw new Error(`Duplicate ID violation on ${this.entityName}: ${id}`);
    }
    const record = {
      ...data,
      id,
      workspaceId: this.workspaceId,
      version: data.version ?? 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as T;

    this.storage.set(id, record);
    return structuredClone(record);
  }

  public async update(
    id: string,
    updates: Partial<T>,
    expectedVersion?: number,
  ): Promise<T> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`${this.entityName} with ID ${id} not found in workspace`);
    }

    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new VersionConflictError(
        this.entityName,
        id,
        expectedVersion,
        existing.version ?? 1,
      );
    }

    const nextVersion = (existing.version ?? 1) + 1;
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      workspaceId: this.workspaceId, // Immutable tenant boundary
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };

    this.storage.set(id, updated);
    return structuredClone(updated);
  }

  public async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    return this.storage.delete(id);
  }
}
