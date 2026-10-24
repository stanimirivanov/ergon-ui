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
  type FollowUpPriorityClient,
  type FollowUpPriorityCommand,
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
  return render(
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
}
async function openForm(): Promise<HTMLElement> {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Open resolver console' }),
  );
  await screen.findByText('PRIVATE-SOURCE');
  fireEvent.click(screen.getByRole('button', { name: 'Change priority' }));
  return screen.getByRole('dialog');
}
function confirm(dialog: HTMLElement): void {
  fireEvent.change(within(dialog).getByLabelText('New priority'), {
    target: { value: 'HIGH' },
  });
  fireEvent.click(within(dialog).getByRole('checkbox'));
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Confirm priority assignment' }),
  );
}
function acknowledged(
  command: FollowUpPriorityCommand,
): Awaited<ReturnType<FollowUpPriorityClient['assignPriority']>> {
  return {
    ok: true,
    assignment: {
      ...command,
      priorityRevision: command.expectedPriorityRevision + 1,
      assignedAt: '2026-10-24T12:00:00Z',
      recordedAt: '2026-10-24T12:00:01Z',
    },
  };
}
describe('confirmed priority lifetime', () => {
  it('requires acknowledgement and withdraws private DOM before one StrictMode POST; receipt never becomes current truth', async () => {
    const assignPriority = vi.fn<FollowUpPriorityClient['assignPriority']>(
      async (command) => {
        expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(
          screen.queryByRole('region', { name: 'Current claim' }),
        ).toBeNull();
        return acknowledged(command);
      },
    );
    setup({ assignPriority });
    const dialog = await openForm();
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Confirm priority assignment',
      }),
    );
    await screen.findByText('Acknowledge this priority assignment.');
    expect(assignPriority).not.toHaveBeenCalled();
    confirm(dialog);
    await screen.findByRole('heading', {
      name: 'Priority assignment recorded',
    });
    expect(assignPriority).toHaveBeenCalledTimes(1);
    expect(assignPriority.mock.calls[0]?.[0]).toMatchObject({
      priority: 'HIGH',
      expectedPriorityRevision: 0,
      expectedOwnershipRevision: 1,
    });
    expect(
      screen.getByText(
        /Historical acknowledgement: HIGH at priority revision 1/,
      ),
    ).toBeTruthy();
    expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck my owned work' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    await screen.findByText('PRIVATE-SOURCE');
    expect(screen.queryByText(/Historical acknowledgement/)).toBeNull();
    // Deliberately unchanged read fixture: acknowledgement must not patch it HIGH.
    expect(screen.getAllByText('Priority NORMAL').length).toBeGreaterThan(0);
  });
  it('preserves the entire uncertain intent after a fresh original-ownership check, even when priority advanced', async () => {
    let advanced = false;
    const listOwned = vi.fn<NonNullable<FollowUpTestCapabilities['listOwned']>>(
      async () => {
        const result = successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null);
        if (!result.ok || !advanced) return result;
        return {
          ...result,
          page: {
            ...result.page,
            items: result.page.items.map((item) => ({
              ...item,
              workItem: {
                ...item.workItem,
                priority: 'URGENT' as const,
                priorityRevision: 2,
              },
            })),
          },
        };
      },
    );
    const assignPriority = vi
      .fn<FollowUpPriorityClient['assignPriority']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockImplementationOnce(async (command) => acknowledged(command));
    setup({ assignPriority, listOwned });
    confirm(await openForm());
    await screen.findByRole('button', {
      name: 'Retry exact priority assignment',
    });
    const reads = listOwned.mock.calls.length;
    advanced = true;
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry exact priority assignment' }),
    );
    await screen.findByRole('heading', {
      name: 'Priority assignment recorded',
    });
    expect(listOwned.mock.calls.length).toBeGreaterThan(reads);
    expect(assignPriority).toHaveBeenCalledTimes(2);
    expect(assignPriority.mock.calls[1]?.[0]).toEqual(
      assignPriority.mock.calls[0]?.[0],
    );
  });
  it('retires replay when the original claim disappears, without another POST', async () => {
    let owned = true;
    const assignPriority = vi
      .fn<FollowUpPriorityClient['assignPriority']>()
      .mockResolvedValue({ ok: false, error: { kind: 'transport' } });
    setup({
      assignPriority,
      listOwned: async () =>
        owned
          ? successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null)
          : { ok: true, page: { items: [], nextCursor: null } },
    });
    confirm(await openForm());
    await screen.findByRole('button', {
      name: 'Retry exact priority assignment',
    });
    owned = false;
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry exact priority assignment' }),
    );
    await screen.findByText(/The original active claim is unavailable/);
    expect(assignPriority).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'Retry exact priority assignment' }),
    ).toBeNull();
  });
  it('cannot dispatch from a held ownership read after the user leaves', async () => {
    let releaseRead: (() => void) | undefined;
    let hold = false;
    const assignPriority = vi
      .fn<FollowUpPriorityClient['assignPriority']>()
      .mockResolvedValue({ ok: false, error: { kind: 'transport' } });
    setup({
      assignPriority,
      listOwned: async () => {
        if (hold)
          await new Promise<void>((resolve) => {
            releaseRead = resolve;
          });
        return successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null);
      },
    });
    confirm(await openForm());
    await screen.findByRole('button', {
      name: 'Retry exact priority assignment',
    });
    hold = true;
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry exact priority assignment' }),
    );
    await waitFor(() => expect(releaseRead).toBeTypeOf('function'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to active work' }),
    );
    await act(async () => releaseRead?.());
    expect(assignPriority).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
  });
  it.each(['priority-conflict', 'priority-unavailable', 'not-found'] as const)(
    'offers fresh recovery, not replay, after %s',
    async (kind) => {
      setup({ assignPriority: async () => ({ ok: false, error: { kind } }) });
      confirm(await openForm());
      await screen.findByRole('heading', {
        name: 'Priority assignment needs attention',
      });
      expect(
        screen.queryByRole('button', {
          name: 'Retry exact priority assignment',
        }),
      ).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Recheck my owned work' }),
      ).toBeTruthy();
      expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
    },
  );
});
