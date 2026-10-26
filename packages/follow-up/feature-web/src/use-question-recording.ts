import {
  followUpQuestionsApi,
  normalizeFollowUpQuestionFailure,
  type FollowUpQuestionFailure,
  type RecordFollowUpQuestionCommand,
} from '@ergon/follow-up-data-access-web';
import { useEffect, useRef, useState } from 'react';
import { questionRecovery } from './follow-up-question-recovery';

export type QuestionRecordingPhase =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'pending';
      readonly command: RecordFollowUpQuestionCommand;
    }
  | {
      readonly kind: 'failure';
      readonly command: RecordFollowUpQuestionCommand;
      readonly failure: FollowUpQuestionFailure;
    }
  | { readonly kind: 'recorded'; readonly requestId: string };

/** Mounted command intent only, not a second history cache. Pending commits before I/O;
 * StrictMode's abandoned setup sends nothing. Retiring a lifetime aborts its own
 * mutation and detaches callbacks, but cannot undo a server write. Replay is explicit.
 */
export function useQuestionRecording(
  onRecorded: () => void,
  onAccessLost: () => void,
): {
  readonly phase: QuestionRecordingPhase;
  readonly submit: (command: RecordFollowUpQuestionCommand) => void;
  readonly replay: () => void;
} {
  const [phase, setPhase] = useState<QuestionRecordingPhase>({ kind: 'idle' });
  const [record] = followUpQuestionsApi.useRecordFollowUpQuestionMutation();
  const started = useRef<{
    readonly phase: QuestionRecordingPhase;
    readonly handle: ReturnType<typeof record>;
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
    // Acquire after a committed hidden phase; a superseded/abandoned setup acquires nothing.
    void Promise.resolve().then(async () => {
      if (!active) return;
      if (started.current?.phase !== phase) {
        started.current?.handle.reset();
        started.current = { phase, handle: record(phase.command) };
      }
      const result = await started.current.handle;
      if (!active) return;
      if (result.data !== undefined) {
        setPhase({ kind: 'recorded', requestId: phase.command.requestId });
        onRecorded();
      } else {
        const failure = normalizeFollowUpQuestionFailure(result.error);
        setPhase({ kind: 'failure', command: phase.command, failure });
        if (questionRecovery(failure).withdraw) onAccessLost();
      }
    });
    return () => {
      active = false;
    };
  }, [phase, record, onRecorded, onAccessLost]);
  return {
    phase,
    submit: (command) =>
      setPhase((current) =>
        current.kind === 'idle' ||
        current.kind === 'recorded' ||
        (current.kind === 'failure' &&
          current.failure.kind === 'invalid-question')
          ? { kind: 'pending', command }
          : current,
      ),
    replay: () =>
      setPhase((current) =>
        current.kind === 'failure' && questionRecovery(current.failure).replay
          ? { kind: 'pending', command: current.command }
          : current,
      ),
  };
}
