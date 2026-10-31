import { validateEnv } from '@promise-keeper/runtime';
import { WorkerRegistry } from './registry.js';

export * from './registry.js';

export interface WorkerLifecycle {
  running: boolean;
  registry: WorkerRegistry;
  stop: () => Promise<void>;
}

export function createWorker(): WorkerLifecycle {
  const env = validateEnv();
  const registry = new WorkerRegistry();
  let isRunning = true;

  console.log(`[Worker] Initialized with mode: ${env.PROCESSING_MODE}`);

  const stop = async () => {
    if (!isRunning) return;
    isRunning = false;
    console.log('[Worker] Graceful shutdown completed.');
  };

  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());

  return {
    get running() {
      return isRunning;
    },
    registry,
    stop,
  };
}

if (process.argv[1]?.endsWith('worker/dist/index.js') || process.argv[1]?.endsWith('worker/src/index.ts')) {
  createWorker();
}
