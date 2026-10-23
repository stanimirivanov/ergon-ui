import type { GuideChapter } from './guide-chapter';

export const followUpNotesGuide: GuideChapter = {
  schemaVersion: 2,
  order: 34,
  slug: 'record-owned-follow-up-notes',
  title: 'Record internal notes without changing evidence',
  summary:
    'Inspect attributed commentary, save an internal note, recover an uncertain response with exact replay, and withdraw private notes when access changes.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Resolvers handling an open follow-up currently owned by their verified identity.',
  overview: [
    'Internal notes preserve coordination context that does not belong in the case evidence or outcome proof. A suggestion to investigate SSO is commentary, not a verified fact, an authorization, or a successful resolution. Recording it does not change the ownership revision, case stream or run. Use the evidence and proof panes for their distinct purposes instead of promoting note text into operational truth.',
    'This walkthrough uses clearly labelled synthetic BFF responses. Its author IDs, claims, timestamps, case and commentary are test data. The simulated first save is recorded but loses its network response so the browser can demonstrate exact recovery. It proves browser interaction, privacy withdrawal and display—not a live OIDC session, PostgreSQL persistence, provider operation or actual authorization decision.',
  ],
  prerequisites: [
    'Sign in to the intended tenant with a registered resolver identity and current authority. The follow-up must be open and currently owned by you. A selected tenant, old card, screenshot or previous note receipt cannot establish current access.',
    'Open the item from Claimed follow-ups using Open resolver console. Check its case, claim and ownership revision before composing. Notes are loaded only when you explicitly open their inspector; entering the Console does not eagerly download note history.',
  ],
  steps: [
    {
      id: 'notes-history',
      title: 'Open attributed internal commentary',
      body: 'Select Internal notes in the Console navigation. Wait for the fresh current-owner check before reading history. Each record shows its exact text, author actor, authoring claim and revision, and separate authored/recorded timestamps. A predecessor author can differ from the current resolver. This attribution explains history; it does not grant the author continuing access or turn their suggestion into evidence.',
      expected:
        'The inspector shows historical commentary and its attribution; script-like text remains visible inert text.',
    },
    {
      id: 'notes-draft',
      title: 'Write a bounded plain-text note',
      body: 'Enter the context another resolver needs, distinguishing a hypothesis from a verified observation. The composer accepts nonblank text up to 4000 Unicode code points, so supplementary characters such as emoji count once. Whitespace and normalization are preserved exactly; the browser does not silently trim the message. NUL and unpaired surrogates are invalid. No Markdown or HTML is executed.',
      expected:
        'The plain-text field contains the intended commentary and its character count.',
    },
    {
      id: 'notes-uncertain',
      title: 'Understand an uncertain save',
      body: 'Select Save internal note once. In this simulation the server records it but the response is lost. A connection failure therefore cannot prove that nothing happened. The form locks its immutable note ID, text, tenant, work item, claim and expected ownership revision. There is no automatic POST retry and no editable replacement that could accidentally create duplicate commentary.',
      expected:
        'An uncertainty message offers Retry exact note, rather than claiming success or inventing another note.',
    },
    {
      id: 'notes-replay',
      title: 'Replay only the original intent',
      body: 'Select Retry exact note if you still intend the same append. The browser resends the original note identity, exact text and claim coordinates; it never refreshes ownership fences in the background. The backend checks current ownership and resolver authority even for replay. A stale claim or changed payload can conflict, and a former owner cannot use the historical note ID as a receipt-retrieval permission.',
      expected:
        'The same note is acknowledged and a separate fresh history read begins.',
    },
    {
      id: 'notes-recorded',
      title: 'Read the refreshed record, not an optimistic copy',
      body: 'Wait for the fresh history response. The acknowledgement is labelled historical and does not authorize continued disclosure. The list comes from the current RTK Query resource, not a local copy patched from the receipt. Confirm your exact text and server-supplied author and timestamps in newest-first history. Recording commentary has not verified the outcome or completed the human follow-up.',
      expected:
        'The refreshed list includes the single new note ahead of the predecessor commentary.',
    },
    {
      id: 'notes-close',
      title: 'Close the private interaction deliberately',
      body: 'Choose Close internal notes or press Escape. Focus returns to the live Internal notes control. Drafts and uncertain replay intent are confined to this mounted inspector and are discarded on close, ownership recheck, release, claim replacement or tenant change. They are never stored in URLs or browser storage. If a response was uncertain before closing, do not assume a new note is safe: re-read history and assess the prior action first.',
      expected:
        'The modal and private note text are removed, with keyboard focus restored to its trigger.',
    },
    {
      id: 'notes-truncated',
      title: 'Recognize the history boundary',
      body: 'Open Internal notes again to obtain another fresh access check. This synthetic history now contains 100 records and explicitly reports truncation. Latest means newest recorded time, with note ID as the tie-breaker. The banner means older notes were omitted; it does not claim a complete audit export or a total number of notes. There is currently no older-history paging control.',
      expected: 'The latest-100 warning is visible above bounded history.',
    },
    {
      id: 'notes-narrow',
      title: 'Inspect safely on a narrow screen',
      body: 'At narrow width, the modal stays inside the viewport, long actor and claim identifiers wrap, and the text retains its line breaks without causing horizontal scrolling. Use the dialog heading and keyboard navigation to reach history and controls. The browser keeps background controls inert while the inspector is open; the same access and replay rules apply regardless of viewport size.',
      expected:
        'The inspector reflows at 320 pixels without horizontal overflow.',
    },
    {
      id: 'notes-withdrawn',
      title: 'Stop when owner-scoped access fails',
      body: 'After closing and reopening, the simulated server returns the neutral notes-unavailable result. Ergon withdraws the earlier case context and notes rather than allowing a successful old resource to stand in for authority. The result does not reveal whether the item was closed, assigned elsewhere or hidden by changed resolver authority. Use Recheck current claim to recover from server truth before continuing work.',
      expected:
        'Owner-scoped context withdrawn replaces private facts; no note, draft or replay action remains.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Save reports uncertain outcome.',
      guidance:
        'Keep the inspector open and use only Retry exact note if you still intend the original action. Never create a replacement note solely because a timeout occurred. Closing discards local replay intent, so inspect fresh history before deciding what to do next.',
    },
    {
      symptom: 'The server reports conflicting or unavailable notes.',
      guidance:
        'Do not infer which owner exists or alter the note ID to bypass the conflict. The previous context is withdrawn. Recheck current ownership, then acquire a new protected view if still permitted; a historical receipt never grants access.',
    },
    {
      symptom: 'Text validation rejects a note.',
      guidance:
        'Enter meaningful nonblank plain text within 4000 Unicode code points and remove NUL or malformed surrogate characters. Resolve the accessible field error before saving. Whitespace is not trimmed, and no attachments or rich formatting are supported.',
    },
  ],
  limitations: [
    'Only current owners can read or append. This is internal resolver commentary, not requester messaging, verified evidence, approval, run execution, handover or case completion.',
    'History is limited to the latest 100 records; older paging, editing, deletion, attachments and persistent draft recovery are not implemented.',
    'The simulated recording is browser evidence only. Production identity, tenant isolation, durable idempotency and concurrency are verified by the separate Ergon backend tests.',
  ],
};
