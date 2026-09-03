/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, ViewEncapsulation, computed, effect, inject, input, isDevMode } from '@angular/core';

import { WrIconRegistry } from './icon-registry';
import type { WrIconDef, WrIconName } from './interfaces';
import { type WrIconStripReport, sanitizeIcon } from './utils';

/**
 * Renders a registered SVG icon.
 *
 * Icons must be registered via {@link provideWrIcons} before use —
 * either at the application root or on any ancestor component.
 *
 * @example
 * ```html
 * <wr-icon name="home" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/icon
 */
@Component({
  selector: 'wr-icon',
  template: '',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-icon',
    '[attr.data-icon]': 'name()',
  },
})
export class WrIcon {
  readonly name = input.required<WrIconName>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);

  /**
   * Every icon visible from this position, walked up the whole chain of
   * registering injector levels.
   *
   * Angular's `inject(WR_ICONS)` returns only the **closest** injector's
   * contribution — `multi` providers are not merged across levels — so a
   * component that registers its own icons used to shadow, not extend, what an
   * ancestor registered. {@link WrIconRegistry} is provided once per
   * registering level and links to its parent, so nesting any number of levels
   * now adds up, with the nearest registration winning a name collision.
   *
   * Optional: with no `provideWrIcons()` anywhere the map is simply empty and
   * every name reports as unregistered.
   */
  private readonly iconRegistry = inject(WrIconRegistry, { optional: true });

  private readonly registry = computed<ReadonlyMap<WrIconName, WrIconDef>>(
    () => (this.iconRegistry?.resolve() ?? new Map()) as ReadonlyMap<WrIconName, WrIconDef>
  );

  private readonly icon = computed(() => this.registry().get(this.name()));

  constructor() {
    effect(() => {
      const icon = this.icon();
      const name = this.name();

      if (!icon) {
        if (isDevMode()) {
          // Reported, never thrown. An exception here escapes into
          // `runEffectsInView`, which abandons the remaining effects of the
          // whole view — one unknown name would blank every `<wr-icon>` after
          // it while the console blamed only the first. Error level (not
          // `badgeLog`) so it survives a console filtered to errors.
          // eslint-disable-next-line no-console -- misconfiguration must be visible, but must not throw
          console.error(
            `[NGWR] No icon named "${name}" is registered. Did you forget to call provideWrIcons()? ` +
              `If the name IS registered, check the injector level: a component-level provideWrIcons() ` +
              `shadows icons registered on an ancestor component.`
          );
        }
        this.clear();
        return;
      }

      // Rebuilt from an allowlist rather than assigned to `innerHTML`, which
      // ran an `onload` on the root, an `<image onerror>`, an `<img>` smuggled
      // in after a closed `</svg>` and anything inside a `<foreignObject>` —
      // in production builds, with the app's own origin. `provideWrIcons()`
      // data is untrusted the same way `<wr-markdown>`'s input is: a tenant
      // logo or a fetched icon pack is a normal way to fill it. Building nodes
      // also keeps `<wr-icon>` clear of Trusted Types, which refuses the
      // `innerHTML` write outright.
      const report = isDevMode() ? { elements: new Set<string>(), attributes: new Set<string>() } : undefined;
      const svg = sanitizeIcon(this.doc, icon.data, report);

      if (!svg) {
        if (isDevMode()) {
          // eslint-disable-next-line no-console -- misconfiguration must be visible, but must not throw
          console.error(
            `[NGWR] Icon "${name}" has no <svg> root element and cannot be rendered. ` +
              `Custom icons must be valid SVG markup.`
          );
        }
        this.clear();
        return;
      }

      // Every hand-written inline SVG in the library carries aria-hidden;
      // registered icons went in without it, so a decorative glyph could be
      // announced — usually as a bare "graphic" beside the label it decorates.
      // Consumers that need a name put it on the interactive host instead.
      svg.setAttribute('aria-hidden', 'true');

      this.clear();
      this.host.nativeElement.appendChild(svg);

      if (report) this.reportStripped(name, icon, report);
    });
  }

  /**
   * `replaceChildren()` would say this in one call, but domino — the DOM
   * `@angular/platform-server` renders into — does not implement it, and
   * `innerHTML = ''` is the write Trusted Types refuses.
   */
  private clear(): void {
    const el = this.host.nativeElement;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  /**
   * Say what the allowlist removed, once per registered icon.
   *
   * A silently stripped icon is the failure mode this rebuild could introduce:
   * a consumer's own glyph renders blank or wrong and nothing anywhere says
   * why. Keyed on the definition object, so a page with fifty instances of the
   * same icon warns once and an icon nobody renders never warns at all.
   */
  private reportStripped(name: string, icon: WrIconDef, report: WrIconStripReport): void {
    if (WrIcon.reported.has(icon)) return;
    if (report.elements.size === 0 && report.attributes.size === 0) return;
    WrIcon.reported.add(icon);

    const removed = [
      report.elements.size ? `elements: ${[...report.elements].join(', ')}` : '',
      report.attributes.size ? `attributes: ${[...report.attributes].join(', ')}` : '',
    ].filter(Boolean);

    // eslint-disable-next-line no-console -- a stripped icon must not be silent
    console.warn(
      `[NGWR] Icon "${name}" was rendered without part of its markup — ${removed.join('; ')}. ` +
        `Registered icon data is treated as untrusted and rebuilt from an allowlist of SVG ` +
        `shape, paint and text elements, so event handlers, <script>, <style>, <image>, ` +
        `<foreignObject>, <a>, SMIL animation and non-fragment hrefs never reach the DOM.`
    );
  }

  private static readonly reported = new WeakSet<WrIconDef>();
}
