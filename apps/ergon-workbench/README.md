# Ergon Workbench

## TL;DR

This application is Ergon's internal browser experience. It delivers the
accessible shell, a typed fail-closed current-actor session boundary, and the
shared and resolver-owned follow-up views. It consumes the control plane's
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
- Depend on follow-up models through `@ergon/domain-follow-up` and on
  capability-specific ports through `@ergon/application-follow-up`.
- Keep reusable DOM primitives in `@ergon/ui-web`.
- Keep API execution outside presentational components.
- Do not consume `/internal/v1` as a production browser contract.
- Do not create requester, studio, simulation, or native placeholder routes.

The composition root currently binds one confidential-BFF implementation to
four separate follow-up ports: open-work listing, owned-work listing, owned
case-context loading, and claiming. Consumers receive only the port they use.
The adapter, RTK Query integration, and React feature are migration boundaries
that will leave this application in separate behavior-preserving changes.

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
only in the in-memory HTTP client. RTK Query owns mutation state and invalidates
all cached inbox pages for the tenant after success or a stale-item conflict.
Ambiguous failures offer an explicit retry because the control plane returns an
existing same-resolver claim instead of creating duplicate ownership.

The active-work section consumes the browser-owned resource independently from
the shared queue. RTK Query caches pages by tenant and exact claim cursor;
Effect validates each work-item/claim pair before caching. A successful claim
invalidates both views so newly acquired ownership appears without optimistic
keyset-page reconstruction. Empty owned pages remain neutral because absence
and current-authority non-disclosure intentionally share one representation.

Each active-work card can lazily request its case context. The BFF rechecks
current ownership and authority before returning the open case, pinned
resolution contract, escalated run, observations, failed connector execution,
and exhausted retry decision. Effect rejects malformed identities, invalid
positive versions, contract drift, out-of-bound evidence, unordered
observations, or handoff facts that contradict the run before RTK Query caches
the response. A missing resource remains deliberately neutral because closure,
ownership change, and authority change share the same non-disclosing response.
Observation content is rendered as text and is never interpreted as HTML.

Local Vite development proxies `/bff`, `/oauth2`, and `/login/oauth2` to
`http://localhost:8090`. Override the target with the server-side
`ERGON_CONTROL_PLANE_URL` environment variable. Production deployment must
provide the same-origin paths.

A live sign-in additionally requires the control plane's `ergon-workbench` OIDC
client registration. Its secret remains server-side and must never enter Vite
configuration.
