import type { GuideChapter } from './guide-chapter';

export const runPinnedContractGuide: GuideChapter = {
  schemaVersion: 2,
  order: 32,
  slug: 'pinned-resolution-contract',
  title:
    'Inspect the exact pinned contract without confusing declarations with execution',
  summary:
    'Read immutable applicability, evidence, ordered declarations and outcome conditions under fresh access, while separating effective safeguards and accepted proof.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current run supervisors investigating why a pinned contract differs from runtime policy, including independently visible terminal attempts.',
  overview: [
    "The Console's compact run snapshot identifies one immutable contract and one pinned capability. This inspector discloses the normalized meaning of that exact revision, not a latest catalog entry or original authoring YAML. Applicability, evidence requirements, declared actions, effective runtime safeguards and accepted outcome proof have different meanings. Keeping them distinct prevents an inspection from implying that all declared actions are scheduled or authorized.",
    'Every response in this chapter is SIMULATED DATA. Real browser rendering, strict decoding, private resource lifetime, keyboard behavior and reflow run against marked producer-owned fixtures. Switching responses does not publish contracts, change real supervision, execute capabilities, verify PostgreSQL or authenticate with a live provider. Backend PR #180 and ADR 0061 own actual authorization and immutable-storage verification.',
  ],
  prerequisites: [
    'Deploy merged Ergon backend PR #180 before the UI. The protected read requires current exact-run supervision and current tenant-wide resolver evidence, including for terminal attempts. It needs neither a control lease nor CSRF setup nor the originating actor nor an enabled execution-command rollout.',
    'Open an independently authorized run through the verified workbench session. The inspection is requested only on demand; each reopening or recheck obtains a distinct observation. Read access is observation-time, not continuous or atomically synchronized with every parent query. No private definition, selection or authority is persisted in URLs or browser storage.',
  ],
  steps: [
    {
      id: 'discover',
      title: 'Find the exact-run contract inspector',
      body: 'Open Assigned runs and select the synthetic assigned run. Locate Pinned resolution contract beneath the run records. Selection alone must not fetch the optional definition. Read the introduction before opening: current supervision and resolver evidence are independently checked, and browser control is not acquired. This walkthrough uses prepared responses rather than a real session or database.',
      expected:
        'The read-only trigger is available and the contract read count remains zero.',
    },
    {
      id: 'identity',
      title: 'Read immutable identity and observation metadata',
      body: 'Choose Inspect pinned contract. Confirm access-restoration revision 2, the same revision pinned by the selected run, rather than a latest revision chosen by the client. Read the schema, supervision epoch and authorization observation alongside the contract recording instant. Here recording appears later than the observation: wall-clock correction is allowed, and these instants do not measure execution duration or continuing authority.',
      expected:
        'The exact key/revision and nanosecond recording metadata are visible without a newer-version fallback.',
    },
    {
      id: 'meaning',
      title: 'Preserve exact condition values as inert text',
      body: 'Inspect Declared applicability. The expected value deliberately contains surrounding spaces and literal markup. Equality remains exact and case-sensitive; trimming or rendering HTML would change its meaning. The browser displays text, never executes it. Required evidence declarations list account.state and account.owner in their original order. Neither section assesses whether current evidence satisfies the contract, explains why it was historically selected, or certifies registered references.',
      expected:
        'The literal markup remains text and the applicability condition is not presented as a readiness decision.',
    },
    {
      id: 'steps',
      title: 'Compare declared safeguards with the pinned runtime policy',
      body: 'Read the ordered declaration list. z-observe appears before verify-account-owner and a-not-scheduled; names are not sorted. The second step is marked Pinned by this run and declares LOW risk with NONE approval. Its run-effective policy is HIGH with RESOLVER approval. Stronger runtime safeguards are valid and must not be overwritten by declarations. The other steps are declared only, not scheduled work or performed actions.',
      expected:
        'Three declarations preserve order, with one pinned step and an explicit declared-versus-effective policy comparison.',
    },
    {
      id: 'outcome',
      title: 'Keep the outcome condition separate from proof',
      body: "Scroll to Declared outcome condition and read the account.state equality against ACTIVE. This is the contract's requested verification condition, not an assessment that the state is currently active. It neither supplies a citation nor accepts proof or closes a case. Use the Console's separate authorized outcome-verification section for those facts. Inspection also does not certify tenant connector availability or grant the capability.",
      expected:
        'The outcome condition is visible with an explicit warning that it is not assessment or accepted proof.',
    },
    {
      id: 'keyboard',
      title: 'Dismiss and reopen with fresh access',
      body: 'Focus Recheck pinned contract and traverse both directions with Tab. Focus stays inside the native modal rather than reaching background Console controls. Press Escape and verify return to the live Inspect pinned contract trigger. Closing retires this private reader, not server work or another subscriber. Reopening must acquire a new protected observation instead of treating the retained earlier response as fresh authority.',
      expected:
        'Keyboard containment and Escape succeed; the modal closes and trigger focus returns synchronously.',
    },
    {
      id: 'narrow',
      title: 'Inspect declarations at a narrow viewport',
      body: 'At 320 pixels, open the inspector again and scroll to the pinned declaration. Long identifiers, timestamp precision and literal condition text must wrap without horizontal page or modal overflow. The inspection remains a complete reading surface, not a clipped desktop table. This viewport comparison proves CSS reflow, not browser zoom automation. The existing app owns outer allocation and the shared modal owns scrolling and placement.',
      expected:
        'The pinned step remains readable in a vertically scrolling modal without horizontal overflow.',
    },
    {
      id: 'held',
      title: 'Hide earlier definitions during revalidation',
      body: 'The fixture now prepares a held denial response. Choose Recheck pinned contract and observe the committed pending state before releasing that response. The previous definition and step rows disappear immediately, while the protected-access message remains. An old successful resource is not continuing permission. This controlled hold is deterministic test evidence for presentation ordering, not a real server authorization race or a promise of continuous monitoring.',
      expected:
        'Pending inspection shows its access-check message with no earlier definition or declarations.',
    },
    {
      id: 'denied',
      title: 'Respect neutral protected absence',
      body: 'Release the held denial. The modal and earlier workspace data are withdrawn, including assigned private rows. Focus moves to the persistent Resolution run heading. The message intentionally does not identify whether a run exists, another actor owns it, authority expired or tenant access failed. Do not recover from a copied response, invoke an internal endpoint or create a command; request fresh run access instead.',
      expected:
        'Neutral unavailability replaces private context and leaves a safe explicit recovery action.',
    },
    {
      id: 'recovered',
      title: 'Reacquire parent access before inspecting again',
      body: 'Switch the marked fixture back to its valid response and choose Recheck run access. Discovery and exact Console gates run again before optional inspection is available. Open the inspector explicitly and verify the exact definition returns. Recovery never restores authority from a historical receipt, contract revision or local selection. The browser stores opening intent only; RTK Query remains the owner of the private remote resource.',
      expected:
        'Fresh run access and a separate fresh contract observation restore the definition without sending commands.',
    },
    {
      id: 'unsupported',
      title: 'Recognize an older unsupported server',
      body: 'Recheck against an unknown missing-route response. Unsupported is compatibility feedback under the independently successful parent gate, not an empty definition, missing contract or authorization grant. The old private definition remains hidden. Deploy the compatible backend before relying on inspection; there is no internal API fallback or reconstruction from the Console summary. Other independently authorized Console content may remain available.',
      expected:
        'The modal states unsupported explicitly and does not fabricate a successful empty definition.',
    },
    {
      id: 'malformed',
      title: 'Fail closed on a mismatched immutable pin',
      body: "Recheck against a prepared response with revision 99 while the selected run pins revision 2. Even a structurally plausible definition is not acceptable for another revision. The client rejects the whole response without partial caching or displaying its steps, and the existing protected-inspection barrier withdraws earlier workspace context. The actual backend validates durable attribution independently; this scenario verifies the browser's boundary rather than database correctness.",
      expected:
        'The malformed observation withdraws the modal and workspace instead of displaying a wrong revision.',
    },
    {
      id: 'bounded',
      title: 'Navigate the full supported declaration boundary',
      body: 'Recover fresh access and inspect the prepared fifty-step definition, the current domain maximum. Scroll to the last declaration and use PageUp with focus inside the dialog to move back through the document. The list is complete, not a silently truncated selection, and long definitions remain keyboard-scrollable. A response exceeding the bound is rejected by protocol tests rather than partially displayed as valid contract meaning.',
      expected:
        'All fifty declarations render and the modal scroll position changes through keyboard input.',
    },
    {
      id: 'terminal',
      title: 'Inspect an independently authorized terminal run',
      body: 'Close the modal, switch the fixture to a terminal snapshot and remove the run from active discovery. Recheck assignments while keeping its selected identity, then explicitly inspect again after exact-run access succeeds. Absence from the active list does not itself revoke or grant access; the protected endpoint independently checks the current supervisor. Terminal visibility is still observation-time and does not prove outcome acceptance.',
      expected:
        "The selected terminal run's exact definition remains inspectable after active discovery empties.",
    },
    {
      id: 'closed',
      title: 'Finish without changing execution or authority',
      body: 'Press Escape to finish and verify focus returns to the inspector trigger. The synthetic business-command count remains zero: no CSRF setup, control acquisition, approval, execution, retry, cancellation or proof-finalization command was sent. Navigation or future failed revalidation must retire private content rather than persist it in URLs or storage. Generated media documents this simulated browser flow only and is reviewed before sharing.',
      expected:
        'The modal is absent, focus is restored, and no business command has been issued.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Declared safeguards are weaker than the run-effective policy.',
      guidance:
        'This is valid. Runtime policy may strengthen risk and approval requirements; declarations are minimum inputs, never grants or decisions. Use the separately reviewed command surface for current eligibility. Do not substitute LOW/NONE declarations for HIGH/RESOLVER effective policy.',
    },
    {
      symptom:
        'The definition is pending, unavailable, unsupported or malformed.',
      guidance:
        'Pending checks hide earlier content. Protected failures withdraw earlier workspace disclosure; choose Recheck run access before inspecting again. Unsupported means a compatible backend must be deployed, not an empty contract. Mismatched pin coordinates fail closed. Never fetch an internal route or select the latest revision to bypass the failure.',
    },
    {
      symptom: 'More steps are declared than the runtime appears to execute.',
      guidance:
        'Declaration order is not a live DAG, schedule, trace or proof of effects. The current runtime pins one capability. The other declarations are not promised work. Original YAML and comments were not retained, so this normalized view cannot reproduce authoring source or explain historical selection.',
    },
  ],
  limitations: [
    'Synthetic fixtures prove browser behavior only, not real identity, authority, database durability, providers or production safety. Generated book, screenshots and videos remain ignored review artifacts, never committed.',
    'No catalog, editing, publishing, original YAML, reference-registration or connector-availability certification, readiness reassessment, causal DAG, multi-step executor, live polling, new grant, command or accepted proof is introduced.',
  ],
};
