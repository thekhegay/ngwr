import { Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrKnob } from './knob';

@Component({
  imports: [WrKnob],
  template: `
    <wr-knob
      [(value)]="volume"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [strokeWidth]="strokeWidth()"
      [suffix]="suffix()"
      [showValue]="showValue()"
      [readonly]="readonly()"
      [disabled]="disabled()"
      [ariaLabel]="ariaLabel()"
      (touch)="touched = touched + 1"
    />
  `,
})
class Host {
  readonly volume = signal(0);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly step = signal(1);
  readonly strokeWidth = signal(8);
  readonly suffix = signal('');
  readonly showValue = signal(true);
  readonly readonly = signal(false);
  readonly disabled = signal(false);
  readonly ariaLabel = signal<string | null>(null);
  touched = 0;
}

/**
 * A knob is a dial, but to everything except a sighted mouse user it is a
 * `slider` — so the role's promises are the contract: a name, a range, a
 * position that moves, and arrows / Home / End that move it. The geometry is
 * asserted through the rendered SVG rather than the component's computeds,
 * because the arc and the handle dot ARE what a consumer sees; a formula that
 * is merely close shows up as a dot drifting off its own track.
 *
 * `wr-knob` and `wr-rating` are near-identical templates — same `role="slider"`,
 * same `tabindex="interactive() ? 0 : -1"`, same `aria-disabled` — so where they
 * disagree, one of them is wrong. Two of these specs came from that comparison.
 */
