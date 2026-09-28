import type { HumanFollowUpCacheDependencies } from '@ergon/infrastructure-follow-up-web';
import type { CurrentActorCacheDependencies } from '@ergon/infrastructure-session-web';

/**
 * Capability-level dependencies supplied once by the workbench composition
 * root and consumed through RTK Query's thunk extra argument.
 *
 * Separate operations keep consumers scoped to one behavior even when one BFF
 * client implements several transitional gateway contracts.
 */
export interface WorkbenchDependencies
  extends CurrentActorCacheDependencies, HumanFollowUpCacheDependencies {}
