export type {
  IntakeClient,
  IntakeCommand,
  IntakeFailure,
  IntakeResult,
} from './intake-contract';
export { createIntakeBffClient } from './intake-http';
export { intakeApi, normalizeIntakeFailure } from './intake-api';
export type { IntakeDependencies } from './intake-api';
export {
  normalizeIntakeGoal,
  normalizeIntakeObservation,
} from './intake-input';
