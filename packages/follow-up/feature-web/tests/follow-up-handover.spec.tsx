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
  type FollowUpHandoverClient,
  type FollowUpHandoverCommand,
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

const recipient = '99999999-9999-4999-8999-999999999999';
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
  fireEvent.click(screen.getByRole('button', { name: 'Hand over follow-up' }));
  return screen.getByRole('dialog', { name: 'Hand over owned follow-up' });
}
async function confirm(dialog: HTMLElement): Promise<void> {
  fireEvent.change(
    within(dialog).getByRole('textbox', { name: 'Recipient actor UUID' }),
    { target: { value: recipient } },
  );
  fireEvent.click(within(dialog).getByRole('checkbox'));
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Confirm handover' }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}
function acknowledged(command: FollowUpHandoverCommand) {
  return {
    ok: true as const,
    handover: {
      commandId: command.commandId,
      workItemId: command.workItemId,
      originalClaimId: command.claimId,
      expectedOwnershipRevision: command.expectedOwnershipRevision,
      recipientActorId: command.recipientActorId,
      successorClaimId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      ownershipRevision: command.expectedOwnershipRevision + 2,
      handedOverAt: '2026-10-23T12:00:00Z',
      recordedAt: '2026-10-23T12:00:01Z',
    },
  };
}

describe('confirmed current-owner follow-up handover', () => {
  it('requires UUID and acknowledgement, cancels without commands and discards the draft', async () => {
    const handOver = vi.fn<FollowUpHandoverClient['handOver']>();
    setup({ handOver });
    const dialog = await openForm();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm handover' }),
    );
    await screen.findByText('Enter a complete internal actor UUID.');
    expect(handOver).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: recipient },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm handover' }),
    );
    await screen.findByText('Acknowledge the ownership and access change.');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel handover' }),
    );
    expect(screen.getByRole('button', { name: 'Hand over follow-up' })).toBe(
      document.activeElement,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Hand over follow-up' }),
    );
    expect(
      screen.getByRole('textbox', { name: 'Recipient actor UUID' }),
    ).toHaveProperty('value', '');
    expect(handOver).not.toHaveBeenCalled();
  });
  it('commits private withdrawal before a synchronous POST and does not replay under StrictMode', async () => {
    const handOver = vi.fn<FollowUpHandoverClient['handOver']>(
      async (command) => {
        expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(
          screen.queryByRole('region', { name: 'Current claim' }),
        ).toBeNull();
        expect(
          screen.getByRole('heading', { name: 'Handing over owned work…' }),
        ).toBeTruthy();
        return acknowledged(command);
      },
    );
    setup({ handOver });
    await confirm(await openForm());
    await screen.findByRole('heading', { name: 'Follow-up handover recorded' });
    expect(handOver).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Open resolver console' }),
    ).toBeNull();
  });
  it('retains the identical uncertain tuple and performs a fresh owned check before reopening context', async () => {
    const handOver = vi
      .fn<FollowUpHandoverClient['handOver']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockImplementationOnce(async (command) => acknowledged(command));
    const listOwned = vi
      .fn<NonNullable<FollowUpTestCapabilities['listOwned']>>()
      .mockImplementation(async () =>
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      );
    setup({ handOver, listOwned });
    await confirm(await openForm());
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry exact handover' }),
    );
    await screen.findByRole('heading', { name: 'Follow-up handover recorded' });
    expect(handOver).toHaveBeenCalledTimes(2);
    expect(handOver.mock.calls[0]?.[0]).toEqual(handOver.mock.calls[1]?.[0]);
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
    'handover-conflict',
    'recipient-unavailable',
    'handover-unavailable',
    'not-found',
  ] as const)(
    'withholds context and requires fresh recovery after %s',
    async (kind) => {
      const handOver = vi
        .fn<FollowUpHandoverClient['handOver']>()
        .mockResolvedValue({ ok: false, error: { kind } });
      setup({ handOver });
      await confirm(await openForm());
      await screen.findByRole('heading', { name: 'Handover needs attention' });
      expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Retry exact handover' }),
      ).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Recheck my owned work' }),
      ).toBeTruthy();
      expect(handOver).toHaveBeenCalledTimes(1);
    },
  );
  it('contains a rejected client as uncertain without exposing its cause', async () => {
    const handOver = vi
      .fn<FollowUpHandoverClient['handOver']>()
      .mockRejectedValue(new Error('SECRET-DEFECT'));
    setup({ handOver });
    await confirm(await openForm());
    await screen.findByRole('button', { name: 'Retry exact handover' });
    expect(document.body.textContent).not.toContain('SECRET-DEFECT');
    expect(handOver).toHaveBeenCalledTimes(1);
  });
  it('retires a held command on tenant replacement and ignores its late acknowledgement', async () => {
    let finish: (
      value: Awaited<ReturnType<FollowUpHandoverClient['handOver']>>,
    ) => void = () => undefined;
    const handOver = vi.fn<FollowUpHandoverClient['handOver']>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { rerender, store } = setup({ handOver });
    await confirm(await openForm());
    await waitFor(() => expect(handOver).toHaveBeenCalledTimes(1));
    const [command, signal] = handOver.mock.calls[0] ?? [];
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
      screen.queryByRole('heading', { name: 'Follow-up handover recorded' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Retry exact handover' }),
    ).toBeNull();
    expect(screen.queryByText('PRIVATE-SOURCE')).toBeNull();
    expect(handOver).toHaveBeenCalledTimes(1);
  });
  it('retires a held result on close and cannot replace a newly opened Console', async () => {
    let finish: (
      value: Awaited<ReturnType<FollowUpHandoverClient['handOver']>>,
    ) => void = () => undefined;
    const handOver = vi.fn<FollowUpHandoverClient['handOver']>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    setup({ handOver });
    await confirm(await openForm());
    await waitFor(() => expect(handOver).toHaveBeenCalledTimes(1));
    const [command, signal] = handOver.mock.calls[0] ?? [];
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
      screen.queryByRole('heading', { name: 'Follow-up handover recorded' }),
    ).toBeNull();
    expect(screen.getByText('PRIVATE-SOURCE')).toBeTruthy();
  });
});
