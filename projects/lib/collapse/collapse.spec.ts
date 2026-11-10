import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCollapse } from './collapse';
import { WrCollapseGroup } from './collapse-group';
import type { WrCollapseIndicator } from './types';

@Component({
  imports: [WrCollapse],
  template: `<wr-collapse
    [title]="title()"
    [(open)]="open"
    [disabled]="disabled()"
    [bordered]="bordered()"
    [indicator]="indicator()"
    >Panel body</wr-collapse
  >`,
})
class Host {
  readonly title = signal('Details');
  readonly open = signal(false);
  readonly disabled = signal(false);
  readonly bordered = signal(true);
  readonly indicator = signal<WrCollapseIndicator>('chevron');
}

@Component({
  imports: [WrCollapse, WrCollapseGroup],
  template: `
    <wr-collapse-group [accordion]="accordion()">
      <wr-collapse title="One">First</wr-collapse>
      <wr-collapse title="Two">Second</wr-collapse>
      <wr-collapse title="Three">Third</wr-collapse>
    </wr-collapse-group>
  `,
})
class GroupHost {
  readonly accordion = signal(true);
}

/**
 * A disclosure lives or dies on two attributes: `aria-expanded` on the trigger
 * and `aria-controls` pointing at the region it opens. Rendered without them a
 * screen reader announces a bare button and never says whether the panel is
 * open — the animation is the only feedback, and only for people who can see
 * it.
 */
