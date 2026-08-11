import { Directionality } from '@angular/cdk/bidi';
import type { Direction } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSplitter } from './splitter';

@Component({
  imports: [WrSplitter],
  template: `
    <wr-splitter
      [(position)]="split"
      [orientation]="orientation()"
      [minPosition]="min()"
      [maxPosition]="max()"
      [disabled]="disabled()"
    >
      <div wrSplitterStart>left</div>
      <div wrSplitterEnd>right</div>
    </wr-splitter>
  `,
})
class Host {
  readonly split = signal(50);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly min = signal(0);
  readonly max = signal(100);
  readonly disabled = signal(false);
}

let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
const splitter = (): HTMLElement => root().querySelector<HTMLElement>('wr-splitter')!;
const divider = (): HTMLElement => root().querySelector<HTMLElement>('[role="separator"]')!;
const startPane = (): HTMLElement => root().querySelector<HTMLElement>('.wr-splitter__pane--start')!;
const endPane = (): HTMLElement => root().querySelector<HTMLElement>('.wr-splitter__pane--end')!;
const position = (): number => fixture.componentInstance.split();

const press = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  divider().dispatchEvent(event);
  fixture.detectChanges();
  return event;
};

/**
 * jsdom has neither `PointerEvent` nor pointer capture, so the drag is driven with
 * a `MouseEvent` carrying the two properties the handler reads. `isPrimary` has to
 * be defined explicitly: it does not exist on `MouseEvent`, and reading it as
 * `undefined` makes the primary-pointer guard reject every synthetic event —
 * which silently turned the button test green for the wrong reason.
 */
const pointerDown = ({ button = 0, isPrimary = true }: { button?: number; isPrimary?: boolean } = {}): void => {
  const el = divider();
  el.setPointerCapture = () => undefined;
  el.releasePointerCapture = () => undefined;
  const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button });
  Object.defineProperty(event, 'isPrimary', { value: isPrimary });
  el.dispatchEvent(event);
  fixture.detectChanges();
};

const pointerMove = (clientX: number, clientY = 0): void => {
  divider().dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX, clientY }));
  fixture.detectChanges();
};

/**
 * jsdom lays nothing out, so the host measures 0×0 and every drag divides by zero.
 * A stubbed 200×100 box at the origin gives the pointer maths something to be right
 * or wrong about — and makes the two directions land on different numbers.
 */
