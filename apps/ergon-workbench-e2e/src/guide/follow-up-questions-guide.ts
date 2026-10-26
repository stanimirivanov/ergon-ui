import type { GuideChapter } from './guide-chapter';

export const followUpQuestionsGuide: GuideChapter = {
  schemaVersion: 2,
  order: 39,
  slug: 'inspect-requester-question-history',
  title: 'Inspect requester questions without assuming delivery',
  summary:
    'Read attributable question history under fresh owner access, distinguish empty and incomplete history, recover a failed read and stop when access is withdrawn.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Resolvers handling an open, explicitly requester-bound case through their currently owned follow-up.',
  overview: [
    'Requester questions record what information a resolver deliberately asked for. They are different from internal notes: a question is intended for the explicitly bound case requester, while a note is internal commentary. Neither a recorded question nor a successful read proves delivery, an answer, approval, consent, verified evidence or resolution. A separate composer now records questions; this walkthrough focuses on history and access checks.',
    'This walkthrough uses synthetic BFF responses and synthetic actor, claim and request identities. It demonstrates a predecessor-authored question, a temporary service failure, empty and truncated histories, and a neutral denial. It proves browser presentation and disclosure retirement, not live identity, database persistence, notifications or an actual authorization decision. Production access remains a server decision on every read.',
  ],
  prerequisites: [
    'Sign in to the correct tenant with a registered resolver identity and current authority. The work must still be active and currently owned by you, and its explicitly requester-bound case must be OPEN. A saved screenshot, historical author ID or request ID cannot restore access after release, handover, completion or expiry.',
    'Open Claimed follow-ups, then Open resolver console for the intended item. Review its case, claim and current ownership revision. Requester questions and Internal notes are separate controls. Question history is acquired only after opening its inspector, not simply because the Console or an earlier note was visible.',
  ],
  steps: [
    {
      id: 'questions-history',
      title: 'Open attributable question history',
      body: 'Select Requester questions and wait for the current-owner read. The newest recorded question appears first. Inspect its exact plain text, historical author actor, authoring claim and revision, and separate requested and recorded times. A predecessor can have authored the question under a different claim. That attribution explains an immutable past action; it does not identify the current owner or grant that author continuing access. Script-like text remains visible text, never executable HTML.',
      expected:
        'The inspector displays inert historical question text and its original attribution.',
    },
    {
      id: 'questions-closed',
      title: 'Close and retire the private view',
      body: 'Press Escape or choose Close requester questions. The modal and its confidential content leave the DOM, and keyboard focus returns to the live Requester questions control. Closing retires this inspector’s observation and interrupts its own pending request. Nothing is saved in a URL, local storage or a persistent draft. Reopening is a distinct server access check; a late response from the earlier lifetime cannot authorize a new view.',
      expected:
        'The question text is removed and focus returns to its invoking control.',
    },
    {
      id: 'questions-temporary',
      title: 'Withhold retained questions after a failed recheck',
      body: 'Open the inspector again, then select Recheck question access. The previous questions disappear while a new observation is acquired. In this simulation the service temporarily fails; the read runner permits one classified transient retry, but a failure still cannot authorize old text. Use Try questions again only as an explicit new read. A transport failure does not mean that questions were deleted, delivered or answered, and it must not be interpreted as an empty history.',
      expected:
        'No historical question remains visible; the failed read offers an explicit retry.',
    },
    {
      id: 'questions-empty',
      title: 'Recognize an authorized empty history',
      body: 'Select Try questions again after the temporary failure has been removed. The synthetic server now returns an authorized empty history. No requester questions recorded means this bounded resource contains no recorded questions, not that the requester responded or the case is complete. It is different from an unavailable or hidden resource. Use Record requester question only for a newly reviewed request; Internal notes are not a substitute customer message.',
      expected:
        'An explicit empty-state message replaces the unavailable state.',
    },
    {
      id: 'questions-truncated',
      title: 'Respect the latest-100 boundary',
      body: 'Recheck question access again. The simulation returns 100 records with an explicit truncation marker. History is ordered by recorded time descending, then request identity descending for equal times. The warning means older questions were omitted. It does not give a total, certify a complete audit export or indicate which questions were delivered. There is no older-history pagination, editing, deletion or attachment workflow in this inspector.',
      expected:
        'The latest-100 warning and bounded history are visible together.',
    },
    {
      id: 'questions-narrow',
      title: 'Read with keyboard and narrow-screen controls',
      body: 'At 320 pixels, the dialog remains within the viewport. Question text preserves line breaks and long identity values wrap instead of forcing horizontal scrolling. Focus the dialog heading to return to the beginning of a long history, then use normal keyboard navigation to reach recheck and dismissal. The modal owns keyboard containment and makes the background inert; the feature does not introduce its own overlay or positioning rules. Viewport size never changes access requirements.',
      expected:
        'The inspector reflows without horizontal overflow and retains visible keyboard controls.',
    },
    {
      id: 'questions-withdrawn',
      title: 'Stop when current access is lost',
      body: 'Close the inspector and reopen after the synthetic server has withdrawn access. The neutral result deliberately does not explain whether the work was completed, claimed elsewhere, closed with its case or hidden by authority changes. Ergon removes question history and the previously visible case context. Use Recheck current claim to recover current owned work before opening a newly authorized Console. Retained request identities and predecessor attribution are not alternative access paths.',
      expected:
        'Owner-scoped context withdrawn replaces private facts and the question dialog is retired.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'History is unavailable rather than empty.',
      guidance:
        'Use the offered read retry for a temporary failure. If the Console withdraws context, recheck current ownership instead. Do not infer another owner’s identity, fabricate claim coordinates or treat a previously visible receipt as permission.',
    },
    {
      symptom: 'An earlier question cannot be found.',
      guidance:
        'Check whether the latest-100 marker is present. Older history may be omitted; there is no older-page control or delivery status here. Do not create a replacement request solely because this bounded view cannot show it. Consult the separate recording/recovery walkthrough before submitting a new question.',
    },
  ],
  limitations: [
    'This chapter covers current-owner inspection. Question recording and exact replay have a separate walkthrough; requester rendering and responses remain planned.',
    'Questions are untrusted plain text, not internal notes, proof, approvals, notifications or confirmed delivery. No edit, deletion, attachments or older-history paging is provided.',
    'This recording is simulated browser evidence. Live OIDC, PostgreSQL integrity and operational authorization are separate backend and deployment acceptance requirements.',
  ],
};
