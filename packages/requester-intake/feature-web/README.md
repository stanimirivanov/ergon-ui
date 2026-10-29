# Requester intake web feature

## Purpose and ownership

Render explicit new-case input and memory-only exact recovery. The app must first
verify the tenant session and supply trusted same-origin sign-in/case links.
`RequesterCaseIntake` owns the form workspace, not session, routing, shell or
current case resources. Dependencies are its own data access, ui-web, React and
the existing pinned React Hook Form version. No application core is needed.

## State and retirement

RHF owns draft, review and field/root errors. The mounted hook owns immutable
command intent and pending/failure phases, never a progress copy. Commit draft
withdrawal and persistent heading focus before CSRF/POST. StrictMode sends once;
unmount or tenant replacement retires validation, owned requests and callbacks.

Only initial recognized input rejection permits reviewed correction. Uncertainty
permits explicit original UUID/raw-text replay, never replacement. Rejected
recovery remains sealed. Authentication/conflict/denial offers no bypass. Success
retains acknowledgement identity only and links to independently fresh progress.
No persistence, background retries, upload, discovery, automatic run or proof.
See [ADR 0054](../../../docs/decisions/0054-create-requester-cases-with-exact-recovery.md).

## Verification

```bash
pnpm nx test @ergon/requester-intake-feature-web
pnpm nx typecheck @ergon/requester-intake-feature-web
pnpm nx lint @ergon/requester-intake-feature-web
```
