import type { RunSupervisorHandoverFailure } from './handover-contracts';
import { normalizeRunSupervisionFailure } from './normalize-run-supervision-failure';

const kinds: ReadonlyMap<string, RunSupervisorHandoverFailure> = new Map([
  ['handover-disabled', { kind: 'handover-disabled' }],
  ['handover-conflict', { kind: 'handover-conflict' }],
  ['handover-unavailable', { kind: 'handover-unavailable' }],
  ['recipient-not-eligible', { kind: 'recipient-not-eligible' }],
  ['invalid-handover', { kind: 'invalid-handover' }],
  ['csrf-rejected', { kind: 'csrf-rejected' }],
]);

/** Narrow cache errors once, stripping all extra fields; unknown defects retain no raw diagnostic cause. */
export function normalizeRunHandoverFailure(
  value: unknown,
): RunSupervisorHandoverFailure {
  if (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    typeof value.kind === 'string'
  ) {
    const failure = kinds.get(value.kind);
    if (failure !== undefined) return { ...failure };
  }
  return normalizeRunSupervisionFailure(value);
}