const measureHost = (): void => {
  splitter().getBoundingClientRect = (): DOMRect => ({
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
 * A focusable `role="separator"` is an interactive widget, so it owes the same
 * things `wr-slider` owes: a name, a range, a position that moves, and arrows that
 * move it. The panes are sized by `flex-basis` percentages, which is the one piece
 * of layout jsdom CAN report — the inline style itself — so the split is asserted
 * through that rather than through geometry.
 */
describe('WrSplitter', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('presents the divider as a separator with a range and a position', () => {
    expect(divider().getAttribute('aria-valuemin')).toBe('0');
    expect(divider().getAttribute('aria-valuemax')).toBe('100');
    expect(divider().getAttribute('aria-valuenow')).toBe('50');
    expect(divider().getAttribute('tabindex')).toBe('0');
    // A horizontal split is divided by a VERTICAL separator.
    expect(divider().getAttribute('aria-orientation')).toBe('vertical');
  });

  it('names the divider, because a focusable separator needs a name', () => {
    // Without this a screen reader reaches it and says only "separator, 50". Every
    // other named control here routes a `*Label` input through the i18n catalog.
    expect(divider().getAttribute('aria-label')).toBeTruthy();
  });

  it('sizes both panes from the position', () => {
    expect(startPane().style.flexBasis).toBe('50%');
    expect(endPane().style.flexBasis).toBe('50%');

    fixture.componentInstance.split.set(30);
    fixture.detectChanges();
    expect(startPane().style.flexBasis).toBe('30%');
    expect(endPane().style.flexBasis).toBe('70%');
  });

  it('resizes with the arrows for the orientation it is in', () => {
    press('ArrowRight');
    expect(position()).toBe(51);
    press('ArrowLeft');
    expect(position()).toBe(50);

    // The vertical arrows belong to the other orientation and must be left alone.
    expect(press('ArrowDown').defaultPrevented).toBe(false);
    expect(position()).toBe(50);

    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();
    press('ArrowDown');
    expect(position()).toBe(51);
    expect(divider().getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('takes a bigger step with shift', () => {
    press('ArrowRight', { shiftKey: true });
    expect(position()).toBe(60);
  });

  it('jumps to the bounds with Home and End', () => {
    fixture.componentInstance.min.set(20);
    fixture.componentInstance.max.set(80);
    fixture.detectChanges();

    press('End');
    expect(position()).toBe(80);
    press('Home');
    expect(position()).toBe(20);
  });

  it('stops at the bounds instead of running past them', () => {
    fixture.componentInstance.min.set(20);
    fixture.componentInstance.max.set(80);
    fixture.detectChanges();

    press('Home');
    press('ArrowLeft');
    expect(position()).toBe(20);
    press('End');
    press('ArrowRight');
    expect(position()).toBe(80);
  });

  it('pulls an out-of-range write back into the range', async () => {
    // `position` is a `model`, so `[(position)]` and a restored layout both write
    // straight into it. Unclamped it produced `aria-valuenow="150"` against a
    // `valuemax` of 100 — an invalid ARIA state — and a pane sized `150%`.
    fixture.componentInstance.split.set(150);
    await fixture.whenStable();

    expect(position()).toBe(100);
    expect(divider().getAttribute('aria-valuenow')).toBe('100');
    expect(startPane().style.flexBasis).toBe('100%');

    fixture.componentInstance.split.set(-20);
    await fixture.whenStable();
    expect(position()).toBe(0);
  });

  it('goes inert and announces it when disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(root().querySelector('.wr-splitter--disabled')).not.toBeNull();
    expect(divider().getAttribute('aria-disabled')).toBe('true');
    expect(divider().getAttribute('tabindex')).toBe('-1');

    press('ArrowRight');
    expect(position()).toBe(50);
  });

  it('takes focus when the pointer grabs the divider', () => {
    // `pointerdown` is prevented so the drag does not select text, and that also
    // suppresses the click's default focus — so after a mouse drag the arrows did
    // nothing until the user went and found the divider with Tab. `wr-slider`
    // focuses its thumb for the same reason.
    pointerDown();
    expect(document.activeElement).toBe(divider());
  });

  it('ignores a press that is not the primary button or the primary pointer', () => {
    // `dragging` was set for ANY pointerdown, so holding the right button over the
    // divider and moving resized the panes; a second finger could take over a drag
    // the same way.
    pointerDown({ button: 2 });
    pointerMove(10);
    expect(position()).toBe(50);
    expect(document.activeElement).not.toBe(divider());

    pointerDown({ isPrimary: false });
    pointerMove(10);
    expect(position()).toBe(50);
  });

  it('carries the orientation into the class list', () => {
    expect(root().querySelector('.wr-splitter--horizontal')).not.toBeNull();

    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();
    expect(root().querySelector('.wr-splitter--vertical')).not.toBeNull();
    expect(root().querySelector('.wr-splitter--horizontal')).toBeNull();
  });
});

/**
 * Reading direction is an INPUT concern here, not only a layout one. `flex-direction: row`
 * already puts the start pane on the right under `dir="rtl"` for free — so a drag and a
 * pair of arrows that still counted from the left moved the divider AWAY from the gesture
 * asking for it, and `(clientX - rect.left)` read 0 where the start pane was widest.
 *
 * `Directionality` reads the document once, at construction, so the direction is supplied
 * as a fake rather than by writing to `document.dir` — and every case is paired with its
 * LTR twin, because "mirrors correctly" and "always goes one way" are indistinguishable
 * from an RTL assertion on its own.
 */
describe('WrSplitter and reading direction', () => {
  const setup = (direction: Direction): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: direction, change: new Subject<Direction>() } }],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('sends the arrows toward the visual side they name', () => {
    // Per the APG, arrows follow the VISUAL axis: under RTL the start pane is on the
    // right, so the visual right is the LOW end of the range.
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
    pointerDown();
    pointerMove(150);
    expect(position()).toBe(75);

    setup('rtl');
    measureHost();
    pointerDown();
    pointerMove(150);
    // Same pixel, other edge: 150 of a 200-wide box is a quarter of the way from the
    // right, and the right is where the start pane begins.
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

  it('leaves the vertical split untouched — `dir` governs the inline axis only', () => {
    setup('rtl');
    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();
    measureHost();

    press('ArrowDown');
    expect(position()).toBe(51);
    press('ArrowUp');
    expect(position()).toBe(50);
    pointerDown();
    pointerMove(0, 25);
    expect(position()).toBe(25);

    setup('ltr');
    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();
    measureHost();

    press('ArrowDown');
    expect(position()).toBe(51);
    press('ArrowUp');
    expect(position()).toBe(50);
    pointerDown();
    pointerMove(0, 25);
    expect(position()).toBe(25);
  });

  it('does not mirror the pane percentages, which flex-direction already handles', () => {
    // The twin here asserts the SAME number on purpose: `position` is the size of the
    // start pane, and `flex-direction: row` puts that pane on the right by itself.
    // Swapping the bases here as well would mirror the layout twice, back to LTR.
    setup('rtl');
    fixture.componentInstance.split.set(30);
    fixture.detectChanges();
    expect(startPane().style.flexBasis).toBe('30%');
    expect(endPane().style.flexBasis).toBe('70%');

    setup('ltr');
    fixture.componentInstance.split.set(30);
    fixture.detectChanges();
    expect(startPane().style.flexBasis).toBe('30%');
    expect(endPane().style.flexBasis).toBe('70%');
  });

  it('announces the value it was given, rather than the side it was painted on', () => {
    // Another deliberate same-outcome twin, and the one most likely to be "fixed" by
    // mistake: under RTL the divider IS further left for a bigger `position`, which
    // reads like `aria-valuenow` should report `100 - position` to match. It must not.
    // `aria-valuenow` is the value the app binds through `[(position)]` — a native
    // `<input type="range">` under `dir="rtl"` renders mirrored and keeps its value —
    // so reversing it here would make the announcement disagree with the model, and
    // reverse the range against a `valuemin`/`valuemax` that stayed put.
    for (const direction of ['rtl', 'ltr'] as const) {
      setup(direction);
      fixture.componentInstance.split.set(30);
      fixture.detectChanges();
      expect(divider().getAttribute('aria-valuenow')).toBe('30');
      expect(divider().getAttribute('aria-valuemin')).toBe('0');
      expect(divider().getAttribute('aria-valuemax')).toBe('100');
      // The separator line is vertical in a horizontal split in both directions too:
      // `aria-orientation` describes the divider's own axis, not the reading order.
      expect(divider().getAttribute('aria-orientation')).toBe('vertical');
    }
  });
});
