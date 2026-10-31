import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { Schema, Either } from 'effect';
import type {
  PromotionInput,
  PromotionCommand,
  PromotionReview,
  PromotionReceipt,
} from '@ergon/evaluation-model';
import type { PromotionClient, PromotionFailure } from './promotion-http';
import {
  parsePromotionReview,
  parsePromotionReceipt,
} from './promotion-schema';
const failure = Schema.Struct({
  kind: Schema.Literal(
    'authentication-required',
    'denied',
    'unavailable',
    'transport',
    'timeout',
    'request-cancelled',
    'invalid-response',
    'unexpected-defect',
    'conflict',
    'invalid-input',
  ),
});
/** Strip port diagnostics at the remote-state boundary. */
export function normalizePromotionFailure(value: unknown): PromotionFailure {
  const result = Schema.decodeUnknownEither(failure)(value);
  return Either.isRight(result) ? result.right : { kind: 'unexpected-defect' };
}
async function execute<T>(
  query: PromotionInput | PromotionCommand,
  api: { extra: unknown; signal: AbortSignal },
  parse: (value: unknown) => T | undefined,
): Promise<{ data: T } | { error: PromotionFailure }> {
  try {
    const extra = api.extra as { promotionClient?: PromotionClient };
    if (!extra?.promotionClient)
      return { error: { kind: 'unexpected-defect' } };
    const result = await extra.promotionClient.read(query, api.signal);
    if (api.signal.aborted) return { error: { kind: 'request-cancelled' } };
    if (!result.ok) return { error: normalizePromotionFailure(result.error) };
    const data = parse(result.value);
    return data === undefined
      ? { error: { kind: 'invalid-response' } }
      : { data };
  } catch {
    return { error: { kind: 'unexpected-defect' } };
  }
}
/** Review is an explicit CSRF POST. Mutations are never automatically retried or shared across disclosure stores. */
export const promotionApi = createApi({
  reducerPath: 'promotionApi',
  baseQuery: fakeBaseQuery<PromotionFailure>(),
  endpoints: (build) => ({
    review: build.mutation<PromotionReview, PromotionInput>({
      queryFn: (input, api) =>
        execute(input, api, (v) => parsePromotionReview(v, input)),
    }),
    confirm: build.mutation<PromotionReceipt, PromotionCommand>({
      queryFn: (command, api) =>
        execute(command, api, (v) => parsePromotionReceipt(v, command)),
    }),
  }),
});
