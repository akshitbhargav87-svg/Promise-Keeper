import { validateEnv, AppEnv } from '@promise-keeper/runtime';
import { FeatureRegistry } from '@promise-keeper/contracts';

export * from './dispatch.js';

export interface ServerContext {
  env: AppEnv;
  registry: FeatureRegistry;
  startedAt: string;
}

let serverContext: ServerContext | null = null;

export function getServerContext(): ServerContext {
  if (!serverContext) {
    const env = validateEnv();
    const registry = FeatureRegistry.getInstance();
    serverContext = {
      env,
      registry,
      startedAt: new Date().toISOString(),
    };
  }
  return serverContext;
}
