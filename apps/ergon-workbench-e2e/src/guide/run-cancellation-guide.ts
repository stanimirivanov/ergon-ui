import type { GuideChapter } from './guide-chapter';

/** Operator guidance recorded against synthetic protocol checkpoints; backend tests own actual authority and durability evidence. */
export const runCancellationGuide: GuideChapter = {
  schemaVersion: 2,
  order: 27,
  slug: 'cancel-untouched-resolution-run',
  title:
    'Cancel an untouched run without claiming provider termination or resolution',
  summary:
    'Review current eligibility, acknowledge the narrow terminal boundary, recover an uncertain cancellation using exactly the original command, and reacquire private terminal detail without treating history as access or accepted outcome proof.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current run supervisors with current tenant-wide RESOLVER authority deciding whether to terminate a run before any durable authorization or execution record.',
  overview: [
    'Cancellation ends only an untouched resolution run. The server records one RUN_CANCELLED transition from its initial state to terminal CANCELLED. No connector is called; no grant is revoked; no provider operation is stopped. This decision neither closes the case nor verifies its outcome. Cancellation also does not compensate, open follow-up work, refund retry allowance or restart the run. If authorization, admission or uncertain provider work exists, use the separate execution recovery contract instead.',
    'This chapter uses SIMULATED DATA throughout. The real browser performs fresh reads, schema validation, accessible confirmation, invocation-local session-CSRF acquisition, exact POST intent, private-context withdrawal and recovery. The fixture supplies authority changes, atomic state facts and lost responses. It is not an authorization engine or database. Ergon PR #170 and ADR 0056 own PostgreSQL atomicity, run fencing, immutable audit and server authorization evidence; this recording does not certify live OIDC, providers or production deployment.',
  ],
  prerequisites: [
    'Deploy compatible backend writers before V20261018120000, using spring.flyway.target=20261017120000 during code-first rollout, then remove the target after every writer uses the shared run-first fence. Alternatively quiesce approval, authorization and execution writes throughout schema-and-code deployment. Trigger installation changes lock behavior even while commands are disabled, so old child-first writers must not resume afterward. Keep audit and recover forward.',
    'Deploy all state/event readers, including this UI, before enabling ERGON_RUN_SUPERVISOR_CANCELLATION_ENABLED; it defaults false. Browser-session enablement is separate. Old servers without the review route are unsupported, not eligible. Disabling the flag prevents new commands but cannot undo committed history. An old enum reader is unsafe after cancellation; deleting events or downgrading writers is not rollback.',
    'First application needs exact current supervision, current tenant-wide resolver authority and version zero in WAITING_FOR_APPROVAL or READY_FOR_AUTHORIZATION. Any durable grant, even unconsumed or expired, consumption, execution admission/attempt, receipt or prior transition prevents it. Pending requests and decisions remain immutable history. Keep the workspace open during uncertainty: replay intent is local and disappears on navigation, reload or sign-in.',
  ],
  steps: [
    {
      id: 'inspect',
      title: 'Inspect untouched work without issuing a command',
      body: 'Open Assigned runs and select the current run. Its initial state and revision zero describe the returned snapshot, not proof that no durable grant exists. Review eligibility separately rather than deriving permission from the absence of a displayed execution receipt. Neither selection nor ordinary inspection acquires CSRF or submits cancellation.',
      expected:
        'The initial run is visible; cancellation reviews and commands remain zero.',
    },
    {
      id: 'disabled',
      title: 'Respect the separately disabled rollout',
      body: 'Open Review untouched-run cancellation. The first synthetic response reports disabled browser cancellation while still enforcing the protected read boundary. Read the explanation and dismiss the modal. There is no executable confirmation and no command identity. An unavailable control is not permission to use an internal route or manually craft a POST.',
      expected:
        'Disabled review contains no Cancel untouched run submit control and no cancellation occurs.',
    },
    {
      id: 'review',
      title: 'Reopen for a fresh eligible observation',
      body: 'The fixture now supplies enabled eligibility; this is not a production configuration toggle. Reopen and inspect supervision/run versions and the observation time. Only supported ELIGIBLE at version zero permits confirmation. Review is advisory: the server will recheck authority and every durable reservation under its transaction fences before first application.',
      expected:
        'A second fresh review shows the acknowledged confirmation with supervision/run versions 0 / 0.',
    },
    {
      id: 'acknowledge',
      title: 'Acknowledge the narrow terminal boundary',
      body: 'Try submitting without acknowledgement and read the accessible field error. Understand that ending a run does not stop provider work or solve the customer outcome. Tick the acknowledgement only after reviewing those limits. Form validation must succeed before one immutable command UUID is generated; merely reading the warning never creates intent.',
      expected: 'Validation blocks submission with no cancellation POST.',
    },
    {
      id: 'dismiss',
      title: 'Dismiss review without cancelling the run',
      body: 'Dismiss the unsubmitted review and check that focus returns to its trigger. Before submission, closing the modal means no command was created. After submission, leaving the view cannot promise rollback. Reopening must reacquire a fresh protected observation rather than restore the old review from local component state.',
      expected:
        'The modal closes, trigger focus returns, and command count stays zero.',
    },
    {
      id: 'keyboard',
      title: 'Review safely at narrow width',
      body: 'Reopen at 320 pixels and traverse using Tab and Shift+Tab. Focus stays inside the modal; background controls cannot steal it. Long coordinates and warnings wrap without horizontal page overflow. Escape dismisses rather than submitting. These are real Chromium checks with synthetic facts, not a complete cross-browser or accessibility certification.',
      expected:
        'Keyboard containment, narrow reflow and automated modal accessibility checks pass without a command.',
    },
    {
      id: 'conflict',
      title: 'Reject a changed supervision epoch',
      body: 'After another fresh review, acknowledge and submit while the fixture simulates changed supervision. A definite conflict withdraws the earlier private Console and offers rechecking, not unchanged replay. Do not silently edit the epoch or substitute a new UUID to conceal this conflict. A later decision requires genuinely fresh facts and a new explicit confirmation.',
      expected:
        'Conflict feedback offers fresh rechecking; no cancellation is recorded.',
    },
    {
      id: 'refresh',
      title: 'Re-establish facts before another decision',
      body: 'Choose Recheck run before cancellation review. Fresh discovery and an independently authorized exact detail read must succeed before private facts return. Open another review and inspect supervision revision 1. This is a new decision based on current facts, not an automatic retry or mutation of the earlier conflicting intent.',
      expected: 'The new eligible review shows supervision/run versions 1 / 0.',
    },
    {
      id: 'pending',
      title: 'Submit once and inspect the disclosure barrier',
      body: 'Acknowledge and choose Cancel untouched run once. The recording holds the response to inspect pending state. The modal, discovery rows and prior private policy are removed before network acquisition, not merely covered by an overlay. Focus moves to the persistent Resolution run heading. The command contains only its UUID, expected supervision revision and expected run version; actor, reason and times are server-owned.',
      expected:
        'One new POST begins after private DOM withdrawal; the held pending view preserves heading focus and does not promise provider cancellation.',
    },
    {
      id: 'uncertain',
      title: 'Treat a lost acknowledgement as uncertain',
      body: 'Release the response while the fixture simulates a committed cancellation followed by transport loss. The browser cannot infer rollback from transport, timeout, malformed acknowledgement or an unexpected client defect. Preserve exactly the original confirmation. The warning also covers absent intent: explicit replay can first apply that original command under current first-application gates.',
      expected:
        'Uncertain feedback offers only explicit exact-intent replay, with one synthetic cancellation and no automatic resend.',
    },
    {
      id: 'replay',
      title: 'Replay the original command unchanged',
      body: 'Choose Retry exact cancellation intent. Fresh invocation-local CSRF is acquired, but UUID, epoch and version-zero intent are unchanged. The fixture returns the stored acknowledgement without another event. Historical replay requires the original actor and current resolver authority, not continued supervision; it never grants present access to the selected run.',
      expected:
        'The replay matches the original wire intent exactly and the synthetic cancellation count remains one.',
    },
    {
      id: 'terminal',
      title: 'Read CANCELLED through a fresh independent gate',
      body: 'Active discovery is now empty because cancelled runs are terminal. Only selection identity and historical acknowledgement were retained. A fresh exact-run read independently supplies CANCELLED, revision one and RUN_CANCELLED without a capability receipt. The outcome remains not assessed. Do not present this terminal run decision as accepted proof, a closed case, provider termination or a reusable authorization token.',
      expected:
        'Fresh terminal detail is visible despite empty discovery; the UI labels cancellation as case not closed and outcome not assessed.',
    },
    {
      id: 'held',
      title: 'Withdraw terminal context while rechecking',
      body: 'Explicitly recheck selected detail while its response is held. Retained private records disappear immediately and focus stays on the persistent heading. The historical acknowledgement can remain clearly labelled as history, but cannot keep private transition or policy facts visible. Waiting is not permission to resurrect the earlier terminal snapshot.',
      expected:
        'Private terminal detail is absent during the held revalidation without another cancellation POST.',
    },
    {
      id: 'denied',
      title: 'Respect neutral absence after access changes',
      body: 'The fixture denies the held read. The browser does not disclose whether supervision changed, authority expired or the identifier belongs elsewhere. It cannot reconstruct private facts from the receipt or replay cancellation to obtain evidence. Use the ordinary protected boundary for any recovery; a historical command result is not a resource access token.',
      expected:
        'Neutral unavailable context replaces terminal detail while only labelled historical feedback remains.',
    },
    {
      id: 'restore',
      title: 'Recover current access without another command',
      body: 'The prepared fixture restores access. Recheck assigned runs and allow the independent exact selected-run gate to complete after discovery succeeds. Empty discovery does not by itself deny terminal inspection, nor does a successful past command allow it. Do not infer case closure or verification from cancellation; a later resolution needs its own authorized execution and verification workflow.',
      expected:
        'Fresh authorized CANCELLED detail returns; wire intent count and the single cancellation remain unchanged.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Review is disabled, unsupported or records authorization.',
      guidance:
        'Do not submit or bypass browser ingress. Even an unconsumed grant makes this cancellation ineligible. Respect rollout and use the existing execution recovery for authorized, admitted or uncertain work. Failed or stale review creates no command.',
    },
    {
      symptom: 'Acknowledgement was lost or failed decoding.',
      guidance:
        'Keep the workspace open and explicitly replay only unchanged original intent. It may acknowledge stored history or first apply an absent command under fresh gates. Leaving may lose local recovery coordinates without undoing server effects; use trusted operator recovery rather than inventing replacement IDs.',
    },
    {
      symptom:
        'A cancellation receipt is visible but private detail is unavailable.',
      guidance:
        'This is a valid access outcome. Historical replay and current resource authorization differ. Recheck through current protected reads; do not infer the reason for neutral absence or reconstruct evidence from receipt fields.',
    },
    {
      symptom: 'The customer case is still unresolved.',
      guidance:
        'That is expected: cancellation ends untouched run execution only. It does not close the case, accept proof, stop provider work, create human follow-up or refund retry budget. Resolve the customer outcome through a separate reviewed capability.',
    },
  ],
  limitations: [
    'All authority, transitions and durability here are synthetic. Backend PostgreSQL tests own real atomicity, fencing and concurrency guarantees; this chapter exercises the browser protocol and presentation only.',
    'No live IdP/provider, production ingress, provider revocation, compensation, retry refund, case closure or full accessibility certification is exercised. Local replay intent is not persisted.',
  ],
};
