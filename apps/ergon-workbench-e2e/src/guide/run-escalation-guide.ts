import type { GuideChapter } from './guide-chapter';

/** Operator guidance recorded against marked synthetic protocol checkpoints, not live authority or persistence. */
export const runEscalationGuide: GuideChapter = {
  schemaVersion: 2,
  order: 25,
  slug: 'confirm-exhausted-run-escalation',
  title: 'Open human follow-up after exhausted automated recovery',
  summary:
    'Review the exhausted total-attempt budget, explicitly confirm unassigned human work, recover an uncertain acknowledgement without changing intent, and obtain fresh run and queue access without claiming resolution.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current assigned-run supervisors with current tenant-wide RESOLVER evidence handling a terminal failed attempt at the runtime total-attempt ceiling.',
  overview: [
    'A failed action is not proof of a resolved case. Fresh-run retry creates another independently guarded attempt only while the runtime budget permits it. Escalation ends that exhausted automated recovery: the server records ESCALATION_REQUESTED, advances this run to ESCALATED and opens exactly one unassigned work item in access-restoration. It does not create a third attempt, invoke a connector, compensate, assign a recipient, notify anyone, accept outcome proof or close the case. Follow-up discovery and claiming are separate authorized decisions.',
    'Every scene uses SIMULATED DATA. The browser really performs form validation, session-CSRF HTTP, strict decoding, private-context withdrawal and fresh reads. The fixture supplies authority, policy changes, terminal transitions, work creation and lost responses; it is not a database or authorization engine. Backend ADR 0055 and Ergon PR #168 own the real authorization, transaction, concurrency and immutable-history guarantees. This recording explains operator behavior, not production readiness or live OIDC/provider certification.',
  ],
  prerequisites: [
    'Deploy the merged additive schema and compatible backend before enabling ERGON_RUN_SUPERVISOR_ESCALATION_ENABLED, which defaults false. Browser-session support is separately configured. Disabled or unsupported review is not permission to call internal endpoints. Disable commands to roll back behavior, retain history and recover forward; never delete audit or undo escalation to repeat a command.',
    'First application requires exact current supervision, current tenant-wide resolver evidence, ACTION_FAILED at sequence one and runtime denial specifically because the total-attempt ceiling is exhausted. The current ceiling is two total attempts, including the initial one. The browser does not invent a new allowance or let an operator select another queue. The server checks all reviewed coordinates again after relevant lock waits.',
    'Keep the workspace open while resolving uncertainty. Only immutable local intent and historical feedback are retained; no private resource or command is persisted in URLs or browser storage. Exact historical replay requires the original command actor and current resolver evidence, not continuing supervision. It cannot restore current run or follow-up access. Leaving or signing in again may lose replay coordinates without cancelling already committed work.',
  ],
  steps: [
    {
      id: 'inspect',
      title: 'Inspect the failed final attempt',
      body: 'Open Assigned runs and inspect the failed attempt. Read the recorded connector failure and attempt 2 before deciding what recovery means. Merely inspecting does not request escalation review, CSRF or a command. A terminal failure is different from an incomplete invocation that might still be running; the existing invocation-recovery surface has a different contract.',
      expected:
        'The failed final attempt is visible with no escalation reviews or commands.',
    },
    {
      id: 'disabled',
      title: 'Respect disabled rollout',
      body: 'Open Review exhausted-run escalation. The fixture begins with disabled browser commands while the protected review still explains their availability. No executable confirmation is shown. Do not treat a disabled control as exhausted authority, and do not bypass it through an internal route. Cancel before the next prepared fixture state.',
      expected:
        'The disabled explanation appears, with no submit control or work creation.',
    },
    {
      id: 'review',
      title: 'Review exact exhaustion and the destination',
      body: 'The recording now supplies a separately enabled backend response and reopens review; it does not toggle production configuration. Check attempt 2 of 2 total, the runtime retry-policy revision, supervision/run versions and fixed access-restoration destination. The review is advisory, not an authorization token. No raw case evidence, private actor directory or queue selector is needed for this terminal recovery decision.',
      expected:
        'A distinct fresh review displays the exhaustion coordinates and an explicit unassigned-work confirmation.',
    },
    {
      id: 'acknowledge',
      title: 'Acknowledge what this command does not do',
      body: 'Try confirming before ticking acknowledgement. Read the accessible validation message. Opening human work leaves it unassigned and the case open; it is not a claim, execution, third attempt or verified resolution. Validation must succeed before one immutable command ID is generated. Merely visiting this form creates no command.',
      expected:
        'The acknowledgement error appears without any escalation POST.',
    },
    {
      id: 'cancel',
      title: 'Cancel without creating an intent',
      body: 'Cancel review and check that keyboard focus returns to its invoking button. Before submission, cancellation means no command was created. After submission, closing a view or leaving the page cannot promise rollback. Reopening obtains another current-authority review rather than reviving a retained private observation.',
      expected:
        'The dialog closes, trigger focus returns and command/work counters remain zero.',
    },
    {
      id: 'keyboard',
      title: 'Review at narrow width using the keyboard',
      body: 'Reopen at 320 pixels. Identifiers, the fixed queue and warnings wrap within the modal. Tab and Shift+Tab stay inside it, and background content cannot steal focus. Escape cancels and restores the trigger. These checks prove real browser interaction with the reviewed modal, not live authorization or a complete cross-browser accessibility certification.',
      expected:
        'The dialog has contained keyboard focus, no horizontal page overflow and no automated accessibility violations.',
    },
    {
      id: 'conflict',
      title: 'Reject a changed supervision epoch',
      body: 'After another fresh review, confirm once while the fixture simulates an intervening supervision change. The definite conflict withdraws old private facts and does not open any work. Do not silently replace the reviewed epoch, change command IDs to adopt unrelated work, or assume a previous supervisor still has current access.',
      expected:
        'Acknowledgement failure offers fresh rechecking rather than exact replay; zero work items exist.',
    },
    {
      id: 'refresh',
      title: 'Recover fresh facts before a new decision',
      body: 'Choose Recheck run before escalation review. Fresh discovery and exact detail must independently succeed before private context returns. Open a new review and inspect the new supervision coordinate. This is a deliberate new confirmation based on fresh facts, not an automatic retry or mutation of the conflicting intent.',
      expected:
        'The new review shows supervision revision 1 and current eligible exhaustion.',
    },
    {
      id: 'confirm',
      title: 'Confirm exhausted recovery once',
      body: 'Acknowledge the exact terminal boundary and choose Open unassigned human follow-up once. The recording holds the response so the pending phase can be inspected. Intent binds the original command ID, supervision/run versions, source attempt, runtime retry-policy revision, total ceiling and exhaustion reason. Identity, time, queue and work ID remain server-owned.',
      expected:
        'One new command starts; the pending explanation does not promise cancellation or automatic retry.',
    },
    {
      id: 'barrier',
      title: 'Keep earlier private context withdrawn before I/O',
      body: 'Inspect the held pending view. The modal, prior run policy and discovery rows have been removed, not simply covered with an overlay. Focus rests on the persistent Resolution run heading. The fixture also checks those absences at network acquisition, so a synchronous response cannot hide an ordering regression. StrictMode must not issue a duplicate command.',
      expected:
        'Private context is absent before POST acquisition and stays hidden while acknowledgement is pending.',
    },
    {
      id: 'uncertain',
      title: 'Treat a lost acknowledgement as uncertain',
      body: 'Release the response while the fixture simulates committed work followed by transport loss. The browser cannot infer rollback from this error. Preserve the exact original intent. The same warning also applies when a request never committed: replay may first apply that original reviewed confirmation. Neither circumstance justifies automatically minting another command.',
      expected:
        'Only explicit unchanged escalation replay is offered and the simulated creation count is one.',
    },
    {
      id: 'replay',
      title: 'Replay only the original confirmation',
      body: 'Choose Retry exact escalation intent. The browser reacquires invocation-local session CSRF and sends the identical intent, never an automatic POST retry. The fixture returns the stored acknowledgement without another work item. Historical replay does not require continuing supervision, but current resolver evidence and the original actor remain server gates; a receipt does not grant present access.',
      expected:
        'Both wire intents match exactly and only one synthetic work creation is recorded.',
    },
    {
      id: 'terminal',
      title: 'Read the terminal run through fresh authorization',
      body: 'After acknowledgement, fresh discovery is empty because terminal runs are no longer active. The selected identity is retained, not a Console snapshot. A separate exact-run read supplies ESCALATED and the appended transition while current access succeeds. Read the acknowledgement separately: creation status OPEN describes the original unassigned work, not its current status or owner after later claiming.',
      expected:
        'Fresh terminal detail is visible despite empty discovery; creation feedback says not claimed and does not assert case closure.',
    },
    {
      id: 'held',
      title: 'Withdraw terminal detail during revalidation',
      body: 'Recheck the selected terminal run while holding its new response. Earlier private policy and transition facts disappear immediately, with focus moved before the initiating control is removed. The historical creation acknowledgement can remain labelled as history; it is not used to keep private run facts visible or to repair access locally.',
      expected:
        'The revalidation state hides retained private detail and keeps the persistent heading focused.',
    },
    {
      id: 'denied',
      title: 'Respect neutral absence after access changes',
      body: 'The fixture denies the held read. The browser must not explain whether authority expired, supervision changed or another tenant owns an identifier. It must not reconstruct private details from the historical receipt, nor replay escalation merely to obtain current case evidence. Re-establish access only through the ordinary protected boundary.',
      expected:
        'Neutral unavailable context replaces private detail without additional escalation commands.',
    },
    {
      id: 'restore',
      title: 'Recover only through current protected reads',
      body: 'A separately prepared fixture restores access. Recheck assigned runs and let exact terminal detail revalidate after discovery succeeds. Even with an empty active list, selected terminal detail remains available only through that successful exact gate. Neither history nor a client-selected tenant is authority.',
      expected:
        'Authorized terminal detail returns after a fresh check, with no additional work creation.',
    },
    {
      id: 'queue',
      title: 'Discover the queue independently without auto-claiming',
      body: 'Use Back to follow-ups. This unmounts the private run view and performs the existing independent queue/owned-work reads. The created work can now appear in the shared queue under its own authorization policy; its receipt ID did not select private case context. Review the queue and choose claiming separately if appropriate. This walkthrough deliberately stops before claiming, leaving active owned work empty.',
      expected:
        'The shared queue shows the synthetic work, zero owned items and no extra POST or automatic claim.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Review is unsupported, disabled, stale or unavailable.',
      guidance:
        'No command was created by a failed review. Recheck current access or use the trusted sign-in path when offered. Remaining retry budget cannot be bypassed by escalation. Respect rollout and neutral absence rather than using internal ingress or an old snapshot.',
    },
    {
      symptom: 'Acknowledgement was lost, timed out or failed decoding.',
      guidance:
        'The command may already have committed. Use only the explicit exact replay with the same actor and current resolver authority. If absent, that replay may first commit the original confirmation. Leaving may discard local intent; use trusted operator recovery rather than inventing replacement IDs.',
    },
    {
      symptom:
        'OPEN appears in history but the work is not in the shared queue.',
      guidance:
        'OPEN describes original creation, not live ownership. Someone may have claimed the item or current discovery may withhold it. Use current authorized queue/owned-work discovery. Do not infer failure or create another escalation just because the historical item is not visible.',
    },
    {
      symptom: 'The case is still open after escalation.',
      guidance:
        'That is expected. Escalation ends automated recovery for this run, not the customer outcome. No connector, proof acceptance, case closure, notification or assignment occurs. Follow-up claiming and actual resolution are separate capabilities.',
    },
  ],
  limitations: [
    'All authority, persistence, transition and work facts here are marked synthetic. Ergon backend verification owns actual PostgreSQL atomicity, concurrency, immutable audit and authorization evidence.',
    'No third attempt, automatic escalation/claiming, queue or recipient selection, compensation, notification, follow-up completion, real IdP/provider or production deployment is exercised.',
    'Replay intent is local and is not persisted across navigation/reload/sign-in. Leaving cannot undo committed effects; historical acknowledgement never restores current access.',
    'Chromium and 320-pixel responsive checks are useful interaction evidence, not universal browser or accessibility certification.',
  ],
};
