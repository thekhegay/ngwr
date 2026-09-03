import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';

import { Subject } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTabsRouting } from './router/tabs-routing';
import { WrTab } from './tab';
import { WrTabs } from './tabs';

/**
 * The pattern for a component spec here: a tiny host that uses the component
 * the way a consumer would, and assertions against the RENDERED DOM — roles,
 * ARIA state and the `.wr-*` classes. Those classes are public API, so a test
 * that pokes at component internals instead would pass straight through the
 * kind of change that actually breaks people.
 */
@Component({
  imports: [WrTabs, WrTab],
  template: `
    <wr-tabs [(active)]="active">
      <wr-tab title="One" key="one">Panel one</wr-tab>
      <wr-tab title="Two" key="two">Panel two</wr-tab>
      <wr-tab title="Three" key="three" [disabled]="true">Panel three</wr-tab>
      <wr-tab title="Four" key="four">Panel four</wr-tab>
    </wr-tabs>
  `,
})
class Host {
  readonly active = signal<string | null>(null);
}

/**
 * Router mode: the ROUTE selects a tab, so nothing ever moves `active`.
 *
 * `WrTabsRouting` is the opt-in from `ngwr/tabs/router`: the symbol in `imports`
 * and the attribute on the element. `ngwr/tabs` itself names no
 * `@angular/router` symbol, which is what keeps a content strip free of it.
 */
@Component({
  imports: [WrTabs, WrTab, WrTabsRouting],
  template: `
    <wr-tabs wrTabsRouting>
      <wr-tab title="One" key="one" routerLink="/one" />
      <wr-tab title="Two" key="two" routerLink="/two" />
      <wr-tab title="Three" key="three" routerLink="/three" />
    </wr-tabs>
  `,
})
class RouterHost {}

