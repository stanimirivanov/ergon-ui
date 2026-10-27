import type { GuideChapter } from './guide-chapter';

export const requesterAnswerGuide: GuideChapter = {
  schemaVersion: 2,
  order: 41,
  slug: 'requester-answer-recording',
  title: 'Record a final answer and recover uncertain recording',
  summary:
    'Answer an explicitly owned case question, review exact text, recover only the original command after uncertainty, and distinguish historical acknowledgement from independently checked history and closed-case authorization.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Requesters answering a privately shared case, and operators explaining safe recovery.',
  overview: [
    'Use the separate requester app and the original supplied case link. A verified session and fresh case progress plus question history are required before any private question or answer appears. The browser does not infer ownership from the link, an approval role, or a resolver claim. The server authorizes each read, first write and replay independently. An Open badge and an unanswered snapshot offer a control; they are not permission to bypass server checks.',
    'This chapter records labelled synthetic responses, not a live customer case. The fixture deliberately records the first answer but returns an incomplete acknowledgement. That makes the browser uncertain even though the synthetic history already contains the answer. Exact explicit recovery receives a complete historical receipt, then a separately held history read demonstrates why acknowledgement is not current read authority. A later command races with closure and is denied without disclosing another person or competing answer.',
  ],
  prerequisites: [
    'Your trusted contact must provision the exact requester ownership binding and supply the intended tenant/case link. Deploy the merged requester answer command and protected histories from Ergon PR #216 before this UI. The requester origin needs its own correctly configured session and CSRF endpoints; resolver sessions and internal operator APIs are not substitutes. Confidential tokens remain on the server.',
    'Choose a question whose checked history explicitly says no answer is recorded. An older server that omits answer coverage does not establish that a question is unanswered, so it supplies no answer control. Recorded answers and closed snapshots remain readable but have no new answer form. There is no edit, attachment, notification or background resend mechanism. Keep your connection and this case page open while recovering an uncertain command.',
  ],
  steps: [
    {
      id: 'answer-select',
      title: 'Choose an explicitly unanswered question',
      body: 'Read the exact question and its separate requested and recorded timestamps. Choose Answer question for the browser question, not an already answered or unsupported entry. The form belongs to this selected question identity in the current checked history; it is not another copy of the question cache. Keyboard focus moves into Your answer. Other internal work, resolver attribution, evidence and execution state are not fetched to enable this action. Rechecking while editing retires this draft rather than silently submitting it.',
      expected:
        'A labelled answer form appears for the selected current unanswered question and focuses its text field.',
    },
    {
      id: 'answer-invalid',
      title: 'Review validation before any command is sent',
      body: 'Try recording with empty text and without review. Inline errors explain nonblank text and explicit final-answer review; no CSRF or command request starts. Accepted input is one to four thousand Unicode code points, not JavaScript UTF-16 units. NUL, unpaired surrogates and entirely Kotlin-whitespace text are rejected. The form preserves accepted leading spaces, line breaks and supplementary characters; it never trims or rewrites your answer. Correcting validation does not itself authorize or record anything.',
      expected:
        'Accessible text and review errors appear while both CSRF and POST counts remain zero.',
    },
    {
      id: 'answer-narrow',
      title: 'Inspect the exact final answer on a narrow screen',
      body: 'At 320 pixels, enter the exact synthetic answer including its emoji, line break and script-like characters. The content remains inert text inside a labelled textarea; it does not become HTML or instructions. Check the final-answer review box only after reading the question and limits. The form, character count, review control and button must reflow without horizontal scrolling. Recorded answers cannot be edited here, and recording is not a promise of delivery, consent, accepted evidence or verified resolution.',
      expected:
        'The narrow form preserves exact text, has no horizontal overflow, and passes automated accessibility checks.',
    },
    {
      id: 'answer-pending',
      title: 'Record the reviewed answer explicitly',
      body: 'Inspect the highlighted Record final answer control, then choose it once. The browser retains an immutable response UUID, question identity, case and exact text for this mounted attempt. It focuses the persistent Case progress heading and removes the private goal, history, details rail, draft and timestamps before requesting session CSRF. The fixture asserts withdrawal at that actual network boundary; narration is captured before submission so video work never artificially extends the bounded command. The control does not promise cancellation or rollback: leaving the page retires observation and recovery intent, but a server write may still complete.',
      expected:
        'The reviewed submit control is highlighted; the asserted action then withdraws private facts before CSRF and POST execution.',
    },
    {
      id: 'answer-uncertain',
      title: 'Do not replace an uncertain answer',
      body: 'The fixture releases CSRF, accepts the exact first command, then returns an incomplete receipt. The browser cannot validate that acknowledgement, so it reports uncertainty instead of success or a definite failure to write. Timeout, connection failure, service unavailability, unsupported acknowledgement, contained implementation defects and cancellation require the same caution. No automatic POST retry occurs. Retry exact answer is the only offered resend action: it retains the original response UUID, question and text. Do not open a replacement draft or generate a new command to guess whether the first write existed.',
      expected:
        'Safe uncertainty guidance and exact retry appear after exactly one POST; old case facts remain hidden.',
    },
    {
      id: 'answer-rechecked',
      title: 'Read current history without replacing recovery intent',
      body: 'Choose Recheck progress before replaying. Fresh progress and then history are independent authorization observations, and both must succeed. In this simulation they show the answer that was already recorded despite the incomplete receipt. That current history is not produced from local receipt feedback. The original uncertain command still remains in memory; no new answer draft or replacement UUID is offered. A failed read would keep the whole private canvas hidden, even if historical acknowledgement or previous answer text had been retained.',
      expected:
        'Fresh history discloses the recorded answer while the original exact-retry action remains available and no replacement form appears.',
    },
    {
      id: 'answer-acknowledged',
      title: 'Explicitly recover and separately recheck history',
      body: 'Inspect the highlighted Retry exact answer control, then choose it. The browser obtains fresh invocation-local CSRF and sends byte-identical answer intent, not a replacement UUID or edited text. The synthetic server recognizes the whole original command and returns its existing receipt with status 200. First recording uses 201; both require exact response, question, case and answer matching plus valid UTC times. Acknowledgement triggers another fresh progress/history gate. The fixture briefly holds history and asserts the safe historical notice while the old private canvas is absent, then releases it before further narration. Capturing the control before execution keeps video work outside bounded network waits; no receipt is inserted as current history.',
      expected:
        'The exact-retry control is highlighted; its action verifies two identical POSTs and private withdrawal while independently fresh history is briefly held.',
    },
    {
      id: 'answer-recorded',
      title: 'Read the independently acquired recorded answer',
      body: 'Release the held history read. The answer appears under its question with original server and database timestamps, retaining fractional precision and plain text. These timestamps are not delivery or read times and must not establish cross-clock ordering. The completed mutation record is reset; there is no persistent browser queue or copied resource snapshot. The acknowledgement notice is historical feedback only. Other supported unanswered questions can now be selected explicitly, but the answered question offers no edit or new answer action. No proof, approval or outcome revision is advanced by this UI.',
      expected:
        'Fresh current history contains the exact answer and its timestamps, without an answer control on that recorded question.',
    },
    {
      id: 'answer-denied',
      title: 'Respect closure that races with the next command',
      body: 'Select the second synthetic unanswered question, review its final answer and record it. The server-side fixture closes the case before this command can be authorized. Neutral unavailability does not distinguish missing, foreign, unbound, wrong-question or closed targets, and it never reveals a competing answer. This result does not offer replay or a replacement command. Authentication requires sign-in through the canonical route; a CSRF rejection alone may offer exact retry with fresh setup. Only an initial invalid-answer rejection permits editable RHF correction. A later rejection during retained recovery does not establish that the earlier attempt never wrote: keep the original intent unchanged, recheck history or contact an operator.',
      expected:
        'Neutral answer-access guidance withdraws the private canvas, offers no exact replay for absence, and does not claim that closure was inferred from the 404.',
    },
    {
      id: 'answer-closed',
      title: 'Recheck closed history without offering new writes',
      body: 'Choose Recheck progress again. This separate observation now reports Verified resolved and returns owned history, including the earlier immutable answer. Closed requester history survives closure, unlike new writes and exact replays, which must freshly authorize an OPEN case on the server. No new form is offered even for an explicitly unanswered question in this closed snapshot. Reading history does not reopen, approve or confirm the outcome. If access fails instead, use the trusted contact or administrator path; never substitute resolver credentials or another identity.',
      expected:
        'Closed owned history is readable, no new answer controls appear, and browser storage remains empty.',
    },
  ],
  troubleshooting: [
    {
      symptom:
        'An answer may have been recorded but no usable acknowledgement arrived.',
      guidance:
        'Stay on this case page and use only Retry exact answer if offered. Recheck can independently inspect history without changing the saved intent. Navigation or reload loses memory-only recovery intent and cannot undo the possible write. Do not create a replacement UUID to test existence; ask a trusted operator to inspect current history if the original page is lost.',
    },
    {
      symptom: 'Acknowledgement appears but the case canvas is hidden.',
      guidance:
        'The subsequent fresh progress/history gate has not completed or was denied. Historical acknowledgement cannot restore read access. Recheck deliberately where offered. No raw server diagnostic, owner identity or competing answer is exposed by command failures. Sign-in navigation also discards mounted drafts/recovery; use the supplied link after authenticating.',
    },
  ],
  limitations: [
    'Simulation proves browser protocol, lifecycle, focus, safe recovery and rendering only. It does not certify live OIDC, PostgreSQL lock waits, real requester ownership, TLS, cross-origin ingress or delivery. Backend integration and operational checks own those guarantees.',
    'No attachments, edits, deletes, automatic retry, background queue, persistent command history, notification, intake, discovery or evidence ingestion is supplied. Answer text is untrusted source material, not permission, consent, accepted evidence or proof. The case page retains only mounted draft/intent; resources remain RTK-owned.',
  ],
};
