import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrFallingText } from './falling-text';
import type { WrFallingTextTrigger } from './interfaces';

@Component({
  imports: [WrFallingText],
  template: `
    <wr-falling-text [text]="text()" [highlightWords]="highlightWords()" [trigger]="trigger()" [gravity]="gravity()" />
  `,
})
class Host {
  readonly text = signal('gravity pulls every word down');
  readonly highlightWords = signal<readonly string[]>(['grav', 'word']);
  readonly trigger = signal<WrFallingTextTrigger>('auto');
  readonly gravity = signal(980);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * Unlike the other canvas effects in this cluster, the words here are real DOM
 * spans that a physics loop moves — so the TEXT is testable even though the motion
 * is not. The split and the highlight matching are the component's own logic; the
 * physics needs a browser with layout, which jsdom is not.
 */
describe('WrFallingText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const words = (): string[] => [...root().querySelectorAll('.wr-falling-text__word')].map(el => el.textContent);
  const highlighted = (): string[] =>
    [...root().querySelectorAll('.wr-falling-text__word--hl')].map(el => el.textContent);

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => mount());

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('renders one span per word, so the sentence is still readable', () => {
    expect(words()).toEqual(['gravity', 'pulls', 'every', 'word', 'down']);
    expect(root().textContent.replace(/\s+/g, ' ').trim()).toBe('gravity pulls every word down');
  });

  it('highlights by prefix, not by whole word', () => {
    // `grav` matches `gravity` and `word` matches `word` — a whole-word match would
    // find only the second.
    expect(highlighted()).toEqual(['gravity', 'word']);
  });

  it('highlights nothing when no keywords are given', () => {
    fixture.componentInstance.highlightWords.set([]);
    fixture.detectChanges();

    expect(highlighted()).toEqual([]);
  });

  it('follows a change of text', () => {
    fixture.componentInstance.text.set('two words');
    fixture.detectChanges();

    expect(words()).toEqual(['two', 'words']);
  });

  it('renders nothing at all for empty text', () => {
    fixture.componentInstance.text.set('');
    fixture.detectChanges();

    expect(words()).toEqual([]);
  });

  it('renders the words on the server, without a physics loop', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(words().length).toBe(5);
  });

  it('leaves the words where they are for someone who asked for less motion', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    expect(words().length).toBe(5);
    expect(() => fixture.destroy()).not.toThrow();
  });

  it('accepts every trigger without throwing in a layout-less environment', () => {
    for (const trigger of ['auto', 'scroll', 'click', 'hover'] as const) {
      fixture.componentInstance.trigger.set(trigger);
      expect(() => fixture.detectChanges(), trigger).not.toThrow();
    }
  });
});
