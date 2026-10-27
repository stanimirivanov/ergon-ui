import type { GuideChapter } from './guide-chapter';

export const requesterIntakeGuide: GuideChapter = {
  schemaVersion: 2,
  order: 42,
  slug: 'requester-case-intake',
  title: 'Create a request and recover uncertain intake',
  summary:
    'Create an explicitly owned case, retain original intent after an incomplete acknowledgement, recover it exactly and independently check current progress.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Requesters opening a new case, and operators explaining safe intake and recovery.',
  overview: [
    'Use the separate requester application, not the resolver workbench or an internal operator API. A verified tenant session enables the intake form but does not grant access to existing cases. Only explicit submission asks the backend to create a new case and bind its verified creator atomically. Desired outcome and initial observations remain untrusted text. Creation does not select a contract, start a resolution run, approve a capability, send a notification or establish outcome proof.',
    'This chapter uses labelled synthetic BFF responses. Its first submission creates a synthetic immutable winner but deliberately returns an incomplete receipt, so the browser must remain uncertain. The second explicit invocation reuses the same UUID and exact raw text with fresh session protection. A separately held progress read demonstrates that historical acknowledgement is not current case access. These are asserted browser behaviors, not evidence of real identity-provider exchange, PostgreSQL transactions or production authorization.',
  ],
  prerequisites: [
    'Your support team must provide the intended requester origin and tenant link. Deploy Ergon PR #220 and its intake foundation before this UI. The deployment needs its own confidential requester client, trusted issuer, registered tenant actor and session CSRF endpoint. Provider secrets remain server-side. Do not use someone else’s case UUID or infer ownership from a tenant URL, approval role or resolver claim.',
    'Prepare a clear desired outcome and an initial description of what happened, without credentials or unnecessary personal data. Keep this page open if the outcome becomes uncertain. Draft and recovery state exist only in memory: reloading, navigating away or signing in again may discard them, but cannot undo a write. If you lose an uncertain intent, contact your support team rather than treating a new UUID as safe recovery.',
  ],
  steps: [
    {
      id: 'intake-entry',
      title: 'Start from the verified tenant entry',
      body: 'Read the tenant-home explanation and follow Start a request. The intake route performs its own session check before showing the form. Opening that route is navigation, not submission: neither CSRF acquisition nor a case POST occurs yet. The app does not discover or list existing cases. If your session is absent, use the reviewed sign-in link; login returns only to the tenant entry, not a remembered draft or supplied case address. Confirm that you are using the intended requester origin.',
      expected:
        'The session-gated new-request form appears with focus on Desired outcome; no command has been sent.',
    },
    {
      id: 'intake-validation',
      title: 'Check input and review requirements locally',
      body: 'Try Create request before entering text or reviewing the request. Accessible errors identify the nonblank outcome, initial details and explicit review requirement. No CSRF or POST is sent for this invalid form. Goal and observation limits follow the backend: 500 and 8000 UTF-16 units after Kotlin-compatible whitespace trimming. An emoji can consume two units; NUL and unpaired surrogates are invalid. The raw counter is labelled separately from the normalized bound, so surrounding whitespace is not silently rewritten in the draft.',
      expected:
        'The invalid form provides actionable errors without minting or submitting a case intent.',
    },
    {
      id: 'intake-narrow',
      title: 'Review the report on a narrow display',
      body: 'Enter the synthetic desired outcome and multiline report, including the emoji and script-like text. Review the fields and check the acknowledgement. At 320 pixels, labels, textareas, counters, help and controls must remain usable without horizontal scrolling. The report is plain input: its script-like characters do not execute or become evidence instructions. There are no upload or automatic-resolution controls. The recorded narrow checkpoint highlights the report field so its content remains readable without pretending that a long form fits into one screen.',
      expected:
        'Exact raw report text is preserved, narrow reflow has no horizontal overflow and automated accessibility checks pass.',
    },
    {
      id: 'intake-submit',
      title: 'Submit the reviewed original intent once',
      body: 'Inspect Create request and choose it once. The browser creates a case UUID for this intent, moves focus to the persistent heading and removes draft fields before requesting CSRF or sending the POST. The fixture asserts that ordering at the actual network boundary. It does not hold a timed request while narration or screenshots are recorded. One invocation has a bounded CSRF-plus-POST budget and no automatic retry. Closing the page only retires observation; it cannot promise rollback of an already received server command.',
      expected:
        'The explicit submit action hides private input before I/O and sends one original command.',
    },
    {
      id: 'intake-uncertain',
      title: 'Keep an uncertain request sealed',
      body: 'Read Intake result after the deliberately incomplete acknowledgement. The browser cannot verify the full normalized receipt and therefore cannot claim either success or no creation. The synthetic server already has the opening, illustrating why a lost response is not permission to create another UUID. The form stays hidden and cannot edit or replace that intent. Keep this page open. Use only the offered exact recovery action; authentication denial, conflict or a later input rejection may instead require support assistance without a new submission.',
      expected:
        'An uncertainty notice replaces the form, preserves the original intent and offers only exact replay.',
    },
    {
      id: 'intake-replay',
      title: 'Recover with fresh protection and unchanged input',
      body: 'Choose Retry exact request. This is a new explicit invocation, not a background resend. It acquires fresh session CSRF and submits the same tenant, case UUID, goal and observation bytes. The fixture compares the complete original body rather than only counting commands. A replay cannot mint a new UUID or normalize the retained raw draft in place. Even a later invalid-input result cannot prove the earlier attempt never committed; recovery remains sealed. Do not bypass conflict or authorization denial by choosing a different identity.',
      expected:
        'The original immutable command is replayed exactly and receives its matching historical acknowledgement.',
    },
    {
      id: 'intake-acknowledged',
      title: 'Distinguish acknowledgement from current state',
      body: 'Read Intake acknowledged. The client validated case identity, normalized original text and calendar timestamps before accepting the response, then discarded receipt text and times from its supported result. The screen does not echo them as current facts or populate a progress cache. Only the acknowledged case identity is retained for the trusted navigation link. There is still no active-run, delivery or resolution claim, and no progress GET has occurred merely because the command was acknowledged. A matching receipt is historical even when a later case state has changed.',
      expected:
        'The acknowledgement exposes a current-progress link, not cached input, lifecycle or proof.',
    },
    {
      id: 'intake-check',
      title: 'Open an independently authorized progress check',
      body: 'Follow Check current case progress. This leaves the intake lifetime and performs fresh session, exact-case progress and question-history checks through the existing requester page. The fixture briefly holds progress only long enough to assert that the old intake goal is absent; it releases the response before any narrated result checkpoint. The browser does not use the receipt to skip a check, infer case access or restore private DOM during a failed read. Save or share a case link only through your approved support process; possession of the URL alone grants nothing.',
      expected:
        'Fresh checks run before the case canvas appears; acknowledgement alone never supplies its content.',
    },
    {
      id: 'intake-progress',
      title: 'Read the checked case without inventing execution',
      body: 'Read the newly acquired goal and Open status alongside the bounded empty question history. Open is a case lifecycle, not evidence that an agent is running, an operator is assigned or a resolution will finish by a particular time. The app offers only the existing supported requester actions. The intake mutation is no longer a resource owner; progress/history come from their own fresh reads. No provider token, original report or recovery command is persisted in local or session storage. This final checkpoint completes the path from explicit creation to independently inspected current access.',
      expected:
        'The fresh private canvas appears after independent reads, with no automatic-run or verified-resolution implication.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'The form is absent or sign-in is required.',
      guidance:
        'Use the correct requester origin and tenant entry. Your identity must be registered in that tenant. Do not switch to a resolver session or internal API. Signing in may leave this page and retire memory-only recovery; it does not undo a prior write.',
    },
    {
      symptom: 'Submission timed out or its acknowledgement is invalid.',
      guidance:
        'Preserve the original page and use only Retry exact request when offered. Do not change the UUID or text, and do not interpret a missing acknowledgement as proof no case exists. Contact support if the retained intent is lost or recovery is denied.',
    },
    {
      symptom: 'A validation error appears during recovery.',
      guidance:
        'Only an initial known input rejection permits correction. Once an earlier result is uncertain, later rejection never unseals it. Do not manufacture a replacement intent; ask your support team to inspect the original case identity through trusted tooling.',
    },
  ],
  limitations: [
    'The recording is synthetic. Real backend tenant authorization, atomic persistence, immutable audit and concurrent recovery belong to Ergon’s PostgreSQL/session tests. Live IdP exchange, production ingress limits and two-origin deployment acceptance are not certified here.',
    'Recovery is mounted and memory-only, not a durable outbox. Abort, navigation or reload cannot cancel a server write. This app provides no case discovery, upload, edit, notification, global logout, automatic contract selection, execution or outcome verification in this intake flow.',
  ],
};
