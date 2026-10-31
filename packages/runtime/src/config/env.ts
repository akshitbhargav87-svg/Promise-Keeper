import { z } from 'zod';

export type EnvProfile = 'development' | 'preview' | 'production' | 'test';

export interface SanitizedFieldError {
  key: string;
  message: string;
}

export class SanitizedEnvError extends Error {
  public readonly fieldErrors: SanitizedFieldError[];

  constructor(fieldErrors: SanitizedFieldError[]) {
    const formatted = fieldErrors
      .map((err) => `  - ${err.key}: ${err.message}`)
      .join('\n');
    super(
      `Environment configuration validation failed:\n${formatted}\n\nHint: Check your .env file or refer to docs/runbooks/local-setup.md for required profile variables.`,
    );
    this.name = 'SanitizedEnvError';
    this.fieldErrors = fieldErrors;
  }
}

export const AppEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'preview', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('3000')
    .refine(
      (val) => {
        const parsed = parseInt(val, 10);
        return !isNaN(parsed) && parsed >= 1 && parsed <= 65535;
      },
      { message: 'PORT must be an integer between 1 and 65535' },
    )
    .transform((val) => parseInt(val, 10)),
  APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  STORAGE_ENDPOINT: z.string().min(1),
  STORAGE_BUCKET: z.string().min(1).default('promise-keeper-evidence'),
  STORAGE_REGION: z.string().default('local'),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  PROCESSING_MODE: z.enum(['synthetic', 'hosted', 'self_hosted']).default('synthetic'),
  GEMMA_API_KEY: z.string().optional(),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

export type AppEnv = z.infer<typeof AppEnvSchema>;

const SAFE_SYNTHETIC_DEFAULTS = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/promise_keeper_dev',
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_ACCESS_KEY: 'minioadmin',
  STORAGE_SECRET_KEY: 'minioadmin',
  SESSION_SECRET: 'dev-synthetic-session-secret-min-32-chars-long!',
};

export function validateEnv(
  rawEnv: Record<string, string | undefined> = process.env,
  profileOverride?: EnvProfile,
): AppEnv {
  const profile: EnvProfile =
    profileOverride || (rawEnv.NODE_ENV as EnvProfile) || 'development';

  const merged: Record<string, string | undefined> = { ...rawEnv, NODE_ENV: profile };

  // For development and test, provide synthetic safe defaults so no real credentials are required
  if (profile === 'development' || profile === 'test') {
    if (!merged.DATABASE_URL) merged.DATABASE_URL = SAFE_SYNTHETIC_DEFAULTS.DATABASE_URL;
    if (!merged.STORAGE_ENDPOINT) merged.STORAGE_ENDPOINT = SAFE_SYNTHETIC_DEFAULTS.STORAGE_ENDPOINT;
    if (!merged.STORAGE_ACCESS_KEY) merged.STORAGE_ACCESS_KEY = SAFE_SYNTHETIC_DEFAULTS.STORAGE_ACCESS_KEY;
    if (!merged.STORAGE_SECRET_KEY) merged.STORAGE_SECRET_KEY = SAFE_SYNTHETIC_DEFAULTS.STORAGE_SECRET_KEY;
    if (!merged.SESSION_SECRET) merged.SESSION_SECRET = SAFE_SYNTHETIC_DEFAULTS.SESSION_SECRET;
  }

  const result = AppEnvSchema.safeParse(merged);

  if (!result.success) {
    const fieldErrors: SanitizedFieldError[] = result.error.errors.map((err) => ({
      key: err.path.join('.'),
      // Sanitize messages so secret values or sensitive tokens in input are never reflected in errors
      message: err.message.replace(/[\r\n\t]/g, ' '),
    }));
    throw new SanitizedEnvError(fieldErrors);
  }

  // Strict profile checks
  if (profile === 'production' || profile === 'preview') {
    const errors: SanitizedFieldError[] = [];
    if (result.data.SESSION_SECRET === SAFE_SYNTHETIC_DEFAULTS.SESSION_SECRET) {
      errors.push({
        key: 'SESSION_SECRET',
        message: 'Must not use synthetic default secret in production/preview profile',
      });
    }
    if (result.data.DATABASE_URL === SAFE_SYNTHETIC_DEFAULTS.DATABASE_URL) {
      errors.push({
        key: 'DATABASE_URL',
        message: 'Must configure a dedicated production/preview database connection string',
      });
    }
    if (errors.length > 0) {
      throw new SanitizedEnvError(errors);
    }
  }

  return result.data;
}

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

export function resetCachedEnv(): void {
  cachedEnv = null;
}
