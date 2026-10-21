import type { GuideChapter } from './guide-chapter';

export const runPinnedReadinessGuide: GuideChapter = {
  schemaVersion: 2,
  order: 33,
  slug: 'pinned-readiness-and-selected-evidence',
  title: 'Inspect readiness at the run pin and trace its selected evidence',
  summary:
    'Distinguish fixed-input re-evaluation, missing requirements and exact applicability, then inspect the selected citation without treating it as authority or outcome proof.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current run supervisors explaining a pinned readiness assessment, including independently visible terminal attempts.',
  overview: [
    'Readiness answers whether supported evidence at one fixed case prefix satisfies one exact immutable contract. It is not the mutable latest case, a persisted historical planner explanation, execution eligibility or accepted outcome proof. The current evaluator is explicitly version-labelled. Its READY result does not grant capability authority, certify connector availability, execute an action or close a case. Read contract declarations and outcome verification in their separate Console sections.',
    'Every response here is SIMULATED DATA. The browser, decoding, privacy withdrawal and keyboard behavior are real test subjects; the fixture does not verify OIDC, PostgreSQL selection or a provider. Prepared missing, mismatch and bounded examples are independent comparisons, not a production timeline in which immutable run inputs change on recheck. Production re-evaluation of unchanged inputs with unchanged evaluator semantics must not be understood as mutable readiness.',
  ],
  prerequisites: [
    'Deploy merged Ergon backend PR #182 and its governing ADR 0062 before this UI. The protected GET requires current exact-run supervision and tenant-wide resolver authority, including for terminal runs. It requires no control lease, originating actor, CSRF setup or enabled execution flag.',
    'Open Assigned runs through a verified workbench session and select an independently readable run. The browser keeps only ephemeral inspection intent; RTK owns the private observation. Each opening or recheck obtains fresh access, but observations do not promise continuous or atomic cross-query authority. Nothing is persisted in URLs or browser storage.',
  ],
  steps: [
    {
      id: 'discover',
      title: 'Find the read-only inspection',
      body: 'Select the synthetic assigned run and locate Readiness at run pin beneath the run records. The right-hand history warns that only its first hundred bindings are visible. Do not derive the latest selected fact from that list. Selection alone does not fetch readiness, acquire browser control, or enable a business command. The dedicated inspector requests only the protected run route on demand.',
      expected:
        'The inspection trigger is available, the history is explicitly truncated and the readiness request count is zero.',
    },
    {
      id: 'identity',
      title: 'Read the exact pin and evaluator',
      body: 'Choose Inspect pinned readiness. Confirm contract access-restoration revision 2, pinned case stream version 203 and supervision epoch 3. The evaluator identity ends in pinned-readiness/v1 and the authority observation retains nanosecond precision. These coordinates explain the fixed inputs and observation boundary, not historical planner reasoning, a latest-contract fallback or the current case version.',
      expected:
        'Ready at pinned boundary and the exact immutable coordinates are visible.',
    },
    {
      id: 'provenance',
      title: 'Inspect the binding beyond the history window',
      body: 'Scroll to Selected readiness evidence. The hundred visible historical rows contain ACTIVE, but the separately selected binding is number 203 with LOCKED, linked to source 202. This is the 101st binding at the pin, outside the history window. Selection follows stream order, not observation or recording time. Read the exact fact and observation identities, subject and provider without inferring independent source reliability.',
      expected:
        'The selected LOCKED binding and source 202 are visible independently of truncated history.',
    },
    {
      id: 'keyboard',
      title: 'Dismiss and obtain fresh access',
      body: 'Traverse forward and backward from Recheck pinned readiness using Tab. Focus must remain inside the modal rather than reaching background controls. Escape closes it and returns focus to the live inspection trigger. Reopening obtains a distinct protected observation. Closing retires this reader; it neither stops server work nor aborts another active subscriber or transfers supervision.',
      expected:
        'Keyboard containment, Escape, return focus and a distinct reopening succeed without writes.',
    },
    {
      id: 'narrow',
      title: 'Read long inert evidence at 320 pixels',
      body: 'At a narrow viewport, scroll through the complete citation and its deliberately long untrusted source text. The literal image markup must remain text, never an image or executable instruction. Long unbroken tokens wrap, and the modal scrolls vertically without horizontal clipping. This exercises CSS reflow, not browser zoom automation, and does not establish source confidence or post-action outcome verification.',
      expected:
        'The long source remains inert and readable with no horizontal modal or page overflow.',
    },
    {
      id: 'missing',
      title: 'Compare missing required evidence',
      body: 'Compare a separately prepared missing-evidence response, not a real mutation of the preceding pin. This example requires only the currently unsupported account.owner property, which remains missing. Existing account-access history is not required by this example and is not selected for disclosure. Applicability remains absent until every requirement exists. A successful missing-evidence assessment is neither a storage failure nor an empty case.',
      expected:
        'Waiting for pinned evidence appears with the missing name, no applicability and no selected binding.',
    },
    {
      id: 'precedence',
      title: 'Keep missing precedence and declaration order',
      body: 'In the next prepared example, a supported LOCKED binding exists but z.state and a.state are still missing. Their order follows contract declaration, not alphabetical sorting. Unsupported fact types remain missing. Even a known supported value does not justify evaluating applicability before all requirements exist. The source can be inspected, but the absent requirements are not silently satisfied.',
      expected:
        'The ordered missing list remains z.state then a.state, with selected evidence but no applicability.',
    },
    {
      id: 'mismatch',
      title: 'Compare exact case-sensitive applicability',
      body: 'The independent mismatch example has all requirements and selected actual value LOCKED, while the exact expected value is lowercase locked. NOT_APPLICABLE is distinct from missing evidence. Do not trim, fold case or reinterpret this equality. The result explains the current evaluator on those fixed inputs; it does not reject outcome proof, certify a connector or authorize a different action.',
      expected:
        'Not applicable at pinned boundary shows the exact lowercase expected and uppercase actual values.',
    },
    {
      id: 'held',
      title: 'Withdraw earlier evidence before rechecking',
      body: 'A controlled fixture hold now pauses a denied response. Choose Recheck pinned readiness and observe the pending message before the hold is released. The earlier assessment and source text disappear immediately rather than remaining readable under an old successful response. Rechecking is explicit, not automatic polling or a continuous authorization subscription; the hold proves presentation ordering only.',
      expected:
        'The pending access check contains no prior assessment or selected source.',
    },
    {
      id: 'denied',
      title: 'Respect neutral protected denial',
      body: 'Release the held denial. The earlier modal, private assignment rows, run facts and sources are withdrawn before presentation continues. Neutral absence does not reveal whether the run exists for a different actor, whether authority expired, or whether supervision changed. It must not be converted into a supported empty assessment, an internal endpoint fallback or a command replay.',
      expected:
        'Pinned readiness unavailable appears, private context is absent and focus moves to the persistent run heading.',
    },
    {
      id: 'recovery',
      title: 'Reacquire independent parent access',
      body: 'Choose Recheck run access after restoring a successful prepared response. Recovery first reacquires discovery and exact run authority; only then may you explicitly reopen readiness. No earlier source or assessment is restored from component state. The new inspection remains an observation, not a transfer of a lease or continuing permission to execute the pinned capability.',
      expected:
        'Fresh parent access and a distinct readiness read restore the independently checked assessment.',
    },
    {
      id: 'unsupported',
      title: 'Recognize an older backend',
      body: 'Compare an unknown missing-route response. The inspector says the protocol is unsupported and that no assessment was returned. This compatibility feedback remains local while the parent Console is independently authorized. Deploy the compatible backend instead of treating unsupported as missing requirements, READY, neutral private denial, or permission to call internal and latest-case endpoints.',
      expected:
        'Unsupported feedback is visible without an invented assessment or background command.',
    },
    {
      id: 'malformed',
      title: 'Fail closed on mismatched coordinates',
      body: 'The next prepared response claims a different pinned case version. Strict decoding rejects the entire observation, including its source, rather than displaying partially trustworthy fields. The shared inspection barrier withdraws the earlier parent disclosure and requires fresh recovery. Private response bodies and raw exception causes never become browser diagnostics or user-visible error details.',
      expected:
        'The malformed observation withdraws private context and offers only fresh run-access recovery.',
    },
    {
      id: 'bounded',
      title: 'Read a maximum-sized missing list',
      body: 'After recovery, compare fifty distinct missing fact names in contract order. Scroll to the last entry to ensure the complete bounded list remains accessible. Applicability is still absent even though the supported selected binding is known. The API bounds returned material, not database work or latency; this guide is not a large-case performance benchmark or a claim of complete evidence compilation.',
      expected:
        'All fifty names are available through vertical scrolling, including missing.fact-49.',
    },
    {
      id: 'parent',
      title: 'Withdraw inspection with the parent gate',
      body: 'Close the readiness modal, then recheck the selected run while its parent response is held. Readiness controls and private case context disappear with the parent gate before the held read settles. Once successful access returns, opening readiness must be explicit again. A retired response cannot resurrect a closed source or call a stale access-failure callback.',
      expected:
        'The held parent check exposes no inspector, and successful recovery returns only its closed trigger.',
    },
    {
      id: 'terminal',
      title: 'Inspect independently visible terminal work',
      body: 'The fixture now presents terminal detail after active discovery is empty. This prepared comparison does not execute a capability or accept proof. The existing selected run remains inspectable only because a new exact-run access check succeeds; membership in an active list is not authority. Pinned readiness still describes pre-action inputs, even beside a recorded terminal state.',
      expected:
        'The terminal run remains independently readable and its explicit readiness inspection still requires a fresh read.',
    },
    {
      id: 'close',
      title: 'Finish without creating work',
      body: 'Close the inspector and then the selected run. Private sources and ephemeral selection retire; no business command, CSRF request or control acquisition was sent. This read does not publish a contract, repair evidence, retry execution, finalize proof or close a case. Use the separately confirmed workflows for any authorized mutation, and consult the backend tests for actual authority and durable selection evidence.',
      expected:
        'No modal or private selected source remains and the command counter stays zero.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Inspection is unsupported or access is denied',
      guidance:
        'Deploy Ergon PR #182 before this UI; never substitute the internal latest-case readiness query. After neutral denial, recover parent access before reopening and do not infer why access failed.',
    },
    {
      symptom:
        'The observation is unavailable, malformed or misunderstood as execution permission',
      guidance:
        'Do not reinterpret storage and immutable-boundary failures as missing evidence. READY still requires independent command authorization, policy and outcome verification; it is not an operational green light.',
    },
  ],
  limitations: [
    'This is a simulated browser guide, not live OIDC, authorization, database, provider or performance verification. Response swaps compare prepared examples and must not imply mutable production meaning for fixed pins and evaluator semantics.',
    'Only account.access.state is currently supported. Missing requirements, selected citations and exact equality do not provide contradiction/confidence analysis, connector availability, reference registration, historical planning, grants or accepted outcome proof. No private state persists beyond its current disclosure lifetime.',
  ],
};
