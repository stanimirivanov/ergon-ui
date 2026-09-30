# UI engineering standards

## TL;DR

- Keep project dependencies explicit and platform boundaries honest.
- Assign each kind of state one owner.
- Decode untrusted inputs, fail closed, and keep sensitive data out of storage
  and telemetry.
- Build semantic, keyboard-operable, responsive UI and test observable behavior.
- Comments explain purpose and constraints, never syntax.

## Architecture

Group projects by business capability, then assign the concrete `model`,
`application`, `data-access`, `feature`, `ui`, `app`, or `test` responsibility.
Models own platform-neutral values and semantic refinements. Data access owns
wire schemas, remote execution, Effect programs, security state, RTK Query,
and cache policy. Features own capability React behavior and presentation.
Apps compose routes, providers, stores, configuration, and dependencies.

Application projects are optional. Create one only for executable,
platform-neutral policy, a state machine, or workflow behavior required now;
keep its outcomes and consumed ports beside that behavior. Do not create an
interface-only package or a service that merely forwards one data-access call.
A cache-centric feature may consume data access directly when no independent
client use case exists.

Use Nx tags `type:*`, `scope:*`, and `platform:*`. Model depends only on model;
application on application and model; data access on data access, application,
and model; feature on data access, application, model, and UI; UI only on UI;
and app on production types. Shared-platform code cannot import web or native
code. New packages use `packages/<scope>/<role[-platform]>`; the checked legacy
ledger is the only permission to remain under a global-layer path. A new
application core also needs a ledger entry referencing the accepted ADR for
the executable policy it owns. Model and application library builds extend the
DOM-free `tsconfig.core.json`; finite legacy exceptions identify current
portability debt. Create no package until current behavior needs a stable
boundary. Deployables and end-to-end projects live under `apps/*` and use
`type:app` and `type:test`, respectively.

Every project has exactly one tag in each dimension and documents its purpose,
owned responsibilities, deliberate exclusions, public API, allowed
dependencies, and verification commands. Cross-project consumers import only
through the package public API. Wire schemas and transport failures stay in
data access. Model values and application outcomes do not depend on HTTP, RTK
Query, React, Effect, or provider details. Presentational components receive
explicit state and callbacks rather than decoding protocols themselves.

Automation checks dependency direction, the core TypeScript configuration,
and prohibited framework families. Reviewers still evaluate whether any other
dependency or API introduces transport, browser, native, or provider coupling;
package names alone cannot prove semantic neutrality.

Before changing a boundary, record the responsibility owner before and after,
the public contract, and each new dependency edge. Evaluate architecture by
cohesion and dependency direction, not file length. Extract a shared mechanism
only after multiple current consumers demonstrate identical semantics; retry,
security, disclosure, and idempotency policy remain capability-specific.

## TypeScript

Keep strict checking, exact optional properties, unchecked indexed access, and
exhaustive branching. Prefer readonly data, discriminated unions, named option
objects, injected clocks and browser adapters, and `unknown` for untrusted data.
Avoid `any`, non-null assertions, unsafe casts, numeric enums, mutable exports,
barrel files that hide cycles, and boolean combinations that permit impossible
states.

Declare return types for supported APIs and non-trivial protocol, decoding,
persistence, and asynchronous boundary functions. For Effect programs, expose
the success, error, and required-environment channels deliberately. Inference
remains appropriate for short local callbacks and obvious pure helpers where
an annotation would add no contract information.

Supported public APIs receive TSDoc at the declaration that owns the contract
when callers need non-obvious purpose, invariants, constraints, ownership,
lifetime, side effects, concurrency, or error meaning. Package entry points
and architectural boundaries determine public API; module-local exports and
re-export barrels do not need duplicate prose.

Document units, ordering, nullable meaning, related-field invariants, trust and
authority assumptions, and failure or cancellation behavior where applicable.
Ports and asynchronous adapters also describe timeout, retry, idempotency, and
resource-lifetime policy. React APIs describe non-obvious state ownership,
cleanup, semantic HTML, and accessibility obligations.

`@param` and `@returns` add constraints rather than repeating signatures.
`@throws` names only exceptions or rejections that escape the API; typed error
results are documented as outcomes. Examples must clarify genuinely ambiguous
usage and should live in executable tests or typechecked source. Skip comments
that repeat the symbol name or type, and improve unclear APIs before explaining
them with long prose. Implementation comments explain protocol,
compatibility, security, accessibility, concurrency, or performance reasons.
Documentation quality is reviewed semantically; no coverage quota applies.

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

Tests follow responsibility boundaries: model tests prove refinements and
invariants; application tests prove real use-case policy; data-access tests
prove protocol, security, persistence, and cache behavior; and feature tests
prove user-visible states and transitions. A test should not acquire unrelated
dependencies merely because one production project exposes them together.

`pnpm verify` is the required baseline and includes `pnpm repository:check`
and `pnpm architecture:check`.
Dependency changes also require a clean `pnpm install --frozen-lockfile`.
Report every skipped or unavailable check as not run.

Run `pnpm repository:check` and `pnpm architecture:check` for early structural
feedback. The [coding harness](harness.md) owns the command inventory and
timing tiers. A recurring review finding should become narrower guidance, a
deterministic sensor, a focused behavioral test, or an explicit owned
exception—never a broad suppression or an unreviewed metric target.
