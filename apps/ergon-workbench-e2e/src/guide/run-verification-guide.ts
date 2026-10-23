import type { GuideChapter } from './guide-chapter';

/** Substantial operator guidance backed by browser assertions; all response changes are explicitly synthetic. */
export const runVerificationGuide: GuideChapter = {
  schemaVersion: 2,
  order: 21,
  slug: 'inspect-outcome-verification',
  title: 'Distinguish current verification from durable outcome proof',
  summary:
    'Read one pinned outcome condition, trace narrowly disclosed post-action evidence and distinguish a current match from immutable runtime acceptance.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current run supervisors with current tenant-wide RESOLVER authority.',
  overview: [
    'Successful execution and verified resolution are different facts. A connector receipt reports an action result. Verification evaluates the run’s exact pinned contract condition against eligible evidence captured after that action. A current match is a read, not a command: it does not freeze evidence, close a case or authorize anything. Only the separate explicitly confirmed acceptance command records immutable proof and paired verified run completion and case closure. This read-only comparison omits command support; the separate proof-finalization guide covers that confirmation when enabled and authorized.',
    'The outcome pane is condition-first: read the pinned property and exact expected value beside the selected actual value and assessed case version. No citation selected is not a measured failure or a fabricated check. Current assessment · not acceptance identifies mutable observations, including matching values; an explicit notice confirms that this assessment contains no durable acceptance. Only an ACCEPTED projection shows Stored proof · durable decision and a separate Recorded acceptance and case closure record with exact sequence, timestamps and closure version. Recorded run state remains below it as context, never a substitute for inspected proof. Input bindings in the leading Case evidence pane and post-action citations here have different scope.',
    'Every response in this chapter is SIMULATED DATA. The recording switches controlled snapshots to compare unsupported servers, ineligible states, missing evidence, mismatching values, mutable matches, durable acceptance and access failure. It does not create evidence, execute capabilities, accept proof or revoke real authority. Backend PostgreSQL tests exercise the actual evaluator and acceptance transaction. Screenshots establish browser behavior and explanation, not a live operational outcome.',
  ],
  prerequisites: [
    'Use a verified tenant session and an explicitly supervised run. Both current supervision and current tenant-wide RESOLVER authority are checked before private verification is read. Knowing identifiers, receiving an earlier successful response or seeing a recorded policy label does not grant access. A fresh read is required when recovering inspection.',
    'Deploy the additive outcomeVerification backend contract first. No database migration, new browser command or rollout flag is required for these reads. Older servers remain inspectable with an unsupported message. The existing pinned-evidence panel remains historical; this separate proof projection permits only the selected post-action binding and its exact linked source, never the complete later case history.',
    'The initial evaluator supports one account.access.state condition. Do not interpret it as a multi-check score or arbitrary model-generated verification. Source text and opaque references remain untrusted plain text. Observation occurrence, binding, acceptance and database recording time have different meanings; source-event database recording times are not supplied by this projection.',
  ],
  steps: [
    {
      id: 'open-runs',
      title: 'Open assigned supervision',
      body: 'Choose Assigned runs in the verified tenant workbench. The list shows only active assigned work, not every tenant case. Opening an entry performs a separate protected read. The initial synthetic response represents an older server that cannot project outcome verification; no command or assignment is performed.',
      expected:
        'The synthetic active assignment is available for exact-run inspection.',
    },
    {
      id: 'open-unsupported',
      title: 'Recognize an unsupported proof projection',
      body: 'Inspect the offered run and read the outcome pane. Missing projection means unsupported, not pending, failed or accepted. A terminal state label alone would still not disclose supporting proof. In a real deployment confirm backend rollout with an operator before relying on proof inspection; do not bypass the BFF with an internal route.',
      expected: 'The older-server explanation appears with no proof inspector.',
    },
    {
      id: 'not-assessed',
      title: 'Read the pinned requirement without assessing an ineligible run',
      body: 'Recheck against the supported waiting-state comparison. The expected property and value are available, but the run is not VERIFYING. The server therefore reports NOT_ASSESSED rather than running the evaluator or pretending that missing action execution is failed proof. The browser renders that distinction without deriving a checklist from runtime status.',
      expected:
        'The pinned condition is visible and no evidence or acceptance is asserted.',
    },
    {
      id: 'missing-evidence',
      title: 'Separate a successful action from missing outcome evidence',
      body: 'The next controlled snapshot records successful execution and VERIFYING, but contains no eligible post-action binding/source. An observation alone is insufficient until semantic binding exists. Both observation and binding must follow the run pin; source observation time cannot precede action completion. Recheck reads state only and never requests another connector invocation.',
      expected:
        'Outcome proof is pending because eligible evidence is missing.',
    },
    {
      id: 'mismatching-evidence',
      title: 'Inspect the latest eligible mismatch',
      body: 'The simulated evaluator result now selects a LOCKED binding where the pinned condition expects ACTIVE. Latest eligible binding order controls assessment, not whichever historical fact happens to match. A mismatch is a failed value comparison, not a general contradiction graph or permission to retry an action. Only that selected binding and source can be inspected.',
      expected:
        'The pane shows expected ACTIVE, actual LOCKED and the assessed case version.',
    },
    {
      id: 'inspect-mismatch',
      title: 'Trace post-action evidence without broadening case access',
      body: 'Open verification evidence and compare source position, binding position, account reference and separate occurrence times. This source follows the run’s pinned boundary, unlike the historical pinned-evidence panel. The narrow disclosure does not expose unrelated post-action observations, requester text or a full transcript. Source selection is the server evaluator’s result, not a browser search.',
      expected:
        'The exact selected source opens in a named modal with attributable identities.',
    },
    {
      id: 'narrow-provenance',
      title: 'Read literal source text with keyboard and narrow reflow',
      body: 'At 320 pixels use Tab and Shift+Tab within the modal, scroll the long source and read the unbroken token. The background remains inert. Markup-like text must stay literal without rendering an image or fetching a reference. Close with Escape to return focus to the invoking control; inspection changes local UI only.',
      expected:
        'The inspector remains keyboard-contained, wraps without horizontal overflow and renders no image.',
    },
    {
      id: 'matching-not-accepted',
      title: 'Recognize a current match that has not been committed',
      body: 'After closing the inspector, recheck the next synthetic snapshot. ACTIVE now matches, but this is still a mutable assessment at one case version. It must not show acceptance times, a verified case closure or a green completed checklist. Later eligible evidence can make the result pending again before a separate acceptance command commits.',
      expected:
        'Condition matches is explicitly labelled not durably accepted.',
    },
    {
      id: 'later-mismatch',
      title: 'Observe that an uncommitted match can change',
      body: 'The recording switches back to a mismatching current assessment and rechecks. This is a controlled comparison, not live evidence ingestion. It illustrates why a browser must never retain a matched result as permanent completion. Actual post-action ordering and latest-value selection are proved by backend tests rather than by these fixture changes.',
      expected:
        'Pending mismatch replaces the earlier current match without showing a closure.',
    },
    {
      id: 'durable-acceptance',
      title: 'Read immutable acceptance and paired closure',
      body: 'Recheck the terminal accepted snapshot. The runtime has frozen the exact evidence, assessed case version, acceptance occurrence and database recording time. The case closure immediately follows the assessed version, and the acceptance run sequence agrees with the terminal transition. These are durable records; the browser neither reassesses terminal proof nor accepts it on your behalf.',
      expected:
        'Durable accepted proof, run sequence two and verified case closure version seven are shown.',
    },
    {
      id: 'terminal-detail',
      title: 'Keep selected terminal proof separate from active discovery',
      body: 'Refresh assigned discovery after the synthetic active list becomes empty. Completed runs leave active discovery, but the already selected exact terminal detail can remain readable while current server access succeeds. A missing active row does not erase stored acceptance, and keeping local selection does not grant continuing authority.',
      expected:
        'The active list is empty while the separately authorized terminal proof remains visible.',
    },
    {
      id: 'hold-recheck',
      title: 'Withdraw private proof during revalidation',
      body: 'Recheck the selected run while the synthetic response is held. The previous acceptance, source controls and private context withdraw before explicit read acquisition. A historical response cannot justify continued disclosure. The persistent execution heading receives focus; recovery must obtain a new successful exact-run read before private proof reappears.',
      expected:
        'No private verification section or inspector remains during the pending read.',
    },
    {
      id: 'denied',
      title: 'Handle neutral access loss',
      body: 'Release the held response as missing or denied access. The Console intentionally does not reveal which condition applies or identify a replacement supervisor. Do not preserve the prior proof in an alternate cache or diagnostic. Authority-driven modal withdrawal is also covered by the component/cache regression with inspection open.',
      expected: 'Run context is unavailable and previous proof remains hidden.',
    },
    {
      id: 'recover',
      title: 'Recover fresh access without reopening old inspection',
      body: 'Retry after the fixture permits the current supervisor again. This comparison is not real authority provisioning. Fresh accepted proof can return, but the source inspector remains closed and must be deliberately reopened. Earlier local interaction cannot resurrect a private payload when authorization later succeeds.',
      expected:
        'Accepted proof returns through a fresh read with no automatically opened modal.',
    },
    {
      id: 'malformed',
      title: 'Reject inconsistent evidence rather than partial proof',
      body: 'Recheck a deliberately malformed response whose source position is not after the run pin. The browser validates chronology, subject attribution, successful action, state alignment and acceptance/closure coordinates before caching. Even otherwise plausible runtime data must not be displayed beside invalid proof; reject the complete Console response and use safe recovery.',
      expected: 'Invalid response withdraws all private run and proof content.',
    },
    {
      id: 'finish',
      title: 'Leave without executing a verification command',
      body: 'Return to follow-ups after the invalid-response comparison. The Console retires selection and all inspection state. This walkthrough has sent zero BFF writes: it has not approved, granted, invoked, retried, accepted proof or closed a real case. Operational acceptance commands and broader evidence workflows remain separately authorized capabilities.',
      expected:
        'The standard workbench returns with zero write commands recorded.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'A matching result is not marked resolved.',
      guidance:
        'This is intentional. A read cannot commit acceptance or case closure. Use the separately controlled runtime workflow; do not infer acceptance from a successful receipt or current value match.',
    },
    {
      symptom: 'Evidence is pending despite an observation.',
      guidance:
        'Check that a semantic binding exists, both positions follow the run pin and observation occurrence is no earlier than action completion. A later eligible mismatching binding supersedes an earlier match.',
    },
    {
      symptom: 'Proof disappears or the response is invalid.',
      guidance:
        'Re-establish current access through a fresh protected read. Report only safe contract diagnostics; do not copy source content into logs or render partial data to work around attribution checks.',
    },
  ],
  limitations: [
    'All case data, identity and snapshot transitions are synthetic. This guide proves Chromium presentation and interaction, not live OIDC, backend authorization, actual external outcome or production deployment compatibility.',
    'One account-access condition is supported. There is no multi-check completion count, confidence score, generalized contradiction model, complete later transcript, browser proof-acceptance command or continuous revocation guarantee.',
  ],
};
