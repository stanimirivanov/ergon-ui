import type { GuideChapter } from './guide-chapter';

export const followUpCompletionGuide: GuideChapter = {
  schemaVersion: 2,
  order: 36,
  slug: 'complete-owned-follow-up',
  title: 'Complete an owned follow-up without claiming case resolution',
  summary:
    'Review terminal administrative retirement, recover an uncertain acknowledgement exactly, and independently recheck active work.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Resolvers ending the active administrative follow-up they currently own.',
  overview: [
    'Completing a follow-up retires that work item and its active claim. It does not resolve the case, complete its run, approve a capability, verify an outcome or accept proof. Use the separate run and proof workflows for those decisions. Completion is terminal: this interaction offers no undo or reopen. Release returns work to the queue and handover assigns another resolver; neither is a substitute for completing work that should no longer remain active.',
    'This walkthrough uses synthetic BFF responses and fixed claim coordinates. It deliberately loses the response after a simulated commit, showing why a network failure is not evidence of non-completion. The guide proves browser behavior and private-context withdrawal, not PostgreSQL durability, live identity authorization or actual deployment readiness. Those guarantees belong to backend integration tests and the deployment operator.',
  ],
  prerequisites: [
    'Sign in to the intended tenant as a registered current resolver. Open the item from Claimed follow-ups and review its current context before choosing completion. A historical screenshot, cached list or previously successful command does not establish ownership. The backend checks current authority, claim and expected ownership revision at the command boundary.',
    'Confirm that the administrative work should end rather than move to another resolver or return to the queue. Coordinate any remaining work through your approved process before sending. Completion withdraws owner-scoped case context and internal notes; note history is retained by the backend but this terminal item no longer grants a route to read it.',
    'An operator must enable backend completion after deploying compatible terminal-state schema, guards and browser support. Its default-off setting may return unavailable even when the browser presents a form. Do not bypass deployment policy by changing identifiers or treating unavailable as proof of successful retirement.',
  ],
  steps: [
    {
      id: 'completion-review',
      title: 'Review the terminal administrative decision',
      body: 'Choose Complete follow-up in the current owned Console. Review the original claim and ownership revision, then read the distinction between administrative completion and case resolution. The form is a confirmation boundary, not a one-click success control. It promises neither a verified outcome nor continuing private access after the request.',
      expected:
        'The dialog displays current claim coordinates and explains terminal access loss.',
    },
    {
      id: 'completion-validation',
      title: 'Acknowledge consequences before sending',
      body: 'Confirm without checking the acknowledgement to see accessible validation. No request is sent and no command identity is created from an invalid form. Read the consequences and acknowledge them only when you intend this particular follow-up to end. Browser validation cannot replace fresh server ownership and authority checks.',
      expected:
        'Required acknowledgement guidance appears with zero completion requests.',
    },
    {
      id: 'completion-cancel',
      title: 'Cancel an unsent decision safely',
      body: 'Press Escape or choose Keep follow-up active. The dialog closes, focus returns to Complete follow-up and its acknowledgement draft is discarded. Reopening requires a new acknowledgement. This is cancellation of an unsent form only: closing a pending request later cannot retract a write that may already have committed.',
      expected:
        'The form closes without a command and reopens with an unchecked acknowledgement.',
    },
    {
      id: 'completion-narrow',
      title: 'Inspect and confirm on a narrow screen',
      body: 'At 320 pixels the claim UUID wraps inside the modal rather than forcing horizontal scrolling. The explanation, acknowledgement and both decisions remain reachable. Focus is contained by the native modal and Escape retains its cancellation behavior. The same acknowledgement is required regardless of viewport size.',
      expected:
        'The narrow confirmation has no horizontal overflow and passes accessibility checks.',
    },
    {
      id: 'completion-disabled',
      title: 'Handle a deployment that is not enabled',
      body: 'The first synthetic confirmation returns completion unavailable. Private case context, claim details and notes are removed before the POST starts and remain withheld afterward. No automatic retry or exact-replay shortcut is offered for this definite failure. Ask an operator about availability rather than claiming success or resending blindly.',
      expected:
        'A deployment-unavailable message replaces private context without automatic replay.',
    },
    {
      id: 'completion-recheck',
      title: 'Recover independently through current owned work',
      body: 'Choose Recheck my owned work. This discards the local interaction and makes a fresh owned-list request. Open the item again only if that current list permits it, obtaining a separately protected case-summary read. Rechecking is not undo and does not prove that an earlier uncertain request was never applied.',
      expected:
        'Current owned work is reloaded before a new Console context can be opened.',
    },
    {
      id: 'completion-conflict',
      title: 'Stop on changed ownership coordinates',
      body: 'The next synthetic command reports a conflict. Do not silently replace its claim or revision with fresh values: that would change the action originally confirmed. Private context remains withdrawn; use a fresh owned-work check, not exact replay for this definite conflict. Review current work again before making a new decision.',
      expected:
        'Conflict feedback has no replay control and does not restore old context.',
    },
    {
      id: 'completion-pending',
      title: 'Send one immutable completion intent',
      body: 'Recover the owned item once more and confirm. The browser retains one command UUID with tenant, work item, original claim and expected revision. It removes the dialog and private context before network execution. There is no editable payload, automatic POST retry or optimistic terminal row. Pending means the outcome is not yet known.',
      expected:
        'Completing owned follow-up is visible while one request remains held.',
    },
    {
      id: 'completion-uncertain',
      title: 'Treat a lost acknowledgement as uncertainty',
      body: 'The simulation retires the item but loses its first response. A transport error cannot establish whether the backend committed. Keep this interaction open if you need its recovery coordinates. Leaving discards them without undoing the request; reloading cannot recreate the command. Never generate a new command merely to discover what the old one did.',
      expected:
        'Retry exact completion is offered while former private context stays absent.',
    },
    {
      id: 'completion-receipt',
      title: 'Recover history, not access or outcome proof',
      body: 'Choose Retry exact completion to resend the same command, work item, original claim and revision. The backend returns the original receipt only to the original actor with current resolver authority, including after terminal retirement. Its completion time is a historical administrative fact, not case closure, run completion or proof acceptance. Receiving it restores no private context.',
      expected:
        'Identical intent returns a historical acknowledgement without another retirement.',
    },
    {
      id: 'completion-retired',
      title: 'Confirm the item has left active owned work',
      body: 'Choose Recheck my owned work after the receipt. The simulated list is empty because the item is terminal; no Console, note editor or replay intent remains. An empty real list can also reflect access changes, so do not infer private facts from absence alone. Continue separate case, run or proof responsibilities through independently authorized workflows.',
      expected:
        'No active claimed work is shown and former private context remains unavailable.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'A timeout or connection failure occurs.',
      guidance:
        'The outcome is unknown. Use exact replay only while the original interaction is retained and you still intend that decision. Do not replace its identity or claim. Closing abandons local recovery, not the server write; coordinate using current authorized views afterward.',
    },
    {
      symptom: 'The item is unavailable or ownership conflicts.',
      guidance:
        'Recheck current owned work instead of changing command fields. Neutral not-found does not disclose whether another actor owns the item, it is terminal, or authority changed. Historical acknowledgements never bypass fresh read authorization.',
    },
    {
      symptom: 'Sign-in or resolver authority changes.',
      guidance:
        'Use the trusted sign-in action when offered. Receipt recovery still requires the original actor and current resolver authority. Signing in as another actor cannot recover this command; a visible tenant route is not authorization.',
    },
  ],
  limitations: [
    'No bulk completion, administrator override, reopen, undo, case-resolution command, notification or provider action is included.',
    'Replay intent is memory-only for this mounted interaction. Close, navigation and tenant replacement retire callbacks and discard it; it is never stored in URLs, browser storage or a reload recovery record.',
    'This is a simulated BFF guide. Backend locking, terminal guards, current-authority checks and durable replay require the separately verified Ergon backend.',
  ],
};
