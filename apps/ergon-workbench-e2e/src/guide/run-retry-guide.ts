import type { GuideChapter } from './guide-chapter';

/** Assertion-backed operator guidance; all authority, transaction and access changes are explicitly simulated. */
export const runRetryGuide: GuideChapter = {
  schemaVersion: 2,
  order: 24,
  slug: 'confirm-failed-run-retry',
  title: 'Start a fresh successor after a failed action',
  summary:
    'Review the current retry budget and plan, confirm one fresh supervised run, recover an uncertain acknowledgement without changing intent, and re-establish successor access before inspecting its fresh requirements.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current assigned-run supervisors with current tenant-wide RESOLVER evidence handling a terminal ACTION_FAILED access-restoration attempt.',
  overview: [
    'A fresh-run retry is different from invocation recovery. An incomplete invocation may still be running and uses the original reservation. ACTION_FAILED is a recorded terminal failure. This chapter deliberately creates a policy-bounded successor with a new run identity, independently evaluated requirements and initial supervision assigned to the confirming actor. The predecessor becomes SUPERSEDED. No approval, authorization grant, consumption, connector receipt or provider key is inherited, and creating the successor does not execute a capability, verify an outcome or close the case.',
    'Every response and screen here is marked SIMULATED DATA. The browser really validates acknowledgement, issues the documented session-CSRF protocol, hides private context, decodes results and obtains fresh protected reads. The fixture controls deployment states, stale evidence, lost responses and changed access; it does not implement authorization, PostgreSQL atomicity or provider idempotency. Ergon backend PR #166 separately owns those guarantees and database verification. Treat this recording as an operator walkthrough, not evidence that a production environment or real identity provider was exercised.',
  ],
  prerequisites: [
    'Deploy the merged retry migration and compatible backend first. Every assignment reader must handle browser-retry provenance before enabling ERGON_RUN_SUPERVISOR_RETRY_ENABLED; the default is false. After the first browser assignment, disable commands and recover forward rather than downgrading to an old non-null machine-subject reader. The browser has no rollout switch and never falls back to internal endpoints.',
    'First confirmation requires current predecessor supervision, current tenant-wide resolver evidence, ACTION_FAILED at the eligible revision, current case evidence and the exact reviewed plan and versioned total-attempt ceiling. The current ceiling is two total attempts, including the initial one. Review is advisory: the server checks every fence again. The same contract revision, step and capability must describe the retry, while current planning may require different safeguards.',
    'Keep the workspace open while resolving uncertainty. Only exact immutable command intent and historical feedback survive locally; RTK Query owns resources and RHF owns acknowledgement. Nothing is persisted in URLs or browser storage. Exact replay belongs to the original actor with current resolver evidence, not necessarily continuing supervision, and never restores successor access after handover. Leaving or signing in again may discard local replay coordinates without undoing a committed retry.',
  ],
  steps: [
    {
      id: 'open-assigned',
      title: 'Open your assigned runs',
      body: 'Choose Assigned runs in the verified tenant workspace. This is a private discovery snapshot, not a global queue or permission to execute. Merely opening discovery does not acquire retry review, session CSRF or a command. The fixture starts with a terminal failed first attempt and disabled browser retry.',
      expected:
        'Assigned discovery appears with zero retry reviews, commands or successor creations.',
    },
    {
      id: 'inspect-failed',
      title: 'Inspect the recorded terminal failure',
      body: 'Inspect the assigned run and distinguish its FAILED connector result from an incomplete invocation. Read the pinned operation and earlier human approval without treating that approval as reusable execution authority. A fresh-run review is separate from the existing execution-recovery control and performs no action by itself.',
      expected:
        'The failed attempt and Review fresh-run retry control are visible; no successor exists.',
    },
    {
      id: 'disabled-review',
      title: 'Respect a disabled retry rollout',
      body: 'Open retry review. The protected read can explain disabled support without enabling confirmation. Do not bypass deployment controls through an internal endpoint or confuse a disabled feature with an exhausted retry budget. Cancel to continue ordinary inspection; no command has been created.',
      expected:
        'The disabled explanation is visible and Create fresh successor is absent.',
    },
    {
      id: 'fresh-review',
      title: 'Obtain a fresh, separately enabled plan',
      body: 'The recording switches to a separately prepared enabled backend response and reopens the modal. This is a fixture comparison, not an operator-facing configuration action. Reopening must obtain a distinct review. Check attempt 1 of 2 total, the retry-policy revision, current planning policy, reviewed case version and fresh approval/risk requirements.',
      expected:
        'A fresh review offers the exact current plan and the explicit successor confirmation.',
    },
    {
      id: 'acknowledgement',
      title: 'Acknowledge the fresh-run boundary',
      body: "Try submitting without acknowledgement. Read the accessible validation message and the exact operation again. Form validation grants nothing; it prevents accidental confirmation before one command identity is minted. The successor will have fresh safeguards, not the failed attempt's old approval or provider operation.",
      expected:
        'An acknowledgement error appears with zero commands and zero successor creations.',
    },
    {
      id: 'cancel',
      title: 'Cancel before creating anything',
      body: 'Cancel the review. Focus returns to its invoking control and no CSRF or POST is needed. This pre-submit cancellation differs from leaving after a command: once a retry has committed, closing a modal or navigating cannot reverse supersession, delete the successor or restore previous supervision.',
      expected:
        'The modal closes, focus returns to Review fresh-run retry, and no command was sent.',
    },
    {
      id: 'keyboard-narrow',
      title: 'Review with keyboard at narrow width',
      body: 'Reopen at 320 pixels. Read the wrapped operation identifiers, current policy, risk, approval requirement and reviewed versions. Tab and Shift+Tab remain inside the modal; the background cannot take focus. Escape cancels and restores focus. This checks the real browser interaction, not live authority.',
      expected:
        'The modal is keyboard-contained, passes accessibility checks and causes no horizontal page overflow.',
    },
    {
      id: 'stale-plan',
      title: 'Reject changed evidence rather than replacing intent',
      body: 'After a new review, the fixture simulates intervening case evidence and a definite conflict. Confirm once. Private discovery, run detail and review are withdrawn before POST acquisition. A conflict cannot authorize a silent replacement plan or adoption of another successor. Do not rewrite coordinates and call it the same confirmation.',
      expected:
        'Retry acknowledgement unavailable offers fresh revalidation, not exact replay; no successor was created.',
    },
    {
      id: 'refresh',
      title: 'Re-establish current facts after conflict',
      body: 'Choose Recheck run before retry review. Fresh discovery and exact detail must succeed before earlier private facts return. Open a new review and see the newer case version. This is an explicit new decision based on current planning, not an automatic retry of the conflicting command.',
      expected:
        'Current context returns and a distinct review shows the updated case coordinate.',
    },
    {
      id: 'confirm',
      title: 'Confirm one fresh successor deliberately',
      body: 'Acknowledge the reviewed plan and choose Create fresh successor once. The recording holds the response so the pending boundary remains visible. The immutable intent includes one command ID, exact supervision/run/case coordinates, the full narrow plan and retry policy/ceiling. The session supplies the actor; no recipient or successor ID is selected by the browser.',
      expected:
        'One command starts and the modal retires before its held response completes.',
    },
    {
      id: 'private-barrier',
      title: 'Keep private facts hidden while the result is uncertain',
      body: 'Inspect the pending surface. Old discovery rows, case/run policy and dialogs are removed rather than merely covered. Focus rests on the persistent Resolution run heading. StrictMode must not issue another mutation. The pending message does not promise cancellation, execution or a side-effect-free retry.',
      expected:
        'Private context is absent at network acquisition and remains hidden while one acknowledgement is pending.',
    },
    {
      id: 'uncertain',
      title: 'Recognize a lost acknowledgement',
      body: 'Release the held response; the fixture commits one successor but drops the acknowledgement. The browser cannot know whether the original retry committed. It retains the exact intent and warns that a retry may first commit if the original request never reached the server. Never mint a replacement command ID merely to escape this uncertainty.',
      expected:
        'An explicit exact-intent replay is offered; there is still only one recorded successor.',
    },
    {
      id: 'exact-replay',
      title: 'Recover the unchanged historical acknowledgement',
      body: 'Choose Retry exact successor intent. The client obtains fresh invocation-local CSRF but sends the same command and reviewed tuple. In this scene the original command already committed, so replay returns its original acknowledgement without another successor. A separate browser regression covers first commitment when the original request was absent.',
      expected:
        'The two submitted intents are identical and the successor-creation count remains one.',
    },
    {
      id: 'fresh-successor',
      title: 'Inspect the successor only after fresh access checks',
      body: 'The acknowledged successor ID becomes local selection, not current authority. Fresh discovery and exact successor detail must pass before its facts appear. Confirm attempt 2, a new epoch-zero supervision relationship, no terminal execution receipt and no inherited approved human response. The case remains unresolved until separate execution and independent proof.',
      expected:
        'Fresh successor facts show independently evaluated prerequisites; no capability was executed or case closed by retry.',
    },
    {
      id: 'held-recheck',
      title: 'Hide retained successor detail during revalidation',
      body: 'Recheck the selected successor while its next detail response is held. Retained policy, prerequisites and proof must disappear immediately; the historical acknowledgement may remain because it describes a past command. A discovery row is only an earlier observation and cannot replace the exact detail gate.',
      expected:
        'Private successor policy is hidden during the held check while the stable execution heading remains.',
    },
    {
      id: 'denied',
      title: 'Treat unavailable successor context neutrally',
      body: 'The fixture now denies the held read. The UI does not explain whether the run disappeared, authority expired or supervision changed. Historical replay feedback is not a way around this denial and must not restore any successor detail. Do not infer present ownership from the earlier receipt.',
      expected:
        'Run context is unavailable and private successor facts remain absent.',
    },
    {
      id: 'recover-access',
      title: 'Recover only through new protected reads',
      body: 'The recording restores its synthetic access response, then explicitly rechecks assigned runs. This is a controlled comparison, not a real role grant. The Console obtains fresh discovery and exact detail before redisclosing the successor; it does not reuse hidden retained resources or submit another retry.',
      expected:
        'Current successor context returns after fresh reads, with no additional command.',
    },
    {
      id: 'second-failure',
      title: 'Observe a failed second attempt as a new snapshot',
      body: 'The fixture supplies a separately recorded terminal failure for attempt 2 and the operator rechecks. This scene does not execute the capability from the browser. Inspect the new failure as a snapshot, then review the same versioned retry policy rather than assuming each run receives a new allowance.',
      expected:
        'The second failed attempt is visible and still belongs to the same two-total-attempt budget.',
    },
    {
      id: 'exhausted',
      title: 'Stop at the total-attempt ceiling',
      body: 'Open retry review for attempt 2. The ceiling includes the initial attempt, so there is no third run to confirm. Exhaustion does not close the case or automatically escalate it. Browser escalation is a separate capability and policy decision, not a hidden retry action.',
      expected:
        'The total-attempt-limit explanation is visible and no executable successor confirmation is offered.',
    },
    {
      id: 'close',
      title: 'Leave without implying rollback',
      body: 'Cancel the exhausted review and close the selected run. Local private selection and retry-review subscription retire. No third run or escalation was requested. Closing this workspace cannot undo the earlier committed successor; return later only through fresh server-authorized discovery and detail.',
      expected:
        'Private run context is closed and the fixture still records exactly one successor.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Retry review is unavailable or unsupported.',
      guidance:
        'No command was created by the failed read. Re-establish current run access or sign in through the trusted local path when offered. A changed epoch/operation requires fresh facts. Do not call internal endpoints or treat a retained snapshot as authority.',
    },
    {
      symptom: 'The acknowledgement was lost or decoding failed.',
      guidance:
        'The retry may already have committed. Retain the original command, versions, policy, plan and ceiling and use only the explicit exact replay. If it never committed, replay may first commit that original intent. Do not manufacture a replacement ID; navigation may lose local replay coordinates and require trusted operator assistance.',
    },
    {
      symptom:
        'The successor is unavailable after a successful acknowledgement.',
      guidance:
        'The receipt describes history, not current access. Authority or supervision may have changed. Respect neutral absence and use fresh protected discovery/detail; replay never restores successor access after handover.',
    },
    {
      symptom: 'The retry limit is reached.',
      guidance:
        'Stop. The ceiling counts total attempts and cannot be reset by reloading, opening a new dialog or changing command IDs. This slice adds no third attempt, autonomous backoff or browser escalation. The case remains open for the separate approved recovery process.',
    },
  ],
  limitations: [
    'All scenes use marked synthetic BFF responses. Screenshots and counters establish browser protocol, presentation and disclosure behavior, not live OIDC, database atomicity, real provider execution or production rollout.',
    'No automatic mutation retry, general assignment, arbitrary recipient, adoption of an unrelated internal successor, lease, pause/cancel/branch, exhausted-run escalation, compensation or multi-step execution is implemented.',
    'Local replay intent is not persisted across reload, navigation or signing in again. Leaving is not server cancellation. Only the original command actor with current resolver evidence can obtain its historical replay; successor detail always requires its own current access gate.',
    'Verification covers Chromium and 320-pixel reflow. It is not a full cross-browser or production accessibility certification.',
  ],
};
