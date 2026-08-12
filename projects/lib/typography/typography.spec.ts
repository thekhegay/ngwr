import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrTypographyAlign, WrTypographyTone, WrTypographyVariant } from './interfaces';
import { WrTypography } from './typography';

@Component({
  imports: [WrTypography],
  template: `
    <h1 wrTypography [variant]="variant()" [tone]="tone()" [align]="align()" [truncate]="truncate()" [mono]="mono()">
      Build interfaces
    </h1>
    <!-- Same bound variant, plus a class of the consumer's own — see the last case. -->
    <h2 class="page-title" wrTypography [variant]="variant()">that feel alive.</h2>
  `,
})
class Host {
  readonly variant = signal<WrTypographyVariant>('body');
  readonly tone = signal<WrTypographyTone | null>(null);
  readonly align = signal<WrTypographyAlign | null>(null);
  readonly truncate = signal(false);
  readonly mono = signal(false);
}

/** The way a consumer actually writes it: static attributes on native elements. */
@Component({
  imports: [WrTypography],
  template: `
    <p wrTypography>Body copy</p>
    <code wrTypography variant="code">inject(WrTheme)</code>
    <span wrTypography variant="caption" truncate>v10.0.0</span>
    <em wrTypography variant="small" mono>1.21.0</em>
    <b wrTypography truncate="false" mono="false">Static false</b>
    <ul wrTypography variant="list">
      <li>One</li>
      <li>Two</li>
    </ul>
  `,
})
class PlainHost {}

/**
 * Every variant in the public union, mapped to the modifiers it implies BEYOND its
 * own `--<variant>` class. Keyed by the union, so a variant added to
 * `WrTypographyVariant` without a decision here fails to compile — which is what
 * makes "every variant" below true rather than aspirational.
 */
const VARIANTS: Record<WrTypographyVariant, string[]> = {
  display: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  lead: [],
  body: [],
  small: [],
  caption: [],
  overline: [],
  // `code` is monospace whether or not anyone asked — the documented default.
  code: ['wr-typography--mono'],
  list: [],
  link: [],
};

/** Same trick for the two smaller unions: `satisfies` refuses an incomplete record. */
const TONES = Object.keys({
  dark: true,
  medium: true,
  primary: true,
  success: true,
  warning: true,
  danger: true,
} satisfies Record<WrTypographyTone, true>) as WrTypographyTone[];

const ALIGNS = Object.keys({
  start: true,
  center: true,
  end: true,
  justify: true,
} satisfies Record<WrTypographyAlign, true>) as WrTypographyAlign[];

/**
 * The whole directive is one computed class string on the host, so the class list IS
 * the public API and every assertion here reads it. They compare SORTED SETS: the
 * rendered order follows Angular's class-binding diff, not the order the directive
 * built the string in, so an assertion on `className` pins something the directive
 * does not promise and breaks on an unrelated reorder.
 *
 * Exact sets rather than `toContain`, too — a stale modifier left behind by a
 * changed input is the failure this directive is most likely to have, and only an
 * exact set catches it.
 */
