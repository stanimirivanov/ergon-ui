import type { GuideChapter } from './guide-chapter';

/** Synthetic walkthrough of the assigned-only, read-only run Console. */
export const runSupervisionGuide: GuideChapter = {
  schemaVersion: 2,
  order: 16,
  slug: 'inspect-assigned-resolution-runs',
  title: 'Inspect assigned resolution runs',
  summary:
    'Find active runs assigned to your verified resolver identity, inspect their recorded state and execution policy, and recover safely when a fresh read fails or stops permitting disclosure.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Assigned supervisors reviewing an active resolution run without issuing execution commands.',
  overview: [
    'Assigned runs is a separate workbench view from shared and claimed human follow-ups. A supervisor assignment makes one run discoverable to its assigned resolver under current server-side authority; it does not claim an escalated follow-up or create an exclusive control lease. The Console deliberately reads only the reviewed browser projection: immutable run-start inputs and the latest recorded state. Its three panes organize assigned work, resolution execution context, and case/outcome boundaries. Select a run to read its private context on demand. The selection stays local to the current page, while the view name can remain in the tenant URL.',
    'This walkthrough uses a synthetic verified session, one assigned run, and controlled BFF responses. The fixture first exposes a run waiting for approval, holds a recheck so you can see stale context disappear, returns a temporary failure, then permits an explicit retry. It later reports a recorded resolved state while removing the run from the active list, and finally returns a neutral unavailable response. These are illustrations of browser behavior, not a real approval, resolution, assignment change, or revocation. Every recording and screenshot is labelled SIMULATED DATA. The actual BFF must establish exact assignment and current resolver authority on every read.',
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
      body: 'The resolution pane identifies the pinned contract revision, execution step, attempt number, start recording time, and current recorded state revision. The synthetic step requests identity.lookup. These fields explain which runtime inputs were recorded, not a live waterfall of tool calls. There are no invented spans, elapsed-time counters, token costs, or inferred intermediate transitions. A state timestamp indicates when the persisted state changed; it is not a measured end-to-end latency.',
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
      id: 'recheck-selected-run',
      title: 'Request a fresh assigned-only run read',
      body: 'Choose Recheck selected run after a pause or before relying on the snapshot. Ergon temporarily hides the previous private context while a fresh BFF request rechecks assignment and authority. It does not refresh a lock, renew a lease, approve the recorded capability, or resume execution. The fixture pauses this request so you can inspect the disclosure boundary instead of merely seeing a fast response.',
      expected:
        'Rechecking run access is visible while the old contract and step details are absent.',
    },
    {
      id: 'inspect-hidden-context',
      title: 'Wait without using stale private detail',
      body: 'During the pending read, the prior policy and pinned-step payload are removed from the page. An earlier successful response is not continuing permission to display the same private context indefinitely. Keep the selected identity in mind, but do not act on an old screenshot as if the recheck had succeeded. This behavior is browser disclosure control; it does not prove that cached memory has been securely erased.',
      expected:
        'The rechecking message remains visible, and the earlier private contract data stays hidden.',
    },
    {
      id: 'inspect-temporary-failure',
      title: 'Distinguish a failed read from definite absence',
      body: 'The controlled request now returns a temporary service failure. The Console keeps the old private payload hidden and offers an explicit read retry. A network or service error cannot establish whether the assignment remains valid, whether the run still exists, or whether execution has progressed. Read retries are bounded by the client’s transport policy; they never issue a mutation or recreate an assignment.',
      expected:
        'A run-read failure and retry control replace the private run snapshot.',
    },
    {
      id: 'retry-run-read',
      title: 'Retry only the failed read',
      body: 'Choose Retry run read once the synthetic service permits reads again. The retry asks the BFF for a new assigned-only snapshot of the same run. It does not trust the old response, replay an execution command, or assume authority from the tenant URL. If your session has expired, follow the trusted sign-in path instead of repeatedly interpreting transient failures as ownership changes.',
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
  ],
  troubleshooting: [
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
    'All assignments, identities, state transitions, and failures in this chapter are synthetic marked BFF responses. The walkthrough verifies browser requests, disclosure, recovery, and presentation; it does not verify live OIDC, database isolation, backend authorization, supervisor assignment, or genuine resolution.',
    'The delivered Console contains recorded start and current-state facts only. Case evidence, contradiction graphs, ordered execution spans, costs, exclusive control leases, handover, steering, authorization decisions, verification checks, and accepted outcome proof require separately reviewed backend slices. Waiting, resolved, risk, and approval labels do not supply those missing facts or commands.',
  ],
};
