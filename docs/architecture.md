# Ergon UI architecture

## TL;DR

Use one Nx and pnpm repository for independently deployable user experiences.
Begin with the internal workbench. Add the external requester application only
with its first usable slice. Share contracts deliberately while keeping web UI,
native UI, application state, and authentication adapters platform-specific.

## Application topology

| Deployable        | Audience and responsibility                                        | Status                            |
| :---------------- | :----------------------------------------------------------------- | :-------------------------------- |
| `ergon-workbench` | Authenticated resolver console; later studio and simulation routes | Implemented shell                 |
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

These libraries are introduced by the first behavior that needs them. Effect
will execute inside a custom RTK Query base query or exceptional endpoint
`queryFn`; it will not create another remote cache. RTK Query cancellation must
interrupt the Effect program. Automatic retries apply only to classified
transient reads or mutations whose idempotency contract permits replay.

## Routing and rendering

The browser applications are Vite-built React SPAs using React Router Data
Mode. Route definitions own hierarchy, lazy boundaries, parameters, and error
pages. RTK Query, once introduced, owns API data; route loaders must not create
a second cache for the same resource.

The static artifact reads only public runtime configuration. Secrets never
enter JavaScript bundles. Production ingress should expose a same-origin API
path so cross-origin policy is deliberate rather than an accidental Vite
development setting.

## API and trust boundary

OpenAPI and RFC 9457 problem responses are wire contracts. Static TypeScript
types do not validate remote data; each consumed payload must be decoded before
entering application state. Tagged UI errors distinguish authentication,
authorization, absence, conflict, invalid input, timeout, network failure,
invalid response, and unexpected defects.

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
