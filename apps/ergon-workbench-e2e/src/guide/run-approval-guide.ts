import type { GuideChapter } from './guide-chapter';

/** Substantial assertion-first synthetic walkthrough; no real identity, policy, request creation or execution is performed. */
export const runApprovalGuide: GuideChapter = {
  schemaVersion: 2,
  order: 19,
  slug: 'review-human-approval',
  title: 'Review and decide human approval prerequisites',
  summary:
    'Distinguish policy from current approval, inspect exact authority and expiry, confirm a human response, and recover a stale or uncertain command without executing a capability.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current run supervisors who also hold the exact approval authority required by a current request.',
  overview: [
    'Human approval is one prerequisite in Ergon’s deterministic authorization chain. A pinned policy label does not establish a current request. An APPROVED response does not issue a capability grant, invoke a connector, resume a run, or verify an outcome. A REJECTED response records the human’s immutable answer, not an automatic escalation or state transition. Inspect the separate execution and outcome panes for their own recorded facts.',
    'This chapter uses SIMULATED DATA and marked BFF fixtures. The recording explicitly swaps older-server, missing-request, requester-authority and expired snapshots, then exercises a stateful enabled decision scenario. These comparison switches are not real time travel or authority provisioning. A later replacement fixture advances its server observation beyond the original expiry. PostgreSQL/security tests, not these screenshots, establish durable backend authorization and concurrency.',
  ],
  prerequisites: [
    'For real use, you must be the current supervisor and hold current tenant-wide RESOLVER evidence to inspect the Console. A first decision additionally requires a WAITING_FOR_APPROVAL run, its latest unexpired request, the exact expected supervision revision and matching current authority. REQUESTER evidence must name this run’s case; resolver authority cannot substitute for it. Both approval and rejection use the same gates.',
    'Operators must deploy the additive approval-command migration and upgraded backend before enabling ERGON_RUN_SUPERVISOR_APPROVAL_ENABLED. Request creation remains a trusted internal runtime operation. You cannot create or extend requests, choose an actor or authority attestation, or enable the deployment flag in the browser. An unsupported or unavailable card is not permission to bypass the BFF.',
    'Keep private request/run identities and exact retry intent in this mounted workspace only. Navigation, sign-in or reload may discard uncertain-command intent; none undoes a decision already committed. Do not put private context, CSRF values or provider credentials into URLs, storage or diagnostics. Reopening always needs a fresh server access check.',
  ],
  steps: [
    {
      id: 'open-assigned',
      title: 'Open assigned supervision',
      body: 'Choose Assigned runs within a verified tenant session. This is your current assigned work, not a tenant-wide directory or permission to execute. Discovery provides only a snapshot; opening one run performs a separate exact access check. The initial controlled response intentionally represents an older server without approval review.',
      expected:
        'An assigned run is offered for inspection; no decision or token request has been sent.',
    },
    {
      id: 'open-unsupported',
      title: 'Recognize an older-server limitation',
      body: 'Inspect the run and find Human approval review. UNSUPPORTED means the server omitted the projection, not that approval is unnecessary or no request exists. The recorded policy inspector still describes the pinned requirement. Do not infer a pending request or supervision revision from that requirement, and do not call an internal endpoint.',
      expected:
        'The unsupported explanation is visible without approve or reject controls.',
    },
    {
      id: 'missing-request',
      title: 'Inspect a run without a recorded request',
      body: 'The recording now switches to a controlled NOT_REQUESTED response and rechecks the run. This operation reads; it does not create a request. In real use a trusted runtime must record one before the supervisor can decide. A policy requirement alone supplies neither request identity nor a validity window.',
      expected:
        'The card explains that request creation remains a trusted runtime operation.',
    },
    {
      id: 'requester-boundary',
      title: 'Review exact requester scope',
      body: 'The next controlled snapshot requires REQUESTER authority while the current supervisor has only resolver eligibility. Inspect the exact-authority label and decision-unavailable explanation. Case-scoped requester evidence and tenant-wide resolver evidence are different facts. Being responsible for supervision cannot promote one into the other; both approve and reject must remain unavailable.',
      expected:
        'REQUESTER · this case only is shown, with no decision controls.',
    },
    {
      id: 'expired-boundary',
      title: 'Read the exclusive expiry boundary',
      body: 'The expired comparison uses a server observation exactly equal to the request expiry. At that instant the request can no longer accept either outcome. A local countdown or browser clock would not establish validity. The request stays in audit history; only a trusted runtime may append a replacement after its expiry.',
      expected: 'EXPIRED is visible and no decision is offered.',
    },
    {
      id: 'eligible-request',
      title: 'Inspect a pending eligible request',
      body: 'The recording switches to a separately controlled eligible resolver request and rechecks. Read its request identity, exact authority, expiry and server-observation instant together with the pinned step and risk. The controls mean only that this snapshot reports eligibility; the server must recheck every gate when the command arrives.',
      expected:
        'PENDING and Approve prerequisite / Reject prerequisite are available.',
    },
    {
      id: 'open-confirmation',
      title: 'Open explicit approval confirmation',
      body: 'Choose Approve prerequisite. The native modal explains the immutable response and the boundaries it does not cross. Opening it prepares no command, obtains no token and changes no backend fact. Focus enters the dialog title and background content becomes inert; keyboard navigation stays within the dialog controls.',
      expected: 'The approval confirmation dialog is visible and focused.',
    },
    {
      id: 'require-acknowledgement',
      title: 'Require acknowledgement before recording',
      body: 'Press Record approval without checking the acknowledgement. The form reports its required understanding of the decision boundary. This is local form validation, not an authorization denial or a server decision. Inspecting the error must leave the command count at zero and must not acquire a CSRF token.',
      expected:
        'An acknowledgement error appears and no decision has been submitted.',
    },
    {
      id: 'cancel-decision',
      title: 'Cancel without creating intent',
      body: 'Use Cancel decision. Dismissal restores the live Approve prerequisite control and removes the form values from mounted disclosure. This cancellation happens before submission and therefore sends nothing. It differs from leaving after a POST, when the browser cannot promise to cancel or undo a server-side write.',
      expected:
        'The dialog closes, focus returns, and the command count remains zero.',
    },
    {
      id: 'open-stale-confirmation',
      title: 'Prepare a confirmed decision',
      body: 'Reopen approval and acknowledge the prerequisite-only boundary. The recording will now simulate an intervening supervision epoch while retaining this actor as current, like handover and return. The form is based on an earlier snapshot; it must not silently adjust its expected revision or claim continuing authority.',
      expected: 'The form is ready, but no command has yet been sent.',
    },
    {
      id: 'submit-stale',
      title: 'Submit against a stale supervision epoch',
      body: 'Record approval after the controlled epoch change. The workbench captures one command ID, exact request, outcome and expected revision. It removes the dialog, assignment rows and private run context before sending the command. The simulated BFF rejects the stale tuple; the UI must not increment the revision or retry automatically.',
      expected:
        'Approval result unavailable offers fresh revalidation rather than exact replay.',
    },
    {
      id: 'recover-stale',
      title: 'Revalidate before deciding again',
      body: 'Choose Recheck run before deciding again. This retires the rejected command and establishes fresh discovery and exact-run access before exposing another confirmation. A definite conflict differs from a lost response: making a new choice requires current context, not modifying the old command ID or reusing its obsolete epoch.',
      expected: 'Current pending review returns after fresh access succeeds.',
    },
    {
      id: 'prepare-held',
      title: 'Confirm a current request deliberately',
      body: 'Open approval again and acknowledge the boundary. The recording holds the next response after the synthetic decision has committed. Confirm only the reviewed request and intended outcome. The captured tuple will be retained for an explicit uncertain-result replay; opening or filling the form still performs no write.',
      expected:
        'The current confirmation is prepared with a new command identity.',
    },
    {
      id: 'send-held',
      title: 'Record while the response is held',
      body: 'Submit the prepared approval. The view first closes private disclosure and focuses the persistent Resolution run heading, then obtains invocation-local session CSRF and posts once. Inspect the pending feedback while the synthetic response is held. No optimistic decision, run-state advancement, grant or connector result is displayed.',
      expected:
        'Recording human decision is shown with private context and assignment rows absent.',
    },
    {
      id: 'uncertain-result',
      title: 'Treat a lost response as uncertain',
      body: 'The recording releases an unavailable response even though its synthetic decision is already recorded. Read the warning: lack of a valid receipt does not prove failure. A malformed, timed-out, cancelled or defective command response is similarly uncertain. Do not choose the opposite outcome or mint another command as a workaround.',
      expected:
        'Retry exact decision is offered and no automatic retry occurs.',
    },
    {
      id: 'replay-exact',
      title: 'Replay the unchanged decision intent',
      body: 'Choose Retry exact decision. The workbench obtains fresh CSRF but preserves the original command ID, request identity, outcome and supervision revision. The BFF acknowledges its original immutable receipt rather than recording another response. Replay cannot edit the historical answer and does not grant execution authority after later state or supervision changes.',
      expected:
        'A checked APPROVED receipt is shown; two matching attempts caused one synthetic decision.',
    },
    {
      id: 'reopen-decided',
      title: 'Read current facts after historical success',
      body: 'Reopen the assigned run after success revalidates discovery. Historical feedback did not substitute for current access. The card now reports DECIDED and the immutable APPROVED response; no second response is offered. The runtime state remains Waiting for approval because recording the human prerequisite is not a runtime transition.',
      expected:
        'DECIDED/APPROVED is visible alongside the unchanged runtime state.',
    },
    {
      id: 'open-rejection',
      title: 'Review rejection on a later replacement',
      body: 'The recording advances to a later synthetic server observation and a replacement request after the original expiry, then rechecks. Choose Reject prerequisite for that new request. This does not withdraw the earlier approval: it is a response to another immutable request. In production, only the trusted runtime creates such a replacement.',
      expected:
        'A separately identified pending request opens rejection confirmation.',
    },
    {
      id: 'narrow-confirmation',
      title: 'Inspect keyboard and narrow-screen confirmation',
      body: 'At 320 CSS pixels the three panes stack and the rejection modal remains scrollable without horizontal overflow. Tab and Shift-Tab stay inside the native modal; its background remains inert. Acknowledgement and the visible Cancel decision control are still reachable. Rejection is not communicated only through color or position.',
      expected:
        'The modal remains usable, keyboard-contained and free of tested accessibility violations.',
    },
    {
      id: 'record-rejection',
      title: 'Record the human rejection',
      body: 'Acknowledge and record rejection for the later request. The same authority, supervision, expiry and waiting-state gates apply as for approval. This records REJECTED once; it does not cancel the run, revoke an existing grant or automatically escalate. Those are separate explicit runtime capabilities with their own authorization and audit.',
      expected: 'A checked historical REJECTED receipt is displayed.',
    },
    {
      id: 'inspect-final',
      title: 'Verify what the browser actually knows',
      body: 'Reopen the run and inspect its DECIDED/REJECTED review and unchanged runtime state. The example has performed only synthetic human-response operations. The Console does not claim a grant, external action, proof or case closure. In real use continue with separately authorized runtime and verification capabilities rather than treating this card as execution permission.',
      expected:
        'The current rejection is visible, no second decision controls appear, and runtime state remains unchanged.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Approval review is unsupported or no request exists.',
      guidance:
        'Inspect the server version and trusted runtime request provisioning. The browser cannot invent request identity, enable rollout, create requests or use internal endpoints as a substitute.',
    },
    {
      symptom: 'The pending request has no decision controls.',
      guidance:
        'Check the current supervisor, WAITING_FOR_APPROVAL state, deployment rollout and exact authority. REQUESTER evidence must match this case; RESOLVER evidence is tenant-wide. A displayed policy requirement does not establish authority.',
    },
    {
      symptom: 'The request expired or another actor answered it.',
      guidance:
        'Recheck current facts. Expired requests cannot be extended; immutable decisions cannot be changed. A later request must be separately created by the trusted runtime after expiry.',
    },
    {
      symptom: 'The command result is unavailable.',
      guidance:
        'Use exact replay only when offered. Keep every intent field unchanged. Never infer that no write occurred from timeout, cancellation, malformed data or a client defect. Leaving loses local retry intent but does not undo a possible commit.',
    },
    {
      symptom: 'Approval succeeded but the run did not advance.',
      guidance:
        'This is expected: approval records only the human prerequisite. A separate deterministic authorization boundary must derive a bounded grant; execution and independent outcome verification remain distinct.',
    },
  ],
  limitations: [
    'All BFF, session, authority, epoch and decision facts here are synthetic. This recording proves browser behavior and labelled content, not real IdP login, PostgreSQL durability, production deployment or external execution.',
    'No browser request creation, delegated requester UI, scope editing, multi-approver policy, withdrawal, grant creation, execution, polling, lease or steering is provided. Server observation is a snapshot, not continuous revocation or a local validity timer.',
    'Navigation/reload may discard exact retry intent. Historical replay still requires the originating actor’s current resolver evidence on the backend and does not apply a new decision. Chromium is the tested browser; other engines and a live end-to-end deployment remain unverified.',
  ],
};
