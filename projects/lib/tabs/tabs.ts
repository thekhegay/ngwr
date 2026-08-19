/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  type ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { WrTab } from './tab';
import { WR_TABS, type WrTabsContext } from './tokens';

/**
 * Instance counter for the header / panel ids. Deterministic under prerender,
 * unlike `randomId()` — the same reason `wr-sidebar` and `wr-mention` count.
 *
 * The ids used to be built from the tab key alone, so two `<wr-tabs>` on one
 * page that both name a tab `key="overview"` emitted the same
 * `wr-tab-overview-header` twice, and the second group's `aria-labelledby`
 * resolved to the FIRST group's tab. A key is documented as parent-scoped, so
 * it is the parent that has to make it unique document-wide.
 */
let tabsUid = 0;

/**
 * A tab key as an id fragment: anything outside `[A-Za-z0-9_-]` becomes `-`.
 * These ids land in `aria-controls` / `aria-labelledby`, which are
 * space-separated IDREF lists — `key="my tab"` emitted
 * `aria-controls="wr-tab-my tab-panel"`, two tokens, neither of which resolves.
 *
 * Two keys differing only outside that set collapse to one fragment; the
 * instance counter keeps that inside a single group, where the keys are the
 * consumer's own to keep apart.
 */
function idFragment(key: string): string {
  return key.replace(/[^A-Za-z0-9_-]/g, '-');
}

/**
 * Tabbed container. Two modes depending on the child `<wr-tab>`
 * definitions:
 *
 * - **Content** — children project body content; the parent renders an
 *   active-tab panel automatically.
 * - **Router** — any child with `routerLink` switches the whole strip
 *   into router mode; the parent skips its panel so the consumer can
 *   drop a `<router-outlet>` after it.
 *
 * @example
 * ```html
 * <!-- content tabs -->
 * <wr-tabs [(active)]="key">
 *   <wr-tab key="one" title="One">First panel</wr-tab>
 *   <wr-tab key="two" title="Two">Second panel</wr-tab>
 * </wr-tabs>
 *
 * <!-- router tabs -->
 * <wr-tabs>
 *   <wr-tab title="Overview" routerLink="overview" />
 *   <wr-tab title="Details" routerLink="details" />
 * </wr-tabs>
 * <router-outlet />
 * ```
 *
 * @see https://ngwr.dev/reference/components/tabs
 */
@Component({
  selector: 'wr-tabs',
  templateUrl: './tabs.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-tabs',
    '[class.wr-tabs--fade-start]': 'canScrollStart()',
    '[class.wr-tabs--fade-end]': 'canScrollEnd()',
    '[class.wr-tabs--sm]': "size() === 'sm'",
    '[class.wr-tabs--lg]': "size() === 'lg'",
  },
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  providers: [
    {
      provide: WR_TABS,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrTabs),
    },
  ],
})
export class WrTabs implements WrTabsContext {
  /** Two-way bindable active tab key (content mode). */
  readonly active = model<string | null>(null);

  /** Visual size variant. */
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly tabs = contentChildren(WrTab);

  private readonly dir = inject(Directionality, { optional: true });

  /**
   * Reading direction of the strip. `Directionality` is root-provided, so this
   * always resolves — `optional` only guards a consumer who has deliberately
   * torn the provider out. It reads the document once at construction; a
   * subtree that overrides the direction does it with the CDK's `Dir`
   * directive, which writes `valueSignal`, so the read stays reactive.
   */
  private readonly isRtl = computed(() => this.dir?.valueSignal() === 'rtl');

  /** When any child has a routerLink, the whole strip switches to router mode. */
  protected readonly isRouter = computed(() => this.tabs().some(t => t.routerLink() !== null));

  /** Content-mode: the tab whose key matches `active()` (or the first tab if none yet). */
  protected readonly activeTab = computed(() => {
    const key = this.active();
    const tabs = this.tabs();
    if (tabs.length === 0) return null;
    return tabs.find(t => t.key() === key) ?? tabs[0];
  });

  // WrTabsContext

  activate(key: string): void {
    this.active.set(key);
  }

  register(): void {
    // Deliberately a no-op. A `WrTab` calls this from its own constructor,
    // where its `key` signal input is not bound yet — so it would report the
    // generated default and this parent would write THAT into `active`. The
    // effect below seeds from `tabs()`, by which point the inputs are real.
  }

  unregister(): void {
    // No-op: contentChildren handles removal.
  }

  // Template handlers

  protected readonly stripRef = viewChild<ElementRef<HTMLElement>>('strip');

  /** Whether the strip is scrolled away from its start / end — drives the edge fades. */
  protected readonly canScrollStart = signal(false);
  protected readonly canScrollEnd = signal(false);

