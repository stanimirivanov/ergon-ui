import type { GuideChapter } from './guide-chapter';

/** The assertions in inbox-guide.spec.ts record each declared step in order. */
export const inboxGuide: GuideChapter = {
  schemaVersion: 2,
  order: 8,
  slug: 'find-work-in-the-shared-inbox',
  title: 'Find work in the shared inbox',
  summary:
    'Browse an oldest-first resolver inbox, move between pages, narrow it to an exact queue, and recognize an empty filtered view.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience: 'Resolvers looking for unclaimed human follow-up work.',
  overview: [
    'The shared inbox is a discovery view for open, unclaimed follow-ups under your current tenant-wide resolver authority. It does not assign a case to you and it is not a complete inventory of the tenant. The control plane re-evaluates visibility for each request, so another resolver’s claim or a change in your authority can alter what you see between pages. A named queue narrows this view by exact queue key; it does not grant queue-specific authority.',
    'This browser walkthrough uses a deterministic synthetic resolver and 26 synthetic follow-ups, deliberately enough to cross the workbench’s 25-row page boundary. The screenshots and recording are labelled SIMULATED DATA. The exercise verifies the UI and its BFF request shape, not live authentication, server authorization, concurrency, or database ordering. Never interpret these example rows, IDs, or screenshots as real customer work.',
  ],
  prerequisites: [
    'In a real deployment, sign in through the same-origin workbench flow, confirm the tenant, and ensure your resolver identity is registered with current tenant-wide resolver authority. This recording starts after a simulated verified session and does not perform a real login.',
    'Open the tenant workbench and locate Open follow-up work below your claimed-work section. The tenant identifier is navigation context, not proof of authority. Do not use the queue field as an access-control mechanism.',
  ],
  steps: [
    {
      id: 'first-page',
      title: 'Read the first visible page',
      body: 'The shared inbox presents the oldest visible follow-ups first. Check the queue, reason, case identifier, and opened time on a card before deciding whether to claim it. This example first page contains 25 rows, the workbench page size. A row count describes only the current page, not the total number of matching cases or the size of your authority.',
      expected:
        'The first page reports 25 rows; Previous page is unavailable and Next page is available.',
    },
    {
      id: 'next-page',
      title: 'Move to the next page',
      body: 'Select Next page to request the next oldest set. The workbench sends both the opening timestamp and work-item ID returned in the cursor; together they disambiguate items that share a timestamp. Do not copy one cursor field alone or infer a page number. The control plane does not promise a stable total while other resolvers act.',
      expected:
        'The browser sends the paired keyset cursor and displays the remaining synthetic item.',
    },
    {
      id: 'second-page',
      title: 'Confirm the end of this result set',
      body: 'The second page in this example has one identity-review follow-up. Next page is disabled because the response has no continuation cursor. That only means this query has no further page at this moment; new work could arrive later, and visibility can change. The browser does not show a total count because the BFF does not disclose one.',
      expected:
        'One row is visible, Previous page is available, and Next page is disabled.',
    },
    {
      id: 'previous-page',
      title: 'Return to the earlier page',
      body: 'Select Previous page to use the cursor retained for this local navigation history. This is not a reverse database query. It re-requests the earlier page, so its contents can differ if a claim or authority change occurred in the meantime. When accuracy matters, re-read the card and current ownership state before acting.',
      expected: 'The first page is visible again with its 25-row count.',
    },
    {
      id: 'filter-queue',
      title: 'Apply an exact queue key',
      body: 'Enter access-restoration in Queue key and select Apply filter. The filter appears in the address bar, making this view shareable as navigation context. Applying a new filter resets local page history and starts at the first page of the new query. Queue keys are lowercase, begin with a letter, and may contain digits or hyphens; the key must match exactly.',
      expected:
        'The URL contains queue=access-restoration and only the matching synthetic follow-up remains.',
    },
    {
      id: 'filtered-page',
      title: 'Interpret the narrowed result',
      body: 'The access-restoration card is now the only visible row and both page controls are unavailable. This result is not a claim and does not reserve the work. Another resolver can still claim it, and a later refresh may show a different result. To handle a follow-up, review the item and use the explicit Claim work action described in the next chapter.',
      expected:
        'The filtered view reports one row without showing account-review items.',
    },
    {
      id: 'unknown-queue',
      title: 'Try a valid but unmatched queue key',
      body: 'Replace the queue key with an otherwise valid but unmatched key and apply it. The workbench shows a neutral empty state. This does not prove that the queue is absent or that no case exists; the same view can result when no unclaimed work is currently visible to you. Do not use empty results to infer another tenant’s workload or your authorization.',
      expected:
        'The page says No open work in this view and identifies the selected queue without revealing other rows.',
    },
    {
      id: 'empty-queue-result',
      title: 'Read the neutral empty state',
      body: 'The message is deliberately about this view, not about the existence of a queue or a case. Check the selected key in the URL and field before trying another filter. A legitimate empty result and an authority-limited result do not provide a reliable distinction here.',
      expected:
        'The named queue has no visible rows and neither page control offers more results.',
    },
    {
      id: 'clear-filter',
      title: 'Restore the all-queue view',
      body: 'Clear the Queue key field and apply the filter again. Removing the URL parameter restores the all-queue query and begins at its first page; it does not recover the previous pagination history. Recheck the current row details and availability before claiming, because the shared inbox is live discovery rather than a saved snapshot.',
      expected:
        'The queue parameter disappears and the 25-row first page is visible again.',
    },
    {
      id: 'all-queues-restored',
      title: 'Confirm the all-queue view returned',
      body: 'The cleared field and address bar indicate that the all-queue query is active again. Its first page may change over time, so check the current card before taking a claim action. The page count still describes only this page and remains separate from ownership or authorization.',
      expected:
        'The workbench again shows the oldest-first synthetic page with 25 rows and no queue parameter.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'A queue filter is rejected before a list appears.',
      guidance:
        'Check the key format: start with a lowercase letter and use only lowercase letters, digits, and hyphens, up to 63 characters. Clear the filter to return to all visible queues. An invalid URL filter is not sent to the BFF.',
    },
    {
      symptom: 'The next page changes or a previously visible item disappears.',
      guidance:
        'Shared work is concurrent. Another resolver may have claimed an item, or your current authority may have changed. Return to the first page or refresh and use the latest visible item and ownership revision; do not assume the old card remains claimable.',
    },
    {
      symptom: 'A valid queue shows an empty page.',
      guidance:
        'Confirm the tenant and exact queue key. An empty authorized page is intentionally non-disclosing and cannot distinguish no matching work from no currently visible work. Do not treat it as an authorization diagnostic.',
    },
  ],
  limitations: [
    'This is a simulated BFF chapter. It cannot prove actual resolver authorization, backend keyset behavior, OIDC sign-in, concurrent claims, or persistence; those need their own integration tests and a future disposable full-stack guide environment.',
    'The workbench currently has no total count, cross-page selection, saved filters, or automated refresh. The cursor is local to the mounted inbox and is reset by a queue change or navigation away from the page.',
  ],
};
