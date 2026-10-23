import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSpotlight } from './spotlight';

@Component({
  imports: [WrSpotlight],
  template: `<div wrSpotlight [resetX]="resetX()" [resetY]="resetY()"></div>`,
})
class Host {
  readonly resetX = signal('20%');
  readonly resetY = signal('80%');
}

/**
 * The directive writes two custom properties onto its host, and those inline values
 * are the whole of its output — so they are read straight off the host's `style`.
 */
describe('WrSpotlight', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const el = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('[wrSpotlight]')!;
  const at = (): [string, string] => [
    el().style.getPropertyValue('--wr-spotlight-x'),
    el().style.getPropertyValue('--wr-spotlight-y'),
  ];

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('rests where it is told to before the pointer has ever been over it', () => {
    // Read in the constructor, the inputs were still unbound and this said 50% / 50%
    // until the first pointerleave.
    expect(at()).toEqual(['20%', '80%']);
  });

  it('follows a rest point changed at runtime, and goes back to it on leave', () => {
    fixture.componentInstance.resetX.set('10%');
    fixture.detectChanges();
    expect(at()).toEqual(['10%', '80%']);

    el().dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 0, clientY: 0 }));
    // While the pointer is over it, a changed rest point waits for it to leave.
    fixture.componentInstance.resetY.set('30%');
    fixture.detectChanges();
    expect(at()).not.toEqual(['10%', '30%']);

    el().dispatchEvent(new Event('pointerleave'));
    expect(at()).toEqual(['10%', '30%']);
  });

  it('takes its properties off the host when it goes away', () => {
    fixture.destroy();
    expect(at()).toEqual(['', '']);
  });
});
