export { createEvaluationClient } from './evaluation-http';
export {
  evaluationApi,
  normalizeEvaluationFailure,
  type EvaluationDependencies,
} from './evaluation-api';
export type {
  EvaluationClient,
  EvaluationFailure,
  EvaluationResult,
} from './evaluation-contract';
export {
  createPromotionClient,
  type PromotionClient,
  type PromotionFailure,
} from './promotion-http';
export { promotionApi, normalizePromotionFailure } from './promotion-api';
export { parsePromotionEvidence } from './promotion-schema';
