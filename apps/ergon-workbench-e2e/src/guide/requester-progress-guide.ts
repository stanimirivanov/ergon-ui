import type { GuideChapter } from './guide-chapter';
export const requesterProgressGuide: GuideChapter = {
  schemaVersion: 2,
  order: 38,
  slug: 'requester-case-progress',
  title: 'Check your privately shared case progress',
  summary:
    'Open a supplied case link, verify your session, and read narrow progress with recorded questions and answers. Distinguish answer coverage, empty and truncated history, closed-case reads and fresh access failures without treating old details as authority.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Requesters checking one explicitly owned case, and operators provisioning requester access.',
  overview: [
    'The requester app has its own deployment, origin and server-side sign-in client. A supplied link selects a tenant and case; it does not prove ownership. The server checks your registered tenant identity and a separate durable requester binding before returning the goal, lifecycle and timestamps. This is not the resolver workbench.',
    'This chapter uses labelled synthetic HTTP responses: OPEN, recorded answers and unanswered/unsupported coverage, held checks and neutral denial, empty and truncated pages, and a fresh VERIFIED_RESOLVED observation. Progress and history are independent reads; both must succeed before the private canvas appears. They are not an atomic or continuously current server snapshot. The recording proves browser behavior, not live resolution or production identity configuration.',
  ],
  prerequisites: [
    'Obtain the intended requester-origin link from your trusted contact. Until authenticated intake is available, an authorized operator verifies the exact tenant, case and registered actor out of band and provisions immutable ownership. Approval authority, including REQUESTER approval evidence, is not ownership. Existing cases are hidden by default.',
    'Deploy the backend ownership migration, Ergon PR #202 progress reader and PR #216 protected question/answer history. Both reads are required; history unavailability withholds progress too. Route this app only to its requester-configured BFF, never the resolver deployment. Provider tokens and confidential client secrets stay server-side.',
  ],
  steps: [
    {
      id: 'requester-sign-in',
      title: 'Verify your session before opening a case',
      body: 'Open your supplied link. When authentication is required, no progress read is sent. Sign in through Ergon. The current login contract returns only to the tenant page; afterward reopen the original supplied case link. The app deliberately does not retain private case selection in storage to reconstruct navigation.',
      expected:
        'Sign-in guidance has the canonical tenant return target and zero progress reads.',
    },
    {
      id: 'requester-open',
      title: 'Read the checked lifecycle, not an execution promise',
      body: 'After session verification, fresh progress then history reads check the exact case. Read the prominent goal and recorded status above Questions and answers and the four explanatory cards. OPEN says nothing about an active run, approval readiness, a waiting person or estimated completion. What we need from you explains that answer submission and uploads are unavailable; What Ergon is checking withholds individual checks. Outcome proof distinguishes lifecycle from private evidence, and Confirm the outcome explains that reading cannot change the case. No disabled pretend actions appear. Goals and history are untrusted text, not markup.',
      expected:
        'The supplied goal, Open label, four explanatory cards and Request details sidebar appear without inferred stages or resolver controls.',
    },
    {
      id: 'requester-history',
      title:
        'Read recorded questions and answers without treating them as proof',
      body: 'Read Questions and answers in newest question-recording-time order. A recorded answer appears beneath its question with exact Unicode and line breaks; script-like content stays visible text. Requested and Responded describe server command times, while Question recorded and Answer recorded describe database recording. They are not delivery/read confirmations and must not be sorted across clocks. No resolver, claim, provider or requester attribution is supplied. No answer recorded in this checked snapshot means explicit null, not permanent absence. Answer history is not supplied by this server means an older server omitted coverage; do not infer an unanswered question. Neither a question nor an answer supplies consent, accepted evidence, execution permission or outcome proof. Answer submission and exact recovery are a later slice; there is no edit or submit control here.',
      expected:
        'Inert exact answer text, original timestamps and distinct unsupported/unanswered messages appear without private attribution or mutation controls.',
    },
    {
      id: 'requester-narrow',
      title: 'Read the same facts on a narrow screen',
      body: 'At desktop width the request details form a right-hand rail beside the goal and two-column cards. At 320 pixels, also representing reflow at high zoom, the cards stack and details follow in reading order. The case ID and UTC timestamps wrap without horizontal scrolling. Recheck remains keyboard accessible with visible focus. Status is not communicated by color alone; forced colors and reduced motion retain the same facts. The recording then reopens the supplied link at desktop width, demonstrating a separate fresh session and case check rather than reusing a private snapshot.',
      expected:
        'The narrow page has no horizontal overflow and passes automated accessibility checks.',
    },
    {
      id: 'requester-history-narrow',
      title: 'Read exact answers and timestamps at narrow width',
      body: 'Scroll to the recorded answer at 320 pixels. Its Unicode text, script-like characters, line break and long fractional UTC timestamps wrap inside the question card instead of widening the page. The answer is still plain text; there is no horizontal code editor or concealed raw markup. Requested and recorded question times remain above it, and separate answer times remain below. The screenshot highlights the answer itself rather than just the page header, so the narrow reading experience can be inspected. Continue down to the request-details rail afterward; the viewport never changes ownership or authorizes a write.',
      expected:
        'The narrow answer and both original timestamps remain readable without horizontal overflow or a mutation control.',
    },
    {
      id: 'requester-details',
      title: 'Read request details below the narrow canvas',
      body: 'Scroll past the four explanatory cards to Request details. The same case ID and UTC case timestamps are available here as on desktop, without a separate read. A checked snapshot explains that these are not proof recording times and that the page does not monitor continuously. Your private view explains which internal information is not returned; it is not a substitute for your organization’s privacy policy. There is no invented source link or activity-log button.',
      expected:
        'The narrow details rail remains readable with wrapping case identity, timestamps and snapshot/privacy guidance.',
    },
    {
      id: 'requester-pending',
      title: 'Withdraw old facts before checking again',
      body: 'Choose Recheck progress. Focus moves to the persistent heading before the whole private canvas disappears, including questions, answers and the details sidebar. The fixture holds the progress request: previous goal, case ID, text and timestamps stay hidden. If progress fails, history is not requested. If progress succeeds, history must also pass before anything reappears. The sidebar timestamps describe the case, not proof recording time. There is no automatic polling or continuously renewed authority.',
      expected:
        'Pending guidance replaces private details before the request starts; heading focus survives.',
    },
    {
      id: 'requester-hidden',
      title: 'Treat unavailable progress as deliberately neutral',
      body: 'The response uses the same problem for missing, unbound, foreign-owned and cross-tenant cases. It does not establish deletion, transfer or resolution. Check the link with your contact. A cached successful read never overrides this failed fresh check, and previous private details stay withdrawn.',
      expected:
        'Neutral unavailable guidance appears without the old goal or timestamps.',
    },
    {
      id: 'requester-resolved',
      title: 'Read a fresh verified-resolution observation',
      body: 'Recheck explicitly when another observation is needed. This synthetic response records VERIFIED_RESOLVED: the case projection records accepted proof. Recorded question/answer history remains readable after closure under requester ownership; closing does not delete it or promote an answer into proof. The browser did not close the case and does not receive proof payloads. Last case update is not proof recording time. Reads cannot approve, execute, claim or mutate anything; readable closed history is not permission to submit another answer.',
      expected:
        'Fresh goal and Verified resolved copy appear without private proof, runtime traces or resolver actions.',
    },
    {
      id: 'requester-history-empty',
      title: 'Distinguish empty history from unanswered questions',
      body: 'Recheck against the synthetic owned empty history. No questions recorded in this checked snapshot means this bounded read returned no question rows. It is different from an unavailable history, an existing unanswered question, or unsupported answer coverage. It does not prove delivery, non-delivery or that no one needs information. Case progress is reacquired independently before this history, and the resolved lifecycle remains a separate fact. Do not create a duplicate request or infer a workflow from the absence of rows.',
      expected:
        'The explicit empty-history message replaces question rows without changing the meaning of case status.',
    },
    {
      id: 'requester-history-truncated',
      title: 'Respect the latest-100 question boundary',
      body: 'Recheck again. This fixture returns the latest 100 questions, with an explicit warning that older questions and their answers were omitted. Ordering uses question recording time descending and question UUID descending for ties; the presence or age of an answer never reorders a question. The warning is not a total, a complete audit export or a delivery assessment. There is no older-page control, export, deletion or edit action. Scroll normally to read retained rows and recheck deliberately when a new observation is needed.',
      expected:
        'A latest-100 warning accompanies the bounded history without claiming complete coverage.',
    },
    {
      id: 'requester-history-pending',
      title: 'Withhold progress while a new history read is pending',
      body: 'Choose Recheck progress once more. The synthetic progress read succeeds, but history is held. Even though fresh progress has arrived, no old or newly checked goal, details rail, question or answer appears until history also succeeds. The persistent Case progress heading retains keyboard focus. This two-resource disclosure gate prevents a partially refreshed private canvas; it does not claim the server produced a transactional snapshot. Neither resource is copied into local feature state.',
      expected:
        'Pending guidance and stable heading focus remain while the entire private canvas is withheld.',
    },
    {
      id: 'requester-history-denied',
      title: 'Stop when history cannot establish current access',
      body: 'The held history now returns the neutral requester-case-not-found problem. Fresh progress alone does not override that failure: the whole canvas remains hidden. This does not explain whether the case is missing, unbound, cross-tenant or owned elsewhere, and does not identify another person. Recheck only as a new access observation or ask your trusted contact to verify the supplied link. A previously visible answer or cached goal cannot restore access, and no command is issued to repair a read failure.',
      expected:
        'Neutral unavailable guidance replaces the pending state without resurrecting any private facts.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Sign-in ends at a verified tenant page.',
      guidance:
        'Reopen the original supplied case link in the requester origin. This is the reviewed login return contract, not lost ownership. There is no discovery list yet and no persisted case selection.',
    },
    {
      symptom: 'Progress is unavailable or identity is rejected.',
      guidance:
        'Ask your contact to check the link and your administrator to check registration and the separate ownership binding. Never substitute approval evidence or another actor ID. Neutral absence does not reveal another owner or even case existence.',
    },
    {
      symptom: 'A timeout, connection failure or unusable response appears.',
      guidance:
        'Old facts stay hidden. Use explicit recheck where offered; transient reads have at most one bounded retry. Implementation defects and unsupported responses direct you to an operator. No raw diagnostics or server-provided arbitrary redirect is displayed.',
    },
  ],
  limitations: [
    'This bounded canvas adapts the requester concept without inventing its staged timeline, running checks, uploads, owner identity, source links or outcome confirmation. Question/answer inspection is read-only; answer submission/recovery, intake, discovery, notifications and sign-out belong to later slices. No resolver navigation or command exists.',
    'Ownership is provisioned through reviewed privileged database operations, not the browser. Transfer/revocation is not supplied; incorrect provisioning requires disabling requester access and reviewed forward repair.',
    'This simulated Chromium guide does not certify live IdP, separate-origin deployment, PostgreSQL authorization or actual proof acceptance. Those need backend and operational verification.',
  ],
};
