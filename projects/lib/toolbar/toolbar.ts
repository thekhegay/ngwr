/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, ViewEncapsulation, afterRenderEffect, computed, inject, input } from '@angular/core';

import { WR_KEYS, wrCheckStyles, wrHasModifier } from 'ngwr/utils';

const CONTROL_SELECTOR = 'a[href], button, input:not([type="hidden"]), select, textarea, [contenteditable], [tabindex]';

/** Roles whose widget handles the arrow keys itself. */
const COMPOSITE_SELECTOR = [
  'radiogroup',
  'tablist',
  'listbox',
  'menu',
  'menubar',
  'slider',
  'spinbutton',
  'combobox',
  'grid',
  'tree',
  'treegrid',
]
  .map(role => `[role="${role}"]`)
  .join(', ');

/** `visibility: hidden` counts as hidden. An engine without `checkVisibility` is taken as visible. */
function isVisible(el: HTMLElement): boolean {
  if (typeof el.checkVisibility !== 'function') return true;
  return el.checkVisibility({ visibilityProperty: true });
}

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'submit', 'reset', 'image', 'color', 'file']);

/**
 * Action bar with three named zones — `[wrToolbarStart]`,
 * `[wrToolbarCenter]`, `[wrToolbarEnd]`. Use any one or all three.
 *
 * A bare `<div>` wrapper in a zone, one with no `class` and no `style`, is laid
 * out as a wrapping row with the zone's own gap, so the controls inside it are
 * spaced exactly like controls projected one by one. The gap follows
 * `--wr-density-gap`. Give the wrapper a class or a style and its layout is
 * yours: the toolbar sets nothing on it. Put running text in a `<span>` or a
 * `<p>`, which stay in inline flow.
 *
 * The host is `role="toolbar"`. Name it with a plain `aria-label` attribute on
 * the host when the page has more than one.
 *
 * With `arrowKeys` the toolbar follows the WAI-ARIA toolbar pattern: one tab stop
 * across every enabled control of the three zones, moved with the arrow keys.
 *
 * @example
 * ```html
 * <wr-toolbar>
 *   <div wrToolbarStart>
 *     <button wr-btn>Back</button>
 *     <strong>Items</strong>
 *   </div>
 *   <div wrToolbarCenter>
 *     <wr-segmented [(value)]="view" [options]="['grid', 'list']" />
 *   </div>
 *   <div wrToolbarEnd>
 *     <button wr-btn color="primary">New</button>
 *   </div>
 * </wr-toolbar>
 * ```
 *
 * @see https://ngwr.dev/reference/components/toolbar
 */
@Component({
  selector: 'wr-toolbar',
  templateUrl: './toolbar.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-toolbar', role: 'toolbar', '[class.wr-toolbar--responsive]': 'responsive()' },
})
export class WrToolbar {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly dir = inject(Directionality, { optional: true });
  private readonly isRtl = computed(() => this.dir?.valueSignal() === 'rtl');

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('toolbar');
    afterRenderEffect(onCleanup => {
      if (this.arrowKeys()) onCleanup(this.attachRoving());
    });
  }

  /**
   * Stack the zones vertically when the toolbar's own box is too narrow to fit
   * them in a row (a container query on its own width, not the viewport — so it
   * adapts inside a narrow column or split pane). @default false
   */
  readonly responsive = input(false, { transform: coerceBooleanProperty });

  /**
   * Roving focus across the enabled controls of all zones, per the WAI-ARIA toolbar
   * pattern: one tab stop, ArrowRight / ArrowLeft (mirrored under RTL) to step with
   * wrapping, Home / End for the ends. Text fields, native radios and composite
   * widgets (radiogroup, tablist, listbox, ...) are not part of that set: they keep
   * their own tab stop and their own arrow keys, and the arrows skip over them. Tab
   * still reaches every one of them. @default false
   */
  readonly arrowKeys = input(false, { transform: coerceBooleanProperty });

  /** Starts listening and returns the cleanup that puts every `tabindex` back. */
  private attachRoving(): () => void {
    const host = this.host;
    const original = new Map<HTMLElement, string | null>();
    let stop: HTMLElement | null = null;

    const controls = (): HTMLElement[] =>
      Array.from(host.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)).filter(el => {
        if (el.matches(':disabled') || el.closest('[hidden], [inert]') || !isVisible(el)) return false;
        // A negative tabindex that was not ours is the consumer's: out of the roving set.
        if (!original.has(el) && Number(el.getAttribute('tabindex')) < 0) return false;
        // Text fields and composite widgets keep their own tab stop and their own arrows.
        return !this.ownsArrows(el);
      });

    const restore = (el: HTMLElement, value: string | null): void => {
      if (value === null) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', value);
    };

    const sync = (): void => {
      const all = controls();
      for (const [el, value] of original) {
        // A control that left, or stopped being eligible, gets its own tabindex back.
        if (all.includes(el)) continue;
        restore(el, value);
        original.delete(el);
      }
      if (!stop || !all.includes(stop)) stop = all[0] ?? null;
      for (const el of all) {
        if (!original.has(el)) original.set(el, el.getAttribute('tabindex'));
        el.setAttribute('tabindex', el === stop ? '0' : '-1');
      }
    };

    const onFocusin = (event: FocusEvent): void => {
      const target = event.target;
      if (target instanceof HTMLElement && controls().includes(target)) {
        stop = target;
        sync();
      }
    };

    const onKeydown = (event: KeyboardEvent): void => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || event.defaultPrevented || wrHasModifier(event)) return;
      const all = controls();
      const idx = all.indexOf(target);
      if (idx < 0) return;
      const forward = (idx + 1) % all.length;
      const backward = (idx - 1 + all.length) % all.length;
      const rtl = this.isRtl();
      let next: number;
      switch (event.key) {
        case WR_KEYS.ARROW_RIGHT:
          next = rtl ? backward : forward;
          break;
        case WR_KEYS.ARROW_LEFT:
          next = rtl ? forward : backward;
          break;
        case WR_KEYS.HOME:
          next = 0;
          break;
        case WR_KEYS.END:
          next = all.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      all[next].focus();
    };

    sync();
    host.addEventListener('focusin', onFocusin);
    host.addEventListener('keydown', onKeydown);
    const observer = new MutationObserver(sync);
    observer.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      // Never `tabindex`: sync writes it, and watching it would loop.
      attributeFilter: ['disabled', 'hidden', 'inert', 'class', 'style'],
    });

    return () => {
      observer.disconnect();
      host.removeEventListener('focusin', onFocusin);
      host.removeEventListener('keydown', onKeydown);
      for (const [el, value] of original) restore(el, value);
      original.clear();
    };
  }

  /** Does `el` need the arrow keys for itself: a text field, or inside a composite widget? */
  private ownsArrows(el: HTMLElement): boolean {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el.isContentEditable) return true;
    if (el instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(el.type)) return true;
    const widget = el.closest(COMPOSITE_SELECTOR);
    return widget !== null && widget !== this.host && this.host.contains(widget);
  }
}
