import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBorderGlow } from './border-glow';

@Component({
  imports: [WrBorderGlow],
  template: `
    <wr-border-glow
      [borderRadius]="borderRadius()"
      [glowRadius]="glowRadius()"
      [coneSpread]="coneSpread()"
      [colors]="colors()"
      [backgroundColor]="backgroundColor()"
    >
      <span class="body">Card</span>
    </wr-border-glow>
  `,
})
class Host {
  readonly borderRadius = signal(28);
  readonly glowRadius = signal(40);
  readonly coneSpread = signal(25);
  readonly colors = signal<readonly string[] | null>(null);
  readonly backgroundColor = signal<string | null>(null);
}

/**
 * Two numbers do all the work here — the angle of the cursor around the centre and
 * how close it is to the perimeter — and both are written onto the host as custom
 * properties for the stylesheet to read. With a stubbed 200×100 box each pointer
 * position has one right answer, including the two that are easy to get wrong:
 * dead centre (no angle, no proximity) and a corner (proximity 1 on the axis that
 * runs out first, not on both).
 */
describe('WrBorderGlow', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-border-glow')!;
  const prop = (name: string): string => host().style.getPropertyValue(name);
  const angle = (): number => Number.parseFloat(prop('--wr-border-glow-angle'));
  const proximity = (): number => Number.parseFloat(prop('--wr-border-glow-edge-proximity'));

  const move = (clientX: number, clientY: number): void => {
    const event = new Event('pointermove', { bubbles: true });
    Object.assign(event, { clientX, clientY, pointerId: 1, isPrimary: true });
    host().dispatchEvent(event);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    host().getBoundingClientRect = (): DOMRect => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
  });

  afterEach(() => fixture.destroy());

  it('publishes the geometry the stylesheet reads', () => {
    expect(prop('--wr-border-glow-radius')).toBe('28px');

    fixture.componentInstance.borderRadius.set(4);
    fixture.detectChanges();
    expect(prop('--wr-border-glow-radius')).toBe('4px');
  });

  it('measures the angle from the top, clockwise', () => {
    move(100, 0); // straight up from the centre
    expect(angle()).toBeCloseTo(0, 1);

    move(200, 50); // right
    expect(angle()).toBeCloseTo(90, 1);

    move(100, 100); // down
    expect(angle()).toBeCloseTo(180, 1);

    move(0, 50); // left
    expect(angle()).toBeCloseTo(270, 1);
  });

  it('reports no angle at the exact centre rather than an arbitrary one', () => {
    move(100, 50);

    expect(angle()).toBe(0);
    expect(proximity()).toBe(0);
  });

  it('reaches full proximity at the perimeter and half way between', () => {
    move(200, 50);
    expect(proximity()).toBeCloseTo(100, 1);

    move(150, 50);
    expect(proximity()).toBeCloseTo(50, 1);
  });

  it('takes the nearer edge when the cursor is diagonal', () => {
    // At (200, 100) the horizontal axis runs out at the same moment as the
    // vertical one, so a corner is fully lit — but at (150, 100) the vertical
    // edge is reached first and the value must follow THAT one, not the average.
    move(200, 100);
    expect(proximity()).toBeCloseTo(100, 1);

    move(150, 100);
    expect(proximity()).toBeCloseTo(100, 1);
  });

  it('projects its content', () => {
    expect(host().querySelector('.body')!.textContent).toBe('Card');
  });

  it('refuses colours that would escape the gradients they are composed into', () => {
    // Verbatim from a security audit of 13.0.0. Each entry lands inside
    // `radial-gradient(at <pos>, <colour> 0px, transparent 50%)`, and the
    // background var inside a `linear-gradient()` and a `background` shorthand —
    // so a value balancing the parens around it adds a `url()` the browser
    // fetches. The audit recorded a real request for both.
    fixture.componentInstance.colors.set([
      'red), url("https://beacon.example/borderglow-colors"), radial-gradient(circle at 0% 0%, red',
    ]);
    fixture.componentInstance.backgroundColor.set('url("https://beacon.example/borderglow-bg")');
    fixture.detectChanges();

    expect(prop('--wr-border-glow-gradient-1')).not.toContain('beacon.example');
    expect(prop('--wr-border-glow-bg')).toBe('');

    // A real colour still lands, so the guard costs nothing legitimate.
    fixture.componentInstance.backgroundColor.set('oklch(0.7 0.1 200)');
    fixture.detectChanges();
    expect(prop('--wr-border-glow-bg')).toBe('oklch(0.7 0.1 200)');
  });
});
