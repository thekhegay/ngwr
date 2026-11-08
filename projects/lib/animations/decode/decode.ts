/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';

import { BREAKING_SPACES, VIEW_THRESHOLD, graphemes, optionalMs, staggerGap } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { numAttr, wrCheckStyles } from 'ngwr/utils';

import type { WrDecodeShape, WrDecodeTrigger } from './types';

/** How long a glyph stays before the next one, in ms: fast enough to read as noise, slow enough to read as glyphs. */
const DECODE_GLYPH_MS = 55;

/** How long the whole text scrambles before the first slot locks, in ms. */
const DECODE_HOLD = 360;

/** The gap between one slot locking and the next when `stagger` is not set, in ms. */
const DECODE_GAP = 36;

/** How long a locked slot takes to ease from the tint to the text colour, in ms. */
const DECODE_SETTLE = 240;

const GLYPHS: Readonly<Record<WrDecodeShape, string>> = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digit: '0123456789',
  symbol: '#%&*+-=<>?!/\\~',
};

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]';

/** The shape of one grapheme: what its random stand-ins are drawn from. */
function decodeShape(grapheme: string): WrDecodeShape {
  if (/^\d$/.test(grapheme)) return 'digit';
  const upper = grapheme.toUpperCase();
  const lower = grapheme.toLowerCase();
  if (upper === lower) return 'symbol';
  return grapheme === upper ? 'upper' : 'lower';
}

/** A random glyph from `glyphs`, another than `current` when there is a choice, so every reroll is a visible change. */
function pick(glyphs: readonly string[], current?: string): string {
  if (glyphs.length < 2) return glyphs[0] ?? '';
  let glyph: string;
  do {
    glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
  } while (glyph === current);
  return glyph;
}

interface DecodeSlot {
  readonly el: HTMLElement;
  readonly glyphs: readonly string[];
  /** When the slot locks, in ms from the first glyph. */
  readonly at: number;
  locked: boolean;
}

/**
 * A readout locking on: when it plays, every character of the host's text
 * shows random glyphs that change quickly, then settles on its real character,
 * one after another in reading order. The line never moves while it plays:
 * the real character stays in its slot, hidden, and the glyph is painted over
 * it, centred, out of flow, so a wide stand-in may overlap its neighbour but
 * never pushes it. A glyph keeps the shape of the character it stands in for
 * (upper, lower, digit, or a symbol for punctuation) so the word shape stays
 * readable; spaces never scramble. The host keeps its own tag and its authored
 * children: they are moved out while the slots play and the same nodes are
 * moved back when the last slot has settled, so selection, find-in-page and
 * Angular bindings inside work as before. While split, the slots are
 * `aria-hidden` and a visually-hidden copy of the text stands beside them, so
 * a screen reader hears the text once and never the noise. Nothing plays
 * under `prefers-reduced-motion: reduce`, on the server or, in `view` mode,
 * without `IntersectionObserver`.
 */
@Directive({
  selector: '[wrDecode]',
  host: { class: 'wr-decode' },
})
export class WrDecode {
  /**
   * `view` plays once, the first time most of the host is in the viewport.
   * `hover` plays on every pointer enter and focus of the host or its closest
   * focusable ancestor, but never restarts while already playing. @default 'view'
   */
  readonly trigger = input<WrDecodeTrigger>('view');

  /**
   * The characters random glyphs are drawn from, for every slot. Unset, each
   * slot draws from the shape of its own character: uppercase letters and
   * digits for an uppercase letter, lowercase for lowercase, digits for a digit,
   * a few symbols for anything else.
   */
  readonly glyphs = input<string | null>(null);

  /**
   * Gap between one slot locking and the next, in ms. Unset, 36. Either way
   * the locks spread over 1.2 s at most, so for a long text the gap shrinks
   * until the last slot locks by then.
   */
  readonly stagger = input<number | null, unknown>(null, { transform: optionalMs });

