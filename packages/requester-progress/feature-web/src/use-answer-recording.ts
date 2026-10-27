import { useEffect, useRef, useState } from 'react';
import {
  normalizeAnswerFailure,
  progressApi,
  type RequesterAnswerCommand,
  type RequesterAnswerFailure,
} from '@ergon/requester-progress-data-access-web';
import {
  requesterAnswerRecovery,
  type AnswerAttemptMode,
} from './requester-answer-recovery';

export type AnswerRecordingPhase =
  | { readonly kind: 'idle' | 'recorded' }
  | {
      readonly kind: 'pending';
      readonly mode: AnswerAttemptMode;
      readonly command: RequesterAnswerCommand;
      readonly attempt: number;
    }
  | {
      readonly kind: 'failure';
      readonly mode: AnswerAttemptMode;
      readonly command: RequesterAnswerCommand;
      readonly attempt: number;
      readonly failure: RequesterAnswerFailure;
    };

/** Owns mounted immutable intent, not history. Commit withdrawal before I/O, send once in StrictMode, and retire owned requests/callbacks on unmount. */
export function useAnswerRecording(onRecorded: () => void): {
  readonly phase: AnswerRecordingPhase;
  readonly submit: (command: RequesterAnswerCommand, attempt: number) => void;
  readonly replay: (attempt: number) => void;
} {
  const [phase, setPhase] = useState<AnswerRecordingPhase>({ kind: 'idle' });
  const [record] = progressApi.useRecordAnswerMutation();
  const started = useRef<{
    phase: AnswerRecordingPhase;
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
      // Settled replay intent belongs to phase, not a completed request handle.
      if (started.current?.handle === handle) started.current = undefined;
      if (!active) return;
      if (result.data !== undefined) {
        setPhase({ kind: 'recorded' });
        onRecorded();
      } else
        setPhase({
          kind: 'failure',
          mode: phase.mode,
          command: phase.command,
          attempt: phase.attempt,
          failure: normalizeAnswerFailure(result.error),
        });
    });
    return () => {
      active = false;
    };
  }, [phase, record, onRecorded]);
  return {
    phase,
    submit: (command, attempt) =>
      setPhase((current) =>
        current.kind === 'idle' ||
        current.kind === 'recorded' ||
        (current.kind === 'failure' &&
          requesterAnswerRecovery(current.failure, current.mode).canCorrect)
          ? { kind: 'pending', command, attempt, mode: 'initial' }
          : current,
      ),
    replay: (attempt) =>
      setPhase((current) =>
        current.kind === 'failure' &&
        requesterAnswerRecovery(current.failure, current.mode).replay
          ? {
              kind: 'pending',
              command: current.command,
              attempt,
              mode: 'recovery',
            }
          : current,
      ),
  };
}
