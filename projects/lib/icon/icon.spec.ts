import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrIcon } from './icon';
import { provideWrIcons } from './providers/provide-wr-icons';
import { svgIcon } from './svg-icon';

const CHECK = '<svg viewBox="0 0 16 16"><path d="M2 8l4 4 8-8"/></svg>';
const CROSS = '<svg viewBox="0 0 16 16"><path d="M2 2l12 12M14 2L2 14"/></svg>';
const OTHER = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/></svg>';

@Component({
  imports: [WrIcon],
  template: `<wr-icon [name]="name()" />`,
})
class Host {
  readonly name = signal('check');
}

/**
 * The registry is a chain, not a map: `provideWrIcons()` can be called at any
 * injector level and each level MERGES with its ancestors rather than shadowing
 * them. That is the whole reason `WrIconRegistry` exists — Angular does not
 * merge `multi` providers across injectors — so most of these tests are about
 * what an inner registration does to an outer one.
 */
describe('WrIcon and its registry', () => {
  let errors: string[];

  const render = (providers: unknown[] = []): ReturnType<typeof TestBed.createComponent<Host>> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  const svgOf = (fixture: ReturnType<typeof TestBed.createComponent<Host>>): SVGElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('svg');

  beforeEach(() => {
    errors = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.join(' '));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('renders a registered icon', () => {
    const fixture = render([provideWrIcons([svgIcon('check', CHECK)])]);

    expect(svgOf(fixture)).not.toBeNull();
    expect(svgOf(fixture)!.querySelector('path')).not.toBeNull();
  });

  it('marks the glyph aria-hidden', () => {
    const fixture = render([provideWrIcons([svgIcon('check', CHECK)])]);

    // Decorative by default: registered icons went in without this, so a glyph
    // beside a label announced as a bare "graphic".
    expect(svgOf(fixture)!.getAttribute('aria-hidden')).toBe('true');
  });

  it('reflects the name onto the host for styling and for tests', () => {
    const fixture = render([provideWrIcons([svgIcon('check', CHECK)])]);
    const host = (fixture.nativeElement as HTMLElement).querySelector('wr-icon')!;

    expect(host.getAttribute('data-icon')).toBe('check');
  });

  it('swaps the glyph when the name changes', () => {
    const fixture = render([provideWrIcons([svgIcon('check', CHECK), svgIcon('cross', CROSS)])]);
    expect(svgOf(fixture)!.querySelector('circle')).toBeNull();

    fixture.componentInstance.name.set('cross');
    fixture.detectChanges();

    expect(svgOf(fixture)!.innerHTML).toContain('M2 2l12 12');
  });

  describe('an unknown name', () => {
    it('reports the problem without throwing, and renders nothing', () => {
      const fixture = render([provideWrIcons([svgIcon('cross', CROSS)])]);

      // Throwing here escapes into `runEffectsInView` and abandons the rest of
      // the view's effects — one bad name would blank every `<wr-icon>` after
      // it while the console blamed only the first.
      expect(svgOf(fixture)).toBeNull();
      expect(errors.join(' ')).toContain('check');
    });

    it('leaves the neighbours alone', () => {
      TestBed.resetTestingModule();

      @Component({
        imports: [WrIcon],
        template: `<wr-icon name="nope" /><wr-icon name="cross" />`,
      })
      class Pair {}

      TestBed.configureTestingModule({ providers: [provideWrIcons([svgIcon('cross', CROSS)])] });
      const fixture = TestBed.createComponent(Pair);
      fixture.detectChanges();

      const svgs = (fixture.nativeElement as HTMLElement).querySelectorAll('svg');
      expect(svgs).toHaveLength(1);
    });

    it('clears a previously rendered glyph rather than leaving it behind', () => {
      const fixture = render([provideWrIcons([svgIcon('check', CHECK)])]);
      expect(svgOf(fixture)).not.toBeNull();

      fixture.componentInstance.name.set('missing');
      fixture.detectChanges();

      // A stale glyph under a new name is worse than an empty box: the label
      // and the picture disagree and nothing says so.
      expect(svgOf(fixture)).toBeNull();
    });

    it('renders nothing at all when no icons were ever provided', () => {
      const fixture = render();

      expect(svgOf(fixture)).toBeNull();
    });
  });

  describe('registration levels', () => {
    it('merges a component-level registration with an ancestor one', () => {
      TestBed.resetTestingModule();

      @Component({
        imports: [WrIcon],
        selector: 'wr-inner-cmp',
        providers: [provideWrIcons([svgIcon('cross', CROSS)])],
        template: `<wr-icon name="check" /><wr-icon name="cross" />`,
      })
      class Inner {}

      @Component({ imports: [Inner], template: `<wr-inner-cmp />` })
      class Outer {}

      TestBed.configureTestingModule({ providers: [provideWrIcons([svgIcon('check', CHECK)])] });
      const fixture = TestBed.createComponent(Outer);
      fixture.detectChanges();

      // Angular does not merge `multi` providers across injectors, so without
      // the registry chain the inner registration would SHADOW the root one and
      // "check" would vanish everywhere inside this component.
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('svg')).toHaveLength(2);
      expect(errors).toEqual([]);
    });

    it('lets the nearer level win a name collision', () => {
      TestBed.resetTestingModule();

      @Component({
        imports: [WrIcon],
        selector: 'wr-inner-cmp',
        providers: [provideWrIcons([svgIcon('check', OTHER)])],
        template: `<wr-icon name="check" />`,
      })
      class Inner {}

      @Component({ imports: [Inner], template: `<wr-inner-cmp />` })
      class Outer {}

      TestBed.configureTestingModule({ providers: [provideWrIcons([svgIcon('check', CHECK)])] });
      const fixture = TestBed.createComponent(Outer);
      fixture.detectChanges();

      // Overriding one glyph locally is the point of a component-level call.
      expect((fixture.nativeElement as HTMLElement).querySelector('svg')!.querySelector('circle')).not.toBeNull();
    });

    it('lets a later registration at the same level win', () => {
      const fixture = render([provideWrIcons([svgIcon('check', CHECK)]), provideWrIcons([svgIcon('check', OTHER)])]);

      expect(svgOf(fixture)!.querySelector('circle')).not.toBeNull();
    });
  });
});
