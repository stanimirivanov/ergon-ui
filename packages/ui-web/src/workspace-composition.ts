import type { ReactElement, ReactNode } from 'react';

/**
 * A capability's current presentation, synchronously derived by its workflow.
 * The app renders chrome and allocates space; the capability supplies controls
 * and content. This is not stored state or evidence of access authority.
 */
export interface WorkspaceView {
  readonly mode: 'standard' | 'focused';
  readonly statusLabel: string;
  readonly toolbar?: ReactNode;
  readonly content: ReactElement;
}

/**
 * App-owned shell composition. Keep the shell and content positions stable when
 * mode changes so mounted capability interaction state survives a focused detour.
 */
export type WorkspaceRenderer = (view: WorkspaceView) => ReactElement;
