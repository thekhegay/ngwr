import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Directionality } from '@angular/cdk/bidi';
import type { Direction } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCompare } from './compare';

@Component({
  imports: [WrCompare],
  template: `
    <wr-compare
      [(position)]="position"
      [orientation]="orientation()"
      [minPosition]="min()"
      [maxPosition]="max()"
      [disabled]="disabled()"
    >
      <img wrCompareBefore src="/before.jpg" alt="before" />
      <img wrCompareAfter src="/after.jpg" alt="after" />
    </wr-compare>
  `,
})
class Host {
  readonly position = signal(50);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly min = signal(0);
  readonly max = signal(100);
  readonly disabled = signal(false);
}

let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-compare')!;
const slider = (): HTMLElement => root().querySelector<HTMLElement>('[role="slider"]')!;
const after = (): HTMLElement => root().querySelector<HTMLElement>('.wr-compare__layer--after')!;
const divider = (): HTMLElement => root().querySelector<HTMLElement>('.wr-compare__divider')!;
const position = (): number => fixture.componentInstance.position();

const press = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  slider().dispatchEvent(event);
  fixture.detectChanges();
  return event;
};

/** jsdom has neither `PointerEvent` nor pointer capture; `isPrimary` has to be supplied. */
const pointerDown = ({ button = 0, isPrimary = true, clientX = 0, clientY = 0 } = {}): MouseEvent => {
  const el = slider();
  el.setPointerCapture = () => undefined;
  el.releasePointerCapture = () => undefined;
  const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button, clientX, clientY });
  Object.defineProperty(event, 'isPrimary', { value: isPrimary });
  el.dispatchEvent(event);
  fixture.detectChanges();
  return event;
};

/**
 * jsdom lays nothing out, so the host measures 0×0 and the zero-extent guard refuses
 * every drag. A stubbed 200×100 box at the origin is what lets the pointer maths be
 * asserted at all — and makes the two reading directions land on different numbers.
 */
