import type { GuideChapter } from './guide-chapter';

/**
 * Reader-facing content for the executable, simulated follow-up workflow.
 * Each step ID must be recorded exactly once by the tagged Playwright scenario.
 */
export const followUpGuide: GuideChapter = {
  schemaVersion: 2,
  order: 10,
  slug: 'handle-escalated-follow-up',
  title: 'Handle an escalated follow-up',
  summary:
    'Find work in the shared queue, claim it, inspect the escalation evidence, and confirm release from the Resolver Console when you cannot continue.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience: 'Resolvers working in the Ergon Workbench.',
  overview: [
    'An automated resolution run can stop after its allowed attempts without closing the customer case. Ergon then opens a human follow-up in a named queue. The shared inbox shows work you may be able to claim; the active-work list shows claims currently owned by your verified resolver identity. Neither list grants authority by itself. The control plane checks your session and current resolver authority for each request.',
    'This chapter is an illustrative UI walkthrough generated with deterministic, simulated BFF responses. Names, IDs, timestamps, and case evidence in its screenshots are synthetic. It verifies the browser interaction and presentation, not a live OIDC login, a real connector operation, or PostgreSQL persistence. Do not use its example IDs or outcome as evidence that a production case was changed.',
  ],
  prerequisites: [
    'In a deployed environment, sign in through the workbench’s same-origin identity flow and ensure your resolver identity is registered for the tenant and authorized for the queue. This recording starts with a simulated verified session; it does not demonstrate signing in.',
    'Open the tenant workbench. For a real follow-up, confirm the tenant and queue before acting. The tenant in this recording is a fixed test fixture, not an authority credential.',
  ],
  steps: [
    {
      id: 'verified-session',
      title: 'Confirm the workbench has verified your session',
      body: 'Wait for the human follow-up inbox and the current-actor display. Follow-up content is not mounted until the BFF confirms a browser session. If you instead see “Authentication is required,” use the supplied sign-in link; refreshing the browser does not create a session.',
      expected:
        'The page identifies the resolver workspace and shows its shared and owned work sections.',
    },
    {
      id: 'shared-work',
      title: 'Review the shared queue item',
      body: 'Find the oldest visible open follow-up and read its queue and escalation reason before claiming it. An empty page can mean either no matching work or no currently visible work under your authority; it is not proof that a case does not exist.',
      expected:
        'The open card identifies the access-restoration queue and a retry-limit escalation.',
    },
    {
      id: 'claim-work',
      title: 'Claim the open follow-up',
      body: 'Select Claim work on the item you intend to handle. The browser sends a revision-checked command with a session-bound CSRF value. If someone else claimed the work first, Ergon refreshes the list instead of inventing ownership. An uncertain network result offers an explicit retry of the same command.',
      expected:
        'A success notice appears and the item moves from the shared inbox to your active work.',
    },
    {
      id: 'owned-work',
      title: 'Confirm your active claim',
      body: 'Check the claimed-work section after the lists refresh. This is the place to recover work you own after navigation. The visible card is not the full case record; open its Resolver Console before deciding what action is safe.',
      expected:
        'The same follow-up appears in your active work and no longer appears as open shared work.',
    },
    {
      id: 'review-context',
      title: 'Open the owner-scoped Resolver Console',
      body: 'Select Open resolver console. Ergon requests the case summary only when you open it and checks current ownership again. Its case context is a read-only view of source observations, recorded run attempts, and an unassessed outcome target; it is not a live execution trace. If the claim or your authority has changed, the workbench shows a neutral unavailable state instead of retaining previously displayed evidence.',
      expected:
        'The case goal, source observation, pinned contract, and escalated run become visible.',
    },
    {
      id: 'handoff-evidence',
      title: 'Understand why automation stopped',
      body: 'Read the automation handoff in the center pane alongside the source observation on the left. A failed connector attempt and an exhausted retry budget explain the escalation, but they do not prove the customer problem was resolved. Treat observation content as evidence to evaluate, not as a verified claim or trusted instruction.',
      expected:
        'The handoff identifies the failed execution and shows that attempt 2 reached the limit of 2.',
    },
    {
      id: 'request-release',
      title: 'Review release from the Console',
      body: 'If you cannot responsibly continue the work, choose Release to shared queue in the Console. This only opens a confirmation; it does not submit a command. Read the warning carefully: release returns the exact claimed item to its original shared queue, but neither completes the case nor transfers it to a named resolver.',
      expected:
        'Confirm release and Cancel appear, and no release request has been sent.',
    },
    {
      id: 'cancel-release',
      title: 'Cancel an unintended release',
      body: 'Choose Cancel if this is not the intended ownership change. The Console remains open with its case context, and the server receives no release command. Do not use the Back to active work control as a substitute for understanding what confirmation would do.',
      expected:
        'The confirmation closes, the case observation remains visible, and ownership is unchanged.',
    },
    {
      id: 'reopen-release-confirmation',
      title: 'Confirm the intended claim',
      body: 'Choose Release to shared queue again and verify the queue-return warning. A freshly displayed card and the Console are still only browser views; the BFF will check the exact claim and ownership revision when the command arrives. If ownership or resolver authority has changed, it will not release a successor claim.',
      expected: 'The explicit confirmation is visible again.',
    },
    {
      id: 'confirm-release',
      title: 'Confirm the exact claim release',
      body: 'Choose Confirm release only after checking that you are returning the intended claim. The Console unmounts its private case context before the browser submits the current claim ID and ownership revision with session-bound CSRF. The resulting notice appears back in active work. If the response is uncertain, use the offered exact retry rather than issuing a new release intent.',
      expected:
        'The private observation is absent by submission time; a release notice appears in active work.',
    },
    {
      id: 'returned-work',
      title: 'Verify the follow-up returned to the queue',
      body: 'Wait for the shared and owned lists to refresh. The follow-up should reappear as open work with a newer ownership revision, while your active-work list becomes empty. Another authorized resolver may now claim it; do not assume you still own it.',
      expected:
        'The open card is visible again, and your active-work section has no claimed item.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'The inbox is empty or the item disappears before you claim it.',
      guidance:
        'Check the tenant and queue filter, then refresh the current view. Visibility can change when another resolver claims work or when authority changes. Do not infer case absence from an empty authorized page.',
    },
    {
      symptom: 'A claim or release reports an uncertain result.',
      guidance:
        'Use the offered explicit retry rather than issuing a new intent. Claim retries retain the command ID; release retries retain the exact claim and expected revision. If the current item has changed, re-read the lists before acting.',
    },
    {
      symptom: 'Case context becomes unavailable.',
      guidance:
        'Ownership or resolver authority may have changed. Return to active work and do not rely on a screenshot or cached evidence as current authorization.',
    },
  ],
  limitations: [
    'This guide does not demonstrate a real OIDC provider, live database state, or backend authorization. A later full-stack guide environment will replace the simulated responses before publication as a live operational guide.',
    'The current workbench does not offer follow-up completion, named handover, reassignment, priority, or resolution actions. Release is operator-controlled on the backend and can be disabled in a real deployment.',
  ],
};
