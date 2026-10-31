import { JobDefinition, JobHandlerContext } from '@promise-keeper/contracts';
import { DurableJob, DurableJobQueue } from '@promise-keeper/runtime';

export interface WorkerDependencies {
  queue: DurableJobQueue;
  workerId: string;
}

export class WorkerRegistry {
  private handlers: Map<string, JobDefinition> = new Map();

  public register(jobDef: JobDefinition): void {
    if (this.handlers.has(jobDef.jobType)) {
      throw new Error(`Job type already registered: ${jobDef.jobType}`);
    }
    this.handlers.set(jobDef.jobType, jobDef);
  }

  public getHandler(jobType: string): JobDefinition | undefined {
    return this.handlers.get(jobType);
  }

  public async executeJob(
    job: DurableJob,
    deps: WorkerDependencies,
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const handler = this.handlers.get(job.jobType);

    if (!handler) {
      const err = `Unknown job type: ${job.jobType}`;
      deps.queue.failJob(job.id, deps.workerId, err, false); // Dead-letter immediately
      return { success: false, error: err };
    }

    if (job.schemaVersion > handler.schemaVersion) {
      const err = `Unsupported job schema version: ${job.schemaVersion} (Handler supports <= ${handler.schemaVersion})`;
      deps.queue.failJob(job.id, deps.workerId, err, false); // Dead-letter immediately
      return { success: false, error: err };
    }

    try {
      const ctx: JobHandlerContext = {
        principal: {
          userId: 'system-worker',
          workspaceId: job.workspaceId,
          roles: ['worker'],
          sessionId: `worker-sess-${deps.workerId}`,
        },
        jobRef: {
          jobId: job.id,
          status: 'running',
        },
        correlationId: job.correlationId || crypto.randomUUID(),
      };

      const result = handler.handler
        ? await handler.handler(job.payload, ctx)
        : { executed: true };

      deps.queue.completeJob(job.id, deps.workerId, result);
      return { success: true, result };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      deps.queue.failJob(job.id, deps.workerId, errMsg, true);
      return { success: false, error: errMsg };
    }
  }
}
