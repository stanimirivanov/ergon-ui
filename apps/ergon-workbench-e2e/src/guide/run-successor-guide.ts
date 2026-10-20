import type { GuideChapter } from './guide-chapter';

export const runSuccessorGuide: GuideChapter = {
  schemaVersion: 2,
  order: 30,
  slug: 'retry-successor-navigation',
  title: 'Recover a retry successor without inheriting its authority',
  summary:
    'Find a currently visible direct successor from durable retry history, inspect terminal attempts through fresh access checks, and recover safely when either side becomes unavailable.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current run supervisors returning to a case after lost retry acknowledgement, handover or a later Console visit.',
  overview: [
    'A browser retry acknowledgement is historical command feedback. It can be lost, and its original-actor replay rules are not a general relationship directory. The protected successor lookup instead reads the runtime’s recorded direct retry relationship. Current supervision and tenant-wide resolver evidence are checked first for the source and independently for the target. A supervisor needs no browser control lease, original command identifier or original actor identity to perform this read.',
    'The result is deliberately narrow. A visible successor supplies only its run identity and observed supervision epoch. It carries no state, provider result, proof, approval or execution permission. Null means no currently visible direct successor: no retry, no assignment and denied target access are intentionally indistinguishable. Never turn this response into a claim that no retry happened or into permission to issue another retry. The separate retry command still owns its policy and budget.',
    'Every record in this chapter is SIMULATED DATA. Real browser rendering, strict decoding, request retirement and accessibility run against marked producer-owned responses. Prepared terminal, epoch and denial comparisons do not execute real retries, handovers, PostgreSQL transactions, OIDC provisioning or provider operations. Ergon PR #176 and backend ADR 0059 own the actual authority and persistence boundary. The synthetic business-command count remains zero throughout.',
  ],
  prerequisites: [
    'Deploy Ergon PR #176 before relying on successor lookup. An older missing route must show unsupported, not an empty relationship or an internal API fallback. Start with the existing verified session and a known, independently authorized source run. This is not arbitrary run search or a new way to discover every terminal case.',
    'Open Assigned runs, select the source, and find Attempt context. Selection does not preload the successor. Choose Find visible retry successor explicitly; opening, closing and rechecking perform no control acquisition, CSRF setup, acknowledgement or business mutation. The existing active discovery and exact Console gates remain independent.',
    'Treat both supervision epochs as observations, not transferable authority or a cross-run snapshot. Source and target epochs need not match. A target can legitimately have a newer epoch when it is opened through a fresh independently authorized detail read. Returning to the source also reacquires access rather than restoring a saved private snapshot.',
  ],
  steps: [
    {
      id: 'discover',
      title: 'Locate the on-demand lookup',
      body: 'Inspect the prepared assigned run and read Attempt context. Find the successor lookup beneath the recorded predecessor information. No target facts or target request should appear from selecting the source alone. This keeps optional relationship disclosure deliberate and prevents speculative fetching from turning an old source snapshot into authority over another run.',
      expected:
        'The lookup trigger is enabled while the synthetic lookup and target-detail counters remain zero.',
    },
    {
      id: 'absence',
      title: 'Read neutral visible absence',
      body: 'Choose Find visible retry successor. The first prepared response contains null. Read No currently visible direct successor and the explanation that absent retry, unassigned target and denied target access share this result. This is a privacy boundary, not a diagnostic assertion that the backend never created another attempt. No retry action is implied.',
      expected:
        'Neutral absence is shown without an inspect-target button or a command.',
    },
    {
      id: 'terminal-source',
      title: 'Keep exact terminal access separate from discovery',
      body: 'The fixture now compares a superseded source and an escalated successor with no active rows. Choose Recheck assigned runs. Earlier context and the open lookup retire while fresh discovery and exact source access run. The selected terminal source is still readable because its own protected gate succeeds, not because it remains listed as active work.',
      expected:
        'Active discovery is empty and a freshly authorized terminal source still exposes the closed lookup trigger.',
    },
    {
      id: 'visible',
      title: 'Recover only a currently visible direct link',
      body: 'Open the lookup again after the fixture exposes its durable relationship. Read the exact authority observation time, source epoch three and target epoch five. The target identity is useful for navigation, but no successor policy, state or proof has been fetched. This is one direct business-retry relationship, not a complete retry tree or same-reservation execution recovery.',
      expected:
        'Only navigation coordinates appear; the target-detail counter is still zero.',
    },
    {
      id: 'keyboard',
      title: 'Operate and retire inspection with the keyboard',
      body: 'Focus Close successor lookup and press Enter. The observation disappears, its subscription retires, and focus remains on the same persistent trigger. Press Enter again to reopen. A distinct protected request is required; the previous result must not reappear as fresh authorization. This is an inline section, not a modal or a keyboard trap.',
      expected:
        'Keyboard close/reopen preserves focus and increases the protected lookup count exactly once.',
    },
    {
      id: 'narrow',
      title: 'Read the relationship at 320 pixels',
      body: 'At narrow width, inspect the target identity, exact UTC time, independent epoch and navigation caveats. Identifiers must wrap without a horizontal page scrollbar. The section keeps semantic headings and ordinary buttons, without relying on color, glass effects or animation to convey authority. The same behavior is available at desktop width and with enlarged text.',
      expected:
        'The lookup and page fit 320 CSS pixels and the inspect control is reachable.',
    },
    {
      id: 'held',
      title: 'Withdraw earlier coordinates before a held recheck',
      body: 'The fixture holds the next protected response. Choose Recheck successor access. The old target identity and inspect button disappear immediately while the request is pending. Retained RTK data is not continuing access. Keep the source’s already gated facts separate from this additional pending observation; do not infer target progress or a retry command from a read in flight.',
      expected:
        'Pending status replaces the earlier coordinates and navigation action before the held response settles.',
    },
    {
      id: 'denied',
      title: 'Withdraw the workspace after failed protected access',
      body: 'Release the held response as a recognized neutral denial. The earlier private source, discovery rows and successor observation are withdrawn before paint, and focus reaches the persistent Resolution run heading. Successor lookup unavailable does not reveal whether the source exists elsewhere or which supervisor now controls it. A failed lookup is never converted into successful null.',
      expected:
        'Unavailable feedback is visible with no private source policy, target coordinates or command controls.',
    },
    {
      id: 'recovered',
      title: 'Recover through fresh source and lookup gates',
      body: 'Restore the prepared visible response and choose Recheck run access. Discovery and exact source reads must succeed before a new lookup can open. Then request the relationship again. Recovery stores only safe failure feedback and navigation intent; it creates no assignment, role, lease or execution authority and cannot revive an earlier Console snapshot.',
      expected:
        'A new source read and distinct successor lookup restore only currently authorized coordinates.',
    },
    {
      id: 'unsupported',
      title: 'Recognize an older server without fabricating absence',
      body: 'Recheck against the prepared missing-route response. Unsupported compatibility feedback replaces the relationship but does not claim that the run has no retry. The source Console remains available under its separate successful gate. Deploy the compatible backend before using this feature; never fall back to an internal endpoint or treat unsupported as a disabled authority gate.',
      expected:
        'Unsupported is distinct from neutral absence, with no target action or business write.',
    },
    {
      id: 'malformed',
      title: 'Reject inconsistent relationship data',
      body: 'The fixture now returns a self-referential successor. Recheck the lookup. Strict decoding rejects the complete observation instead of displaying partial coordinates, and the workspace disclosure barrier withdraws earlier private content. A malformed or stale response is not a plausible relationship and is not silently retried as another domain operation.',
      expected:
        'Safe unavailable feedback replaces malformed data and the earlier source context.',
    },
    {
      id: 'target-pending',
      title: 'Follow identity only, then hide source facts before target I/O',
      body: 'Recover the source and a fresh visible link again. The fixture advances the target epoch before navigation, then holds its exact detail read. Choose Inspect successor attempt. The source policy and lookup retire before that request starts. Only the target identity is retained as selection; a one-level originating identity permits an explicit fresh return. No target resource is copied from the relationship.',
      expected:
        'A pending exact-target gate is visible with no source or retained target facts.',
    },
    {
      id: 'target-ready',
      title: 'Read terminal target facts under its own current epoch',
      body: 'Release the prepared authorized terminal response. The successor policy is now obtained from its independently gated detail, even though active discovery is empty and its epoch is newer than the earlier link. The relationship’s epoch was not an authorization token or a fixed target precondition. Recorded escalation is a run state, not verified outcome proof or closed-case authority.',
      expected:
        'Fresh terminal successor facts appear only after its own detail gate succeeds.',
    },
    {
      id: 'return-denied',
      title: 'Do not inherit return access',
      body: 'The fixture denies the source before Return to originating attempt is chosen. Returning requests a fresh exact source read and hides the successor first. Neutral unavailable context replaces both policies. The one-level return intent is consumed; it never restores a historical source snapshot, changes supervision or grants replay of the original retry command.',
      expected:
        'Return denial reveals neither attempt’s private policy and leaves no stale return action.',
    },
    {
      id: 'target-denied',
      title: 'A visible link can still fail at navigation time',
      body: 'Restore source access through Recheck assigned runs, request a fresh visible successor and then compare denied target access. Choose Inspect successor attempt. The new exact target gate fails neutrally, even though the earlier relationship was visible. This is expected under changing supervision: coordinates are navigation, not permission. The browser must not reuse a previous terminal target snapshot.',
      expected:
        'Target denial withholds both policies and does not send any mutation or reveal the denial reason.',
    },
    {
      id: 'close',
      title: 'Return freshly and close without side effects',
      body: 'Return to the source through a fresh successful gate. Open and then close the successor lookup once more; focus remains on its persistent trigger and the observation retires. Closing removes only this reader’s subscription, not another active reader’s transport. Finish with zero business commands: any later retry, handover, execution or proof action requires its own separately reviewed current authority.',
      expected:
        'The observation is closed, focus is on its trigger and the synthetic command counter remains zero.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'No currently visible direct successor is shown.',
      guidance:
        'This deliberately conflates no retry, no target assignment and inaccessible target. Do not infer a new retry allowance or disclose another supervisor’s work. Recheck only when appropriate; a trusted dispatcher or current authority change must happen through its own reviewed backend policy, not this read.',
    },
    {
      symptom:
        'Lookup or navigation is pending, unavailable, malformed or unsupported.',
      guidance:
        'Pending lookup hides its earlier coordinates. Failed protected lookup withdraws the workspace; use Recheck run access before opening a new observation. Failed target/return detail remains neutral and must be reacquired independently. Unsupported means deploy the compatible backend, never an internal fallback or fabricated null. Nothing retries a business command automatically.',
    },
    {
      symptom: 'A target epoch changed or active discovery is empty.',
      guidance:
        'Epochs are independently observed, not a joint snapshot or a lease. Exact terminal reads can remain authorized after discovery empties. Opening and returning always recheck current access; a newer authorized epoch is acceptable. The browser does not continuously monitor revocation, inherit source approvals or retain a stack of private snapshots.',
    },
  ],
  limitations: [
    'This is a simulated browser guide, not live OIDC, database, retry atomicity, handover, control ownership or provider verification. Fixture comparisons are labelled synthetic and generated screenshots/video/book are ignored artifacts.',
    'Only the known source’s direct visible successor is exposed. There is no complete retry graph, arbitrary terminal-run search, persistent navigation, command receipt recovery, new retry budget, provider trace, polling or continuous authority guarantee. Backend tests and operational controls own those boundaries.',
  ],
};
