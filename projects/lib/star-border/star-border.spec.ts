import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrStarBorderMode, WrStarBorderRays } from './interfaces';
import { WrStarBorder } from './star-border';

@Component({
  imports: [WrStarBorder],
  template: `
    <wr-star-border [color]="color()" [speed]="speed()" [thickness]="thickness()" [mode]="mode()" [rays]="rays()">
      <span class="label">Upgrade</span>
    </wr-star-border>
  `,
})
class Host {
  readonly color = signal<string | null>(null);
  readonly speed = signal(6);
  readonly thickness = signal(1);
  readonly mode = signal<WrStarBorderMode>('infinite');
  readonly rays = signal<WrStarBorderRays>('mirror');
}

describe('WrStarBorder', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-star-border')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('carries the defaults with no modifiers', () => {
    expect(host().className).toBe('wr-star-border');
    expect(host().style.getPropertyValue('--wr-star-border-speed')).toBe('6s');
    expect(host().style.padding).toBe('1px 0px');
  });

  it('leaves the colour to the theme until one is given', () => {
    expect(host().style.getPropertyValue('--wr-star-border-color')).toBe('');

    fixture.componentInstance.color.set('var(--wr-color-success)');
    fixture.detectChanges();
    expect(host().style.getPropertyValue('--wr-star-border-color')).toBe('var(--wr-color-success)');
  });

  it('names the hover mode and the single-ray variant', () => {
    fixture.componentInstance.mode.set('hover');
    fixture.componentInstance.rays.set('single');
    fixture.detectChanges();

    expect(host().className).toBe('wr-star-border wr-star-border--hover wr-star-border--single');
  });

  it('bleeds the rays by the thickness it was given', () => {
    fixture.componentInstance.thickness.set(4);
    fixture.detectChanges();

    expect(host().style.padding).toBe('4px 0px');
  });

  it('projects its content into the panel', () => {
    expect(host().querySelector('.label')!.textContent).toBe('Upgrade');
  });
});
