import type { GuideChapter } from './guide-chapter';

export const workbenchSignOutGuide: GuideChapter = {
  schemaVersion: 2,
  order: 46,
  slug: 'workbench-local-sign-out',
  title: 'Leave the workbench without confusing logout with control release',
  summary:
    'Review a local sign-out from an assigned Console, preserve selection when canceling, retire private work before HTTP, recover uncertainty explicitly and understand why accepted work and control leases remain separate.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Resolvers and assigned supervisors leaving follow-ups, a Console or historical notifications.',
  overview: [
    'The Sign out control belongs to workbench chrome and is available on the follow-up landing page, the owned and assigned Consoles, and notifications. It uses the same confirmed local-session exit as the requester application, but the workbench retires its own session, follow-up, supervision and notification resources. Confirmation removes the complete private router subtree before logout setup starts. This withdraws mounted private forms, command recovery, dialogs, cache subscriptions and timer callbacks together; it is stronger than navigating to a public home page.',
    'This recording uses synthetic marked BFF responses. It first acquires a simulated browser-control lease to demonstrate the boundary between session exit and runtime authority. The initial logout response is then deliberately lost; the fixture does not pretend the browser can determine whether a real lost request committed. An explicit second attempt obtains fresh CSRF and an empty 204 acknowledgement. No live identity provider, database or production connector is involved, and the synthetic lease counter is evidence about this interaction only.',
  ],
  prerequisites: [
    'Use your organization’s workbench origin and tenant link with the already deployed backend local-logout contract. The requester application is a separate deployment with a separate local session. A tenant route identifies navigation context and does not itself grant resolver or supervisor authority. Sign-out targets the current deployed application session without accepting an actor, tenant or provider token from the browser.',
    'Before leaving, decide whether a distinct release or handover is needed and complete that workflow separately while authorized. Signing out never releases ownership or browser control, transfers supervision, cancels an accepted execution, or compensates a completed operation. It discards mounted drafts and uncertain replay intent. If another tab still displays private work, close it separately; this document-local exit is not cross-tab erasure or identity-provider revocation.',
  ],
  steps: [
    {
      id: 'workbench-exit-context',
      title: 'Recognize the authority you are leaving',
      body: 'Open Assigned runs from the tenant workbench and inspect the synthetic run. In Browser control choose Acquire browser control and wait for the acknowledged current-session status. The Console shows a server-derived control observation with a local countdown. This establishes the starting context for the example, not a prerequisite for logout. A resolver without a lease can also sign out. Do not treat the countdown, the actor badge or an assignment as tool authorization.',
      expected:
        'One explicit acquisition is recorded and the selected Console remains visible. No release, renewal or logout has been issued.',
    },
    {
      id: 'workbench-exit-cancel',
      title: 'Review the consequence and keep working',
      body: 'Open Sign out in the global header. Read that this closes the private view and discards local drafts and recovery while already accepted requests can finish. Press Escape or Keep working to cancel. The original Console selection remains mounted and focus returns to the invoking Sign out button. Opening and canceling this review does not fetch logout CSRF, end a session, change browser control or replay any pending business intent. Close a private inspector before using the global header; native modality deliberately keeps the background inert.',
      expected:
        'The same selected run and control panel remain, focus is restored, and logout counters stay at zero.',
    },
    {
      id: 'workbench-exit-narrow',
      title: 'Check the local scope on a narrow viewport',
      body: 'Reopen the review on a 320-pixel screen. The same warning and both actions must fit without horizontal scrolling. Use the keyboard to reach Sign out locally. The shared native dialog provides containment and focus; optional glass styling does not change behavior, and forced-color or reduced-transparency settings retain readable controls. Signing out of this workbench affects this application’s local session only, even when the requester is open in another tab or origin.',
      expected:
        'Review remains readable and keyboard operable and passes the automated accessibility scan.',
    },
    {
      id: 'workbench-exit-uncertain',
      title: 'Retire the private Console before checking logout',
      body: 'Confirm Sign out locally. The public status heading receives focus as the workbench, evidence, command controls and inspectors disappear. Pending observation is interrupted and private caches and the shared follow-up CSRF lifetime retire before fresh logout I/O. Here the POST response is lost. The page reports that sign-out could not be confirmed, offers no return-to-work shortcut, and does not claim that the server did nothing. The acquisition history remains one explicit command: logout never adds an automatic release.',
      expected:
        'Private Console content stays absent, no business command is replayed and only an explicit local sign-out retry is offered.',
    },
    {
      id: 'workbench-exit-retry',
      title: 'Recover logout without recovering business intent',
      body: 'Choose Retry local sign-out when you want to check retirement again. This is a new bounded invocation with a fresh CSRF value, not a retry of a claim, control acquisition, approval or execution. A valid empty 204 now acknowledges the local session retirement. If the fresh CSRF check instead recognizes that authentication is absent, the page says Sign-in is required and sends no logout POST; that observation is not a durable logout receipt. Repeated uncertainty keeps this private document closed.',
      expected:
        'The second explicit invocation obtains new CSRF and acknowledges local logout. No control release, renewal or replacement command is recorded.',
    },
    {
      id: 'workbench-exit-back',
      title: 'Verify that Back cannot restore private work',
      body: 'Use browser Back after the acknowledgement. The URL may change to an earlier workbench route, but the exit gate sits above the private router and does not remount it. Old run selection, private caches and exact-replay recovery do not reappear or start fresh private reads. A hard reload starts a new document and performs new backend checks; after an uncertain result it may still encounter an active server session. Reloading is therefore not evidence of logout or a safe substitute for recovery.',
      expected:
        'The public exit result remains visible with no private Console and no additional protected request caused by Back.',
    },
    {
      id: 'workbench-exit-sign-in',
      title: 'Start a new tenant-only visit deliberately',
      body: 'After acknowledgement or a recognized unauthenticated result, Sign in again points only to the reviewed same-origin login entry with the canonical tenant landing path. Private Console selection, filters, case references and fragments are discarded. Your identity provider may still have a session and authenticate without prompting. The recording inspects the link rather than navigating to a real provider. In a new visit, independently reacquire current session, target access and required authority before acting; do not reconstruct discarded commands from memory.',
      expected:
        'The trusted tenant-only sign-in target is offered, browser storage is empty and the private view remains retired.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Logout is unconfirmed although the Console disappeared.',
      guidance:
        'Keep this view closed and retry explicitly. A dropped response can occur before or after server retirement. Closing the tab removes its display but does not prove the server session ended. Use your organization’s session policy if confirmation remains unavailable.',
    },
    {
      symptom:
        'Owned work or a lease still appears on a later authorized visit.',
      guidance:
        'Logout is not release or handover. Independently check current ownership, lease expiry and accepted command history through their own protected workflows. Do not assume an interrupted browser observation canceled a server operation.',
    },
  ],
  limitations: [
    'Synthetic browser interaction proves local disclosure, request ordering and command-count boundaries. It does not certify live OIDC, cookies, PostgreSQL authorization, global revocation or other-tab cleanup. Pending accepted work can finish. There is no persistent retirement marker, cross-tab synchronization or restoration of discarded recovery intent.',
  ],
};
