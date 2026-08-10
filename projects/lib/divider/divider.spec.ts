import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrColor } from 'ngwr/theme';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDivider } from './divider';
import type { WrDividerAlign, WrDividerType } from './interfaces';

@Component({
  imports: [WrDivider],
  template: `<wr-divider [color]="color()" [type]="type()" [width]="width()" [align]="align()">OR</wr-divider>`,
})
class Host {
  readonly color = signal<WrColor | null>(null);
  readonly type = signal<WrDividerType>('solid');
  readonly width = signal(1);
  readonly align = signal<WrDividerAlign>('center');
}

/**
 * Pins the class list and the custom property, both public API. Note what is NOT
 * asserted: whether a screen reader reads the projected `OR`. It does not —
 * `role="separator"` makes its children presentational — and that is recorded in
 * ROADMAP as an open design question rather than papered over here.
 */
describe('WrDivider', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-divider')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is a separator carrying its type, with no colour or alignment by default', () => {
    expect(host().getAttribute('role')).toBe('separator');
    expect(host().className).toBe('wr-divider wr-divider--solid');
  });

  it('names the line style', () => {
    for (const type of ['dashed', 'dotted'] as const) {
      fixture.componentInstance.type.set(type);
      fixture.detectChanges();
      expect(host().className).toBe(`wr-divider wr-divider--${type}`);
    }
  });

  it('adds a colour modifier only when one is given', () => {
    fixture.componentInstance.color.set('danger');
    fixture.detectChanges();
    expect(host().className).toContain('wr-divider--danger');

    fixture.componentInstance.color.set(null);
    fixture.detectChanges();
    expect(host().className).toBe('wr-divider wr-divider--solid');
  });

  it('adds an alignment modifier for everything but the centre', () => {
    for (const align of ['start', 'end'] as const) {
      fixture.componentInstance.align.set(align);
      fixture.detectChanges();
      expect(host().className).toContain(`wr-divider--${align}`);
    }

    fixture.componentInstance.align.set('center');
    fixture.detectChanges();
    expect(host().className).not.toContain('wr-divider--center');
  });

  it('publishes the thickness as a custom property', () => {
    expect(host().style.getPropertyValue('--wr-divider-width')).toBe('1px');

    fixture.componentInstance.width.set(4);
    fixture.detectChanges();
    expect(host().style.getPropertyValue('--wr-divider-width')).toBe('4px');
  });

  it('projects a label into the line', () => {
    expect(host().textContent.trim()).toBe('OR');
  });
});
