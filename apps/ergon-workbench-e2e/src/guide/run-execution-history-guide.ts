import type { GuideChapter } from './guide-chapter';

export const runExecutionHistoryGuide: GuideChapter = {
  schemaVersion: 2,
  order: 29,
  slug: 'execution-admission-history',
  title: 'Inspect admission history without inventing an execution trace',
  summary:
    'Read committed browser execution admissions across supervision epochs, distinguish supported absence and incomplete windows, and withdraw earlier checkpoints when fresh access fails.',
  verification: 'simulated-bff',
  presentation: 'workflow',
  audience:
    'Current run supervisors diagnosing recorded admission and recovery checkpoints.',
  overview: [
    'An admission is a committed permission checkpoint for the browser execution command, not a log of external operations. INITIAL identifies the command’s original admission; RECOVERY records an additional explicitly admitted recovery attempt. Recovery may repair only a missing projection without contacting a provider. Counting these rows cannot tell you how many provider calls occurred, whether an external effect happened exactly once, or which attempt supplied the final receipt.',
    'The inspector uses the current supervisor and current tenant-wide resolver authority. An incoming supervisor can inspect sanitized admissions from earlier supervision epochs, including terminal runs, without acquiring browser control. This read grants neither acknowledgement nor recovery rights: original-actor restrictions and all separately reviewed execution safeguards remain unchanged. No actor, session, command, fence or provider-operation identifier is disclosed.',
    'All evidence in this chapter is SIMULATED DATA. Real browser navigation, request lifetimes, strict decoding and accessibility run against marked synthetic responses. Timestamp ties, historical epochs, denial, truncation and terminal state are prepared fixture comparisons, not real handovers, recovery commands, PostgreSQL audit writes or live provider verification. Backend ADR 0058 and Ergon PR #174 own those guarantees.',
  ],
  prerequisites: [
    'Deploy the compatible backend from Ergon PR #174 before relying on history. The read is independent of execution-command enablement and control ownership; a missing history route must never masquerade as an empty audit. The existing verified-session, selected-run and protected Console boundaries must already be available.',
    'Open Assigned runs as the current supervisor. Selection alone does not fetch the additional audit: choose Inspect recorded admissions explicitly. There is no polling, automatic recovery or lease acquisition. Reopening and rechecking each require fresh access rather than restoring a retained private snapshot.',
    'Read both times separately. Recording order uses a private server tie-breaker when times tie, not causal ordering. Admission times may move backwards; INITIAL need not be first or appear in a capped window. Authorization observation time is not an upper bound on a later audit snapshot. Never derive latency by subtracting these timestamps.',
  ],
  steps: [
    {
      id: 'discover',
      title: 'Select the run without loading its audit',
      body: 'Find the compact Execution admission history row in Supporting inspection. Its direct action reads recorded browser admissions, including earlier supervision epochs, not dispatches, per-call results or live spans. Selection does not request this optional history, and no browser control lease is required. The concise launcher is not an authority shortcut: each open independently checks fresh exact-run supervision and resolver access.',
      expected:
        'The inspector trigger is available and the synthetic history-read count remains zero.',
    },
    {
      id: 'empty',
      title: 'Recognize supported absence precisely',
      body: 'Choose Inspect recorded admissions. The first prepared response is a supported empty history under current epoch three. Read No browser execution command recorded. That statement is narrower than no execution: internal integrations or external effects are not ruled out. Do not use an empty browser audit as justification to dispatch a new command.',
      expected:
        'Supported empty history is visible without any admission rows or writes.',
    },
    {
      id: 'recorded',
      title: 'Read historical checkpoints in returned order',
      body: 'The fixture now exposes a recovery admission and the initial admission from earlier supervision epochs. Recheck admission access. Recovery appears first and both recording timestamps tie; the initial admission time is earlier. Preserve this backend presentation rather than sorting by kind, epoch or admission time. Read the exact nanosecond strings without inventing duration or per-row success.',
      expected:
        'Recovery then Initial are shown, with historical epochs two and zero, and the recording-order warning.',
    },
    {
      id: 'keyboard',
      title: 'Navigate the modal without reaching background controls',
      body: 'Focus Recheck admission access and move forward and backward through the dialog controls using Tab and Shift+Tab. Focus stays within the modal; the background Console is not another keyboard surface. Escape dismisses inspection without sending a command and returns focus to its trigger. Opening it again always performs a new protected read.',
      expected:
        'Keyboard containment and Escape return focus are verified; no business command is sent.',
    },
    {
      id: 'narrow',
      title: 'Inspect exact timestamps at 320 pixels',
      body: 'Reopen at narrow width and read the admission labels, exact UTC times and caveats. Content wraps inside the modal rather than forcing a horizontal page or dialog scrollbar. Time precision remains intact. The glass overlay is a presentation layer only; readable text and semantic controls do not depend on translucency, color or animation.',
      expected:
        'The dialog and page fit 320 CSS pixels, and its close control remains reachable.',
    },
    {
      id: 'held',
      title: 'Withhold earlier rows before revalidation',
      body: 'The fixture holds the next history response. Choose Recheck admission access. Previously visible rows disappear immediately while the pending protected read runs; retained RTK data is not treated as current access. The status explains that earlier history is hidden. Do not infer progress or provider activity from a pending read.',
      expected:
        'Pending status replaces every earlier admission row while one read is held.',
    },
    {
      id: 'denied',
      title: 'Treat denial as neutral protected absence',
      body: 'Release the held synthetic request as a neutral denied result. Admission history unavailable replaces the modal and earlier private Console context before paint. Discovery rows, policy, proof and action controls are withdrawn. The browser never reveals why access failed, who supervises the run now or whether it exists elsewhere. Retained snapshots are not continuing authority.',
      expected:
        'Unavailable feedback contains no prior admission rows and no replacement execution controls.',
    },
    {
      id: 'recovered',
      title: 'Recover through a fresh protected read',
      body: 'The fixture restores access. Choose Recheck run access to reacquire discovery and exact-run authority, then open Inspect recorded admissions again for its distinct protected read. No saved snapshot or changed command intent is used. This demonstrates browser recovery only: no role, assignment, lease or execution authority is created by the reader.',
      expected:
        'Fresh rows replace unavailable feedback after a new read, with zero writes.',
    },
    {
      id: 'unsupported',
      title: 'Distinguish an older server from an empty audit',
      body: 'The prepared server now has no compatible history route. Recheck and read the unsupported explanation. Do not show zero admissions, invent a command status or fall back to an internal endpoint. Coordinate compatible backend deployment before using the inspector; the rest of the run’s independent recorded facts do not supply this missing audit.',
      expected:
        'Unsupported feedback is distinct from supported No browser execution command recorded.',
    },
    {
      id: 'malformed',
      title: 'Reject a malformed admission kind',
      body: 'The fixture sends an unknown admission kind. Recheck again. Strict decoding rejects the whole observation and withdraws the earlier workspace instead of displaying a partly trusted list or coercing the kind into a provider call. Private response detail and decoder causes are not rendered, serialized into Redux errors or presented as repair advice. Recover current run access before further inspection.',
      expected:
        'The invalid response produces safe unavailable feedback, not any admission row.',
    },
    {
      id: 'truncated',
      title: 'Read a bounded window without a fabricated total',
      body: 'The next prepared observation contains one hundred recovery admissions and an explicit truncation marker. Recheck run access, reopen history and read the warning before scrolling. More records exist, but no total or stable prefix is promised. The initial admission can be outside this window; do not create a fake INITIAL row, infer its position, or label these one hundred entries as one hundred provider executions.',
      expected:
        'Exactly one hundred checkpoint rows and the truncation warning appear, without an initial-admission claim.',
    },
    {
      id: 'context',
      title: 'Retire inspection when its Console context is rechecked',
      body: 'Close history and recheck the selected run while its Console response is held. The history trigger and all private Console facts disappear before the response arrives. No modal or historical snapshot survives this parent-gate withdrawal. Restore the protected run through the normal fresh Console path, then inspect history independently again.',
      expected:
        'Pending Console revalidation removes the history card, while the persistent run heading retains focus.',
    },
    {
      id: 'terminal',
      title: 'Inspect terminal history outside active discovery',
      body: 'The fixture now returns terminal accepted state and removes the run from active discovery. Recheck assigned runs while retaining the selected identity. A fresh exact-run read still permits terminal detail, and history opens through its own authorization check. Terminal state is not inferred from these admissions and does not grant any new recovery or lease action.',
      expected:
        'The terminal run and its freshly read history remain inspectable after active discovery is empty.',
    },
    {
      id: 'close',
      title: 'Close without an execution side effect',
      body: 'Dismiss the history and return to the run. Focus returns to Inspect recorded admissions. Closing retires only this subscriber, not another reader’s shared transport, and sends no release, recovery, acknowledgement or execution command. If diagnosis requires action, review that separate command and its current authority; a history row is never an actionable grant.',
      expected:
        'The modal is gone, its trigger is focused, and the synthetic business-command counter is still zero.',
    },
  ],
  troubleshooting: [
    {
      symptom: 'Recovery appears before INITIAL or times seem inconsistent.',
      guidance:
        'This is not an execution sequence. Recording time plus a hidden tie-breaker determines presentation; clock corrections and ties are valid. Compare recorded facts without reordering, subtracting timestamps, or attaching the terminal receipt to individual admissions. Ask for provider-specific evidence through an authorized operational path instead.',
    },
    {
      symptom: 'A recheck is pending, denied, invalid or unsupported.',
      guidance:
        'Pending history rechecks hide earlier rows. Failed access, malformed or unavailable observations withdraw the earlier workspace and its modal; choose Recheck run access to reacquire authority before opening history again. Use only the application-composed sign-in link when required. An unsupported route stays a compatibility message, never an empty audit or authority fallback. Parent rechecks and mutations also retire inspection.',
    },
    {
      symptom:
        'The window is truncated or a current supervisor sees earlier epochs.',
      guidance:
        'Earlier sanitized epochs are intentional current-supervisor disclosure, not transferred command rights. Truncation hides both the total and any guarantee of a stable prefix. Do not infer the originating actor, provider-call count or a new recovery right; original-actor and runtime policies still apply.',
    },
  ],
  limitations: [
    'No live backend, OIDC login, authorization provisioning, transaction race, real recovery, provider call or outcome proof is verified by these fixtures. Commands remain zero throughout the chapter; backend tests own durability and security.',
    'There is no causal execution tree, per-attempt outcome, trace span, latency calculation, cost, actor/session identity, full audit export, arbitrary run lookup, continuous revocation or automatic polling. Generated recordings and rendered guide files remain ignored artifacts.',
  ],
};