describe('WrTypography', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const heading = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('h1')!;
  const classes = (el: HTMLElement = heading()): string[] => [...el.classList].sort();

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('writes the body variant when nothing is bound', () => {
    const plain = TestBed.createComponent(PlainHost);
    plain.detectChanges();

    expect([...(plain.nativeElement as HTMLElement).querySelector('p')!.classList].sort()).toEqual([
      'wr-typography',
      'wr-typography--body',
    ]);
    plain.destroy();
  });

  it('maps every variant to its own modifier, and nothing else', () => {
    // One element walked through the whole union: each iteration also proves the
    // PREVIOUS variant's modifier was removed, which an `add`-only implementation
    // would fail on the second pass.
    for (const [variant, extra] of Object.entries(VARIANTS) as [WrTypographyVariant, string[]][]) {
      fixture.componentInstance.variant.set(variant);
      fixture.detectChanges();

      expect(classes(), variant).toEqual([...new Set(['wr-typography', `wr-typography--${variant}`, ...extra])].sort());
    }
  });

  it('maps every tone', () => {
    for (const tone of TONES) {
      fixture.componentInstance.tone.set(tone);
      fixture.detectChanges();

      expect(classes(), tone).toEqual(['wr-typography', 'wr-typography--body', `wr-typography--tone-${tone}`]);
    }
  });

  it('emits no tone class at all when the tone is left alone', () => {
    // `null` is the absence marker — read as a value it would render
    // `wr-typography--tone-null`, which styles nothing and overrides the variant's
    // own colour in the eyes of anyone grepping the DOM.
    expect(classes().some(c => c.startsWith('wr-typography--tone-'))).toBe(false);
  });

  it('maps every alignment, and none when unset', () => {
    for (const align of ALIGNS) {
      fixture.componentInstance.align.set(align);
      fixture.detectChanges();

      expect(classes(), align).toEqual(['wr-typography', `wr-typography--align-${align}`, 'wr-typography--body']);
    }

    fixture.componentInstance.align.set(null);
    fixture.detectChanges();
    expect(classes()).toEqual(['wr-typography', 'wr-typography--body']);
  });

  it('truncates on request, and stops when asked to stop', () => {
    fixture.componentInstance.truncate.set(true);
    fixture.detectChanges();
    expect(classes()).toContain('wr-typography--truncate');

    fixture.componentInstance.truncate.set(false);
    fixture.detectChanges();
    expect(classes()).toEqual(['wr-typography', 'wr-typography--body']);
  });

  it('reads a bare `truncate` attribute as true', () => {
    // `<span wrTypography truncate>` hands the input the empty string. Without the
    // boolean coercion that is a falsy value and the modifier silently never lands —
    // the form consumers reach for first would be the one that does nothing.
    const plain = TestBed.createComponent(PlainHost);
    plain.detectChanges();

    expect([...(plain.nativeElement as HTMLElement).querySelector('span')!.classList].sort()).toEqual([
      'wr-typography',
      'wr-typography--caption',
      'wr-typography--truncate',
    ]);
    plain.destroy();
  });

  it('reads a bare `mono` attribute as true, and the string "false" as false', () => {
    // The same coercion `truncate` gets, on the other boolean input — untested, it is
    // free to lose its transform while every bound-signal case stays green. And
    // `mono="false"` / `truncate="false"` is what a static template writes when it
    // wants OFF: a coercion that only checks for null would turn both ON.
    const plain = TestBed.createComponent(PlainHost);
    plain.detectChanges();
    const root = plain.nativeElement as HTMLElement;

    expect([...root.querySelector('em')!.classList].sort()).toEqual([
      'wr-typography',
      'wr-typography--mono',
      'wr-typography--small',
    ]);
    expect([...root.querySelector('b')!.classList].sort()).toEqual(['wr-typography', 'wr-typography--body']);

    plain.destroy();
  });

  it('goes monospace on request', () => {
    fixture.componentInstance.mono.set(true);
    fixture.detectChanges();

    expect(classes()).toEqual(['wr-typography', 'wr-typography--body', 'wr-typography--mono']);
  });

  it('keeps `code` monospace even when mono is explicitly false', () => {
    // Documented as auto-true for `code`, so the input is an opt-IN and never an
    // opt-out — a plain `mono() && …` would quietly hand back a proportional font.
    fixture.componentInstance.variant.set('code');
    fixture.componentInstance.mono.set(false);
    fixture.detectChanges();

    expect(classes()).toEqual(['wr-typography', 'wr-typography--code', 'wr-typography--mono']);
  });

  it('carries every modifier at once', () => {
    fixture.componentInstance.variant.set('h2');
    fixture.componentInstance.tone.set('primary');
    fixture.componentInstance.align.set('center');
    fixture.componentInstance.truncate.set(true);
    fixture.componentInstance.mono.set(true);
    fixture.detectChanges();

    expect(classes()).toEqual([
      'wr-typography',
      'wr-typography--align-center',
      'wr-typography--h2',
      'wr-typography--mono',
      'wr-typography--tone-primary',
      'wr-typography--truncate',
    ]);
  });

  it('keeps the classes the consumer wrote, across an update', () => {
    // The directive binds `[class]` to a whole class STRING, and Angular merges that
    // with the static `class` attribute rather than overwriting it. Written as
    // `[attr.class]` instead — the obvious-looking equivalent — it takes ownership of
    // the attribute and drops `page-title`, silently, and only for the consumers who
    // style the same element themselves. It has to survive the REWRITE too, which is
    // why the variant changes here rather than being read once.
    const styled = (): string[] => [...(fixture.nativeElement as HTMLElement).querySelector('h2')!.classList].sort();

    expect(styled()).toEqual(['page-title', 'wr-typography', 'wr-typography--body']);

    fixture.componentInstance.variant.set('h3');
    fixture.detectChanges();
    expect(styled()).toEqual(['page-title', 'wr-typography', 'wr-typography--h3']);
  });

  it('leaves the element the consumer wrote exactly as it was', () => {
    // An attribute directive, so the tag stays the consumer's semantic choice and
    // nothing is wrapped around the content. A component with a template here would
    // change the accessible tree of every heading in the docs.
    const plain = TestBed.createComponent(PlainHost);
    plain.detectChanges();
    const root = plain.nativeElement as HTMLElement;

    const paragraph = root.querySelector<HTMLElement>('p')!;
    expect(paragraph.tagName).toBe('P');
    expect(paragraph.textContent).toBe('Body copy');
    expect(paragraph.childElementCount).toBe(0);

    expect(root.querySelector('code')?.tagName).toBe('CODE');
    // A list keeps its own children — the variant only styles the markers.
    expect(root.querySelectorAll('ul > li')).toHaveLength(2);

    plain.destroy();
  });
});
