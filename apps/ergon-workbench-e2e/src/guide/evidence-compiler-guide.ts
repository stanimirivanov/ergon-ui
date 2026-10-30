import type { GuideChapter } from './guide-chapter';

export const evidenceCompilerGuide: GuideChapter = {
  schemaVersion: 2,
  order: 47,
  slug: 'evidence-review-and-bundles',
  title: 'Review cited contradictions and publish an exact historical bundle',
  summary:
    'Inspect accepted documentary alternatives, record an explicit preference, recover uncertain commands, and read an immutable bundle without confusing cited assertions with live operational facts or execution permission.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Tenant resolvers reviewing already proposed and accepted documentary evidence.',
  overview: [
    'The evidence route separates proposal review from contradiction assessment and historical bundle inspection. Source quotations and typed claims remain distinct: a valid quotation proves attribution to stored bytes, not that a human semantic binding is true. This walkthrough starts with two accepted, opposed support claims for one exact subject, property and scope. Their validity intervals overlap. The comparison is a bounded typed conflict, not arbitrary prose understanding, and a reviewer must explicitly choose a disposition.',
    'Every response in this recording is synthetic and marked as a simulated BFF fixture. The first adjudication and publication responses are deliberately unavailable to exercise immutable retry intent. This demonstrates browser interaction and safe content retirement, not a real database commit or live authorization. Backend M06-PR14 acceptance separately covers licensed source registration, deterministic compilation, citations, claim/procedure review, adjudication, bundle publication and case-pinned documentary contract readiness. The two records complement each other; neither proves a deployed browser, identity provider and database work together.',
  ],
  prerequisites: [
    'Enter the workbench through a configured browser session and an authorized tenant route. The tenant in the URL selects context and never grants resolver authority. Have an exact accepted anchor claim identity from a reviewed proposal. Source submission, compilation and proposal binding use separate backend workflows; this route does not upload source files, infer claims or author resolution contracts.',
    'Understand the boundary before confirming a write. An accepted claim is a reviewed documentary assertion. A preferred claim is an explicit adjudication over a recorded candidate set. A published bundle freezes those references and its assessment cutoff. None supplies a current account observation, a capability registration, human approval, connector authorization or post-action outcome proof. Inspect those independent runtime boundaries through their own supported workflows.',
  ],
  steps: [
    {
      id: 'assessment',
      title: 'Inspect the exact accepted claim set',
      body: 'Open Review contradictions, enter the accepted anchor claim ID and inspect the exact set. Compare both literal quotations and their typed values, scope and validity. The fixture displays CONFLICT because its selected values disagree over overlapping intervals. Candidate and review identities belong to this assessment revision; do not substitute an inferred latest claim or treat the absence of another finding as proof of universal consistency.',
      expected:
        'Two inert source quotations and the explicit CONFLICT heading appear with no adjudication or publication.',
    },
    {
      id: 'narrow',
      title: 'Keep citations readable at a narrow viewport',
      body: 'At 320 pixels, read both alternatives and the comparison without horizontal page overflow. The image-shaped markup in the quotation remains literal text and creates no image element. Keyboard focus belongs to the evidence workspace rather than an unrelated Console. The scenario runs automated accessibility checks here, but these checks are supporting evidence rather than a complete assistive-technology audit.',
      expected:
        'The complete cited comparison remains readable, inert and free of detected automated accessibility violations.',
    },
    {
      id: 'uncertain-decision',
      title: 'Confirm a preference and preserve uncertain intent',
      body: 'Choose Prefer claim, select the exact preferred identity and enter a rationale. Confirm with the keyboard. The simulated response is unavailable, so private quotations retire and the result pane receives focus. Do not invent a replacement command or assume failure means nothing happened. The browser preserves the original command identity and payload for an explicit exact retry; this is recovery intent, not evidence of server acceptance.',
      expected:
        'The focused command result offers Retry exact command while the previous quotations are withdrawn.',
    },
    {
      id: 'adjudicated',
      title: 'Recover the recorded preference',
      body: 'Retry the exact command. Verify that the recovered adjudication still refers to the original candidate-set revision and preferred claim. The fixture checks that request identity and payload are unchanged. Current candidate-set revision means the inspected adjudication still matches this assessment; it does not promise that future acceptance cannot make it historical. Publication remains a separate explicit choice.',
      expected:
        'The current candidate-set indicator appears and only the selected claim is offered for the bundle.',
    },
    {
      id: 'uncertain-bundle',
      title: 'Publish without replacing uncertain intent',
      body: 'Confirm bundle publication using the reviewed selection. A second prepared response failure retires the private comparison again. Retain the publication command, exact claim set and adjudication identity for retry. Do not retry with a different bundle ID merely to dismiss uncertainty. If the server instead reports stale candidates, reacquire the assessment and make a new explicit decision using the changed inputs.',
      expected:
        'Publication shows an uncertain command result with explicit recovery and no stale quotations.',
    },
    {
      id: 'historical-bundle',
      title: 'Read the immutable manifest and cutoff',
      body: 'Retry publication and inspect the historical evidence bundle. Distinguish the selected claim from the assessed alternative retained as context. Read the recorded assessment cutoff and exact bundle identity and digest. Later evidence does not rewrite this historical manifest. Backend documentary readiness separately matches the exact case attachment and qualifies selected claim intervals at its database recording time. The browser in this walkthrough neither attaches the bundle nor evaluates a documentary contract.',
      expected:
        'Historical bundle, context alternative and original cutoff appear after an unchanged exact publication retry.',
    },
    {
      id: 'withdrawn',
      title: 'Recheck access and withdraw private history',
      body: 'Recheck current documentary access after the fixture withdraws authority. The workspace obtains fresh access and removes the historical bundle instead of keeping private content behind an error banner. The alert explains unavailability and focus returns to the evidence heading. This is request-bound observation and retirement, not continuous server revocation or erasure from another browser tab. Restore authorized access through the supported session workflow before inspecting again.',
      expected:
        'Unavailable feedback replaces the private bundle and the evidence workspace regains focus.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Publication says the candidate set changed.',
      guidance:
        'Recheck documentary evidence, inspect the historical decision and assess the current set before creating new intent. Never reuse a preference for changed candidates.',
    },
    {
      symptom: 'A comparison is undetermined or has too few candidates.',
      guidance:
        'Inspect scope, validity and available accepted claims. Unknown information is not a proven absence of conflict and must not be resolved by automatic selection.',
    },
    {
      symptom: 'The guide cannot reach a real source or contract.',
      guidance:
        'This is deliberately a simulated UI guide. Use the backend compiler operations and acceptance records for source submission and exact contract consumption; no internal endpoint is promoted into a browser workflow.',
    },
  ],
  limitations: [
    'Synthetic responses verify UI behavior only; compilation, transactional publication, database fences and source licensing are covered separately in backend acceptance.',
    'No live two-app/OIDC deployment, provider, arbitrary-prose inference, browser source authoring or documentary readiness UI is verified here.',
    'Documentary satisfaction never replaces operational observations, approval, execution authorization or outcome proof. M07 simulation and promotion remain separate work.',
  ],
};
