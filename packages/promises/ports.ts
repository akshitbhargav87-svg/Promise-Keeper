import type { Brand, Change, Comparison, Principal, PromiseRecord, ReviewedCandidate, SourceRef } from './domain.ts';

/** These ports are owned by A05. A01 supplies production adapters, A09 supplies grants. */
export interface AccessPort {
  authorize(principal: Principal, capability: 'promises.read' | 'promises.write' | 'brands.merge', resourceId?: string): Promise<void>;
}
export interface EvidencePort {
  resolve(principal: Principal, sources: readonly SourceRef[]): Promise<readonly { ref: SourceRef; workspaceId: string }[]>;
}
export interface PromiseTransaction {
  getBrand(principal: Principal, id: string): Promise<Brand | null>;
  getPromise(principal: Principal, id: string): Promise<PromiseRecord | null>;
  getComparison(principal: Principal, id: string): Promise<Comparison | null>;
  /** Compare-and-swap plus revision, source links, timeline and outbox INSERT in ONE transaction. */
  save(principal: Principal, change: Change, expectedVersion: number | null): Promise<void>;
  /** Key bound to principal+route+payload digest; changed payload => conflict. */
  idempotent<T>(principal: Principal, key: string, payloadDigest: string, execute: () => Promise<T>): Promise<T>;
}
export interface PromiseRepository {
  transaction<T>(principal: Principal, execute: (transaction: PromiseTransaction) => Promise<T>): Promise<T>;
}
export interface CandidateConfirmationHandler {
  readonly categories: readonly ReviewedCandidate['kind'][];
  /** Called by A03 inside its confirmation transaction, never a shadow candidate database. */
  confirm(principal: Principal, transaction: PromiseTransaction, candidate: ReviewedCandidate,
    brandId: string, idempotencyKey: string, payloadDigest: string): Promise<{ promiseId: string; version: number }>;
}
export interface PromiseSummary {
  id: string; brandId: string; title: string; lifecycle: PromiseRecord['lifecycle'];
  version: number; sourceCount: number; reviewed: boolean;
}
export interface PromiseSummaryPort {
  list(principal: Principal, filter: { brandId?: string; cursor?: string; limit: number }):
    Promise<{ items: readonly PromiseSummary[]; nextCursor: string | null }>;
}
