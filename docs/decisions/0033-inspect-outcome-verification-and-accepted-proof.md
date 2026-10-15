# ADR 0033: Inspect outcome verification and accepted proof

- Status: Proposed
- Date: 2026-10-15
- Milestone: M04 - Guarded Execution and Verification

## TL;DR

Render one real outcome condition from the protected Console resource. Keep
mutable matching distinct from durable acceptance; disclose only the exact
selected post-action citation and retire inspection with private access.

## Context

The user approved current supervisors with current tenant-wide RESOLVER authority
reading the pinned condition and narrowly selected post-action evidence. Ergon's
additive outcomeVerification contract distinguishes current assessment from
immutable acceptance and paired verified case closure. Pinned evidence remains a
separate historical prefix, not post-action proof.

## Decision

- Decode the optional projection inside the existing Console resource. Omission
  is unsupported; null/inconsistency rejects the complete read. Status-specific
  types distinguish NOT_ASSESSED, missing evidence, mismatch, MATCHING and ACCEPTED.
- Validate supported property/value, bounded text, exact subject/source binding,
  source-before-binding order, both positions after the pin and inside the assessed
  version, post-action observation time, state/receipt/transition alignment and
  acceptance/closure coordinates. Preserve UTC fractional precision and strip
  private extras. Do not compare case JSON nanoseconds with relational acceptance
  precision to invent a false ordering failure.
  Preserve the contract's opaque expected string exactly; only observed account
  values are the closed ACTIVE/LOCKED enum. A non-matching expected string is
  legitimate pending verification, not an invalid Console response.
- Data access owns protocol/Effect/RTK behavior. Feature owns the single-condition
  section and exact keyed proof inspector in the existing outcome pane. RTK owns
  all proof records; the inspector owns only modal visibility. Run/status/assessed
  version/fact replacement permanently retires inspection. ui-web owns modality,
  focus and viewport behavior; app shell ownership is unchanged.
- The existing gate withdraws proof during revalidation, denial, commands, tenant
  change or navigation. No private URL, persistent state, second cache, package,
  application core, dependency or new dependency edge is introduced.
- Render untrusted sources/references literally. Display actual condition, value,
  assessed version, distinct source/binding times and acceptance/recording/closure
  coordinates. Do not invent check counts, confidence or contradictions. A match
  is not a command, acceptance or case closure.
- Add a substantial assertion-first synthetic guide covering all supported states,
  later mismatch, exact inspection, terminal discovery, recovery, malformed proof,
  keyboard containment, literal content and narrow reflow.

## Consequences

The Console explains real verification without becoming a multi-check engine or
command surface. The existing e2e → data-access dependency types synthetic fixtures.
Deploy backend first; older servers retain an explicit unsupported state. UI
rollback removes inspection without mutating stored proof. Authorization and
assessment remain snapshots, not continuous revocation or polling.

The guide proves browser behavior, not live OIDC/backend/database integration.
Broader evidence models, browser acceptance commands, multi-step execution,
leases and steering remain separate capabilities.

## Alternatives considered

- Derive completion from execution or terminal labels: neither carries selected
  proof or distinguishes mutable matching from durable acceptance.
- Reuse pinned facts or all later observations: the former cannot prove a
  post-action outcome; the latter exceeds approved disclosure.
- Copy proof into React/Redux or fetch separately: duplicates resource ownership
  and risks stale inspection after gate withdrawal.
- Add an application core/checklist framework: no independent client policy or
  multiple proof checks exists to justify it.
