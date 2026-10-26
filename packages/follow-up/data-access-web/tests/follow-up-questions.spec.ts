import { describe, expect, it, vi } from 'vitest';
import {
  createFollowUpQuestionsReader,
  type FollowUpQuestionsQuery,
} from '../src';

const id = '11111111-1111-4111-8111-111111111111';
const query: FollowUpQuestionsQuery = {
  tenantId: id,
  workItemId: id,
  caseId: id,
  claimId: id,
  expectedOwnershipRevision: 3,
};
const item = {
  requestId: id,
  caseId: id,
  claimId: id,
  ownershipRevision: 1,
  authorActorId: id,
  question: '  Which workspace? <script>inert</script> 😀\n',
  requestedAt: '2026-10-25T10:00:00Z',
  recordedAt: '2026-10-25T10:00:01.123456Z',
};
const signal = (): AbortSignal => new AbortController().signal;
const answer = {
  responseId: id,
  answer: ' Exact answer 😀 <script>inert</script>\n',
  respondedAt: '2026-10-24T10:00:00.123456789Z',
  recordedAt: '2026-10-25T10:00:02.000000001Z',
};

describe('protected requester-question protocol', () => {
  it.each([null, answer])(
    'preserves a checked optional answer without private fields: %j',
    async (response) => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        Response.json({
          items: [
            {
              ...item,
              response: response && {
                ...response,
                requesterActorId: 'private',
              },
            },
          ],
          truncated: false,
        }),
      );
      expect(
        await createFollowUpQuestionsReader({ fetch })(query, signal()),
      ).toEqual({
        ok: true,
        questions: { items: [{ ...item, response }], truncated: false },
      });
    },
  );
  it.each([
    {},
    false,
    'answer',
    { ...answer, responseId: 'wrong' },
    ...['', ' \u00a0', '\u0000', '\ud800', '😀'.repeat(4001)].map((text) => ({
      ...answer,
      answer: text,
    })),
    { ...answer, respondedAt: '2026-02-30T10:00:00Z' },
    { ...answer, recordedAt: '2026-10-25T24:00:00Z' },
    { ...answer, recordedAt: null },
  ])(
    'rejects supplied malformed answers without turning them into absence: %j',
    async (response) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(
          Response.json({ items: [{ ...item, response }], truncated: false }),
        );
      expect(
        await createFollowUpQuestionsReader({ fetch })(query, signal()),
      ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );
  it('rejects duplicate response identities across otherwise correctly ordered questions', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      Response.json({
        items: [
          {
            ...item,
            requestId: '22222222-2222-4222-8222-222222222222',
            response: answer,
          },
          { ...item, response: answer },
        ],
        truncated: false,
      }),
    );
    expect(
      await createFollowUpQuestionsReader({ fetch })(query, signal()),
    ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
  });
  it('reads exact inert text through an encoded same-origin GET without claim fields on the wire', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json({ items: [item], truncated: false }));
    const result = await createFollowUpQuestionsReader({ fetch })(
      query,
      signal(),
    );
    expect(result).toEqual({
      ok: true,
      questions: { items: [item], truncated: false },
    });
    expect(fetch).toHaveBeenCalledWith(
      `/bff/v1/tenants/${id}/human-follow-ups/${id}/information-requests`,
      expect.objectContaining({
        credentials: 'same-origin',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetch.mock.calls[0]?.[1]).not.toHaveProperty('body');
  });
  it.each([
    {
      items: [{ ...item, caseId: '22222222-2222-4222-8222-222222222222' }],
      truncated: false,
    },
    { items: [{ ...item, ownershipRevision: 4 }], truncated: false },
    {
      items: [{ ...item, ownershipRevision: Number.MAX_SAFE_INTEGER + 1 }],
      truncated: false,
    },
    { items: [item, item], truncated: false },
    {
      items: [
        item,
        { ...item, requestId: '22222222-2222-4222-8222-222222222222' },
      ],
      truncated: false,
    },
    { items: [item], truncated: true },
    { items: Array.from({ length: 101 }, () => item), truncated: false },
    ...[' ', '\u00a0', '\u0000', '\ud800', 'x'.repeat(4001)].map(
      (question) => ({ items: [{ ...item, question }], truncated: false }),
    ),
  ])('rejects malformed or wrongly scoped history %#', async (history) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => Response.json(history));
    expect(
      await createFollowUpQuestionsReader({ fetch })(query, signal()),
    ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('accepts empty authorized history and maps neutral absence without retry', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ items: [], truncated: false }))
      .mockResolvedValueOnce(
        Response.json(
          { type: 'urn:ergon:problem:requester-information-request-not-found' },
          { status: 404 },
        ),
      );
    const read = createFollowUpQuestionsReader({ fetch });
    expect(await read(query, signal())).toEqual({
      ok: true,
      questions: { items: [], truncated: false },
    });
    expect(await read(query, signal())).toEqual({
      ok: false,
      error: { kind: 'not-found' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('preserves descending sub-millisecond order and the explicit 100-item bound', async () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      ...item,
      // Opposing UUID order proves nanoseconds, not Date.parse's rounded milliseconds, decide the ordering.
      requestId: `11111111-1111-4111-8111-${(index + 1).toString(16).padStart(12, '0')}`,
      recordedAt: `2026-10-25T10:00:01.${999999999 - index}Z`,
    }));
    const read = createFollowUpQuestionsReader({
      fetch: vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ items, truncated: true })),
    });
    expect((await read(query, signal())).ok).toBe(true);
  });
});
