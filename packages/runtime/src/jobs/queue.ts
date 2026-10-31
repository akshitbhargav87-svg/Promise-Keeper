import { Clock, SystemClock } from '../clock.js';

export type JobPriority = 'high' | 'normal' | 'low';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface DurableJob<TPayload = unknown> {
  id: string;
  workspaceId: string;
  jobType: string;
  schemaVersion: number;
  status: JobStatus;
  priority: JobPriority;
  attempt: number;
  maxAttempts: number;
  leaseOwner: string | null;
  leasedUntil: Date | null;
  nextAttemptAt: Date;
  idempotencyKey?: string | null;
  correlationId?: string | null;
  payload: TPayload;
  result?: unknown;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnqueueJobOptions<TPayload> {
  id?: string;
  workspaceId: string;
  jobType: string;
  schemaVersion?: number;
  priority?: JobPriority;
  maxAttempts?: number;
  idempotencyKey?: string;
  correlationId?: string;
  payload: TPayload;
  delayMs?: number;
}

export interface QueueHealthMetrics {
  queued: number;
  running: number;
  succeeded: number;
  failedDeadLetter: number;
  cancelled: number;
  oldestQueuedAgeMs: number;
}

export class DurableJobQueue {
  private jobs: Map<string, DurableJob> = new Map();
  private idempotencyIndex: Map<string, string> = new Map(); // `ws:key` -> jobId

  constructor(private clock: Clock = new SystemClock()) {}

  public enqueue<T>(opts: EnqueueJobOptions<T>): DurableJob<T> {
    if (opts.idempotencyKey) {
      const idxKey = `${opts.workspaceId}:${opts.idempotencyKey}`;
      const existingId = this.idempotencyIndex.get(idxKey);
      if (existingId) {
        const existing = this.jobs.get(existingId);
        if (existing) {
          return structuredClone(existing) as DurableJob<T>;
        }
      }
    }

    const id = opts.id || crypto.randomUUID();
    const now = this.clock.now();
    const nextAttemptAt = opts.delayMs
      ? new Date(now.getTime() + opts.delayMs)
      : now;

    const job: DurableJob<T> = {
      id,
      workspaceId: opts.workspaceId,
      jobType: opts.jobType,
      schemaVersion: opts.schemaVersion ?? 1,
      status: 'queued',
      priority: opts.priority ?? 'normal',
      attempt: 0,
      maxAttempts: opts.maxAttempts ?? 3,
      leaseOwner: null,
      leasedUntil: null,
      nextAttemptAt,
      idempotencyKey: opts.idempotencyKey || null,
      correlationId: opts.correlationId || null,
      payload: opts.payload,
      error: null,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(id, job as DurableJob);
    if (opts.idempotencyKey) {
      this.idempotencyIndex.set(`${opts.workspaceId}:${opts.idempotencyKey}`, id);
    }

    return structuredClone(job);
  }

  public acquireNextJob(workerId: string, leaseDurationMs = 30000): DurableJob | null {
    const now = this.clock.now();
    const priorityWeight: Record<JobPriority, number> = {
      high: 3,
      normal: 2,
      low: 1,
    };

    // Candidate jobs: queued with nextAttemptAt <= now, OR running with expired lease
    const candidates: DurableJob[] = [];
    for (const job of this.jobs.values()) {
      if (job.status === 'queued' && job.nextAttemptAt <= now) {
        candidates.push(job);
      } else if (
        job.status === 'running' &&
        job.leasedUntil &&
        job.leasedUntil < now
      ) {
        // Expired lease recovery
        candidates.push(job);
      }
    }

    if (candidates.length === 0) return null;

    // Sort by priority DESC, then nextAttemptAt ASC
    candidates.sort((a, b) => {
      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (pDiff !== 0) return pDiff;
      return a.nextAttemptAt.getTime() - b.nextAttemptAt.getTime();
    });

    const chosen = candidates[0];
    if (!chosen) return null;

    // Claim lease atomically (simulating FOR UPDATE SKIP LOCKED)
    chosen.status = 'running';
    chosen.leaseOwner = workerId;
    chosen.leasedUntil = new Date(now.getTime() + leaseDurationMs);
    chosen.attempt += 1;
    chosen.updatedAt = now;

    return structuredClone(chosen);
  }

  public heartbeat(jobId: string, workerId: string, extendMs = 30000): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'running' || job.leaseOwner !== workerId) {
      return false;
    }
    const now = this.clock.now();
    job.leasedUntil = new Date(now.getTime() + extendMs);
    job.updatedAt = now;
    return true;
  }

  public completeJob(jobId: string, workerId: string, result?: unknown): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'running' || job.leaseOwner !== workerId) {
      return false;
    }
    const now = this.clock.now();
    job.status = 'succeeded';
    job.result = result;
    job.leaseOwner = null;
    job.leasedUntil = null;
    job.updatedAt = now;
    return true;
  }

  public failJob(
    jobId: string,
    workerId: string,
    error: string,
    retryable = true,
  ): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'running' || job.leaseOwner !== workerId) {
      return false;
    }
    const now = this.clock.now();
    job.error = error;
    job.leaseOwner = null;
    job.leasedUntil = null;
    job.updatedAt = now;

    if (retryable && job.attempt < job.maxAttempts) {
      // Exponential backoff: 2^attempt * 1000ms
      const backoffMs = Math.pow(2, job.attempt) * 1000;
      job.status = 'queued';
      job.nextAttemptAt = new Date(now.getTime() + backoffMs);
    } else {
      // Poison job or exceeded attempts -> Dead Letter failure
      job.status = 'failed';
    }
    return true;
  }

  public cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'succeeded' || job.status === 'cancelled') {
      return false;
    }
    const now = this.clock.now();
    job.status = 'cancelled';
    job.leaseOwner = null;
    job.leasedUntil = null;
    job.updatedAt = now;
    return true;
  }

  public getJob(jobId: string): DurableJob | null {
    const job = this.jobs.get(jobId);
    return job ? structuredClone(job) : null;
  }

  public getHealth(): QueueHealthMetrics {
    const now = this.clock.now();
    let queued = 0;
    let running = 0;
    let succeeded = 0;
    let failedDeadLetter = 0;
    let cancelled = 0;
    let oldestQueuedTime = now.getTime();

    for (const job of this.jobs.values()) {
      switch (job.status) {
        case 'queued':
          queued++;
          if (job.createdAt.getTime() < oldestQueuedTime) {
            oldestQueuedTime = job.createdAt.getTime();
          }
          break;
        case 'running':
          running++;
          break;
        case 'succeeded':
          succeeded++;
          break;
        case 'failed':
          failedDeadLetter++;
          break;
        case 'cancelled':
          cancelled++;
          break;
      }
    }

    return {
      queued,
      running,
      succeeded,
      failedDeadLetter,
      cancelled,
      oldestQueuedAgeMs: queued > 0 ? now.getTime() - oldestQueuedTime : 0,
    };
  }
}
