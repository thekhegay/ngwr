import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTiltCard } from './tilt-card';

@Component({
  imports: [WrTiltCard],
  template: `
    <wr-tilt-card [maxTilt]="maxTilt()" [perspective]="perspective()" [scale]="scale()" [glare]="glare()">
      <span class="body">Card</span>
    </wr-tilt-card>
  `,
})
class Host {
  readonly maxTilt = signal(12);
  readonly perspective = signal(800);
  readonly scale = signal(1.03);
  readonly glare = signal(false);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * The tilt is a `transform` written straight onto the host, so the maths is
 * checkable exactly — given a box, which jsdom does not provide and this spec
 * therefore stubs. A 200×100 box at the origin makes each pointer position a
 * fraction that can be read back out of the transform.
 */
describe('WrTiltCard', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-tilt-card')!;

  const move = (clientX: number, clientY: number): void => {
    const event = new Event('pointermove', { bubbles: true });
    Object.assign(event, { clientX, clientY, pointerId: 1, isPrimary: true, button: 0 });
    host().dispatchEvent(event);
    fixture.detectChanges();
  };

  const mount = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    host().getBoundingClientRect = (): DOMRect => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
  };

  beforeEach(() => mount());

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('sits flat until a pointer arrives', () => {
    expect(host().style.transform).toBe('');
    expect(host().style.transformStyle).toBe('preserve-3d');
  });

  it('tilts away from the pointer, in proportion to how far off centre it is', () => {
    // Dead centre: no rotation, but the hover scale still applies.
    move(100, 50);
    expect(host().style.transform).toBe('perspective(800px) rotateX(0deg) rotateY(0deg) scale(1.03)');

    // Right edge, top edge: full tilt on both axes, opposite signs.
    move(200, 0);
    expect(host().style.transform).toBe('perspective(800px) rotateX(6deg) rotateY(6deg) scale(1.03)');

    move(0, 100);
    expect(host().style.transform).toBe('perspective(800px) rotateX(-6deg) rotateY(-6deg) scale(1.03)');
  });

  it('honours the tilt, perspective and scale it was given', () => {
    fixture.componentInstance.maxTilt.set(30);
    fixture.componentInstance.perspective.set(1200);
    fixture.componentInstance.scale.set(1.1);
    fixture.detectChanges();
    move(200, 50);

    expect(host().style.transform).toBe('perspective(1200px) rotateX(0deg) rotateY(15deg) scale(1.1)');
  });

  it('refuses a scale that would shrink the card and a perspective that would flatten it', () => {
    fixture.componentInstance.scale.set(0.5);
    fixture.componentInstance.perspective.set(1);
    fixture.detectChanges();
    move(100, 50);

    expect(host().style.transform).toBe('perspective(100px) rotateX(0deg) rotateY(0deg) scale(1)');
  });

  it('drops back flat when the pointer leaves', () => {
    move(200, 0);
    host().dispatchEvent(new Event('pointerleave', { bubbles: true }));
    fixture.detectChanges();

    expect(host().style.transform).toBe('');
  });

  it('stays flat for someone who asked for less motion', () => {
    mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    move(200, 0);

    expect(host().style.transform).toBe('');
  });

  it('adds the glare overlay only when asked, and keeps it out of the tree', () => {
    expect(host().querySelector('.wr-tilt-glare')).toBeNull();

    fixture.componentInstance.glare.set(true);
    fixture.detectChanges();
    const glare = host().querySelector('.wr-tilt-glare')!;
    expect(glare.getAttribute('aria-hidden')).toBe('true');

    fixture.componentInstance.glare.set(false);
    fixture.detectChanges();
    expect(host().querySelector('.wr-tilt-glare')).toBeNull();
  });

  it('moves the glare with the pointer', () => {
    fixture.componentInstance.glare.set(true);
    fixture.detectChanges();
    move(50, 25);

    expect(host().style.getPropertyValue('--wr-tilt-glare-x')).toBe('25%');
    expect(host().style.getPropertyValue('--wr-tilt-glare-y')).toBe('25%');
  });

  it('gives the host back the styles the glare borrowed', () => {
    // `installGlare` writes `overflow: hidden` (and `position` on a static host) so
    // the overlay clips and anchors. Both used to stay behind for good, so a card
    // that clipped nothing before `[glare]` was switched on kept clipping after it
    // was switched off.
    fixture.componentInstance.glare.set(true);
    fixture.detectChanges();
    move(50, 25);
    expect(host().style.overflow).toBe('hidden');

    fixture.componentInstance.glare.set(false);
    fixture.detectChanges();

    expect(host().style.overflow).toBe('');
    expect(host().style.position).toBe('');
    expect(host().style.getPropertyValue('--wr-tilt-glare-x')).toBe('');
  });

  it('takes the glare away with itself when it is destroyed', () => {
    fixture.componentInstance.glare.set(true);
    fixture.detectChanges();
    const element = host();
    fixture.destroy();

    expect(element.querySelector('.wr-tilt-glare')).toBeNull();
  });

  it('projects its content', () => {
    expect(host().querySelector('.body')!.textContent).toBe('Card');
  });
});
