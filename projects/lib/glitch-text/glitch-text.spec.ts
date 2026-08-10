import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrGlitchText } from './glitch-text';

@Component({
  imports: [WrGlitchText],
  template: `
    <wr-glitch-text
      [text]="text()"
      [speed]="speed()"
      [enableShadows]="enableShadows()"
      [enableOnHover]="enableOnHover()"
      [background]="background()"
    />
  `,
})
class Host {
  readonly text = signal('GLITCH');
  readonly speed = signal(1);
  readonly enableShadows = signal(true);
  readonly enableOnHover = signal(true);
  readonly background = signal('');
}

/**
 * The two clone layers are `::before` / `::after` reading `data-text`, so the text
 * has to be on the host as an ATTRIBUTE as well as in the content — that pairing is
 * the whole trick, and a rename of either half breaks the effect silently.
 */
describe('WrGlitchText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-glitch-text')!;
  const prop = (name: string): string => host().style.getPropertyValue(name);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the text and mirrors it into the attribute the clones read', () => {
    expect(host().textContent).toBe('GLITCH');
    expect(host().getAttribute('data-text')).toBe('GLITCH');

    fixture.componentInstance.text.set('OTHER');
    fixture.detectChanges();
    expect(host().getAttribute('data-text')).toBe('OTHER');
  });

  it('gives the two clones different durations, both scaled by speed', () => {
    // Different multiples on purpose: identical durations would tear in lockstep
    // and read as one shifted copy rather than as a glitch.
    expect(prop('--wr-glitch-text-before-duration')).toBe('2s');
    expect(prop('--wr-glitch-text-after-duration')).toBe('3s');

    fixture.componentInstance.speed.set(0.5);
    fixture.detectChanges();
    expect(prop('--wr-glitch-text-before-duration')).toBe('1s');
    expect(prop('--wr-glitch-text-after-duration')).toBe('1.5s');
  });

  it('drops the colour split when asked', () => {
    expect(prop('--wr-glitch-text-before-shadow')).toContain('var(--wr-color-info)');

    fixture.componentInstance.enableShadows.set(false);
    fixture.detectChanges();
    expect(prop('--wr-glitch-text-before-shadow')).toBe('none');
    expect(prop('--wr-glitch-text-after-shadow')).toBe('none');
  });

  it('idles until hover unless told otherwise', () => {
    expect(host().className).toContain('wr-glitch-text--hover-only');

    fixture.componentInstance.enableOnHover.set(false);
    fixture.detectChanges();
    expect(host().className).not.toContain('wr-glitch-text--hover-only');
  });

  it('leaves the slice background unset until one is given', () => {
    expect(prop('--wr-glitch-text-bg')).toBe('');

    fixture.componentInstance.background.set('#101010');
    fixture.detectChanges();
    expect(prop('--wr-glitch-text-bg')).toBe('#101010');
  });
});
