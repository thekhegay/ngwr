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
 * Pins the class list and the custom property, both public API — plus the one
 * thing that used to be missing from the accessible tree. `role="separator"` makes
 * the host's children presentational and a separator is named by the author only,
 * so the projected `OR` was visible to everyone but assistive tech; the component
 * now copies it into `aria-label`, and these tests hold that copy honest.
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

  it('names the separator with that label', async () => {
    // Without this the projected text is drawn and announced as nothing: a
    // separator's children are presentational, and its name comes from the author.
    await fixture.whenStable();

    expect(host().getAttribute('aria-label')).toBe('OR');
  });
});

@Component({
  imports: [WrDivider],
  template: `
    <wr-divider />
    <wr-divider aria-label="End of section">OR</wr-divider>
    <wr-divider>{{ label() }}</wr-divider>
  `,
})
class LabelHost {
  readonly label = signal('Or');
}

describe('WrDivider naming', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<LabelHost>>;

  const dividers = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('wr-divider'),
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(LabelHost);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('leaves a bare rule unnamed', () => {
    expect(dividers()[0].getAttribute('aria-label')).toBeNull();
  });

  it('never overwrites a name the consumer wrote', () => {
    expect(dividers()[1].getAttribute('aria-label')).toBe('End of section');
  });

  it('follows a label that changes', async () => {
    expect(dividers()[2].getAttribute('aria-label')).toBe('Or');

    fixture.componentInstance.label.set('And');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dividers()[2].getAttribute('aria-label')).toBe('And');
  });
});

/**
 * The name has to be in the SERVER's markup, and the flag below is the only way a
 * unit suite gets there: `afterEveryRender` is not "usually skipped" under SSR, it
 * returns a no-op ref outright, and `ngServerMode` is the global Angular itself
 * branches on to decide that. Flipping it makes TestBed reproduce the one thing
 * that separates a prerendered divider from a hydrated one — which is why these
 * assertions could not exist as a plain `PLATFORM_ID: 'server'` provider.
 */
describe('WrDivider on the server', () => {
  const globals = globalThis as Record<string, unknown>;
  let fixture: ReturnType<typeof TestBed.createComponent<LabelHost>>;

  const dividers = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('wr-divider'),
  ];

  beforeEach(async () => {
    globals['ngServerMode'] = true;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(LabelHost);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    globals['ngServerMode'] = false;
  });

  it('names the separator in the markup it emits', () => {
    // Before this, every prerendered page shipped an unnamed `role="separator"`
    // and the projected label was presentational — announced as nothing until
    // hydration landed, and never at all with JS off.
    expect(dividers()[2].getAttribute('aria-label')).toBe('Or');
  });

  it('still leaves a bare rule unnamed, and a consumer name alone', () => {
    expect(dividers()[0].getAttribute('aria-label')).toBeNull();
    expect(dividers()[1].getAttribute('aria-label')).toBe('End of section');
  });
});
