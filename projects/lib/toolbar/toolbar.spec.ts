import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

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
});

@Component({
  imports: [WrToolbar],
  template: `
    <wr-toolbar [arrowKeys]="on()" aria-label="Tools">
      <div wrToolbarStart>
        <button type="button" id="a">A</button>
        <button type="button" id="b" [disabled]="bDisabled()">B</button>
      </div>
      <div wrToolbarCenter>
        <input id="text" type="text" />
        <div role="radiogroup">
          <button type="button" id="r1" role="radio" aria-checked="true">1</button>
          <button type="button" id="r2" role="radio" aria-checked="false" tabindex="-1">2</button>
        </div>
      </div>
      <div wrToolbarEnd>
        <button type="button" id="c">C</button>
        @if (extra()) {
          <button type="button" id="d">D</button>
        }
      </div>
    </wr-toolbar>
  `,
})
class ArrowHost {
  readonly on = signal(true);
  readonly extra = signal(false);
  readonly bDisabled = signal(false);
}

describe('WrToolbar arrowKeys', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ArrowHost>>;

  const el = (id: string): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`#${id}`)!;
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await Promise.resolve();
    await fixture.whenStable();
  };
  const press = (target: HTMLElement, name: string): KeyboardEvent => {
    target.focus();
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };
  const stops = (): string[] =>
    [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        'wr-toolbar [tabindex="0"], wr-toolbar button, wr-toolbar input'
      ),
    ]
      .filter(e => e.tabIndex >= 0)
      .map(e => e.id);

  const mount = async (dir: Direction = 'ltr'): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Directionality,
          useValue: { value: dir, valueSignal: signal(dir), change: new Subject<Direction>() },
        },
      ],
    });
    fixture = TestBed.createComponent(ArrowHost);
    await settle();
  };

  afterEach(() => fixture.destroy());

  it('leaves a control with any negative tabindex of its own out of the roving set', async () => {
    await mount();
    fixture.componentInstance.on.set(false);
    await settle();
    el('c').setAttribute('tabindex', '-2');
    fixture.componentInstance.on.set(true);
    await settle();

    expect(el('c').getAttribute('tabindex')).toBe('-2');
    press(el('a'), 'End');
    expect(document.activeElement?.id).toBe('b');
  });

  it('leaves the toolbar alone while off', async () => {
    await mount();
    fixture.componentInstance.on.set(false);
    await settle();
    expect(el('b').hasAttribute('tabindex')).toBe(false);
    expect(el('r2').getAttribute('tabindex')).toBe('-1');
    expect(press(el('a'), 'ArrowRight').defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(el('a'));
  });

  it('exposes one tab stop among the plain controls', async () => {
    await mount();
    expect(el('a').getAttribute('tabindex')).toBe('0');
    expect(['b', 'c'].map(id => el(id).getAttribute('tabindex'))).toEqual(['-1', '-1']);
  });

  it('moves with ArrowRight, skipping disabled controls, and wraps', async () => {
    await mount();
    fixture.componentInstance.bDisabled.set(true);
    await settle();
    expect(press(el('a'), 'ArrowRight').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(el('c'));
    press(el('c'), 'ArrowRight');
    expect(document.activeElement).toBe(el('a'));
    press(el('a'), 'ArrowLeft');
    expect(document.activeElement).toBe(el('c'));
  });

  it('jumps to the ends with Home and End', async () => {
    await mount();
    press(el('c'), 'Home');
    expect(document.activeElement).toBe(el('a'));
    press(el('a'), 'End');
    expect(document.activeElement).toBe(el('c'));
  });

  it('remembers the last focused control as the tab stop', async () => {
    await mount();
    el('c').focus();
    await settle();
    expect(el('c').getAttribute('tabindex')).toBe('0');
    expect(el('a').getAttribute('tabindex')).toBe('-1');
  });

  it('mirrors the arrows under rtl', async () => {
    await mount('rtl');
    press(el('a'), 'ArrowLeft');
    expect(document.activeElement).toBe(el('b'));
    press(el('b'), 'ArrowRight');
    expect(document.activeElement).toBe(el('a'));
    press(el('b'), 'Home');
    expect(document.activeElement).toBe(el('a'));
  });

  it('skips a control that is visibility hidden', async () => {
    await mount();
    el('a').style.visibility = 'hidden';
    el('a').checkVisibility = (): boolean => false;
    fixture.componentInstance.extra.set(true);
    await settle();
    expect(el('a').getAttribute('tabindex')).not.toBe('0');
    expect(el('b').getAttribute('tabindex')).toBe('0');
  });

  it('keeps the plain stop reachable while a text input has focus, and never lands in it', async () => {
    await mount();
    el('text').focus();
    await settle();
    expect(el('a').getAttribute('tabindex')).toBe('0');
    expect(el('text').hasAttribute('tabindex')).toBe(false);
    press(el('a'), 'End');
    expect(document.activeElement).toBe(el('c'));
    press(el('b'), 'ArrowRight');
    expect(document.activeElement).toBe(el('c'));
    press(el('c'), 'ArrowLeft');
    expect(document.activeElement).toBe(el('b'));
  });

  it('leaves the arrows to a text input', async () => {
    await mount();
    expect(press(el('text'), 'ArrowRight').defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(el('text'));
  });

  it('leaves the arrows to a composite widget and keeps its own tab stop', async () => {
    await mount();
    expect(press(el('r1'), 'ArrowRight').defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(el('r1'));
    expect(el('r1').hasAttribute('tabindex')).toBe(false);
    expect(el('r2').getAttribute('tabindex')).toBe('-1');
  });

  it('keeps exactly one plain tab stop when a control appears', async () => {
    await mount();
    fixture.componentInstance.extra.set(true);
    await settle();
    expect(el('d').getAttribute('tabindex')).toBe('-1');
    expect(['a', 'b', 'c', 'd'].filter(id => el(id).getAttribute('tabindex') === '0')).toEqual(['a']);
    press(el('c'), 'ArrowRight');
    expect(document.activeElement).toBe(el('d'));
  });

  it('moves the stop when the stop is removed', async () => {
    await mount();
    fixture.componentInstance.extra.set(true);
    await settle();
    el('d').focus();
    await settle();
    fixture.componentInstance.extra.set(false);
    await settle();
    expect(['a', 'b', 'c'].filter(id => el(id).getAttribute('tabindex') === '0')).toEqual(['a']);
  });

  it('releases a control moved out of the toolbar and takes it back when it returns', async () => {
    await mount();
    const b = el('b');
    expect(b.getAttribute('tabindex')).toBe('-1');
    const parent = b.parentElement!;
    const outside = document.createElement('div');
    document.body.append(outside);
    outside.append(b);
    await settle();
    expect(b.hasAttribute('tabindex')).toBe(false);
    parent.insertBefore(b, null);
    await settle();
    expect(b.getAttribute('tabindex')).toBe('-1');
    outside.remove();
  });

  it('moves the stop on when the stop becomes inert', async () => {
    await mount();
    expect(el('a').getAttribute('tabindex')).toBe('0');
    el('a').parentElement!.setAttribute('inert', '');
    await settle();
    expect(el('a').getAttribute('tabindex')).not.toBe('0');
    expect(el('c').getAttribute('tabindex')).toBe('0');
  });

  it('puts tabindex back when switched off', async () => {
    await mount();
    fixture.componentInstance.on.set(false);
    await settle();
    expect(el('a').hasAttribute('tabindex')).toBe(false);
    expect(el('r2').getAttribute('tabindex')).toBe('-1');
    expect(stops()).toContain('b');
  });
});
