import type { GuideChapter } from './guide-chapter';

export const requesterSignOutGuide: GuideChapter = {
  schemaVersion: 2,
  order: 45,
  slug: 'requester-local-sign-out',
  title: 'Sign out locally and retire the private requester view',
  summary:
    'Review what local sign-out means, preserve a draft when canceling, close private state before network traffic, recover an uncertain response explicitly and verify that Back cannot restore the retired workspace.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Requesters leaving intake, case progress or notifications, and support teams explaining session retirement and uncertain results.',
  overview: [
    'Sign out is available in requester chrome and asks for explicit confirmation. Canceling keeps the current workspace and its draft. Confirming closes the entire private route tree: forms, local recovery, dialogs, resource subscriptions and caches retire before the logout request starts. The private transport is permanently closed for this document lifetime. A late response or browser Back cannot reopen that retired view. This is a session lifecycle action, not a case command or an undo operation.',
    'This chapter uses synthetic marked BFF responses, not real customer data or an identity provider. The first logout POST deliberately loses its response without ending the modeled session. The browser must remain uncertain because a real dropped response cannot establish whether the server acted. A second explicit attempt acquires a fresh CSRF value and receives a valid empty 204. Protocol and component tests additionally cover expired sessions, denial, malformed responses, timeout, cancellation and late private responses.',
  ],
  prerequisites: [
    'Use the separate requester origin and a tenant link supplied by your organization. Deploy Ergon backend PR #228 first with the requester confidential client and the existing same-origin CSRF/session protections. Never use a resolver origin as a fallback. The browser does not choose an actor, tenant or client for logout: the current local HTTP session is the target. No provider credential or session token is shown to the user.',
    'Before confirming, consider any draft or in-memory recovery you still need. Signing out discards it and cannot roll back a request already accepted by the server. Closing a tab does not prove server logout, and local sign-out does not end your identity-provider session or a separate application session. Other tabs can still display previously loaded content; close them separately. Control leases and owned work keep their own lifecycle and are not released by this action.',
  ],
  steps: [
    {
      id: 'exit-draft',
      title: 'Start with a private draft',
      body: 'From the verified tenant entry, open Start a request and enter a desired outcome and an observation. Do not submit the business form. The example text is synthetic and stays in the mounted form. Notice the Sign out control in the requester header; the same entry is available on case-progress and notification pages. Simply opening the page or preparing a draft does not acquire a logout CSRF value or send a logout POST.',
      expected:
        'The draft is visible, and no intake or logout command has been issued.',
    },
    {
      id: 'exit-cancel',
      title: 'Review and cancel without losing work',
      body: 'Open Sign out and read the local-session and draft-loss explanation. The confirmation is a real modal: its background is inert, its title receives focus and keyboard navigation stays inside it. Press Escape or Keep working to dismiss. Canceling performs no logout request and preserves the exact draft. Focus returns to the invoking control so you can continue safely without searching the page again.',
      expected:
        'The draft remains intact, header focus is restored and logout/CSRF counters stay at zero.',
    },
    {
      id: 'exit-narrow',
      title: 'Confirm the same scope on a narrow screen',
      body: 'Reopen the confirmation at a 320-pixel viewport. Read both warnings and reach the confirmation and cancellation controls without horizontal scrolling. This dialog uses the existing native modality and shared focus primitive; glass decoration is optional and reduced-transparency/forced-color behavior remains available. A narrow display does not change the command, bypass review or imply that a local logout also revokes the provider session.',
      expected:
        'The confirmation fits the viewport, remains keyboard operable and passes the accessibility scan.',
    },
    {
      id: 'exit-uncertain',
      title: 'Close the private view before checking logout',
      body: 'Choose Sign out locally. The whole private requester tree disappears before the fresh CSRF request; the public status heading receives focus. In this example the POST response is lost. The page says sign-out could not be confirmed, keeps every draft and private region removed and offers no return-to-work or sign-in shortcut. Do not infer that the server did nothing just because an acknowledgement is missing.',
      expected:
        'A safe uncertainty message appears after exactly one POST; no draft, dialog or retained private workspace remains.',
    },
    {
      id: 'exit-retry',
      title: 'Retry local retirement explicitly',
      body: 'Use Retry local sign-out when you are ready to check again. This is a new bounded invocation with a fresh CSRF value, not an automatic replay of any intake or answer command. The modeled session still exists, so the next explicit POST receives an empty 204 and the page acknowledges local retirement. If a fresh check instead finds no authenticated session, the wording says sign-in is required and carefully distinguishes that observation from a logout receipt.',
      expected:
        'The second explicit invocation succeeds with fresh CSRF; no business command is submitted or replayed.',
    },
    {
      id: 'exit-back',
      title: 'Verify that Back cannot restore private state',
      body: 'Use browser Back after retirement. The URL can move to the earlier tenant entry, but the private router subtree remains unmounted in this document. No form or old case context returns and no private read starts. A full reload is different: it starts a new document and must consult the backend again. After an uncertain result, reloading is not proof that the previous session ended and may encounter a still-active session.',
      expected:
        'The public retired status remains visible and private request counts do not increase.',
    },
    {
      id: 'exit-sign-in',
      title: 'Use the trusted tenant-only sign-in action',
      body: 'After acknowledged retirement or a recognized authentication-required response, use Sign in again only if you want a new authenticated visit. The link returns to the canonical tenant entry and discards case references, query values and draft/recovery intent. Your provider may still have a session and sign you in without asking for credentials. This recording inspects the trusted link but does not navigate to a live provider or claim that global sign-out occurred.',
      expected:
        'Only the reviewed same-origin login link is offered; browser storage remains empty and no private navigation is restored.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'The page is closed to private work but logout is unconfirmed.',
      guidance:
        'Keep the private view closed and retry explicitly when connectivity returns. A timeout or dropped acknowledgement can occur before or after server retirement. Closing the tab removes this view but does not itself revoke the server session; use your organization’s session policy if confirmation remains unavailable.',
    },
    {
      symptom: 'A request still completed after signing out.',
      guidance:
        'The server may already have accepted that work before session retirement. Logout is not a cancellation or compensation command. Check the durable result through a new authorized visit rather than creating a replacement command from a discarded recovery intent.',
    },
  ],
  limitations: [
    'This synthetic guide proves requester interaction and disclosure behavior, not real OIDC exchange, cookie processing, provider revocation or PostgreSQL authorization. Workbench sign-out follows as M05-PR28b. There is no cross-tab synchronization, persistent browser retirement flag or cancellation of accepted work.',
  ],
};
