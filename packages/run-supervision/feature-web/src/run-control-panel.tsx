import { Button } from '@ergon/ui-web';
import { useEffect, useState, type ReactElement, type RefObject } from 'react';
import type {
  RunControlCommand,
  RunControlQuery,
  RunSupervisionFailure,
} from '@ergon/run-supervision-data-access-web';
import { runSupervisionFailureCopy } from './run-supervision-copy';
import type {
  RunControlAvailability,
  useRunControlCommands,
} from './use-run-control';

const uncertain = new Set<RunSupervisionFailure['kind']>([
  'transport',
  'timeout',
  'request-cancelled',
  'invalid-response',
  'unexpected-defect',
  'service-unavailable',
  'unexpected-http-status',
  'control-unavailable',
]);

/**
 * Keeps operational status, advisory time, failures and explicit actions visible.
 * Only static control guidance is collapsed. Presence coordinates one server
 * browser session, not one tab or provider execution; receipts are historical.
 */
export function RunControlPanel({
  control,
  command,
  query,
  heading,
  onRecover,
  signInHref,
}: {
  readonly control: RunControlAvailability;
  readonly command: ReturnType<typeof useRunControlCommands>;
  readonly query: RunControlQuery | null;
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly onRecover: () => void;
  readonly signInHref: string;
}): ReactElement {
  const { read } = control;
  const remainingSeconds = useControlCountdown(control.deadline);
  function recheck(): void {
    heading.current?.focus();
    read.recheck();
  }
  function submit(action: RunControlCommand['action']): void {
    if (query === null || read.phase !== 'ready') return;
    const base = { ...query, commandId: crypto.randomUUID() };
    if (action === 'ACQUIRE') {
      if (read.data.status !== 'AVAILABLE' && read.data.status !== 'EXPIRED')
        return;
      command.submit({ ...base, action });
    } else if (read.data.status === 'THIS_SESSION' && remainingSeconds > 0) {
      command.submit({ ...base, action, control: read.data.fence });
    }
  }
  let content: ReactElement;
  if (command.state.phase === 'submitting')
    content = (
      <p role="status">
        Control command pending. Private context is hidden; acknowledgement may
        already be recorded.
      </p>
    );
  else if (command.state.phase === 'failed')
    content = (
      <div role="alert">
        <p>
          Control acknowledgement unavailable.{' '}
          {runSupervisionFailureCopy(command.state.error).description}
        </p>
        <p>
          Do not replace the original intent to resolve uncertainty. Replay
          acknowledges its original expiry, never a renewal.
        </p>
        {uncertain.has(command.state.error.kind) ? (
          <Button onClick={command.retry}>Retry exact control intent</Button>
        ) : null}
        {command.state.error.kind === 'authentication-required' ? (
          <a href={signInHref}>Sign in again</a>
        ) : null}
        <Button variant="quiet" onClick={onRecover}>
          Recheck run and control
        </Button>
      </div>
    );
  else if (read.phase === 'closed')
    content = (
      <p>
        Current browser control is not established. Select or recheck a
        supported run; historical feedback grants no control.
      </p>
    );
  else if (read.phase === 'pending')
    content = (
      <p role="status">
        Checking browser control… New commands are unavailable.
      </p>
    );
  else if (read.phase === 'failed')
    content = (
      <div role="alert">
        <p>
          Browser control unavailable.{' '}
          {runSupervisionFailureCopy(read.error).description}
        </p>
        {read.error.kind === 'authentication-required' ? (
          <a href={signInHref}>Sign in again</a>
        ) : (
          <Button onClick={recheck}>Recheck browser control</Button>
        )}
      </div>
    );
  else {
    const view = read.data;
    const expired =
      view.status === 'EXPIRED' ||
      ((view.status === 'THIS_SESSION' || view.status === 'ANOTHER_SESSION') &&
        remainingSeconds === 0);
    content = (
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <p
          role="status"
          className="rounded border border-border px-2 py-1 text-xs font-bold"
        >
          {expired
            ? 'Browser control expired'
            : {
                DISABLED: 'Browser control enforcement disabled',
                AVAILABLE: 'Browser control available',
                THIS_SESSION: 'This browser session holds control',
                ANOTHER_SESSION: 'Another browser session holds control',
                EXPIRED: 'Browser control expired',
                TERMINAL: 'Terminal run · no new control',
              }[view.status]}
        </p>
        {(view.status === 'THIS_SESSION' ||
          view.status === 'ANOTHER_SESSION') &&
        !expired ? (
          <p className="text-xs text-ink-muted">
            Advisory time remaining:{' '}
            <span className="font-mono font-bold text-ink tabular-nums">
              {remainingSeconds}s
            </span>
            . The server checks again on every command.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {view.status === 'AVAILABLE' || view.status === 'EXPIRED' ? (
            <Button size="compact" onClick={() => submit('ACQUIRE')}>
              Acquire browser control
            </Button>
          ) : null}
          {view.status === 'THIS_SESSION' && !expired ? (
            <>
              <Button size="compact" onClick={() => submit('RENEW')}>
                Renew browser control
              </Button>
              <Button
                size="compact"
                variant="quiet"
                onClick={() => submit('RELEASE')}
              >
                Release browser control
              </Button>
            </>
          ) : null}
          <Button size="compact" variant="quiet" onClick={recheck}>
            Recheck browser control
          </Button>
        </div>
        {view.status === 'ANOTHER_SESSION' || expired ? (
          <p className="basis-full text-xs text-ink-muted">
            No forced takeover or automatic reacquisition. Recheck status before
            acquiring anew.
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <section
      aria-label="Browser control"
      className="min-w-0 space-y-2 rounded-md border border-border bg-canvas/60 p-3 text-sm"
    >
      {command.state.phase === 'succeeded' ? (
        <p role="status" className="text-xs text-ink-muted">
          Control {command.state.receipt.action.toLowerCase()} acknowledged
          historically. Current ownership requires the fresh status below.
        </p>
      ) : null}
      {content}
      <details className="min-w-0 text-xs text-ink-muted">
        <summary className="cursor-pointer rounded py-1 font-bold text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong">
          Browser control boundaries
        </summary>
        <p className="mt-2 leading-5">
          Control is not tool authorization. Loss or release does not stop
          admitted work. Tabs sharing a server session share its control;
          closing this view does not release it.
        </p>
      </details>
    </section>
  );
}

/** Per-second presentation is local: large Console panes rerender only at expiry, not every tick. */
function useControlCountdown(deadline: number | null): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (deadline === null) return;
    if (deadline <= performance.now()) return;
    const timer = setInterval(() => {
      setTick((n) => n + 1);
      if (performance.now() >= deadline) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  void tick;
  return deadline === null
    ? 0
    : Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
}
