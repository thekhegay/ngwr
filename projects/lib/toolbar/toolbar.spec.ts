import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/**
 * The documented zone shape is ONE bare wrapper around the controls, and the
 * stylesheet spaces what is inside it with a rule on `.wr-toolbar__zone > div`.
 * jsdom has no layout and loads no stylesheet, so what a spec can hold is the
 * half it sees: the selector, read out of the stylesheet, run through
 * `Element.matches()` against wrappers Angular actually rendered. That covers
 * the two things a refactor would lose — an element added between the zone and
 * its wrapper, and a wrapper the consumer styles being taken over again.
 *
 * ⚠️ The pixels were measured in Chromium against the built showcase instead:
 * the two buttons of the documented center zone sat 0px apart before and 8px
 * after (12px under `data-wr-density="touch"`, 8px between rows where a 220px
 * `responsive` zone folds six of them). With the utilities inside
 * `@layer utilities`, the way Tailwind v4 ships them, a `hidden` wrapper stayed
 * hidden, `flex gap-4` kept 16px, `grid` stayed a grid and `space-x-2` kept 8px;
 * an unlayered `display: flex; gap: 8px` class kept its own `align-items` and did
 * not start wrapping; a truncating title kept its ellipsis. What still changes:
 * a BARE `<div>` of running text is laid out as a row of flex items —
 * `Showing <b>12</b> of 40 documents` went from 205.86px to 213.47px wide.
 */
describe('which zone wrappers the stylesheet lays out', () => {
  const scss = readFileSync(join(process.cwd(), 'projects/lib/toolbar/styles/_index.scss'), 'utf8');
  const rule = /^(:where\(\.wr-toolbar__zone > div[^{]*\)) \{([^}]*)\}/m.exec(scss);

  @Component({
    imports: [WrToolbar],
    template: `
      <wr-toolbar>
        <div wrToolbarStart data-probe="bare"><strong>Items</strong></div>
        <div wrToolbarCenter data-probe="class-binding" [class.is-dirty]="dirty()">
          <button type="button">Grid</button>
          <button type="button">List</button>
        </div>
        <div wrToolbarEnd data-probe="style-binding" [style.color]="color()"><button type="button">New</button></div>
        <div wrToolbarEnd data-probe="classed" class="my-actions"><button type="button">Share</button></div>
        <div wrToolbarEnd data-probe="hidden" hidden><button type="button">Delete</button></div>
        <span wrToolbarEnd data-probe="span"><button type="button">More</button></span>
      </wr-toolbar>
    `,
  })
  class Wrapped {
    readonly dirty = signal(false);
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

  it('is a zero-specificity flex row that takes the zone gap', () => {
    expect(rule).not.toBeNull();
    expect(rule![2]).toMatch(/display: flex;[\s\S]*gap: inherit;/);
  });

  it('lands each wrapper directly in its zone, where the rule can reach it', () => {
    expect(probe('bare').parentElement!.classList).toContain('wr-toolbar__zone--start');
    expect(probe('class-binding').parentElement!.classList).toContain('wr-toolbar__zone--center');
    expect(laidOut('bare')).toBe(true);
  });

  it('leaves a wrapper with a class, a style, [hidden] or a non-div tag to the consumer', () => {
    expect(laidOut('classed')).toBe(false);
    expect(laidOut('hidden')).toBe(false);
    expect(laidOut('span')).toBe(false);

    fixture.componentInstance.dirty.set(true);
    fixture.componentInstance.color.set('red');
    fixture.detectChanges();
    expect(laidOut('class-binding')).toBe(false);
    expect(laidOut('style-binding')).toBe(false);
  });

  it('lays a wrapper out the same once its class or style binding switches off again', () => {
    // A binding that switches off leaves `class=""` / `style=""` behind rather
    // than removing the attribute, so a selector that excluded `[class]` alone
    // would space the buttons on first render and not after one round trip.
    expect(laidOut('class-binding')).toBe(true);
    expect(laidOut('style-binding')).toBe(true);

    fixture.componentInstance.dirty.set(true);
    fixture.componentInstance.color.set('red');
    fixture.detectChanges();
    fixture.componentInstance.dirty.set(false);
    fixture.componentInstance.color.set(null);
    fixture.detectChanges();

    expect(probe('class-binding').getAttribute('class')).toBe('');
    expect(probe('style-binding').getAttribute('style')).toBe('');
    expect(laidOut('class-binding')).toBe(true);
    expect(laidOut('style-binding')).toBe(true);
  });

  it('scales the zone gap with density', () => {
    expect(scss).toMatch(/&__zone \{[^}]*gap: calc\(0\.5rem \* var\(--wr-density-gap, 1\)\);/);
  });
});
