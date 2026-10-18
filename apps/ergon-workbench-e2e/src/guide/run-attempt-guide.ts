import type { GuideChapter } from './guide-chapter';

/** Read-only navigation with real browser gates and marked synthetic authority responses. */
export const runAttemptGuide: GuideChapter = {
  schemaVersion: 2,
  order: 26,
  slug: 'inspect-recorded-predecessor-attempts',
  title: 'Inspect a retry predecessor without inheriting its access',
  summary:
    'Follow one recorded predecessor relationship, compare independently authorized attempts, and return through a fresh access check even when active discovery changes.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Assigned-run supervisors investigating how a fresh retry relates to the failed attempt it replaced.',
  overview: [
    'A retry creates a distinct run with its own supervision and independently evaluated safeguards. Attempt context exposes the immediate predecessor identity already recorded in the current authorized Console response. It is not a full retry tree, an execution trace, remaining budget, or permission to inherit approval, grants, connector receipts or accepted proof. Inspect each attempt on its own terms rather than combining their facts into a synthetic successful outcome.',
    'This chapter uses SIMULATED DATA. The browser performs actual navigation, schema checks, private-context withdrawal and fresh requests. The fixture supplies authority decisions, an earlier terminal run, held responses and changed discovery. It does not prove production OIDC, PostgreSQL history, assignment policy or connector behavior. Existing assigned-only backend reads remain authoritative; a recorded UUID never grants access.',
  ],
  prerequisites: [
    'Use a compatible backend exposing the existing assigned-run Console contract. This is read-only and requires no new endpoint, rollout flag, CSRF command or backend migration. General assignment and retry authorization remain separate reviewed capabilities.',
    'Start with an independently accessible successor, here attempt 2. Its predecessor may no longer be active, may have another supervisor, or may be unavailable. Current exact-run authorization is checked when you choose to inspect it, not when its relationship is displayed.',
    'Navigation identities are local to the mounted tenant workspace, not copied case snapshots. They are not bookmarks and are not persisted to URLs or browser storage. Closing, switching tenants, resetting traversal or ordinary list selection removes the return target. Reloading loses it without changing server history.',
  ],
  steps: [
    {
      id: 'origin',
      title: 'Read the current attempt relationship',
      body: 'Open Assigned runs and inspect the retry successor. Locate Attempt context beside the execution records. The section names recorded attempt 2 and its immediate predecessor. Simply displaying this relationship does not request predecessor data. Do not interpret the number as two remaining retries; only the separate current retry review can establish the runtime budget.',
      expected:
        'Only the successor has been read. The predecessor control is available without any mutation.',
    },
    {
      id: 'narrow',
      title: 'Inspect using the keyboard at narrow width',
      body: 'At 320 pixels, read the wrapped predecessor identifier and explanatory warning, then focus Inspect predecessor attempt. The control remains a normal keyboard-operable button inside the current pane; no new route, hidden drawer or fixed-width canvas is needed. The parent Console retains its responsive layout and no horizontal overflow is introduced.',
      expected:
        'The button is focused, identifiers wrap and automated accessibility checks find no violations.',
    },
    {
      id: 'predecessor',
      title: 'Read the independently authorized predecessor',
      body: 'Press Enter. The successor snapshot is removed before the new request starts. The fixture allows fresh access to the predecessor and reports SUPERSEDED. Read its own policy and initial-attempt explanation. That terminal state records replacement by a retry; it does not mean this earlier attempt succeeded or that the later attempt has accepted outcome proof.',
      expected:
        'The earlier attempt is visible with initial-attempt wording and no further predecessor control.',
    },
    {
      id: 'discovery',
      title: 'Distinguish active discovery from exact access',
      body: 'The recording now supplies an empty active assignment page and explicitly rechecks discovery. Both attempts can leave that list while terminal detail remains independently readable. No active runs is a discovery result, not a proof of deletion, resolution or revoked exact-run access. The selected predecessor is recovered only after the paired fresh gates succeed.',
      expected:
        'The active list is empty while a freshly authorized predecessor remains inspectable.',
    },
    {
      id: 'return',
      title: 'Return without restoring an old snapshot',
      body: 'Choose Return to originating attempt. Only a local identity was retained, so the browser obtains another exact successor read. The return target is consumed rather than creating a persistent browser history stack. You can inspect the predecessor again from newly disclosed relationship facts, but returning is never evidence of continuing supervision.',
      expected:
        'A second successor request succeeds despite empty active discovery; predecessor details disappear.',
    },
    {
      id: 'denied',
      title: 'Respect neutral predecessor absence',
      body: 'Open the predecessor again after the fixture changes its access response to neutral not-found. The browser withholds both snapshots and does not disclose whether the run exists, was handed over or is otherwise inaccessible. Do not infer ownership or request internal endpoints. The local return control offers a new access check, not a bypass.',
      expected:
        'Run context is unavailable; neither earlier private policy is rendered.',
    },
    {
      id: 'recover',
      title: 'Recover the origin through its own gate',
      body: 'Return to the originating attempt. The fixture still allows the successor, so another fresh read restores that run alone. There is no automatic predecessor retry and no hidden restoration of the failed snapshot. If the failure instead requests sign-in, use only the trusted app-composed sign-in path and expect local navigation intent to be lost when leaving.',
      expected:
        'The successor becomes visible after a new request; predecessor denial has not granted any new access.',
    },
    {
      id: 'pending',
      title: 'Leave a slow predecessor read safely',
      body: 'The fixture holds the next predecessor response. Inspect it and observe the loading message: previous private records are absent and focus stays on the persistent Resolution run heading. Return is available during this read, so a slow or obsolete request does not trap you in the earlier attempt. No timer or automatic polling is invented.',
      expected:
        'Only pending context and local return intent remain, without old execution or proof content.',
    },
    {
      id: 'retired',
      title: 'Ignore the retired late response',
      body: 'Return before the held response finishes. The browser freshly reads the successor and retires the predecessor subscription. The recording then releases the old response; it must not reopen the predecessor or replace current facts. Request cancellation is browser cleanup, not cancellation of a server action, though this chapter performs reads only.',
      expected:
        'The successor stays selected after the obsolete response is released, with no command sent.',
    },
    {
      id: 'origin-denied',
      title: 'Do not assume the origin remains accessible',
      body: 'Inspect the allowed predecessor, then return after the fixture denies the origin. A previously successful successor read does not establish continuing authority. The return check fails neutrally and the old successor snapshot stays hidden. The consumed return target does not build a loop of cached private views.',
      expected:
        'Run context is unavailable on return and no private attempt policy is shown.',
    },
    {
      id: 'recheck',
      title: 'Explicitly recheck after access is restored',
      body: 'The fixture now restores origin access. Choose Retry run read, which performs the existing deliberate read-recovery behavior. Only the new successful response allows current detail to render. This is not a retry command, connector invocation or promise that real authority has been restored; the server must independently decide that on every request.',
      expected:
        'Fresh origin detail appears only after the explicit successful read.',
    },
    {
      id: 'malformed',
      title: 'Reject malformed predecessor data',
      body: 'The fixture next returns an invalid predecessor identity. Inspect once more and observe a typed unreadable-response message instead of partial relationship or policy data. A successful HTTP status is insufficient for disclosure. The client validates exact requested identity and contract consistency before rendering, and offers no automatic mutation or fabricated fallback facts.',
      expected:
        'Malformed detail is withheld and the origin can be requested again through the local return control.',
    },
    {
      id: 'close',
      title: 'Close and discard local navigation context',
      body: 'Return once more, then close the run. The Console returns to selection with neither predecessor content nor a return target. No run IDs have entered the URL. Reopening later must start from current authorized discovery or another reviewed identity source; this feature is not general arbitrary run lookup. Server history is unchanged throughout.',
      expected:
        'The selected-run placeholder is shown and mutation count remains zero.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'There is no Inspect predecessor attempt control.',
      guidance:
        'An initial attempt has no recorded predecessor. Pending, denied or malformed snapshots cannot supply a relationship. This view does not search for successors or invent missing history.',
    },
    {
      symptom: 'A related run is unavailable, although its ID was visible.',
      guidance:
        'Relationship disclosure and current run access are different. Respect neutral absence. Return requests its own fresh authorization; it cannot restore previous ownership or bypass current resolver requirements.',
    },
    {
      symptom:
        'Active discovery is empty but selected terminal detail is visible.',
      guidance:
        'This is permitted by the existing exact-run read contract. Rechecking discovery and detail remains deliberate. No list membership is fabricated and no continuous revocation or polling guarantee is implied.',
    },
    {
      symptom:
        'The return button disappeared after closing or choosing another row.',
      guidance:
        'Return is short-lived local navigation intent, deliberately cleared by ordinary selection, close, traversal reset and tenant change. It is not persisted browser history. No server mutation has occurred.',
    },
  ],
  limitations: [
    'The guide demonstrates synthetic BFF responses and actual Chromium behavior, not live identity-provider, database, assignment or production certification.',
    'Only the immediate recorded predecessor and a single return target are supported; no full retry graph, successor search, arbitrary run lookup, global navigation history or automatic traversal is introduced.',
    'No command, inherited approval, execution, cost, remaining budget, proof acceptance, follow-up claim or case closure is performed. Non-Chromium engines and actual browser zoom are not certified by these narrow-layout checks.',
  ],
};
