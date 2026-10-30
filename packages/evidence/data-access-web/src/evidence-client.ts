import {
  canonicalEvidenceIds,
  validEvidenceId,
  type KnowledgeQuery,
  type ContradictionAssessment,
  type AdjudicationIntent,
  type DocumentaryAdjudication,
  type BundleIntent,
  type DocumentaryBundle,
} from '@ergon/evidence-model';
import {
  parseAssessment,
  parseAdjudication,
  parseBundle,
} from './knowledge-schema';
import { Cause, Effect, Either, Exit, Schema } from 'effect';
import {
  validReviewRationale,
  type EvidenceCursor,
  type EvidenceInspection,
  type EvidencePage,
  type EvidenceQuery,
  type EvidenceReceipt,
  type EvidenceReviewIntent,
  type EvidenceSelection,
} from '@ergon/evidence-model';
import {
  parseInspection,
  parsePage,
  parseReceipt,
  validCursor,
} from './evidence-schema';

export type EvidenceFailure = {
  readonly kind:
    | 'authentication-required'
    | 'denied'
    | 'conflict'
    | 'invalid-input'
    | 'unsupported'
    | 'transport'
    | 'timeout'
    | 'invalid-response'
    | 'unavailable'
    | 'request-cancelled'
    | 'unexpected-defect';
};
export type EvidenceResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: EvidenceFailure };
/** Invocation lifetime includes body decoding and CSRF. No automatic retries. Defects reject outside the safe RTK boundary. */
export interface EvidenceClient {
  assess(
    query: KnowledgeQuery,
    signal: AbortSignal,
  ): Promise<EvidenceResult<ContradictionAssessment>>;
  adjudication(
    query: KnowledgeQuery,
    signal: AbortSignal,
  ): Promise<EvidenceResult<DocumentaryAdjudication>>;
  adjudicate(
    intent: AdjudicationIntent,
    signal: AbortSignal,
  ): Promise<EvidenceResult<DocumentaryAdjudication>>;
  bundle(
    query: KnowledgeQuery,
    signal: AbortSignal,
  ): Promise<EvidenceResult<DocumentaryBundle>>;
  publish(
    intent: BundleIntent,
    signal: AbortSignal,
  ): Promise<EvidenceResult<DocumentaryBundle>>;
  pending(
    query: EvidenceQuery & { readonly cursor: EvidenceCursor | null },
    signal: AbortSignal,
  ): Promise<EvidenceResult<EvidencePage>>;
  inspect(
    query: EvidenceSelection,
    signal: AbortSignal,
  ): Promise<EvidenceResult<EvidenceInspection>>;
  review(
    intent: EvidenceReviewIntent,
    signal: AbortSignal,
  ): Promise<EvidenceResult<EvidenceReceipt>>;
}
const csrf = Schema.Struct({
  headerName: Schema.Literal('X-CSRF-TOKEN'),
  token: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(4096),
    Schema.pattern(/^[^\r\n]+$/u),
  ),
});
const safeKinds = Schema.Struct({
  kind: Schema.Literal(
    'authentication-required',
    'denied',
    'conflict',
    'invalid-input',
    'unsupported',
    'transport',
    'timeout',
    'invalid-response',
    'unavailable',
    'request-cancelled',
    'unexpected-defect',
  ),
});
/** Discards bodies, diagnostics and proof fields before Redux/logging can retain them. */
export function normalizeEvidenceFailure(value: unknown): EvidenceFailure {
  const decoded = Schema.decodeUnknownEither(safeKinds)(value);
  return Either.isRight(decoded)
    ? decoded.right
    : { kind: 'unexpected-defect' };
}
function validQuery(q: EvidenceQuery): boolean {
  return (
    Schema.is(Schema.UUID)(q.tenantId) && Schema.is(Schema.UUID)(q.actorId)
  );
}
function validSelection(q: EvidenceSelection): boolean {
  return (
    validQuery(q) &&
    ['CLAIM', 'PROCEDURE'].includes(q.proposal.kind) &&
    Schema.is(Schema.UUID)(q.proposal.id) &&
    Schema.is(Schema.UUID)(q.proposal.extractionId)
  );
}
function base(query: EvidenceQuery): string {
  return (
    '/bff/v1/tenants/' +
    encodeURIComponent(query.tenantId) +
    '/evidence-proposals'
  );
}
function failure(status: number): EvidenceFailure {
  return {
    kind:
      status === 401
        ? 'authentication-required'
        : status === 403 || status === 404
          ? 'denied'
          : status === 409
            ? 'conflict'
            : status === 413 || status === 422
              ? 'invalid-input'
              : status >= 500
                ? 'unavailable'
                : 'unsupported',
  };
}
/** Per-document supplied transport. Requests are same-origin/no-store, bounded to 5s and 2 MiB; token is never cached. */
export function createEvidenceClient({
  fetch,
  requestTimeout = 5000,
}: {
  readonly fetch: typeof globalThis.fetch;
  readonly requestTimeout?: number;
}): EvidenceClient {
  async function invoke<T>(
    signal: AbortSignal,
    work: (
      request: (
        url: string,
        init?: RequestInit,
      ) => Effect.Effect<unknown, EvidenceFailure>,
    ) => Effect.Effect<T, EvidenceFailure>,
  ): Promise<EvidenceResult<T>> {
    const owned = new AbortController();
    const request = (
      url: string,
      init: RequestInit = {},
    ): Effect.Effect<unknown, EvidenceFailure> =>
      Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: (stage) =>
            fetch(url, {
              ...init,
              credentials: 'same-origin',
              cache: 'no-store',
              headers: { Accept: 'application/json', ...init.headers },
              signal: AbortSignal.any([stage, owned.signal]),
            }),
          catch: (): EvidenceFailure => ({ kind: 'transport' }),
        });
        if (!response.ok) {
          void response.body?.cancel().catch(() => undefined);
          return yield* Effect.fail(failure(response.status));
        }
        if (
          response.status !== 200 &&
          !(init.method === 'POST' && response.status === 201)
        )
          return yield* Effect.fail<EvidenceFailure>({
            kind: 'invalid-response',
          });
        return yield* Effect.tryPromise({
          try: async (): Promise<unknown> => {
            if (response.body === null) throw new Error('Missing body');
            const reader = response.body.getReader();
            const cancel = (): void => {
              void reader.cancel().catch(() => undefined);
            };
            owned.signal.addEventListener('abort', cancel, { once: true });
            const decoder = new TextDecoder('utf-8', { fatal: true });
            let size = 0;
            let text = '';
            try {
              while (true) {
                const chunk = await reader.read();
                if (chunk.done) break;
                size += chunk.value.byteLength;
                if (size > 2_097_152) throw new Error('Response limit');
                text += decoder.decode(chunk.value, { stream: true });
              }
              return JSON.parse(text + decoder.decode()) as unknown;
            } finally {
              owned.signal.removeEventListener('abort', cancel);
              cancel();
            }
          },
          catch: (): EvidenceFailure => ({ kind: 'invalid-response' }),
        });
      });
    try {
      const result = await Effect.runPromiseExit(
        Effect.either(
          work(request).pipe(
            Effect.timeoutFail({
              duration: requestTimeout,
              onTimeout: (): EvidenceFailure => ({ kind: 'timeout' }),
            }),
          ),
        ),
        { signal },
      );
      if (Exit.isFailure(result)) {
        if (Cause.isInterruptedOnly(result.cause))
          return { ok: false, error: { kind: 'request-cancelled' } };
        throw new Error('Evidence boundary defect');
      }
      if (signal.aborted)
        return { ok: false, error: { kind: 'request-cancelled' } };
      return Either.match(result.value, {
        onLeft: (error) => ({ ok: false as const, error }),
        onRight: (value) => ({ ok: true as const, value }),
      });
    } finally {
      owned.abort();
    }
  }
  function decoded<T>(value: T | undefined): Effect.Effect<T, EvidenceFailure> {
    return value === undefined
      ? Effect.fail({ kind: 'invalid-response' })
      : Effect.succeed(value);
  }
  function knowledgeBase(q: EvidenceQuery): string {
    return '/bff/v1/tenants/' + encodeURIComponent(q.tenantId);
  }
  function validKnowledge(q: KnowledgeQuery): boolean {
    return validQuery(q) && validEvidenceId(q.id);
  }
  function readKnowledge<T>(
    q: KnowledgeQuery,
    signal: AbortSignal,
    path: string,
    parse: (value: unknown) => T | undefined,
  ): Promise<EvidenceResult<T>> {
    if (!validKnowledge(q))
      return Promise.resolve({
        ok: false,
        error: { kind: 'unexpected-defect' },
      });
    return invoke(signal, (request) =>
      Effect.gen(function* () {
        return yield* decoded(parse(yield* request(knowledgeBase(q) + path)));
      }),
    );
  }
  function writeKnowledge<T>(
    q: KnowledgeQuery,
    signal: AbortSignal,
    path: string,
    body: unknown,
    parse: (value: unknown) => T | undefined,
  ): Promise<EvidenceResult<T>> {
    return invoke(signal, (request) =>
      Effect.gen(function* () {
        const token = Schema.decodeUnknownEither(csrf)(
          yield* request('/bff/v1/csrf'),
        );
        if (Either.isLeft(token))
          return yield* Effect.fail<EvidenceFailure>({
            kind: 'invalid-response',
          });
        return yield* decoded(
          parse(
            yield* request(knowledgeBase(q) + path, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                [token.right.headerName]: token.right.token,
              },
              body: JSON.stringify(body),
            }),
          ),
        );
      }),
    );
  }
  return {
    assess(q, signal) {
      return readKnowledge(
        q,
        signal,
        '/documentary-contradictions/claims/' + q.id,
        (v) => parseAssessment(v, q.id),
      );
    },
    adjudication(q, signal) {
      return readKnowledge(
        q,
        signal,
        '/documentary-contradictions/adjudications/' + q.id,
        (v) => parseAdjudication(v, q),
      );
    },
    bundle(q, signal) {
      return readKnowledge(q, signal, '/evidence-bundles/' + q.id, (v) =>
        parseBundle(v, q),
      );
    },
    async adjudicate(q, signal) {
      if (
        !validKnowledge(q) ||
        !canonicalEvidenceIds(q.candidateIds) ||
        q.candidateIds.length < 2 ||
        q.candidateIds.length > 20 ||
        !q.candidateIds.includes(q.anchorId) ||
        !Number.isSafeInteger(q.expectedRevision) ||
        q.expectedRevision < 1 ||
        !validReviewRationale(q.rationale) ||
        !['PREFER_CLAIM', 'DEFER'].includes(q.choice) ||
        (q.choice === 'PREFER_CLAIM') !== (q.selectedClaimId !== null) ||
        (q.selectedClaimId !== null &&
          !q.candidateIds.includes(q.selectedClaimId))
      )
        return { ok: false, error: { kind: 'unexpected-defect' } };
      const {
        anchorId,
        expectedRevision,
        candidateIds,
        choice,
        selectedClaimId,
        rationale,
      } = q;
      return writeKnowledge(
        q,
        signal,
        '/documentary-contradictions/adjudications/' + q.id,
        {
          anchorId,
          expectedRevision,
          candidateIds,
          choice,
          selectedClaimId,
          rationale,
        },
        (v) => parseAdjudication(v, q, q),
      );
    },
    async publish(q, signal) {
      if (
        !validKnowledge(q) ||
        !canonicalEvidenceIds(q.claims) ||
        !canonicalEvidenceIds(q.procedures) ||
        q.claims.length + q.procedures.length < 1 ||
        q.claims.length + q.procedures.length > 20 ||
        q.claimSets.length > q.claims.length ||
        !canonicalEvidenceIds(q.claimSets.map((s) => s.anchorId)) ||
        q.claimSets.some(
          (s) =>
            !Number.isSafeInteger(s.revision) ||
            s.revision < 1 ||
            !canonicalEvidenceIds(s.candidateIds) ||
            s.candidateIds.length > 20 ||
            !s.candidateIds.includes(s.anchorId) ||
            (s.adjudicationId !== null && !validEvidenceId(s.adjudicationId)),
        )
      )
        return { ok: false, error: { kind: 'unexpected-defect' } };
      return writeKnowledge(
        q,
        signal,
        '/evidence-bundles/' + q.id,
        { claims: q.claims, procedures: q.procedures, claimSets: q.claimSets },
        (v) => parseBundle(v, q, q),
      );
    },
    async pending(query, signal) {
      if (!validQuery(query) || !validCursor(query.cursor))
        return { ok: false, error: { kind: 'unexpected-defect' } };
      const params = new URLSearchParams({
        limit: '20',
        ...(query.cursor ?? {}),
      });
      return invoke(signal, (request) =>
        Effect.gen(function* () {
          return yield* decoded(
            parsePage(
              yield* request(base(query) + '/pending?' + params),
              query.cursor,
            ),
          );
        }),
      );
    },
    async inspect(query, signal) {
      if (!validSelection(query))
        return { ok: false, error: { kind: 'unexpected-defect' } };
      return invoke(signal, (request) =>
        Effect.gen(function* () {
          return yield* decoded(
            parseInspection(
              yield* request(
                base(query) +
                  '/' +
                  query.proposal.kind +
                  '/' +
                  query.proposal.id +
                  '/review',
              ),
              query,
            ),
          );
        }),
      );
    },
    async review(intent, signal) {
      if (
        !validSelection(intent) ||
        !Schema.is(Schema.UUID)(intent.commandId) ||
        intent.expectedVersion !== 0 ||
        intent.extractionId !== intent.proposal.extractionId ||
        !['ACCEPTED', 'REJECTED'].includes(intent.decision) ||
        !validReviewRationale(intent.rationale)
      ) {
        return { ok: false, error: { kind: 'unexpected-defect' } };
      }
      return invoke(signal, (request) =>
        Effect.gen(function* () {
          const token = Schema.decodeUnknownEither(csrf)(
            yield* request('/bff/v1/csrf'),
          );
          if (Either.isLeft(token))
            return yield* Effect.fail<EvidenceFailure>({
              kind: 'invalid-response',
            });
          const result = yield* request(
            base(intent) +
              '/' +
              intent.proposal.kind +
              '/' +
              intent.proposal.id +
              '/reviews/' +
              intent.commandId,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                [token.right.headerName]: token.right.token,
              },
              body: JSON.stringify({
                extractionId: intent.extractionId,
                expectedVersion: intent.expectedVersion,
                decision: intent.decision,
                rationale: intent.rationale,
              }),
            },
          );
          return yield* decoded(parseReceipt(result, intent));
        }),
      );
    },
  };
}
