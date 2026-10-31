import type { GuideChapter } from './guide-chapter';
export const simulationGuide: GuideChapter = {
  schemaVersion: 2,
  order: 50,
  slug: 'simulation-contract-promotion',
  title: 'Review exact simulation evidence and confirm contract promotion',
  summary:
    'Inspect the required suite and policy, acknowledge exact evidence, and recover an uncertain promotion using the original command identity.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Evaluation viewers and contract promoters responsible for controlled contract admission.',
  overview: [
    'Simulation Lab presents historical deterministic evaluation evidence. Passing a report alone does not authorize promotion. The server selects the governing suite, policy and contract revision from the current tenant binding, then assesses the complete supplied evidence. The browser cannot choose a weaker policy or substitute the latest passing report automatically.',
    'This walkthrough uses synthetic BFF responses, simulated authority and a deliberately lost acknowledgement. It demonstrates browser confirmation and recovery behavior; it does not prove database isolation, real identity-provider authorization, live provider quality or production admission. The recovered receipt reports an original promotion rather than silently issuing a replacement command.',
  ],
  prerequisites: [
    'Deploy the protected simulation browser contracts and register a tenant actor. Evaluation review requires EVALUATION_VIEWER; confirmation also requires CONTRACT_PROMOTER. These grants are separate from resolver authority and from each other. An administrator supplies the tenant entry and required-suite binding through trusted management operations outside this browser surface.',
    'Inspect reports first and copy exact fixture key, revision and SHA-256 together with report UUID and report digest. Enter a JSON array containing the complete selected evidence for the required scenarios, the contract key and a trimmed rationale. Missing, failed, unsupported or incompatible required evidence makes eligibility fail. Unknown simulated budgets never become zero.',
  ],
  steps: [
    {
      id: 'promotion-review',
      title: 'Inspect the exact advisory review',
      body: 'Open Review contract promotion from Simulation Lab. Supply the contract key, exact report coordinates and rationale, then request review. Read the returned contract, suite, policy, binding version, every evidence digest and per-scenario result. This explicit POST obtains a fresh CSRF token and does not create a promotion command. Cancel discards the private review without changing contract admission.',
      expected:
        'The exact review shows ELIGIBLE for the synthetic required scenario and confirmation remains disabled until acknowledgement.',
    },
    {
      id: 'promotion-confirm',
      title: 'Acknowledge and confirm once',
      body: 'At narrow width, use the labelled acknowledgement checkbox and Confirm promotion button. Confirmation withdraws the review before command transport and captures one UUID with the complete reviewed intent. The backend must recheck both authorities, the binding version and exact evidence atomically. This fixture loses the first acknowledgement deliberately, so the UI cannot infer whether promotion was recorded.',
      expected:
        'The review disappears and an uncertain outcome offers only replay of the original command.',
    },
    {
      id: 'promotion-recover',
      title: 'Explicitly replay the original command',
      body: 'Choose Replay original promotion after reviewing the uncertainty message. The browser requests fresh CSRF and resends the same UUID, rationale, reports, policy, suite, contract and binding version. It does not refresh the review, mint a new intent or automatically retry. Current server authority is required even when recovering an existing promotion; denial or staleness withdraws the recovery option.',
      expected:
        'The original command acknowledgement returns with its unchanged binding version and original promotion time.',
    },
    {
      id: 'promotion-receipt',
      title: 'Read the historical acknowledgement',
      body: 'Read the recorded contract revision, command UUID, binding version and original promotion time. The receipt distinguishes new recording from exact recovery. It is historical evidence and does not promise that a later binding change still allows this revision to start. Return to evaluations to retire the mounted command and private cache; tenant departure or local sign-out also retires them.',
      expected:
        'Promotion recorded identifies the original command and reports that the original command was recovered.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'The review is stale or confirmation is denied.',
      guidance:
        'Cancel and recheck access. A binding update requires a fresh review; expired or revoked authority cannot be repaired by replaying a historical report. Contact the trusted issuer for entitlement administration.',
    },
    {
      symptom: 'The outcome is uncertain after a network failure.',
      guidance:
        'While the current view remains mounted, replay only the original command. Leaving the route retires local recovery state. This UI has no persisted command journal or historical promotion discovery; arrange authorized operational reconciliation rather than assuming the write did not occur.',
    },
  ],
  limitations: [
    'All guide data and transport outcomes are synthetic. No live backend or production contract is promoted.',
    'Report selection uses explicit JSON coordinates; fixture authoring, authority administration and automatic selection are outside this surface.',
    'Binding versions must fit the browser safe integer range. Rechecks are explicit; no instantaneous post-response revocation is claimed.',
  ],
};
