import type { WrWindowStorageConfig } from './types';

/** Namespaced localStorage key for a persisted window / workspace. */
export function storageKey(cfg: WrWindowStorageConfig): string {
  const prefix = cfg.prefix ? `${cfg.prefix}:` : '';
  return `wr:window:${prefix}${cfg.key}`;
}
