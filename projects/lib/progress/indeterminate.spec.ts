import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrProgress } from './progress';

@Component({
  imports: [WrProgress],
  template: `<wr-progress [value]="42" [indeterminate]="indeterminate()" />`,
})
class Host {
  readonly indeterminate = signal(false);
}

describe('WrProgress indeterminate', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-progress')!;
  const bar = (): HTMLElement => host().querySelector<HTMLElement>('.wr-progress__bar')!;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('is determinate by default', () => {
    expect(host().classList.contains('wr-progress--indeterminate')).toBe(false);
    expect(host().getAttribute('aria-valuenow')).toBe('42');
    expect(bar().style.width).toBe('42%');
  });

  it('drops the value it does not know, from the bar and from the announcement', async () => {
    fixture.componentInstance.indeterminate.set(true);
    await fixture.whenStable();

    expect(host().classList.contains('wr-progress--indeterminate')).toBe(true);
    expect(host().hasAttribute('aria-valuenow')).toBe(false);
    expect(bar().style.width).toBe('');
    // Still a progressbar with a range and a name.
    expect(host().getAttribute('role')).toBe('progressbar');
    expect(host().getAttribute('aria-label')).toBe('Progress');
  });

  it('takes the value back when it is known again', async () => {
    fixture.componentInstance.indeterminate.set(true);
    await fixture.whenStable();
    fixture.componentInstance.indeterminate.set(false);
    await fixture.whenStable();

    expect(host().getAttribute('aria-valuenow')).toBe('42');
    expect(bar().style.width).toBe('42%');
  });
});
