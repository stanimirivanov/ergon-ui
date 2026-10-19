# ADR 0040: Inspect recorded execution admissions

- Status: Accepted
- Date: 2026-10-19
- Milestone: M04 - Guarded Execution and Verification

## TL;DR

Inspect sanitized admission checkpoints on demand under the existing Console.
Fresh history access grants no command authority and is not a provider trace.

## Context

Ergon PR #174 and backend ADR 0058 expose current-supervisor admission history
across earlier epochs and terminal runs. The maintainer approved that disclosure
policy and merged the backend before requesting its dependent UI. The existing
receipt cannot explain which browser admission checkpoints were recorded.

## Decision

- Existing run-supervision data access owns strict protocol decoding, Effect
  execution and private RTK reads. The existing feature owns opening intent,
  inspection and copy; app and ui-web retain shell and native modality.
  No package, dependency edge, client cache or application layer is added.
- Inspect explicitly without a lease or CSRF. Each opening/recheck waits for a
  distinct protected read; close retires only this subscriber. Pending/failed
  history reads hide earlier history. The parent Console gate unmounts the
  inspector during its own pending/failed revalidation and before mutations.
  Failed access or malformed/unavailable observations latch the workspace
  disclosure barrier before paint and retire the modal, discovery and earlier
  private Console facts. Only explicit recovery or selection reopens fresh gates.
  The feature retains failure feedback, never a history snapshot. An unsupported
  endpoint remains a compatibility state in the modal, not an authority fallback.
- Exact tenant/run/expected epoch identifies the read. Validate bounded entries,
  safe revisions, UTC precision, command/empty parity and recording order before
  caching; strip every unused private field. Expected epoch is local and never
  a server-selected parameter. No polling or continuous revocation is promised.
- Preserve backend order, including ties and admission-time backsteps. INITIAL
  need not be first or present in a capped window. Do not infer causal sequence,
  provider calls, per-admission result, timing, cost or exactly-once execution.
  Recovery can repair a projection with no provider I/O.
- Supported absence means no browser execution command, not no internal work.
  Truncated means 100 returned checkpoints and additional records, not a total
  or stable prefix. Unknown missing-route responses indicate unsupported;
  the recognized private 404 remains neutral absence of access, never empty.
- This read grants neither original-actor acknowledgement nor recovery rights.
  Earlier supervisor identities, sessions, attempts, commands, fences, grants
  and provider references remain undisclosed. Terminal receipts/proof stay
  separate from these rows.

## Consequences

Supervisors gain useful diagnostic history without a fabricated execution tree
or another command surface. Compatible backend deployment is required; no
internal endpoint fallback exists. Local/browser tests cover strict decoding,
retirement, failure, focus and narrow reflow. The nineteenth simulated guide
explains the limits; it does not certify live authorization or database audit.

## Alternatives considered

- Extend every Console response: rejected in favor of explicit bounded reads
  and independent authorization for audit disclosure.
- Reconstruct a trace from admission times and the terminal receipt: rejected;
  the backend does not supply causal ordering or per-attempt results.
- Require command control to inspect: rejected; the approved policy permits
  current-supervisor read-only access without transferring recovery authority.
