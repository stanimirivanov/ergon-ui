# Ergon Requester

## TL;DR

Sign out opens a cancelable review. Confirmation closes the complete private
workspace before local retirement I/O; failures keep it closed with explicit
retry. Backend PR #228 is required. The document-local gate survives browser Back,
but no cross-tab or provider/global logout is claimed. See
[ADR 0056](../../docs/decisions/0056-retire-requester-private-state-on-local-sign-out.md).

`/tenants/{tenantId}/notifications` adds historical information-request deliveries, not a complete case list. Each open enters an independently verified supplied-case route; recheck replaces session/feed scope. Deploy backend PR #226 first. See [ADR 0055](../../docs/decisions/0055-check-historical-notification-targets-independently.md).

Independently deploy the external requester app, never the resolver workbench
artifact. Start intake at `/tenants/{tenantId}/new`, or open a supplied
`/tenants/{tenantId}/cases/{caseId}` link. Session
verification precedes a fresh owner-scoped read. The bounded canvas presents
the existing progress and narrow question/answer history projections; it does not
invent execution stages. Both fresh reads must succeed before private disclosure.
Supported unanswered OPEN snapshots offer reviewed final answers with exact,
memory-only recovery; receipts never substitute for independently fresh reads.

## Ownership and public routes

This app owns routes, shell, Redux store composition and dependency binding.
`@ergon/session-feature-web` gates content; requester-progress feature owns
presentation/recheck intent, RHF input and mounted command lifetime; requester-progress
data access owns Effect/HTTP, typed failures, fresh resources and answer protocols.
No application/model package is needed for this server-authoritative interaction.

Requester-intake feature/data access independently own creation before a current
case resource exists. RHF owns draft/review; mounted intent owns exact recovery;
Effect/RTK own the bounded CSRF/POST. An acknowledgement supplies only a link to
independently checked progress, not a cached goal/status or automatic run.

The root and invalid addresses explain supplied links without making requests.
The tenant route verifies the session and offers explicit intake or reopening a
supplied case link. The backend login allowlist returns only to that tenant path, not a
case path. No case ID is saved to restore navigation. A route change creates a
new store lifetime; teardown retires subscriptions, draft validation and owned
mutation handles. Only bounded historical notification pointers are discoverable;
no complete case catalog or resolver controls are provided here. Local sign-out
is available in requester chrome; accepted work may still finish after retirement.

## Development and deployment

From the repository root:

```powershell
pnpm nx dev @ergon/requester
pnpm nx build @ergon/requester
pnpm nx test @ergon/requester
pnpm verify
pnpm guide:generate
```

Dev uses localhost:4201; preview uses localhost:4301. Vite proxies `/bff`,
`/oauth2` and `/login/oauth2` to localhost:8091, overridable with server-only
`ERGON_REQUESTER_CONTROL_PLANE_URL`. The production artifact is
`apps/ergon-requester/dist`; do not route it to a workbench-audience backend.
Configure SPA fallback for supplied links and same-origin BFF/callback paths.
Give the requester origin its own restrictive CSP and no-referrer response policy;
the HTML also requests no-referrer. Do not cache BFF responses or private HTML
server-side. This static app does not configure your reverse proxy or IdP.

Requires backend PR #202, its ownership migration, PR #220's intake and PR #216's answer/history
contracts, and a separate
requester-audience backend/client/origin/cookie as documented by Ergon.
Trusted operators bootstrap only reviewed legacy requester bindings; new intake
binds its verified creator. Approval attestations do not grant ownership.
Roll back intake controls without deleting cases, or disable the
requester origin, retaining durable ownership data. Never fall back to resolver
hosting or put provider credentials into Vite variables.

## Verification and limits

Existing Chromium and guide gates start both independent previews. The requester
chapter uses synthetic marked BFF fixtures; it proves browser behavior, not live
IdP/two-origin deployment, actual PostgreSQL authorization or proof acceptance.
M05-PR18 adds the bounded canvas; PR22b adds question/answer history. PR22c adds
RHF final-answer submission to supported unanswered OPEN snapshots, requester
session CSRF, exact mounted uncertain recovery and independent reads after
acknowledgement. There are no automatic writes/retries or persistent recovery.
M05-PR24 adds explicit reviewed intake and memory-only uncertain recovery. The
same original UUID/raw input is replayed, never automatically or as a replacement.
Only initial known input rejection permits correction. Additional notification channels and safe
logout remain deferred. See [ADR 0054](../../docs/decisions/0054-create-requester-cases-with-exact-recovery.md).

## Canvas presentation

The light requester concept becomes a prominent goal, recorded status, four
explanatory cards and a right-hand request-details rail. Below desktop width
the rail follows the cards; at narrow/zoom-equivalent width everything stacks.
The app owns outer placement and tokens; feature components own the canvas.
All case details and history disappear together during pending/failed fresh checks.
No concept-art stage timeline, upload, confirmation, owner, source or activity
control is inferred from the progress response. History adds its own protected
read; other unsupported sections explain their limits without disabled pretend
actions or further requests.
