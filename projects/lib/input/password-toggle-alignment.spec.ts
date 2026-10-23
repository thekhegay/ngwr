import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInput } from './directives';
import { WrInputGroup } from './input-group';
import { WrPasswordToggle } from './password-toggle';

/**
 * Where the eye sits in its field.
 *
 * The group is a flex row and stretches its items, but the item is the
 * `<wr-password-toggle>` HOST — a custom element, blockified to `display: block`
 * — and the `<button>` inside it was an inline-flex box on that host's line box.
 * So the host filled the field and the button did not: the glyph sat at the top.
 * How far depends on the INHERITED line-height, since the line box is a strut of
 * it. Measured in Chromium on the showcase (15px text, 22.5px line-height), the
 * eye's centre was 2.75px above the field's at `sm`, 5.5px at `md`, 8.5px at
 * `lg` and 12px at `lg` under `touch`, and an `sm` field with a toggle in it was
 * 24.5px tall where the same field without one is 22px. At 16px / 24px the same
 * cases read 2 / 4 / 7 / 10.5px and 26px; under a 32px line-height an `md` field
 * grew to 34px.
 *
 * With the host a flex container, all three contexts, over the three sizes, pill
 * and square, and the four density presets, measure the glyph's centre on the
 * field's centre exactly (0px) and every field at the height of its bare input.
 *
 * The host rule is scoped to `:not([hidden])`. It is an author rule, so without
 * that it would outrank the UA's `[hidden] { display: none }`: a toggle hidden by
 * `[hidden]` measured `display: flex` and a 39px-wide visible button in
 * Chromium, WebKit and Firefox, where the unfixed stylesheet hid it.
 *
 * None of the geometry is a number jsdom can produce — it applies no stylesheet
 * and every rect is 0x0 — so this file holds what a spec CAN read: the rendered
 * element chain the `>` selector and the stretch depend on, and whether a
 * rendered host with `hidden` still matches the rule's selector.
 */
const STYLES = readFileSync(join(process.cwd(), 'projects/lib/input/styles/_index.scss'), 'utf8');

const strip = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');

/** The host rule's selector as written, nested under `.wr-input-group`. */
const HOST_SELECTOR = /^[ \t]*(> wr-password-toggle[^{\n]*?)[ \t]*\{/m.exec(strip(STYLES))?.[1];

describe('WrPasswordToggle alignment', () => {
  @Component({
    imports: [WrInput, WrInputGroup, WrPasswordToggle],
    template: `
      <wr-input-group>
        <input #pw wrInput type="password" value="hunter2" />
        <wr-password-toggle [for]="pw" [hidden]="hide()" />
      </wr-input-group>
    `,
  })
  class Host {
    readonly hide = signal(false);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the button as the only element of a host that is a direct child of the group', () => {
    // The chain the fix stretches through: group > host > button. An element
    // between any two of them would put a line box back in the way.
    const host = root().querySelector('wr-password-toggle')!;
    expect(host.parentElement!.tagName).toBe('WR-INPUT-GROUP');
    expect([...host.children].map(el => el.className)).toEqual(['wr-input-group__toggle']);
  });

  it('leaves a hidden toggle to the UA rule instead of displaying it', () => {
    const host = root().querySelector('wr-password-toggle')!;
    const selector = `.wr-input-group ${HOST_SELECTOR!}`;
    expect(host.matches(selector)).toBe(true);

    fixture.componentInstance.hide.set(true);
    fixture.detectChanges();
    expect(host.hasAttribute('hidden')).toBe(true);
    // Nothing else sets the host's display, so a host the rule no longer matches
    // falls through to `[hidden] { display: none }`, measured in three engines.
    expect(host.matches(selector)).toBe(false);
  });
});