describe('WrTabs', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const strip = (): HTMLElement => root().querySelector<HTMLElement>('[role="tablist"]')!;
  const tabs = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('[role="tab"]')];
  const panel = (): HTMLElement | null => root().querySelector<HTMLElement>('[role="tabpanel"]');
  const selected = (): string | undefined =>
    tabs()
      .find(t => t.getAttribute('aria-selected') === 'true')
      ?.textContent?.trim();
  const key = (name: string): void => {
    strip().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('renders one tab per <wr-tab>, in order', () => {
    expect(tabs().map(t => t.textContent?.trim())).toEqual(['One', 'Two', 'Three', 'Four']);
  });

  it('selects the first tab when nothing was bound', () => {
    expect(selected()).toBe('One');
    expect(fixture.componentInstance.active()).toBe('one');
  });

  it('keeps exactly one tab in the tab order — the roving tabindex', () => {
    // A tablist is one tab stop. Four reachable tabs would mean four.
    expect(tabs().filter(t => t.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('links each tab to its panel both ways', () => {
    const tab = tabs()[0];
    expect(tab.getAttribute('aria-controls')).toBe(panel()?.getAttribute('id'));
    expect(panel()?.getAttribute('aria-labelledby')).toBe(tab.getAttribute('id'));
  });

  it('renders only the active panel', () => {
    expect(root().querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
    expect(panel()?.textContent).toContain('Panel one');
  });

  it('activates on click and writes back through the two-way binding', () => {
    tabs()[1].click();
    fixture.detectChanges();

    expect(selected()).toBe('Two');
    expect(fixture.componentInstance.active()).toBe('two');
    expect(panel()?.textContent).toContain('Panel two');
  });

  it('follows a change written from outside', () => {
    fixture.componentInstance.active.set('four');
    fixture.detectChanges();
    expect(selected()).toBe('Four');
  });

  it('moves with the arrow keys and wraps at both ends', () => {
    key('ArrowRight');
    expect(selected()).toBe('Two');

    key('ArrowLeft');
    expect(selected()).toBe('One');

    key('ArrowLeft');
    expect(selected()).toBe('Four');

    key('ArrowRight');
    expect(selected()).toBe('One');
  });

  it('skips a disabled tab rather than landing on it', () => {
    fixture.componentInstance.active.set('two');
    fixture.detectChanges();

    key('ArrowRight');
    expect(selected()).toBe('Four');
  });

  it('jumps to the ends with Home and End', () => {
    key('End');
    expect(selected()).toBe('Four');

    key('Home');
    expect(selected()).toBe('One');
  });

  it('leaves other keys to the page', () => {
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    strip().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(selected()).toBe('One');
  });

  it('marks a disabled tab both natively and for assistive tech', () => {
    const disabled = tabs()[2];
    expect(disabled.classList.contains('wr-tabs__tab--disabled')).toBe(true);
    expect((disabled as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps the tab stop off a disabled tab, even when it is the active one', () => {
    // The roving tabindex follows `active`, and a host is free to point `active` at
    // a disabled key. Left alone that rendered `<button disabled tabindex="0">` —
    // a tab stop no Tab press can reach, so the strip had none at all. jsdom
    // happily focuses a disabled button, which is why only the attribute tells the
    // truth here.
    fixture.componentInstance.active.set('three');
    fixture.detectChanges();

    expect(tabs()[2].getAttribute('tabindex')).toBe('-1');
    expect(tabs().filter(t => t.getAttribute('tabindex') === '0')).toHaveLength(0);
  });

  it('carries the public BEM classes', () => {
    // These are public API — consumers style against them.
    expect(root().querySelector('.wr-tabs')).toBeTruthy();
    expect(strip().classList.contains('wr-tabs__strip')).toBe(true);
    expect(tabs()[0].classList.contains('wr-tabs__tab')).toBe(true);
    expect(tabs()[0].classList.contains('wr-tabs__tab--active')).toBe(true);
  });
});

/**
 * The ARIA ids. A tab key is documented as parent-scoped ("used by the parent to
 * track the active tab"), so the DOCUMENT-wide uniqueness the ids need has to
 * come from the parent — otherwise two groups that both name a tab `overview`
 * emit the same id twice and the second group's `aria-labelledby` resolves into
 * the first.
 */
@Component({
  imports: [WrTabs, WrTab],
  template: `
    <wr-tabs>
      <wr-tab title="Overview" key="overview">Product overview</wr-tab>
      <wr-tab title="Details" key="details">Product details</wr-tab>
    </wr-tabs>
    <wr-tabs>
      <wr-tab title="Overview" key="overview">Settings overview</wr-tab>
      <wr-tab title="Advanced" key="my advanced">Settings advanced</wr-tab>
    </wr-tabs>
  `,
})
class TwoGroupsHost {}

describe('WrTabs ARIA ids across two groups on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoGroupsHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const groups = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('wr-tabs')];

  beforeEach(() => {
    fixture = TestBed.createComponent(TwoGroupsHost);
    fixture.detectChanges();
  });

  it('gives every id-bearing element a document-unique id', () => {
    const ids = [...root().querySelectorAll<HTMLElement>('[id]')].map(el => el.id);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
  });

  it('resolves each panel’s aria-labelledby to a tab in its OWN group', () => {
    for (const group of groups()) {
      const panel = group.querySelector<HTMLElement>('[role="tabpanel"]')!;
      const labelledBy = panel.getAttribute('aria-labelledby')!;
      const label = root().querySelector<HTMLElement>(`#${CSS.escape(labelledBy)}`);

      expect(label).toBeTruthy();
      expect(group.contains(label)).toBe(true);
    }
  });

  it('resolves each tab’s aria-controls to a panel in its OWN group', () => {
    for (const group of groups()) {
      const tab = group.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')!;
      const controls = tab.getAttribute('aria-controls')!;
      const panel = root().querySelector<HTMLElement>(`#${CSS.escape(controls)}`);

      expect(panel).toBeTruthy();
      expect(group.contains(panel)).toBe(true);
    }
  });

  it('keeps a key with a space to a single IDREF token', () => {
    // `aria-controls` is a SPACE-SEPARATED id list, so `key="my advanced"` used
    // to parse as two tokens, neither of which named anything.
    const ids = [...root().querySelectorAll<HTMLElement>('[id]')].map(el => el.id);
    for (const id of ids) expect(id).not.toContain(' ');
  });

  it('still moves focus with the arrow keys in the second group', () => {
    // The strip looks its neighbour up by `#id`, so the id shape and the
    // keyboard path have to stay in agreement.
    const second = groups()[1];
    const strip = second.querySelector<HTMLElement>('[role="tablist"]')!;
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    const tabs = [...second.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);
  });
});

/**
 * Reading direction. `Directionality` resolves the document's direction when it is
 * constructed, so the honest way to test the other one is to provide a fake —
 * writing `document.dir` mid-file would leak into whatever runs after it.
 *
 * Every case here is a PAIR. On its own, an RTL assertion cannot tell "mirrors
 * correctly" from "always goes left", so each direction states the outcome the
 * other one contradicts — except Home / End, which name a position in the list
 * rather than an edge of it and so must agree.
 */
describe('WrTabs under a reading direction', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-tabs')!;
  const strip = (): HTMLElement => root().querySelector<HTMLElement>('[role="tablist"]')!;
  const selected = (): string | undefined =>
    [...root().querySelectorAll<HTMLElement>('[role="tab"]')]
      .find(t => t.getAttribute('aria-selected') === 'true')
      ?.textContent?.trim();

  const mount = (dir: Direction): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Directionality,
          useValue: { value: dir, valueSignal: signal(dir), change: new Subject<Direction>() },
        },
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  const key = (name: string): void => {
    strip().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  /** The strip's scroll metrics — jsdom lays nothing out, so they are declared. */
  const scrolledBy = (scrollLeft: number): void => {
    const el = strip();
    Object.defineProperty(el, 'scrollWidth', { value: 400, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: 200, configurable: true });
    Object.defineProperty(el, 'scrollLeft', { value: scrollLeft, configurable: true });
    el.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
  };

  const fades = (): { start: boolean; end: boolean } => ({
    start: host().classList.contains('wr-tabs--fade-start'),
    end: host().classList.contains('wr-tabs--fade-end'),
  });

  it('walks the arrows in visual order — ltr', () => {
    mount('ltr');

    // The enabled tabs are One, Two, Four; Three is disabled and skipped.
    key('ArrowRight');
    expect(selected()).toBe('Two');

    key('ArrowLeft');
    expect(selected()).toBe('One');
  });

  it('walks the arrows in visual order — rtl', () => {
    // The APG puts arrow keys on the VISUAL axis, and the strip is mirrored here:
    // ArrowRight moves toward the visual right, which is the PREVIOUS tab — so
    // from the first tab it wraps to the last rather than landing on 'Two'.
    mount('rtl');

    key('ArrowRight');
    expect(selected()).toBe('Four');

    key('ArrowLeft');
    expect(selected()).toBe('One');
  });

  it('leaves Home and End alone — they name a position, not an edge', () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      mount(dir);

      key('End');
      expect(selected(), dir).toBe('Four');

      key('Home');
      expect(selected(), dir).toBe('One');
    }
  });

  it('fades the edge it has scrolled away from — ltr', () => {
    mount('ltr');

    scrolledBy(0);
    expect(fades()).toEqual({ start: false, end: true });

    // Scrolled to the far end: 400 of content in a 200 viewport.
    scrolledBy(200);
    expect(fades()).toEqual({ start: true, end: false });
  });

  it('fades the edge it has scrolled away from — rtl', () => {
    // Same two positions, opposite raw values: an RTL strip starts at its physical
    // right and `scrollLeft` counts DOWN from 0. Read literally that said "still at
    // the start, more to come" everywhere, so the end fade was pinned on and the
    // start fade never appeared.
    mount('rtl');

    scrolledBy(0);
    expect(fades()).toEqual({ start: false, end: true });

    scrolledBy(-200);
    expect(fades()).toEqual({ start: true, end: false });
  });

  it('treats an elastic overscroll past the start as the start, in both directions', () => {
    // A rubber-band past the inline start reports a `scrollLeft` of the sign the
    // OTHER direction uses, so reading the magnitude alone lights the start fade
    // while the strip is still sitting at its start — in LTR too, which is a
    // behaviour change for consumers who never set a direction at all.
    mount('ltr');
    scrolledBy(-20);
    expect(fades(), 'ltr').toEqual({ start: false, end: true });

    mount('rtl');
    scrolledBy(20);
    expect(fades(), 'rtl').toEqual({ start: false, end: true });
  });
});

/**
 * The arrows step from where FOCUS is, and in router mode that is the only
 * reading that can work: `activate()` is gated on `!isRouter()` there, so
 * `activeTab()` never moves and every ArrowRight recomputed the same
 * neighbour. Pressing it three times walked to the second tab and stopped.
 */
describe('WrTabs in router mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RouterHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const strip = (): HTMLElement => root().querySelector<HTMLElement>('[role="tablist"]')!;
  const headers = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('[role="tab"]')];
  const focused = (): string | undefined => (document.activeElement as HTMLElement | null)?.textContent?.trim();

  const press = (key: string): void => {
    strip().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(RouterHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('walks the strip instead of bouncing off the same tab', () => {
    headers()[0].focus();

    press('ArrowRight');
    expect(focused()).toBe('Two');

    press('ArrowRight');
    expect(focused(), 'the cursor never left the second tab').toBe('Three');

    press('ArrowRight');
    expect(focused(), 'it should wrap to the first').toBe('One');
  });

  it('walks backwards too, and Home / End still name the ends', () => {
    headers()[2].focus();

    press('ArrowLeft');
    expect(focused()).toBe('Two');

    press('Home');
    expect(focused()).toBe('One');

    press('End');
    expect(focused()).toBe('Three');
  });
});

@Component({ template: 'Routed page' })
class Page {}

/** The same strip with real routes behind it, because the ROUTE is the selection here. */
@Component({
  imports: [RouterOutlet, WrTabs, WrTab, WrTabsRouting],
  template: `
    <wr-tabs wrTabsRouting>
      <wr-tab title="One" key="one" routerLink="/one" />
      <wr-tab title="Two" key="two" routerLink="/two" />
    </wr-tabs>
    <router-outlet />
  `,
})
class RoutedHost {}

describe('WrTabs selection in router mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RoutedHost>>;
  let router: Router;

  const headers = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]'),
  ];

  const navigate = async (url: string): Promise<void> => {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'one', component: Page },
          { path: 'two', component: Page },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(RoutedHost);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('announces the tab the route selected, not only the one it paints', async () => {
    await navigate('/two');

    // The `--active` class is paint and nothing else reads it; the strip used to
    // ship as a `role="tablist"` in which no tab was ever selected. Both readings
    // come off the one `routerActive()`, so they cannot drift apart.
    expect(headers()[1].classList.contains('wr-tabs__tab--active')).toBe(true);
    expect(headers()[1].getAttribute('aria-selected')).toBe('true');
    expect(headers()[0].getAttribute('aria-selected')).toBe('false');
  });

  it('moves the announced selection with the route', async () => {
    await navigate('/two');
    await navigate('/one');

    expect(headers()[0].getAttribute('aria-selected')).toBe('true');
    expect(headers()[1].getAttribute('aria-selected')).toBe('false');
  });
});

