/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { Service, type Signal, effect, inject, signal } from '@angular/core';

import { WrStorage } from 'ngwr/storage';

import { WR_DENSITY_CONFIG, type WrDensityValue } from './density-config';

const VALID: readonly WrDensityValue[] = ['sm', 'md', 'lg', 'touch'];

function isDensity(v: unknown): v is WrDensityValue {
  return typeof v === 'string' && (VALID as readonly string[]).includes(v);
}

/**
 * Global density scale. Writes `[data-wr-density]` on `<html>` so the
 * stylesheet's density-scoped CSS-variable rules apply, then components
 * pick up the new multipliers without re-rendering.
 *
 * - **Per-subtree override** — drop `[wrDensity]` on any element; its
 *   descendants read the override instead of the global value.
 * - **Persisted** via {@link WrStorage} (swap the engine globally if you
 *   need a different store).
 *
 * @example
 * ```ts
 * const density = inject(WrDensity);
 * density.set('sm');
 * density.current();   // 'sm'
 * ```
 *
 * @see https://ngwr.dev/reference/services/density
 */
@Service()
export class WrDensity {
  private readonly doc = inject(DOCUMENT);
  private readonly storage = inject(WrStorage);
  private readonly config = inject(WR_DENSITY_CONFIG);

  /** Active density. */
  readonly current: Signal<WrDensityValue>;

  private readonly _current = signal<WrDensityValue>(this.readPersisted() ?? this.config.defaultDensity);

  constructor() {
    this.current = this._current.asReadonly();
    effect(() => {
      const value = this._current();
      const html = this.doc.documentElement;
      if (html) html.setAttribute(this.config.attribute, value);
      this.persist(value);
    });
  }

  /** Switch the active density. Ignores unknown values. */
  set(density: WrDensityValue): void {
    if (!isDensity(density)) return;
    this._current.set(density);
  }

  /** Cycle sm → md → lg → touch → sm … */
  cycle(): void {
    const order: readonly WrDensityValue[] = ['sm', 'md', 'lg', 'touch'];
    const i = order.indexOf(this._current());
    this._current.set(order[(i + 1) % order.length]);
  }

  // Persistence

  private readPersisted(): WrDensityValue | null {
    if (!this.config.storageKey) return null;
    const raw = this.storage.get<WrDensityValue>(this.config.storageKey);
    return isDensity(raw) ? raw : null;
  }

  private persist(density: WrDensityValue): void {
    if (!this.config.storageKey) return;
    this.storage.set(this.config.storageKey, density);
  }
}
