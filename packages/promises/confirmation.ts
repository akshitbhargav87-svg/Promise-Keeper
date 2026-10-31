import { createPromise, DomainError } from './domain.ts';
import type { Context } from './domain.ts';
import type { AccessPort, CandidateConfirmationHandler, EvidencePort } from './ports.ts';

/** A03 supplies its open transaction. No nested transaction/commit is performed here. */
export function confirmationHandler(deps: {
  access: AccessPort; evidence: EvidencePort;
  context: (principal: Context['principal']) => Context;
}): CandidateConfirmationHandler {
  const categories: CandidateConfirmationHandler['categories'] = ['price_lock', 'refund', 'delivery', 'trial', 'warranty', 'cashback', 'other'];
  return {
    categories,
    async confirm(principal, transaction, candidate, brandId, idempotencyKey, payloadDigest) {
      await deps.access.authorize(principal, 'promises.write');
      if (!candidate.reviewed || !idempotencyKey.trim() || !payloadDigest.trim())
        throw new DomainError('invalid', 'Reviewed candidate and request idempotency metadata required');
      if (!categories.includes(candidate.kind))
        throw new DomainError('invalid', 'Candidate belongs to another category handler');
      return transaction.idempotent(principal, idempotencyKey, payloadDigest, async () => {
        const brand = await transaction.getBrand(principal, brandId);
        if (!brand) throw new DomainError('not_found', 'Brand unavailable');
        const sources = await deps.evidence.resolve(principal, candidate.sources);
        const context = deps.context(principal);
        // Principal is supplied by the server; reject an incorrectly wired context factory.
        if (context.principal.workspaceId !== principal.workspaceId || context.principal.userId !== principal.userId)
          throw new DomainError('not_found', 'Context unavailable');
        const result = createPromise(context, brand, candidate, sources);
        await transaction.save(principal, result, null);
        return { promiseId: result.record.id, version: result.record.version };
      });
    }
  };
}
