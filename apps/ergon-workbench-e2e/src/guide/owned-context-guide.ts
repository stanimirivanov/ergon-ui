import type { GuideChapter } from './guide-chapter';

/** Executable, synthetic guidance for the owner-scoped Resolver Console. */
export const ownedContextGuide: GuideChapter = {
  schemaVersion: 2,
  order: 12,
  slug: 'recheck-owned-case-context',
  title: 'Recheck owned case context',
  summary:
    'Recover an active follow-up after reload, open its Resolver Console on demand, and respond safely when a fresh ownership check no longer permits disclosure.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Resolvers returning to active work and reviewing an escalated case.',
  overview: [
    'Claimed follow-ups are recovered from the server-backed active-work view, not from a browser-stored claim. A card in that view identifies work currently visible under your resolver session, but its case evidence is a separate, owner-scoped read. The workbench requests the case summary only when you choose Open resolver console. Recheck current claim deliberately rereads ownership and case context while hiding prior evidence. Returning to active work closes the console; reopening it triggers another read because ownership and resolver authority can change while a page remains open. The selection is local to this page, not a shareable case route.',
    'This walkthrough uses one synthetic owned follow-up with two source observations and a deliberately controlled BFF response. One observation was available at the run’s pinned evidence snapshot; the other was recorded later. The first context request returns that synthetic evidence, and a deliberate recheck returns it again. The third context request pauses and then returns the same neutral absence response used for several protected states. A later owned-work read returns an empty page. Those fixture choices illustrate the browser response, not why a real claim became unavailable. Every screenshot and the recording are labelled SIMULATED DATA; they do not verify OIDC, database transactions, authorization, or live revocation.',
  ],
  prerequisites: [
    'In a deployed environment, sign in to the correct tenant with a registered resolver identity and current authority. The tenant URL, an old screenshot, and an earlier claim receipt are not ongoing authorization. This recording begins with a simulated verified session and does not perform a real login or claim.',
    'Use the claimed-work section to return to work already assigned to your identity. Open the Resolver Console only for a case you intend to handle, and treat source observations as untrusted evidence rather than instructions from the application.',
  ],
  steps: [
    {
      id: 'owned-work-on-entry',
      title: 'Find your active follow-up',
      body: 'The claimed-work section contains the synthetic access-restoration follow-up, while the shared inbox is empty. Its card shows the queue, reason, case identifier, and claimed state. No case-summary request has been made yet. The card is an entry point to the Resolver Console, not permission to assume its evidence or ownership will remain available indefinitely.',
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
      title: 'Open the Resolver Console on demand',
      body: 'Choose Open resolver console. The workbench replaces the active-work list with a console whose case evidence is read-only, and starts a separate owner-scoped read for the exact follow-up. The BFF must establish that the item is open, claimed by your verified actor, and visible under current resolver authority before assembling the case and run evidence. The card alone does not bypass that check.',
      expected:
        'The workbench requests the case summary only after this action.',
    },
    {
      id: 'review-evidence',
      title: 'Read the bounded evidence snapshot',
      body: 'The console shows the case goal, pinned contract revision, escalated run, failed connector, exhausted attempt budget, and source observations. Its three panes put observations on the left, recorded attempts and handoff in the center, and the unassessed outcome target on the right at desktop width. Local section jumps help reach a pane when they stack at narrow width; they do not create a case URL. The observation inspector initially selects the first source record. Read it as data; its content is rendered as plain text, not markup or executable instructions. The evidence boundary and timestamps describe the run’s context, not proof that the customer problem has been resolved.',
      expected:
        'The case goal, selected source observation, and automation handoff appear.',
    },
    {
      id: 'jump-to-outcome',
      title: 'Jump to the outcome pane',
      body: 'Choose Outcome in the local section-jump group. Keyboard focus moves to the outcome heading and the browser scrolls it into view on a stacked layout. The case context remains on the current tenant page: no fragment, case identifier, or evidence content is written to the URL or browser storage, and no BFF read is started.',
      expected:
        'The Not assessed heading receives focus while the tenant URL and case-summary read count stay unchanged.',
    },
    {
      id: 'inspect-jump-outcome',
      title: 'Read the focused outcome target',
      body: 'The destination says Not assessed because the escalated run never entered verification. The pinned success condition describes what would need proof; the jump itself neither checks that condition nor changes ownership, assessment, or resolution state.',
      expected:
        'The focused outcome pane still presents a target, not accepted proof.',
    },
    {
      id: 'jump-back-to-evidence',
      title: 'Return to the evidence pane',
      body: 'Choose Evidence to move focus back to Recorded observations. The same owner-authorized response remains mounted, and the first source stays selected. Section jumps are focus and scroll aids, not navigation links or a shareable case route.',
      expected:
        'The evidence heading receives focus without another case-summary request.',
    },
    {
      id: 'inspect-source-observation',
      title: 'Inspect the run-snapshot source',
      body: 'The left pane lists source observations and shows one selected record in a detail region. The default record includes its original plain-text content, source reference, occurrence time, recording time, and a label saying it was available at the pinned run snapshot. In this synthetic example the sign-in link reportedly returned an expired-token message. That sentence is source evidence to assess, not a verified claim or a directive to bypass approval. Its appearance depends on the owner-scoped case read that just succeeded. Compare sources is available when at least two observations remain visible under the current timing filter.',
      expected:
        'The first observation is selected; its detail is visible as inert text before the automation handoff.',
    },
    {
      id: 'filter-later-observations',
      title: 'Isolate records unavailable to the run',
      body: 'Choose Recorded later in the observation timing filter. This local view keeps only source records whose stream version exceeds the run’s pinned evidence boundary. It does not make a new BFF request, reclassify a source as a verified fact, or retroactively add the later record to the failed run.',
      expected:
        'Only the later source remains in the list and the earlier source detail is hidden.',
    },
    {
      id: 'inspect-later-filter',
      title: 'Check the filtered count and source',
      body: 'The filter announces one of two recorded observations and selects the visible later source for inspection. Its after-snapshot label explains why it was not part of the escalated run’s evidence. A zero-count filter similarly shows a neutral empty result rather than retaining hidden source details.',
      expected:
        'One later observation and its provenance are visible; the run-snapshot source is absent from the detail.',
    },
    {
      id: 'select-later-observation',
      title: 'Select the later source record',
      body: 'Choose the visible later observation in the compact list to move keyboard focus to its detail. Selection only changes which already authorized source record is inspected locally; it makes no new BFF request and does not bind the source to a verified asset fact. The observation was recorded after the escalated run’s pinned evidence boundary, so it cannot be read back into that run’s decision.',
      expected:
        'The second record becomes selected and keyboard focus moves to its detail heading.',
    },
    {
      id: 'inspect-later-observation',
      title: 'Read its provenance and timing',
      body: 'The selected detail identifies the later SSO diagnostic, its source reference, and its occurred and recorded times. The after-snapshot label is a temporal boundary, not a judgment that the content is false or verified. Compare the source and time before using it in any subsequent human assessment.',
      expected:
        'The later diagnostic content and after-snapshot label replace the first observation’s detail.',
    },
    {
      id: 'return-to-observations',
      title: 'Return focus to the observation list',
      body: 'Use Back to observations to move keyboard focus to the currently selected list item. The detail stays visible, so you can resume reading or choose another source without losing context. This action neither closes the Console nor changes ownership.',
      expected:
        'Focus returns to the selected observation button while the detail remains visible.',
    },
    {
      id: 'restore-all-observations',
      title: 'Restore the full source list',
      body: 'Choose All to remove the temporal filter. Both authorized observations return in stream order, and the first visible source becomes the selected detail. The filter and selection remain local to the open Console and disappear when its owner-scoped context closes.',
      expected:
        'Both source records are listed again without another case-summary request.',
    },
    {
      id: 'select-run-snapshot-observation',
      title: 'Restore the run-snapshot source',
      body: 'Select the original email observation again. Its content and in-snapshot label return, demonstrating that this is a local inspector over the same owner-scoped response, not a new evidence acquisition or a graph of inferred claims.',
      expected:
        'The email observation is selected and its original text is visible again.',
    },
    {
      id: 'open-source-comparison',
      title: 'Compare two source records',
      body: 'Choose Compare sources to open a modal inspector over the same owner-authorized response. Its selected source is the email report; the second source is the later SSO diagnostic. The records appear side by side at desktop width and stack at narrow width. Both show original text, origin and provider, reference, occurrence and recording times, and their distinct run-snapshot labels. No new BFF request is made, and this view does not infer a contradiction or bind either statement to a verified asset fact.',
      expected:
        'A modal source comparison shows the selected and later records with provenance and timing.',
    },
    {
      id: 'inspect-source-comparison',
      title: 'Read the timing boundary in context',
      body: 'The left record was available to the failed run; the later diagnostic was recorded after its evidence boundary. The inspector deliberately says that similar or conflicting wording is not an assessed contradiction. Compare the exact source and timing before deciding whether further investigation is needed. The overlay is an inspection aid, not an approval or resolution action.',
      expected:
        'Both source cards remain plain text, and the modal makes no verified-claim or contradiction assertion.',
    },
    {
      id: 'close-source-comparison',
      title: 'Return to the evidence pane',
      body: 'Choose Close comparison or press Escape. The modal closes and keyboard focus returns to the Compare sources control in the still-authorized Console. Changing the timing filter to a single visible record removes the comparison action. Closing the Console later removes the source details and comparison state altogether.',
      expected:
        'The modal closes, focus returns to the evidence pane, and the case-summary read count is unchanged.',
    },
    {
      id: 'inspect-attempt-history',
      title: 'Follow the recorded retry chain',
      body: 'Read the durable attempts in ascending order. The first failed and was superseded by a retry; the second failed and escalated to this human follow-up. Each row identifies a connector result and the retry boundary where present. Open a record to inspect its persisted transition and retry events. This is not a live tool-call trace or evidence that the customer outcome succeeded.',
      expected:
        'Attempt 1 is superseded and attempt 2 is escalated, with the retry shown between them.',
    },
    {
      id: 'open-attempt-record',
      title: 'Open the superseded attempt record',
      body: 'Use the first attempt’s native disclosure to reveal the exact durable fields. The action expands data already present in the authorized case response; it does not send another BFF read or resume execution. Keyboard users can focus the summary and press Enter or Space.',
      expected:
        'The first attempt shows its run identifier, recorded start, final state, and event list.',
    },
    {
      id: 'inspect-recorded-events',
      title: 'Inspect the transition and retry link',
      body: 'Event 1 records the connector failure, state transition, completion time, and recording time. Event 2 records the retry and successor run identifier. Open the escalated attempt to compare its predecessor identifier and single connector-failure event; it has no retry event. These are persisted facts, not nested model spans, measured latency, cost, or an authorization decision.',
      expected:
        'The first attempt links to its successor, and the second links back without inventing a third attempt.',
    },
    {
      id: 'inspect-proof',
      title: 'Distinguish a target condition from verified proof',
      body: 'The right pane shows the pinned condition account.access.state = ACTIVE but says Not assessed because the escalated run never entered verification. The target condition describes what success would require, not something this failed automation established. A failed connector does not prove the customer outcome was achieved or disproved; a resolver needs further authorized evidence before claiming resolution.',
      expected:
        'The pinned condition and Not assessed state are visible without a verified-resolution claim.',
    },
    {
      id: 'recheck-current-claim',
      title: 'Recheck your current claim',
      body: 'Choose Recheck current claim in the Console authority strip after a pause or before relying on these details. Ergon requests the owned-work page again and hides the old case context while the server checks the exact claim and resolver authority. If it remains current, a fresh owner-scoped case-summary read restores the Console. The strip is not a lease, lock, or countdown, and this action does not renew ownership.',
      expected:
        'A fresh owned-work read and case-summary read complete without a claim command.',
    },
    {
      id: 'claim-recheck-complete',
      title: 'Continue only after the recheck succeeds',
      body: 'The synthetic server still reports the same claim and case context, so the Console returns with its evidence and unassessed outcome target. A different or absent claim would close the Console; a failed read would keep old evidence hidden. This is a new authorization check, not a guarantee that ownership remains valid indefinitely.',
      expected:
        'The same owner-scoped case goal returns after both new reads succeed.',
    },
    {
      id: 'hide-case-context',
      title: 'Return to active work',
      body: 'Choose Back to active work when you no longer need the details. The console unmounts and visible case evidence disappears immediately. The case-summary cache is configured for eviction when the last console closes. Returning is not a release of the claim; the owned card remains available for a later deliberate check.',
      expected:
        'The Resolver Console closes, and the case goal and observation are no longer visible.',
    },
    {
      id: 'context-hidden',
      title: 'Confirm the evidence is hidden',
      body: 'The owned card remains, but its case goal, observation list, selected source detail, and handoff details are no longer on screen. Open resolver console is available again. This distinction matters: closing the console changes browser disclosure, while ownership remains a server fact that must be checked again before the evidence can be shown.',
      expected:
        'The card remains claimed while its previously displayed case context is absent.',
    },
    {
      id: 'reopen-case-context',
      title: 'Reopen with a fresh ownership check',
      body: 'Choose Open resolver console again. The workbench does not simply reveal the old snapshot: it starts a new BFF read for the same tenant, work item, case, and run. The synthetic fixture pauses this request so the loading state is visible. In a real session, ownership or authority could have changed since the first opening.',
      expected: 'A third case-summary request begins.',
    },
    {
      id: 'evidence-hidden-while-loading',
      title: 'Do not rely on stale evidence',
      body: 'While the new request is pending, the console says Loading case context and the prior observation is absent. This is intentional: old evidence must not remain on screen while the control plane rechecks permission. Waiting for the fresh result is safer than acting on a screenshot, cached content, or a claim card that has not itself been refreshed.',
      expected:
        'The loading message is visible and the earlier case goal and observation remain hidden.',
    },
    {
      id: 'context-unavailable',
      title: 'Read the neutral unavailable state',
      body: 'The fixture now returns the BFF’s non-disclosing case-summary absence response. The console says Case context is no longer available and does not restore the old evidence or offer a blind retry for this definite result. The message does not reveal whether the item closed, ownership changed, authority changed, or the item was absent. Refresh active work before deciding what to do next.',
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
      symptom:
        'Active work becomes temporarily unavailable while the console is open.',
      guidance:
        'The console hides case evidence when the owned-work recheck fails, even if an earlier list is cached. Use Try again to request current ownership before relying on the case context, or Back to active work to leave the console. A failed read does not establish that the claim was lost.',
    },
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
    'The fixture controls the successful recheck, third context read, and later owned list. It does not verify real revocation, competing claims, transaction isolation, cache memory erasure, or backend authorization; those require backend and disposable full-stack tests.',
    'The source inspector selects and compares observations only from the current owner-scoped response; it does not derive verified facts, detect contradictions, fetch source systems, or edit evidence. The case context is a read-only projection of an escalated run, not a live tool trace, verified-claim graph, lease, approval surface, or proof assessment. Its separate release action returns ownership to the shared queue; it does not provide completion, named handover, reassignment, or a detailed audit of why an item is no longer visible. Release recovery is documented separately.',
  ],
};
