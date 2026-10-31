import { validateEnv } from '@promise-keeper/runtime';

export interface WorkerLifecycle {
  running: boolean;
  registeredJobTypes: string[];
  stop: () => Promise<void>;
}

export function createWorker(): WorkerLifecycle {
  const env = validateEnv();
  const registeredJobTypes: string[] = [];
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
    registeredJobTypes,
    stop,
  };
}

// Direct execution entry point
if (process.argv[1]?.endsWith('worker/dist/index.js') || process.argv[1]?.endsWith('worker/src/index.ts')) {
  createWorker();
}
