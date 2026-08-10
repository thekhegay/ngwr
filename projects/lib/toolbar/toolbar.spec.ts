import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrToolbar } from './toolbar';

@Component({
  imports: [WrToolbar],
  template: `
    <wr-toolbar [responsive]="responsive()">
      <span wrToolbarStart class="start">back</span>
      <span wrToolbarCenter class="center">title</span>
      <span wrToolbarEnd class="end">save</span>
    </wr-toolbar>
  `,
})
class Host {
  readonly responsive = signal(false);
}

/**
 * Three named zones, each projected by attribute. The zones always render — the
 * stylesheet collapses the empty ones with `:empty`, which is why an unused zone
 * costs no space and why the DOM can be asserted unconditionally.
 */
describe('WrToolbar', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-toolbar')!;
  const zone = (name: string): HTMLElement => root().querySelector<HTMLElement>(`.wr-toolbar__zone--${name}`)!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is announced as a toolbar', () => {
    expect(host().getAttribute('role')).toBe('toolbar');
  });

  it('routes each slot to its own zone', () => {
    expect(zone('start').querySelector('.start')).not.toBeNull();
    expect(zone('center').querySelector('.center')).not.toBeNull();
    expect(zone('end').querySelector('.end')).not.toBeNull();
  });

  it('renders all three zones even when a slot is unused', () => {
    // `:empty` in the stylesheet collapses them, so the layout stays symmetric
    // without the template having to know what was projected.
    @Component({ imports: [WrToolbar], template: `<wr-toolbar><span wrToolbarEnd>save</span></wr-toolbar>` })
    class OneSlot {}

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const one = TestBed.createComponent(OneSlot);
    one.detectChanges();

    expect((one.nativeElement as HTMLElement).querySelectorAll('.wr-toolbar__zone').length).toBe(3);
    one.destroy();
  });

  it('takes the responsive modifier only when asked', () => {
    expect(host().className).toBe('wr-toolbar');

    fixture.componentInstance.responsive.set(true);
    fixture.detectChanges();
    expect(host().className).toContain('wr-toolbar--responsive');
  });
});
