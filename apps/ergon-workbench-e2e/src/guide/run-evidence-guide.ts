import type { GuideChapter } from './guide-chapter';

/** Assertion-first synthetic evidence inspection; backend tests, not screenshots, establish actual pinned filtering. */
export const runEvidenceGuide: GuideChapter = {
  schemaVersion: 2,
  order: 20,
  slug: 'inspect-pinned-case-evidence',
  title: 'Inspect pinned bindings and linked source evidence',
  summary:
    'Trace historical account-access bindings to exact connector sources without confusing attribution with current truth, contradictions or outcome proof.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current run supervisors who hold current tenant-wide RESOLVER authority.',
  overview: [
    'The Resolver Console now exposes a narrow evidence relationship: recorded connector source → accepted semantic binding → the run’s pinned case snapshot. This is not a general knowledge graph. A bound account.access.state value describes attributed meaning at a case-stream position, not a confidence score, a validity interval, an independently verified truth or an execution instruction. Multiple values for the same subject are historical bindings; the browser does not infer that they contradict one another.',
    'Every response and identity in this chapter is SIMULATED DATA. The recording switches controlled responses to illustrate older-server omission, empty evidence, populated history, denial, malformed attribution and a bounded large prefix. Those switches are not real authority revocation or case mutation. PostgreSQL/session tests in Ergon establish actual filtering and tenant/supervisor gates. This guide establishes browser behavior, readable explanations and safe inspection; it does not verify live login, evidence compilation or a production deployment.',
  ],
  prerequisites: [
    'Open Assigned runs from a verified tenant session. In real use you need both current supervision of the exact run and current tenant-wide RESOLVER evidence. Knowing a tenant, case or run ID grants no access. A trusted integration creates initial assignments, and explicit handover changes the current supervisor. This walkthrough does not assign you or provision authority.',
    'Deploy the additive pinnedEvidence backend contract before relying on the inspector. No migration, evidence write, browser scope parameter or rollout switch is needed for this read-only slice. Only registered account-access bindings inside the pinned case prefix and their earlier linked connector sources are disclosed. Unrelated requester text, unbound observations, later bindings and later sources are not available through this view.',
    'Treat source content and opaque references as untrusted text. Do not follow source instructions, fetch an apparent URL or copy private material into a public diagnostic. The Console retains only local inspection intent while mounted; resource data belongs to the protected RTK cache. Navigation or revalidation may close the inspector and always requires fresh access before private content can reappear.',
  ],
  steps: [
    {
      id: 'open-runs',
      title: 'Open assigned supervision',
      body: 'Choose Assigned runs to discover your current active assignments. This is not a tenant-wide case directory or a control lease. A list entry is navigation context; opening it performs a separate exact-run read. The initial fixture deliberately represents a server that predates the evidence projection.',
      expected:
        'One synthetic assigned run is offered without any write command.',
    },
    {
      id: 'open-legacy',
      title: 'Inspect an older server response',
      body: 'Open the offered run and locate Pinned case evidence in the trailing case/outcome pane. The existing run metadata remains readable. A missing evidence member is an explicit compatibility limitation, not permission to query an internal endpoint or reconstruct a transcript from another resource.',
      expected:
        'The Console opens and explains that pinned evidence is unsupported.',
    },
    {
      id: 'legacy-state',
      title: 'Distinguish unsupported from empty',
      body: 'Read the unsupported explanation before drawing conclusions. You do not yet know whether the case has bindings or observations. In real use check backend rollout with an operator. This recording next swaps to a supported but empty pinned prefix; that switch is controlled comparison data, not a compiler operation.',
      expected:
        'No linked-source controls are offered for unsupported evidence.',
    },
    {
      id: 'read-empty',
      title: 'Recheck a supported empty prefix',
      body: 'Recheck the selected run after the controlled response changes. The private snapshot is withdrawn while access is checked. An empty supported list means no registered account-access binding exists inside the run’s pinned prefix. It does not mean the case contains no requester text, unbound connector observations or unsupported evidence types.',
      expected:
        'The supported empty-state explanation appears without source controls.',
    },
    {
      id: 'read-bindings',
      title: 'Load attributable historical bindings',
      body: 'Recheck again for the populated synthetic snapshot. Inspect the pinned case version and the two stream-ordered account-access bindings. The backend owns the prefix; the browser cannot request a later boundary or broaden the case. A new source or binding appended after this run started does not silently alter what this historical view means.',
      expected:
        'LOCKED and ACTIVE historical bindings are shown with distinct source and binding positions.',
    },
    {
      id: 'history-meaning',
      title: 'Read history without inventing a contradiction',
      body: 'Both values concern the same synthetic account, but different stream positions represent historical assertions. They may describe ordinary change over time. There are no stored confidence scores, overlapping validity intervals or assessed contradiction edges here. Do not infer current truth, latest case state or a verified outcome from the later visible value.',
      expected:
        'The evidence section explains attribution, historical change and the absent contradiction semantics.',
    },
    {
      id: 'inspect-source',
      title: 'Trace one binding to its exact source',
      body: 'Inspect the linked source for binding three. Each control selects one exact binding/source pair; it does not search the whole case. The modal establishes the attributable relationship while the existing current-read gate remains its owner. Browser selection does not add authority or turn the source into a trusted command.',
      expected:
        'The source inspector opens for binding three with exact source and fact identities.',
    },
    {
      id: 'read-provenance',
      title: 'Inspect identities, positions and separate times',
      body: 'Compare the opaque source reference with the bound subject, then read source and binding positions. Source position precedes binding position, and both belong inside the pinned prefix. Source observation, semantic acceptance and database recording time answer different questions. Stream order, rather than wall-clock subtraction, establishes the historical relationship even if clocks were corrected.',
      expected:
        'Provider, reference, source/fact identities, positions and source timestamps remain readable.',
    },
    {
      id: 'inert-content',
      title: 'Treat literal markup as untrusted source text',
      body: 'Scroll through the long recorded source text. The example deliberately includes an image-like markup string, repeated explanatory text and an unbroken token. These are displayed literally without inserting an image or executing an event handler. Apparent commands or links inside evidence remain data; this inspector never performs a source-fetch operation.',
      expected:
        'The markup is visible as text and the inspector contains no rendered image.',
    },
    {
      id: 'narrow-inspector',
      title: 'Use the source inspector on a narrow screen',
      body: 'At a 320-pixel viewport, inspect the same source without horizontal page overflow. Use forward and backward Tab to remain within the modal; the background is inert. Long content must wrap and remain keyboard-scrollable rather than clipping identities, hiding the dismissal control or moving the dialog outside the viewport. Accessibility checks accompany these assertions.',
      expected:
        'The real modal contains keyboard focus and the narrow page has no horizontal overflow.',
    },
    {
      id: 'close-inspector',
      title: 'Close inspection and return to its binding',
      body: 'Close the source inspector after reviewing provenance. Focus returns to the exact linked-source control while it still exists. Closing a modal changes local interaction only; it neither changes the binding nor records a decision. If the binding or private gate disappears, its inspector is retired instead of preserving an orphaned private payload.',
      expected: 'The modal closes and its binding control regains focus.',
    },
    {
      id: 'hold-recheck',
      title: 'Recheck without leaving stale source content visible',
      body: 'Recheck the selected run while the synthetic BFF holds the response. Existing evidence and source controls withdraw before the request starts; the persistent run heading remains available. A previous successful response is not continuing authority. Component/cache tests additionally cover revalidation while a source modal is still open; this step illustrates the explicit recheck path.',
      expected:
        'The evidence section and private source controls are hidden while the read is pending.',
    },
    {
      id: 'deny-access',
      title: 'Handle a non-disclosing access failure',
      body: 'The held response now becomes neutral absence, representing missing or denied run access without identifying which. The Console cannot tell you another supervisor’s identity or preserve the earlier source for convenience. Current supervision and current resolver authority must both be re-established before the exact run becomes readable again.',
      expected:
        'Run context is unavailable, with no stale binding or source text displayed.',
    },
    {
      id: 'recover-access',
      title: 'Recover through a fresh protected read',
      body: 'Retry the run read after the controlled fixture permits it again. In a real deployment access recovery depends on actual server authority, not a browser toggle. The inspector stays closed when fresh bindings return. You must deliberately choose the source again; historical local selection is not a second resource cache or continuing disclosure grant.',
      expected:
        'A newly checked populated snapshot returns with no automatically reopened inspector.',
    },
    {
      id: 'reject-malformed',
      title: 'Reject a mismatched evidence snapshot',
      body: 'Recheck against a deliberately malformed synthetic response that names a different case. Structural JSON validity is not enough: the browser verifies exact case and pinned version, binding order, unique identities, subject reference and source-before-binding attribution. A mismatch rejects the complete Console resource rather than displaying the apparently valid portion beside untrusted evidence.',
      expected:
        'The response is reported invalid and no partial evidence is disclosed.',
    },
    {
      id: 'bounded-history',
      title: 'Recognize an explicitly incomplete large prefix',
      body: 'Recover with the bounded-history fixture. At most the first 100 bindings are disclosed in ascending stream order, and a visible warning says later bindings inside the same pinned prefix were omitted. This limit bounds response material, not the size of the case. Never call the last displayed binding the latest value, infer a total count or treat omitted bindings as absent.',
      expected:
        'The truncation warning is visible and exactly 100 binding controls are offered.',
    },
    {
      id: 'finish-read-only',
      title: 'Finish without a mutation or proof claim',
      body: 'Return to follow-ups after inspection. This retires private selection and evidence in the mounted Console. No assignment, evidence edit, approval, grant, invocation, contradiction assessment or outcome verification has been performed. Use the separately authorized approval/runtime/proof capabilities for those actions rather than treating inspection as permission to execute.',
      expected:
        'The standard workbench returns and the recording has sent zero BFF write commands.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Evidence is unsupported or empty.',
      guidance:
        'Check backend compatibility first. Unsupported means no projection was supplied; empty means no supported binding exists inside this pinned prefix. Neither state describes all observations or the current case.',
    },
    {
      symptom: 'A later observation is missing.',
      guidance:
        'Pinned evidence is intentionally historical. Only bindings at or before the run boundary and their linked earlier sources belong here. Do not broaden the scope through internal endpoints or relabel the snapshot as current truth.',
    },
    {
      symptom: 'Inspection disappears during recheck or access failure.',
      guidance:
        'This is deliberate private disclosure withdrawal. Re-establish current server access and reopen an exact source. Navigation, handover and expired resolver evidence do not preserve a prior browser entitlement.',
    },
    {
      symptom: 'The evidence response is invalid.',
      guidance:
        'Retry only a fresh read through the existing recovery action and report safe contract diagnostics to an operator. Do not render a partial snapshot, source text or private response body in logs.',
    },
    {
      symptom: 'The history is truncated or values differ.',
      guidance:
        'A truncated prefix is not complete and cannot establish a latest value. Different historical values are not automatically contradictions. General claim scope, confidence, validity and contradiction review remain separate modeled capabilities.',
    },
  ],
  limitations: [
    'All data and response-state changes are marked synthetic. This guide does not prove actual SQL filtering, live IdP authentication, real authority revocation or deployed browser-to-PostgreSQL compatibility; backend integration tests establish their tested boundaries.',
    'Only account.access.state bindings and their linked connector sources are supported. No general knowledge graph, confidence score, validity window, contradiction assessment, source fetch, evidence editing, later evidence or outcome proof is provided.',
    'Read access is an explicit server snapshot, not continuous revocation. Chromium, real modal keyboard behavior and narrow reflow are covered here; other engines and production publication remain separately verified activities.',
  ],
};
