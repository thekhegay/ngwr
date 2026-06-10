export { WrCounter } from './counter';
export type { WrCounterMode } from './types';

// Re-export the count-up family from `ngwr/counter` so consumers can
// consolidate to a single entry point. The standalone `ngwr/count-up`
// entry is kept as a deprecated alias for back-compat.
export { WrCountUp, type WrCountUpDirection, type WrCountUpEasing, type WrCountUpTrigger } from '../count-up/count-up';