/**
 * `ngwr/tabs` names no `@angular/router` symbol, so a strip that carries a
 * `routerLink` and nothing to serve it has to say so. The alternative — falling
 * back to the content branch — renders buttons that navigate nowhere over an
 * empty panel, which looks like a working strip and names nothing.
 *
 * The host below is the likelier half of the mistake: the attribute is on the
 * element and the symbol is missing from `imports`, so nothing matches it and
 * `wrTabsRouting` is an inert DOM attribute.
 */
@Component({
  imports: [WrTabs, WrTab],
  template: `
    <wr-tabs wrTabsRouting>
      <wr-tab title="One" key="one" routerLink="/one" />
    </wr-tabs>
  `,
})
class UnroutedHost {}

describe('WrTabs in router mode with no routing adapter', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('names the import it is missing rather than degrading', () => {
    const fixture = TestBed.createComponent(UnroutedHost);

    // `provideRouter` is present above and deliberately does not help: what is
    // missing is the directive in `imports`, and the message has to say which.
    expect(() => fixture.detectChanges()).toThrowError(/ngwr\/tabs\/router/);
  });
});

/**
 * ⚠️ This one guards the RULE, not the behaviour.
 *
 * `.wr-tabs__strip` is `overflow-y: hidden` on purpose (a single row never wants a
 * vertical scrollbar) and its box is exactly the tab's height, so the shared ring's
 * default `+2px` offset put both horizontal strokes outside the clip — a focused tab
 * rendered as two disconnected vertical bars. jsdom has no layout and no stylesheets.
 */
describe('the shared focus ring, as tabs takes it', () => {
  const focus = readFileSync(join(process.cwd(), 'projects/lib/theme/styles/_focus.scss'), 'utf8');

  it('insets the ring, because the strip clips it', () => {
    // Measured in Chromium: outward strokes went from {top 0, bottom 0, left 2,
    // right 2} to a complete 2px ring inside all four edges.
    expect(focus).toMatch(/\.wr-tabs__tab:focus-visible \{[^}]*outline-offset:\s*-2px/);
  });
});
