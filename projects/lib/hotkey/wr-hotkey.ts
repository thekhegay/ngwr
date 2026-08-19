/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { DestroyRef, Service, NgZone, inject } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

import type { WrHotkeyHandle, WrHotkeyOptions, WrHotkeySpec } from './interfaces';
import { matchesHotkey, parseHotkeySpec, type WrParsedHotkey } from './parse-spec';

interface Binding {
  readonly parsed: WrParsedHotkey;
  readonly handler: (event: KeyboardEvent) => void;
  readonly options: Required<WrHotkeyOptions>;
}

const FALLBACK_OPTIONS: Required<WrHotkeyOptions> = {
  element: undefined as unknown as HTMLElement,
  preventDefault: true,
  allowInInput: false,
  priority: 0,
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

/**
 * Global keybinding registry.
 *
 * Bindings are keyed off `KeyboardEvent.key` + modifier state. Multiple
 * handlers per chord fire in priority order; a handler that calls
 * `event.preventDefault()` stops lower-priority bindings on that key.
 *
 * The listener runs outside Angular — only matched bindings re-enter
 * the zone, so an idle page doesn't trigger CD on every keystroke.
 *
 * Use `[wrHotkey]` for declarative element-scoped bindings.
 *
 * @example
 * ```ts
 * const hotkeys = inject(WrHotkey);
 * const handle = hotkeys.bind('mod+k', () => openCommandPalette());
 * // ...later
 * handle.unbind();
 * ```
 *
 * @see https://ngwr.dev/reference/services/hotkey
 */
@Service()
export class WrHotkey {
  private readonly doc = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly platform = inject(WrPlatform);
  private readonly destroyRef = inject(DestroyRef);

  private readonly isMac = (this.platform.userAgent ?? '').toLowerCase().includes('mac');

  /** Bindings grouped by listener target. */
  private readonly registries = new Map<EventTarget, Set<Binding>>();

  constructor() {
    // Every listener belongs to this injector. Provided at the root that is the
    // whole application, but a route or component that provides its own
    // `WrHotkey` used to leave its `keydown` listeners on the document after it
    // was destroyed — still dispatching into handlers whose component was gone.
    this.destroyRef.onDestroy(() => {
      for (const target of [...this.listeners.keys()]) this.detach(target);
      this.registries.clear();
    });
  }

  /** Register a binding. */
  bind(spec: WrHotkeySpec, handler: (event: KeyboardEvent) => void, options: WrHotkeyOptions = {}): WrHotkeyHandle {
    const parsed = parseHotkeySpec(spec, this.isMac);
    const resolved: Required<WrHotkeyOptions> = { ...FALLBACK_OPTIONS, ...options };
    const target: EventTarget = resolved.element ?? this.doc;
    const binding: Binding = { parsed, handler, options: resolved };

    let bucket = this.registries.get(target);
    if (!bucket) {
      bucket = new Set();
      this.registries.set(target, bucket);
      this.attach(target);
    }
    bucket.add(binding);

    return {
      unbind: () => {
        // Look the bucket up again rather than closing over it, and let
        // `Set.delete` report whether this binding was still in it. The captured
        // bucket could be a REPLACED one: unbind the last binding, register a
        // new one for the same target, then call the old handle a second time —
        // which is ordinary, a directive releasing on destroy and on an input
        // change — and the stale empty set read as "nothing left here", taking
        // the live binding's listener down with it.
        const current = this.registries.get(target);
        if (!current?.delete(binding)) return;
        if (current.size === 0) {
          this.registries.delete(target);
          this.detach(target);
        }
      },
    };
  }

  // Internals

  private readonly listeners = new Map<EventTarget, EventListener>();

  private attach(target: EventTarget): void {
    const listener: EventListener = event => this.dispatch(target, event as KeyboardEvent);
    this.zone.runOutsideAngular(() => target.addEventListener('keydown', listener));
    this.listeners.set(target, listener);
  }

  private detach(target: EventTarget): void {
    const listener = this.listeners.get(target);
    if (!listener) return;
    target.removeEventListener('keydown', listener);
    this.listeners.delete(target);
  }

  private dispatch(target: EventTarget, event: KeyboardEvent): void {
    const bucket = this.registries.get(target);
    if (!bucket || bucket.size === 0) return;

    const matches: Binding[] = [];
    for (const binding of bucket) {
      if (!matchesHotkey(event, binding.parsed)) continue;
      if (!binding.options.allowInInput && isEditableTarget(event.target)) continue;
      matches.push(binding);
    }
    if (matches.length === 0) return;

    matches.sort((a, b) => b.options.priority - a.options.priority);

    this.zone.run(() => {
      // Two different questions, one flag. `preventDefault` is browser
      // suppression; `defaultPrevented` after a handler ran is how this service
      // reads "that handler claimed the chord". Applying the option first and
      // then reading the flag back meant the service saw its OWN mark as a
      // claim, so under the shipped default (`preventDefault: true`) only the
      // top-priority binding on a chord ever ran. Deferring the option's call to
      // the end keeps the flag inside the loop reporting only what a HANDLER
      // did — the rule this class already documents — and leaves a binding free
      // to suppress the browser AND claim the chord. The entry snapshot matters
      // too: another listener earlier in the propagation path may have
      // prevented the event already, and that is nobody's claim here.
      const preventedOnEntry = event.defaultPrevented;
      let suppress = false;

      for (const binding of matches) {
        binding.handler(event);
        if (binding.options.preventDefault) suppress = true;
        if (!preventedOnEntry && event.defaultPrevented) break;
      }

      if (suppress) event.preventDefault();
    });
  }
}
