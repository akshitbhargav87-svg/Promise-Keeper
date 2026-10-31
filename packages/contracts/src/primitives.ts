import { z } from 'zod';

export type ID = string;
export const IDSchema = z.string().min(1);

export interface Money {
  minor: string; // Integer string representation of minor currency units (e.g. "19900" for 199.00 or "199")
  currency: string; // ISO 4217 currency code (e.g. "INR", "USD", "EUR")
}

export const MoneySchema = z.object({
  minor: z
    .string()
    .regex(/^-?\d+$/, 'Money minor must be an integer string, optionally negative'),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter ISO 4217 code')
    .toUpperCase(),
});

export const CURRENCY_EXPONENTS: Record<string, number> = {
  INR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  KWD: 3,
  BHD: 3,
  OMR: 3,
};

export function getCurrencyExponent(currency: string): number {
  return CURRENCY_EXPONENTS[currency.toUpperCase()] ?? 2;
}

export function parseMoney(minorStr: string, currency: string): Money {
  const parsed = MoneySchema.parse({ minor: minorStr, currency });
  return parsed;
}

export function formatMoney(money: Money): string {
  const exp = getCurrencyExponent(money.currency);
  const minorBig = BigInt(money.minor);
  const isNegative = minorBig < 0n;
  const absBig = isNegative ? -minorBig : minorBig;
  const absStr = absBig.toString();

  if (exp === 0) {
    return `${isNegative ? '-' : ''}${money.currency} ${absStr}`;
  }

  const padded = absStr.padStart(exp + 1, '0');
  const integerPart = padded.slice(0, -exp);
  const fractionPart = padded.slice(-exp);

  return `${isNegative ? '-' : ''}${money.currency} ${integerPart}.${fractionPart}`;
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies: ${a.currency} and ${b.currency}`);
  }
  const result = (BigInt(a.minor) + BigInt(b.minor)).toString();
  return { minor: result, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract different currencies: ${a.currency} and ${b.currency}`);
  }
  const result = (BigInt(a.minor) - BigInt(b.minor)).toString();
  return { minor: result, currency: a.currency };
}

export function compareMoney(a: Money, b: Money): number {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot compare different currencies: ${a.currency} and ${b.currency}`);
  }
  const diff = BigInt(a.minor) - BigInt(b.minor);
  return diff < 0n ? -1 : diff > 0n ? 1 : 0;
}

export interface Principal {
  userId: ID;
  workspaceId: ID;
  roles: string[];
  sessionId: ID;
}

export const PrincipalSchema = z.object({
  userId: IDSchema,
  workspaceId: IDSchema,
  roles: z.array(z.string()),
  sessionId: IDSchema,
});

export type DatePrecision = 'exact' | 'estimated' | 'unknown';
export const DatePrecisionSchema = z.enum(['exact', 'estimated', 'unknown']);

export interface SourceRef {
  evidenceId: ID;
  assetVersion: number;
  spanId: ID;
}

export const SourceRefSchema = z.object({
  evidenceId: IDSchema,
  assetVersion: z.number().int().min(1),
  spanId: IDSchema,
});

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

export function createPageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    total: z.number().int().min(0).optional(),
  });
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId: ID;
    retryable: boolean;
    fieldErrors?: Record<string, string>;
  };
}

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: IDSchema,
    retryable: z.boolean(),
    fieldErrors: z.record(z.string()).optional(),
  }),
});

export interface JobRef {
  jobId: ID;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
}

export const JobRefSchema = z.object({
  jobId: IDSchema,
  status: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled']),
});

export interface Deadline {
  raw: string | null;
  precision: DatePrecision;
  kind: 'calendar' | 'business_days' | 'unknown';
  date: string | null; // ISO-8601 UTC string or YYYY-MM-DD
  timezone: string;
  anchor: string | null;
  count: number | null;
  calendarId: string | null;
  includeStartDay: boolean | null;
}

export const DeadlineSchema = z.object({
  raw: z.string().nullable(),
  precision: DatePrecisionSchema,
  kind: z.enum(['calendar', 'business_days', 'unknown']),
  date: z.string().nullable(),
  timezone: z.string().default('UTC'),
  anchor: z.string().nullable(),
  count: z.number().int().nullable(),
  calendarId: z.string().nullable(),
  includeStartDay: z.boolean().nullable(),
});

export interface IdempotencyScope {
  principalId: ID;
  workspaceId: ID;
  route: string;
  payloadHash: string;
}

export const IdempotencyScopeSchema = z.object({
  principalId: IDSchema,
  workspaceId: IDSchema,
  route: z.string(),
  payloadHash: z.string().min(1),
});