describe('WrCollapse', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLElement => root().querySelector<HTMLElement>('.wr-collapse__header')!;
  const body = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-collapse__body');

  const click = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('announces its state on the trigger', () => {
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    click();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('points the trigger at the region it opens', () => {
    click();

    const controls = trigger().getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(root().querySelector(`#${controls}`)).not.toBeNull();
  });

  it('toggles through the two-way binding, both ways', () => {
    click();
    expect(fixture.componentInstance.open()).toBe(true);

    click();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('follows a state written from outside', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    expect([trigger().getAttribute('aria-expanded'), body() !== null]).toEqual(['true', true]);
  });

  it('shows the title on the trigger', () => {
    fixture.componentInstance.title.set('Shipping options');
    fixture.detectChanges();

    expect(trigger().textContent).toContain('Shipping options');
  });

  it('does not open while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    click();

    expect(fixture.componentInstance.open()).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('is framed and shows a chevron by default', () => {
    expect(root().querySelector('wr-collapse')!.classList.contains('wr-collapse--flat')).toBe(false);
    expect(root().querySelector('.wr-collapse__chevron')).not.toBeNull();
    expect(root().querySelector('.wr-collapse__plus')).toBeNull();
  });

  it('draws flat when bordered is off', () => {
    fixture.componentInstance.bordered.set(false);
    fixture.detectChanges();

    expect(root().querySelector('wr-collapse')!.classList.contains('wr-collapse--flat')).toBe(true);
  });

  it('swaps the chevron for a plus, and keeps the open state on the host', () => {
    fixture.componentInstance.indicator.set('plus');
    fixture.detectChanges();

    expect(root().querySelector('.wr-collapse__chevron')).toBeNull();
    expect(root().querySelector('.wr-collapse__plus-bar')).not.toBeNull();
    // Decoration only: the glyph must not leak into the header's accessible name.
    expect(root().querySelector('.wr-collapse__plus')!.getAttribute('aria-hidden')).toBe('true');
    expect(trigger().textContent.trim()).toBe('Details');

    click();
    expect(root().querySelector('wr-collapse')!.classList.contains('wr-collapse--open')).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('carries the public BEM classes, including the open modifier', () => {
    const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-collapse')!;
    expect(host().className).toContain('wr-collapse');

    click();
    expect(host().className).toContain('wr-collapse--open');
  });
});

describe('WrCollapseGroup in accordion mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<GroupHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const triggers = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-collapse__header')];
  const openStates = (): string[] => triggers().map(t => t.getAttribute('aria-expanded')!);

  const click = (index: number): void => {
    triggers()[index].click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps only one panel open', () => {
    click(0);
    expect(openStates()).toEqual(['true', 'false', 'false']);

    click(2);
    // The one that was open has to CLOSE, and say so — a panel left announcing
    // `aria-expanded="true"` while collapsed is worse than no attribute.
    expect(openStates()).toEqual(['false', 'false', 'true']);
  });

  it('still closes the open panel when it is clicked again', () => {
    click(1);
    click(1);

    expect(openStates()).toEqual(['false', 'false', 'false']);
  });

  it('lets several stand open when accordion is off', () => {
    fixture.componentInstance.accordion.set(false);
    fixture.detectChanges();

    click(0);
    click(1);

    expect(openStates()).toEqual(['true', 'true', 'false']);
  });
});

/**
 * What the flat look and the plus promise that jsdom cannot show — it has no cascade
 * from a sheet — held against the COMPILED CSS. `sass` is resolved through
 * `@angular/build`, as `theme/sass-entry.spec.ts` does.
 */
describe('WrCollapse stylesheet', () => {
  interface Sass {
    compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
  }
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;
  const css = sass
    .compileString("@use 'collapse/styles';", { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
    .css.replace(/\/\*[\s\S]*?\*\//g, '');
  /** The declarations of the rule whose selector list is exactly `selector`, in `source`. */
  const rule = (source: string, selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.()>:+,]/g, m => `\\${m}`)}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ??
    '';
  const reduced = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?\})\s*\}/g)]
    .map(m => m[1])
    .join('\n');

  it('keeps the default look: the hooks the glyphs and the hover moved onto hold the old values', () => {
    const base = rule(css, '.wr-collapse');
    // 1em is what `.wr-icon__svg` gave the chevron before it read a hook.
    expect(base).toMatch(/--wr-collapse-indicator-size:\s*1em;/);
    expect(base).toMatch(/--wr-collapse-indicator:\s*var\(--wr-color-on-surface-muted\)/);
    expect(base).toMatch(/--wr-collapse-header-hover-bg:\s*var\(--wr-color-fill\)/);
    expect(base).toMatch(/border:\s*1px solid var\(--wr-collapse-border\)/);
  });

  it('takes the frame off a flat panel through its own hooks', () => {
    const flat = rule(css, '.wr-collapse--flat');
    expect(flat).toMatch(/--wr-collapse-bg:\s*transparent/);
    expect(flat).toMatch(/--wr-collapse-radius:\s*0/);
    expect(flat).toMatch(/--wr-collapse-header-hover-bg:\s*transparent/);
    expect(flat).toMatch(/border:\s*0/);
  });

  it('draws the divider between flat neighbours only, in the border colour', () => {
    expect(rule(css, '.wr-collapse--flat + .wr-collapse--flat')).toMatch(
      /border-top:\s*1px solid var\(--wr-collapse-border\)/
    );
    // Nothing else draws a line on a lone flat panel: no top or bottom rule of its own.
    expect(rule(css, '.wr-collapse--flat')).not.toMatch(/border-(top|bottom):/);
  });

  it('puts the focus ring back outside a flat header, which clips nothing and has no side padding', () => {
    expect(rule(css, '.wr-collapse--flat .wr-collapse__header:focus-visible')).toMatch(
      /outline-offset:\s*var\(--wr-focus-ring-offset\)/
    );
  });

  it('lays the plus bar down on open, in place', () => {
    expect(rule(css, '.wr-collapse--open .wr-collapse__plus-bar')).toMatch(/transform:\s*rotate\(90deg\)/);
    expect(rule(css, '.wr-collapse__plus-bar')).toMatch(/transform-origin:\s*center/);
  });

  it('sizes and tints both glyphs from the same hooks', () => {
    const glyph = rule(css, '.wr-collapse__chevron, .wr-collapse__plus');
    expect(glyph).toMatch(/inline-size:\s*var\(--wr-collapse-indicator-size\)/);
    expect(glyph).toMatch(/color:\s*var\(--wr-collapse-indicator\)/);
  });

  it('stills every transition under reduced motion, the plus included', () => {
    expect(rule(reduced, '.wr-collapse__chevron,\n  .wr-collapse__plus-bar,\n  .wr-collapse__body')).toMatch(
      /transition-duration:\s*1ms/
    );
  });
});
