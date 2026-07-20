/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, inject } from '@angular/core';

/** Impact weight for {@link WrHaptics.impact}. */
type WrHapticImpact = 'light' | 'medium' | 'heavy';

/**
 * Vibration patterns (ms, or `[buzz, pause, buzz, …]`) behind the semantic
 * presets — loosely modelled on iOS's impact / notification feedback.
 */
const PATTERNS = {
  light: 10,
  medium: 20,
  heavy: 40,
  selection: 5,
  success: [15, 60, 30],
  warning: [30, 40, 30],
  error: [40, 60, 40, 60, 40],
} as const;

/**
 * SSR-safe wrapper around the Vibration API for tactile feedback on touch
 * devices. Semantic presets (`impact`, `selection`, `success`, `warning`,
 * `error`) map to sensible vibration patterns so call sites stay readable.
 *
 * Every method is a no-op — returning `false` — when there is no support:
 * on the server, in browsers without `navigator.vibrate`, and notably on
 * **iOS Safari**, which does not expose the Vibration API at all (its
 * haptics are native-only). Check {@link supported} to branch UI on it.
 *
 * Haptics are best paired with a real user gesture (tap) — some browsers
 * ignore `vibrate()` calls that aren't triggered by one. This service does
 * not gate on `prefers-reduced-motion`; read {@link WrPlatform.prefersReducedMotion}
 * at the call site if you want to suppress feedback for those users.
 *
 * @example
 * ```ts
 * private readonly haptics = inject(WrHaptics);
 *
 * onDelete(): void {
 *   this.haptics.warning();       // buzz before a destructive confirm
 * }
 *
 * onToggle(): void {
 *   this.haptics.selection();     // subtle tick on a switch / segmented change
 * }
 * ```
 *
 * @see https://ngwr.dev/reference/services/platform
 */
@Service()
export class WrHaptics {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly nav = this.isBrowser ? (inject(DOCUMENT).defaultView?.navigator ?? null) : null;

  /** Whether the Vibration API is available (browser + `navigator.vibrate`). */
  readonly supported: boolean = !!this.nav && typeof this.nav.vibrate === 'function';

  /**
   * Fire a raw vibration pattern — a single duration in ms, or an alternating
   * `[buzz, pause, buzz, …]` array. Returns whether it was dispatched; passing
   * `0` / `[]` cancels any ongoing vibration.
   */
  vibrate(pattern: number | readonly number[]): boolean {
    if (!this.supported) return false;
    try {
      // `VibratePattern` is `number | number[]`; readonly arrays are accepted
      // at runtime, so clone to satisfy the mutable-array signature.
      return this.nav!.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
    } catch {
      return false;
    }
  }

  /** A physical "tap" — `light`, `medium` (default), or `heavy`. */
  impact(strength: WrHapticImpact = 'medium'): boolean {
    return this.vibrate(PATTERNS[strength]);
  }

  /** A subtle tick for a discrete change (switch, segmented, stepper). */
  selection(): boolean {
    return this.vibrate(PATTERNS.selection);
  }

  /** A confirming pulse for a completed action. */
  success(): boolean {
    return this.vibrate(PATTERNS.success);
  }

  /** A cautioning pulse before a risky or destructive action. */
  warning(): boolean {
    return this.vibrate(PATTERNS.warning);
  }

  /** A buzzing pulse for a failure or rejected action. */
  error(): boolean {
    return this.vibrate(PATTERNS.error);
  }

  /** Cancel any in-progress vibration. */
  stop(): void {
    this.vibrate(0);
  }
}

export type { WrHapticImpact };
