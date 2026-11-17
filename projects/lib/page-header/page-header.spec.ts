import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrLayoutContent } from 'ngwr/layout';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrPageHeader } from './page-header';

@Component({
  imports: [WrPageHeader],
  template: `
    <wr-page-header
      [title]="title()"
      [subtitle]="subtitle()"
      [responsive]="responsive()"
      [compact]="compact()"
      [sticky]="sticky()"
    >
      <span wrPageHeaderBreadcrumbs class="crumbs">Home / Docs</span>
      <button type="button" wrPageHeaderActions class="action">Edit</button>
      <span wrPageHeaderExtra class="extra">v2</span>
      <div wrPageHeaderFilters class="filters"><input /></div>
    </wr-page-header>
  `,
})
class Host {
  readonly title = signal('Settings');
  readonly subtitle = signal('Everything about this project');
  readonly responsive = signal(false);
  readonly compact = signal(false);
  readonly sticky = signal(false);
}

@Component({
  imports: [WrPageHeader],
  template: `<wr-page-header title="Settings" />`,
})
class Plain {}

describe('WrPageHeader', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-page-header')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the title as the page heading', () => {
    // An `<h1>`: this is the component that names the page, so the level is part
    // of the contract rather than a styling choice.
    const title = root().querySelector('.wr-page-header__title')!;
    expect(title.tagName).toBe('H1');
    expect(title.textContent.trim()).toBe('Settings');
    expect(root().querySelector('.wr-page-header__subtitle')!.tagName).toBe('P');
  });

  it('drops the heading and the subtitle when they are empty', () => {
    fixture.componentInstance.title.set('');
    fixture.componentInstance.subtitle.set('');
    fixture.detectChanges();

    expect(root().querySelector('.wr-page-header__title')).toBeNull();
    expect(root().querySelector('.wr-page-header__subtitle')).toBeNull();
  });

  it('routes each slot to its own region', () => {
    expect(root().querySelector('.wr-page-header__breadcrumbs')!.querySelector('.crumbs')).not.toBeNull();
    expect(root().querySelector('.wr-page-header__actions')!.querySelector('.action')).not.toBeNull();
    expect(root().querySelector('.wr-page-header__extra')!.querySelector('.extra')).not.toBeNull();
  });

  it('takes the responsive modifier only when asked', () => {
    expect(host().className).toBe('wr-page-header');

    fixture.componentInstance.responsive.set(true);
    fixture.detectChanges();
    expect(host().className).toContain('wr-page-header--responsive');
  });

  it('takes the compact and sticky modifiers only when asked, and keeps the DOM the same', () => {
    const before = host().innerHTML;

    fixture.componentInstance.compact.set(true);
    fixture.componentInstance.sticky.set(true);
    fixture.detectChanges();
    expect(host().className).toContain('wr-page-header--compact');
    expect(host().className).toContain('wr-page-header--sticky');
    // Compact is a stylesheet modifier: the crumbs move beside the title in CSS,
    // so a header without it renders the markup it always has.
    expect(host().innerHTML).toBe(before);
  });

  it('renders the filter row last, and empty when nothing is projected', () => {
    const filters = root().querySelector<HTMLElement>('.wr-page-header__filters')!;
    expect(filters).toBe(host().lastElementChild);
    expect(filters.querySelector('.filters')).not.toBeNull();

    // `:empty` is what hides the region, so no text node may be left behind.
    const plain = TestBed.createComponent(Plain);
    plain.detectChanges();
    expect((plain.nativeElement as HTMLElement).querySelector('.wr-page-header__filters')!.childNodes.length).toBe(0);
    plain.destroy();
  });

  it('keeps the filter row inside the sticky box, so it stays in view with the title', () => {
    fixture.componentInstance.sticky.set(true);
    fixture.detectChanges();

    const filters = root().querySelector<HTMLElement>('.wr-page-header__filters')!;
    expect(filters.parentElement).toBe(host());
    expect(host().className).toContain('wr-page-header--sticky');
  });
});

/**
 * jsdom loads no stylesheet, so the compiled sheets go into the document here
 * and the margins are read off the rendered header.
 */
