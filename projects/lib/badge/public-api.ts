export { WrBadge } from './badge';
export type { WrBadgeSize } from './types';

// Re-export the tag family from `ngwr/badge` so consumers can consolidate
// to a single entry point. The standalone `ngwr/tag` entry is kept as a
// deprecated alias for back-compat.
export { WrTag } from '../tag/tag';
export type { WrTagIconPosition } from '../tag/types';
