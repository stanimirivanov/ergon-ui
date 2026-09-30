# Ergon UI architecture

## TL;DR

Use one Nx and pnpm repository for independently deployable user experiences.
Begin with the internal workbench. Add the external requester application only
with its first usable slice. Share contracts deliberately while keeping web UI,
native UI, application state, and authentication adapters platform-specific.

## Application topology

| Deployable        | Audience and responsibility                                        | Status                            |
| :---------------- | :----------------------------------------------------------------- | :-------------------------------- |
| `ergon-workbench` | Authenticated resolver console; later studio and simulation routes | Shared and owned follow-up views  |
| `ergon-requester` | External adaptive resolution canvas                                | Deferred to first requester slice |
| widget SDK        | Embeddable headless client and web components                      | Deferred                          |
| native clients    | Selected requester or resolver workflows                           | Deferred until required           |

The workbench and requester experience use distinct deployment artifacts,
identity clients, CSPs, URLs, performance budgets, and release decisions. Studio
and simulation begin as workbench route areas because they share the internal
trust boundary; split them only for demonstrated isolation or ownership needs.

## Project roles and dependency direction

Projects are grouped by business capability and concrete frontend
responsibility. A capability gains a hexagonal application core only when the
client owns executable, platform-neutral workflow policy. Cache-centric slices
may deliberately connect a feature directly to data access.

| Source type | May depend on                                |
| :---------- | :------------------------------------------- |
| Model       | Model                                        |
| Application | Application, model                           |
| Data access | Data access, application, model              |
| Feature     | Data access, application, model, UI          |
| UI          | UI                                           |
| App         | Feature, data access, application, model, UI |
| Test        | Any type required by the tested behavior     |

Scope and platform constraints apply independently. Shared-platform code cannot
import web or native projects. `@ergon/ui-web` is a domain-agnostic DOM,
Tailwind, and shadcn boundary; it is not a React Native design system.

Each project has exactly one `type:*`, `scope:*`, and `platform:*` tag. The
architecture check validates both metadata and declared workspace dependencies;
ESLint validates source imports. The intended capability-first shape is:

```text
@ergon/workbench (app)
  -> follow-up/feature-web
      -> follow-up/data-access-web
      -> follow-up/model
      -> ui-web
  -> session/feature-web
      -> session/data-access-web
      -> session/model
      -> ui-web
```

An optional application project sits between feature and data access only for
a genuine client-owned use case:

```text
feature -> application use case -> consumed port <- data-access implementation
```

The repository is migrating to that shape without changing runtime behavior.
The follow-up model now lives at `packages/follow-up/model`; its existing
`@ergon/domain-follow-up` import name remains stable. Other current paths and
import names remain temporarily unchanged:

| Current project or source                                 | Declared type / migration status  | Target                               |
| :-------------------------------------------------------- | :-------------------------------- | :----------------------------------- |
| `@ergon/infrastructure-follow-up-web`                     | `type:data-access`                | `packages/follow-up/data-access-web` |
| `@ergon/infrastructure-follow-up-react`                   | `type:feature`                    | `packages/follow-up/feature-web`     |
| `@ergon/domain-session`                                   | `type:model`                      | `packages/session/model`             |
| `@ergon/infrastructure-session-web`                       | `type:data-access`                | `packages/session/data-access-web`   |
| `apps/ergon-workbench/src/session/current-actor-page.tsx` | `type:app` (session-feature debt) | `packages/session/feature-web`       |

The finite legacy-location ledger in the architecture checker rejects new
projects under the old global-layer directories and becomes stale when a listed
project moves. This forces each migration change to remove its exception.

The workbench remains the app composition root. It registers the RTK Query
reducers and middleware, supplies runtime dependencies, owns route hierarchy
and session gating, and provides trusted same-origin navigation inputs. The
follow-up feature owns capability React behavior. Follow-up and session data
access own BFF protocols, Effect execution, typed failure translation, timeout,
retry, cancellation, cache identity, and generated hooks.

