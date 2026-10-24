import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  humanFollowUpApi,
  type FollowUpCompletionClient,
  type FollowUpCompletionCommand,
} from '@ergon/follow-up-data-access-web';
import { ResolverOwnedHumanFollowUps } from '../src';
import {
  createFollowUpTestStore,
  type FollowUpTestCapabilities,
} from './follow-up-test-store';
import {
  FIRST_WORK_ITEM_ID,
  TENANT_ID,
  resolverFollowUpCaseSummary,
  successfulOwnedFollowUpResult,
} from './follow-up-fixtures';
import { installNativeDialogTestDouble } from './native-dialog-test-double';

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
  const store = createFollowUpTestStore({
    listOwned: async () =>
      successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
    getOwnedCaseSummary: async () => ({
      ok: true,
      summary: resolverFollowUpCaseSummary(
        FIRST_WORK_ITEM_ID,
        'PRIVATE-SOURCE',
      ),
    }),
    ...capabilities,
  });
  stores.push(store);
  return {
    store,
    ...render(
      <StrictMode>
        <Provider store={store}>
          <ResolverOwnedHumanFollowUps
            tenantId={TENANT_ID}
            signInHref="/bff/login"
            consoleActorDetails={null}
          />
        </Provider>
      </StrictMode>,
    ),
  };
}
async function openForm(): Promise<HTMLElement> {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Open resolver console' }),
  );
  await screen.findByText('PRIVATE-SOURCE');
  fireEvent.click(screen.getByRole('button', { name: 'Complete follow-up' }));
  return screen.getByRole('dialog', { name: 'Complete owned follow-up' });
}
async function confirm(dialog: HTMLElement): Promise<void> {
  fireEvent.click(within(dialog).getByRole('checkbox'));
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Confirm completion' }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}
function acknowledged(command: FollowUpCompletionCommand) {
  return {
    ok: true as const,
    completion: {
      commandId: command.commandId,
      workItemId: command.workItemId,
      claimId: command.claimId,
      expectedOwnershipRevision: command.expectedOwnershipRevision,
      completedAt: '2026-10-23T12:00:00Z',
      recordedAt: '2026-10-23T12:00:01Z',
    },
  };
}

describe('confirmed current-owner follow-up completion', () => {
  it('requires acknowledgement, cancels without commands and discards the draft', async () => {
    const complete = vi.fn<FollowUpCompletionClient['complete']>();
    setup({ complete });
    const dialog = await openForm();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm completion' }),
    );
    await screen.findByText(
      'Acknowledge completion and loss of private access.',
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel completion' }),
    );
    expect(screen.getByRole('button', { name: 'Complete follow-up' })).toBe(
      document.activeElement,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Complete follow-up' }));
    expect(screen.getByRole('checkbox')).toHaveProperty('checked', false);
    expect(complete).not.toHaveBeenCalled();
  });
  it('commits private withdrawal before a synchronous POST and does not replay under StrictMode', async () => {
    const complete = vi.fn<FollowUpCompletionClient['complete']>(
      async (command) => {
        expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(
          screen.queryByRole('region', { name: 'Current claim' }),
        ).toBeNull();
        expect(
          screen.getByRole('heading', { name: 'Completing owned follow-up…' }),
        ).toBeTruthy();
        return acknowledged(command);
      },
    );
    setup({ complete });
    await confirm(await openForm());
    await screen.findByRole('heading', {
      name: 'Follow-up completion recorded',
    });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Open resolver console' }),
    ).toBeNull();
  });
  it('retains the identical uncertain tuple and performs a fresh owned check before reopening context', async () => {
    const complete = vi
      .fn<FollowUpCompletionClient['complete']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockImplementationOnce(async (command) => acknowledged(command));
    const listOwned = vi
      .fn<NonNullable<FollowUpTestCapabilities['listOwned']>>()
      .mockImplementation(async () =>
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      );
    setup({ complete, listOwned });
    await confirm(await openForm());
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry exact completion' }),
    );
    await screen.findByRole('heading', {
      name: 'Follow-up completion recorded',
    });
    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[0]?.[0]).toEqual(complete.mock.calls[1]?.[0]);
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(3));
    const before = listOwned.mock.calls.length;
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck my owned work' }),
    );
    await screen.findByRole('button', { name: 'Open resolver console' });
    expect(listOwned).toHaveBeenCalledTimes(before + 1);
    expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Open resolver console' }),
    );
    await screen.findByText('PRIVATE-SOURCE');
  });
  it.each([
    'completion-conflict',
    'invalid-completion',
    'completion-unavailable',
    'not-found',
  ] as const)(
    'withholds context and requires fresh recovery after %s',
    async (kind) => {
      const complete = vi
        .fn<FollowUpCompletionClient['complete']>()
        .mockResolvedValue({ ok: false, error: { kind } });
      setup({ complete });
      await confirm(await openForm());
      await screen.findByRole('heading', {
        name: 'Completion needs attention',
      });
      expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Retry exact completion' }),
      ).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Recheck my owned work' }),
      ).toBeTruthy();
      expect(complete).toHaveBeenCalledTimes(1);
    },
  );
  it('contains a rejected client as uncertain without exposing its cause', async () => {
    const complete = vi
      .fn<FollowUpCompletionClient['complete']>()
      .mockRejectedValue(new Error('SECRET-DEFECT'));
    setup({ complete });
    await confirm(await openForm());
    await screen.findByRole('button', { name: 'Retry exact completion' });
    expect(document.body.textContent).not.toContain('SECRET-DEFECT');
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it('retires a held command on tenant replacement and ignores its late acknowledgement', async () => {
    let finish: (
      value: Awaited<ReturnType<FollowUpCompletionClient['complete']>>,
    ) => void = () => undefined;
    const complete = vi.fn<FollowUpCompletionClient['complete']>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { rerender, store } = setup({ complete });
    await confirm(await openForm());
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    const [command, signal] = complete.mock.calls[0] ?? [];
    if (command === undefined) throw new Error('Expected the original intent');
    rerender(
      <StrictMode>
        <Provider store={store}>
          <ResolverOwnedHumanFollowUps
            tenantId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
            signInHref="/bff/login"
            consoleActorDetails={null}
          />
        </Provider>
      </StrictMode>,
    );
    await waitFor(() => expect(signal?.aborted).toBe(true));
    await screen.findByRole('button', { name: 'Open resolver console' });
    await act(async () => {
      finish(acknowledged(command));
    });
    expect(
      screen.queryByRole('heading', { name: 'Follow-up completion recorded' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Retry exact completion' }),
    ).toBeNull();
    expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it('retires a held result on close and cannot replace a newly opened Console', async () => {
    let finish: (
      value: Awaited<ReturnType<FollowUpCompletionClient['complete']>>,
    ) => void = () => undefined;
    const complete = vi.fn<FollowUpCompletionClient['complete']>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    setup({ complete });
    await confirm(await openForm());
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    const [command, signal] = complete.mock.calls[0] ?? [];
    if (command === undefined) throw new Error('Expected one captured command');
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to active work' }),
    );
    await waitFor(() => expect(signal?.aborted).toBe(true));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    await screen.findByText('PRIVATE-SOURCE');
    await act(async () => {
      finish(acknowledged(command));
    });
    expect(
      screen.queryByRole('heading', { name: 'Follow-up completion recorded' }),
    ).toBeNull();
    expect(screen.getByText('PRIVATE-SOURCE')).toBeTruthy();
  });
});
