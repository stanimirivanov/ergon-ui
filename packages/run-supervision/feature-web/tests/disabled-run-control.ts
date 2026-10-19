import type {
  RunControlClient,
  RunSupervisionClient,
} from '@ergon/run-supervision-data-access-web';

/** Existing scenarios explicitly exercise backend rollout-off behavior; missing production bindings still fail closed. */
export function withDisabledRunControl<C extends RunSupervisionClient>(
  client: C,
): C & RunControlClient {
  if (hasControlClient(client)) return client;
  const disabled: RunControlClient = {
    getRunControl: async (query) => ({
      ok: true,
      value: {
        status: 'DISABLED',
        supervisionRevision: query.expectedSupervisionRevision,
        observedAt: '2026-10-19T08:00:00Z',
      },
    }),
    changeRunControl: async () => ({
      ok: false,
      error: { kind: 'control-disabled' },
    }),
  };
  // Keep the bound dependency identical: later spies/revalidation replacements
  // must remain the methods actually called by the store.
  return Object.assign(client, disabled);
}

function hasControlClient(
  client: RunSupervisionClient,
): client is RunSupervisionClient & RunControlClient {
  return (
    'getRunControl' in client &&
    typeof client.getRunControl === 'function' &&
    'changeRunControl' in client &&
    typeof client.changeRunControl === 'function'
  );
}
