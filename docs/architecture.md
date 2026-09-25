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

## Dependency direction

```text
applications
  -> feature behavior
      -> data access
          -> API contracts
  -> web UI

platform:shared  -X-> platform:web
platform:shared  -X-> platform:native
web UI            -X-> applications or data access
```

Nx project tags enforce the first available boundaries. New package categories
are added when a real slice creates them. `@ergon/ui-web` is intentionally a
DOM, Tailwind, and shadcn boundary; it is not a React Native design system.

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
while their local disclosure is open. The URL and persistent storage do not
retain this short-lived resolver context.

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

Owned case context is a read-only confidential-BFF projection. The browser
checks response identity, positive revisions, pinned-contract consistency,
evidence bounds, and observation order before caching it. Evidence text remains
untrusted content and is rendered only through React text nodes.

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
