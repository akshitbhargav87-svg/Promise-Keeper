import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface AppliedMigration {
  id: number;
  name: string;
  appliedAt: string;
  checksum: string;
}

export class MigrationRunner {
  private appliedMigrations: Map<string, AppliedMigration> = new Map();
  private schemaVersion = 0;

  constructor(public readonly migrationsDir: string) {}

  public getApplied(): AppliedMigration[] {
    return Array.from(this.appliedMigrations.values()).sort((a, b) => a.id - b.id);
  }

  public getMigrationFiles(): { name: string; fullPath: string; checksum: string }[] {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }
    const files = fs
      .readdirSync(this.migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    return files.map((file) => {
      const fullPath = path.join(this.migrationsDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      const checksum = crypto.createHash('sha256').update(content).digest('hex');
      return { name: file, fullPath, checksum };
    });
  }

  public async migrate(): Promise<{ appliedCount: number; migrations: string[] }> {
    const files = this.getMigrationFiles();
    const newlyApplied: string[] = [];

    for (const file of files) {
      const { name, checksum } = file;
      const existing = this.appliedMigrations.get(name);

      if (existing) {
        if (existing.checksum !== checksum) {
          throw new Error(
            `Migration checksum mismatch for ${name}. Applied: ${existing.checksum}, Local: ${checksum}. Repair required.`,
          );
        }
        continue;
      }

      // Apply migration
      this.schemaVersion += 1;
      this.appliedMigrations.set(name, {
        id: this.schemaVersion,
        name,
        appliedAt: new Date().toISOString(),
        checksum,
      });
      newlyApplied.push(name);
    }

    return {
      appliedCount: newlyApplied.length,
      migrations: newlyApplied,
    };
  }

  public rollbackLast(): AppliedMigration | null {
    const applied = this.getApplied();
    if (applied.length === 0) return null;
    const last = applied[applied.length - 1];
    if (!last) return null;
    this.appliedMigrations.delete(last.name);
    this.schemaVersion = Math.max(0, this.schemaVersion - 1);
    return last;
  }
}
