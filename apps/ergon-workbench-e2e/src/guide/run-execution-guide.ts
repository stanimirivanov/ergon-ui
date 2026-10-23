import type { GuideChapter } from './guide-chapter';

/** Assertion-backed operator guidance; all execution/authority facts are explicitly synthetic comparisons. */
export const runExecutionGuide: GuideChapter = {
  schemaVersion: 2,
  order: 23,
  slug: 'confirm-capability-execution-and-recovery',
  title: 'Execute the pinned capability and recover explicitly',
  summary:
    'Review an approved action, acknowledge irreversible admission, retry unchanged intent safely, distinguish admitted replay from additional recovery, and stop at VERIFYING rather than claiming case closure.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current run supervisors with current tenant-wide RESOLVER authority who supervise the existing pinned access-restoration action.',
  overview: [
    'Read Run actions as separate decisions, not stages that execute in order. The neutral approval panel records a prerequisite only. The action panels identify an external effect, a fresh successor with new safeguards, unassigned human follow-up, or untouched-only cancellation. These labels explain consequences, not permission: every relevant command still needs current server review and browser control. The execution dialog puts effective risk and the exact case scope before acknowledgement, with an irreversible-admission callout. There is no editable scope or capability argument override.',
    'Recovery has two deliberately different presentations. Uncertain result · preserve exact intent identifies a lost acknowledgement and offers Retry exact execution intent with the original IDs and fences; it may first admit the original operation. New dispatch · original reservation appears only inside a fresh recovery confirmation and can dispatch another explicit attempt. Historical acknowledgement · not current authority labels a recorded response, never permission to retain private facts or to execute again. Do not use color alone to distinguish them: read the heading, consequence and action label.',
    'The Resolver Console separates four questions: was a human prerequisite approved, was execution admitted, did the connector return a terminal result, and was the desired outcome independently verified? An APPROVED decision is not an execution command. This chapter adds deliberate execution of one pinned action. The server derives and consumes its exact approved authorization, commits an attributed command and first attempt, then performs connector I/O outside the admission transaction. Once admission commits, leaving the page, a lost response, later handover or later authority expiry cannot cancel the reservation or undo an external effect.',
    'All screens in this chapter use SIMULATED DATA and marked BFF responses. The browser genuinely opens the confirmation, validates acknowledgement, submits the documented session-CSRF protocol, withdraws private context before I/O, decodes responses and rechecks protected resources. The fixture controls epochs, lost responses, terminal receipts and projection checkpoints; it does not run a provider, enforce real authority or update PostgreSQL. Backend PR #164 separately verifies these boundaries with real database tests. The recording explains safe operator decisions without claiming a production end-to-end execution or an exactly-once guarantee from the screenshots.',
  ],
  prerequisites: [
    'Deploy the merged backend migration and compatible control plane before enabling ERGON_RUN_SUPERVISOR_EXECUTION_ENABLED. Commands default off. The browser must obtain its verified confidential session and a current assigned-run read; it cannot grant itself authority by selecting a tenant. First admission needs current supervision, current tenant-wide resolver evidence, unchanged supervision/run revisions and the exact latest approved request and decision within their window. The server derives the connector, capability and case scope. There is no arbitrary tool-argument editor or fallback to internal development endpoints.',
    'Know the difference between retrying original intent and admitting an additional recovery attempt. Retrying an already admitted command or attempt only reads acknowledgement. If the previous request never admitted that identity, the same POST may first admit and dispatch the original confirmed intent; an uncertain POST is not a side-effect-free status endpoint. Never change its IDs or revisions. Additional recovery requires the original actor to currently supervise with resolver evidence and confirm a distinct attempt UUID against the same command and current epoch. Handback needs its newer epoch; an incoming supervisor cannot adopt the command. Trusted operator recovery is necessary if the originator cannot return.',
    'Keep the workspace open while handling uncertainty. Only immutable intent and historical feedback are retained locally; RTK Query owns the current remote resources, RHF owns acknowledgement and session-CSRF tokens remain invocation-local. Nothing is persisted in a URL or browser storage. Navigation, reload or signing in again may discard replay coordinates, but none reverses a sent command. Remote adapters must enforce provider idempotency and bounded I/O. Reusing the same consumption key identifies one provider operation; concurrent explicit attempts can still reach that provider.',
  ],
  steps: [
    {
      id: 'open-assigned',
      title: 'Open assigned work, not a global execution queue',
      body: 'Choose Assigned runs in the verified tenant workspace. This list is an access-scoped discovery snapshot, not permission to execute every visible row. No execution-review request, CSRF setup or command is triggered merely by opening the view. The recording begins with one synthetic approved run and disabled execution rollout, keeping ordinary inspection available independently of commands.',
      expected:
        'Assigned discovery is visible, with no execution command or dispatch recorded.',
    },
    {
      id: 'inspect-approved-run',
      title: 'Inspect the pinned action and approved prerequisite',
      body: 'Inspect the assigned run. Read its pinned capability, effective risk, policy revision and the separate historical APPROVED decision. The run is still at revision zero without a terminal execution receipt. Approval answers a human prerequisite; supervision identifies the current responsible resolver. Neither fact performs the action or proves its outcome. The new execution control lives beside these recorded facts rather than replacing them.',
      expected:
        'The approved prerequisite, pinned identity.account.unlock action and explicit execution-review control are visible.',
    },
    {
      id: 'disabled-review',
      title: 'Respect the disabled backend boundary',
      body: 'Choose Review execution or recovery. This performs a fresh GET for current execution eligibility, not a POST. The modal explains that browser execution is disabled. Do not interpret this as a missing approval or a reason to call an internal route. Disabling commands leaves existing reservations and audit durable. Cancel the dialog if the deployment is not ready; reading the Console remains safe.',
      expected:
        'The disabled explanation is shown without an enabled confirmation, command or dispatch.',
    },
    {
      id: 'enabled-fresh-review',
      title: 'Read a separately enabled, fresh eligibility observation',
      body: 'The recording now switches to a separately controlled enabled response and reopens the modal. This fixture change is not an operator configuration switch in the real UI. Reopening performs another fresh review; it does not reuse the disabled observation or a pre-close pending result. The server-observed canExecute flag only permits the confirmation surface. The command must still recheck authority, revisions and approved scope when submitted.',
      expected:
        'A fresh review offers Confirm pinned capability execution for the exact disclosed run.',
    },
    {
      id: 'require-acknowledgement',
      title: 'Require deliberate acknowledgement before admission',
      body: 'Press Authorize and execute pinned action without selecting the acknowledgement. The form reports a local validation error. No command ID is submitted, no CSRF token is acquired and no reservation or provider operation is created. Read the irreversible boundary again: admission can commit before the browser receives a result. Form validation is not a server approval and must not be mistaken for one.',
      expected:
        'An accessible acknowledgement error appears and the execution-command count remains zero.',
    },
    {
      id: 'cancel-without-effect',
      title: 'Cancel review without changing server state',
      body: 'Cancel execution review. The modal dismisses and returns focus synchronously to its invoking control. Opening and cancelling a review never executes anything. This safe pre-submit dismissal is different from navigating away after admission: once the POST has been sent, the browser cannot promise cancellation or rollback. Use this pause to inspect the action and existing approval rather than treating the modal as an automatic continuation.',
      expected:
        'Focus returns to Review execution or recovery and no command or dispatch has occurred.',
    },
    {
      id: 'keyboard-narrow-review',
      title: 'Review risk and scope with keyboard and narrow layout',
      body: 'Reopen the confirmation at a 320-pixel viewport. Read the pinned action, capability, effective risk, policy revision, exact approved decision and supervision/run versions. Long identifiers wrap within the modal. Keyboard focus stays within the native dialog and the background cannot take focus; Escape cancels. Color is not the only risk cue. This verifies browser interaction and reflow, not a live provider authorization policy.',
      expected:
        'The acknowledged form remains keyboard-contained, accessible and usable without horizontal page overflow.',
    },
    {
      id: 'stale-confirmation',
      title: 'Reject a changed supervision epoch',
      body: 'After a new review, the fixture simulates an intervening supervision epoch before submission. Confirm the reviewed action. The server response is a definite conflict: the earlier intent cannot admit against changed coordinates. Private discovery and run context are withdrawn before the POST starts and stay hidden after the rejection. Do not modify the original tuple and resend it as though it were the same reviewed action.',
      expected:
        'Execution acknowledgement unavailable offers fresh run review; no provider dispatch was admitted.',
    },
    {
      id: 'refresh-after-conflict',
      title: 'Re-establish current facts before a new intent',
      body: 'Choose Recheck run before execution review. The workbench obtains fresh discovery and exact-run snapshots, restoring private content only after those gates succeed. The new epoch is now part of the disclosed facts. This recovery does not replay the conflicting command or assume that an older assigned row proves access. A new confirmation is required for the action because its previous reviewed coordinates no longer apply.',
      expected:
        'Current run context and the execution-review control return after successful fresh reads.',
    },
    {
      id: 'confirm-action',
      title: 'Confirm the exact pinned action explicitly',
      body: 'Open a fresh execution review and acknowledge the irreversible admission boundary. The recording holds the following POST response to expose the submission boundary. Confirm Authorize and execute pinned action once. The immutable intent carries one command UUID, exact approved request/decision IDs and reviewed supervision/run revisions. The confidential session supplies the actor; the browser supplies neither authority evidence nor arbitrary connector arguments.',
      expected:
        'One confirmed command starts and the modal closes before the held request can complete.',
    },
    {
      id: 'private-barrier',
      title: 'Withdraw private context before command I/O',
      body: 'While the command is held, inspect the pending surface. Discovery rows, private run policy, approval facts and inspection dialogs have been removed, not merely covered by a loading indicator. Focus moves to the persistent Resolution run heading after modal teardown. StrictMode must not replay the command. The message warns that admission may already have happened and does not offer automatic retry or claim that leaving cancels the effect.',
      expected:
        'Only the pending acknowledgement and stable pane structure remain; no private snapshot or dialog is disclosed.',
    },
    {
      id: 'lost-acknowledgement',
      title: 'Treat a lost response as uncertain, not failed execution',
      body: 'Release the synthetic response as a lost acknowledgement after reservation. The browser cannot infer admission or provider completion from a transport failure. It preserves the complete original intent and offers Retry exact execution intent. Read its warning: retry may first admit the original confirmation if the earlier request never arrived; an already admitted identity only acknowledges status. Never create another command ID or substitute coordinates because the response is uncertain. No automatic retry occurs.',
      expected:
        'The warning distinguishes possible first admission from admitted replay; this fixture already records one dispatch.',
    },
    {
      id: 'status-only-recheck',
      title: 'Retry unchanged intent and observe admitted replay',
      body: 'Choose Retry exact execution intent only if you still intend the original confirmation. Fresh CSRF precedes the identical POST. This recording deliberately lost its earlier response after admission, so this particular retry only reads status without redispatch. In a real uncertain incident the prior request may never have admitted anything; retry could first admit it under the original coordinates and current server gates. Here 202 INCOMPLETE confirms a reservation without a terminal receipt, not absence of an external effect.',
      expected:
        'Execution incomplete · external effect uncertain appears after exact replay, with no additional dispatch.',
    },
    {
      id: 'fresh-recovery-review',
      title: 'Review a separate recovery admission',
      body: 'After fresh protected Console reads restore current context, open execution review again. The server discloses the original command ID only to its originator and offers a new recovery attempt when eligible. This is not the same action as acknowledgement replay. Only the original actor, currently supervising with current resolver evidence, may proceed. A different incoming supervisor must not be offered adoption of the earlier browser command.',
      expected:
        'Confirm a new recovery attempt identifies the original command and current supervision/run revisions.',
    },
    {
      id: 'confirm-recovery',
      title: 'Acknowledge a new attempt on the original reservation',
      body: 'Acknowledge the distinct recovery wording and confirm a new recovery attempt. The browser creates a fresh attempt UUID, keeps the original command ID and uses the newly reviewed epoch. The server reuses the original consumption/provider key rather than deriving a second grant or extending its approval window. The fixture returns a durable receipt without a projected run transition so the next checkpoint remains explicit.',
      expected:
        'The new attempt has a distinct ID on the same command; feedback says Receipt recorded · run projection incomplete.',
    },
    {
      id: 'receipt-not-projection',
      title: 'Do not confuse a receipt with state advancement',
      body: 'Inspect the restored Console after RESULT_RECORDED. A terminal connector receipt may be visible while the run still has its earlier revision because projection has not finished. The acknowledgement deliberately keeps result fields null until the sequence-one event exists. This is not independent proof, closure or permission to invoke another unrelated action. Recovery must repair the existing deterministic projection rather than replacing the reservation.',
      expected:
        'The recorded connector result and revision-zero run remain distinct, with no verified case closure claim.',
    },
    {
      id: 'review-projection-repair',
      title: 'Confirm repair through the same recovery boundary',
      body: 'Open a fresh review and read the same original command identity again. Confirm another explicit recovery attempt only after acknowledging its meaning. When a durable terminal receipt already exists, the existing invocation service replays it without another connector call, then the result owner repairs the missing projection. The browser does not decide which persistence phase to bypass; it submits the bounded recovery contract and validates the acknowledgement.',
      expected:
        'Recovery remains tied to the same command and current epoch; projection repair adds no provider dispatch.',
    },
    {
      id: 'verify-not-close',
      title: 'Stop at VERIFYING, not verified resolution',
      body: 'Read Execution result recorded · not outcome proof and the newly fetched VERIFYING state. The historical sequence-one result says the connector succeeded and the run advanced. It does not independently observe the account, accept proof or close the case. Review post-action evidence and use the separately authorized proof-finalization workflow only when the pinned outcome actually matches. No fabricated live trace, cost, lease timer or multi-step execution is shown.',
      expected:
        'Fresh run state is VERIFYING, while proof acceptance and case closure remain unclaimed.',
    },
    {
      id: 'pending-revalidation',
      title: 'Hide the result during a protected recheck',
      body: 'Hold the next Console read and choose Recheck selected run. The execution receipt and private policy disappear immediately while the fresh request is pending, even though RTK may retain an earlier response internally. The persistent heading remains a focus target. A historical acknowledgement can remain labelled as historical feedback; it never substitutes for the current protected read or keeps private inspectors alive.',
      expected:
        'Pending run revalidation hides the earlier private result and policy without inventing a new command.',
    },
    {
      id: 'denied-revalidation',
      title: 'Respect lost access after execution',
      body: 'The fixture now releases that protected read as neutral absence. The workbench keeps the earlier private snapshot hidden and offers the safe read recovery appropriate to the failure. Durable execution is not undone, but a successful old command does not authorize continued disclosure. Leaving may discard local feedback. This final comparison is synthetic; real supervisor handover, expiry and tenant-isolation guarantees remain the responsibility of the backend tests and deployment policy.',
      expected:
        'Run context is unavailable, earlier private execution facts stay hidden and no extra dispatch occurs.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Execution review is unsupported or disabled.',
      guidance:
        'Keep inspection read-only. Check backend deployment and the separate default-off execution flag with an operator. Missing support is not revision zero or permission to call an internal endpoint. A failed access review withdraws the earlier snapshot; recheck current run access before trying again.',
    },
    {
      symptom: 'An acknowledgement is lost, times out or cannot be decoded.',
      guidance:
        'Preserve the original command or attempt UUID and every reviewed coordinate. Retry only if you still intend that original confirmation: if not yet admitted, it may first admit and dispatch; if already admitted, it only returns status. Never replace an ID to get past uncertainty. An additional recovery attempt against an admitted reservation requires fresh review and explicit acknowledgement with a distinct attempt ID.',
    },
    {
      symptom: 'A new supervisor cannot resume the original command.',
      guidance:
        'This is deliberate. Only the original actor with current resolver evidence and current supervision may admit recovery. A handback requires its newer epoch. Use the trusted operator process if the originator cannot return; no public production recovery API or browser adoption bypass is implemented.',
    },
    {
      symptom:
        'There is a receipt but the run has not advanced, or success is not closure.',
      guidance:
        'Receipt persistence, run projection, independent outcome verification and proof acceptance have separate owners. Explicit recovery can repair projection without reinvoking a recorded terminal receipt. SUCCEEDED reaches VERIFYING only. Follow the independent proof guide before accepting verified case closure.',
    },
  ],
  limitations: [
    'All identity, epoch, approval, reservation, connector and projection checkpoints are synthetic. This guide proves browser protocol and interaction behavior, not real authorization, PostgreSQL durability, provider idempotency, adapter timeouts or production recovery readiness.',
    'This chapter covers one approved pinned capability and explicit same-reservation recovery. Browser control, fresh-run retry, exhausted escalation and untouched-run cancellation have separate guides and do not cancel an admitted provider effect. General steering, arbitrary tools, compensation, live spans, automatic polling/retry, costs and autonomous workers are not implemented.',
    'Reload, navigation or session changes can discard local replay intent without undoing admitted effects. No continuous revocation claim is made between reads. Backend rollout, trusted operator recovery and provider guarantees require separate operational review.',
  ],
};
