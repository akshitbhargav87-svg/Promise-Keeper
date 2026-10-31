import { DurableJobQueue } from '../jobs/queue.js';

export interface SanitizedJobStatusResponse {
  jobId: string;
  jobType: string;
  status: string;
  priority: string;
  attempt: number;
  maxAttempts: number;
  result?: unknown;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class JobStatusService {
  constructor(private queue: DurableJobQueue) {}

  public getJobStatus(
    workspaceId: string,
    jobId: string,
  ): SanitizedJobStatusResponse | null {
    const job = this.queue.getJob(jobId);
    if (!job) {
      return null;
    }

    // Strict tenant boundary check: avoid leaking job existence across tenants
    if (job.workspaceId !== workspaceId) {
      return null;
    }

    return {
      jobId: job.id,
      jobType: job.jobType,
      status: job.status,
      priority: job.priority,
      attempt: job.attempt,
      maxAttempts: job.maxAttempts,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
