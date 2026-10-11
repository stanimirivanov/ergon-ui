# ADR 0025: Own private Console disclosure workflows

- Status: Accepted
- Date: 2026-10-11
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Data-access hooks own fresh private-read acquisition and retirement. Feature
controllers own selection, committed interaction phases, and focus intent.
RTK Query remains the only resource cache; no mirrored visibility or forced
synchronous rendering is needed to hide Console evidence before I/O.

## Context

Owned-follow-up selection retained a whole row and mirrored Console visibility
through a callback. Assigned-run presentation owned request promises and
retirement. Recheck and release depended on `flushSync`, while a Console detour
unmounted inbox traversal and uncertain claim-retry intent.

The fresh-read invariants in ADRs 0019 and 0023 remain required. In installed
RTK Query 2.12, `forceRefetch` cannot override same-key pending deduplication.
Aborting an initiation also does not establish exclusive ownership of a shared
request. Its zero-grace cache eviction cancels an unused pending request only
after checking that no active subscriptions remain. Public running-query APIs
are sufficient; an internal subscription selector is unnecessary.

## Decision

- Capability-local data-access hooks observe current RTK Query state and keep
  only acquisition identities, generations, and gate phases locally. Pending
  or failed reads suppress retained successful resources.
- Acquisition follows a committed hidden gate and yields a microtask so an
  abandoned StrictMode setup acquires no request. Wait without subscribing to
  any older exact-key pending read, recheck after it settles, then initiate a
  forced read. A pre-close response cannot become a reopened disclosure gate.
- Cleanup retires the subscriber with `unsubscribe`, not `abort`. RTK's
  existing zero-grace policy owns physical last-reader cancellation. DOM hiding
  is immediate at commit; asynchronous cache retirement is not a rendering gate.
- The owned feature retains only the exact claim/work-item/case/run/revision
  selection tuple and derives the row from current owned work. A missing or
  replaced claim closes disclosure. Assigned-run selection retains its separate
  terminal-read semantics: active discovery membership is not the exact gate.
- Feature controllers commit recheck/release phases before initiating their
  I/O. They own traversal and retired focus intent, not server snapshots.
- An optional `renderWorkspace` composition slot supplies derived Console mode
  and content. It replaces `onConsoleVisibilityChange`; all known consumers
  migrate together in this pre-release repository.
- Keep the inbox mounted but suspended during a Console detour: skip its query
  subscription and render no inbox rows. Resume a read at its retained cursor
  and preserve the immutable intent for an explicit uncertain claim replay.
  Tenant or queue changes reset that lifetime; nothing persists across reloads.

No HTTP contract, cache key, command replay coordinates, dependency, package,
or application core changes. These hooks are web cache integrations, not a
platform-neutral application layer. Shell/pane and modal extraction remain
separate approved remediation tasks.

## Consequences

Each kind of state has one owner. Committed-phase regressions prove
hide-before-I/O safety without `flushSync`; pending reopen, shared-reader
survival, query changes, StrictMode, terminal reads, and exact replay remain
behavioral contracts. A later RTK upgrade must retain these tests.

A newer gate can wait for another reader's older request to finish. Existing
HTTP timeout bounds still apply; the UI does not promise continuous revocation
or secure erasure of browser memory. Executable guides use synthetic BFF facts,
not live OIDC or PostgreSQL authority verification.

## Alternatives considered

- Blind request abort: can interrupt another active reader and conflates
  subscriber retirement with exclusive transport ownership.
- Refetch/skip alone: can join a pre-close pending request rather than establish
  a distinct fresh gate.
- Private RTK subscription internals or nonce cache keys: unnecessary coupling
  or cache-identity changes when the public API and existing eviction suffice.
- Mirrored visibility and more `flushSync`: retain competing owners instead of
  expressing a committed workflow transition.
