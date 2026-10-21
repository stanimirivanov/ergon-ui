# ADR 0032: Inspect supervisor-scoped pinned evidence

- Status: Proposed
- Date: 2026-10-15
- Milestone: M06 - Evidence compiler

## TL;DR

Inspect existing account-access bindings and their exact sources inside the
run's pinned case prefix. Keep the existing protected RTK resource and modal
lifecycle; never relabel changing historical values as contradictions or proof.

## Context

The user approved current supervisors with current resolver authority inspecting
pinned bindings and their linked sources. Ergon's additive `pinnedEvidence`
contract excludes unrelated observations and later case evidence. Existing
bindings have no general claim, confidence, validity or contradiction semantics.

## Decision

- Decode optional evidence inside the exact Console resource, not a new query.
  Validate case/boundary identity, ordered unique bindings, source identities,
  source-before-binding attribution and matching subject references. Enforce
  registered property/value, text limits and a 100-binding response bound.
  Unknown extras stay outside the cache. Omission means unsupported, not empty;
  null or inconsistent evidence fails the complete Console read.
- The run-supervision feature owns a pinned-evidence section in the existing
  leading investigation column, separate from outcome proof, with a keyed
  binding card and linked-source inspector.
  A binding's component owns only modal visibility; removal retires inspection
  permanently. RTK remains the only owner of current resource data. The app
  continues to own the shell and ui-web continues to own DOM modality/focus.
- Present ordered binding history with property, subject, value, positions and
  distinct source/binding/recording times. Truncation explicitly prevents a
  complete-history or latest-value claim. An empty supported list says nothing
  about unbound observations. Only account-access bindings are supported.
- Render source text and opaque references literally; do not fetch references
  or execute embedded instructions. Explain source → binding → pinned snapshot
  attribution without drawing invented confidence, validity or contradiction edges.
- Revalidation, failed access, confirmed mutations, navigation and tenant change
  withdraw evidence and modal DOM through the existing disclosure gate. No
  private identities enter URLs, persistent storage or diagnostic causes.
- Add a substantial assertion-first synthetic guide chapter including negative
  and incomplete states, untrusted text, held/denied rechecks, keyboard and narrow
  reflow. Recording is not live backend authorization evidence.

## Consequences

This is a consumed extension of the existing supervision data-access and feature
projects, with no new production package, external dependency, application core
or cache. The e2e project's declared workspace dependency and TypeScript reference
to supervision data access keep guide fixtures typed against the public contract.
It exposes
an actual evidence relationship rather than a fabricated knowledge graph.
General claims, evidence compilation, confidence, validity windows, contradiction
assessment, editing, later evidence and outcome verification remain separate.

Deploy the additive backend before relying on evidence. Older servers preserve
run inspection with an explicit unsupported state; older UIs ignore added fields.
The backend owns authorization and pinned scope; browser checks are defense in
depth, not a replacement. Current access is a snapshot, not continuous revocation.

## Alternatives considered

- Reuse the whole-case observation inspector: includes unbound or post-pin
  material outside the approved disclosure scope.
- Copy selected facts/sources into React or Redux state: duplicates private
  resource ownership and allows stale modal content after gate withdrawal.
- Add a graph library and confidence/contradiction badges: no existing domain
  facts justify those semantics or a new dependency in this slice.
- Add another application/interface-only project: there is no independent
  platform-neutral client use case requiring it.