  /** Pause between the trigger and the first glyph, in ms. The text stands as authored meanwhile. @default 0 */
  readonly delay = input(0, { transform: numAttr(0) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private observer: IntersectionObserver | null = null;
  private listeners: AbortController | null = null;
  private frame = 0;
  /** The host's authored children while they are out of the DOM, else `null`. */
  private original: ChildNode[] | null = null;
  private slots: DecodeSlot[] = [];
  private started: number | null = null;
  private lastGlyph = -Infinity;
  private playing = false;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/decode');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion()) return;
      if (this.trigger() === 'hover') {
        this.listen();
        return;
      }
      if (typeof IntersectionObserver === 'undefined') return;
      this.observer = new IntersectionObserver(
        entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          this.observer?.disconnect();
          this.observer = null;
          this.start();
        },
        { threshold: VIEW_THRESHOLD }
      );
      this.observer.observe(this.host.nativeElement);
    });

    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      this.observer = null;
      this.listeners?.abort();
      this.listeners = null;
      this.restore();
    });
  }

  /** `hover` mode: the closest focusable ancestor is what a keyboard reaches, so it is what both events are read on. */
  private listen(): void {
    const host = this.host.nativeElement;
    const target = host.closest<HTMLElement>(FOCUSABLE) ?? host;
    this.listeners = new AbortController();
    const options = { signal: this.listeners.signal, passive: true };
    target.addEventListener('pointerenter', () => this.start(), options);
    target.addEventListener('focusin', () => this.start(), options);
  }

  /** Begin a play, unless one is running or motion is reduced now. The DOM is touched only once the delay has passed. */
  private start(): void {
    if (this.playing || this.platform.prefersReducedMotion()) return;
    this.playing = true;
    this.started = null;
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  private tick(now: number): void {
    this.started ??= now;
    const elapsed = now - this.started - Math.max(0, this.delay());
    if (elapsed < 0) {
      this.frame = requestAnimationFrame(t => this.tick(t));
      return;
    }
    if (!this.original) {
      this.arm();
      if (!this.original) return;
    }

    const reroll = now - this.lastGlyph >= DECODE_GLYPH_MS;
    if (reroll) this.lastGlyph = now;
    let busy = false;
    for (const slot of this.slots) {
      if (slot.locked) continue;
      if (elapsed >= slot.at) {
        slot.locked = true;
        slot.el.classList.remove('wr-decode__slot--scramble');
        continue;
      }
      busy = true;
      if (reroll) slot.el.dataset['glyph'] = pick(slot.glyphs, slot.el.dataset['glyph']);
    }
    if (!busy && elapsed >= this.slots[this.slots.length - 1].at + DECODE_SETTLE) {
      this.restore();
      return;
    }
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  /**
   * Split the authored children into slots and scramble them in one task, so
   * the first frame the slots can be seen in already shows glyphs. A slot holds
   * its real character as its only text; the glyph lives in `data-glyph` and is
   * painted by the stylesheet, so the slot's width is the character's.
   */
  private arm(): void {
    const host = this.host.nativeElement;
    const original = Array.from(host.childNodes);
    const text = host.textContent ?? '';
    const custom = this.glyphs();
    const wrapper = document.createElement('span');
    wrapper.className = 'wr-decode__slots';
    wrapper.setAttribute('aria-hidden', 'true');
    const slots: DecodeSlot[] = [];

    for (const node of original) {
      if (node.nodeType !== Node.TEXT_NODE) {
        // An inline element (`<code>`, `<a>`) moves whole and does not scramble; a comment keeps its place.
        wrapper.append(node);
        continue;
      }
      // `split` on a capturing group alternates: a run of text, then the spaces after it.
      (node.textContent ?? '').split(BREAKING_SPACES).forEach((run, i) => {
        if (run === '') return;
        if (i % 2 === 1) {
          wrapper.append(run);
          return;
        }
        for (const grapheme of graphemes(run)) {
          if (/^\s+$/.test(grapheme)) {
            wrapper.append(grapheme);
            continue;
          }
          const shape = decodeShape(grapheme);
          const el = document.createElement('span');
          el.className = `wr-decode__slot wr-decode__slot--${shape} wr-decode__slot--scramble`;
          el.textContent = grapheme;
          slots.push({
            el,
            glyphs: [...new Set(graphemes(custom && custom.length > 0 ? custom : GLYPHS[shape]))],
            at: 0,
            locked: false,
          });
          wrapper.append(el);
        }
      });
    }

    if (slots.length === 0) {
      this.playing = false;
      return;
    }

    const gap = staggerGap('letters', slots.length, this.stagger() ?? DECODE_GAP);
    this.slots = slots.map((slot, i) => ({ ...slot, at: DECODE_HOLD + i * gap }));
    this.lastGlyph = -Infinity;
    for (const slot of this.slots) slot.el.dataset['glyph'] = pick(slot.glyphs);

    const copy = document.createElement('span');
    copy.className = 'wr-decode__sr';
    copy.textContent = text;

    this.original = original;
    wrapper.style.setProperty('--wr-decode-settle', `${DECODE_SETTLE}ms`);
    host.replaceChildren(wrapper, copy);
    host.classList.add('wr-decode--run');
  }

  /**
   * Put the authored children back, the same node objects, drop the slots and
   * stop the frames. Idempotent: the end of a play and destroy both call it.
   */
  private restore(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.playing = false;
    this.started = null;
    if (!this.original) return;
    const host = this.host.nativeElement;
    host.replaceChildren(...this.original);
    host.classList.remove('wr-decode--run');
    this.original = null;
    this.slots = [];
  }
}

// The timings and the shape rule, for the spec; the entry point does not export them.
export { DECODE_GAP, DECODE_GLYPH_MS, DECODE_HOLD, DECODE_SETTLE, decodeShape };
