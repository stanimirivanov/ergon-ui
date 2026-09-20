# UI engineering standards

## TL;DR

- Keep project dependencies explicit and platform boundaries honest.
- Assign each kind of state one owner.
- Decode untrusted inputs, fail closed, and keep sensitive data out of storage
  and telemetry.
- Build semantic, keyboard-operable, responsive UI and test observable behavior.
- Comments explain purpose and constraints, never syntax.

## Architecture

Applications compose routes, feature behavior, and platform adapters. Feature
code owns user-visible workflows. Data access owns protocol calls and cache
policy. Contract packages own wire schemas and tagged failures. UI packages own
presentation without fetching data or knowing application routes.

Use Nx tags `type:*`, `scope:*`, and `platform:*`. Shared-platform code cannot
import web or native code. Web UI cannot import applications or data access.
Create no package until current behavior needs a stable boundary.

## TypeScript

Keep strict checking, exact optional properties, unchecked indexed access, and
exhaustive branching. Prefer readonly data, discriminated unions, named option
objects, injected clocks and browser adapters, and `unknown` for untrusted data.
Avoid `any`, non-null assertions, unsafe casts, numeric enums, mutable exports,
barrel files that hide cycles, and boolean combinations that permit impossible
states.

Exported APIs receive TSDoc when callers need non-obvious purpose, invariants,
constraints, side effects, or error meaning. Examples must clarify usage and
prefer compiled code or executable tests. Skip comments that repeat the symbol
name or type. Implementation comments explain protocol, compatibility,
security, accessibility, concurrency, or performance reasons.

## React and routing

Components should be pure. Derive values during render; use memoization only
for measured cost or stable identity contracts. Event-driven effects belong in
handlers. `useEffect` synchronizes an external system and must define cleanup
when it acquires a subscription, timer, listener, or request.

Use React Router Data Mode for hierarchy, URL state, navigation, and route
errors. Use real links for navigation and buttons for actions. Route loaders
may establish navigation prerequisites but do not duplicate RTK Query data.

## Data and Effect

RTK Query owns server cache, request status, deduplication, polling, tags, and
invalidation. Redux slices contain only durable cross-route client state; they
do not mirror API resources. Forms stay in React Hook Form and transient UI
state stays local.

Effect owns asynchronous boundary programs: HTTP, response decoding, timeout,
bounded retry, cancellation, and tagged error translation. Connect RTK Query's
abort signal to Effect interruption. Do not retry permanent errors or mutations
without a server-backed idempotency guarantee. Never add an Effect cache beside
RTK Query.

## Accessibility and interaction

Meet WCAG 2.2 AA for shipped behavior. Start with semantic HTML and landmarks;
preserve heading order, label relationships, keyboard reachability, visible
focus, status announcements, 200% zoom, and narrow viewport reflow. Test through
roles and accessible names. Avoid positive tab indexes and clickable generic
containers.

Use Motion only where transition continuity communicates state. Honor
`prefers-reduced-motion`, avoid blocking input during animation, and never make
motion or color the sole information carrier.

## Security and privacy

Everything in a browser bundle is public. Runtime configuration contains URLs,
issuer metadata, client identifiers, and flags—never credentials. Keep tokens,
authority evidence, personal data, and case contents out of local storage,
Redux persistence, URLs, console output, error reporting, and analytics.

Decode HTTP, storage, URL, file, model, evidence, and postMessage input before
use. Do not render raw HTML. The server authorizes every tenant-scoped read and
mutation; UI hiding is not authorization.

## Styling and design-system ownership

Tailwind utilities express layout and local styling. Semantic CSS variables
own product meaning such as canvas, surface, ink, accent, risk, and state.
`@ergon/ui-web` owns reviewed shadcn primitives and DOM behavior. Feature
packages own compositions and domain wording. Do not fork a primitive for a
one-off color or spacing change when a variant expresses a stable meaning.

## Testing and verification

Use Vitest for pure behavior and Testing Library for components. Assert what a
user can perceive or operate, not implementation state. Use Playwright for a
small number of critical browser flows and protocol fakes once data access is
introduced. Keep tests deterministic and independent of external services,
locale, order, and wall time.

`pnpm verify` is the required baseline. Dependency changes also require a clean
`pnpm install --frozen-lockfile`. Report every skipped or unavailable check as
not run.
