import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInputNumber } from './input-number';

/**
 * The ▲ / ▼ column as the template renders it.
 *
 * The chevrons step with the control size and a pill insets the pair from its
 * rounded end; both were measured in Chromium over `sm` / `md` / `lg`, square and
 * pill, under the four density presets. jsdom applies no stylesheet and every
 * rect is 0x0, so none of those numbers is reachable here. What IS reachable is
 * the host modifiers the rules key on and the glyph in each button.
 */
describe('WrInputNumber stepper geometry, in the rendered DOM', () => {
  @Component({
    imports: [WrInputNumber],
    template: `<wr-input-number size="sm" rounded [value]="1" />`,
  })
  class Host {}

  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('puts one glyph in each step button, under the host the rules key on', () => {
    const host = (fixture.nativeElement as HTMLElement).querySelector('wr-input-number')!;
    expect(host.classList).toContain('wr-input-number--sm');
    expect(host.classList).toContain('wr-input-number--rounded');

    const steps = [...host.querySelectorAll('.wr-input-number__step')];
    expect(steps).toHaveLength(2);
    for (const step of steps) {
      const glyphs = step.querySelectorAll(':scope > svg');
      expect(glyphs).toHaveLength(1);
      // The unstyled fallback stays: without it an svg with no size draws 300x150.
      // Square, and the `md` box: a page with no stylesheet has no size class
      // to read either, so the fallback can only be one of the three.
      expect(glyphs[0].getAttribute('width')).toBe('14');
      expect(glyphs[0].getAttribute('height')).toBe('14');
      // The mark itself, so a change of glyph cannot pass as a change of size.
      expect(glyphs[0].querySelector('path')?.getAttribute('d')).toMatch(/^m(18 15-6-6-6 6|6 9 6 6 6-6)$/);
    }
  });
});
