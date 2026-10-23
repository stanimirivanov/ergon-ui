import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { createHumanFollowUpBffAdapter, followUpNotesApi } from '../src';
import { normalizeFollowUpNoteFailure } from '../src/client/normalize-human-follow-up-failures';
import { TENANT_ID, WORK_ITEM_ID } from './follow-up-fixtures';

const query = {
  tenantId: TENANT_ID,
  workItemId: WORK_ITEM_ID,
  claimId: '77777777-7777-4777-8777-777777777777',
  expectedOwnershipRevision: 1,
};
const command = {
  ...query,
  noteId: '88888888-8888-4888-8888-888888888888',
  text: '  Inspect <script>not executable</script> 😀\n',
};
const note = {
  noteId: command.noteId,
  claimId: command.claimId,
  ownershipRevision: 1,
  authorActorId: '99999999-9999-4999-8999-999999999999',
  text: command.text,
  authoredAt: '2026-10-23T12:00:00Z',
  recordedAt: '2026-10-23T12:00:01Z',
};
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'test-only-token' };
const signal = () => new AbortController().signal;

describe('owner-scoped notes protocol', () => {
  it('rejects duplicate UUID values even when their spelling and timestamps differ', async () => {
    const identity = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const items = [
      {
        ...note,
        noteId: identity.toUpperCase(),
        recordedAt: '2026-10-23T12:00:02Z',
      },
      { ...note, noteId: identity },
    ];
    const client = createHumanFollowUpBffAdapter({
      fetch: vi
        .fn()
        .mockResolvedValue(Response.json({ items, truncated: false })),
    });
    expect(await client.listNotes(query, signal())).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });
  it('accepts an exactly bounded truncated history with stable UUID tie ordering', async () => {
    const history = {
      items: Array.from({ length: 100 }, (_, index) => ({
        ...note,
        noteId: `88888888-8888-4888-8888-${(100 - index).toString(16).padStart(12, '0')}`,
      })),
      truncated: true,
    };
    const client = createHumanFollowUpBffAdapter({
      fetch: vi.fn().mockResolvedValue(Response.json(history)),
    });
    expect(await client.listNotes(query, signal())).toEqual({
      ok: true,
      notes: history,
    });
  });
  it.each([200, 201])(
    'posts the exact intent with CSRF and accepts receipt status %s',
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(Response.json(csrf))
        .mockResolvedValueOnce(Response.json(note, { status }));
      const client = createHumanFollowUpBffAdapter({ fetch });
      expect(await client.appendNote(command, signal())).toEqual({
        ok: true,
        note,
      });
      const [url, init] = fetch.mock.calls[1] ?? [];
      expect(url).toBe(
        `/bff/v1/tenants/${TENANT_ID}/human-follow-ups/${WORK_ITEM_ID}/notes`,
      );
      expect(init?.credentials).toBe('same-origin');
      expect(init?.headers).toMatchObject({ 'X-CSRF-TOKEN': csrf.token });
      expect(JSON.parse(String(init?.body))).toEqual({
        noteId: command.noteId,
        claimId: command.claimId,
        expectedOwnershipRevision: 1,
        text: command.text,
      });
    },
  );
  it.each([
    'noteId',
    'claimId',
    'ownershipRevision',
    'text',
    'authorActorId',
    'recordedAt',
  ] as const)('rejects a mismatched or malformed %s', async (field) => {
    const value =
      field === 'ownershipRevision'
        ? 3
        : field === 'text'
          ? 'changed'
          : 'invalid';
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockResolvedValueOnce(
        Response.json({ ...note, [field]: value }, { status: 201 }),
      );
    expect(
      await createHumanFollowUpBffAdapter({ fetch }).appendNote(
        command,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
  });
  it('never retries a failed POST and explicit replay uses a fresh rejected CSRF token', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockResolvedValueOnce(
        Response.json(
          { type: 'urn:ergon:problem:invalid-browser-csrf-token' },
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ ...csrf, token: 'fresh-test-token' }),
      )
      .mockResolvedValueOnce(Response.json(note));
    const client = createHumanFollowUpBffAdapter({ fetch });
    expect(await client.appendNote(command, signal())).toEqual({
      ok: false,
      error: { kind: 'csrf-rejected' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await client.appendNote(command, signal())).toEqual({
      ok: true,
      note,
    });
    expect(fetch.mock.calls[1]?.[1]?.body).toBe(fetch.mock.calls[3]?.[1]?.body);
  });
  it('does not replay transport-uncertain writes', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockRejectedValueOnce(new Error('private cause'));
    expect(
      await createHumanFollowUpBffAdapter({ fetch }).appendNote(
        command,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'transport' } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each([
    [404, 'human-follow-up-notes-not-found', 'not-found'],
    [409, 'human-follow-up-note-conflict', 'note-conflict'],
    [400, 'invalid-human-follow-up-note', 'invalid-note'],
  ])('maps stable failure %s', async (status, type, kind) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockResolvedValueOnce(
        Response.json(
          { type: `urn:ergon:problem:${type}` },
          { status: Number(status) },
        ),
      );
    expect(
      await createHumanFollowUpBffAdapter({ fetch }).appendNote(
        command,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind } });
  });
  it('validates history bounds, order, uniqueness and truncation', async () => {
    for (const history of [
      { items: [note], truncated: false },
      { items: [], truncated: false },
    ]) {
      const client = createHumanFollowUpBffAdapter({
        fetch: vi.fn().mockResolvedValue(Response.json(history)),
      });
      expect(await client.listNotes(query, signal())).toEqual({
        ok: true,
        notes: history,
      });
    }
    for (const items of [
      [note, note],
      [
        note,
        {
          ...note,
          noteId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          recordedAt: '2026-10-23T12:00:02Z',
        },
      ],
      Array.from({ length: 101 }, () => note),
    ]) {
      const client = createHumanFollowUpBffAdapter({
        fetch: vi
          .fn()
          .mockResolvedValue(Response.json({ items, truncated: false })),
      });
      expect(await client.listNotes(query, signal())).toEqual({
        ok: false,
        error: { kind: 'invalid-response' },
      });
    }
    const client = createHumanFollowUpBffAdapter({
      fetch: vi
        .fn()
        .mockResolvedValue(Response.json({ items: [note], truncated: true })),
    });
    expect(await client.listNotes(query, signal())).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });
  it('retries only idempotent transient reads and normalizes cancellation', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(Response.json({ items: [], truncated: false }));
    const client = createHumanFollowUpBffAdapter({ fetch });
    expect((await client.listNotes(query, signal())).ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    const aborted = new AbortController();
    aborted.abort();
    expect(await client.listNotes(query, aborted.signal)).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
  });
});

describe('notes cache seam', () => {
  it('contains read and mutation defects before logging and never serializes their causes', async () => {
    const privateDefect = new Error('private note content');
    const errorLog = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const store = configureStore({
      reducer: { [followUpNotesApi.reducerPath]: followUpNotesApi.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          thunk: {
            extraArgument: {
              followUpNotes: {
                listNotes: async () => {
                  throw privateDefect;
                },
                appendNote: async () => {
                  throw privateDefect;
                },
              },
            },
          },
        }).concat(followUpNotesApi.middleware),
    });
    try {
      const read = store.dispatch(
        followUpNotesApi.endpoints.followUpNotes.initiate(query),
      );
      expect((await read).error).toEqual({ kind: 'unexpected-defect' });
      const write = store.dispatch(
        followUpNotesApi.endpoints.appendFollowUpNote.initiate(command),
      );
      expect((await write).error).toEqual({ kind: 'unexpected-defect' });
      expect(JSON.stringify(store.getState())).not.toContain(
        privateDefect.message,
      );
      expect(errorLog).not.toHaveBeenCalled();
      read.unsubscribe();
      write.reset();
    } finally {
      store.dispatch(followUpNotesApi.util.resetApiState());
      errorLog.mockRestore();
    }
  });
  it('strips extra fields and preserves only recognized note outcomes', () => {
    expect(
      normalizeFollowUpNoteFailure({ kind: 'note-conflict', text: 'private' }),
    ).toEqual({ kind: 'note-conflict' });
    expect(
      normalizeFollowUpNoteFailure({ kind: 'invented', message: 'private' }),
    ).toEqual({ kind: 'unexpected-defect' });
  });
});
