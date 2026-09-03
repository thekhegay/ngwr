import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrGradientText } from './gradient-text';
import type { WrGradientTextDirection } from './interfaces';

@Component({
  imports: [WrGradientText],
  template: `
    <wr-gradient-text
      [colors]="colors()"
      [animationSpeed]="speed()"
      [direction]="direction()"
      [showBorder]="showBorder()"
      [yoyo]="yoyo()"
      [pauseOnHover]="pauseOnHover()"
    >
      Shiny
    </wr-gradient-text>
  `,
})
class Host {
  readonly colors = signal<readonly string[]>(['#111111', '#222222']);
  readonly speed = signal(8);
  readonly direction = signal<WrGradientTextDirection>('horizontal');
  readonly showBorder = signal(false);
  readonly yoyo = signal(true);
  readonly pauseOnHover = signal(false);
}

/**
 * The animation is CSS (and is disabled by a `prefers-reduced-motion` block in the
 * stylesheet); what the component computes is the gradient itself, and that is
 * exact — including the duplicated first stop, which is what makes the loop
 * seamless rather than snapping back at the wrap.
 */
describe('WrGradientText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-gradient-text')!;
  const prop = (name: string): string => host().style.getPropertyValue(name);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('repeats the first colour at the end so the sweep can loop', () => {
    expect(prop('--wr-gradient-text-image')).toBe('linear-gradient(to right, #111111, #222222, #111111)');
  });

  it('falls back to the theme colours for an empty list', () => {
    fixture.componentInstance.colors.set([]);
    fixture.detectChanges();

    expect(prop('--wr-gradient-text-image')).toContain('linear-gradient(');
    expect(prop('--wr-gradient-text-image').split(',').length).toBeGreaterThan(3);
  });

  it('turns the gradient and stretches it along the axis it travels', () => {
    expect(prop('--wr-gradient-text-size')).toBe('300% 100%');

    fixture.componentInstance.direction.set('vertical');
    fixture.detectChanges();
    expect(prop('--wr-gradient-text-size')).toBe('100% 300%');
    expect(prop('--wr-gradient-text-image')).toContain('to bottom');
    expect(host().className).toContain('wr-gradient-text--vertical');

    fixture.componentInstance.direction.set('diagonal');
    fixture.detectChanges();
    expect(prop('--wr-gradient-text-size')).toBe('300% 300%');
    expect(host().className).toContain('wr-gradient-text--diagonal');
  });

  it('publishes the duration in seconds', () => {
    expect(prop('--wr-gradient-text-duration')).toBe('8s');

    fixture.componentInstance.speed.set(2.5);
    fixture.detectChanges();
    expect(prop('--wr-gradient-text-duration')).toBe('2.5s');
  });

  it('names each option it was given', () => {
    expect(host().className).toContain('wr-gradient-text--yoyo');
    expect(host().className).not.toContain('wr-gradient-text--border');

    fixture.componentInstance.showBorder.set(true);
    fixture.componentInstance.pauseOnHover.set(true);
    fixture.componentInstance.yoyo.set(false);
    fixture.detectChanges();

    expect(host().className).toContain('wr-gradient-text--border');
    expect(host().className).toContain('wr-gradient-text--pause-on-hover');
    expect(host().className).not.toContain('wr-gradient-text--yoyo');
  });

  it('projects its text', () => {
    expect(host().textContent.trim()).toBe('Shiny');
  });

  it('refuses a colour that would escape the gradient it is composed into', () => {
    // Verbatim from a security audit of 13.0.0: each entry is interpolated into
    // `linear-gradient(<dir>, …)`, so a value that balances the parens around it
    // closes the gradient, adds a `url()` layer the browser fetches, and reopens
    // one so the declaration still parses. The audit recorded the request.
    fixture.componentInstance.colors.set([
      'red), url("https://beacon.example/gradient-colors"), linear-gradient(red, red',
      'red',
    ]);
    fixture.detectChanges();

    expect(prop('--wr-gradient-text-image')).not.toContain('beacon.example');
    // One bad entry discards the whole palette rather than being dropped from it:
    // a gradient missing one stop is a silent design change, and the default is
    // the honest fallback.
    expect(prop('--wr-gradient-text-image')).toBe('linear-gradient(to right, #5227FF, #FF9FFC, #B497CF, #5227FF)');
  });
});
