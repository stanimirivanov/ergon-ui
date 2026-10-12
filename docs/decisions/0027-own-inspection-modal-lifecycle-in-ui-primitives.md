# ADR 0027: Own inspection modal lifecycle in UI primitives

- Status: Accepted
- Date: 2026-10-12
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Follow-up owns source-selection identities and comparison content. A consumed
ui-web native modal with a Radix focus loop owns platform behavior and placement.
Explicit dismissal restores a live target synchronously; teardown schedules no
return-focus work.
Removed source identities cannot resurrect a retired comparison.

## Context

The observation inspector combined timing controls, source rows, detail,
provenance and modal composition. Comparison implemented native dialog lifecycle
and viewport placement inside the feature. A timer overrode native return focus
after close, so it could steal focus from a newer interaction. A retained second
source identity could also reopen comparison when a removed record returned.
Focused regressions reproduce both defects.

The existing owner-scoped gate must keep all source content hidden during
pending or failed revalidation. Extracting components does not grant authority
or permit retaining source snapshots outside that gate.

## Decision

- The inspector owns local timing, exact selected identity and an exact
  first/second comparison pair. Resolve every record from the current authorized
  visible observations; retire unavailable identities before rendering rather
  than retaining resources or implicitly rebinding a comparison to a fallback.
- Compose dedicated filter, list, detail and comparison components. Reuse the
  same feature-owned provenance renderer in detail and comparison. Their parent
  owns outer spacing; shared Button supplies existing control semantics/styles.
- `ModalDialog` in ui-web owns native show/close, naming, initial title focus,
  Escape and visible close-button dismissal, background inertness, keyboard
  containment, viewport geometry and teardown. It remains in the feature's DOM
  ancestry so the app's semantic theme scope is inherited.
- Native modality alone allowed Tab to leave the control cycle in Chromium.
  Consume `@radix-ui/react-focus-scope` 1.1.16 for the loop, inside the native
  dialog rather than on the dialog element itself. Its mount/unmount automatic
  focus is prevented: native opening and explicit synchronous restoration remain
  owned by the primitive, and deferred library cleanup cannot retarget a new view.
  Backward Tab from the static title enters the same loop via its first control.
- Mounted lifetime represents open disclosure. The caller must unmount after
  `onDismiss`; no separate modal-open resource store or mirrored workflow state
  is introduced. Native dialog support is required; there is no unsafe nonmodal
  fallback. Backdrop clicks do not dismiss this inspection.
- Close natively before restoring the currently connected invoking control.
  Cleanup closes without calling the feature's dismissal callback or scheduling
  custom return focus. Browser-queued close events are not dismissal signals:
  StrictMode cleanup or an obsolete instance must not dismiss a replacement.
- Focus an explicit source selection only after the exact current selection is
  committed. Filtering, disappearance and unmount retire that focus intent.
  The enclosing disclosure workflow continues to own focus after access loss.

Native behavior follows the [HTML dialog model](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element).
Initial focus and keyboard expectations follow the
[WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

The MIT-licensed FocusScope release supports the existing React/React DOM 19
peers. Pin a mature release without release-age exclusions; the dependency owns
DOM focus only, with no protocol, network, storage or routing responsibilities.
Its installed lifecycle was reviewed. A frozen install and the full browser/unit
gates are required; remove it only when an alternative passes those same loops.

No new package, backend contract, cache key, command, authority,
browser persistence or URL-selection change. All source strings remain React
text nodes; comparison does not establish claims or assess contradictions.

## Consequences

DOM mechanics have a consumed, documented UI boundary; capability-specific
selection and meaning remain local. Tests cover synchronous dismissal,
StrictMode, obsolete close events, permanent identity retirement and withdrawal
of an open comparison through actual cache revalidation.

jsdom lifecycle doubles cannot establish inertness or keyboard trapping. Real
Chromium scenarios must prove title focus, forward/backward keyboard containment,
pointer/Escape dismissal, long inert source content, narrow reflow and axe checks.
Synthetic BFF fixtures do not verify live backend authority. Non-Chromium
compatibility remains separately unverified.

Regenerate all seven guide chapters after the extraction. Roll back the slice
as a unit if disclosure or keyboard behavior regresses; no migration is needed.
No generic overlay catalog, form framework or native abstraction is introduced.

## Alternatives considered

- More feature-owned timers/listeners: retains platform duplication and stale
  focus work rather than establishing the required boundary.
- Retained source objects or a second cache: conflicts with current authorized
  resource ownership and disclosure constraints.
- Full Radix Dialog migration: unnecessary when native modality plus a consumed
  FocusScope solves the observed loop gap; no class-count rule dictates migration.
- Portal to body: discards inherited focused-shell tokens without a separate
  theme contract and is unnecessary for the native top layer.
