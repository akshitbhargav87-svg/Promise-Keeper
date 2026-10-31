import { Principal, JobRef } from './primitives.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteDefinition {
  path: string;
  method: HttpMethod;
  summary: string;
  authRequired: boolean;
  requiredRoles?: string[];
}

export interface FeatureRouteManifest {
  featureId: string;
  routes: RouteDefinition[];
}

export type JobPriority = 'high' | 'normal' | 'low';

export interface JobHandlerContext {
  principal: Principal;
  jobRef: JobRef;
  correlationId: string;
}

export interface JobDefinition<TPayload = unknown, TResult = unknown> {
  jobType: string;
  schemaVersion: number;
  priority: JobPriority;
  maxRetries?: number;
  handler?: (payload: TPayload, ctx: JobHandlerContext) => Promise<TResult>;
}

export interface FeatureJobManifest {
  featureId: string;
  jobs: JobDefinition[];
}

export interface FeatureSchemaContribution {
  featureId: string;
  tableNames: string[];
  migrationFiles: string[];
}

export class FeatureRegistry {
  private static instance: FeatureRegistry;
  private routes: Map<string, RouteDefinition[]> = new Map();
  private jobs: Map<string, JobDefinition> = new Map();
  private schemas: Map<string, FeatureSchemaContribution> = new Map();

  public static getInstance(): FeatureRegistry {
    if (!FeatureRegistry.instance) {
      FeatureRegistry.instance = new FeatureRegistry();
    }
    return FeatureRegistry.instance;
  }

  public registerRoutes(manifest: FeatureRouteManifest): void {
    if (this.routes.has(manifest.featureId)) {
      throw new Error(`Duplicate route registration for feature: ${manifest.featureId}`);
    }
    this.routes.set(manifest.featureId, manifest.routes);
  }

  public registerJobs(manifest: FeatureJobManifest): void {
    for (const job of manifest.jobs) {
      if (this.jobs.has(job.jobType)) {
        throw new Error(`Duplicate job type registration: ${job.jobType}`);
      }
      this.jobs.set(job.jobType, job);
    }
  }

  public registerSchema(contribution: FeatureSchemaContribution): void {
    if (this.schemas.has(contribution.featureId)) {
      throw new Error(`Duplicate schema contribution for feature: ${contribution.featureId}`);
    }
    this.schemas.set(contribution.featureId, contribution);
  }

  public getAllRoutes(): { featureId: string; routes: RouteDefinition[] }[] {
    return Array.from(this.routes.entries()).map(([featureId, routes]) => ({
      featureId,
      routes,
    }));
  }

  public getJob(jobType: string): JobDefinition | undefined {
    return this.jobs.get(jobType);
  }

  public getAllJobs(): JobDefinition[] {
    return Array.from(this.jobs.values());
  }

  public getAllSchemas(): FeatureSchemaContribution[] {
    return Array.from(this.schemas.values());
  }
}
