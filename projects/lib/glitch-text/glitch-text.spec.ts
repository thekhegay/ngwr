import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrGlitchText } from './glitch-text';

@Component({
  imports: [WrGlitchText],
  template: `
    <wr-glitch-text
      [text]="text()"
      [speed]="speed()"
      [enableShadows]="enableShadows()"
      [enableOnHover]="enableOnHover()"
      [background]="background()"
    />
  `,
})
class Host {
  readonly text = signal('GLITCH');
  readonly speed = signal(1);
  readonly enableShadows = signal(true);
  readonly enableOnHover = signal(true);
  readonly background = signal('');
}

/**
 * The two clone layers are `::before` / `::after` reading `data-text`, so the text has
 * to be rendered AND mirrored into an attribute — that pairing is the whole trick, and
 * a rename of either half breaks the effect silently.
 *
 * The attribute sits on `__clones`, not on the host, and that split is an accessibility
 * fix rather than tidiness: CSS generated content IS exposed to the accessibility tree,
 * so with the pseudos on the host the string reached it three times over and a wrapping
 * heading or link computed its name as "404 404 404". jsdom evaluates no stylesheet, so
 * no spec here can read a `content` value or an accessible name — what it can pin is
 * that the element the stylesheet hangs those pseudos off is the one carrying
 * `aria-hidden` — the second test below, plus the stylesheet describe at the end.
 */
describe('WrGlitchText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-glitch-text')!;
  const clones = (): HTMLElement => host().querySelector<HTMLElement>('.wr-glitch-text__clones')!;
  const prop = (name: string): string => host().style.getPropertyValue(name);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the text and mirrors it into the attribute the clones read', () => {
    expect(host().textContent).toBe('GLITCH');
    expect(clones().getAttribute('data-text')).toBe('GLITCH');

    fixture.componentInstance.text.set('OTHER');
    fixture.detectChanges();
    expect(clones().getAttribute('data-text')).toBe('OTHER');
  });

  it('announces the string once, with the clone layer hidden', () => {
    // The host used to carry `data-text` itself, which put `content: attr(data-text)` on
    // the host's own pseudos — announced, and announced twice. The mirror belongs on the
    // hidden layer, and only there.
    expect(host().hasAttribute('data-text')).toBe(false);
    expect(clones().getAttribute('aria-hidden')).toBe('true');
    expect(clones().textContent).toBe('');

    // One readable copy, and it is the visible one — not an `sr-only` twin, since the
    // glyphs a sighted reader sees are the host's own text rather than the clones'.
    expect(host().querySelectorAll('.wr-glitch-text__label')).toHaveLength(1);
  });

  it('gives the two clones different durations, both scaled by speed', () => {
    // Different multiples on purpose: identical durations would tear in lockstep
    // and read as one shifted copy rather than as a glitch.
    expect(prop('--wr-glitch-text-before-duration')).toBe('2s');
    expect(prop('--wr-glitch-text-after-duration')).toBe('3s');

    fixture.componentInstance.speed.set(0.5);
    fixture.detectChanges();
    expect(prop('--wr-glitch-text-before-duration')).toBe('1s');
    expect(prop('--wr-glitch-text-after-duration')).toBe('1.5s');
  });

  it('drops the colour split when asked', () => {
    expect(prop('--wr-glitch-text-before-shadow')).toContain('var(--wr-color-info)');

    fixture.componentInstance.enableShadows.set(false);
    fixture.detectChanges();
    expect(prop('--wr-glitch-text-before-shadow')).toBe('none');
    expect(prop('--wr-glitch-text-after-shadow')).toBe('none');
  });

  it('idles until hover unless told otherwise', () => {
    expect(host().className).toContain('wr-glitch-text--hover-only');

    fixture.componentInstance.enableOnHover.set(false);
    fixture.detectChanges();
    expect(host().className).not.toContain('wr-glitch-text--hover-only');
  });

  it('leaves the slice background unset until one is given', () => {
    expect(prop('--wr-glitch-text-bg')).toBe('');

    fixture.componentInstance.background.set('#101010');
    fixture.detectChanges();
    expect(prop('--wr-glitch-text-bg')).toBe('#101010');
  });
});

/**
 * The template and the stylesheet have to agree about WHICH element the pseudos hang
 * off, and only one of the two says so in the DOM. jsdom loads no stylesheet, so the
 * sheet is read as text: every `content: attr(data-text)` must be scoped to `__clones`
 * — the element the template marks `aria-hidden` — because the same declaration on
 * `.wr-glitch-text::before` is generated content on the host, which is announced.
 */
describe('the glitch-text stylesheet', () => {
  const code = readFileSync(join(process.cwd(), 'projects/lib/glitch-text/styles/_index.scss'), 'utf8')
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

  it('draws the clone glyphs only on the hidden layer', () => {
    const selectors = code
      .split(/\n(?=\s*[&.@])/)
      .filter(block => /content:\s*attr\(data-text\)/.test(block))
      .map(block => block.slice(0, block.indexOf('{')).trim());

    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector, selector).toContain('__clones');
    }
  });
});
