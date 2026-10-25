import type { GuideChapter } from './guide-chapter';
export const requesterProgressGuide: GuideChapter = {
  schemaVersion: 2,
  order: 38,
  slug: 'requester-case-progress',
  title: 'Check your privately shared case progress',
  summary:
    'Open a supplied case link in the separate requester application, verify your session, and distinguish an open case from a server-recorded verified resolution. Recheck deliberately without treating old details as continuing access.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Requesters checking one explicitly owned case, and operators provisioning requester access.',
  overview: [
    'The requester app has its own deployment, origin and server-side sign-in client. A supplied link selects a tenant and case; it does not prove ownership. The server checks your registered tenant identity and a separate durable requester binding before returning the goal, lifecycle and timestamps. This is not the resolver workbench.',
    'This chapter uses labelled synthetic HTTP responses: OPEN, a held check followed by neutral denial, and a fresh VERIFIED_RESOLVED observation. These illustrate browser behavior, not live resolution or proof that production authentication is configured.',
  ],
  prerequisites: [
    'Obtain the intended requester-origin link from your trusted contact. Until authenticated intake is available, an authorized operator verifies the exact tenant, case and registered actor out of band and provisions immutable ownership. Approval authority, including REQUESTER approval evidence, is not ownership. Existing cases are hidden by default.',
    'Deploy the backend ownership migration and Ergon PR #202 reader. Route this independently built app only to its requester-configured BFF, never the resolver deployment. Provider tokens and confidential client secrets stay on the server, not in Vite settings or browser storage.',
  ],
  steps: [
    {
      id: 'requester-sign-in',
      title: 'Verify your session before opening a case',
      body: 'Open your supplied link. When authentication is required, no progress read is sent. Sign in through Ergon. The current login contract returns only to the tenant page; afterward reopen the original supplied case link. The app deliberately does not retain private case selection in storage to reconstruct navigation.',
      expected:
        'Sign-in guidance has the canonical tenant return target and zero progress reads.',
    },
    {
      id: 'requester-open',
      title: 'Read the checked lifecycle, not an execution promise',
      body: 'After session verification, the server checks the exact case. OPEN says nothing about an active run, approval readiness, a waiting person or estimated completion. The goal is untrusted text, not markup. Internal observations, provider references, owner IDs and run details are absent.',
      expected:
        'The supplied goal, Open label and two UTC case timestamps appear without resolver controls.',
    },
    {
      id: 'requester-narrow',
      title: 'Read the same facts on a narrow screen',
      body: 'At 320 pixels the goal and timestamps wrap without horizontal scrolling. Recheck remains keyboard accessible with visible focus. Status is not communicated by color alone and no animation is required. Narrow layout does not alter authority or remove a required action. The recording then reopens the supplied link at desktop width, demonstrating a separate fresh session and case check rather than reusing a private snapshot.',
      expected:
        'The narrow page has no horizontal overflow and passes automated accessibility checks.',
    },
    {
      id: 'requester-pending',
      title: 'Withdraw old facts before checking again',
      body: 'Choose Recheck progress. Focus moves to the persistent heading before the private card disappears. The fixture holds the request: previous goal and timestamps remain hidden. This is a checked snapshot, not live monitoring. Automatic polling does not continuously re-establish authorization.',
      expected:
        'Pending guidance replaces private details before the request starts; heading focus survives.',
    },
    {
      id: 'requester-hidden',
      title: 'Treat unavailable progress as deliberately neutral',
      body: 'The response uses the same problem for missing, unbound, foreign-owned and cross-tenant cases. It does not establish deletion, transfer or resolution. Check the link with your contact. A cached successful read never overrides this failed fresh check, and previous private details stay withdrawn.',
      expected:
        'Neutral unavailable guidance appears without the old goal or timestamps.',
    },
    {
      id: 'requester-resolved',
      title: 'Read a fresh verified-resolution observation',
      body: 'Recheck explicitly when another observation is needed. This synthetic response records VERIFIED_RESOLVED: the case projection records accepted proof. The browser did not close the case and does not receive proof payloads. Last case update is not proof recording time. Reads cannot approve, execute, claim or mutate anything.',
      expected:
        'Fresh goal and Verified resolved copy appear without private proof, runtime traces or resolver actions.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Sign-in ends at a verified tenant page.',
      guidance:
        'Reopen the original supplied case link in the requester origin. This is the reviewed login return contract, not lost ownership. There is no discovery list yet and no persisted case selection.',
    },
    {
      symptom: 'Progress is unavailable or identity is rejected.',
      guidance:
        'Ask your contact to check the link and your administrator to check registration and the separate ownership binding. Never substitute approval evidence or another actor ID. Neutral absence does not reveal another owner or even case existence.',
    },
    {
      symptom: 'A timeout, connection failure or unusable response appears.',
      guidance:
        'Old facts stay hidden. Use explicit recheck where offered; transient reads have at most one bounded retry. Implementation defects and unsupported responses direct you to an operator. No raw diagnostics or server-provided arbitrary redirect is displayed.',
    },
  ],
  limitations: [
    'This is the first usable read surface, not the complete M05-PR18 adaptive canvas. Intake, discovery, information responses, notifications and sign-out belong to later slices. No resolver navigation or command exists.',
    'Ownership is provisioned through reviewed privileged database operations, not the browser. Transfer/revocation is not supplied; incorrect provisioning requires disabling requester access and reviewed forward repair.',
    'This simulated Chromium guide does not certify live IdP, separate-origin deployment, PostgreSQL authorization or actual proof acceptance. Those need backend and operational verification.',
  ],
};
