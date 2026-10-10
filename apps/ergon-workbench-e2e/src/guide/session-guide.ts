import type { GuideChapter } from './guide-chapter';

/** Alternative access states illustrated with synthetic BFF responses. */
export const sessionGuide: GuideChapter = {
  schemaVersion: 2,
  order: 5,
  slug: 'understand-workbench-access',
  title: 'Understand workbench access states',
  summary:
    'Recognize why the resolver workspace remains closed, choose the appropriate recovery path, and identify the state that confirms your session has been verified.',
  verification: 'simulated-bff',
  presentation: 'state-comparison',
  audience: 'Resolvers and tenant administrators diagnosing workbench access.',
  overview: [
    'The tenant workbench checks the confidential BFF session before it mounts resolver content. A tenant address is navigation context, not proof of permission. The BFF identifies the signed-in person, resolves a registered Ergon actor in that tenant, and returns a browser-safe actor view. The workbench does not receive provider tokens or the provider subject. A failed check keeps the follow-up inbox closed rather than showing stale or tenant-foreign work.',
    'This chapter compares mutually exclusive access states. The recording changes deterministic, synthetic BFF responses between reloads to show each screen; a real person does not move through every error in this sequence. In particular, the recording never opens an identity provider or performs an OIDC login. The final verified screen represents a simulated successful session response, not proof that a live sign-in, actor registration, or backend authorization succeeded.',
  ],
  prerequisites: [
    'Use the workbench address for the intended tenant. If the tenant ID is malformed, correct the address before troubleshooting identity; the application does not ask the BFF to authorize an invalid tenant path.',
    'For a deployed system, sign in only through the local link supplied by the workbench. Never paste a provider token into the browser, store one in a URL, or assume a tenant URL grants access.',
  ],
  steps: [
    {
      id: 'start-at-workbench',
      title: 'Start at the workbench entry',
      body: 'Open the workbench and use the tenant workspace address supplied by your organization. The entry screen explains the session gate but does not expose tenant work. It is a safe place to begin if you have an outdated bookmark or need to confirm that the application itself loads before checking your identity.',
      expected:
        'The entry screen appears without a resolver inbox or case evidence.',
    },
    {
      id: 'recognize-sign-in-required',
      title: 'Recognize a missing browser session',
      body: 'A sign-in-required screen means the BFF has not verified a browser session. The shared and owned work views remain unmounted. Refreshing repeatedly will not create credentials. If you expected to be signed in, use the displayed sign-in route rather than interpreting the empty workspace as a lack of cases.',
      expected:
        'The page says authentication is required and explicitly says no resolver data has been loaded.',
    },
    {
      id: 'inspect-local-sign-in-link',
      title: 'Use the local sign-in route',
      body: 'The link keeps the return destination inside the tenant workbench and begins at the same-origin BFF path. In a deployed environment it then redirects to the configured identity provider. This recording checks the link destination but deliberately does not follow it; no actual provider, callback, cookie, or login is exercised here.',
      expected:
        'The link points to /bff/login with a canonical tenant return path, not to an arbitrary external URL.',
    },
    {
      id: 'recognize-missing-actor-binding',
      title: 'Distinguish missing tenant provisioning',
      body: 'A valid identity can still lack an Ergon actor binding in this tenant. The screen directs you to a tenant administrator because signing in again cannot provision that binding. Do not switch to another tenant to search for work unless you are independently authorized there; the BFF intentionally does not reveal where else an actor may be registered.',
      expected:
        'The screen says the Ergon actor is not registered and does not show resolver work.',
    },
    {
      id: 'recognize-disabled-sign-in',
      title: 'Distinguish disabled browser authentication',
      body: 'When the control plane has not enabled its browser session boundary, the workbench shows a configuration problem rather than offering an endless retry. An operator must enable and configure the confidential OIDC client. This is different from a brief network outage and should not be worked around by calling internal bearer endpoints from browser code.',
      expected:
        'The page says browser sign-in is not configured and offers no Try again button.',
    },
    {
      id: 'recognize-rejected-identity',
      title: 'Recognize a rejected identity',
      body: 'An issuer or authenticated identity that fails the control plane’s trust checks cannot enter the tenant workspace. The UI gives a neutral explanation and does not show private provider details or follow-up work. Ask the identity or tenant administrator to investigate the configured trust mapping; do not try to infer another user’s binding from this screen.',
      expected:
        'The page says the identity cannot enter the workspace and confirms that no resolver data was loaded.',
    },
    {
      id: 'recognize-temporary-failure',
      title: 'Recognize a temporary verification failure',
      body: 'A temporary service failure means the workbench could not confirm the actor safely. Unlike disabled sign-in or missing provisioning, this state offers a retry. Wait until the control plane is reachable; do not treat the previous browser view, a saved screenshot, or a cached URL as current authority to read case context.',
      expected:
        'The screen reports that session verification is temporarily unavailable and offers Try again.',
    },
    {
      id: 'retry-verification',
      title: 'Retry after the service recovers',
      body: 'Select Try again only when the transient cause has cleared. The workbench asks the BFF to verify the current session again; it does not reuse an earlier success as authority. In this recording the synthetic response changes to a verified actor before the click, demonstrating UI recovery without claiming that a real backend recovered.',
      expected:
        'The verification screen closes and the tenant workspace opens.',
    },
    {
      id: 'confirm-verified-workspace',
      title: 'Confirm the verified workspace',
      body: 'A verified session shows the resolver inbox and a browser-safe actor view. The empty shared and owned lists in this example are synthetic; they do not establish that a deployed tenant has no work. Check the tenant and any queue filter before interpreting an empty list, and remember that subsequent commands still need server-side authority and CSRF checks.',
      expected:
        'The human follow-up inbox appears, while provider subject and tokens remain absent from the page.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Session verification reports a workbench error.',
      guidance:
        'Contact an operator rather than repeatedly retrying. An unexpected client or binding failure is distinct from an invalid identity response. Resolver content stays unmounted even if an earlier actor was cached, and raw diagnostic details are neither displayed nor retained as cache errors. This defect screen is verified by cache/component tests; the synthetic HTTP recording does not inject a programming defect.',
    },
    {
      symptom: 'The sign-in link is absent or points somewhere unexpected.',
      guidance:
        'Stop and report the displayed address to an operator. The workbench accepts only its validated local BFF sign-in path and canonical tenant return destination; do not follow a copied external redirect.',
    },
    {
      symptom: 'Signing in returns to an access-not-provisioned screen.',
      guidance:
        'Ask a tenant administrator to check the actor binding for the exact tenant. Repeating the OIDC login will not create an Ergon actor or grant resolver authority.',
    },
    {
      symptom: 'The verification retry repeatedly fails.',
      guidance:
        'Treat this as an unavailable service or unusable response, not as permission to bypass the BFF. Capture the non-sensitive status and contact an operator; never send a token, session cookie, or case payload in a support message.',
    },
  ],
  limitations: [
    'Every BFF response and actor value in this chapter is synthetic. It does not test OIDC redirects, provider login, cookie issuance, database actor registration, or backend tenant authorization.',
    'The workbench currently has no logout or session-revocation UI. The guide shows access states and safe recovery choices, not a complete identity administration procedure.',
  ],
};
