export const pinnedContractExample = {
  runId: '22222222-2222-4222-8222-222222222222',
  supervisionRevision: 3,
  observedAt: '2026-10-21T08:00:00Z',
  pinnedStepId: 'restore-access',
  contractRecordedAt: '2026-10-21T08:01:00.123456789Z',
  contract: {
    schema: 'ergon.dev/resolution-contract/v1alpha1' as const,
    key: 'access-restoration',
    revision: 1,
    applicability: { fact: 'account.state', equals: ' Locked <b>literal</b> ' },
    requiredEvidence: ['account.state', 'account.owner'],
    steps: [
      {
        id: 'z-observe',
        capability: 'account.inspect',
        risk: 'LOW' as const,
        approval: 'NONE' as const,
      },
      {
        id: 'restore-access',
        capability: 'access.restore',
        risk: 'LOW' as const,
        approval: 'NONE' as const,
      },
    ],
    outcomeProof: { fact: 'account.state', equals: 'ACTIVE' },
  },
};
