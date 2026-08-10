import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

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
  const pointerDown = ({ button = 0, isPrimary = true, clientX = 0 } = {}): MouseEvent => {
    const el = slider();
    el.setPointerCapture = () => undefined;
    el.releasePointerCapture = () => undefined;
    const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button, clientX });
    Object.defineProperty(event, 'isPrimary', { value: isPrimary });
    el.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

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