const measureHost = (): void => {
  host().getBoundingClientRect = (): DOMRect => ({
    left: 0,
    right: 200,
    width: 200,
    top: 0,
    bottom: 100,
    height: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
};

/**
 * The reveal is a `clip-path` percentage, which is the one piece of layout jsdom can
 * report — the inline style — so where the divider IS gets asserted through that rather
 * than through geometry.
 *
 * The pointer path is testable here for a less obvious reason: it divides by
 * `getBoundingClientRect().width`, and jsdom reports that as 0. So the environment that
 * cannot measure anything is exactly the one that exercises the divide-by-zero.
 */
describe('WrCompare', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('presents a named slider with a range and a position', () => {
    expect(slider().getAttribute('aria-label')).toBe('Comparison divider');
    expect(slider().getAttribute('aria-orientation')).toBe('horizontal');
    expect(slider().getAttribute('aria-valuemin')).toBe('0');
    expect(slider().getAttribute('aria-valuemax')).toBe('100');
    expect(slider().getAttribute('aria-valuenow')).toBe('50');
    expect(slider().getAttribute('tabindex')).toBe('0');
  });

  it('reveals the after layer from the divider outwards', () => {
    expect(after().style.clipPath).toBe('inset(0 0 0 50%)');
    expect(divider().style.left).toBe('50%');

    fixture.componentInstance.position.set(20);
    fixture.detectChanges();
    expect(after().style.clipPath).toBe('inset(0 0 0 20%)');
  });

  it('clips from the top when it is vertical', () => {
    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();

    expect(after().style.clipPath).toBe('inset(50% 0 0 0)');
    expect(divider().style.top).toBe('50%');
    expect(slider().getAttribute('aria-orientation')).toBe('vertical');
  });

  it('moves with the arrows for the orientation it is in', () => {
    press('ArrowRight');
    expect(position()).toBe(51);
    press('ArrowLeft');
    expect(position()).toBe(50);

    // The vertical arrows belong to the other orientation.
    expect(press('ArrowDown').defaultPrevented).toBe(false);
    expect(position()).toBe(50);

    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();
    press('ArrowDown');
    expect(position()).toBe(51);
  });

  it('takes a bigger step with shift, and the ends with Home and End', () => {
    press('ArrowRight', { shiftKey: true });
    expect(position()).toBe(60);

    fixture.componentInstance.min.set(20);
    fixture.componentInstance.max.set(80);
    fixture.detectChanges();

    press('End');
    expect(position()).toBe(80);
    press('Home');
    expect(position()).toBe(20);
  });

  it('pulls an out-of-range write back into the range', async () => {
    // `position` is a `model`, so `[(position)]` writes into it directly and only the
    // handlers clamped: `aria-valuenow="150"` against a `valuemax` of 100 is an invalid
    // slider state whatever the clip-path happens to show.
    fixture.componentInstance.min.set(10);
    fixture.componentInstance.max.set(90);
    fixture.componentInstance.position.set(150);
    await fixture.whenStable();

    expect(position()).toBe(90);
    expect(slider().getAttribute('aria-valuenow')).toBe('90');

    fixture.componentInstance.position.set(-5);
    await fixture.whenStable();
    expect(position()).toBe(10);
  });

  it('goes inert and announces it when disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(host().classList.contains('wr-compare--disabled')).toBe(true);
    expect(slider().getAttribute('aria-disabled')).toBe('true');
    expect(slider().getAttribute('tabindex')).toBe('-1');

    press('ArrowRight');
    expect(position()).toBe(50);
  });

  it('takes focus when the pointer grabs it', () => {
    // `pointerdown` is prevented so the drag does not select the images, and that also
    // suppresses the click's default focus — so the arrows did nothing after a mouse
    // drag until the divider was found again with Tab.
    const event = pointerDown();
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(slider());
  });

  it('ignores a press that is not the primary button or pointer', () => {
    // Asserted through `preventDefault` and focus rather than through the position: the
    // zero-size guard below already stops an unmeasured host from moving anything, so
    // the position alone cannot tell a refused press from a permitted one.
    const secondary = pointerDown({ button: 2 });
    expect(secondary.defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(slider());

    const secondFinger = pointerDown({ isPrimary: false });
    expect(secondFinger.defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(slider());
  });

  it('keeps the position finite when the host has not been measured', () => {
    // The pointer maths divides by `rect.width`, and an unmeasured or hidden host
    // reports 0 — which is also exactly what jsdom reports. `clientX: 0` is the case
    // that matters: any other x gives `Infinity`, which the clamp quietly turns into
    // 100, while 0 / 0 is `NaN` and goes straight into `aria-valuenow`.
    pointerDown({ clientX: 0 });

    expect(Number.isFinite(position())).toBe(true);
    expect(slider().getAttribute('aria-valuenow')).not.toBe('NaN');
  });

  it('carries the orientation into the class list', () => {
    expect(host().classList.contains('wr-compare--horizontal')).toBe(true);

    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();
    expect(host().classList.contains('wr-compare--vertical')).toBe(true);
    expect(host().classList.contains('wr-compare--horizontal')).toBe(false);
  });
});

/**
 * Before/after is an ORDINAL pair, so under `dir="rtl"` it follows reading order: "before"
 * occupies the inline-start side, which is the right. Both halves of that have to move
 * together — the paint (`clip-path` and the divider offset, neither of which has a logical
 * CSS form) and the input (arrows and the drag ratio). Mirror one without the other and
 * dragging right moves the divider left.
 *
 * `Directionality` reads the document once, at construction, so the direction is supplied
 * as a fake rather than by writing to `document.dir`. Every case is paired with its LTR
 * twin: an RTL assertion on its own cannot tell a mirror from a handler that always goes
 * the same way.
 */
describe('WrCompare and reading direction', () => {
  const setup = (direction: Direction): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: direction, change: new Subject<Direction>() } }],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('wipes from the inline-start edge, so "before" follows reading order', () => {
    setup('ltr');
    fixture.componentInstance.position.set(30);
    fixture.detectChanges();
    // LTR: before owns the leftmost 30%, after is clipped away from the left.
    expect(after().style.clipPath).toBe('inset(0 0 0 30%)');
    expect(divider().style.left).toBe('30%');

    setup('rtl');
    fixture.componentInstance.position.set(30);
    fixture.detectChanges();
    // RTL: the same 30% of "before", now against the right edge — so the after layer is
    // clipped from the right and the divider line sits 70% from the physical left.
    expect(after().style.clipPath).toBe('inset(0 30% 0 0)');
    expect(divider().style.left).toBe('70%');
  });

  it('sends the arrows toward the visual side they name', () => {
    // Per the APG, arrows follow the VISUAL axis: under RTL the value grows toward the
    // left, so ArrowRight decreases it.
    setup('ltr');
    press('ArrowRight');
    expect(position()).toBe(51);
    press('ArrowLeft');
    expect(position()).toBe(50);
    press('ArrowRight', { shiftKey: true });
    expect(position()).toBe(60);

    setup('rtl');
    press('ArrowRight');
    expect(position()).toBe(49);
    press('ArrowLeft');
    expect(position()).toBe(50);
    press('ArrowRight', { shiftKey: true });
    expect(position()).toBe(40);
  });

  it('measures a drag from the inline-start edge', () => {
    setup('ltr');
    measureHost();
    pointerDown({ clientX: 150 });
    expect(position()).toBe(75);

    setup('rtl');
    measureHost();
    pointerDown({ clientX: 150 });
    // Same pixel, other edge: 150 of a 200-wide box is a quarter of the way in from the
    // right, and the right is where "before" starts.
    expect(position()).toBe(25);
  });

  it('leaves Home and End alone, because first/last is semantic rather than physical', () => {
    setup('ltr');
    press('End');
    expect(position()).toBe(100);
    press('Home');
    expect(position()).toBe(0);

    setup('rtl');
    press('End');
    expect(position()).toBe(100);
    press('Home');
    expect(position()).toBe(0);
  });

  it('leaves the vertical wipe untouched — `dir` governs the inline axis only', () => {
    // The twins here assert the SAME outcome on purpose: a vertical compare is laid out
    // on the block axis, and flipping it would be a bug only a Hebrew reader ever sees.
    setup('rtl');
    fixture.componentInstance.orientation.set('vertical');
    fixture.componentInstance.position.set(30);
    fixture.detectChanges();
    measureHost();

    expect(after().style.clipPath).toBe('inset(30% 0 0 0)');
    expect(divider().style.top).toBe('30%');
    press('ArrowDown');
    expect(position()).toBe(31);
    pointerDown({ clientY: 25 });
    expect(position()).toBe(25);

    setup('ltr');
    fixture.componentInstance.orientation.set('vertical');
    fixture.componentInstance.position.set(30);
    fixture.detectChanges();
    measureHost();

    expect(after().style.clipPath).toBe('inset(30% 0 0 0)');
    expect(divider().style.top).toBe('30%');
    press('ArrowDown');
    expect(position()).toBe(31);
    pointerDown({ clientY: 25 });
    expect(position()).toBe(25);
  });

  it('repaints when the direction flips at runtime', () => {
    // The clip and the offset are cached in computeds, so a `dir` change that only
    // `Directionality.change` announces has to invalidate them — otherwise the wipe stays
    // on the old side until some unrelated position change happens to recompute it.
    const change = new Subject<Direction>();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: 'ltr', change } }],
    });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.position.set(30);
    fixture.detectChanges();
    expect(after().style.clipPath).toBe('inset(0 0 0 30%)');

    change.next('rtl');
    fixture.detectChanges();
    expect(after().style.clipPath).toBe('inset(0 30% 0 0)');
    expect(divider().style.left).toBe('70%');
  });

  it('announces the value it was given, rather than the side it was painted on', () => {
    // A same-outcome twin, and the one most likely to be "fixed" by mistake: the case
    // above paints the divider at `left: 70%` for a `position` of 30, which reads like
    // `aria-valuenow` should say 70 to match. It must not. `aria-valuenow` is the value
    // the app binds through `[(position)]` — a native `<input type="range">` under
    // `dir="rtl"` renders mirrored and keeps its value — so reversing it would make the
    // announcement disagree with the model, against a `valuemin`/`valuemax` that stayed
    // put. `aria-orientation` is the divider's own axis, so it does not move either.
    for (const direction of ['rtl', 'ltr'] as const) {
      setup(direction);
      fixture.componentInstance.position.set(30);
      fixture.detectChanges();
      expect(slider().getAttribute('aria-valuenow')).toBe('30');
      expect(slider().getAttribute('aria-valuemin')).toBe('0');
      expect(slider().getAttribute('aria-valuemax')).toBe('100');
      expect(slider().getAttribute('aria-orientation')).toBe('horizontal');
    }
  });
});

