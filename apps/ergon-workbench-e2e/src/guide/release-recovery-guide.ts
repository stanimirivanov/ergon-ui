import type { GuideChapter } from './guide-chapter';

/** Assertion-backed guidance for disabled and uncertain claim release. */
export const releaseRecoveryGuide: GuideChapter = {
  schemaVersion: 2,
  order: 18,
  slug: 'recover-from-release-uncertainty',
  title: 'Recover from unavailable or uncertain release',
  summary:
    'Recognize when release is disabled, then recover an uncertain enabled release with an exact retry and fresh shared-work read.',
  verification: 'simulated-bff',
  presentation: 'state-comparison',
  audience: 'Resolvers releasing their own claimed human follow-ups.',
  overview: [
    'Release returns an owned, still-open follow-up to its original shared queue. It does not complete the case or transfer it to a named resolver. The control plane accepts only the active owner, claim ID, and expected ownership revision. Its response can mean either a definite rejection or an uncertain result; those cases call for different action.',
    'This chapter compares two synthetic deployment states. First, the release rollout is disabled and a typed unavailable response leaves the claim owned. The recording then switches only its simulated server fixture to an enabled rollout and reloads the browser. That switch represents an operator-controlled deployment change, not a control available to a resolver in the workbench. In the enabled state, the server records a release but the browser receives an ambiguous failure. An explicit exact retry retrieves the recorded receipt. All screenshots and video are labelled SIMULATED DATA; this is browser behavior evidence, not a live persistence or authorization test.',
  ],
  prerequisites: [
    'Enter the intended tenant through a verified workbench session with current resolver authority. Confirm that the item appears under Claimed follow-ups and that its case and queue are the work you intend to return. A stale card is not authority to release; the server checks ownership when the command arrives.',
    'Release requires a session-bound CSRF token and an operator-enabled upgraded ownership deployment. If the deployment has not enabled release, ask an operator rather than repeatedly submitting the same disabled action.',
  ],
  steps: [
    {
      id: 'owned-before-release',
      title: 'Find the currently owned follow-up',
      body: 'The synthetic retry-limit item appears in Claimed follow-ups with its original access-restoration queue. The shared inbox is empty because the claim is still active. Check the case identifier and reason before deciding to relinquish ownership; releasing the wrong item does not resolve or close its case.',
      expected: 'One claimed card is visible and no open card is shown.',
    },
    {
      id: 'open-disabled-confirmation',
      title: 'Open the release confirmation',
      body: 'Select Release work on the claimed card. This opens a confirmation instead of issuing a request. The warning explains that the follow-up returns to its original shared queue and the case stays open. Cancel remains available if the action is not intended.',
      expected:
        'The confirmation is visible and no release request has been sent.',
    },
    {
      id: 'review-release-effect',
      title: 'Read the effect before confirming',
      body: 'Pause at the confirmation and check the queue-return wording. Do not interpret release as completing the case, erasing evidence, or assigning another resolver. This is the last local opportunity to cancel; the backend will still decide whether the exact claim is releasable.',
      expected: 'Confirm release and Cancel are available together.',
    },
    {
      id: 'submit-disabled-release',
      title: 'Submit while rollout is disabled',
      body: 'Confirm release in the first synthetic deployment state. The browser sends the claim ID and expected revision with its CSRF header, but the server responds with the specific release-unavailable problem. No release event is recorded in this state.',
      expected:
        'The typed unavailable response is returned for the owned claim.',
    },
    {
      id: 'recognize-disabled-release',
      title: 'Treat unavailable as a definite stop',
      body: 'The notice says “Releasing work is not enabled.” The card stays in active work and there is no Try release again control. A resolver cannot enable the deployment flag from this page. Keep the claim under your ownership and ask an operator about rollout readiness if release is required.',
      expected:
        'The unavailable alert is visible, the item remains owned, and no retry action appears.',
    },
    {
      id: 'compare-enabled-rollout',
      title: 'Compare a separately enabled rollout',
      body: 'For this recording only, the synthetic server is switched to represent an operator-enabled deployment, and the page reloads. This is a comparison of states, not a resolver workflow step or evidence that the operator changed a real installation. Reloading also clears the previous local failure notice and obtains the current active-work list.',
      expected:
        'The same claim is still owned after reload; no new release command has been sent.',
    },
    {
      id: 'open-enabled-confirmation',
      title: 'Start a fresh release attempt',
      body: 'Open Release work again for the still-owned item. The previous disabled response did not consume the claim or alter its revision, so the confirmation is based on the current card. This is a new attempt after a changed deployment condition, not a recovery of an ambiguous result.',
      expected:
        'The confirmation names the same follow-up and its original queue.',
    },
    {
      id: 'submit-uncertain-release',
      title: 'Submit into an uncertain response',
      body: 'Confirm the release. In this synthetic enabled state the server records the release, increments the ownership revision, and returns a temporary failure instead of the receipt. The browser cannot infer from that failure alone whether the work is still owned or back in the shared queue.',
      expected: 'An uncertain-result notice appears; success is not asserted.',
    },
    {
      id: 'recognize-release-uncertainty',
      title: 'Use the explicit same-release action',
      body: 'Read “The release result is not yet known.” The alert offers Try release again. Use this action rather than treating the stale owned card as a new release target: it retains the original work-item ID, claim ID, and expected ownership revision. The first result might already be durable.',
      expected:
        'The alert provides Try release again without displaying a success claim.',
    },
    {
      id: 'retry-exact-release',
      title: 'Replay the exact claim and revision',
      body: 'Select Try release again. The browser resends the same release tuple and session-bound CSRF header; it does not invent a new claim or revision. The control-plane contract returns the prior receipt for this exact owner-and-revision replay even though current ownership has changed. Do not generalize this narrow guarantee to arbitrary mutations.',
      expected: 'The replay request exactly matches the uncertain request.',
    },
    {
      id: 'confirm-release-receipt',
      title: 'Read the recovered receipt',
      body: 'The recorded result returns and the workbench displays Follow-up released. That notice reflects the server receipt, not a local guess from a timeout. The owned and shared lists refresh; check those lists rather than relying on the notice as ongoing ownership evidence.',
      expected:
        'A release success notice appears and the claimed card leaves active work.',
    },
    {
      id: 'verify-returned-work',
      title: 'Verify the shared queue',
      body: 'The follow-up is visible again as open work in its original access-restoration queue with a newer ownership revision. The case remains open. This is not a promise that the card will stay available: another resolver could claim it after the read. Do not disclose another owner or assume a fresh claim without a separate claim command.',
      expected:
        'The original item is open in the shared inbox and active work is empty.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'The notice says releasing work is not enabled.',
      guidance:
        'Treat this as a definite rollout boundary, not a lost response. Keep the claim in active work and ask an operator about enabling the upgraded ownership deployment. The workbench deliberately offers no immediate retry.',
    },
    {
      symptom: 'The release result is not yet known.',
      guidance:
        'Use the explicit Try release again action while it is present. It preserves the exact claim and expected revision. Avoid starting a new release intent or assuming the work stayed claimed from the stale card.',
    },
    {
      symptom: 'The active or shared list differs after a receipt.',
      guidance:
        'Refresh the server-backed lists and check current tenant authority. Another resolver may already have claimed the open item, or your authority may have changed. Ask an operator to reconcile persistent disagreement; a screenshot is not current ownership proof.',
    },
  ],
  limitations: [
    'The simulated BFF controls rollout state, response loss, and exact replay. This chapter does not prove the backend feature flag, durable release ledger, transaction behavior, CSRF enforcement, live identity, or real concurrent claims.',
    'The workbench has no operator rollout control, release-history screen, or general ownership reconciliation workflow. The synthetic state switch is only a comparison device; the real operator must enable release outside this UI.',
  ],
};
