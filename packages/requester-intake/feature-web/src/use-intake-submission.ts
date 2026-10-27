import { useEffect, useRef, useState } from 'react';
import {
  intakeApi,
  normalizeIntakeFailure,
  type IntakeCommand,
  type IntakeFailure,
} from '@ergon/requester-intake-data-access-web';
import { intakeRecovery, type IntakeAttemptMode } from './intake-recovery';
export type IntakePhase =
  | { readonly kind: 'idle' }
  | { readonly kind: 'recorded'; readonly caseId: string }
  | {
      readonly kind: 'pending';
      readonly command: IntakeCommand;
      readonly mode: IntakeAttemptMode;
    }
  | {
      readonly kind: 'failure';
      readonly command: IntakeCommand;
      readonly mode: IntakeAttemptMode;
      readonly failure: IntakeFailure;
    };

/** Commit draft withdrawal before I/O; own one handle and immutable replay intent. StrictMode/teardown retire observation, not a server write. */
export function useIntakeSubmission(): {
  readonly phase: IntakePhase;
  readonly submit: (command: IntakeCommand) => void;
  readonly replay: () => void;
} {
  const [phase, setPhase] = useState<IntakePhase>({ kind: 'idle' });
  const [record] = intakeApi.useSubmitMutation();
  const started = useRef<{
    phase: IntakePhase;
    handle: ReturnType<typeof record>;
  }>(undefined);
  useEffect(
    () => () => {
      started.current?.handle.abort();
      started.current?.handle.reset();
    },
    [],
  );
  useEffect(() => {
    if (phase.kind !== 'pending') return;
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      if (started.current?.phase !== phase) {
        started.current?.handle.reset();
        started.current = { phase, handle: record(phase.command) };
      }
      const handle = started.current.handle;
      const result = await handle;
      handle.reset();
      if (started.current?.handle === handle) started.current = undefined;
      if (!active) return;
      setPhase(
        result.data !== undefined
          ? { kind: 'recorded', caseId: result.data.caseId }
          : {
              kind: 'failure',
              command: phase.command,
              mode: phase.mode,
              failure: normalizeIntakeFailure(result.error),
            },
      );
    });
    return () => {
      active = false;
    };
  }, [phase, record]);
  return {
    phase,
    submit: (command) =>
      setPhase((current) =>
        current.kind === 'idle' ||
        (current.kind === 'failure' &&
          intakeRecovery(current.failure, current.mode).canCorrect)
          ? { kind: 'pending', command, mode: 'initial' }
          : current,
      ),
    replay: () =>
      setPhase((current) =>
        current.kind === 'failure' &&
        intakeRecovery(current.failure, current.mode).replay
          ? { kind: 'pending', command: current.command, mode: 'recovery' }
          : current,
      ),
  };
}
