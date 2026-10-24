# ADR 0047: Confirm independent follow-up priority

- Status: Accepted
- Date: 2026-10-24
- Milestone: M05 - Adaptive Resolution Experience

## TL;DR

Display current priority as independent metadata. Confirm an exact revisioned
assignment; recover only under fresh original active ownership. Acknowledgement
is history, never current metadata or authority.

## Context

Merged Ergon PRs #194, #196 and #198 supply immutable assignments, the session-CSRF
command and current shared/owned/case-summary projections. Unlike completion
history, priority replay does not survive ownership replacement or retirement.
The queue's stable oldest-first keysets and runtime policy are unchanged.

## Decision

- Model owns closed LOW/NORMAL/HIGH/URGENT values, current observations and inert
  receipts. Data access requires both read fields: no missing-field NORMAL/0
  fallback. Zero pairs only with NORMAL; explicit NORMAL can have positive revision.
- Reject unsafe JavaScript integer fences instead of rounding PostgreSQL BIGINT.
  A new browser command also requires a safely representable successor revision.
  Validate the entire echoed original intent and exact successor before caching.
- Reuse session-lifetime CSRF and bounded Effect execution. No automatic mutation
  retry or optimistic metadata patch. Every outcome invalidates shared/owned work
  and exact case context; notes are unchanged.
- RHF owns selection and acknowledgement. The existing concrete administration
  controller owns committed withdrawal, immutable intent and historical feedback.
  App/ui-web retain shell, modal and focus ownership; no package or dependency is added.
- Before exact replay, data access waits for older same-key owned reads, then
  acquires a distinct observation. Require the original active claim/revision;
  failed checks retire replay. Priority may have advanced: the server may still
  return the original historical receipt without another assignment.
- Private context stays withheld throughout pending, checking, uncertain and
  historical phases. Fresh owned recovery precedes independently authorized case
  re-entry. Close, tenant replacement and unmount retire callbacks and local
  intent; a retired check cannot dispatch a late POST. Nothing persists in URLs
  or browser storage. Leaving cannot undo a sent write.

## Consequences

Current priority is visible on shared/owned cards and separately acquired case
context. Observations can differ across reads; the whole Console is not one
transactional snapshot. Priority is not risk, SLA, sorting, ownership, runtime
authority or outcome proof. Every new confirmed assignment advances its own
revision, including the same value.

Deploy compatible backend readers/schema before this client, then enable
ERGON_HUMAN_FOLLOW_UP_PRIORITY_ENABLED under operator policy. Reads work while
writes/replay are disabled. UI rollback removes controls, not durable history.
Protocol/cache/component, simulated-guide and pinned-Linux visual checks cover
browser behavior, not live identity, PostgreSQL atomicity or production rollout.

## Alternatives considered

- Treat missing fields as NORMAL/0: rejected; it can conceal real assignments.
- Use ownership revision as priority revision or reorder keysets: rejected; the
  meanings and compatibility boundaries differ.
- Replay after handover/completion or patch current state from a receipt:
  rejected; historical acknowledgement supplies neither current facts nor access.
- Add an application core or generic command framework: rejected; current
  capability owners already execute this bounded behavior.
