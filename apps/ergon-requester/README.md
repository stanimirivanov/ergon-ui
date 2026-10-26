# Ergon Requester

## TL;DR

Independently deploy the external requester app, never the resolver workbench
artifact. Open a supplied `/tenants/{tenantId}/cases/{caseId}` link. Session
verification precedes a fresh owner-scoped read. The bounded canvas presents
the existing progress and narrow question/answer history projections; it does not
invent execution stages. Both fresh reads must succeed before private disclosure.

## Ownership and public routes

This app owns routes, shell, Redux store composition and dependency binding.
`@ergon/session-feature-web` gates content; requester-progress feature owns
presentation/recheck intent; requester-progress data access owns Effect/HTTP,
typed failures, fresh acquisition and the RTK resource. No application/model
package is needed for this server-authoritative read.

The root and invalid addresses explain supplied links without making requests.
The tenant route verifies the session and asks the user to reopen their supplied
case link. The backend login allowlist returns only to that tenant path, not a
case path. No case ID is saved to restore navigation. A route change creates a
new store lifetime; progress teardown retires its subscription. No case discovery,
intake, resolver controls or sign-out is provided here.

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

Requires backend PR #202, its ownership migration, and a separate
requester-audience backend/client/origin/cookie as documented by Ergon.
Until M05-PR23 trusted operators bootstrap reviewed requester bindings; approval
attestations do not grant ownership. Roll back this artifact by disabling the
requester origin, retaining durable ownership data. Never fall back to resolver
hosting or put provider credentials into Vite variables.

## Verification and limits

Existing Chromium and guide gates start both independent previews. The requester
chapter uses synthetic marked BFF fixtures; it proves browser behavior, not live
IdP/two-origin deployment, actual PostgreSQL authorization or proof acceptance.
M05-PR18 adds the bounded canvas; PR22b adds read-only question/answer history.
Later slices supply intake, answer submission/recovery, notifications and safe logout.

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
