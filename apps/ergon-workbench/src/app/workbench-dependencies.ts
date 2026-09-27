import type { HumanFollowUpCacheDependencies } from '@ergon/infrastructure-follow-up-web';
import type { CurrentActorCacheDependencies } from '@ergon/infrastructure-session-web';

/**
 * Capability-level dependencies supplied once by the workbench composition
 * root and consumed through RTK Query's thunk extra argument.
 *
 * Separate ports keep consumers scoped to one use case even when one concrete
 * infrastructure adapter implements several of them.
 */
export interface WorkbenchDependencies
  extends CurrentActorCacheDependencies, HumanFollowUpCacheDependencies {}
