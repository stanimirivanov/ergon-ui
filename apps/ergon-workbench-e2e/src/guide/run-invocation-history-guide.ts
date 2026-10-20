import type { GuideChapter } from './guide-chapter';

export const runInvocationHistoryGuide: GuideChapter = {
  schemaVersion: 2,
  order: 31,
  slug: 'gateway-attempt-history',
  title: 'Inspect recorded gateway attempts without inventing a live trace',
  summary:
    'Read preparations, exact per-call timing and uncertain effects; preserve privacy through fresh access checks without inferring dispatch, retry safety or outcome proof.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current run supervisors investigating recorded gateway activity, including terminal runs and work initiated under earlier supervision.',
  overview: [
    'The Console separates permission checkpoints, observed gateway activity, the winning terminal receipt, current run state and independent outcome proof. These are different facts with different authority. Gateway-attempt history adds recorded preparations and measured returns or exceptions, not a multi-step live execution tree. Preparation commits before possible I/O; a process can stop between those events. The modal never labels an incomplete preparation as currently running.',
    'Every response in this walkthrough is SIMULATED DATA. Real browser rendering, request retirement, decoding, keyboard behavior and responsive layout run against marked producer-owned fixtures. Switching fixture modes compares prepared observations; it does not contact a provider, provision identity, execute a command, verify PostgreSQL durability or demonstrate real authorization. Ergon PR #178 and backend ADR 0060 own actual persistence and authority. The synthetic business-command count remains zero.',
  ],
  prerequisites: [
    'Deploy merged Ergon PR #178 and its schema before relying on the browser projection. Current exact-run supervision and tenant-wide resolver authority are required. No browser control lease, original actor or enabled execution-command rollout is needed for this read. Existing verified-session and parent Console gates remain mandatory.',
    'Use an independently authorized known run in Assigned runs. Optional inspection is explicit and never preloaded by selection. Opening and rechecking require distinct protected observations, including after an earlier same-key pending request retires. Closing releases only this subscription; it grants no control or command rights.',
    'Interpret coverage as partial at every result size. Earlier calls and mixed-version writers are not backfilled. The first one hundred recorded preparations form a bounded database observation, not a causal sequence, stable cross-read prefix or total provider-call count. There is no continuous authority-monitoring guarantee or automatic polling.',
  ],
  steps: [
    {
      id: 'discover',
      title: 'Locate the read-only gateway inspector',
      body: 'Open Assigned runs and select the prepared run. Find Gateway-attempt history beneath the distinct admission records. Selecting a run must not fetch optional gateway history. Read the access explanation before choosing Inspect gateway attempts: current exact-run supervision and resolver evidence are checked independently, without acquiring browser control or supplying an originating actor or command identifier.',
      expected:
        'The inspector trigger is available and the synthetic gateway-history read counter remains zero.',
    },
    {
      id: 'empty',
      title: 'Interpret supported empty coverage narrowly',
      body: 'Choose Inspect gateway attempts. The first marked fixture contains a valid empty array. No gateway preparations recorded means exactly that this observation has no recorded preparations. Historical and older-writer calls are not reconstructed, and this endpoint supplies no backfill. Never use an empty list to conclude that the provider was never contacted, that no external effect happened, or that another execution is safe.',
      expected:
        'Supported empty feedback appears with no preparation rows; the partial-coverage warning remains visible.',
    },
    {
      id: 'recorded',
      title: 'Distinguish preparation, return and uncertainty',
      body: 'Recheck against four prepared examples, preserving their returned order. The first is a committed preparation with no completion: a crash may occur before dispatch, so neither live work nor no effect is established. The second records UNKNOWN after a gateway exception; provider effects remain unresolved. The third and fourth are gateway-reported success and failure, not independently verified outcomes. Inspect exact durations: 9223372036854.775807 ms preserves signed-Long precision, zero is a measured value, and 305.123456 ms retains submillisecond digits. UTC times deliberately backstep; never subtract them or total concurrent samples.',
      expected:
        'Four rows retain exact operation labels, uncertainty, timing provenance and server order, with no inferred causal trace or cost.',
    },
    {
      id: 'uncertainty',
      title: 'Inspect unresolved effects and exact timing',
      body: 'Scroll to the second preparation. UNKNOWN records an exception at the gateway boundary, not its private cause and not a terminal provider failure. Read the measured 9223372036854775807 nanoseconds and exact millisecond rendering together with the measurement source. Its completed observation precedes its start observation deliberately: monotonic elapsed time, not UTC subtraction, supplies the duration. Do not interpret this sample as permission to retry.',
      expected:
        'The unresolved row shows exact signed-Long precision, attribution and its explicit effects warning.',
    },
    {
      id: 'reported',
      title: 'Keep reported results distinct from proof',
      body: 'Inspect the third and fourth preparations. Gateway-reported success has a valid measured zero, while failure has a 305.123456 ms sample. Neither report establishes the current run state, winning receipt for all callers, independent outcome proof or case closure. Read each record on its own; do not add their durations into provider-operation latency, merge concurrent calls or correlate them with admission rows.',
      expected:
        'Success and failure remain separately reported outcomes with precise per-call samples and no new command action.',
    },
    {
      id: 'keyboard',
      title: 'Operate the inspection with keyboard and Escape',
      body: 'Focus Recheck gateway history and traverse forward and backward with Tab. Focus must stay within the native inspection modal, and background controls remain outside its interaction scope. Press Escape to close. Explicit dismissal returns focus synchronously to Inspect gateway attempts. Closing retires only this reader; it neither cancels provider work nor changes assignment, and another active reader must not lose its request.',
      expected:
        'Keyboard containment succeeds; Escape removes the modal and restores its live trigger.',
    },
    {
      id: 'narrow',
      title: 'Read exact observations at narrow width',
      body: 'Reopen at 320 CSS pixels. Long operation labels, UTC observations, source identifiers and decimal timing values must wrap within the modal rather than introducing horizontal page scrolling. Read the explanatory text as well as the status labels; color, motion and glass effects are not the sole carriers of meaning. The same layout uses the existing Console tokens and reviewed modal at desktop width.',
      expected:
        'The modal and document fit the narrow viewport, with all four preparation rows available.',
    },
    {
      id: 'held',
      title: 'Hide retained history before a pending recheck',
      body: 'The fixture holds the next protected response. Choose Recheck gateway history. Earlier preparation rows and their durations must disappear before the response settles, even though RTK may retain data internally. A pending read is not continuing disclosure authority. The persistent inspection heading receives focus rather than a disabled recheck button; no polling, execution request or automatic business retry begins.',
      expected:
        'Pending access feedback replaces all previous gateway rows while the held request remains unsettled.',
    },
    {
      id: 'denied',
      title: 'Withdraw earlier private context on protected denial',
      body: 'Release the held response as the recognized neutral private 404. Gateway history unavailable does not identify whether a run exists for someone else or which authority changed. The enclosing disclosure barrier removes the modal, prior Console facts and assignment rows before paint. Focus moves to the persistent Resolution run heading. A failed authorization observation must never become successful empty coverage or a fabricated no-completion row.',
      expected:
        'Safe unavailable feedback remains while private run facts, gateway rows and former discovery controls are withdrawn.',
    },
    {
      id: 'recovered',
      title: 'Reacquire both parent and optional history',
      body: 'Restore the marked recorded fixture and choose Recheck run access. Fresh discovery and exact-run gates must succeed before a new gateway observation can be opened. Then choose Inspect gateway attempts again. Recovery stores no history snapshot, creates no lease or role, and performs no command acknowledgement. The new observation derives only from the current protected response; previous data is not restored as authority.',
      expected:
        'A distinct protected read restores the four current rows and the synthetic command count remains zero.',
    },
    {
      id: 'unsupported',
      title: 'Recognize incompatible server deployment',
      body: 'Recheck against the prepared unknown missing-route response. Gateway history is unsupported is a compatibility state, not a supported empty array, disabled authority enforcement or a permission fallback. The independently gated parent Console stays available. Deploy the compatible backend before using this projection; do not call an internal endpoint or infer that historical provider activity is absent merely because this browser route is missing.',
      expected:
        'Unsupported feedback replaces all gateway rows without withdrawing the separately authorized parent or sending commands.',
    },
    {
      id: 'malformed',
      title: 'Reject unsupported outcome vocabulary',
      body: 'Switch to a synthetic completion claiming RUNNING and recheck. The released backend permits SUCCEEDED, FAILED and UNKNOWN only; live status cannot be inferred from this audit. Strict decoding rejects the entire observation, not merely the offending row, and the shared disclosure barrier withdraws earlier private context. Other malformed times, unsafe epochs and noncanonical durations are covered at the data-access boundary.',
      expected:
        'Safe unavailable feedback replaces malformed data; the old modal and all prior rows disappear.',
    },
    {
      id: 'truncated',
      title: 'Read the bounded window without inventing totals',
      body: 'Recover access and open a fixture containing one hundred preparations without completions and explicit truncation. The warning states that more records exist; it does not disclose a total or guarantee a stable prefix across later reads. Returned position is only a presentation key, never a call number or causal step. Repeated labels and missing completions remain valid without being deduplicated or assigned the winning receipt.',
      expected:
        'Exactly one hundred preparations appear with an explicit truncation warning and no invented completion.',
    },
    {
      id: 'context',
      title: 'Retire inspection with its parent gate',
      body: 'Close the modal, then hold a fresh selected-run read. Recheck selected run. The entire gateway-inspection section retires while parent authority is pending; earlier rows cannot survive in a hidden drawer or local resource copy. The persistent Resolution run heading remains focusable. Release the parent response successfully and observe a closed, newly available trigger rather than an automatically reopened historical observation.',
      expected:
        'Parent revalidation removes the optional inspector; successful recovery does not preload gateway history.',
    },
    {
      id: 'terminal',
      title: 'Inspect a freshly authorized terminal run',
      body: 'The fixture now compares terminal detail after active discovery has emptied. Recheck assigned runs, then explicitly inspect gateway attempts. Terminal status does not itself remove current supervisor read access; the exact-run gate must independently succeed. Prior supervisor epochs and internal execution can appear in this history, but rows do not identify actors, admissions, grants, provider references or recovery rights.',
      expected:
        'No active discovery row is required for the independently authorized selected terminal run to show four recorded preparations.',
    },
    {
      id: 'close',
      title: 'Finish without commands or inherited authority',
      body: 'Press Escape to retire the terminal observation and return focus to its trigger. Verify zero synthetic business commands. This inspector offers no execution, projection repair, recovery or safe-retry action based on history. Those workflows require their own fresh policy and explicit confirmation. Keep the winning receipt, projected state and accepted proof separate from per-caller measurements; a successful gateway report is not case closure.',
      expected:
        'The modal is closed, trigger focus is restored and the command counter is still zero.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'No preparations, no completion or UNKNOWN is shown.',
      guidance:
        'Empty history does not prove no external operation. Null completion means no completion was recorded, not running, no effect or zero duration. UNKNOWN records a thrown gateway call with unresolved effects, not a terminal provider failure. Do not dispatch another operation or assume retry safety based on any of these observations; use the separate approved recovery policy.',
    },
    {
      symptom:
        'Timestamps backstep or durations seem unrelated to elapsed wall time.',
      guidance:
        'UTC observations are not monotonic. Exact elapsed nanoseconds are sampled around each actual gateway call, excluding database work, and rendered with decimal placement rather than floating-point conversion. A measured zero remains a real sample. Concurrent callers keep separate timings, while the winning receipt remains a separate authoritative result; never sum or attach that result to every row.',
    },
    {
      symptom:
        'History is pending, unavailable, malformed, unsupported or truncated.',
      guidance:
        'Pending rechecks hide old rows. Protected failures withdraw the workspace; choose Recheck run access before requesting a new observation. Unsupported means a compatible backend must be deployed, not a successful empty response or internal fallback. Truncation means more records exist beyond the bounded window, without a count or stable prefix. Recheck deliberately, not as a live monitor.',
    },
  ],
  limitations: [
    "This is a simulated UI guide, not live OIDC, provider, database, immutable-audit or exactly-once verification. Generated video, screenshots and rendered book remain ignored artifacts and require visual review before sharing. Real authorization and persistence evidence belongs to Ergon's backend verification.",
    'No actor, command/attempt replay coordinate, grant, consumption, control fence, provider operation, raw payload or exception cause is exposed. There is no admission-to-call correlation, causal/nested trace, billing, retention/export, historical backfill, multi-step executor, automatic retry or new recovery authority. Read access is checked at observation time and can change before another operation.',
  ],
};