describe('WrKnob', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const surface = (): HTMLElement => root().querySelector<HTMLElement>('[role="slider"]')!;
  const value = (): number => fixture.componentInstance.volume();
  const text = (): string => root().querySelector('.wr-knob__text')?.textContent?.trim() ?? '';

  const press = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    surface().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  /**
   * jsdom has no PointerEvent and no pointer capture, so the drag is driven with
   * a MouseEvent carrying the same `clientX` / `clientY` the handler reads, and
   * the capture calls are stubbed. The geometry still means something: with
   * `getBoundingClientRect()` all zeros the dial's centre is the origin, so a
   * point straight up is dead centre of the 270° arc.
   */
  const drag = (clientX: number, clientY: number, { button = 0, isPrimary = true } = {}): void => {
    const el = surface();
    el.setPointerCapture = () => undefined;
    el.releasePointerCapture = () => undefined;
    const event = new MouseEvent('pointerdown', { clientX, clientY, bubbles: true, cancelable: true, button });
    // `isPrimary` does not exist on `MouseEvent`, and reading it as `undefined`
    // would make the primary-pointer guard reject every synthetic event.
    Object.defineProperty(event, 'isPrimary', { value: isPrimary });
    el.dispatchEvent(event);
    fixture.detectChanges();
  };

  /**
   * Rebuild the fixture inside an app with a reading direction — the
   * `Directionality` an ngwr component injects, plus the document's own `dir`,
   * so the pair of specs at the bottom hold whichever of the two anyone later
   * reaches for.
   */
  const withDir = (direction: 'ltr' | 'rtl'): void => {
    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: direction, change: new Subject<'ltr' | 'rtl'>() } }],
    });
    document.documentElement.dir = direction;
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('dir');
    fixture.destroy();
  });

  it('presents itself as a slider with a range and a position', () => {
    expect(surface().getAttribute('aria-valuemin')).toBe('0');
    expect(surface().getAttribute('aria-valuemax')).toBe('100');
    expect(surface().getAttribute('aria-valuenow')).toBe('0');
    expect(surface().getAttribute('tabindex')).toBe('0');
  });

  it('names itself even when the consumer says nothing', () => {
    // No `provideWrI18n()` here, which is the default shape of a consuming app:
    // `useI18nText` has to reach the component's own English fallback.
    expect(surface().getAttribute('aria-label')).toBe('Value');

    fixture.componentInstance.ariaLabel.set('Master volume');
    fixture.detectChanges();
    expect(surface().getAttribute('aria-label')).toBe('Master volume');
  });

  it('steps with the arrows in both orientations', () => {
    press('ArrowRight');
    expect(value()).toBe(1);
    press('ArrowUp');
    expect(value()).toBe(2);
    press('ArrowLeft');
    expect(value()).toBe(1);
    press('ArrowDown');
    expect(value()).toBe(0);
  });

  it('takes ten steps at once with shift', () => {
    fixture.componentInstance.step.set(2);
    fixture.detectChanges();
    press('ArrowRight', { shiftKey: true });
    expect(value()).toBe(20);
  });

  it('jumps to the ends with Home and End', () => {
    press('End');
    expect(value()).toBe(100);
    press('Home');
    expect(value()).toBe(0);
  });

  it('stops at the ends instead of running past them', () => {
    press('Home');
    press('ArrowLeft');
    expect(value()).toBe(0);
    press('End');
    press('ArrowRight');
    expect(value()).toBe(100);
  });

  it('leaves keys it does not own to the page', () => {
    // A knob inside a dialog must not swallow Escape, and Tab has to keep moving
    // focus — so an unhandled key is neither prevented nor acted on.
    const escape = press('Escape');
    expect(escape.defaultPrevented).toBe(false);
    expect(value()).toBe(0);
  });

  it('reports the value it was given, and moves aria-valuenow with it', () => {
    fixture.componentInstance.volume.set(42);
    fixture.detectChanges();
    expect(surface().getAttribute('aria-valuenow')).toBe('42');
    expect(text()).toBe('42');
  });

  it('pulls an out-of-range write back into the range', async () => {
    // `[formField]` and `[(value)]` both write straight into the model, so the
    // clamp cannot live in the interaction handlers alone.
    fixture.componentInstance.volume.set(500);
    await fixture.whenStable();
    expect(value()).toBe(100);

    fixture.componentInstance.volume.set(-7);
    await fixture.whenStable();
    expect(value()).toBe(0);
  });

  it('respects a narrowed range', async () => {
    fixture.componentInstance.min.set(10);
    fixture.componentInstance.max.set(20);
    await fixture.whenStable();
    expect(value()).toBe(10);
    expect(surface().getAttribute('aria-valuemin')).toBe('10');

    press('End');
    expect(value()).toBe(20);
  });

  it('shows the suffix beside the value, and hides the text on request', () => {
    fixture.componentInstance.volume.set(60);
    fixture.componentInstance.suffix.set('%');
    fixture.detectChanges();
    expect(text()).toBe('60%');
    expect(root().querySelector('.wr-knob__suffix')?.textContent).toBe('%');

    fixture.componentInstance.showValue.set(false);
    fixture.detectChanges();
    expect(root().querySelector('.wr-knob__text')).toBeNull();
  });

  it('lets the browser decide which way the value and its unit read', () => {
    // ⚠️ This one guards the MECHANISM, not the rendering. jsdom runs no BiDi
    // algorithm, so the reordering itself is unassertable here and the attribute
    // is the whole of the fix.
    //
    // Measured in Chromium instead, inside an `dir="rtl"` paragraph, by walking
    // the rendered glyph boxes left to right: `40 dB` was drawn `dB 40` and
    // `-5 dB` as `dB 5-`, with the minus sign on the wrong end of the number. A
    // digit run is neutral against the letters beside it, so the algorithm splits
    // the phrase and reverses the halves. With `dir="auto"` both come back in
    // order, and an Arabic unit still reads right-to-left — which is correct for
    // Arabic, and is why this is not a hard `dir="ltr"`.
    //
    // `unicode-bidi: isolate` was measured doing nothing at all: it seals the
    // element off from its SURROUNDINGS, and the flip happens inside it.
    fixture.componentInstance.volume.set(40);
    fixture.componentInstance.suffix.set(' dB');
    fixture.detectChanges();

    const label = root().querySelector<HTMLElement>('.wr-knob__text')!;
    expect(label.getAttribute('dir')).toBe('auto');
    expect(label.textContent?.trim()).toBe('40 dB');
  });

  it('goes inert and announces it when disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(root().querySelector('.wr-knob--disabled')).not.toBeNull();
    expect(surface().getAttribute('aria-disabled')).toBe('true');
    expect(surface().getAttribute('tabindex')).toBe('-1');

    press('End');
    expect(value()).toBe(0);
  });

  it('announces that it is read-only rather than looking merely broken', () => {
    // Same contract `wr-rating` already keeps. Without this a read-only knob is
    // simply unresponsive: no `aria-readonly`, so a screen reader has nothing to
    // explain why the arrows do nothing.
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();

    expect(surface().getAttribute('aria-readonly')).toBe('true');
    expect(root().querySelector('.wr-knob--disabled')).toBeNull();

    press('End');
    expect(value()).toBe(0);
  });

  it('marks the field touched when the keyboard is what moved it', () => {
    // `touch` is how a bound field learns it may show its validation copy. It
    // fired on pointer-up only, so a keyboard-only user could set a value and
    // the field stayed untouched forever — `wr-slider` emits on its key path and
    // `wr-rating` on blur; a knob reached by Tab has neither.
    press('ArrowRight');
    surface().dispatchEvent(new FocusEvent('blur', { bubbles: false }));
    fixture.detectChanges();

    expect(fixture.componentInstance.touched).toBeGreaterThan(0);
  });

  it('keeps a fractional step off the binary-float cliff', () => {
    // Three tenths added in floating point is 0.30000000000000004, and this value
    // is not internal: it goes into `aria-valuenow` for a screen reader to read
    // out and into the dial's own centre text. `wr-slider` rounds at 6 decimals
    // for exactly this reason.
    fixture.componentInstance.step.set(0.1);
    fixture.detectChanges();
    press('ArrowRight');
    press('ArrowRight');
    press('ArrowRight');

    expect(value()).toBe(0.3);
    expect(surface().getAttribute('aria-valuenow')).toBe('0.3');
    expect(text()).toBe('0.3');
  });

  it('measures the step grid from the minimum, not from zero', () => {
    // With min 5 and step 10 the reachable values are 5, 15, … 55, 65 — a grid
    // anchored at 0 would land on 60, a value the arrows can never reach and no
    // consumer's `step` ever described.
    fixture.componentInstance.min.set(5);
    fixture.componentInstance.max.set(105);
    fixture.componentInstance.step.set(10);
    fixture.detectChanges();

    // Straight up from the centre is the middle of the 270° arc.
    drag(0, -100);
    expect(value()).toBe(55);
  });

  it('lands on the grid from either direction of travel', () => {
    fixture.componentInstance.min.set(5);
    fixture.componentInstance.max.set(105);
    fixture.componentInstance.step.set(10);
    fixture.detectChanges();

    // Home and End snap too — the same choice `wr-slider` makes, so a range that
    // is not a whole number of steps stops at the last reachable one rather than
    // inventing a value off the grid.
    press('End');
    expect(value()).toBe(105);
    press('Home');
    expect(value()).toBe(5);
    press('ArrowUp');
    expect(value()).toBe(15);
  });

  it('shows read-only as a state a consumer can style', () => {
    // `wr-rating` already carries `--readonly` for this; a knob that only stops
    // responding looks broken instead of deliberate.
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();
    expect(root().querySelector('.wr-knob--readonly')).not.toBeNull();
  });

  it('cannot be given a stroke so fat the arc inverts', () => {
    // Radius is `50 - strokeWidth / 2 - 0.5`, which goes negative past 99 — and a
    // negative radius is invalid in the SVG path grammar, so the browser drops the
    // arc and the dial silently disappears.
    fixture.componentInstance.strokeWidth.set(110);
    fixture.detectChanges();

    const d = root().querySelector('.wr-knob__track')!.getAttribute('d')!;
    const radii = /A (\S+) (\S+) /.exec(d)!;
    expect(Number(radii[1])).toBeGreaterThan(0);
    expect(Number(radii[2])).toBeGreaterThan(0);
  });

  it('draws the handle on its own track', () => {
    // Radius is `50 - strokeWidth / 2 - 0.5` in a 100×100 viewBox: 45.5 at the
    // default stroke. Half-way round the 270° arc is 12 o'clock, so the dot sits
    // on the vertical centre line — the assertion that catches a swapped sin/cos.
    fixture.componentInstance.volume.set(50);
    fixture.detectChanges();

    const handle = root().querySelector('.wr-knob__handle')!;
    expect(Number(handle.getAttribute('cx'))).toBeCloseTo(50, 5);
    expect(Number(handle.getAttribute('cy'))).toBeCloseTo(4.5, 5);

    // At the minimum the dot is at 7 o'clock: left of centre and below it.
    fixture.componentInstance.volume.set(0);
    fixture.detectChanges();
    expect(Number(handle.getAttribute('cx'))).toBeLessThan(50);
    expect(Number(handle.getAttribute('cy'))).toBeGreaterThan(50);
  });

  it('sweeps the filled arc from nothing to the full track', () => {
    const filled = (): string => root().querySelector('.wr-knob__value')!.getAttribute('d')!;
    const track = root().querySelector('.wr-knob__track')!.getAttribute('d')!;

    // At the minimum the filled arc is degenerate — same start and end point.
    const ends = /^M (\S+) (\S+) A \S+ \S+ 0 \d 1 (\S+) (\S+)$/.exec(filled());
    expect(ends).not.toBeNull();
    const [, sx, sy, ex, ey] = ends!;
    expect(sx).toBe(ex);
    expect(sy).toBe(ey);

    press('End');
    expect(filled()).toBe(track);
    // 270° needs the large-arc flag, or the browser draws the short way round.
    expect(track).toContain(' 0 1 1 ');
  });

  it('maps a drag on the dial to a value', () => {
    // Straight up from the centre is the middle of the arc.
    drag(0, -100);
    expect(value()).toBe(50);
    expect(surface().getAttribute('aria-valuenow')).toBe('50');
  });

  it('takes focus when the pointer grabs the dial', () => {
    // `pointerdown` is prevented so the drag does not select text, which also
    // suppresses the click's default focus — leaving the arrows dead until the dial
    // was reached again with Tab.
    drag(0, -100);
    expect(document.activeElement).toBe(surface());
  });

  it('ignores a press that is not the primary button or pointer', () => {
    drag(0, -100, { button: 2 });
    expect(value()).toBe(0);

    drag(0, -100, { isPrimary: false });
    expect(value()).toBe(0);
  });

  it('ignores a drag when it is not interactive', () => {
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();
    drag(0, -100);
    expect(value()).toBe(0);
  });

  it('turns the same way on ArrowRight under dir="rtl" as under ltr', () => {
    // A dial is not reading order. The arc is SVG geometry in a fixed viewBox and
    // `dir` mirrors no part of it: the minimum stays at 7 o'clock and the maximum
    // at 5 o'clock, so the value still rises toward the visual RIGHT. Arrows
    // follow visual order — which here means NOT flipping them, or `→` would
    // drive the handle away from the side it visibly travels toward. Hence a twin
    // that asserts the same outcome rather than the opposite one: that agreement
    // is the finding.
    // Start mid-range, deliberately. From the default 0 — which IS `min` — a
    // flipped implementation decrements into the clamp and comes back up to the
    // same 1 the correct one reaches, so the walk agrees for the wrong reason and
    // the spec passes over an inverted dial. 50 is clear of both stops, so every
    // press is visible in the answer.
    const walk = (): number => {
      fixture.componentInstance.volume.set(50);
      fixture.detectChanges();
      press('ArrowRight');
      press('ArrowRight');
      press('ArrowLeft');
      return value();
    };

    withDir('ltr');
    const ltr = walk();

    withDir('rtl');

    expect([ltr, walk()]).toEqual([51, 51]);
  });

  it('maps a drag to the same angle under dir="rtl" as under ltr', () => {
    // The pointer maths is an angle about the dial's centre, not a ratio along
    // the inline axis, so there is no inline-start edge to measure from and
    // nothing to mirror.
    //
    // Dragged OFF the vertical axis, deliberately: straight up is dx = 0, the one
    // point where mirroring x changes nothing, so `drag(0, -100)` reads 50 in both
    // directions whether or not the dial mirrors. Up-and-right is 45° into the
    // sweep — 67 upright, 33 mirrored — so the agreement below is evidence.
    withDir('ltr');
    drag(100, -100);
    const ltr = value();

    withDir('rtl');
    drag(100, -100);

    expect([ltr, value()]).toEqual([67, 67]);
  });
});
