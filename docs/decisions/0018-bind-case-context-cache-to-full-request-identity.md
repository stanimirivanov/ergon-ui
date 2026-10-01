# ADR 0018: Bind case-context cache to full request identity

- Status: Accepted
- Date: 2026-10-01
- Milestone: M05 - Human follow-up and resolver console
- Supersedes: [ADR 0007](0007-render-owned-follow-up-case-context.md)

## TL;DR

Cache an owned follow-up's case summary by the full tenant, work-item, case,
and run request tuple. A different tuple must fetch and pass response validation
before its summary can be displayed.

## Context

ADR 0007 established lazy, server-authorized case-context disclosure inside an
owned-work card. The BFF response decoder checks the requested work-item,
case, and run identities before applying the model's cross-field refinement.
However, the RTK Query endpoint shortened its cache key to tenant plus work
item. A later request for the same work item but a different case or run
reused the earlier cached summary without invoking the decoder. This defeated
the request-identity check on cache hits and could present evidence for the
wrong requested case or run.

The browser cannot establish ownership from URL or cache values. The BFF must
recheck current authority and ownership whenever a fetch occurs. This decision
does not change those server checks or provide continuous revocation of a
summary already displayed in an active browser session.

## Decision

- Retain the lazy disclosure within active claimed work. Do not add a case
  route, preload summaries, or copy them to another client-state owner.
- Use RTK Query's full query-argument serialization for the case-summary cache
  key: tenant, work item, case, and run. Identical requests still deduplicate;
  a changed identity produces a separate fetch and validation.
- Continue to reject responses whose work-item, case, or run identity differs
  from the request, or whose contract, evidence boundary, ordering, or handoff
  facts violate the model refinement.
- Keep missing context neutral, preserve explicit authentication recovery and
  retry for applicable failures, and render untrusted observations only as
  inert text.

## Consequences

No summary validated for one request tuple can satisfy another tuple from the
cache. A changed case or run may require an additional BFF read and a separate
cache entry. The BFF route, response schema, authorization, browser navigation,
and dependency direction are unchanged. A regression test covers identical
request deduplication and isolation of every identity field.

## Alternatives considered

Keeping the shortened key and checking the tuple only in the decoder leaves
cache hits unchecked. Adding a second validation to the React view duplicates
data-access policy and risks a momentary wrong-summary render. Disabling
caching entirely gives up useful deduplication without addressing the
underlying mismatch between cache identity and validation identity.
