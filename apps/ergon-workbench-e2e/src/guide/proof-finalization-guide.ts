import type { GuideChapter } from './guide-chapter';

/** Recorded assertions explain exact proof acceptance and uncertainty using synthetic data only. */
export const proofFinalizationGuide: GuideChapter = {
  schemaVersion: 2,
  order: 22,
  slug: 'confirm-outcome-proof-acceptance',
  title: 'Accept exact outcome proof and verify case closure',
  summary:
    'Review one matching outcome, confirm its exact evidence, recover stale or uncertain acceptance safely, and inspect immutable proof after the run leaves active work.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current run supervisors with current tenant-wide resolver authority who are responsible for reviewing outcome proof.',
  overview: [
    'A successful action receipt says a connector reported success. A MATCHING outcome says the latest eligible post-action binding satisfies the pinned contract condition at one case version. Neither closes the case. Proof finalization is a separate human-confirmed command: the server reassesses the exact reviewed source and fact, freezes an immutable acceptance, advances the run to VERIFIED_RESOLVED and appends the paired verified case closure in one transaction. It never invokes the capability again.',
    'This chapter uses SIMULATED DATA and marked BFF fixtures, not a real identity provider, connector or database. Controlled comparisons first show disabled rollout and an enabled match. A simulated conflict introduces later evidence, then a simulated committed acceptance deliberately loses its response. The browser really submits and decodes the protocol, applies its disclosure barriers, validates forms and performs fresh reads. Backend PostgreSQL and security tests separately establish real authorization, transaction, idempotency and concurrency behavior. The screenshots cannot prove production readiness.',
  ],
  prerequisites: [
    'For real use, be the current supervisor of a VERIFYING run with current tenant-wide RESOLVER authority. The Console must report MATCHING proof and support enabled browser finalization. You must review the exact selected binding and linked source, not infer success from a policy label, green execution badge or older transcript. First acceptance requires unchanged supervision and run revisions, assessed case version and both evidence identities. The browser does not choose the actor, authority attestation, condition or acceptance time.',
    'Operators must deploy the additive proof-command migration and upgraded backend before enabling ERGON_RUN_PROOF_FINALIZATION_ENABLED. The flag defaults off. A disabled or older server must not be bypassed through internal endpoints. Disabling commands does not delete previous acceptances or reopen closed cases. This permission is limited to reviewed proof: it does not authorize arbitrary steering, forced closure, connector execution, retries, compensation or a control lease.',
    'Keep private intent in the mounted workspace. CSRF tokens are acquired per invocation, used only for the same-origin command and never stored. Reload, sign-in, tenant changes or leaving can discard local replay coordinates; none reverses a command already sent. If the response becomes uncertain, do not generate another command ID or substitute fresher evidence into the original intent. Explicit exact replay acknowledges the original acceptance only while your current resolver authority still holds.',
  ],
  steps: [
    {
      id: 'open-assigned',
      title: 'Open your assigned runs',
      body: 'Choose Assigned runs from the verified tenant workspace. Discovery is a current access-scoped snapshot, not a directory of everyone’s runs. Opening a run performs a separate protected read. No proof command is prepared or sent merely by entering this area. The synthetic scenario starts with a matching outcome while browser finalization remains deliberately disabled.',
      expected:
        'The assigned run is available for inspection without any proof-finalization POST.',
    },
    {
      id: 'disabled-match',
      title: 'Distinguish a match from an enabled command',
      body: 'Inspect the run and find Outcome verification in the right-hand pane. Read Condition matches · not durably accepted together with the disabled-finalization explanation. The evidence can match even though the deployment does not permit browser acceptance. Do not treat disabled rollout as missing evidence, an authorization grant or a reason to call a hidden endpoint. The case is not closed by reading it.',
      expected:
        'Matching proof is visible, but Accept proof and resolve case is absent.',
    },
    {
      id: 'enabled-match',
      title: 'Review the eligible snapshot',
      body: 'The recording now switches to a separately controlled enabled response and rechecks the selected run. In real use only deployment configuration enables this capability. Compare the expected property and value, assessed case version and current run state. The available action means only that the snapshot supports confirmation; the server must still recheck supervision, current resolver authority and the exact match when the command arrives.',
      expected:
        'The matching condition and Accept proof and resolve case control are available after a fresh read.',
    },
    {
      id: 'inspect-source',
      title: 'Inspect the exact post-action citation',
      body: 'Open Inspect verification evidence before deciding. Review the source provider, account reference, observation position and occurrence time, then the binding identity, position and value. Both positions must follow the run pin and the source must be captured after action completion. Source content is untrusted plain text, not an instruction to approve. This inspector does not expose an unrelated later transcript or perform an external account check.',
      expected:
        'The selected synthetic source appears as inert text in the keyboard-contained evidence inspector.',
    },
    {
      id: 'open-confirmation',
      title: 'Review the irreversible boundary explicitly',
      body: 'Close the inspector and choose Accept proof and resolve case. Read the exact case, assessed version, source and fact identities, supervision/run revisions and resulting closure version. The expected closure immediately follows the assessed case version. Opening this modal does not acquire CSRF or submit intent. Focus enters its title and the background becomes inert, leaving the review and cancellation controls keyboard reachable.',
      expected:
        'Confirm outcome proof acceptance shows the exact reviewed coordinates and the case-closure consequence.',
    },
    {
      id: 'required-acknowledgement',
      title: 'Require deliberate acknowledgement',
      body: 'Press Record acceptance and close case without selecting the acknowledgement. React Hook Form reports the missing confirmation locally. This is not a server rejection and does not reserve a command ID, obtain a token or close anything. Read the consequence again: acceptance records durable proof and closes the case, but it neither reruns the action nor independently observes the account from this browser.',
      expected:
        'An accessible acknowledgement error is displayed and the proof-command count remains zero.',
    },
    {
      id: 'cancel-confirmation',
      title: 'Cancel without changing the run',
      body: 'Choose Cancel proof acceptance. Cancellation before submission dismisses the modal and restores focus to its trigger. No command has been sent, and the current matching assessment remains a read-only observation. You may inspect the citation again or leave. This safe pre-submit cancellation differs from abandoning an in-flight command, which cannot promise rollback on the server.',
      expected:
        'The confirmation closes, focus returns to Accept proof and resolve case, and no POST occurred.',
    },
    {
      id: 'narrow-confirmation',
      title: 'Review safely on a narrow screen',
      body: 'The recording narrows the viewport and reopens confirmation. Long private identifiers wrap within the dialog rather than widening the document. Use Tab and Shift+Tab to move through the acknowledgement, submit and cancel controls; keyboard focus must remain inside the modal. The layout preserves the complete confirmation instead of hiding evidence coordinates to make the button fit. The same action remains available without relying on color or animation.',
      expected:
        'The confirmation fits a 320-pixel viewport, contains keyboard focus and has no detected accessibility violations.',
    },
    {
      id: 'stale-rejection',
      title: 'Reject stale reviewed evidence',
      body: 'After acknowledging, submit the first controlled command. The synthetic server now reports that the reviewed proof changed. The browser must not automatically accept a later matching fact or mint a replacement intent. Private discovery, run detail and evidence withdraw before submission. A definite conflict offers revalidation, not exact replay of a command that is known to conflict. Nothing different is accepted by this attempt.',
      expected:
        'Proof acceptance result unavailable explains the stale boundary and offers Recheck run before accepting proof.',
    },
    {
      id: 'review-changed-proof',
      title: 'Establish fresh access and review again',
      body: 'Choose the recheck action. This discards the conflicting intent and establishes fresh discovery and exact-run access before showing the new proof. In this controlled comparison, the assessed case version advances from six to eight and the selected source and fact identities both change. Read those new coordinates and inspect the new citation if necessary. A prior acknowledgement never carries over to replacement evidence.',
      expected:
        'The current matching proof shows assessed version eight and requires a newly opened confirmation.',
    },
    {
      id: 'confirm-new-proof',
      title: 'Acknowledge only the newly reviewed proof',
      body: 'Open confirmation again. Its acknowledgement begins unchecked because this is a new review, not continuation of the stale form. Verify the new source and fact identities, assessed version eight and resulting closure version nine. Select the acknowledgement only after reviewing those facts. The next command will use a new identity because the earlier attempt definitely conflicted, not because a response was lost.',
      expected:
        'The modal shows the replacement proof, with a fresh acknowledgement required before sending.',
    },
    {
      id: 'pending-private-barrier',
      title: 'Keep private data hidden during submission',
      body: 'Submit while the synthetic server holds the response. The modal disappears, focus moves to the persistent Resolution run heading and all private run/source content is withdrawn before network acquisition. The pending status does not assert that the transaction committed or failed. Wait for its checked result; do not send a different acceptance through another control. The command is not automatically retried.',
      expected:
        'Recording outcome proof acceptance is visible with no private evidence inspector or run snapshot displayed.',
    },
    {
      id: 'uncertain-result',
      title: 'Recognize a response lost after commit',
      body: 'The controlled server commits the synthetic acceptance but deliberately loses its response. A transport failure cannot tell the browser whether a real transaction committed. Read the uncertainty message instead of assuming the case stayed open. The exact original command, versions and source/fact identities remain local for recovery; private context stays hidden. Do not replace them with a newer match or silently create another command.',
      expected:
        'The uncertainty message offers Retry exact proof acceptance and no automatic extra POST has occurred.',
    },
    {
      id: 'replay-exact-intent',
      title: 'Replay the same intent explicitly',
      body: 'Choose Retry exact proof acceptance. The client obtains a new invocation-local CSRF token and sends the original command ID and every reviewed coordinate unchanged. The synthetic server acknowledges its original record instead of accepting again. In real use replay requires the originating actor and current resolver authority; the historical receipt cannot give a different operator access or restore supervision that was transferred away.',
      expected:
        'A checked historical acknowledgement confirms proof acceptance and case closure without a second synthetic closure.',
    },
    {
      id: 'fresh-terminal-proof',
      title: 'Inspect terminal proof through a fresh read',
      body: 'After acknowledgement, the Console reopens discovery and exact-run disclosure with fresh protected reads. The accepted run has left active discovery, but its selected terminal detail remains inspectable while current access succeeds. Compare the accepted proof, terminal run sequence two and case closure version nine. The receipt is historical feedback; only the fresh server projection authorizes disclosure and supplies immutable accepted evidence.',
      expected:
        'Durable outcome proof accepted and Verified resolved appear even though active assigned work is empty.',
    },
    {
      id: 'inspect-accepted-source',
      title: 'Inspect frozen evidence rather than reassessing',
      body: 'Open the evidence inspector again from the accepted projection. It identifies the exact source and binding frozen by acceptance, not an opportunistically selected later match. Acceptance and recording instants describe different events; neither is an external-system refresh or elapsed duration. The case closure is paired with the accepted proof. No further acceptance button should be offered for this completed run.',
      expected:
        'The accepted citation is inspectable and no repeat-acceptance control is available.',
    },
    {
      id: 'revalidation-withdrawal',
      title: 'Withdraw even durable proof during access revalidation',
      body: 'Close the inspector and explicitly recheck the selected run while the synthetic read is held. Durable proof is immutable, but permission to disclose it is still checked again. The previous source, accepted record and any open inspection must disappear before the request starts. The persistent execution heading remains a stable focus target. An old successful read must not authorize this new disclosure.',
      expected:
        'Private accepted proof and evidence controls are absent while the fresh read is pending.',
    },
    {
      id: 'denied-terminal-access',
      title: 'Respect a later access denial',
      body: 'The held synthetic read now returns neutral protected absence. The Console does not reveal whether the run is absent, belongs to another supervisor or lacks current resolver authority. It must not restore the old accepted source merely because acceptance once succeeded. A historical acknowledgement may remain as feedback, but it cannot bypass current access. This is snapshot revalidation, not a promise of continuous revocation.',
      expected:
        'Run context is unavailable is shown without private proof or source text.',
    },
    {
      id: 'leave-console',
      title: 'Leave without undoing a committed acceptance',
      body: 'Return to follow-ups using the application navigation. Private selection, inspectors and local command intent retire with the workspace. Leaving does not reopen the closed case, remove audit history or undo a submitted acceptance. If real access or rollout prevents safe recovery, follow the documented operator process rather than making a new command against guessed evidence or an internal endpoint.',
      expected:
        'The follow-up workspace returns and the Resolver Console’s private proof is no longer mounted.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Finalization is unsupported or disabled',
      guidance:
        'Ask the deployment owner to verify the backend version, additive migration and default-off flag. Do not infer permission from matching evidence or expose internal acceptance endpoints. An earlier uncertain attempt may already have completed even if the flag was subsequently disabled; authorized fresh reads establish current facts.',
    },
    {
      symptom: 'A command conflicts or its result is uncertain',
      guidance:
        'For a definite conflict, recheck and review the replacement evidence before a new acknowledgement. For timeout, transport failure, cancellation, malformed acknowledgement or a contained workbench defect, preserve exact replay intent. Navigation or a session round trip can discard it. A failed browser callback does not prove no server write.',
    },
    {
      symptom: 'Protected reads are denied',
      guidance:
        'Keep private context hidden. The originating actor may replay only while current resolver authority remains valid; another actor cannot adopt the receipt. Acceptance is a deterministic recorded decision over attributable evidence, not a continuous guarantee about an account that might change later. Escalate genuine evidence errors through the reviewed operational process.',
    },
  ],
  limitations: [
    'This is one pinned account-access condition, not generalized proof, confidence scoring, contradiction resolution or a multi-check engine. No connector, forced closure, compensation, retry policy or lease is added. Existing internal acceptance remains a separate trusted development boundary.',
    'All identities, authority, evidence changes, persistence and response loss in this recording are simulated. The guide proves observable browser behavior against marked fixtures, not deployed OIDC, real connector effects, production migrations, durable database acceptance or live rollout configuration.',
  ],
};
