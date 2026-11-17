/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { FocusMonitor } from '@angular/cdk/a11y';
import { type Injector, PLATFORM_ID, afterNextRender } from '@angular/core';

let lastRestored: WeakRef<HTMLElement> | null = null;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Is `el` rendered? A layout test, not a style one: `getClientRects()` is empty
 * for `display: none` on the element OR on any ancestor, and non-empty for
 * everything that has a box — `position: fixed` included.
 *
 * It used to be `offsetParent !== null`, which is almost the same test and
 * wrong in one direction that matters here: a `position: fixed` element has no
 * offset parent at all, so every control inside a fixed panel — the one shape a
 * focus trap is most often wrapped around — was dropped as if it were hidden.
 *
 * `visibility: hidden` keeps its box, so it needs its own read. It is checked
 * second because it is the expensive one, and `getClientRects()` already
 * rejects the common case.
 */
function isRendered(el: HTMLElement): boolean {
  if (el.getClientRects().length === 0) return false;
  return el.ownerDocument.defaultView?.getComputedStyle(el).visibility !== 'hidden';
}

const INVALID_CONTROL = '[aria-invalid="true"]';
const INVALID_SELECTOR = `${INVALID_CONTROL}, .wr-form-field--invalid`;

function findFirstInvalid(root: HTMLElement): HTMLElement | undefined {
  for (const mark of root.querySelectorAll<HTMLElement>(INVALID_SELECTOR)) {
    // An invalid field whose control carries the mark itself is reached through
    // the control, the next match, and not through whatever its label holds.
    if (!mark.matches(INVALID_CONTROL) && mark.querySelector(INVALID_CONTROL)) continue;
    const target = mark.matches(FOCUSABLE_SELECTOR) && isRendered(mark) ? mark : wrGetFocusableElements(mark)[0];
    if (target) return target;
  }
  return undefined;
}

/**
 * Return every focusable descendant of `root`, in DOM ORDER — not in tab order.
 * A positive `tabindex` is not reordered, because a trap that honoured it would
 * disagree with the browser about what Tab does for everything outside the trap;
 * APG says not to use positive values at all.
 *
 * Elements with no box are dropped (see `isRendered`), except the one that
 * currently has focus: a trap must still be able to find where it is standing,
 * and an element can be focused and then hidden by the same interaction.
 */
export function wrGetFocusableElements(root: HTMLElement): readonly HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    el => isRendered(el) || el === document.activeElement
  );
}

/**
 * Trap Tab navigation inside `root` for a keyboard event — call from a
 * `keydown` handler. Cycles focus from first ↔ last focusable element.
 * Returns `true` when focus was redirected (event was handled).
 */
export function wrTrapFocus(root: HTMLElement, event: KeyboardEvent): boolean {
  if (event.key !== 'Tab') return false;
  const focusable = wrGetFocusableElements(root);
  if (focusable.length === 0) return false;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

/**
 * Record `el` as the element a closing transient overlay (a menu, a popconfirm)
 * gives focus back to, for an overlay it opened that closes later. Called by
 * `wrRestoreFocus` itself, and by an overlay that closed without restoring
 * because focus had already moved on.
 */
export function wrNoteFocusReturn(el: HTMLElement): void {
  lastRestored = new WeakRef(el);
}

/**
 * Hand focus back to `el` after something closed, as a PROGRAMMATIC focus.
 *
 * A plain `el.focus()` after Escape reads to the CDK `FocusMonitor` as keyboard
 * focus, because the last input was a key, and anything that reacts to keyboard
 * origin (a tooltip on the trigger) then treats the restore as the user tabbing
 * there. `focusVia(el, 'program')` reports the truth. Without a monitor it is a
 * plain `focus()`.
 *
 * An `el` that left the document (a menu item or a confirm button that opened a
 * dialog and was torn down first) is replaced by the element the previous
 * restore handed focus to: the trigger of the transient overlay that held `el`.
 */
export function wrRestoreFocus(el: HTMLElement, monitor?: FocusMonitor | null): void {
  const fallback = lastRestored?.deref();
  const target = !el.isConnected && fallback?.isConnected ? fallback : el;
  wrNoteFocusReturn(target);
  const focus = (): void => (monitor ? monitor.focusVia(target, 'program') : target.focus());
  focus();
  // A region with no tabindex (a menu's trigger `<div>`) refuses focus: lend it
  // `tabindex="-1"` until it blurs, so the consumer's DOM stays as they wrote it.
  if (target.ownerDocument.activeElement === target || target.hasAttribute('tabindex')) return;
  target.setAttribute('tabindex', '-1');
  focus();
  target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
}

/** Options of {@link wrFocusFirstInvalid}. */
export interface WrFocusFirstInvalidOptions {
  /**
   * Wait for the next render before looking. Pass it when the call follows
   * `submit()` or `markAllAsTouched()` in the same handler: the marks are drawn
   * by the render that comes after.
   */
  readonly injector?: Injector;
  /**
   * Passed to `scrollIntoView`, over `{ block: 'center', behavior: 'smooth' }`.
   * `false` leaves the scroll to the browser's own focus behaviour.
   */
  readonly scroll?: ScrollIntoViewOptions | false;
}

/**
 * Focus the first invalid control inside `root` and scroll its field into view,
 * for a submit that was refused. Resolves to whether there was one.
 *
 * Invalid is what ngwr draws: an element with `aria-invalid="true"`, or a
 * `<wr-form-field>` showing an error. A mark on a group (`wr-radio-group`,
 * `wr-segmented`) leads to the first control inside it. Disabled and hidden
 * controls are skipped.
 *
 * The marks exist only once the fields are touched and rendered, so the order
 * is: `submit()` or `markAllAsTouched()`, then this call with an `injector`,
 * which waits for the next render. Without one it looks at once.
 *
 * Scrolling is smooth unless the user asked for reduced motion. On the server
 * it does nothing and resolves to `false`.
 *
 * @example
 * ```ts
 * private readonly injector = inject(Injector);
 * private readonly formEl = viewChild.required<ElementRef<HTMLElement>>('formEl');
 *
 * protected async save(): Promise<void> {
 *   const sent = await submit(this.form, async () => this.api.save(this.model()));
 *   if (!sent) void wrFocusFirstInvalid(this.formEl().nativeElement, { injector: this.injector });
 * }
 * ```
 */
export function wrFocusFirstInvalid(root: HTMLElement, options: WrFocusFirstInvalidOptions = {}): Promise<boolean> {
  const { injector, scroll } = options;
  if (typeof document === 'undefined' || (injector && injector.get(PLATFORM_ID) !== 'browser')) {
    return Promise.resolve(false);
  }

  const run = (): boolean => {
    const target = findFirstInvalid(root);
    if (!target) return false;
    target.focus({ preventScroll: scroll !== false });
    if (scroll !== false) {
      const reduced = target.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      (target.closest<HTMLElement>('.wr-form-field') ?? target).scrollIntoView?.({
        block: 'center',
        behavior: 'smooth',
        ...scroll,
        ...(reduced ? { behavior: 'instant' } : null),
      });
    }
    return true;
  };

  if (!injector) return Promise.resolve(run());
  return new Promise(resolve => afterNextRender(() => resolve(run()), { injector }));
}
