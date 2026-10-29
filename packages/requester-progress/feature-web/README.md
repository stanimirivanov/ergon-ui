# Requester progress web feature

## Purpose and ownership

Render one verified requester's narrow case projection, neutral unavailable
states and an explicit recheck. `RequesterCaseProgress` receives validated
coordinates and an app-built same-origin sign-in link. It consumes the public
requester-progress data-access API and ui-web primitives; it cannot import
session/resolver capabilities or a deployable app.

The parent owns shell/landmarks and outer placement. This feature owns the case
canvas and failure wording, local recheck intent, persistent heading focus and
plain-text content. A recheck commits an attempt before data-access acquisition,
hiding the previous goal/timestamps before I/O. It never copies a remote resource.
OPEN is not run progress; VERIFIED_RESOLVED is an observed accepted case state,
not browser proof acceptance. A dedicated section renders exact question/answer
text, separate timestamps and distinct unsupported/unanswered/empty/truncated
states. Closed cases retain read-only history; no resolver attribution appears.

## Exclusions

No intake, discovery, proof details, resolver commands, polling,
local persistence or client-owned application core. The bounded canvas uses only
the progress and narrow history projections: goal/status, history, explanatory cards
and details rail. OPEN supplies no active stage or check; uploads and
confirmation have explanation only, not controls. The whole canvas, including
case ID/timestamps in its rail, is mounted beneath the fresh-disclosure gate.

## Answer lifetime

Supported unanswered OPEN snapshots offer a dedicated RHF form. Selection is an
identity derived from current RTK history, never a copied question. Recheck retires
draft validation. Submission commits canvas withdrawal and stable heading focus
before command I/O. The controller retains exact immutable replay intent after
uncertainty, never automatically retries or changes its UUID/text, and resets RTK
mutation records. Explicit recheck may reacquire history without replacing intent.
Only an initial input rejection allows correction. A rejected retained replay
never unseals intent. Identity denial, conflict and absence offer no
replay. Acknowledgement starts independently fresh progress/history; failed reads
cannot resurrect private details. Unmount retires owned handles and callbacks,
not an already committed answer. No edit or persistence exists. See
[ADR 0053](../../../docs/decisions/0053-record-requester-answers-with-exact-recovery.md).

## Verification

```bash
pnpm nx test @ergon/requester-progress-feature-web
pnpm nx typecheck @ergon/requester-progress-feature-web
pnpm nx lint @ergon/requester-progress-feature-web
```