Follow-up and session request, cancellation, result, and failure contracts
belong to their web data-access projects. Neither capability currently has a
client-owned application use case. Model and genuine application library builds
extend the checked, DOM-free `tsconfig.core.json`.

## State ownership

| State                                                            | Owner               |
| :--------------------------------------------------------------- | :------------------ |
| Remote resources, request lifecycle, deduplication, invalidation | RTK Query           |
| Cross-route client-only state                                    | Redux Toolkit slice |
| Shareable filter, selection, and navigation state                | React Router URL    |
| Form values, field errors, touched state                         | React Hook Form     |
| Component-local interaction                                      | React state         |
| HTTP execution, decoding, timeout, typed failure mapping         | Effect              |

RTK Query and Effect were introduced by current-actor resolution. Effect
executes inside RTK Query's endpoint `queryFn`; it does not create another
remote cache. RTK Query cancellation interrupts the Effect program. Automatic
retries apply only to classified transient reads or mutations whose idempotency
contract permits replay.

The resolver queue filter is shareable URL state. Keyset page traversal remains
component-local while each requested page is cached by RTK Query; the UI keeps
the cursor timestamp and work-item ID together as one immutable value. Claim
success and stale-item conflicts invalidate every cached inbox page for that
tenant rather than attempting to repair filtered keyset pages optimistically.
Owned-work pages use a separate tenant-and-cursor cache. Successful claims also
invalidate that cache so active ownership is recovered from server truth; stale
shared-inbox conflicts do not imply a change to the current resolver's claims.
Owned case summaries use a tenant-and-work-item cache key and are mounted only
while their local disclosure is open. Failed-execution and retry-handoff facts
remain part of that same response and cache entry. The URL and persistent
storage do not retain this short-lived resolver context.

## Routing and rendering

The browser applications are Vite-built React SPAs using React Router Data
Mode. Route definitions own hierarchy, lazy boundaries, parameters, and error
pages. RTK Query, once introduced, owns API data; route loaders must not create
a second cache for the same resource.

The static artifact reads only public runtime configuration. Secrets never
enter JavaScript bundles. The workbench consumes the confidential BFF through
same-origin `/bff`, `/oauth2`, and `/login/oauth2` paths; local Vite development
proxies those paths to the control plane. Provider tokens remain server-side.
Session-bound CSRF values exist only in the in-memory HTTP client and never in
Redux, a URL, or persistent browser storage.

## API and trust boundary

OpenAPI and RFC 9457 problem responses are wire contracts. Static TypeScript
types do not validate remote data; each consumed payload must be decoded before
entering application state. Tagged UI errors distinguish authentication,
authorization, absence, conflict, invalid input, timeout, network failure,
invalid response, and unexpected defects.

Owned case context is a read-only confidential-BFF projection. Data access
checks response identity against the request and decodes the wire shape. The
follow-up model refines positive revisions, pinned-contract consistency,
evidence bounds, observation order, and the failed-execution-to-escalation
sequence before the browser caches it. Evidence text remains untrusted content
and is rendered only through React text nodes.

A tenant selected in the URL is navigation context only. The backend remains
authoritative for subject mapping, authority evidence, tenant isolation, and
non-disclosure. The production UI does not consume `/internal/v1` routes; a
slice must first establish a reviewed browser-facing endpoint.

## Presentation

Tailwind owns utility generation and semantic theme tokens. shadcn source is
checked-in and reviewed in `@ergon/ui-web`. Feature components remain near
their behavior. Motion is reserved for transitions that clarify state change
and must honor reduced-motion preferences; CSS handles simple visual feedback.

All slices preserve semantic landmarks, keyboard operation, visible focus,
accessible names, heading order, contrast, zoom, and responsive reflow. Color,
position, and animation are never the only state signal.
