import type { GuideChapter } from './guide-chapter';

export const followUpPriorityGuide: GuideChapter = {
  schemaVersion: 2,
  order: 37,
  slug: 'change-owned-follow-up-priority',
  title: 'Change follow-up priority without changing ownership or proof',
  summary:
    'Read current administrative metadata, confirm both revision fences, and recover an uncertain original assignment without confusing history with current truth.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Resolvers assigning administrative priority to follow-ups they currently own.',
  overview: [
    'Priority is one of LOW, NORMAL, HIGH or URGENT. It is metadata for human coordination, not an execution risk classification, SLA promise, sorting rule or authority grant. Shared work remains oldest-opened first and owned work remains oldest-claimed first. Raising priority does not approve a capability, transfer work, resolve a case or accept proof. Read the separate risk, ownership and outcome displays for those facts.',
    'The independent priority revision starts at zero with implicit NORMAL. Every accepted new assignment advances it, including an explicit assignment of the same value. Ownership has its own revision and claim. This chapter deliberately loses one response after a simulated commit and then advances priority again, demonstrating why a recovered receipt is historical rather than a replacement for current authorized reads.',
  ],
  prerequisites: [
    'Use a registered resolver session for the intended tenant and open work from Claimed follow-ups. The browser only offers the action under its current owned-work disclosure. The backend independently checks your current resolver authority, original active claim, ownership revision and expected priority revision when it processes the request. A screenshot or previously successful command does not establish current permission.',
    'Operators must deploy backend priority schema, command and compatible read projections before this client, then deliberately enable ERGON_HUMAN_FOLLOW_UP_PRIORITY_ENABLED. The flag defaults off and also controls receipt recovery. Reads remain available when writes are disabled. Missing or malformed priority fields are not silently interpreted as NORMAL at revision zero.',
  ],
  steps: [
    {
      id: 'priority-review',
      title: 'Review independent current metadata',
      body: 'Open the owned Console and choose Change priority. Review the original claim, expected ownership revision and current observed priority revision. Choose a value deliberately. Even confirming the displayed value again creates a new revision; it is not a no-op. The acknowledgement explains which facts do not change.',
      expected:
        'The modal shows NORMAL at revision zero and both independent decision fences.',
    },
    {
      id: 'priority-validation',
      title: 'Acknowledge before creating an intent',
      body: 'Submit the form without acknowledgement. Accessible validation keeps the form open and sends nothing. Select HIGH and acknowledge only after reviewing the consequences. Form validation is a usability guard; the server still validates closed values, revision bounds, ownership and authority.',
      expected:
        'Required acknowledgement feedback appears with zero assignment requests.',
    },
    {
      id: 'priority-cancel',
      title: 'Cancel an unsent form',
      body: 'Use Keep current priority or Escape to close the modal without sending. Focus returns to Change priority. Reopening resets the acknowledgement and selected value to the current observation. This cancellation is different from leaving after a POST: a sent assignment may commit even if its browser request is cancelled.',
      expected:
        'The form closes with focus restored and no command; a reopened form is unacknowledged.',
    },
    {
      id: 'priority-narrow',
      title: 'Review the same decision on a narrow screen',
      body: 'At 320 pixels the claim UUID wraps, values remain readable and the confirmation stays keyboard accessible. Tab stays within the native modal; Escape still cancels. Scroll within the dialog to review all constraints rather than relying only on a color or a short urgency label.',
      expected:
        'The narrow form has no horizontal overflow and passes automated accessibility checks.',
    },
    {
      id: 'priority-disabled',
      title: 'Respect a disabled producer',
      body: 'Confirm HIGH in the simulated disabled deployment. Private context and the modal withdraw before the POST. The unavailable result is a definite refusal: no automatic retry or exact-replay shortcut appears. Ask an operator about enablement rather than treating a visible form as proof that writes are enabled.',
      expected:
        'Unavailable feedback replaces private context; current ownership is not inferred from the response.',
    },
    {
      id: 'priority-conflict',
      title: 'Recover from a stale revision with new facts',
      body: 'Recheck owned work explicitly, reopen the Console and confirm against its current observation. The next simulated response conflicts. Do not edit the old command or substitute a newer revision in an uncertain retry. Discard this definite refusal through fresh recovery and review another intent only after the owned-work and case gates succeed.',
      expected:
        'Conflict feedback requires fresh owned recovery and offers no exact replay.',
    },
    {
      id: 'priority-pending',
      title: 'Observe committed privacy withdrawal',
      body: 'After another fresh recovery, confirm HIGH. The simulation holds the request after committing. Private case context, notes and original claim details stay hidden while only command status remains. Leaving abandons memory-only recovery coordinates; it neither retracts the assignment nor proves it failed. No background POST retry occurs.',
      expected:
        'Pending feedback is visible while private case evidence and the confirmation modal are absent.',
    },
    {
      id: 'priority-uncertain',
      title: 'Retain the original uncertain intent',
      body: 'The first committed response is deliberately lost. Keep the interaction open if you still intend this assignment. Retry exact priority assignment preserves command identity, claim, both expected revisions and chosen value. It first rechecks original active ownership; replacement, terminal retirement or an unsuccessful check retires browser replay. The backend fences races again.',
      expected:
        'An explicit exact replay action appears with no automatic resend or private disclosure.',
    },
    {
      id: 'priority-history',
      title: 'Read recovered acknowledgement as history',
      body: 'Replay the original intent. The synthetic server returns HIGH at revision one, even though a later assignment already made the current value URGENT at revision two. This is valid historical acknowledgement, not a request to overwrite the new value. It creates no new assignment and does not reopen the Console.',
      expected:
        'Identical original intent returns a clearly historical receipt while private context stays absent.',
    },
    {
      id: 'priority-current',
      title: 'Return through fresh owned and case reads',
      body: 'Choose Recheck my owned work and open the Console again. Current authorized reads show URGENT at revision two, not the earlier HIGH receipt. Ownership and its revision remain unchanged. Continue human coordination using this observation, remembering another assignment can occur later; there is no automatic monitoring, priority sorting or SLA engine here.',
      expected:
        'Fresh work and case context show URGENT revision two and historical feedback is retired.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'The request times out or the receipt cannot be validated.',
      guidance:
        'Treat the outcome as uncertain. Nothing retries automatically. Exact replay keeps the original tuple and requires fresh original active ownership plus server authority checks. Leaving or reloading discards local intent without undoing the write. Never mint a replacement command merely to discover an old result.',
    },
    {
      symptom: 'Work is unavailable or the claim/priority revision conflicts.',
      guidance:
        'Use fresh owned-work recovery. Neutral absence does not disclose whether authority changed, work ended or another resolver owns it. Priority recovery does not survive ownership replacement, unlike the separately defined completion-history recovery. Do not copy prior case or receipt data into current state.',
    },
    {
      symptom: 'The recovered receipt differs from the current display.',
      guidance:
        'Compare meanings rather than overwriting resources: the receipt acknowledges one original assignment and the current read observes the latest independent revision. Later assignments, including the same value, can legitimately supersede history. Recheck deliberately when current facts are needed.',
    },
  ],
  limitations: [
    'No priority sorting, SLA/due dates, notifications, bulk assignment, audit-history browser, risk change, ownership transfer or proof action is provided.',
    'Recovery intent is local to the mounted interaction; no URLs, persistent browser storage or reload recovery record retain private command coordinates.',
    'This synthetic guide verifies browser behavior and labelled examples, not live OIDC, backend authorization, PostgreSQL locking or production rollout.',
  ],
};
