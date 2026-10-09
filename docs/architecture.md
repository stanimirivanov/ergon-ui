# Ergon UI architecture

## TL;DR

Use one Nx and pnpm repository for independently deployable user experiences.
Begin with the internal workbench. Add the external requester application only
with its first usable slice. Share contracts deliberately while keeping web UI,
native UI, application state, and authentication adapters platform-specific.

## Application topology

| Deployable        | Audience and responsibility                                        | Status                                                   |
| :---------------- | :----------------------------------------------------------------- | :------------------------------------------------------- |
| `ergon-workbench` | Authenticated resolver console; later studio and simulation routes | Follow-up handling and assigned-run snapshot supervision |
| `ergon-requester` | External adaptive resolution canvas                                | Deferred to first requester slice                        |
| widget SDK        | Embeddable headless client and web components                      | Deferred                                                 |
| native clients    | Selected requester or resolver workflows                           | Deferred until required                                  |

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
architecture check validates package names against capability paths, metadata,
and declared workspace dependencies; ESLint validates source imports. The
intended capability-first shape is:

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
  -> run-supervision/feature-web
      -> run-supervision/data-access-web
      -> ui-web
```

An optional application project sits between feature and data access only for
a genuine client-owned use case:

```text
feature -> application use case -> consumed port <- data-access implementation
```

The follow-up and session model, web data-access, and web feature projects now
live under their capability paths. Follow-up packages use
`@ergon/follow-up-model`, `@ergon/follow-up-data-access-web`, and
`@ergon/follow-up-feature-web`; session packages use
`@ergon/session-model`, `@ergon/session-data-access-web`, and
`@ergon/session-feature-web`.

The now-empty legacy-location ledger in the architecture checker rejects new
projects under the old global-layer directories. Moving each listed project
removed its exception in the same change.

The workbench remains the app composition root. It registers the RTK Query
reducers and middleware, supplies runtime dependencies, owns route hierarchy
and shell, and provides trusted same-origin navigation inputs. The session
feature validates the tenant route value and gates authenticated content until
the BFF verifies the actor. The follow-up feature owns the workspace
introduction, its work views, and local selection of an exact owned claim for
the read-only Console. Follow-up and session data access own BFF
protocols, Effect execution, typed failure translation, timeout, retry,
cancellation, cache identity, and generated hooks.

Follow-up and session request, cancellation, result, and failure contracts
belong to their web data-access projects. Neither capability currently has a
client-owned application use case. Model and genuine application library builds
extend the checked, DOM-free `tsconfig.core.json`.

Run supervision is independent of follow-up claims. Its web data-access project
owns the assigned discovery and exact run-detail BFF contracts; its web feature
owns the three-pane snapshot Console. Neither imports session or follow-up
capabilities. The app supplies a display-only actor slot and a trusted sign-in
link after session verification. No model or application project is introduced
because this slice has no separate platform-neutral client policy.

## State ownership

| State                                                            | Owner               |
| :--------------------------------------------------------------- | :------------------ |
| Remote resources, request lifecycle, deduplication, invalidation | RTK Query           |
| Cross-route client-only state                                    | Redux Toolkit slice |
| Shareable filters and navigation state                           | React Router URL    |
| Form values, field errors, touched state                         | React Hook Form     |
| Private case selection and component-local interaction           | React state         |
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
The BFF supplies ownership revisions on inbox and owned rows. Data access
validates their availability parity and decodes revision-checked claim command
receipts; the feature retains a command ID across an explicit ambiguous-result
retry. A stale revision refreshes the inbox instead of guessing current state.
Release from either an active-work card or the selected Console uses the same
feature-owned confirmation and session-bound CSRF client with an exact active
claim and revision. The owned feature closes Console case context before the
POST, and the receipt is checked before success. Success revalidates both work
views and that item's case-context cache. Release returns still-open work to
its original shared queue; it is neither direct handover nor case completion.
Availability remains a backend rollout decision.
Owned-work pages use a separate tenant-and-cursor cache. Successful claims also
invalidate that cache so active ownership is recovered from server truth; stale
shared-inbox conflicts do not imply a change to the current resolver's claims.
Owned case summaries use the complete tenant, work-item, case, and run request
tuple as their cache identity. They mount only while the exact claim remains
locally selected and the Console is open; closing it evicts private context.
Failed-execution, retry-handoff, ordered attempt, and unassessed proof facts
remain part of that response and cache entry. The feature hides case context
during revalidation, after a failed owned-work refresh, and when the selected
claim is absent or replaced. The URL and persistent storage do not retain this
short-lived resolver context.

Assigned runs have a distinct tenant/cursor discovery cache and tenant/run
detail cache. The private run selection is local, while `view=runs` is a
shareable tenant-workbench view name. Closing or switching views evicts unused
detail; reopening rechecks assignment at the BFF. Pending or failed discovery
and detail rechecks hide retained private snapshots. The active list excludes
terminal runs, but an already selected terminal detail may remain visible after
the exact BFF gate succeeds. Discovery membership does not replace that gate.

## Routing and rendering

The browser applications are Vite-built React SPAs using React Router Data
Mode. Route definitions own hierarchy, lazy boundaries, parameters, and error
pages. RTK Query, once introduced, owns API data; route loaders must not create
a second cache for the same resource.

The selected Resolver Console is a local work surface within the existing
tenant route, not a durable case route. Its three panes render recorded
observations, durable failed-attempt history, and the pinned but unassessed
outcome condition. Its presence bar reflects the currently owned claim and
offers only the existing confirmed release action. It does not infer a timed
lease, countdown, verified claims, a live trace, approval decisions, direct
handover, or completed verification from this read model.

The assigned-run Console is a separate read-only work surface in the same
tenant route. It presents the immutable run start, pinned capability policy,
and latest server-recorded state. Rechecking the selected run refreshes exact
detail; rechecking assignments refreshes discovery, then rereads selected detail
after successful discovery. There is no automatic polling or live-monitoring promise. Case evidence,
execution events, approval decisions, and proof detail are explicitly absent
from this first projection. See [ADR 0023](decisions/0023-consume-assigned-run-console-snapshots.md).

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

Owned-work pages are structurally decoded before the follow-up model checks
that each claim belongs to its paired work item. Owned case context is a
read-only confidential-BFF projection. Data access checks response identity
against the request and decodes the wire shape. The model then refines positive
revisions, pinned-contract consistency, evidence bounds, observation order,
and the failed-execution-to-escalation sequence before the browser caches it.
Evidence text remains untrusted content and is rendered only through React
text nodes.

A tenant selected in the URL is navigation context only. The backend remains
authoritative for subject mapping, authority evidence, tenant isolation, and
non-disclosure. The production UI does not consume `/internal/v1` routes; a
slice must first establish a reviewed browser-facing endpoint.

## Presentation

Tailwind owns utility generation and semantic theme tokens. shadcn source is
checked-in and reviewed in `@ergon/ui-web`. Feature components remain near
their behavior. The selected Console scopes dark semantic tokens to its work
surface without recoloring the unauthenticated or inbox views. Motion is
reserved for transitions that clarify state change and must honor
reduced-motion preferences; CSS handles simple visual feedback.

All slices preserve semantic landmarks, keyboard operation, visible focus,
accessible names, heading order, contrast, zoom, and responsive reflow. Color,
position, and animation are never the only state signal.