  constructor() {
    // Seed `active` with the first tab's key, once the content children exist
    // and their inputs are bound. Without this the model writes back a
    // generated id like `wr-tab-b1crta5aix0v`: the strip still highlighted the
    // right tab, because `activeTab()` falls back to `tabs[0]`, so the only
    // visible symptom was a two-way binding holding a key the consumer had
    // never heard of.
    effect(() => {
      const tabs = this.tabs();
      if (tabs.length > 0 && this.active() === null) this.active.set(tabs[0].key());
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.updateFades();
      const el = this.stripRef()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      // Re-evaluate when the strip's width changes (e.g. the container narrows
      // and the tabs start overflowing).
      const ro = new ResizeObserver(() => this.updateFades());
      ro.observe(el);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  /** Recompute which edges can scroll, from the strip's scroll metrics. @internal */
  protected updateFades(): void {
    const el = this.stripRef()?.nativeElement;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Distance from the INLINE start, which is what the two fades mean.
    // `scrollLeft` is 0 at the inline start in BOTH directions and counts away
    // from it — up in LTR, DOWN into negatives under `dir="rtl"` (the CSSOM
    // model every engine Angular 22 supports now implements; the legacy
    // "reversed"/"normal" RTL conventions are gone). Read raw, the RTL value
    // said "never scrolled from the start, always more to come" at every
    // position: the end fade was pinned on and the start fade never appeared.
    //
    // Clamped rather than `Math.abs`, because an elastic overscroll reports a
    // value of the WRONG sign at the start edge — a rubber-band past the start
    // is still the start, and `abs` would light the start fade there in LTR too.
    const scrolled = this.isRtl() ? Math.max(-el.scrollLeft, 0) : Math.max(el.scrollLeft, 0);
    this.canScrollStart.set(scrolled > 1);
    this.canScrollEnd.set(max > 1 && scrolled < max - 1);
  }

  protected onTabClick(tab: WrTab): void {
    if (tab.disabled()) return;
    if (!this.isRouter()) this.activate(tab.key());
  }

  /** Per-instance prefix, so keys only have to be unique within one group. */
  private readonly uid = ++tabsUid;

  /** Header id for `aria-labelledby` on the panel. @internal */
  headerId(key: string): string {
    return `wr-tabs-${this.uid}-tab-${idFragment(key)}-header`;
  }

  /** Panel id for `aria-controls` on the tab header. @internal */
  panelId(key: string): string {
    return `wr-tabs-${this.uid}-tab-${idFragment(key)}-panel`;
  }

  /** ArrowLeft/Right/Home/End keyboard navigation on the tab strip. */
  protected onStripKeydown(event: KeyboardEvent): void {
    const tabs = this.tabs().filter(t => !t.disabled());
    if (tabs.length === 0) return;

    // Step from where FOCUS is, not from what is active.
    //
    // In router mode nothing ever moves `active` — `onTabClick` and this
    // handler both gate `activate()` on `!isRouter()`, because the route is
    // what selects a tab there. Reading the neighbour off `activeTab()`
    // therefore recomputed the same `idx` on every press, and ArrowRight
    // walked from the first tab to the second and stayed there for the rest of
    // the session. In manual mode focus and activation move together, so the
    // two readings agree and nothing changes.
    const strip = this.stripRef()?.nativeElement;
    const focused = strip?.ownerDocument.activeElement;
    const focusedIdx =
      focused instanceof HTMLElement && strip?.contains(focused)
        ? tabs.findIndex(t => this.headerId(t.key()) === focused.id)
        : -1;
    const active = this.activeTab();
    const idx = focusedIdx >= 0 ? focusedIdx : active ? tabs.indexOf(active) : -1;
    // The two neighbours in DOM order, wrapping at the ends.
    const forward = idx < tabs.length - 1 ? idx + 1 : 0;
    const backward = idx > 0 ? idx - 1 : tabs.length - 1;
    const rtl = this.isRtl();
    let nextIdx: number;

    switch (event.key) {
      // Arrow keys follow VISUAL order (WAI-ARIA APG). The strip is mirrored
      // under `dir="rtl"`, so ArrowRight moves toward the visual right, which is
      // the PREVIOUS tab there.
      case 'ArrowRight':
        nextIdx = rtl ? backward : forward;
        break;
      case 'ArrowLeft':
        nextIdx = rtl ? forward : backward;
        break;
      // Home / End name a position in the tab list — first and last — not a
      // physical edge, so they read the same in both directions.
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const next = tabs[nextIdx];
    if (!this.isRouter()) this.activate(next.key());
    // Move focus to the corresponding header element.
    const headerEl = this.stripRef()?.nativeElement.querySelector<HTMLElement>(
      `#${CSS.escape(this.headerId(next.key()))}`
    );
    headerEl?.focus();
  }
}
