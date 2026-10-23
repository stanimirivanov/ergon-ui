import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  humanFollowUpApi,
  type FollowUpNotesClient,
} from '@ergon/follow-up-data-access-web';
import { ResolverOwnedHumanFollowUps } from '../src';
import {
  createFollowUpTestStore,
  type FollowUpTestCapabilities,
} from './follow-up-test-store';
import {
  FIRST_WORK_ITEM_ID,
  TENANT_ID,
  successfulOwnedFollowUpResult,
  resolverFollowUpCaseSummary,
} from './follow-up-fixtures';
import { installNativeDialogTestDouble } from './native-dialog-test-double';

const note = {
  noteId: '88888888-8888-4888-8888-888888888888',
  claimId: '66666666-6666-4666-8666-666666666666',
  ownershipRevision: 1,
  authorActorId: '99999999-9999-4999-8999-999999999999',
  text: '<script>untrusted commentary</script>',
  authoredAt: '2026-09-21T09:40:00Z',
  recordedAt: '2026-09-21T09:40:01Z',
};
const stores: ReturnType<typeof createFollowUpTestStore>[] = [];
let restore: () => void;
beforeEach(() => {
  restore = installNativeDialogTestDouble();
});
afterEach(() => {
  cleanup();
  for (const store of stores.splice(0))
    store.dispatch(humanFollowUpApi.util.resetApiState());
  restore();
});

function setup(capabilities: FollowUpTestCapabilities = {}) {
  const listNotes = vi
    .fn<FollowUpNotesClient['listNotes']>()
    .mockResolvedValue({
      ok: true,
      notes: { items: [note], truncated: false },
    });
  const store = createFollowUpTestStore({
    listOwned: async () =>
      successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null, 3),
    getOwnedCaseSummary: async () => ({
      ok: true,
      summary: resolverFollowUpCaseSummary(
        FIRST_WORK_ITEM_ID,
        'private source evidence',
      ),
    }),
    listNotes,
    ...capabilities,
  });
  stores.push(store);
  const view = render(
    <StrictMode>
      <Provider store={store}>
        <ResolverOwnedHumanFollowUps
          tenantId={TENANT_ID}
          signInHref="/bff/login"
          consoleActorDetails={null}
        />
      </Provider>
    </StrictMode>,
  );
  return { ...view, listNotes, store };
}

async function openNotes(): Promise<HTMLElement> {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Open resolver console' }),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Internal notes' }),
  );
  await screen.findByText(note.text);
  return screen.getByRole('dialog', { name: 'Internal follow-up notes' });
}

describe('owned internal notes', () => {
  it('loads only on demand, renders text inertly, and restores trigger focus', async () => {
    const { listNotes } = setup();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    const trigger = await screen.findByRole('button', {
      name: 'Internal notes',
    });
    expect(listNotes).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    expect(await screen.findByText(note.text)).toBeTruthy();
    expect(document.querySelector('script')).toBeNull();
    expect(
      within(screen.getByRole('dialog')).getByText(note.authorActorId),
    ).toBeTruthy();
    expect(listNotes).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Close internal notes' }),
    );
    expect(screen.queryByText(note.text)).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    await screen.findByText(note.text);
    expect(listNotes).toHaveBeenCalledTimes(2);
  });
  it('validates Unicode input and explicitly replays exactly the original uncertain intent', async () => {
    const appendNote = vi
      .fn<FollowUpNotesClient['appendNote']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockImplementation(async (command) => ({
        ok: true,
        note: {
          ...note,
          ...command,
          ownershipRevision: command.expectedOwnershipRevision,
        },
      }));
    setup({ appendNote });
    const dialog = await openNotes();
    const field = within(dialog).getByRole('textbox', {
      name: 'Internal note text',
    });
    fireEvent.change(field, { target: { value: ' \u00a0' } });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save internal note' }),
    );
    await screen.findByText(/Enter nonblank text/);
    expect(appendNote).not.toHaveBeenCalled();
    const exactText = '  😀'.repeat(1000);
    fireEvent.change(field, { target: { value: exactText } });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save internal note' }),
    );
    const replay = await screen.findByRole('button', {
      name: 'Retry exact note',
    });
    expect(appendNote).toHaveBeenCalledTimes(1);
    expect(appendNote.mock.calls[0]?.[0].text).toBe(exactText);
    fireEvent.click(replay);
    await screen.findByText(/Note recorded. This receipt is historical/);
    expect(appendNote).toHaveBeenCalledTimes(2);
    expect(appendNote.mock.calls[0]?.[0]).toEqual(
      appendNote.mock.calls[1]?.[0],
    );
  });
  it('withdraws notes and draft during a held claim recheck; reopening cannot restore the draft', async () => {
    const ownedRead =
      deferred<
        Awaited<ReturnType<NonNullable<FollowUpTestCapabilities['listOwned']>>>
      >();
    const listOwned = vi
      .fn<NonNullable<FollowUpTestCapabilities['listOwned']>>()
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null, 3),
      )
      .mockImplementationOnce(() => ownedRead.promise);
    setup({ listOwned });
    const dialog = await openNotes();
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'private draft' },
    });
    // The component boundary is driven by the same toolbar workflow used in browsers.
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck current claim' }),
    );
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText(note.text)).toBeNull();
    await act(async () =>
      ownedRead.resolve(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null, 3),
      ),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Internal notes' }),
    );
    await screen.findByText(note.text);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  });
  it('denial withdraws previous case context instead of trusting the owned list', async () => {
    setup({
      listNotes: async () => ({ ok: false, error: { kind: 'not-found' } }),
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Internal notes' }),
    );
    await screen.findByRole('heading', {
      name: 'Owner-scoped context withdrawn',
    });
    expect(screen.queryByText('private source evidence')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Back to active work' }),
    );
    expect(
      screen.getByRole('button', { name: 'Recover owner-scoped context' }),
    ).toBeTruthy();
  });
  it('returns a definitive server validation error to the preserved RHF field', async () => {
    const appendNote = vi
      .fn<FollowUpNotesClient['appendNote']>()
      .mockResolvedValue({ ok: false, error: { kind: 'invalid-note' } });
    setup({ appendNote });
    const dialog = await openNotes();
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'Please inspect SSO' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save internal note' }),
    );
    await screen.findByText(
      'The server rejected the note text or ownership revision.',
    );
    const field = screen.getByRole('textbox');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(field);
    expect((field as HTMLTextAreaElement).value).toBe('Please inspect SSO');
    expect(
      screen.queryByRole('button', { name: 'Retry exact note' }),
    ).toBeNull();
  });
  it('retires pending writes on close and ignores late completion', async () => {
    const write =
      deferred<Awaited<ReturnType<FollowUpNotesClient['appendNote']>>>();
    const appendNote = vi
      .fn<FollowUpNotesClient['appendNote']>()
      .mockImplementation(() => write.promise);
    setup({ appendNote });
    const dialog = await openNotes();
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'late private text' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save internal note' }));
    await waitFor(() => expect(appendNote).toHaveBeenCalledTimes(1));
    fireEvent.click(
      screen.getByRole('button', { name: 'Close internal notes' }),
    );
    expect(appendNote.mock.calls[0]?.[1].aborted).toBe(true);
    await act(async () => write.resolve({ ok: true, note }));
    expect(screen.queryByText(/Note recorded/)).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
