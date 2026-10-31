import { validateEnv, AppEnv } from '@promise-keeper/runtime';

export interface ServerContext {
  env: AppEnv;
  startedAt: string;
}

let serverContext: ServerContext | null = null;

export function getServerContext(): ServerContext {
  if (!serverContext) {
    const env = validateEnv();
    serverContext = {
      env,
      startedAt: new Date().toISOString(),
    };
  }
  return serverContext;
}
