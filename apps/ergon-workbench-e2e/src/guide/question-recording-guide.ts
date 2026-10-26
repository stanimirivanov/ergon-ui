import type { GuideChapter } from './guide-chapter';

export const questionRecordingGuide: GuideChapter = {
  schemaVersion: 2,
  order: 40,
  slug: 'record-requester-questions',
  title: 'Record a requester question and recover an uncertain acknowledgement',
  summary:
    'Confirm exact question intent, distinguish rejection from uncertainty, explicitly recover the original request and stop when ownership coordinates conflict.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current resolvers deliberately requesting information for an OPEN case with an explicitly bound requester.',
  overview: [
    'Use a requester question when a resolution needs information from the person explicitly bound to the case. This is not an internal note or a general message to an arbitrary recipient. The backend derives the author from the signed-in session and the recipient from the case binding. The form never accepts an author, recipient, case replacement or client timestamp. A successful recording does not notify anyone or prove that the requester received or read the question.',
    'This walkthrough uses synthetic BFF records and deliberately loses the first acknowledgement after simulating a durable write. It demonstrates browser recovery, not real database persistence, delivery or an authorization decision. The real service checks current ownership and resolver authority even during replay. An immutable receipt describes a past recording; it does not keep the Console authorized, answer the question, promote evidence, accept proof or complete the case.',
  ],
  prerequisites: [
    'Sign into the intended tenant with a registered resolver identity. Open your currently owned follow-up and its Resolver Console, then choose Requester questions. The work must remain active, its claim and ownership revision must match, and the case must remain OPEN and explicitly requester-bound. If access is unavailable, recheck current owned work rather than guessing another identity or modifying request coordinates.',
    'Read existing question history before creating another question. The latest-100 warning means older history is omitted, not that an earlier question was never recorded. Establish the information you genuinely need and whether it is appropriate to disclose to the bound requester. Do not paste secrets, tokens, unnecessary personal data or instructions that should remain internal. Internal notes have a different audience and are not a delivery fallback.',
  ],
  steps: [
    {
      id: 'question-invalid',
      title: 'Respect exact-text constraints',
      body: 'In Record requester question, enter the information you need. Nonblank text may contain at most 4000 Unicode code points; emoji count as characters rather than pairs of UTF-16 units. Blank Unicode separators, NUL and unpaired surrogates are rejected. The workbench preserves spaces, line breaks and normalization exactly instead of trimming or rewriting intent. In this simulation a blank draft produces a field error and sends no command. Script-like content remains plain text, never executable markup.',
      expected:
        'A useful field error appears and the command count remains zero.',
    },
    {
      id: 'question-confirmation',
      title: 'Confirm audience and recording limits',
      body: 'Review the exact question and check the acknowledgement that it is intended for the bound requester and that recording is not delivery or proof. Selecting Record requester question without that acknowledgement shows a form error and does not issue a POST. The acknowledgement is local deliberate intent, not a new authorization grant, requester consent or an assessment of the information. The backend still rechecks every trusted coordinate at command time.',
      expected:
        'Unchecked acknowledgement blocks submission without a server write.',
    },
    {
      id: 'question-uncertain',
      title: 'Do not replace an uncertain request',
      body: 'Confirm the acknowledgement and record the question. The form and prior history are withdrawn before the command starts. Here the synthetic service records the original request but loses its acknowledgement. The workbench cannot know from a connection failure whether a durable write happened, so it offers only Retry exact question. It does not automatically issue another POST, reopen an editable replacement form or infer that the question was rejected. Leaving this view cannot roll back a server write.',
      expected:
        'Uncertain-outcome feedback replaces the form and history; only explicit exact replay is offered.',
    },
    {
      id: 'question-retry',
      title: 'Replay the original immutable intent',
      body: 'Select Retry exact question only when you want to recover the original submission. Replay preserves the request UUID, claim, ownership revision and exact text, together with the same tenant and work item. It must not change the text or invent a replacement identity after uncertainty. A rejected CSRF token is reacquired through the existing session adapter on explicit retry. Replaying does not bypass current ownership, identity, case binding or authority checks.',
      expected:
        'The second command has exactly the same immutable body as the first.',
    },
    {
      id: 'question-recorded',
      title: 'Separate acknowledgement from fresh history',
      body: 'The synthetic replay returns the original historical receipt. Question recorded means the exact intent was acknowledged, not delivered, answered or accepted as evidence. The workbench independently reacquires question history; an acknowledgement is never inserted into a local history copy or used to authorize old text. A successful fresh read shows the question with server attribution and separate request/recording times. If that read fails, the notice remains historical and retained history stays withheld until an explicit successful recheck.',
      expected:
        'Historical acknowledgement is visible and independently acquired history shows the recorded question.',
    },
    {
      id: 'question-closed',
      title: 'Discard local drafts without claiming rollback',
      body: 'Closing the inspector removes private content and returns focus to Requester questions. Unsubmitted text and exact recovery intent live only in the mounted workflow; they are not saved in URLs, local storage or a persistent Redux slice. Closing also retires pending callbacks and interrupts client-owned requests. That interruption cannot establish that a sent command did not commit. Reopening always reacquires access and history; inspect it before deciding whether a genuinely new question is needed.',
      expected:
        'The dialog closes, its private content leaves the DOM and focus returns to the invoking control.',
    },
    {
      id: 'question-narrow',
      title: 'Review a fresh narrow-screen form',
      body: 'Reopen the inspector at 320 pixels. The prior unsent draft is gone and acknowledgement is cleared. Labels, text constraints and controls remain keyboard reachable inside the native modal without horizontal overflow. Focus the text field to bring the composer into view, and read the audience/recording warning before acknowledging again. Screen width changes presentation only; it never changes current access, text limits, immutable replay coordinates or backend validation.',
      expected:
        'A blank, unacknowledged form reflows within the narrow dialog and remains keyboard usable.',
    },
    {
      id: 'question-conflict',
      title: 'Stop when claim or intent conflicts',
      body: 'The final synthetic submission returns a claim/intent conflict. Ergon withdraws the question inspector and enclosing private case context instead of letting a historical receipt or a stale form restore access. The same withdrawal applies to neutral unavailability or rejected identity/authority. Recheck current owned work before opening a newly authorized Console. Do not alter an old request UUID or ownership revision to force a replay. A newer owner or closed case can make exact recovery unavailable even when the original recording remains durable.',
      expected:
        'Owner-scoped context withdrawn replaces private case facts and no question retry remains open.',
    },
  ],
  troubleshooting: [
    {
      symptom:
        'The outcome is uncertain or the receipt could not be validated.',
      guidance:
        'Keep the original intent and use only the explicit exact retry while this workflow remains available. Timeouts, cancelled requests, malformed acknowledgements and client defects do not prove that no write occurred. Never create a replacement UUID merely to remove an error message.',
    },
    {
      symptom: 'The server rejects the text or ownership revision.',
      guidance:
        'A definite invalid-request response returns the exact text to the form with acknowledgement cleared. Correct and review it before another deliberate submission. If current claim/authority is unavailable or conflicts, use owned-work recovery instead; there is no stale-authority override.',
    },
  ],
  limitations: [
    'No notifications, delivery status, requester response form, attachments, edits, deletion, evidence promotion or case/run transition. Requester rendering and responses remain a separate planned slice.',
    'Drafts and retry intent are intentionally not durable. Closing or replacing the Console loses them, but cannot undo a command already accepted by the server.',
    'Simulated browser recording is not live OIDC, PostgreSQL atomicity or deployment verification. Historical question acknowledgements never grant continuing access.',
  ],
};
