import type { GuideChapter } from './guide-chapter';

/** Executable, synthetic guidance for owner-scoped case disclosure. */
export const ownedContextGuide: GuideChapter = {
  schemaVersion: 2,
  order: 12,
  slug: 'recheck-owned-case-context',
  title: 'Recheck owned case context',
  summary:
    'Recover an active follow-up after reload, inspect its evidence only on demand, and respond safely when a fresh context check no longer permits disclosure.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Resolvers returning to active work and reviewing an escalated case.',
  overview: [
    'Claimed follow-ups are recovered from the server-backed active-work view, not from a browser-stored claim. A card in that view identifies work currently visible under your resolver session, but its case evidence is a separate, owner-scoped disclosure. The workbench requests the case summary only when you choose Review case context. Hiding and reopening it triggers another read, because ownership and resolver authority can change while a page remains open.',
    'This walkthrough uses one synthetic owned follow-up and a deliberately controlled BFF response. The first context request returns synthetic evidence; the second pauses and then returns the same neutral absence response used for several protected states. A later owned-work read returns an empty page. Those fixture choices illustrate the browser response, not why a real claim became unavailable. Every screenshot and the recording are labelled SIMULATED DATA; they do not verify OIDC, database transactions, authorization, or live revocation.',
  ],
  prerequisites: [
    'In a deployed environment, sign in to the correct tenant with a registered resolver identity and current authority. The tenant URL, an old screenshot, and an earlier claim receipt are not ongoing authorization. This recording begins with a simulated verified session and does not perform a real login or claim.',
    'Use the claimed-work section to return to work already assigned to your identity. Open context only for a case you intend to handle, and treat source observations as untrusted evidence rather than instructions from the application.',
  ],
  steps: [
    {
      id: 'owned-work-on-entry',
      title: 'Find your active follow-up',
      body: 'The claimed-work section contains the synthetic access-restoration follow-up, while the shared inbox is empty. Its card shows the queue, reason, case identifier, and claimed state. No case-summary request has been made yet. The card is a starting point, not permission to assume its evidence or ownership will remain available indefinitely.',
      expected:
        'One active card is visible and no case goal or source observation has been disclosed.',
    },
    {
      id: 'reload-workbench',
      title: 'Reload to recover active work',
      body: 'Reload the tenant workbench as you might after returning to a browser tab. The session gate runs again, and the workbench requests your current owned-work list. It does not replay a claim command or depend on a claim ID stored in the browser. If the session has expired, sign in again rather than treating an empty screen as lost work.',
      expected:
        'The verified workbench requests active work again without issuing a claim.',
    },
    {
      id: 'owned-work-restored',
      title: 'Confirm the same current item',
      body: 'Compare the case identifier and escalation reason after reload. The item returns in this synthetic view because the fixture still exposes it as owned. A real active-work response is filtered by current ownership and resolver authority; it does not expose other resolvers’ claims or a tenant-wide total count.',
      expected: 'The same owned card is visible after reload.',
    },
    {
      id: 'open-case-context',
      title: 'Request case context on demand',
      body: 'Choose Review case context. This starts a separate owner-scoped read for the exact follow-up. The BFF must establish that the item is open, claimed by your verified actor, and visible under current resolver authority before assembling the case and run evidence. The card alone does not bypass that check.',
      expected:
        'The workbench requests the case summary only after this action.',
    },
    {
      id: 'review-evidence',
      title: 'Read the bounded evidence snapshot',
      body: 'The synthetic summary shows the case goal, pinned contract revision, escalated run, failed connector, exhausted attempt budget, and source observation. Read the observation as data; its content is rendered as plain text, not markup or executable instructions. The evidence boundary and timestamps describe the run’s context, not proof that the customer problem has been resolved.',
      expected:
        'The case goal and source observation appear with the automation handoff.',
    },
    {
      id: 'inspect-source-observation',
      title: 'Locate the source observation',
      body: 'The read-only context places Recorded observations first, followed by Automation handoff and Case and contract. Check each observation’s source reference and its occurred and recorded times against the run’s evidence boundary. In this synthetic example the sign-in link reportedly returned an expired-token message. That sentence is customer-supplied evidence to assess, not a directive to change identity settings or bypass approval. Its appearance depends on the owner-scoped case read that just succeeded.',
      expected:
        'The synthetic observation is visible as text in the evidence section before the automation handoff.',
    },
    {
      id: 'hide-case-context',
      title: 'Close the evidence disclosure',
      body: 'Choose Hide case context when you no longer need the details. The visible case evidence disappears immediately, and the case-summary cache is configured for eviction when the last disclosure closes. Closing the panel is not a release of the claim; the owned card remains available for a later deliberate context check.',
      expected: 'The case goal and observation are no longer visible.',
    },
    {
      id: 'context-hidden',
      title: 'Confirm the evidence is hidden',
      body: 'The owned card remains, but its case goal, observation, and handoff details are no longer on screen. The button returns to Review case context. This distinction matters: hiding evidence changes the browser disclosure, while ownership remains a server fact that must be checked again before the evidence can be shown.',
      expected:
        'The card remains claimed while its previously displayed case context is absent.',
    },
    {
      id: 'reopen-case-context',
      title: 'Reopen with a fresh ownership check',
      body: 'Choose Review case context again. The workbench does not simply reveal the old snapshot: it starts a new BFF read for the same tenant, work item, case, and run. The synthetic fixture pauses this request so the loading state is visible. In a real session, ownership or authority could have changed since the first disclosure.',
      expected: 'A second case-summary request begins.',
    },
    {
      id: 'evidence-hidden-while-loading',
      title: 'Do not rely on stale evidence',
      body: 'While the new request is pending, the panel says Loading case context and the prior observation is absent. This is intentional: old evidence must not remain on screen while the control plane rechecks permission. Waiting for the fresh result is safer than acting on a screenshot, cached content, or a claim card that has not itself been refreshed.',
      expected:
        'The loading message is visible and the earlier case goal and observation remain hidden.',
    },
    {
      id: 'context-unavailable',
      title: 'Read the neutral unavailable state',
      body: 'The fixture now returns the BFF’s non-disclosing case-summary absence response. The workbench says Case context is no longer available and does not restore the old evidence or offer a blind retry for this definite result. The message does not reveal whether the item closed, ownership changed, authority changed, or the item was absent. Refresh active work before deciding what to do next.',
      expected:
        'A neutral unavailable message replaces the evidence without naming another owner or an authorization reason.',
    },
    {
      id: 'reload-active-work',
      title: 'Refresh your active-work view',
      body: 'Reload the workbench to request current owned work. In this synthetic example the server returns an empty owned page. That result is deliberately non-disclosing: it is not a diagnosis of why the earlier case context became unavailable, and it does not prove that the case no longer exists. Do not attempt release or further case action from the old card.',
      expected: 'The workbench requests a fresh owned-work page.',
    },
    {
      id: 'owned-work-empty',
      title: 'Stop acting on the old claim',
      body: 'The active-work section now reports no claimed work in this view, and the private case observation remains absent. If this differs from your expectation, confirm the tenant and session and ask an operator to investigate the server-side state. The workbench cannot turn a neutral empty page into a specific ownership or authority explanation without weakening non-disclosure.',
      expected:
        'No owned card or prior case evidence is visible after the refresh.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Your active work is empty after reload.',
      guidance:
        'Confirm the tenant and session first. Current owned-work reads are authority-filtered and reveal no total count or other owner. Do not infer that a case was deleted; seek an operator’s server-side investigation when necessary.',
    },
    {
      symptom: 'Case context is no longer available when you reopen it.',
      guidance:
        'Treat the neutral result as a stop signal for that evidence. Refresh active work, avoid acting on cached details, and do not interpret the message as proof of a particular cause such as reassignment or revoked authority.',
    },
    {
      symptom: 'Case context is temporarily unavailable instead.',
      guidance:
        'A transient failure may offer Try case context again. Use that explicit read retry after the service recovers; do not use a transient error as proof that the case or your claim is gone.',
    },
  ],
  limitations: [
    'The fixture controls the second read and later owned list. It does not verify real revocation, competing claims, transaction isolation, cache memory erasure, or backend authorization; those require backend and disposable full-stack tests.',
    'The current workbench has read-only case context. It does not provide completion, reassignment, or a detailed audit of why an item is no longer visible. Release recovery is documented separately.',
  ],
};
