# ADR 0019: Revalidate case context after disclosure closes

- Status: Accepted
- Date: 2026-10-01
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Evict an owned follow-up's case summary when its last disclosure closes.
Reopening always requests a fresh BFF ownership check and hides previously
cached evidence until that check succeeds.

## Context

ADR 0018 aligns case-summary cache identity with the full request tuple, but
the default RTK Query retention period can keep sensitive case evidence after
the disclosure unmounts. Reopening during that period previously reused the
cached summary without a new BFF request. A refetch alone is insufficient:
RTK Query can retain successful data during an in-flight request and after a
failed refresh, allowing stale evidence to remain visible.

The BFF combines missing work, lost ownership, closure, and lost authority in
one non-disclosing `404`. Browser cache state cannot substitute for that
server-side check. The workbench still has no logout or continuous revocation
flow; this decision addresses the explicit close-and-reopen boundary only.

## Decision

- Keep case-summary cache identity from ADR 0018. Set the unused-data grace
  period to zero so RTK Query removes an entry after its last subscriber leaves;
  active simultaneous readers may still share it.
- On every case-context disclosure mount, request a fresh summary even if an
  earlier cache entry has not yet been evicted.
- While that request is in flight, do not render prior evidence. If it fails,
  show the typed failure state even when RTK Query retains old successful data.
  The BFF's non-disclosing `404` remains a neutral unavailable message.
- Leave shared-inbox and owned-work page cache policies unchanged.

## Consequences

Closing the last disclosure removes its case payload from the RTK Query cache;
reopening rechecks current server authority before evidence becomes visible.
This adds a read on reopen and may briefly show a loading state. It does not
provide continuous revocation while a disclosure remains open, clear every
cache on session change, or alter the BFF contract. Focused tests cover cache
eviction, immediate reopen, pending revalidation, and a later `404` replacing
previously visible evidence.

## Alternatives considered

Using only the default retention period permits stale evidence to reappear.
Forcing a refetch while continuing to render retained data leaks it during
pending and failed checks. Disabling all follow-up caching would discard useful
inbox and owned-work behavior without addressing this narrower disclosure
boundary. Continuous polling would require a separate revocation and cost
policy, and is not needed to establish the close-and-reopen invariant.
