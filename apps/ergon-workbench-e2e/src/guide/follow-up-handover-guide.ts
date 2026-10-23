import type { GuideChapter } from './guide-chapter';

export const followUpHandoverGuide: GuideChapter = {
  schemaVersion: 2,
  order: 35,
  slug: 'hand-over-owned-follow-up',
  title: 'Hand over owned follow-up work safely',
  summary:
    'Confirm a recipient, withdraw private context before sending, recover a lost acknowledgement exactly, and inspect independently authorized recipient context.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Resolvers transferring an open human follow-up that they currently own.',
  overview: [
    'A follow-up handover transfers responsibility directly to another eligible resolver. It is not release to the shared queue, run-supervisor handover, capability authorization or case completion. The backend replaces the current claim atomically: no other resolver can claim an intermediate unowned item. The recipient receives a new claim and the ownership revision advances by two. The old claim remains historical attribution rather than continuing access.',
    'This chapter uses marked synthetic BFF responses, registered actor UUIDs, notes and timestamps. It deliberately models a transfer whose response is lost after the ownership change. The final identity switch is performed by the test fixture, not a product account-switching control. The walkthrough verifies browser behavior, accessibility and privacy withdrawal; backend integration tests separately establish transaction, authorization and persistence guarantees.',
  ],
  prerequisites: [
    'Sign in to the intended tenant using your registered identity with current resolver authority. Open your current item from Claimed follow-ups. An old card, cached response or historical receipt cannot establish current ownership. The server rechecks the current claim, expected revision, open work and authority when processing the command.',
    'Obtain the intended recipient’s internal Ergon actor UUID through your authorized coordination process. An email address, display name or identity-provider subject is not this identifier. There is no actor directory or autocomplete here. Confirm the UUID before sending; the recipient must be a different, currently eligible resolver in the same tenant.',
    'The backend handover feature must be enabled by the deployment operator after compatible clients are deployed. Its default-off setting can produce a neutral unavailable response even when the browser shows the form. Do not change identifiers or retry blindly to bypass deployment policy.',
  ],
  steps: [
    {
      id: 'handover-review',
      title: 'Review the exact ownership change',
      body: 'Open Hand over follow-up in the owned Resolver Console. Read the original claim and ownership revision alongside the transfer consequences. The form is a deliberate confirmation boundary, not an instant reassignment control. Private case context and notes become unavailable to the sender after transfer. Existing run supervision is separate and is not reassigned by this command.',
      expected:
        'The confirmation dialog explains loss of access and displays the current claim coordinates.',
    },
    {
      id: 'handover-validation',
      title: 'Supply a complete recipient and acknowledge access loss',
      body: 'Confirming an empty form displays accessible field errors without sending a handover. Enter the complete internal actor UUID and acknowledge the ownership and private-access change. The browser can validate identifier syntax but cannot establish recipient eligibility. The backend deliberately gives one unavailable-recipient result for absent, foreign-tenant, expired or otherwise ineligible actors, avoiding an identity lookup oracle.',
      expected: 'Required-field guidance appears and no command has been sent.',
    },
    {
      id: 'handover-cancel',
      title: 'Cancel without changing ownership',
      body: 'Press Escape or choose Keep my ownership before confirmation. The dialog closes, its recipient draft is discarded and focus returns to Hand over follow-up. Canceling this unsent form has no server side effect. This differs from leaving a pending or uncertain handover: once a request has been sent, closing the view cannot retract a transfer that may already have committed.',
      expected:
        'The dialog is removed, focus returns to its trigger, and reopening shows a fresh form.',
    },
    {
      id: 'handover-narrow',
      title: 'Use the same confirmation on a narrow screen',
      body: 'At 320 pixels the dialog remains within the viewport, long UUIDs wrap and controls remain reachable by keyboard. Focus stays inside the modal; background Console controls cannot be activated behind it. The heading can be focused to return to the start of long content. These interactions do not weaken the acknowledgement or server checks on smaller devices.',
      expected:
        'The narrow dialog has no horizontal overflow and keyboard focus remains contained.',
    },
    {
      id: 'handover-disabled',
      title: 'Recognize an unavailable deployment',
      body: 'The first simulated confirmation returns handover unavailable. The old case, claim details, evidence inspector and note draft have already been withdrawn before the POST begins. The browser does not restore them because the command failed, nor does it automatically resend the POST. Check deployment availability with an operator instead of changing the recipient or inventing another interpretation of the response.',
      expected:
        'A safe unavailable message replaces private context, with no exact-replay action for this definite response.',
    },
    {
      id: 'handover-recheck',
      title: 'Recover through a fresh owned-work read',
      body: 'Choose Recheck my owned work to discard the local command interaction and fetch the current owned list. If your claim is still listed, open a new Resolver Console to obtain independently authorized case context. A list recheck does not prove an earlier uncertain command never applied, and a historical receipt does not bypass the case-summary access check. In this unavailable example ownership has not changed.',
      expected:
        'The fresh owned list is shown and opening the item performs a new protected context read.',
    },
    {
      id: 'handover-conflict',
      title: 'Stop when ownership coordinates conflict',
      body: 'The next simulated confirmation returns a conflict. The browser does not replace the original claim or revision with fresher values and silently resend. Such replacement would authorize a different action from the one you confirmed. Recover through owned work, check the intended case and recipient again, and submit a new explicit confirmation only if the latest authorized view still supports it.',
      expected:
        'The conflict is explicit, private context stays hidden, and no automatic or exact-replay action is offered.',
    },
    {
      id: 'handover-pending',
      title: 'Send one immutable transfer intent',
      body: 'After recovering again, confirm the intended recipient. The browser captures one command UUID together with tenant, work item, original claim, expected ownership revision and recipient. The dialog and all owner-scoped facts disappear before network execution. While the request is pending, do not interpret the withheld view as evidence of either failure or success. Only the backend can decide the ownership transition.',
      expected:
        'Handing over owned work is visible while the held request is still unresolved.',
    },
    {
      id: 'handover-uncertain',
      title: 'Treat a lost response as an unknown outcome',
      body: 'In this simulation the server has transferred the item, but its first response is lost. The resulting transport error cannot establish that the old owner still owns the work. Ergon retains only the immutable command intent and offers exact replay; it does not retain private case data or editable recipient state. There is no automatic POST retry, optimistic successor claim or fabricated success receipt.',
      expected:
        'The uncertainty view offers Retry exact handover while the earlier owner-scoped context remains absent.',
    },
    {
      id: 'handover-replay',
      title: 'Recover the original acknowledgement exactly',
      body: 'Select Retry exact handover only if you still intend the same transfer. It resends the identical command ID, original claim, revision and recipient. The original sender may recover an acknowledged transfer while still holding current resolver authority, even though they no longer own the work. Another actor cannot use this command ID to retrieve its receipt. Historical recovery does not itself grant private case or note access.',
      expected:
        'The replay returns the same transfer acknowledgement, without creating another successor claim.',
    },
    {
      id: 'handover-receipt',
      title: 'Read the receipt as history, not authority',
      body: 'The acknowledgement identifies the recipient and successor ownership revision. A change from revision one to three represents the direct claimed-to-claimed replacement, not an intervening release to a public queue. The receipt confirms this past transfer only. It does not show current recipient authority, prove continued ownership, verify an outcome, complete the follow-up or authorize a provider-side action.',
      expected:
        'Follow-up handover recorded is labelled historical and private context is not reopened.',
    },
    {
      id: 'handover-former-owner',
      title: 'Confirm that the former owner no longer sees the item',
      body: 'Choose Recheck my owned work after acknowledgement. The simulated sender’s fresh list is empty because the recipient now owns the item. The previous Console, notes and replay control are absent. Do not use browser history, an old screenshot or the receipt to infer permission. In a real deployment an empty view can have several causes, so use authorized team coordination rather than inferring private ownership details.',
      expected:
        'No active claimed work replaces the transferred item for the former owner.',
    },
    {
      id: 'handover-recipient',
      title: 'Inspect a separately authorized recipient view',
      body: 'For demonstration only, the fixture now signs in as the synthetic recipient and reloads the tenant. The recipient independently reads their owned list and opens a fresh protected case summary under the new claim and revision. This is not data passed from the sender’s browser or an authority conferred by the receipt. The case and escalated run remain unchanged; only follow-up responsibility has moved.',
      expected:
        'The recipient sees the successor claim at revision three and independently loaded case context.',
    },
    {
      id: 'handover-notes',
      title: 'Preserve predecessor commentary attribution',
      body: 'Open Internal notes as the recipient. Earlier commentary remains attributed to its original author, claim and revision, even though a new resolver now owns the item. A handover must not rewrite history to pretend the recipient wrote those notes. Read the content as coordination context, not verified evidence or outcome proof, and apply the normal current-owner checks before appending new commentary.',
      expected:
        'The original sender’s note is readable with its historical attribution under the recipient’s fresh access.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Recipient is unavailable.',
      guidance:
        'Reconfirm the internal actor UUID through an authorized channel and ask an administrator to verify same-tenant resolver eligibility. The response intentionally does not distinguish a nonexistent actor from a foreign or expired identity. A syntactically valid UUID is not a guarantee of eligibility.',
    },
    {
      symptom: 'The command times out or the connection fails.',
      guidance:
        'Keep the interaction open and use Retry exact handover if you still intend the original transfer. Never create a replacement command simply because the network response was lost. Leaving discards this local replay intent, but does not undo a sent request; consult fresh owned work and authorized team coordination before deciding what to do next.',
    },
    {
      symptom: 'Authentication or authority changes.',
      guidance:
        'Use the trusted sign-in control when offered. The backend remains authoritative for the original sender’s current resolver authority, including receipt recovery. Do not assume a previous successful response, visible tenant route or recipient acknowledgement grants continuing access.',
    },
  ],
  limitations: [
    'No actor directory, email lookup, bulk reassignment, administrator override, notifications, attachments or free-form handover message is included. Use internal notes before transfer when appropriate; notes are not evidence.',
    'This command does not release work, transfer run supervision, authorize execution, finalize proof, or complete a case. Those capabilities retain their separate policies and confirmation flows.',
    'Replay intent is local to this mounted interaction. Closing, navigating away or changing tenant retires requests and discards it; no URL, local storage or reload recovery record is created.',
    'The simulated guide demonstrates UI behavior, not live OIDC, PostgreSQL locking or a real recipient session. Backend integration tests and deployment policy govern those guarantees.',
  ],
};
