import type { GuideChapter } from './guide-chapter';

export const resolverNotificationsGuide: GuideChapter = {
  schemaVersion: 2,
  order: 43,
  slug: 'resolver-historical-notifications',
  title: 'Inspect resolver deliveries without carrying forward authority',
  summary:
    'Find recent handovers and requester answers, independently check a target, and distinguish a denied or unavailable check from a checked empty feed.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Resolvers supervising follow-up work, and administrators explaining notification access and historical delivery.',
  overview: [
    'Notifications are a bounded history of deliveries addressed to the verified resolver. They are not an inbox of unread tasks, an acknowledgement mechanism or a live assignment queue. A requester answer or handover may remain in history after work changes owner, closes or becomes inaccessible. Opening its pointer asks the backend for current-owner case context under a new verified session. Historical metadata never claims work, restores a previous lease or authorizes a capability.',
    'This chapter uses clearly simulated BFF responses and deliberately denies the selected historical target. It proves that the browser does not promote a delivery into private evidence, not that a real identity provider or database enforced ownership. Two handovers share a source command but point to different work items: both must remain visible because command identity is scoped to its target. Unsolicited private fixture text is removed before rendering or caching.',
  ],
  prerequisites: [
    'Use the resolver workbench origin and a tenant link supplied by your organization. Deploy the protected notification backend from Ergon PR #226 first. Your session must map to a registered tenant actor with current resolver authority. Neither editing a URL nor knowing a work UUID grants that role. Requester notifications belong to the separately deployed requester application; switching an audience in browser state cannot broaden this feed.',
    'Expect only the latest fifty deliveries. When older entries are omitted, the page explicitly says so; there is no cursor, total or backfill. Keep using the normal owned-work queue for operational completeness and reviewed actions. Delivery time is shown in UTC and describes historical delivery, not time of ownership verification, response freshness, proof acceptance or completion of the underlying resolution.',
  ],
  steps: [
    {
      id: 'resolver-deliveries',
      title: 'Read the checked delivery history',
      body: 'Open Notifications from the verified follow-up navigation. Read the historical explanation before interpreting the rows. Each card identifies its event category, UTC delivery time and target work reference. No customer message, answer body, evidence or actor attribution is included. Matching source commands on different targets remain distinct cards. Opening this surface performs only session and feed GET requests; it does not acquire CSRF or issue a command.',
      expected:
        'Two synthetic handover cards appear without unsolicited private text or action controls.',
    },
    {
      id: 'resolver-narrow',
      title: 'Use the same controls on a narrow screen',
      body: 'At a narrow viewport the cards form a single readable column and long identifiers wrap. The target button has an accessible name including its work reference, making repeated controls distinguishable. Keyboard users can reach recheck and target controls without a hover interaction. No modal or animation obscures the historical warning. Use your browser zoom normally; the page should not require horizontal scrolling to reach an action.',
      expected:
        'The 320-pixel page has no horizontal overflow and the accessibility scan reports no violations.',
    },
    {
      id: 'resolver-target',
      title: 'Independently check current work access',
      body: 'Choose Check current access on the first handover. The app withdraws all delivery cards, moves focus to its persistent Notifications heading, retires the old scope and verifies the session again before requesting case context. The work reference stays in mounted navigation state rather than the URL. In this example the server denies the historical target, so no case evidence is shown and no work is claimed.',
      expected:
        'A safe target failure appears after fresh session verification, with no delivery cards or private work ID in browser history.',
    },
    {
      id: 'resolver-denial',
      title: 'Return and distinguish denial from emptiness',
      body: 'Return to notifications to start a new session and feed lifetime. Then recheck while the fixture returns forbidden access. Previously visible cards disappear before the request and remain absent after rejection. The error explicitly differs from an empty feed. A delivery that existed earlier is not a reason to reuse a retained snapshot, bypass authorization or infer that current ownership still belongs to you.',
      expected:
        'Forbidden feed access produces an explanatory alert rather than old cards or an empty success.',
    },
    {
      id: 'resolver-recovery',
      title: 'Recover with an explicit complete recheck',
      body: 'Use Recheck notifications after the service is available again. Each attempt verifies the session first; the feed has no background polling or automatic retry. Temporary unavailability and malformed data also keep old cards hidden. An authentication-required response offers only the trusted same-origin sign-in action. Login returns to the tenant entry, where you reopen Notifications; private target selection is not restored.',
      expected:
        'Unavailable, malformed and authentication-required states never disclose retained metadata; an explicit recovery restores the checked cards.',
    },
    {
      id: 'resolver-empty',
      title: 'Interpret an independently checked empty feed',
      body: 'Recheck once more with no recent deliveries. Read the successful empty-state wording carefully: it does not establish that no outstanding work exists. Return to follow-ups or assigned runs for their independently protected views. No read flag is written when you leave, and opening a delivery does not consume or acknowledge it. Later checks can therefore show the same historical event again.',
      expected:
        'A checked empty result appears without cards, proof claims or a fabricated unread count.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'An older handover is visible but its target cannot be opened.',
      guidance:
        'Ownership or authorization may have changed. Use the normal queue or contact an authorized operator; a historical delivery is not a recovery credential. Rechecking makes a new read and cannot restore a claim.',
    },
    {
      symptom: 'The feed fails while your browser still appears signed in.',
      guidance:
        'Session verification and notification authorization are separate checks. Renew the session when offered, verify the intended tenant and role, and retry explicitly. Do not treat service unavailability as evidence of an empty history.',
    },
  ],
  limitations: [
    'Synthetic guide fixtures do not verify live OIDC, PostgreSQL delivery transactions or cross-origin deployment. This slice adds no polling, unread tracking, push transport, cursor, complete queue or command. Browser and guide recording are verified on CI.',
  ],
};
