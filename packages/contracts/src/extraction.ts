import { z } from 'zod';
import { MoneySchema, DeadlineSchema, IDSchema } from './primitives.js';

export const CandidateKindSchema = z.enum([
  'price_lock',
  'subscription_trial',
  'refund_guarantee',
  'cashback_offer',
  'general_promise',
]);

export type CandidateKind = z.infer<typeof CandidateKindSchema>;

export const CandidateSourceSchema = z.object({
  field: z.string(),
  evidenceId: IDSchema,
  assetVersion: z.number().int().min(1),
  spanId: IDSchema,
  excerpt: z.string().optional(),
});

export const ExtractionCandidateSchema = z.object({
  candidateKey: z.string().min(1),
  kind: CandidateKindSchema,
  title: z.string().min(1),
  brandName: z.string().min(1),
  originalWording: z.string().min(1),
  money: MoneySchema.optional(),
  taxContext: z.enum(['inclusive', 'exclusive', 'unspecified']).optional(),
  deadline: DeadlineSchema.optional(),
  conditions: z.array(z.string()).default([]),
  sources: z.array(CandidateSourceSchema).default([]),
  reviewIssues: z.array(z.string()).default([]),
});

export type ExtractionCandidate = z.infer<typeof ExtractionCandidateSchema>;

export const ExtractionResultSchema = z.object({
  schemaVersion: z.literal(1),
  evidenceId: IDSchema,
  language: z.string().default('en'),
  issues: z.array(z.string()).default([]),
  candidates: z.array(ExtractionCandidateSchema),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
