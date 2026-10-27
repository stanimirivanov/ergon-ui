import { StrictMode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, expect, it, vi } from 'vitest';
import {
  intakeApi,
  type IntakeClient,
  type IntakeCommand,
  type IntakeResult,
} from '@ergon/requester-intake-data-access-web';
import { RequesterCaseIntake } from '../src';
import { IntakeForm } from '../src/intake-form';
const tenant = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const caseId = '20000000-0000-4000-8000-000000000001';
const goal = ' Restore access ';
const observation = ' <script>inert</script> 😀 details ';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function open(submit: IntakeClient['submit']) {
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => caseId) });
  const store = configureStore({
    reducer: { [intakeApi.reducerPath]: intakeApi.reducer },
    middleware: (defaults) =>
      defaults({
        thunk: { extraArgument: { intakeClient: { submit } } },
      }).concat(intakeApi.middleware),
  });
  const tree = (id: string) => (
    <StrictMode>
      <Provider store={store}>
        <RequesterCaseIntake
          tenantId={id}
          signInHref="/bff/login?returnTo=tenant"
          caseLink={(value) => (
            <a href={'/checked/' + value}>Check current case progress</a>
          )}
        />
      </Provider>
    </StrictMode>
  );
  const view = render(tree(tenant));
  return {
    store,
    ...view,
    replaceTenant: (value: string) => view.rerender(tree(value)),
  };
}
function fill(): void {
  fireEvent.change(screen.getByRole('textbox', { name: 'Desired outcome' }), {
    target: { value: goal },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'What happened?' }), {
    target: { value: observation },
  });
  fireEvent.click(screen.getByRole('checkbox'));
}
function submit(): void {
  fireEvent.submit(screen.getByRole('form', { name: 'New request' }));
}
it('validates locally without minting intent or making requests', async () => {
  const client = vi.fn<IntakeClient['submit']>();
  open(client);
  submit();
  expect(await screen.findByText(/Enter a nonblank outcome/)).toBeTruthy();
  expect(
    screen.getByText(/Review this request before submitting/),
  ).toBeTruthy();
  expect(client).not.toHaveBeenCalled();
  expect(globalThis.crypto.randomUUID).not.toHaveBeenCalled();
});
it('commits draft withdrawal and persistent focus before I/O, once in StrictMode', async () => {
  let finish: (result: IntakeResult) => void = () => undefined;
  let boundary:
    { text: string; editors: number; focus: Element | null } | undefined;
  const client = vi.fn<IntakeClient['submit']>().mockImplementation(() => {
    boundary = {
      text: document.body.textContent ?? '',
      editors: document.querySelectorAll('textarea').length,
      focus: document.activeElement,
    };
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const { store } = open(client);
  fill();
  submit();
  await waitFor(() => expect(client).toHaveBeenCalledTimes(1));
  expect(boundary?.editors).toBe(0);
  expect(boundary?.text).not.toContain(observation.trim());
  expect(boundary?.focus).toBe(
    screen.getByRole('heading', { name: 'Start a request' }),
  );
  await act(async () => finish({ ok: true, caseId }));
  const link = await screen.findByRole('link', {
    name: 'Check current case progress',
  });
  expect(link.getAttribute('href')).toBe('/checked/' + caseId);
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(
    Object.keys(store.getState().requesterIntakeApi.mutations),
  ).toHaveLength(0);
});
it('retains raw input and UUID through uncertainty and never unseals rejected recovery', async () => {
  const client = vi
    .fn<IntakeClient['submit']>()
    .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
    .mockResolvedValueOnce({ ok: false, error: { kind: 'invalid-input' } });
  open(client);
  fill();
  submit();
  const retry = await screen.findByRole('button', {
    name: 'Retry exact request',
  });
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(retry);
  expect(
    await screen.findByText(/Input was rejected during recovery/),
  ).toBeTruthy();
  expect(client.mock.calls[1]?.[0]).toEqual(client.mock.calls[0]?.[0]);
  expect(client.mock.calls[0]?.[0]).toEqual({
    tenantId: tenant,
    caseId,
    goal,
    initialObservation: observation,
  });
  expect(globalThis.crypto.randomUUID).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Create request' })).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Retry exact request' }),
  ).toBeNull();
});
it('allows correction only for an initial input rejection with a fresh review', async () => {
  const client = vi
    .fn<IntakeClient['submit']>()
    .mockResolvedValue({ ok: false, error: { kind: 'invalid-input' } });
  open(client);
  fill();
  submit();
  await screen.findByRole('region', { name: 'Intake result' });
  expect(
    screen
      .getByRole('textbox', { name: 'Desired outcome' })
      .getAttribute('aria-invalid'),
  ).toBe('false');
  expect(screen.getByRole('checkbox')).toHaveProperty('checked', false);
  expect(
    screen.getByRole('textbox', { name: 'What happened?' }),
  ).toHaveProperty('value', observation);
  expect(
    screen.queryByRole('button', { name: 'Retry exact request' }),
  ).toBeNull();
});
it.each(['authentication-required', 'forbidden', 'intake-conflict'] as const)(
  'does not replay or restore the form for %s',
  async (kind) => {
    open(async () => ({ ok: false, error: { kind } }));
    fill();
    submit();
    await screen.findByRole('region', { name: 'Intake result' });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Retry exact request' }),
    ).toBeNull();
    expect(!!screen.queryByRole('link', { name: 'Sign in to Ergon' })).toBe(
      kind === 'authentication-required',
    );
  },
);
it('retires owned requests on tenant replacement and ignores late completions', async () => {
  let finish: (value: IntakeResult) => void = () => undefined;
  let signal: AbortSignal | undefined;
  const client = vi
    .fn<IntakeClient['submit']>()
    .mockImplementation((_command: IntakeCommand, value) => {
      signal = value;
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
  const view = open(client);
  fill();
  submit();
  await waitFor(() => expect(client).toHaveBeenCalledTimes(1));
  view.replaceTenant('30000000-0000-4000-8000-000000000003');
  expect(signal?.aborted).toBe(true);
  await act(async () => finish({ ok: true, caseId }));
  expect(
    screen.queryByRole('link', { name: 'Check current case progress' }),
  ).toBeNull();
  expect(
    screen.getByRole('textbox', { name: 'Desired outcome' }),
  ).toHaveProperty('value', '');
  expect(
    Object.keys(view.store.getState().requesterIntakeApi.mutations),
  ).toHaveLength(0);
});
it('retires pending form validation when the form itself is removed', async () => {
  const onSubmit = vi.fn();
  const view = render(<IntakeForm onSubmit={onSubmit} />);
  fill();
  submit();
  view.unmount();
  await act(async () => undefined);
  expect(onSubmit).not.toHaveBeenCalled();
});
