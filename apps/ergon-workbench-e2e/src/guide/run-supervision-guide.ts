import type { GuideChapter } from './guide-chapter';

/** Synthetic walkthrough of the assigned-only, read-only run Console. */
export const runSupervisionGuide: GuideChapter = {
  schemaVersion: 2,
  order: 16,
  slug: 'inspect-assigned-resolution-runs',
  title: 'Inspect assigned resolution runs',
  summary:
    'Find active runs assigned to your verified resolver identity, inspect recorded state, ordered transitions, execution policy and attributed gateway-call measurements, and recover safely when a fresh read fails or stops permitting disclosure.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Assigned supervisors reviewing an active resolution run without issuing execution commands.',
  overview: [
    'This snapshot-and-measurement recording intentionally omits pinnedEvidence to demonstrate older-server compatibility. Its evidence panel therefore says unsupported, not empty. The separate Inspect pinned bindings and linked source evidence chapter covers the additive evidence contract, exact source provenance and its disclosure limits. Neither chapter fabricates general claims, confidence or contradiction meaning.',
    'Assigned runs is a separate workbench view from shared and claimed human follow-ups. A supervisor assignment makes one run discoverable to its assigned resolver under current server-side authority; it does not claim an escalated follow-up or create an exclusive control lease. The Console reads the reviewed browser projection: immutable run-start inputs, latest recorded state and a sanitized terminal execution receipt when supplied. One app-owned focused shell supplies branding and Back to follow-ups navigation, with the Supervisor presence toolbar above three explicit panes for assigned work, resolution execution context, and case/outcome boundaries. The toolbar can wrap without overlapping the panes, which stack in reading order at narrow width. Select a run to read its private context on demand. The selection stays local to the current page, while the view name can remain in the tenant URL.',
    'This walkthrough uses a synthetic verified session, one assigned run, and controlled BFF responses. The fixture first exposes a run waiting for approval, holds a recheck so you can see stale context disappear, returns a temporary failure, then permits an explicit retry. It later reports a recorded resolved state while removing the run from the active list, returns a neutral unavailable response, and demonstrates rejected pagination followed by a fresh first-page reset. These are illustrations of browser behavior, not a real approval, resolution, assignment change, or revocation. Every recording and screenshot is labelled SIMULATED DATA. The actual BFF must establish exact assignment and current resolver authority on every read.',
  ],
  prerequisites: [
    'In a deployed environment, sign in to the correct tenant using a registered resolver identity with current authority. An authorized machine workflow must already have assigned the run to that identity. This read-only browser view cannot assign a supervisor, and the walkthrough does not perform a real login or assignment.',
    'Know which run you intend to inspect. Compare its case and run identifiers rather than treating a contract name or status badge as a unique identity. Do not copy private context into shared URLs, browser storage, or external tooling. The browser selection does not provide continuing authorization.',
  ],
  steps: [
    {
      id: 'open-assigned-runs',
      title: 'Switch to assigned run supervision',
      body: 'Choose Assigned runs in the verified tenant workbench. The navigation changes the work view, not the authenticated identity or tenant authority. Unlike the follow-up inbox, this discovery endpoint lists active resolution runs assigned to the current actor. A tenant-wide count and other supervisors’ assignments are not exposed. Opening the view does not send an execution command or automatically read each run’s private detail.',
      expected:
        'The Resolver Console and one synthetic assigned run appear without a run-detail request.',
    },
    {
      id: 'inspect-discovery',
      title: 'Check the assignment and recorded state',
      body: 'Read the assigned run card before opening it. The run identifier, paired case, recorded state, state revision, and assignment time describe the returned snapshot. Waiting for approval is a runtime state, not an indication that the current viewer may authorize a capability. An empty list is similarly neutral: it means no active assigned work is visible in this view, not that a case was deleted or another supervisor took it.',
      expected:
        'The synthetic run is discoverable and the detail pane still asks you to select a run.',
    },
    {
      id: 'select-assigned-run',
      title: 'Open one assigned run with the keyboard',
      body: 'Focus the run’s Inspect control and press Enter. This starts a separate same-origin browser read for the exact tenant and run. The BFF checks that the authenticated actor is the assigned supervisor and has current resolver authority before returning the snapshot. The run card is only an entry point: it neither grants access independently nor causes other assigned runs to be read.',
      expected:
        'The selected run’s recorded start, current state, and pinned execution step load on demand.',
    },
    {
      id: 'inspect-run-snapshot',
      title: 'Interpret the run snapshot',
      body: 'The resolution pane identifies the pinned contract revision, execution step, attempt number, start recording time, and current recorded state revision. The synthetic step requests identity.lookup. The separate Connector result recorded card reports a succeeded terminal receipt and 305.123456 ms of gateway-call latency. These are deliberately synthetic receipt values, not a live execution in this recording. A receipt can be persisted before run-state projection, so Waiting for approval may remain beside a succeeded connector result. Neither is outcome proof. No live waterfall, elapsed-time counter or billing estimate is inferred from state timestamps.',
      expected:
        'Contract access-restoration, the verify-account-owner step, and the recorded waiting state are visible.',
    },
    {
      id: 'open-recorded-policy',
      title: 'Inspect the recorded execution policy',
      body: 'Open Inspect recorded execution policy. Its native disclosure can be operated with Enter or Space and reveals already returned data; it does not perform another request. Read capability, effective risk, required approval, and policy revision together. HIGH and RESOLVER are the policy inputs pinned to this run. They do not assert that someone approved it, that authorization was consumed, or that a write executed.',
      expected:
        'The recorded capability, risk, approval requirement, and policy revision appear without an approval control.',
    },
    {
      id: 'inspect-context-boundaries',
      title: 'Separate coordinates from evidence and proof',
      body: 'The case context pane shows the paired case identifier and the run’s pinned case-evidence stream version. This version is a boundary coordinate, not the source observations themselves. Evidence is not included in this browser read model. The outcome pane likewise states that verification checks and accepted proof are not included. Do not infer a desired-outcome claim, a contradiction, or success from these empty projections. They are honest limits of the delivered contract, not failed evidence acquisition.',
      expected:
        'The Console explicitly distinguishes its recorded context from unavailable evidence and outcome proof.',
    },
    {
      id: 'open-execution-measurement',
      title: 'Inspect measurement provenance with the keyboard',
      body: 'Focus Inspect execution measurement and press Enter. The native disclosure opens already decoded data without another request. It shows the runtime source identifier, exact integer nanoseconds and wall-clock start observation. The millisecond value above is an exact decimal unit conversion, not rounded through a JavaScript floating-point integer. The source identifies a gateway-call measurement; it does not identify a provider bill or create an authorization decision.',
      expected:
        'The measurement disclosure opens without another Console read.',
    },
    {
      id: 'inspect-measured-call',
      title: 'Read the limits of the gateway-call measurement',
      body: 'The synthetic sample is exactly 305123456 nanoseconds. It represents the winning receipt caller’s monotonic duration around its connector gateway call, not total provider-operation latency or the sum of uncertain retries. The fixture deliberately places the start observation after completion to illustrate wall-clock correction: subtracting UTC timestamps would be wrong. Nanosecond units do not promise that the clock has nanosecond resolution. Cost remains Not measured, and successful execution remains separate from verified resolution.',
      expected:
        'Exact duration and runtime provenance are visible while cost and outcome proof remain unestablished.',
    },
    {
      id: 'recheck-zero-measurement',
      title: 'Request a separately controlled zero-duration example',
      body: 'The recording switches its synthetic response to a valid zero sample. Recheck selected run to obtain it through the same fresh private-read gate. This fixture change demonstrates rendering, not a production receipt changing: real terminal receipts and their measurements are immutable. The UI must preserve a measured zero rather than treating it as missing data, while still issuing no execution command.',
      expected:
        'The newly gated synthetic response replaces the previous sample.',
    },
    {
      id: 'inspect-measured-zero',
      title: 'Distinguish measured zero from unavailable timing',
      body: 'Gateway-call latency now reads 0 ms. Zero is a valid recorded elapsed sample, not evidence that the provider did nothing or that resolution was instantaneous. The runtime measures one caller’s gateway call with the available monotonic clock resolution. Measurement provenance remains inspectable, and Cost stays Not measured. Do not substitute zero for an older receipt without a timing sample.',
      expected:
        'Measured zero is shown explicitly, not as Unmeasured or unavailable.',
    },
    {
      id: 'recheck-unmeasured-result',
      title: 'Request an older-writer failed receipt example',
      body: 'The fixture now returns a failed terminal result with null timing. Recheck deliberately to read this separate compatibility example. It does not retry the capability, reverse the preceding succeeded production receipt or perform a compensation. Older writers can record receipts without timing; a new reader must preserve that distinction rather than backfilling elapsed time from recording timestamps.',
      expected: 'A fresh read returns a failed result without a measurement.',
    },
    {
      id: 'inspect-unmeasured-result',
      title: 'Keep result availability separate from timing availability',
      body: 'Connector failed describes the recorded terminal result. Gateway-call latency is Unmeasured because this receipt contains no sample. That is different from measured zero and different from having no receipt at all. Completion and receipt-recording times remain useful observations, but their difference cannot recover the gateway-call duration. No measurement inspector is offered when there is no provenance to inspect. Failure does not supply outcome proof or an automatic retry control.',
      expected:
        'The failed result remains visible with Unmeasured latency and no invented zero.',
    },
    {
      id: 'recheck-no-receipt',
      title: 'Request a snapshot with no recorded terminal result',
      body: 'The fixture changes to an explicit null execution member and you recheck the selected run. This is a read-model example only, not removal of a real immutable receipt. The server can return no terminal receipt even if an external operation became uncertain before persistence. Treat the absence as a durability fact in this snapshot, never permission to repeat a potentially effectful operation.',
      expected: 'A fresh response contains no terminal execution receipt.',
    },
    {
      id: 'inspect-no-receipt',
      title: 'Do not interpret absent receipt as absent external effect',
      body: 'No terminal result recorded means exactly that the current projection contains no persisted result. It does not prove that no external effect occurred, that the action never started or that retries are safe. Connector and latency values from earlier responses are no longer displayed. The Console remains read only; recovery from execution uncertainty requires the runtime’s existing idempotency and authority contracts, not a browser-generated replacement command.',
      expected:
        'No terminal result recorded replaces the receipt without retaining old measurement values.',
    },
    {
      id: 'recheck-older-server',
      title: 'Request the older-server compatibility example',
      body: 'The fixture now omits the execution member entirely, matching a server deployed before the additive projection. Recheck to obtain that snapshot. Existing run-start, policy and state fields remain usable, but this reader cannot determine whether a receipt exists. Browser upgrades need not be blocked on simultaneous backend rollout; unknown projection support is deliberately not interpreted as an explicit null receipt.',
      expected:
        'The older server response remains readable without an execution claim.',
    },
    {
      id: 'inspect-older-server',
      title: 'Recognize unsupported projection instead of definite absence',
      body: 'Execution detail unavailable explains that this server did not supply the projection and receipt existence is unknown. This is not No terminal result recorded and not Unmeasured timing on a known result. Ask an operator about backend rollout if execution detail is expected. Do not estimate duration from run-state timestamps or manufacture zero cost; those facts remain unavailable even though the rest of the run snapshot is readable.',
      expected:
        'Unsupported execution projection is explicitly distinguished from absent receipt and unmeasured result.',
    },
    {
      id: 'restore-measured-snapshot',
      title: 'Return to the measured synthetic response',
      body: 'Recheck after the fixture restores its initial measured result. This final fixture switch prepares the disclosure tests that follow; it is not a production history of one mutable receipt. The gate must hide the previous compatibility example before requesting the next snapshot. The returned measurement belongs to the selected run’s exact pinned step and capability and is rendered only after the response passes decoding.',
      expected:
        'The fresh measured receipt returns through the ordinary exact-run gate.',
    },
    {
      id: 'inspect-result-state-boundary',
      title: 'Separate result, current state and outcome proof',
      body: 'Connector succeeded and 305.123456 ms appear again while the recorded state still says Waiting for approval at revision zero. Receipt persistence and state projection are separate runtime operations, so the browser never changes the displayed state merely because it received a result. Outcome proof remains absent. The following held recheck will withdraw the connector, duration and provenance together with all other private run facts.',
      expected:
        'The receipt does not manufacture state advancement or verified outcome.',
    },
    {
      id: 'recheck-projected-result',
      title: 'Read the separately projected capability result',
      body: 'The initial snapshot has an empty transition prefix at revision zero even though a receipt exists. The fixture now simulates the runtime’s separate result-projection command. Choose Recheck selected run to read revision one; the browser still issues only a GET. The actual writer records the immutable event and state change atomically. The receipt itself is unchanged, and its measured duration is not recalculated from the later event recording time.',
      expected:
        'A fresh gated snapshot contains the first durable transition and the Verifying state.',
    },
    {
      id: 'inspect-projected-history',
      title: 'Follow append order, not a fabricated execution waterfall',
      body: 'Recorded run transitions now contains 1 · Capability success projected, from Waiting for approval to Verifying. Sequence is append order; occurrence and database recording instants are separate observations, not extra latency measurements. This complete prefix ends at the returned state revision. A concurrent later append does not silently enter an older snapshot. The current runtime permits one capability result and one terminal decision per attempt, not nested calls or six invented stages. Source proof, authority identities, provider references and commands are not disclosed by this timeline.',
      expected:
        'One ordered state-transition card appears without advancing to resolved or adding proof detail.',
    },
    {
      id: 'recheck-selected-run',
      title: 'Request a fresh assigned-only run read',
      body: 'Choose Recheck selected run after a pause or before relying on the snapshot. Keyboard focus moves to the stable Resolution run heading while the private records and their controls withdraw. Ergon temporarily hides the previous private context while a fresh BFF request rechecks assignment and authority. It does not refresh a lock, renew a lease, approve the recorded capability, or resume execution. The fixture pauses this request so you can inspect the disclosure boundary instead of merely seeing a fast response.',
      expected:
        'Rechecking run access is visible while the old contract and step details are absent.',
    },
    {
      id: 'inspect-hidden-context',
      title: 'Wait without using stale private detail',
      body: 'During the pending read, the prior policy and pinned-step payload are removed from the page. The same focused shell and all three panes remain: assignment discovery is still identifiable, while the execution and outcome panes display withholding messages instead of retained facts. A pane placeholder is not an empty successful projection. An earlier successful response is not continuing permission to display the same private context indefinitely. Keep the selected identity in mind, but do not act on an old screenshot as if the recheck had succeeded. This behavior is browser disclosure control; it does not prove that cached memory has been securely erased.',
      expected:
        'The rechecking message remains visible, and the earlier private contract data stays hidden.',
    },
    {
      id: 'inspect-temporary-failure',
      title: 'Distinguish a failed read from definite absence',
      body: 'The controlled request now returns a temporary service failure. The Console keeps the old private payload hidden and offers an explicit read retry inside the execution pane. The outcome pane remains a separate withheld boundary, and the app header and Supervisor presence toolbar do not disappear or turn into a second nested workbench. A network or service error cannot establish whether the assignment remains valid, whether the run still exists, or whether execution has progressed. Read retries are bounded by the client’s transport policy; they never issue a mutation or recreate an assignment.',
      expected:
        'A run-read failure and retry control replace the private run snapshot.',
    },
    {
      id: 'retry-run-read',
      title: 'Retry only the failed read',
      body: 'Choose Retry run read once the synthetic service permits reads again. Keyboard focus moves to the stable Resolution run heading before the retry control disappears, keeping the pending and restored read anchored to the same pane. The retry asks the BFF for a new assigned-only snapshot of the same run. It does not trust the old response, replay an execution command, or assume authority from the tenant URL. If your session has expired, follow the trusted sign-in path instead of repeatedly interpreting transient failures as ownership changes.',
      expected:
        'A fresh successful run read restores the recorded contract and step.',
    },
    {
      id: 'inspect-restored-run',
      title: 'Continue from the fresh response',
      body: 'The same synthetic snapshot returns because the fixture still exposes the assignment. Review its state revision and timestamp again. A real server may return a later state or neutral absence; the earlier response does not constrain that result. The Console remains a read-only inspection surface, and restoring the snapshot makes no capability authorization, steering, or human-follow-up claim.',
      expected:
        'The run snapshot is visible again without an execution or claim command.',
    },
    {
      id: 'read-recorded-terminal-state',
      title: 'Recheck into a recorded terminal state',
      body: 'Request the selected run again after the fixture reports a recorded resolved state. The Console labels that terminal state while retaining the distinction between recorded runtime state and proof included in this response. It does not manufacture a verification checklist or accepted outcome artifact. To establish why a real run resolved, an authorized proof projection is needed; the current read model intentionally excludes it.',
      expected:
        'Recorded resolved replaces the earlier waiting state, with proof still explicitly not included.',
    },
    {
      id: 'inspect-terminal-transitions',
      title:
        'Distinguish recorded proof acceptance from inspecting its evidence',
      body: 'The synthetic terminal snapshot now has two transitions in append order: capability success projected, then outcome proof acceptance recorded. The final transition agrees with recorded resolved at state revision two. Its label reports a durable runtime decision; this browser projection still contains no accepted fact, observation, check result or independently verified proof payload. A production acceptance is immutable, and this recording merely changes controlled responses to illustrate browser presentation. Recheck deliberately for current access rather than treating an earlier timeline as continuing authority.',
      expected:
        'The two-event prefix agrees with the terminal state while proof evidence remains explicitly absent.',
    },
    {
      id: 'refresh-active-discovery',
      title: 'Refresh active assignments without discarding the selected run',
      body: 'Choose Recheck assigned runs. The active discovery list excludes terminal runs, so this synthetic refresh returns an empty page. The selected terminal detail remains available after the discovery read succeeds because its exact assignment may still permit inspection. Active-list membership and detail access are separate contracts. A failed discovery refresh would hide private detail instead of relying on an old page.',
      expected:
        'The list is empty while the already selected terminal run remains visible.',
    },
    {
      id: 'inspect-terminal-retention',
      title: 'Understand the empty list beside a terminal snapshot',
      body: 'The absence of active work does not contradict the selected terminal detail. The list answers which active runs are currently discoverable, while the selected read answers what recorded snapshot remains accessible for that exact assignment. Neither result reveals other supervisors or a tenant-wide total. The proof boundary remains unchanged even when the status says resolved.',
      expected:
        'The empty active list and recorded terminal state appear together without an outcome-proof claim.',
    },
    {
      id: 'close-private-run',
      title: 'Close the selected private context',
      body: 'Choose Close run when you no longer need the recorded snapshot. The selection and private detail disappear, and the Console again asks you to select an assigned run. Closing does not remove the durable assignment, release a follow-up claim, or change the runtime state. Private detail is not placed in a run URL or persistent browser storage for later disclosure.',
      expected: 'The selected contract and step are hidden immediately.',
    },
    {
      id: 'rediscover-synthetic-run',
      title: 'Refresh discovery before another inspection',
      body: 'The fixture now exposes an active assigned card again to demonstrate a separate access outcome. Recheck assigned runs before choosing it. This deliberately controlled transition is not a documented runtime reversal from resolved to waiting. Production state transitions remain deterministic server behavior; this recording changes fixtures only to cover the browser’s neutral absence response in one chapter.',
      expected:
        'The synthetic assigned card returns, without automatically opening its private detail.',
    },
    {
      id: 'open-unavailable-run',
      title: 'Request the card whose detail is unavailable',
      body: 'Open the synthetic card again. This time the BFF fixture returns the same non-disclosing absence problem used for a missing run, wrong assignment, or unavailable current authority. Discovery and detail may observe different moments, so an earlier card is not a guarantee that the next detail request will succeed. The UI must not reveal a competing supervisor or guess an authorization reason.',
      expected:
        'Run context is unavailable replaces the snapshot without restoring prior private details.',
    },
    {
      id: 'inspect-neutral-unavailable',
      title: 'Stop relying on the unavailable snapshot',
      body: 'Read the neutral unavailable state as a boundary, not a diagnosis. Confirm your tenant and session, refresh discovery, or ask an operator to investigate the server-side state when needed. Do not infer deletion, reassignment, revoked authority, or completion from this response. The previous private contract, policy, and step stay absent, and no approval, steering, or handover control is offered.',
      expected:
        'The neutral message reveals no owner or protected reason, and old private data stays hidden.',
    },
    {
      id: 'prepare-assignment-traversal',
      title: 'Refresh an assignment page with more results',
      body: 'The fixture now supplies an intact next-page cursor to illustrate rejected traversal recovery. Choose Recheck assigned runs to obtain that fresh first page. In a deployed environment, the server supplies both cursor values together; the browser keeps them local to this work view, not in a shareable run address. This fixture change does not create a real assignment or establish a stable historical snapshot.',
      expected:
        'The assigned run is visible and Next assigned page becomes available.',
    },
    {
      id: 'open-rejected-assignment-page',
      title: 'Recognize a rejected page boundary',
      body: 'Choose Next assigned page. This controlled request returns invalid-page for the paired cursor. The discovery view hides retained cards and private run context rather than guessing the next assignment. A rejected traversal is not an unavailable service, deletion, or evidence that someone else took the work. Repeating the same cursor does not repair it.',
      expected:
        'The page failure offers Return to first assigned page instead of Retry assigned runs.',
    },
    {
      id: 'reset-assignment-traversal',
      title: 'Restart from a fresh first page',
      body: 'Choose Return to first assigned page. Ergon moves keyboard focus to the persistent Resolution run heading before the recovery button disappears. That focus remains while the fresh discovery read is pending and after it succeeds. Ergon discards the local traversal history and private selection, then asks the BFF for the first page without either rejected cursor value. It does not simply uncover a retained first-page response: this recovery requires a fresh read. Inspect a returned run deliberately only after that read succeeds.',
      expected:
        'A new cursor-free first-page request restores the assigned list, with no selected private run.',
    },
    {
      id: 'inspect-reset-assignment-page',
      title: 'Continue from the restored discovery page',
      body: 'Check that Previous assigned page is disabled and the detail pane again asks you to select an assigned run. The rejected traversal and earlier private selection have been retired; a returned card is a fresh discovery result, not renewed permission to display a prior snapshot. If you inspect that card next, its exact run detail still needs a separate current assignment and authority check. Resetting pagination issues no execution or ownership command.',
      expected:
        'The first page is visible beside an unselected detail pane, with no retained private snapshot.',
    },
  ],
  troubleshooting: [
    {
      symptom:
        'The Console becomes taller when controls wrap or the view is zoomed.',
      guidance:
        'Use the stacked panes in their reading order: assigned work, resolution run, then outcome proof. The shell allocates space from the actual toolbar content rather than an assumed fixed header height. Back to follow-ups restores the standard workbench; it changes the work view and retires private selection, not the assignment or runtime state. Browser regressions cover narrow reflow and the effective CSS width of a 200%-zoomed desktop view; the recording itself uses its declared capture viewport.',
    },
    {
      symptom: 'You closed a run while its private read was still pending.',
      guidance:
        'Closing removes private detail immediately; it does not change the assignment or issue an execution command. Reopening establishes a distinct fresh read instead of displaying the response from before the close. A read shared with another active viewer may finish first, so the loading gate can remain visible while that older request settles. Do not treat the wait as lost assignment or repeatedly reopen to force transport cancellation. Cache and component regressions cover immediate pending reopen and shared-reader retirement; this recording closes an already fulfilled snapshot.',
    },
    {
      symptom: 'The assignment page is invalid.',
      guidance:
        'Use Return to first assigned page. The action clears the rejected paired cursor and requests a fresh first page, keeping keyboard focus on the persistent Resolution run heading as the recovery control retires; do not retry the same traversal or put private cursor values into a bookmark.',
    },
    {
      symptom: 'A workbench error replaces the run snapshot.',
      guidance:
        'Stop relying on the previous snapshot. Retry run read explicitly requests a fresh gated snapshot; contact an operator if the defect persists. This state means an unexpected client or dependency failure, not an unusable server response or lost assignment. No private diagnostics or automatic defect retries are exposed. The recording demonstrates HTTP recovery states; defect containment is verified by cache and component regression tests, not simulated as an HTTP problem.',
    },
    {
      symptom: 'Assigned runs is empty even though you expected work.',
      guidance:
        'Confirm the tenant and verified session first, then recheck discovery. Only active runs assigned to your identity under current resolver authority are returned. Ask an operator to check assignment and authority server-side; an empty page does not reveal which condition changed.',
    },
    {
      symptom: 'Run context could not be read.',
      guidance:
        'Wait for the service or connection to recover, then use Retry run read. The previous private snapshot remains hidden. A transport failure is not proof of lost assignment, and read recovery does not authorize execution.',
    },
    {
      symptom: 'A resolved run disappears from active discovery.',
      guidance:
        'Terminal runs are excluded from the active list. A selected terminal detail can remain readable under the exact assignment and current authority. Its status alone does not provide the verification checks or accepted proof omitted by this projection.',
    },
    {
      symptom: 'Run context is unavailable after selecting a visible card.',
      guidance:
        'Stop using the old payload and refresh discovery. The absence response deliberately does not identify deletion, another assignee, or an authority change. Do not work around it with an internal endpoint or a guessed run URL.',
    },
  ],
  limitations: [
    'Transition history is the complete immutable prefix through the returned revision, currently at most two events per attempt. The synthetic empty, projected and terminal responses demonstrate browser interpretation, not actual atomic appends. Recorded proof acceptance supplies no inspectable proof payload; append sequence is authoritative even after clock correction.',
    'All assignments, identities, state transitions, and failures in this chapter are synthetic marked BFF responses. The walkthrough verifies browser requests, disclosure, recovery, and presentation; it does not verify live OIDC, database isolation, backend authorization, supervisor assignment, or genuine resolution.',
    'The Console renders sanitized terminal receipt metadata and exact monotonic gateway-call latency when supplied, not a live execution trace. Missing projection, null receipt, unmeasured result and measured zero are distinct. All receipt/timing examples here are synthetic and switched explicitly between reads; production receipts are immutable. The recording does not establish real measurement accuracy, provider operation latency or billing. Connector success is not run-state advancement or outcome proof.',
    'Case evidence, contradiction graphs, multi-step execution spans, real cost attribution, exclusive control leases, handover, steering, authorization decisions, verification checks, and accepted outcome proof require separately reviewed capabilities. Waiting, resolved, risk, and approval labels do not supply those missing facts or commands.',
  ],
};
