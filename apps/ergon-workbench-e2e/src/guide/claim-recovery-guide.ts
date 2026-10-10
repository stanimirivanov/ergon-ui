import type { GuideChapter } from './guide-chapter';

/** Assertion-backed guidance for competing and uncertain claim outcomes. */
export const claimRecoveryGuide: GuideChapter = {
  schemaVersion: 2,
  order: 15,
  slug: 'recover-from-claim-uncertainty',
  title: 'Recover from claim contention and uncertainty',
  summary:
    'Distinguish a lost race for shared work from an uncertain claim result, then replay only the original command and verify active ownership.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience: 'Resolvers claiming open human follow-ups in a shared queue.',
  overview: [
    'A shared inbox is a live discovery view, not a reservation. Another resolver can claim an item after you see it but before your command reaches the control plane. A conflict response is a definite outcome: do not keep trying the stale card. An interrupted or unavailable response is different. The command may have succeeded even though the browser cannot tell yet, so the workbench offers an explicit retry of the same command identity and expected ownership revision.',
    'This chapter records two independent synthetic claim attempts in one browser session. The first loses a race for one follow-up. The second represents a claim that the synthetic server records while returning an uncertain response; replay returns its durable receipt. The data, server responses, screenshots, and video are simulated and labelled SIMULATED DATA. This verifies browser handling and request identity, not actual backend idempotency, live concurrency, authentication, or persistence.',
  ],
  prerequisites: [
    'In a deployed environment, enter the intended tenant through a verified workbench session with current resolver authority. The tenant address and visible card do not authorize a claim; the BFF checks the actor, CSRF token, work-item state, and expected revision when the command arrives.',
    'Read the queue, reason, and case identifier before clicking Claim work. The two example cards are different cases; never interpret the second attempt as a retry of the first, and never use synthetic identifiers in operational records.',
  ],
  steps: [
    {
      id: 'two-open-items',
      title: 'Identify the two visible follow-ups',
      body: 'The open-work section initially contains a retry-limit escalation and a manual-review escalation. They are separate items in different queues. Each card is an offer to attempt a claim, not a guarantee that it will remain available. The active-work section is empty at this point; a shared card alone is not evidence of ownership.',
      expected:
        'Both synthetic open cards are visible and no active claimed work is shown.',
    },
    {
      id: 'attempt-competed-claim',
      title: 'Attempt the first claim',
      body: 'Select Claim work on the retry-limit item. In this example another resolver has already won the race. The browser sends a fresh command identity and the item revision it last saw. The control plane decides whether that revision can still be claimed; the UI cannot safely settle the race locally.',
      expected:
        'The first command receives a definite already-claimed conflict.',
    },
    {
      id: 'recognize-conflict',
      title: 'Read the competing-claim notice',
      body: 'The notice says another resolver claimed this work. The workbench refreshes the shared inbox so the stale card disappears. There is no Try claim again action for this definite conflict. Do not create a new command for the disappeared item, assume its case is closed, or infer who claimed it from the neutral notice.',
      expected:
        'The conflict alert is visible, the retry-limit card is gone, and the manual-review card remains.',
    },
    {
      id: 'attempt-uncertain-claim',
      title: 'Attempt the other open claim',
      body: 'Select Claim work on the manual-review item. The simulated server records this claim but returns a temporary failure to the browser. The workbench cannot know whether ownership changed from that response alone. Unlike the prior conflict, this is an ambiguous result rather than a rejection of the claim intent.',
      expected:
        'The browser displays an uncertain-result alert instead of claiming success.',
    },
    {
      id: 'recognize-uncertainty',
      title: 'Keep the original intent intact',
      body: 'Read “The claim result is not yet known.” Do not click the card’s Claim work button again; that would create a new command ID and a different intent. The alert offers Try claim again, which reuses the exact command ID, work-item ID, and expected revision from the first attempt. No active ownership should be asserted until the response is verified.',
      expected:
        'A Try claim again action is present while the result remains unconfirmed.',
    },
    {
      id: 'retry-original-command',
      title: 'Explicitly replay the command',
      body: 'Select Try claim again on the alert. The browser resends the original command with its session-bound CSRF header. The server contract allows an exact replay to return the recorded receipt instead of creating another claim. This is a narrow safety property for that command, not permission to automatically repeat arbitrary mutations.',
      expected:
        'The second request carries the same command ID, target, and expected ownership revision.',
    },
    {
      id: 'confirm-recorded-claim',
      title: 'Confirm the recorded outcome',
      body: 'The replay returns the prior claim receipt, and the workbench shows Follow-up claimed. Both shared and active lists refresh. A success notice is useful feedback, but the active-work list is where you recover the current owned item; the server remains authoritative if another state change occurs later.',
      expected:
        'The success notice appears and the manual-review item leaves the shared inbox.',
    },
    {
      id: 'verify-active-work',
      title: 'Check your active-work section',
      body: 'Find the manual-review follow-up under Claimed follow-ups. Confirm that the case identifier and reason match the intended second card. Do not infer that the competing first item belongs to you; it remains absent from your active work. Open case context only when needed and rely on its separate authorization check.',
      expected:
        'Only the manual-review item appears as claimed under your active work.',
    },
    {
      id: 'reload-owned-work',
      title: 'Recover the claim after reload',
      body: 'Reload the tenant workbench and wait for the verified session and active-work request. The claimed item returns from the server-backed owned-work view, while the shared inbox stays empty in this synthetic example. The browser does not have to preserve a command or claim in local storage to recover the work; a live deployment still rechecks current authority on each read.',
      expected:
        'The same owned item is visible after reload, with no new claim command sent.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'An unexpected workbench failure interrupts claiming.',
      guidance:
        'The server might already have recorded the claim. Use only the alert’s explicit Try claim again action, which preserves the original command ID, target, and expected revision. Do not start a new command from a stale card or assume that a rejected callback meant no write. Cache/component regressions verify this defect path; the recording illustrates HTTP uncertainty rather than an injected client defect.',
    },
    {
      symptom: 'A claim says another resolver already claimed the item.',
      guidance:
        'Treat this as a definite conflict. Wait for the inbox refresh, then select another currently visible item if appropriate. Do not retry the stale card or infer the identity of the other resolver.',
    },
    {
      symptom: 'A claim reports an unknown result or an unusable response.',
      guidance:
        'Use the alert’s explicit Try claim again action while it remains available. That action preserves the command identity. Avoid starting a fresh claim intent until the current outcome has been reconciled.',
    },
    {
      symptom: 'The item is not visible in active work after recovery.',
      guidance:
        'Recheck the session, tenant, current authority, and latest server-backed list. An old screenshot or success notice is not a current authorization or ownership proof. Ask an operator to investigate if the state cannot be reconciled.',
    },
  ],
  limitations: [
    'The synthetic BFF deliberately controls the race and response loss. This chapter does not prove the backend’s durable replay ledger, competing transactions, CSRF enforcement, OIDC identity, or database state; backend and future disposable full-stack checks own those claims.',
    'The workbench has no general claim-history or reconciliation screen. This guide covers only visible conflict, explicit same-command retry, and recovery through the active-work list; resolution and reassignment remain separate future capabilities.',
  ],
};
