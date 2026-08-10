import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSpotlightCard } from './spotlight-card';

@Component({
  imports: [WrSpotlightCard],
  template: `
    <wr-spotlight-card [spotlightColor]="spotlightColor()" [radius]="radius()">
      <span class="body">Card</span>
    </wr-spotlight-card>
  `,
})
class Host {
  readonly spotlightColor = signal<string | null>(null);
  readonly radius = signal(80);
}

/**
 * The spotlight is a gradient positioned from the pointer, so the component's whole
 * output is three custom properties. jsdom reports a zero-sized rect, which is
 * exactly what makes the coordinate maths checkable: the offset IS the client
 * position when the box starts at the origin.
 */
describe('WrSpotlightCard', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-spotlight-card')!;
  const prop = (name: string): string => host().style.getPropertyValue(name);

  const move = (clientX: number, clientY: number): void => {
    const event = new Event('mousemove', { bubbles: true });
    Object.assign(event, { clientX, clientY });
    host().dispatchEvent(event);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('publishes the radius as a percentage', () => {
    expect(prop('--wr-spotlight-radius')).toBe('80%');

    fixture.componentInstance.radius.set(40);
    fixture.detectChanges();
    expect(prop('--wr-spotlight-radius')).toBe('40%');
  });

  it('leaves the colour to the theme until one is given', () => {
    expect(prop('--wr-spotlight-color')).toBe('');

    fixture.componentInstance.spotlightColor.set('rgba(255, 0, 0, 0.2)');
    fixture.detectChanges();
    expect(prop('--wr-spotlight-color')).toBe('rgba(255, 0, 0, 0.2)');
  });

  it('follows the pointer, in coordinates relative to its own box', () => {
    move(120, 40);

    expect(prop('--wr-spotlight-x')).toBe('120px');
    expect(prop('--wr-spotlight-y')).toBe('40px');
  });

  it('projects its content', () => {
    expect(host().querySelector('.body')!.textContent).toBe('Card');
  });
});
