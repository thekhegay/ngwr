import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrShinyText } from './shiny-text';

@Component({
  imports: [WrShinyText],
  template: `
    <wr-shiny-text
      [text]="text()"
      [speed]="speed()"
      [delay]="delay()"
      [disabled]="disabled()"
      [yoyo]="yoyo()"
      [direction]="direction()"
      [pauseOnHover]="pauseOnHover()"
    />
  `,
})
class Host {
  readonly text = signal('Just released');
  readonly speed = signal(2);
  readonly delay = signal(0);
  readonly disabled = signal(false);
  readonly yoyo = signal(false);
  readonly direction = signal<'left' | 'right'>('left');
  readonly pauseOnHover = signal(false);
}

/**
 * One CSS animation whose whole configuration is host bindings. The interesting
 * one is the duration: the pause between sweeps is folded INTO it (the keyframe
 * finishes early and holds), so `speed + delay` is the number that has to appear.
 */
describe('WrShinyText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-shiny-text')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the text it was given', () => {
    expect(host().textContent).toBe('Just released');
  });

  it('runs for as long as the sweep plus the pause', () => {
    expect(host().style.animationDuration).toBe('2s');

    fixture.componentInstance.delay.set(3);
    fixture.detectChanges();
    expect(host().style.animationDuration).toBe('5s');
  });

  it('paints the sweep as a background gradient', () => {
    expect(host().style.backgroundImage).toContain('gradient');
  });

  it('names each option it was given', () => {
    expect(host().className).toBe('wr-shiny-text');

    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.yoyo.set(true);
    fixture.componentInstance.pauseOnHover.set(true);
    fixture.componentInstance.direction.set('right');
    fixture.detectChanges();

    for (const modifier of ['paused', 'yoyo', 'pause-on-hover', 'reverse']) {
      expect(host().className, modifier).toContain(`wr-shiny-text--${modifier}`);
    }
  });
});
