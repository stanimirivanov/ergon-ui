import type { GuideChapter } from './guide-chapter';

/** Stateful synthetic handover and recovery walkthrough; never a live operational or identity-provider test. */
export const runHandoverGuide: GuideChapter = {
  schemaVersion: 2,
  order: 17,
  slug: 'hand-over-run-supervision',
  title: 'Hand over run supervision safely',
  summary:
    'Confirm a transfer to an eligible tenant resolver, distinguish supervision epochs from runtime state, recover a stale selection, and replay an uncertain command without handing over twice.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current assigned supervisors transferring responsibility for an active resolution run to another registered resolver.',
  overview: [
    'Supervision controls who may inspect the assigned run. It is not a lease, permission to execute a capability, an approval, follow-up ownership, or proof that the case is resolved. The original machine assignment and each subsequent transfer remain immutable audit facts; current access is derived from the latest supervision epoch.',
    'This executable chapter uses SIMULATED DATA and marked synthetic BFF responses. It explicitly switches a disabled rollout to enabled, simulates an intervening handover-and-return, holds a committed transfer response, and reloads with a synthetic recipient session. These fixture operations do not change a real deployment flag, identity-provider login, assignment, or database. Backend PostgreSQL and security tests provide different evidence.',
  ],
  prerequisites: [
    'For real use, the run must have an initial trusted machine assignment to your tenant actor, you must still hold current resolver authority, and the run must be active. Being able to see a run in a previous page is not enough: current supervision and authority are checked on each read and command.',
    'Operators must upgrade every backend supervision reader before enabling ERGON_RUN_SUPERVISOR_HANDOVER_ENABLED. Older binaries infer access from the original assignee and cannot safely serve traffic after a transfer. This browser cannot enable the feature, self-assign, override conflicts, choose an unregistered recipient, or recover a departed supervisor automatically.',
    'The current identity registry exposes eligible resolver IDs, not display names, emails or provider subjects. Confirm the recipient ID through your organization’s approved process. Do not put run IDs, directory IDs, tokens or private case context in shared URLs, persistent browser storage or external diagnostics.',
  ],
  steps: [
    {
      id: 'open-work',
      title: 'Open assigned supervision',
      body: 'Choose Assigned runs after the tenant session is verified. This navigation opens the supervision capability, not a tenant-wide run directory. Only current assigned work is returned; the list is a best-effort snapshot and may change between reads. Neither entering this view nor seeing a card executes or approves a capability.',
      expected:
        'The synthetic assigned run is visible while its private detail has not yet been requested.',
    },
    {
      id: 'open-disabled-run',
      title: 'Inspect the rollout-disabled snapshot',
      body: 'Open the run’s Inspect control. The exact-run read checks current access separately from discovery. In this first controlled fixture, the new server supplies a supervision revision but reports handover disabled. A disabled control is an operational boundary, not an invitation to call an internal endpoint or manipulate the browser flag.',
      expected: 'The run is readable and Hand over supervision is disabled.',
    },
    {
      id: 'disabled-boundary',
      title: 'Recognize an unavailable handover',
      body: 'The snapshot explains that handover is unavailable. An older backend that omits both handover fields is also treated as unsupported, never guessed to mean revision zero with enabled control. No transfer or token request is sent here. The recording next changes its synthetic rollout response and reloads; there is no user-facing enable switch.',
      expected:
        'No command has been sent and the read-only snapshot remains honest about its limits.',
    },
    {
      id: 'open-enabled-run',
      title: 'Open a newly enabled snapshot',
      body: 'After the recording’s explicit fixture switch, inspect the run again. The fresh response now permits handover from supervision revision zero. This revision belongs to the access relationship and is independent of the runtime state version shown in the execution pane. A flag alone is not authority: the server still checks current supervisor, resolver evidence, recipient and epoch.',
      expected:
        'The newly read snapshot offers Hand over supervision without a lease countdown or execution controls.',
    },
    {
      id: 'open-recipient-dialog',
      title: 'Open eligible recipient discovery',
      body: 'Use the handover control to open its native modal. Recipient discovery is a separate, bounded request tied to this exact tenant, run and expected supervision revision. The dialog cannot enumerate resolvers for an unavailable run. The recorded IDs belong to synthetic tenant resolvers; no provider subject or invented display name is disclosed.',
      expected:
        'The dialog receives the first page of eligible IDs and focuses its title; the background is inert.',
    },
    {
      id: 'require-confirmation',
      title: 'Verify that confirmation is explicit',
      body: 'Press Confirm handover without filling the form. The recipient selector and acknowledgement must both be completed. Field errors belong to the form and do not represent a server authorization decision. Opening the dialog or inspecting these errors sends no POST and obtains no CSRF token.',
      expected:
        'Both required-field errors appear and the command count stays zero.',
    },
    {
      id: 'next-recipient-page',
      title: 'Traverse eligible IDs without exposing a directory URL',
      body: 'Choose Next recipient page to see the remaining synthetic resolver. The private UUID cursor is retained locally, not added to the workbench URL. A new current-epoch read validates the page. Changing pages resets the form so a hidden previous-page selection cannot be confirmed accidentally. There is no stable total or guarantee that a listed resolver stays eligible.',
      expected:
        'The second page contains the twenty-sixth synthetic recipient and the previous-page control becomes available.',
    },
    {
      id: 'choose-cancelled-recipient',
      title: 'Review a recipient before cancelling',
      body: 'Select the resolver ID on this page. Selection is only local form state; it creates no assignment or audit event and does not change authority. The directory intentionally shows IDs rather than private identity-provider labels. In real use, verify the selected ID with the trusted organization process before proceeding.',
      expected:
        'The visible eligible recipient is selected, with no command sent.',
    },
    {
      id: 'cancel-handover',
      title: 'Cancel before creating a command',
      body: 'Cancel the dialog. Native dismissal restores the live invoking control. Candidate identities and editable form state leave the mounted disclosure; no transfer intent has been submitted. Cancellation at this point is different from leaving after a POST has been sent, which cannot promise to undo a server-side commit.',
      expected:
        'The dialog closes, focus returns to Hand over supervision, and the command count stays zero.',
    },
    {
      id: 'reopen-recipients',
      title: 'Obtain fresh recipient eligibility',
      body: 'Reopen handover. The first-page traversal and blank form return, but an older cached or pending candidate result cannot authorize the reopened dialog. The data-access gate acquires a distinct current-epoch read. You do not recover the cancelled selection or acknowledgement from browser persistence.',
      expected:
        'A new recipient read completes and the form starts without a selected recipient.',
    },
    {
      id: 'prepare-stale-intent',
      title: 'Select and acknowledge a transfer',
      body: 'Choose an eligible ID and acknowledge that supervision access will be transferred. This prepares a form, not a command. Immediately before confirmation the recording simulates a handover-and-return that advances the supervision epoch while leaving this actor current. The displayed earlier snapshot is now stale; the server must not treat its presence as continuing permission.',
      expected: 'The form is ready, but no transfer has yet been requested.',
    },
    {
      id: 'submit-stale-intent',
      title: 'Confirm against an outdated epoch',
      body: 'Confirm handover. The workbench captures an unpredictable command ID and the exact expected revision and recipient. It closes the dialog and withdraws private run context and assignment rows before POST. The controlled server rejects the old epoch. This is a definite conflict for this command, not an uncertain network result and not permission to increment the revision locally.',
      expected:
        'A stale-epoch problem is shown with no successful transfer receipt.',
    },
    {
      id: 'inspect-stale-recovery',
      title: 'Distinguish revalidation from exact replay',
      body: 'The conflict offers Recheck run before choosing again, not an automatic retry or an exact-replay button for a known rejected intent. Private content remains withheld. Do not modify the old command’s revision or recipient while reusing its command ID; a different confirmed intention must be formed only after fresh server context.',
      expected:
        'The conflict recovery is explicit and no second command is sent.',
    },
    {
      id: 'recover-current-run',
      title: 'Read current supervision again',
      body: 'Recheck the run before choosing again. Discovery and exact-run detail are read through their fresh gates; retained data cannot replace either. This fixture now returns supervision revision two while runtime state version remains zero. The difference demonstrates two independent revisions, not execution progress or proof. Real authority loss would keep the private snapshot unavailable instead.',
      expected:
        'Current access succeeds and the updated snapshot can support a new confirmed transfer.',
    },
    {
      id: 'reopen-current-handover',
      title: 'Start a newly checked handover form',
      body: 'Open handover from the current response. Recipient eligibility is requested for revision two. The previous stale command and form are not reused as if they had succeeded. The outgoing and incoming actors’ authority will be checked again at execution time, because a successful candidate read is only a best-effort eligibility observation.',
      expected: 'The current-epoch recipient page is ready for a new choice.',
    },
    {
      id: 'prepare-current-intent',
      title: 'Choose and acknowledge the current recipient',
      body: 'Select the synthetic recipient and acknowledge the effect on your access. This time the recording will hold the next POST response after simulating a durable transfer. The confirmation is about transferring supervision, not completing the run, accepting proof, consuming approval or transferring a human follow-up claim.',
      expected:
        'A valid current-epoch form is ready without a second POST yet.',
    },
    {
      id: 'send-held-command',
      title: 'Send one command after withdrawing context',
      body: 'Confirm the transfer once. The feature commits its submitting phase, closes recipient disclosure, moves focus to the persistent execution heading and hides the assigned rows and private run snapshot before the command starts. The adapter gets an invocation-local session CSRF token. The held response lets this recording show that no optimistic new owner or fabricated completion is displayed.',
      expected:
        'Transferring supervision is visible while the response is held and private context is absent.',
    },
    {
      id: 'inspect-pending-transfer',
      title: 'Wait without assuming cancellation or success',
      body: 'The controlled transfer is already recorded at the synthetic server, but the browser has not received a checked receipt. Its token and outgoing authority attribution do not enter the UI cache. Closing or navigating away after POST does not undo a server-side write and discards local exact-retry intent. Prefer waiting for bounded completion or follow the explicit recovery if the response fails.',
      expected:
        'Only pending command feedback is visible; no transfer is retried in the background.',
    },
    {
      id: 'inspect-uncertain-result',
      title: 'Treat an unavailable response as uncertain',
      body: 'The recording releases the held request with a marked unavailable-response problem, after the synthetic commit. The workbench cannot tell from that response alone whether transfer happened. It keeps the exact run, recipient, expected revision and command ID as immutable intent and offers only an explicit exact retry. The old run and directory remain hidden, rather than revealing retained cache data.',
      expected:
        'Retry exact handover is offered, with no spontaneous additional POST.',
    },
    {
      id: 'replay-exact-command',
      title: 'Recover the original receipt',
      body: 'Retry the exact handover. A fresh session CSRF token is obtained, but the command ID, recipient and expected supervision revision do not change. The synthetic server recognizes the originating actor’s historical command even though they are no longer current supervisor. It returns the original receipt without transferring again. A different actor or altered intent cannot obtain that replay.',
      expected:
        'The original supervision-revision-three receipt is returned without another ownership transition.',
    },
    {
      id: 'inspect-recorded-handover',
      title: 'Interpret the receipt and withdrawn assignment',
      body: 'Supervision handover recorded acknowledges a historical command result. It is not a continuing assertion about ownership after future transfers. Assigned work is read again; this outgoing actor’s active list is empty in the fixture. Empty discovery does not identify the new supervisor, prove deletion, establish resolution or give a route around the access gate.',
      expected:
        'The receipt is visible, private run context is absent, and the old supervisor has no active assignment in this view.',
    },
    {
      id: 'inspect-recipient-session',
      title: 'Recover work as the recipient',
      body: 'The recording reloads with a separately controlled synthetic recipient session. It does not perform a real identity-provider login or edit production membership. In an actual deployment the recipient signs in normally to the tenant and opens their assigned view. Current resolver authority and the transferred relationship are necessary on every read; knowing a run ID is never sufficient.',
      expected:
        'The synthetic recipient discovers the same immutable run under current supervision.',
    },
    {
      id: 'inspect-recipient-run',
      title: 'Read the unchanged run under the new relationship',
      body: 'Inspect the transferred run as the synthetic recipient. The pinned contract, initial assignment timestamp, runtime state, receipt and transition prefix are not rewritten by supervision handover. The current supervision epoch is three, while the runtime still waits for approval at state version zero. No lease, approval decision, execution or accepted proof is inferred from the successful transfer.',
      expected:
        'The recipient’s fresh exact-run gate reveals the same run with updated supervision metadata.',
    },
    {
      id: 'inspect-narrow-handover',
      title: 'Review the modal at narrow width',
      body: 'At a narrow viewport, open the recipient selector again without submitting another transfer. The modal retains a readable warning, labelled fields, keyboard-visible focus, inert background and bounded candidate pagination. Long resolver IDs remain inside the available viewport. The native modal and shared focus primitive own containment; the feature owns only the current form and command intent.',
      expected:
        'The dialog remains usable at 320 CSS pixels with no horizontal document overflow or accessibility violations.',
    },
    {
      id: 'finish-without-second-transfer',
      title: 'Leave the recipient’s run unchanged',
      body: 'Cancel the narrow-width dialog and return to the recorded run. This final cancellation creates no command and restores focus to the invoking control. The chapter has demonstrated a rejected stale intent, one uncertain committed transfer and its exact replay—not two completed transfers and not any runtime execution. Real operational acceptance still requires the backend rollout checks and identity-provider integration.',
      expected:
        'The dialog closes and the final synthetic command count remains three.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Recipient discovery fails and the Console disappears.',
      guidance:
        'Recipient discovery also rechecks current supervision. A failed lookup withdraws the earlier run snapshot and recipient dialog, even for a transient response. No handover command has been sent. Use the offered fresh run recovery or return to assigned work; sign in only through the trusted BFF link when offered. Do not reuse a selection from before the failed access check.',
    },
    {
      symptom: 'The handover button is unavailable.',
      guidance:
        'Read the current snapshot and deployment state. An older backend may not support handover, an operator may have left it disabled during reader upgrades, or the run may be terminal. The browser cannot enable it or infer revision zero from omission. Do not use an internal endpoint to bypass the boundary.',
    },
    {
      symptom: 'No appropriate recipient appears.',
      guidance:
        'Use the bounded recipient pagination and check the ID through the organization’s trusted directory process. Only other registered, currently authorized tenant resolvers qualify. This slice exposes no email, provider-subject search or display-name directory. Cancel and recheck if the selection was prepared under an old supervision epoch.',
    },
    {
      symptom: 'The expected revision conflicts.',
      guidance:
        'Recheck current run access before preparing a different confirmed command. The former supervisor may no longer be authorized. Never rewrite an old command’s expected revision or assume that the run-state version is the supervision revision; the two counters represent different facts.',
    },
    {
      symptom: 'POST timed out or its response cannot be confirmed.',
      guidance:
        'Treat the outcome as uncertain. While this mounted workflow retains the original intent, use Retry exact handover to obtain a receipt with the same command ID, recipient and expected revision. No transfer is retried automatically. Navigation or reload loses local retry intent and does not cancel a sent server-side write; recover current assignments through fresh authorized reads.',
    },
    {
      symptom:
        'Authentication, authority or current supervision is unavailable.',
      guidance:
        'Do not interpret unavailable access as proof that a historical command failed. Sign in through the trusted BFF path if offered, or return to assigned discovery. A stale cached snapshot must remain hidden; recovery for a departed supervisor, forced reassignment and notification delivery require separate reviewed capabilities.',
    },
  ],
  limitations: [
    'This is a simulated guide. Its session changes, eligible IDs, intervening epochs, durable transfer and lost response are fixture-controlled facts, not evidence of a real OIDC provider or deployment. Backend tests independently cover PostgreSQL transactions, concurrency, migrations, current authority and CSRF.',
    'Handover changes current supervision only. Initial machine assignment and handover audit remain immutable; runtime, case closure, approvals, grants, follow-up ownership, proof and notifications are unchanged. No control lease, live countdown, steering or continuous revocation guarantee is supplied.',
    'Once a real handover is durable, do not roll back to a binary whose access gates read the original assignment. Disable new commands and recover forward with projection-aware readers. The feature is disabled by default and must be enabled only after all backend readers are upgraded.',
  ],
};
