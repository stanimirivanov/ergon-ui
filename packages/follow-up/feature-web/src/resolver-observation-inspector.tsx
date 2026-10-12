import type { ResolverFollowUpCaseSummary } from '@ergon/follow-up-model';
import { useLayoutEffect, useRef, useState, type ReactElement } from 'react';

import { ResolverObservationComparison } from './resolver-observation-comparison';
import { ResolverObservationDetail } from './resolver-observation-detail';
import {
  ResolverObservationFilter,
  type ObservationTimingFilter,
} from './resolver-observation-filter';
import { ResolverObservationList } from './resolver-observation-list';

interface ComparisonSelection {
  readonly firstId: string;
  readonly secondId: string;
}

/**
 * Owns private timing/selection intent, never source payload snapshots. All detail
 * and comparison records are derived from the current authorized observations.
 * Removed identities are retired before rendering and cannot reopen a comparison
 * on a later response. Modal platform behavior belongs to ui-web; selection focus
 * runs only for a matching committed inspection, with no deferred task to retire.
 */
export function ResolverObservationInspector({
  observations,
  pinnedVersion,
  regionId,
}: {
  readonly observations: ResolverFollowUpCaseSummary['observations'];
  readonly pinnedVersion: number;
  readonly regionId: string;
}): ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonSelection | null>(
    null,
  );
  const [timingFilter, setTimingFilter] =
    useState<ObservationTimingFilter>('all');
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const selectedButton = useRef<HTMLButtonElement>(null);
  const compareButton = useRef<HTMLButtonElement>(null);
  const focusDetailAfterSelection = useRef(false);
  const detailId = `${regionId}-observation-detail`;
  const listId = `${regionId}-observation-list`;
  const snapshotCount = observations.filter(
    (observation) => observation.streamVersion <= pinnedVersion,
  ).length;
  const visible = observations.filter((observation) => {
    if (timingFilter === 'all') return true;
    const isInSnapshot = observation.streamVersion <= pinnedVersion;
    return timingFilter === 'in-snapshot' ? isInSnapshot : !isInSnapshot;
  });
  const explicitSelection = visible.find(
    (observation) => observation.observationId === selectedId,
  );
  const selected = explicitSelection ?? visible[0];
  const alternatives = visible.filter(
    (observation) => observation.observationId !== selected?.observationId,
  );
  const compared =
    comparison?.firstId === selected?.observationId
      ? alternatives.find(
          (observation) => observation.observationId === comparison?.secondId,
        )
      : undefined;

  // Guarded identity retirement prevents resurrection without an effect that
  // briefly renders an invalid pair or stores another authorized resource copy.
  if (selectedId !== null && explicitSelection === undefined)
    setSelectedId(null);
  if (comparison !== null && compared === undefined) setComparison(null);

  useLayoutEffect(() => {
    if (
      focusDetailAfterSelection.current &&
      selectedId === selected?.observationId
    )
      detailHeading.current?.focus();
    focusDetailAfterSelection.current = false;
  }, [selectedId, selected?.observationId]);

  function inspect(observationId: string): void {
    if (
      !visible.some(
        (observation) => observation.observationId === observationId,
      )
    )
      return;
    if (selectedId === observationId) {
      detailHeading.current?.focus();
      return;
    }
    focusDetailAfterSelection.current = true;
    setComparison(null);
    setSelectedId(observationId);
  }

  function filterByTiming(value: ObservationTimingFilter): void {
    setTimingFilter(value);
    setSelectedId(null);
    setComparison(null);
    focusDetailAfterSelection.current = false;
  }

  function compareSources(): void {
    const second = alternatives[0];
    if (selected !== undefined && second !== undefined)
      setComparison({
        firstId: selected.observationId,
        secondId: second.observationId,
      });
  }

  if (observations.length === 0)
    return (
      <p className="rounded-md border border-border bg-canvas p-4 text-sm text-ink-muted">
        No observations are recorded for this case.
      </p>
    );

  return (
    <div className="grid min-w-0 gap-4">
      <ResolverObservationFilter
        value={timingFilter}
        total={observations.length}
        snapshotCount={snapshotCount}
        visibleCount={visible.length}
        listId={listId}
        onChange={filterByTiming}
      />
      <ResolverObservationList
        observations={visible}
        selectedId={selected?.observationId}
        pinnedVersion={pinnedVersion}
        id={listId}
        detailId={detailId}
        selectedButtonRef={selectedButton}
        onInspect={inspect}
      />
      {selected === undefined ? (
        <p className="rounded-md border border-border bg-canvas p-4 text-sm text-ink-muted">
          {timingFilter === 'in-snapshot'
            ? 'No observations were available at this run’s evidence snapshot.'
            : 'No observations were recorded after this run’s evidence snapshot.'}
        </p>
      ) : (
        <ResolverObservationDetail
          observation={selected}
          pinnedVersion={pinnedVersion}
          id={detailId}
          headingRef={detailHeading}
          compareButtonRef={compareButton}
          canCompare={alternatives.length > 0}
          isComparing={compared !== undefined}
          comparisonId={`${regionId}-source-comparison`}
          onBack={() => selectedButton.current?.focus()}
          onCompare={compareSources}
        />
      )}
      {selected !== undefined && compared !== undefined ? (
        <ResolverObservationComparison
          first={selected}
          second={compared}
          alternatives={alternatives}
          pinnedVersion={pinnedVersion}
          regionId={regionId}
          returnFocusRef={compareButton}
          onSecondSelected={(secondId) =>
            setComparison({ firstId: selected.observationId, secondId })
          }
          onClose={() => setComparison(null)}
        />
      ) : null}
    </div>
  );
}