describe('WrPageHeader bleed', () => {
  @Component({
    imports: [WrPageHeader, WrLayoutContent],
    template: `
      <wr-layout-content>
        <wr-page-header data-probe="plain" title="Plain" sticky />
        <wr-page-header data-probe="bleed" title="Bleed" sticky bleed />
      </wr-layout-content>
      <wr-layout-content style="--wr-layout-content-padding: 0.5rem">
        <wr-page-header data-probe="tight" title="Tight" bleed />
      </wr-layout-content>
      <wr-page-header data-probe="outside" title="Outside" bleed />
      <wr-page-header data-probe="own" title="Own" bleed style="--wr-page-header-bleed: 1rem" />
    `,
  })
  class BleedHost {}

  let fixture: ReturnType<typeof TestBed.createComponent<BleedHost>>;
  let sheet: HTMLStyleElement;

  const style = (name: string): CSSStyleDeclaration =>
    getComputedStyle((fixture.nativeElement as HTMLElement).querySelector(`[data-probe="${name}"]`)!);

  beforeEach(() => {
    sheet = document.createElement('style');
    sheet.textContent = compileSass(`@use 'layout/styles' as layout;\n@use 'page-header/styles' as page-header;`);
    document.head.append(sheet);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(BleedHost);
    fixture.detectChanges();
    document.body.append(fixture.nativeElement as HTMLElement);
  });

  afterEach(() => {
    fixture.destroy();
    sheet.remove();
  });

  it('leaves a header alone until asked', () => {
    expect(style('plain').marginLeft).toBe('0px');
    expect(style('plain').paddingLeft).toBe('0px');
  });

  it('runs over the content padding on three sides and pads itself by as much', () => {
    const bleed = style('bleed');
    expect(bleed.marginTop).toBe('-24px');
    expect(bleed.marginLeft).toBe('-24px');
    expect(bleed.marginRight).toBe('-24px');
    expect(bleed.marginBottom).toBe('0px');
    expect(bleed.paddingLeft).toBe('24px');
    expect(bleed.paddingRight).toBe('24px');
  });

  it('follows the padding an app gives the content', () => {
    expect(style('tight').marginLeft).toBe('-8px');
    expect(style('tight').paddingLeft).toBe('8px');
  });

  it('bleeds by nothing outside a layout, and by its own hook when that is set', () => {
    expect(style('outside').marginLeft).toBe('0px');
    expect(style('own').marginLeft).toBe('-16px');
    expect(style('own').paddingLeft).toBe('16px');
  });
});

/**
 * The documented actions shape is ONE bare wrapper around the buttons, and the
 * stylesheet spaces what is inside it with a rule on
 * `.wr-page-header__actions > div`. jsdom has no layout and loads no stylesheet,
 * so what a spec can hold is the half it sees: the selector, read out of the
 * stylesheet, run through `Element.matches()` against wrappers Angular actually
 * rendered. That covers the two things a refactor would lose — an element added
 * between the region and its wrapper, and a wrapper the consumer styles being
 * taken over again.
 *
 * ⚠️ The pixels were measured in Chromium against the built showcase instead:
 * the two buttons of the documented wrapper sat 0px apart before and 8px after
 * (12px under `data-wr-density="touch"`, 8px between rows once six of them wrap
 * in a 220px `responsive` header). With the utilities inside `@layer utilities`,
 * the way Tailwind v4 ships them, a `hidden` wrapper stayed hidden and
 * `space-x-2` kept 8px; an unlayered `display: flex; gap: 8px` class kept its
 * own `align-items`.
 */
