# Ergon Workbench

## TL;DR

This application is Ergon's internal browser experience. It delivers the
accessible shell, a typed fail-closed current-actor session boundary, and the
shared and resolver-owned follow-up views, including a locally selected
Resolver Console with read-only case/run context and confirmed claim release.
It consumes the control plane's
confidential BFF without exposing provider tokens or internal API
representations to browser code. Resolvers can claim visible work through the
session-bound CSRF contract and recover active ownership after navigation.

## Commands

From the repository root:

```powershell
pnpm nx dev @ergon/workbench
pnpm nx test @ergon/workbench
pnpm nx build @ergon/workbench
pnpm nx e2e @ergon/workbench-e2e
```

## Boundaries

- Compose routes and application providers here.
- Render follow-up behavior through
  the `@ergon/follow-up-feature-web` feature package; do
  not recreate capability-specific orchestration or presentation in the app.
- Compose session HTTP and remote caching through
  `@ergon/session-data-access-web`; do not recreate its wire decoding,
  typed client contract, execution policy, or RTK Query API in the composition
  root.
- Render session verification and actor presentation through
  `@ergon/session-feature-web`; the app owns the route, shell, and trusted
  same-origin sign-in URL builder.
- Compose follow-up BFF and remote-cache data access from
  `@ergon/follow-up-data-access-web`; do not recreate protocol or remote
  cache handling in the composition root.
- Keep reusable DOM primitives in `@ergon/ui-web`.
- Keep feature-package source paths declared in `src/styles.css` so Tailwind
  includes presentation classes owned outside the app directory.
- Keep API execution outside presentational components.
- Do not consume `/internal/v1` as a production browser contract.
- Do not create requester, studio, simulation, or native placeholder routes.

The app binds `@ergon/follow-up-data-access-web` to the browser follow-up
contracts for open-work listing, owned-work listing, owned case-context
loading, claiming, and releasing. That data-access package owns the follow-up
RTK Query API; the workbench registers its reducer and middleware and renders the
`@ergon/follow-up-feature-web` feature that consumes its generated
hooks. The workbench supplies tenant request context and the trusted same-origin
sign-in URL after session verification.

The composition root creates the `CurrentActorClient` exported by
`@ergon/session-data-access-web` and supplies it to that package's cache
dependency contract. The data-access project owns session HTTP, wire decoding,
failure classification, timeout, retry, cancellation semantics, and the
current-actor RTK Query API. The workbench supplies the executable client and
registers the API during store composition. `@ergon/session-feature-web`
consumes its generated hook and keeps follow-up content unmounted until the
server verifies the actor. After verification, the app supplies both the full
actor details in the workspace and a compact actor badge in the selected
Console as session-owned display slots. The follow-up feature cannot use either
slot to infer ownership.

`/tenants/{tenantId}` resolves the control-plane BFF session contract. RTK Query
owns request state and caching; Effect owns HTTP, timeout, bounded transient
retry, response decoding, and typed errors. Provider subjects and credentials
never enter the response or browser cache.

After session verification, the same route requests the browser follow-up
resource. The `queue` URL parameter owns the optional shareable queue filter;
local state owns reversible keyset navigation. Each page is decoded before RTK
Query caches it. An empty page is deliberately neutral because the control
plane uses it both for no visible work and for non-disclosure when current
resolver authority is absent.

Claiming first obtains the opaque CSRF value from `/bff/v1/csrf` and retains it
only inside web data access. RTK Query owns mutation state and
invalidates all cached inbox pages for the tenant after success or a stale-item
conflict.
Ambiguous failures offer an explicit retry of the same command ID and expected
revision; the control plane returns the recorded receipt instead of creating
duplicate ownership. New claims use the current inbox revision, including
work returned to the queue after release.

Active-work cards and the selected Console offer the same confirmed release.
Before a Console release POST, the feature closes private case context. The
browser submits the exact claim and current ownership revision with the shared
ephemeral CSRF token. A successful release rechecks both work views and case
context; a disabled-release response identifies the operator-controlled
rollout state. Release returns still-open work to the shared queue, not to a
named recipient, and it does not complete the case.

The active-work section consumes the browser-owned resource independently from
the shared queue. RTK Query caches pages by tenant and exact claim cursor;
Effect validates each work-item/claim pair before caching. A successful claim
invalidates both views so newly acquired ownership appears without optimistic
keyset-page reconstruction. Empty owned pages remain neutral because absence
and current-authority non-disclosure intentionally share one representation.

Selecting an active-work card opens a full-width Resolver Console on the same
tenant route; selection stays local rather than becoming a case URL or durable
browser state. Its case context is requested lazily. The BFF rechecks current
ownership and authority before returning the open case, pinned resolution
contract, escalated run, observations, failed connector execution, ordered
attempt history, and unassessed outcome condition. Effect rejects malformed
identities, invalid positive versions, contract drift, out-of-bound evidence,
unordered observations, or inconsistent handoff and attempt facts before RTK
Query caches the response under the complete request identity. The feature
hides prior evidence during revalidation and unmounts the Console when its
exact claim is no longer in the owned-work view. A missing resource remains
deliberately neutral because closure, ownership change, and authority change
share the same non-disclosing response. Observation content is rendered as text
and is never interpreted as HTML. The Console presence bar reflects current
ownership without claiming a timed lease or countdown. The case and run
content is read-only; the separate release action changes claim ownership but
does not steer a live run, approve an action, or verify resolution.

Local Vite development proxies `/bff`, `/oauth2`, and `/login/oauth2` to
`http://localhost:8090`. Override the target with the server-side
`ERGON_CONTROL_PLANE_URL` environment variable. Production deployment must
provide the same-origin paths.

A live sign-in additionally requires the control plane's `ergon-workbench` OIDC
client registration. Its secret remains server-side and must never enter Vite
configuration.
