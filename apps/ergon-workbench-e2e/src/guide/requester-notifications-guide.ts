import type { GuideChapter } from './guide-chapter';

export const requesterNotificationsGuide: GuideChapter = {
  schemaVersion: 2,
  order: 44,
  slug: 'requester-historical-notifications',
  title: 'Find information requests and independently reopen your case',
  summary:
    'Read requester delivery metadata, follow a freshly protected case link, and recover feed failures without treating historical alerts as current case access.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Requesters returning to a case after an information request and support teams explaining safe navigation.',
  overview: [
    'The requester application provides a separate Notifications page after session verification. It contains recent information-request deliveries for your registered identity, not every case you own and not a list of unanswered questions. A delivery may remain after a case closes or access changes. Its card intentionally contains only a category, UTC delivery time and case reference. To read the actual question, independently open the case and let its protected progress and history checks succeed.',
    'The recording uses synthetic marked BFF responses. Its historical case pointer is deliberately rejected by the fresh progress endpoint, demonstrating safe withdrawal rather than a successful ownership grant. No resolver role, private answer text, internal evidence or customer data is supplied by the feed. The scenario then exercises denied, unavailable, malformed, authentication-required and checked-empty feed states. Fixture behavior does not certify production identity, ownership transactions or live notifications.',
  ],
  prerequisites: [
    'Use the requester origin and tenant address provided by your support organization. Deploy Ergon PR #226 with its requester-audience configuration before enabling this UI. A trusted session must resolve to your registered actor. Do not use a resolver origin, another person’s case reference or an edited audience parameter to attempt access; authorization remains with the backend on every protected request.',
    'Keep your supplied case links when you need them. The feed shows at most fifty recent deliveries and explicitly identifies truncation; it offers no older-page cursor or total. An empty page does not mean you have no open cases or outstanding requests. There is no unread badge or read acknowledgement, and opening or refreshing a notification sends no answer, starts no resolution run and changes no ownership.',
  ],
  steps: [
    {
      id: 'requester-deliveries',
      title: 'Read recent information-request deliveries',
      body: 'From the verified tenant or case navigation choose Notifications. Session verification happens before the feed loads. Read the historical explanation and inspect the event category, UTC delivery time and case reference. The question and any previous answer remain absent: they belong to a separately protected case history. Do not infer that the question is still unanswered or the case still open from the delivery alone.',
      expected:
        'A checked information-request card appears with no unsolicited private content or resolver controls.',
    },
    {
      id: 'requester-narrow',
      title: 'Read and navigate with keyboard or zoom',
      body: 'On a narrow screen the card stays within the page and the case UUID wraps. The target button’s accessible name includes the case reference, so keyboard and assistive-technology users can distinguish repeated controls. Recheck remains reachable without horizontal scrolling or a hover menu. The same historical warning is visible in the small layout; no mobile shortcut bypasses the fresh access check.',
      expected:
        'The 320-pixel layout reflows without horizontal overflow and passes the scenario accessibility scan.',
    },
    {
      id: 'requester-target',
      title: 'Open the case through a new protected lifetime',
      body: 'Choose Check current access. Navigation withdraws the feed and enters the existing supplied-case route with a fresh store and session check. The alert cannot populate progress or question-history caches. In this recording the case read is rejected, so no goal, question or answer is shown. In an authorized deployment both current progress and history must succeed before the private case canvas is disclosed.',
      expected:
        'A new requester session precedes the protected case GET; denied access shows no historical private case content.',
    },
    {
      id: 'requester-denial',
      title: 'Return and recognize a rejected feed check',
      body: 'Return to Notifications and recheck under a simulated forbidden response. The application discards the previous cards before requesting a fresh session and feed. The resulting message is an access failure, not an empty success. Repeatedly opening the historical case pointer cannot restore ownership. If you believe access should exist, use the support organization’s normal process rather than changing case or actor identifiers.',
      expected:
        'The rejected feed contains an explanatory alert and none of the earlier delivery cards.',
    },
    {
      id: 'requester-recovery',
      title: 'Recover explicitly without restoring stale rows',
      body: 'Use Recheck notifications after connectivity or service recovers. Unavailable and malformed responses keep all retained rows hidden. Authentication-required responses offer the fixed sign-in action supplied by the app, never a URL from untrusted problem details. Login returns to the tenant entry; reopen Notifications from there. There is no automatic background retry, durable browser recovery record or persistent case selection to restore.',
      expected:
        'Failure states remain private; a successful explicit recheck reacquires session and delivery metadata independently.',
    },
    {
      id: 'requester-empty',
      title: 'Read the successful empty result accurately',
      body: 'Finally recheck a feed with no recent deliveries. This successful snapshot is narrower than a case catalog: it does not prove there are no pending questions, no open cases or no work in progress. Reopen a supplied case link when you need its current status. Reading the feed never records an answer or marks a delivery read, so an event can remain visible across future visits.',
      expected:
        'The checked empty explanation is visible without a fabricated zero-work conclusion, unread count or private history.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'A notification exists but the case is unavailable.',
      guidance:
        'The delivery is historical; current requester ownership is checked separately. Verify the intended tenant and session. Contact support if access needs correction, without sharing credentials or treating the UUID as authorization.',
    },
    {
      symptom: 'A new question is missing from the recent list.',
      guidance:
        'This view is bounded delivery history rather than a complete case or question inventory. Older deliveries may be omitted. Use your supplied case link for independently checked progress and question history; do not assume absence means no pending request.',
    },
  ],
  limitations: [
    'The fixture verifies browser navigation and disclosure behavior, not real identity-provider exchange or durable backend delivery. There is no push transport, polling, read marking, backfill, complete case list or implicit answer submission. Video generation runs on CI.',
  ],
};
