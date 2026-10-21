import type { GuideChapter } from './guide-chapter';

export const runControlGuide: GuideChapter = {
  schemaVersion: 2,
  order: 28,
  slug: 'browser-run-control',
  title:
    'Hold explicit browser control without confusing it with execution authority',
  summary:
    'Acquire, renew and release session-bound control, recover exact uncertain intent, and distinguish expiry from cancellation of admitted work.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current run supervisors coordinating authenticated browser sessions.',
  overview: [
    'Supervision and browser control answer different questions. Supervision identifies the human responsible for a run; a control lease coordinates that supervisor’s authenticated server sessions. Only the current supervisor with current resolver authority can acquire control. A fence names one acquisition and prevents an old session or delayed command from first applying after control changes. It does not grant capability permission or replace approval, risk, policy, proof or CSRF checks.',
    'Leases last 120 seconds and renew only through an explicit command. The visible countdown estimates the server observation using local monotonic elapsed time; it is advisory, not an authority clock. The backend checks expiry exclusively after transaction lock waits. Tabs sharing the same server session also share its control. Closing a view, switching runs or losing a response does not release a lease or stop provider work already admitted.',
    'This chapter uses SIMULATED DATA. Browser requests, confirmations, schema validation, private-context retirement and visible recovery are real; fixture histories, competing sessions, expiry, cancellation and authority denials are synthetic. Backend PR #172 and ADR 0057 own PostgreSQL atomicity, immutable audit and authorization verification. Nothing here certifies live identity sessions, provider behavior or production readiness.',
  ],
  prerequisites: [
    'Deploy the additive control schema and every compatible backend writer/reader with ERGON_RUN_CONTROL_ENABLED=false, then deploy this UI. Quiesce browser command ingress and in-flight transactions before coordinated enablement. Old writers are unsafe when enforcement is enabled; process-local BFF sessions still require a single instance. Disabling is a deliberate policy relaxation, not rollback of an external effect.',
    'Start with a run currently supervised by the signed-in resolver. An explicit DISABLED status preserves rollout-off behavior; unsupported, denied, malformed or unavailable status never means disabled. Terminal runs accept no new lease. Retry successors acquire independently, and handover invalidates the outgoing supervision epoch without transferring its lease.',
    'Keep the workspace open while a command result is uncertain. Local intent retains the original UUID, revisions and fence, but is intentionally not persisted in URLs, storage or another server-resource cache. Reload, navigation or sign-in may lose those coordinates without undoing effects; do not invent replacement intent to hide uncertainty.',
  ],
  steps: [
    {
      id: 'available',
      title: 'Inspect before acquiring control',
      body: 'Open Assigned runs and inspect the prepared untouched run. Read Browser control available. Inspection obtains a protected status but does not acquire a lease or send a business command. First-application controls remain unavailable until current control is established; the server remains authoritative even after the button appears.',
      expected:
        'Available status appears, cancellation confirmation is absent, and lifecycle command count is zero.',
    },
    {
      id: 'open-authority-guidance',
      title: 'Inspect the compact bar’s authority boundaries with the keyboard',
      body: 'Current ownership, advisory countdown and eligible actions remain directly visible in the compact bar. Only static explanations are collapsed. Focus Browser control boundaries and press Space, then focus Supervision and authority boundaries and press Enter. Opening these native disclosures changes neither the selected run nor the URL and performs no protected read, acquisition, renewal, release or business command. Operational failures and exact recovery actions are never hidden inside these explanations.',
      expected:
        'Both explanations open with the keyboard, with unchanged protected-read and command counts.',
    },
    {
      id: 'interpret-authority-guidance',
      title: 'Distinguish presence, control and capability authority',
      body: 'The expanded guidance explains that assignment and resolver authority are checked by the server, control coordinates an authenticated session rather than a tab, and neither display grants tool authorization. Losing or releasing control does not stop admitted work. Close the explanations with Enter or Space to recover pane space: ownership, countdown, lifecycle actions and any uncertainty remain visible. This is local explanatory disclosure, not an authority toggle. At narrow width both collapsed and expanded states wrap in reading order instead of covering the execution panes.',
      expected:
        'Available control and acquisition stay visible while the explanations expand; closing them hides only static prose.',
    },
    {
      id: 'lost',
      title: 'Treat a lost acquisition response as uncertain',
      body: 'Acquire browser control once. The fixture commits acquisition but loses its response. Private context is withdrawn before network acquisition. Do not click a new acquisition or assume the lease was never created: retain the exact original lifecycle command and wait for its acknowledgement or explicit recovery.',
      expected:
        'Uncertain feedback offers Retry exact control intent; no automatic second acquisition occurs.',
    },
    {
      id: 'replay-control',
      title: 'Acknowledge the original acquisition unchanged',
      body: 'Retry exact control intent explicitly. The request preserves its command UUID, action and supervision epoch. Historical replay returns the original expiry rather than adding another 120 seconds. Fresh status then determines whether this session still holds control; a receipt alone cannot restore ownership after expiry or takeover by a later eligible session.',
      expected:
        'Both acquisition POST bodies are identical, one acquisition fence exists, and a fresh THIS_SESSION status appears.',
    },
    {
      id: 'renew',
      title: 'Renew explicitly while holding control',
      body: 'Read the advisory time remaining and choose Renew browser control. The request carries the acquisition fence, not a caller-selected session identifier, duration or time. Renewal preserves the fence but establishes a new server-owned validity interval. This static synthetic clock illustrates the protocol, not elapsed production time or automatic renewal.',
      expected:
        'A RENEW command carries the same acquisition fence and is followed by a fresh status read.',
    },
    {
      id: 'release',
      title: 'Release without cancelling admitted work',
      body: 'Choose Release browser control. The release carries that same fence and frees coordination for another eligible acquisition. It neither cancels a run nor revokes grants, terminates connector calls, accepts outcome proof or closes a case. Closing the Console is different: it simply retires this view’s requests and timers and does not send release.',
      expected:
        'Fresh AVAILABLE status replaces ownership; no cancellation has occurred.',
    },
    {
      id: 'other-session',
      title: 'Respect another authenticated session',
      body: 'The fixture now reports another session holding the lease. Recheck browser control to observe that state. No other-session identifier or fence is disclosed, and no forced takeover, renewal or business confirmation is offered. A countdown reaching zero is not evidence of acquisition; recheck status before making a new deliberate choice.',
      expected:
        'ANOTHER_SESSION is visible, without acquire, renew, release or cancellation confirmation.',
    },
    {
      id: 'expire',
      title: 'Recheck expiry before acquiring anew',
      body: 'The next prepared status reports that the earlier lease expired. Recheck rather than treating client time as authority. Expiry permits an explicit new acquisition under current supervision and resolver gates. It does not make an old uncertain business command eligible under a new fence; historical replay must keep its original coordinates.',
      expected:
        'EXPIRED status offers explicit acquisition but has not sent any lifecycle command automatically.',
    },
    {
      id: 'reacquire',
      title: 'Establish a new acquisition fence',
      body: 'Acquire browser control again only after reading the expired state. This is new reviewed lifecycle intent, not a mutation of the lost command recovered earlier. The backend allocates a monotonically later fence and a new lease identity. Old delayed first applications cannot borrow this fence, and a future handover or successor run cannot inherit it.',
      expected:
        'The new fence revision is greater than the first acquisition and current status enables separately reviewed commands.',
    },
    {
      id: 'narrow',
      title: 'Operate the presence controls at narrow width',
      body: 'Inspect the presence bar at 320 pixels and keyboard-focus Renew browser control. Labels, warnings and actions wrap inside the viewport; no countdown or color alone conveys ownership. Do not submit merely to test focus. The Console’s persistent execution heading remains the return target when a command or recheck withdraws its invoking control.',
      expected:
        'Keyboard focus is visible and the page has no horizontal overflow at 320 pixels.',
    },
    {
      id: 'confirm',
      title: 'Review a business command independently',
      body: 'Open the untouched-run cancellation review, read its separate eligibility, and acknowledge the narrow terminal boundary. Holding control is only a coordination prerequisite; the backend must still validate version zero, supervision, resolver evidence and absence of durable authorization or execution. The original acquisition fence is captured with this confirmation, never substituted during retry.',
      expected:
        'The acknowledged cancellation review is visible; no cancellation POST has yet been sent.',
    },
    {
      id: 'pending',
      title: 'Submit once behind the disclosure barrier',
      body: 'Submit cancellation while the fixture holds its response. Discovery rows, private Console facts and the modal are removed before I/O. The request carries the exact command UUID, supervision/run versions and captured control fence. A pending response cannot prove rollback or justify a second command. Focus moves to the persistent run heading.',
      expected:
        'One fenced business POST is pending, private policy text is absent, and focus remains on Resolution run.',
    },
    {
      id: 'uncertain',
      title: 'Keep the original business fence after a lost result',
      body: 'Release the held response as a simulated committed cancellation with a lost acknowledgement. The browser preserves the original intent rather than acquiring a new lease or refreshing its fence. An exact retry may acknowledge history without a live lease; if the first command never applied, only its supplied original still-valid fence can permit first application.',
      expected:
        'Retry exact cancellation intent appears with one synthetic cancellation and no automatic lifecycle or business retry.',
    },
    {
      id: 'replay-business',
      title: 'Recover history without renewing or redispatching',
      body: 'Replay the original cancellation explicitly. The request must match its original UUID, revisions and fence byte-for-byte in meaning. The synthetic history returns its acknowledgement without another cancellation or lease operation. Success then reacquires fresh protected run detail and control status; historical feedback never grants current private evidence access.',
      expected:
        'Both cancellation bodies match, cancellation count remains one, and TERMINAL control status is freshly observed.',
    },
    {
      id: 'terminal',
      title: 'Distinguish terminal state from accepted outcome proof',
      body: 'Read the returned CANCELLED run and Terminal run · no new control. There is no new acquisition or provider-stop action. Cancellation ends this untouched run, not the customer’s unresolved case, and no proof was accepted. Retry successors and handover recipients require independent current access and their own acquisition; the old receipt is not reusable authority.',
      expected:
        'Terminal detail is independently readable, no acquisition or renewal is offered, and no additional business effect occurs.',
    },
    {
      id: 'denied',
      title: 'Withdraw context when status access fails',
      body: 'The fixture now denies a protected control recheck. Earlier private policy and command controls disappear; a historical receipt may remain labelled as history. The browser does not reveal whether the run exists elsewhere, who holds another session or why current authority failed. Recover through protected reads rather than treating unavailable status as disabled enforcement.',
      expected:
        'Unavailable control and neutral context replace private detail without a new lifecycle or business POST.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'The countdown reached zero while a confirmation was open.',
      guidance:
        'The confirmation is retired and new submissions are unavailable. Recheck status, then deliberately acquire or renew as appropriate. Do not rewrite an uncertain original command with a fresh fence. Server expiry is authoritative and may reject even an apparently positive advisory countdown.',
    },
    {
      symptom: 'Another tab seems able to use the same lease.',
      guidance:
        'Tabs sharing one authenticated server session intentionally share its server-only holder binding. This is session exclusivity, not a tab mutex. A distinct authenticated session cannot use the fence for first admission; no raw cookie or holder identity is exposed to the UI.',
    },
    {
      symptom: 'An acknowledgement is lost or a stale-fence conflict occurs.',
      guidance:
        'On uncertainty, explicitly replay only the original intent. On a definite control conflict, obtain fresh run/control observations and review any genuinely new intent separately. Never automatically acquire and resubmit, rotate command IDs or infer that admitted provider work was cancelled.',
    },
    {
      symptom: 'Control is disabled or the endpoint is unavailable.',
      guidance:
        'Only the explicit DISABLED server state preserves default-off command behavior. A missing route, malformed status, denial or failed revalidation blocks commands. Coordinate schema, every writer and UI deployment before enabling; do not bypass the browser contract with internal endpoints.',
    },
  ],
  limitations: [
    'The fixture simulates competing sessions, durable receipt history, expiry and atomic cancellation; real database races, authorization and provider guarantees belong to backend verification.',
    'No autonomous renewal, forced takeover, tab-local lock, distributed BFF session store, global provider cancellation, live login or production enablement is implemented. Generated recordings and screenshots are local/CI artifacts, never committed.',
  ],
};
