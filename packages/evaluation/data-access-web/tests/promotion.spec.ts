import { expect, it, vi } from 'vitest';
import { createPromotionClient } from '../src';
import {
  parsePromotionReview,
  parsePromotionReceipt,
} from '../src/promotion-schema';
const id = '11111111-1111-4111-8111-111111111111';
const artifact = { key: 'contract', revision: 'v1', sha256: 'a'.repeat(64) };
const input = {
  tenantId: id,
  actorId: id,
  contractKey: 'contract',
  reports: [],
  rationale: 'Reviewed evidence',
};
const review = {
  intent: {
    expectedVersion: 1,
    suite: artifact,
    contract: artifact,
    policy: artifact,
    reports: [],
    rationale: input.rationale,
  },
  eligibility: { eligible: true, reasons: [], scenarios: [] },
};
const command = {
  tenantId: id,
  actorId: id,
  commandId: id,
  intent: review.intent,
};
it('requires invocation-local CSRF and sends only exact reviewed command fields', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      Response.json({ headerName: 'X-CSRF-TOKEN', token: 'fresh' }),
    )
    .mockResolvedValueOnce(
      Response.json(
        {
          commandId: id,
          created: true,
          contract: artifact,
          suite: artifact,
          bindingVersion: 1,
          promotedAt: '2026-10-31T09:00:00Z',
        },
        { status: 201 },
      ),
    );
  const result = await createPromotionClient({ fetch }).read(
    command,
    new AbortController().signal,
  );
  expect(result.ok).toBe(true);
  const init = fetch.mock.calls[1]?.[1];
  expect(init?.headers).toEqual(
    expect.objectContaining({ 'X-CSRF-TOKEN': 'fresh' }),
  );
  expect(JSON.parse(String(init?.body))).toEqual({
    schemaVersion: 'ergon.contract-promotion/command/v1',
    ...review.intent,
  });
  expect(String(init?.body)).not.toContain('actorId');
});
it.each([403, 404, 409, 422, 503])(
  'maps confirmation %i without automatic retry',
  async (status) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json({ headerName: 'X-CSRF-TOKEN', token: 'fresh' }),
      )
      .mockResolvedValueOnce(Response.json({ detail: 'PRIVATE' }, { status }));
    const result = await createPromotionClient({ fetch }).read(
      command,
      new AbortController().signal,
    );
    expect(result).toEqual({
      ok: false,
      error: {
        kind:
          status === 403 || status === 404
            ? 'denied'
            : status === 409
              ? 'conflict'
              : status === 422
                ? 'invalid-input'
                : 'unavailable',
      },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  },
);
it('rejects substituted review evidence, rationale and contradictory eligibility', () => {
  expect(
    parsePromotionReview(
      { ...review, intent: { ...review.intent, rationale: 'changed' } },
      input,
    ),
  ).toBeUndefined();
  expect(
    parsePromotionReview(
      {
        ...review,
        eligibility: { ...review.eligibility, reasons: ['MISSING_REPORT'] },
      },
      input,
    ),
  ).toBeUndefined();
  expect(
    parsePromotionReview(
      {
        ...review,
        intent: { ...review.intent, expectedVersion: 9007199254740992 },
      },
      input,
    ),
  ).toBeUndefined();
});
it('refuses mismatched acknowledgement coordinates', () => {
  expect(
    parsePromotionReceipt(
      {
        commandId: id,
        created: true,
        contract: artifact,
        suite: artifact,
        bindingVersion: 2,
        promotedAt: '2026-10-31T09:00:00Z',
      },
      command,
    ),
  ).toBeUndefined();
});
it('denied CSRF never sends a command', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json({}, { status: 403 }));
  expect(
    await createPromotionClient({ fetch }).read(
      command,
      new AbortController().signal,
    ),
  ).toEqual({ ok: false, error: { kind: 'denied' } });
  expect(fetch).toHaveBeenCalledTimes(1);
});
