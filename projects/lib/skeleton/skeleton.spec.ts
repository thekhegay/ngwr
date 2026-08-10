import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrColor } from 'ngwr/theme';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSkeleton } from './skeleton';

@Component({
  imports: [WrSkeleton],
  template: `<wr-skeleton [color]="color()" [animated]="animated()" />`,
})
class Host {
  readonly color = signal<WrColor>('light');
  readonly animated = signal(true);
}

/**
 * A placeholder with no content, so everything it says it says through attributes:
 * `aria-busy` marks the region as loading, and the shimmer is a class the theme
 * animates (and disables under `prefers-reduced-motion`, which lives in the SCSS).
 */
describe('WrSkeleton', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-skeleton')!;
  /** Sorted class set — DOM class order is the binding's diff order, not the
   * order the component wrote. */
  const classes = (): string[] => [...host().classList].sort();

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('announces itself as busy', () => {
    expect(host().getAttribute('aria-busy')).toBe('true');
    expect(host().getAttribute('aria-live')).toBe('polite');
  });

  it('carries the colour and the shimmer by default', () => {
    expect(classes()).toEqual(['wr-skeleton', 'wr-skeleton--animated', 'wr-skeleton--light']);
  });

  it('drops the shimmer when asked', () => {
    fixture.componentInstance.animated.set(false);
    fixture.detectChanges();

    expect(classes()).toEqual(['wr-skeleton', 'wr-skeleton--light']);
  });

  it('names every intent', () => {
    for (const color of ['primary', 'medium', 'dark'] as const) {
      fixture.componentInstance.color.set(color);
      fixture.detectChanges();
      expect(host().className).toContain(`wr-skeleton--${color}`);
    }
  });

  it('renders nothing inside itself', () => {
    // The box is the placeholder; anything in it would be read out as content
    // that is not there yet.
    expect(host().childNodes.length).toBe(0);
  });
});