/**
 * The divider's name was a hard-coded English literal in the template — the shape this
 * repo has now corrected four times. Only a real catalog tells a lookup from a literal.
 */
describe('WrCompare under a localized catalog', () => {
  it('takes its name from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const slider = (fixture.nativeElement as HTMLElement).querySelector('[role="slider"]')!;
    expect(slider.getAttribute('aria-label')).toBe('Разделитель сравнения');

    fixture.destroy();
  });
});

/**
 * ⚠️ This one guards the RULE, not the behaviour.
 *
 * `.wr-compare__surface` is the `role="slider"` and the component's only keyboard
 * affordance, and it is coterminous with the host — which a rounded comparator has
 * to clip. jsdom has no layout and no stylesheets, so the ring cannot be seen here.
 */
describe('the compare stylesheet', () => {
  const code = readFileSync(join(process.cwd(), 'projects/lib/compare/styles/_index.scss'), 'utf8')
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

  it('paints the focus ring above the layers, inward from the edge', () => {
    // Measured in Chromium over the built showcase: all three demos went from 0-2
    // changed pixels between focused and blurred to a complete 2px ring. Merely
    // flipping the offset sign is not enough — the projected images paint over the
    // surface's own outline — so the ring has to be a stacked pseudo-element.
    const ring = /&:focus-visible::after \{([\s\S]*?)\n {4}\}/.exec(code)?.[1] ?? '';
    expect(ring).toMatch(/position:\s*absolute/);
    expect(ring).toMatch(/z-index:\s*2/);
    expect(ring).toMatch(/outline:\s*var\(--wr-focus-ring-width\)/);
    expect(ring).toMatch(/outline-offset:\s*calc\(-1 \* var\(--wr-focus-ring-width\)\)/);
  });
});