describe('which actions wrappers the stylesheet lays out', () => {
  const scss = readFileSync(join(process.cwd(), 'projects/lib/page-header/styles/_index.scss'), 'utf8');
  const rule = /^(:where\(\.wr-page-header__actions > div[^{]*\)) \{([^}]*)\}/m.exec(scss);
  const filtersRule = /^(:where\(\.wr-page-header__filters > div[^{]*\)) \{([^}]*)\}/m.exec(scss);

  @Component({
    imports: [WrPageHeader],
    template: `
      <wr-page-header title="Settings">
        <div wrPageHeaderActions data-probe="bare">
          <button type="button">Invite</button>
          <button type="button">Save</button>
        </div>
        <div wrPageHeaderActions data-probe="class-binding" [class.is-busy]="busy()">
          <button type="button">A</button>
        </div>
        <div wrPageHeaderActions data-probe="style-binding" [style.color]="color()">
          <button type="button">B</button>
        </div>
        <div wrPageHeaderActions data-probe="classed" class="my-actions"><button type="button">C</button></div>
        <div wrPageHeaderActions data-probe="hidden" hidden><button type="button">D</button></div>
        <span wrPageHeaderActions data-probe="span"><button type="button">E</button></span>
        <div wrPageHeaderExtra data-probe="extra">Last edited by <a href="#">rk</a></div>
        <div wrPageHeaderFilters data-probe="filters"><input /><input /></div>
        <div wrPageHeaderFilters data-probe="filters-classed" class="my-filters"><input /></div>
      </wr-page-header>
    `,
  })
  class Wrapped {
    readonly busy = signal(false);
    readonly color = signal<string | null>(null);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<Wrapped>>;
  const probe = (name: string): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-probe="${name}"]`)!;
  const laidOut = (name: string): boolean => probe(name).matches(rule![1]);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Wrapped);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('lands the wrapper directly in the actions region, where the rule can reach it', () => {
    expect(probe('bare').parentElement!.classList).toContain('wr-page-header__actions');
    expect(laidOut('bare')).toBe(true);
  });

  it('leaves a wrapper with a class, a style, [hidden] or a non-div tag to the consumer', () => {
    expect(laidOut('classed')).toBe(false);
    expect(laidOut('hidden')).toBe(false);
    expect(laidOut('span')).toBe(false);

    fixture.componentInstance.busy.set(true);
    fixture.componentInstance.color.set('red');
    fixture.detectChanges();
    expect(laidOut('class-binding')).toBe(false);
    expect(laidOut('style-binding')).toBe(false);
  });

  it('lays a wrapper out the same once its class or style binding switches off again', () => {
    // A binding that switches off leaves `class=""` / `style=""` behind rather
    // than removing the attribute, so a selector that excluded `[class]` alone
    // would space the buttons on first render and not after one round trip.
    fixture.componentInstance.busy.set(true);
    fixture.componentInstance.color.set('red');
    fixture.detectChanges();
    fixture.componentInstance.busy.set(false);
    fixture.componentInstance.color.set(null);
    fixture.detectChanges();

    expect(probe('class-binding').getAttribute('class')).toBe('');
    expect(probe('style-binding').getAttribute('style')).toBe('');
    expect(laidOut('class-binding')).toBe(true);
    expect(laidOut('style-binding')).toBe(true);
  });

  it('never reaches the extra row, where a wrapper is usually metadata prose', () => {
    expect(probe('extra').parentElement!.classList).toContain('wr-page-header__extra');
    expect(laidOut('extra')).toBe(false);
    expect(probe('extra').matches(filtersRule![1])).toBe(false);
  });

  it('lays out a bare wrapper in the filters row the same way, and only a bare one', () => {
    expect(filtersRule![2]).toBe(rule![2]);
    expect(probe('filters').parentElement!.classList).toContain('wr-page-header__filters');
    expect(probe('filters').matches(filtersRule![1])).toBe(true);
    expect(probe('filters-classed').matches(filtersRule![1])).toBe(false);
    expect(laidOut('filters')).toBe(false);
  });
});

/**
 * The class JSDoc's extra row. `.wr-page-header__extra` spaces its CHILDREN, so
 * the tags have to be children: a `<div>` around them measured 0px between the
 * two in Chromium, and the `<ng-container>` the example now uses measured the
 * region's 12px. What jsdom can hold is that an `<ng-container>` carrying the
 * slot attribute projects and adds no element of its own.
 */
describe('WrPageHeader, tags projected into the extra row through an ng-container', () => {
  @Component({
    imports: [WrPageHeader],
    template: `
      <wr-page-header title="Settings">
        <ng-container wrPageHeaderExtra>
          <span data-tag>v2.4</span>
          <span data-tag>Stable</span>
        </ng-container>
      </wr-page-header>
    `,
  })
  class Extra {}

  it('puts each tag directly in the extra region', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(Extra);
    fixture.detectChanges();

    const tags = [...(fixture.nativeElement as HTMLElement).querySelectorAll('[data-tag]')];
    expect(tags.length).toBe(2);
    for (const tag of tags) expect(tag.parentElement!.classList).toContain('wr-page-header__extra');
    fixture.destroy();
  });
});
