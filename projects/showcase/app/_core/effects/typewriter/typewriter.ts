import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { numAttr } from 'ngwr/utils';

import { VISIBLE, graphemes } from '../stagger';

/** When the typing starts: the first time most of the host is in view, or at once, even above the fold. */
type TypewriterTrigger = 'view' | 'load';

/**
 * Where the component is. `idle` is at rest: the line stands whole, no caret.
 * The server, a reduced-motion browser and the end of a pass all land there.
 */
type TypewriterPhase = 'idle' | 'typing' | 'holding' | 'deleting' | 'ending' | 'fading';

/** A character takes this long to type, in ms, before the rhythm's own variation. */
const TYPEWRITER_TYPE_MIN = 35;
const TYPEWRITER_TYPE_MAX = 55;

/** The extra beat after a space and after a punctuation mark, in ms: a hand finding the next word, the next thought. */
const TYPEWRITER_SPACE_BEAT = 50;
const TYPEWRITER_PUNCT_BEAT = 180;

/** Deleting runs about twice as fast as typing, in ms per character. */
const TYPEWRITER_DELETE_MIN = 18;
const TYPEWRITER_DELETE_MAX = 28;

/** How long a finished line stands before it is deleted when `hold` is not set, in ms. */
const TYPEWRITER_HOLD = 1800;

/** The pause between a line deleted to nothing and the first character of the next, in ms. */
const TYPEWRITER_BREATH = 280;

/** One blink of the caret, in ms, and how many it gives after the last line, or on a line that was already in view. */
const TYPEWRITER_BLINK = 1000;
const TYPEWRITER_END_BLINKS = 3;
const TYPEWRITER_BOOT_BLINKS = 2;

/** How long the caret takes to fade after its last blink, in ms. */
const TYPEWRITER_FADE = 400;

/** How far below the viewport the host is hidden and armed: a quarter of the viewport's height. */
const TYPEWRITER_ARM_MARGIN = '0px 0px 25% 0px';

const PUNCTUATION = /[.,;:!?…]/;

/* eslint-disable no-bitwise -- the hash and the mixer are defined in 32-bit integer arithmetic */
/** FNV-1a over the UTF-16 units: one seed per text, the same on the server, in a spec and in every browser. */
function seed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A number in [0, 1) for the `i`th character of a text with `seed`: the same every time, with no state between calls. */
function unit(seed: number, i: number): number {
  let hash = (seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x21f0aaad);
  hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97);
  hash ^= hash >>> 15;
  return (hash >>> 0) / 0x100000000;
}
/* eslint-enable no-bitwise */

/**
 * The wait before each character of `line` appears, in ms: between
 * {@link TYPEWRITER_TYPE_MIN} and {@link TYPEWRITER_TYPE_MAX}, varied per
 * character, plus a beat after a space or a punctuation mark. Seeded from the
 * text, so the same line always types to the same rhythm.
 */
function typewriterTyping(line: string): number[] {
  const chars = graphemes(line);
  const base = seed(line);
  return chars.map((_, i) => {
    let ms = TYPEWRITER_TYPE_MIN + (TYPEWRITER_TYPE_MAX - TYPEWRITER_TYPE_MIN) * unit(base, i);
    const previous = chars[i - 1];
    if (previous !== undefined) {
      if (PUNCTUATION.test(previous)) ms += TYPEWRITER_PUNCT_BEAT;
      else if (/^\s+$/.test(previous)) ms += TYPEWRITER_SPACE_BEAT;
    }
    return Math.round(ms);
  });
}

/** The wait before each character of `line` goes, in ms, last character first: about twice the typing pace, no beats. */
function typewriterDeleting(line: string): number[] {
  const chars = graphemes(line);
  const base = seed(line);
  return chars.map((_, i) =>
    Math.round(TYPEWRITER_DELETE_MIN + (TYPEWRITER_DELETE_MAX - TYPEWRITER_DELETE_MIN) * unit(base, chars.length + i))
  );
}

/**
 * A line typed character by character behind a caret, then held, deleted and
 * followed by the next, or typed once and left standing.
 *
 * Nothing moves around it while it types. The host is an inline grid with
 * every line in the same cell: the lines not on show are laid out but
 * invisible, and the line on show is laid out whole, with its untyped tail
 * hidden rather than absent. The box is as wide and as tall as the longest
 * line wraps to at the current width from the first paint, so what is below
 * never moves and a centred or wrapped line never jitters. The caret is a
 * border on the typed run's trailing edge, so it stands after the last typed
 * character and wraps with it.
 *
 * The server renders the first line whole, readable without script. In a
 * browser the component hides the untyped text before it can be seen: one
 * observer with a margin a quarter of the viewport below it arms the host
 * while it is still under the fold, and another starts the typing once most of
 * the host is in view. A host that is already in view when it boots, above the
 * fold or on a reload mid-page, is never erased: it stands whole, the caret
 * blinks twice and goes. `trigger="load"` types regardless, for a hero.
 *
 * The rhythm is 35 to 55 ms per character, varied per character from a hash
 * of the text, so the same line always types the same way and a spec can sum
 * the waits; a space and a punctuation mark add a beat, and deleting runs
 * about twice as fast. The caret is solid while a character is on its way,
 * blinks while a line holds, and after the last line blinks a few times and
 * fades. The typing pauses when the host leaves the viewport or the document
 * is hidden, and resumes where it was.
 *
 * The box is `aria-hidden` and a visually-hidden copy beside it carries every
 * line once, so a screen reader hears the text, never a letter at a time; the
 * copy is out of the selection, so a copy of the line gives the typed text.
 * Under `prefers-reduced-motion: reduce`, on the server and without
 * `IntersectionObserver` the first line stands whole with no caret: it is what
 * the server sent, so nothing swaps at hydration. Write the first line as the
 * one that stands alone. Styles: `typewriter.scss`, loaded by `styles.scss`.
 */
@Component({
  selector: 'ngwr-typewriter',
  templateUrl: './typewriter.html',
  host: {
    class: 'ngwr-typewriter',
    '[class.ngwr-typewriter--caret]': 'phase() !== "idle"',
    '[class.ngwr-typewriter--busy]': 'phase() === "typing" || phase() === "deleting"',
    '[class.ngwr-typewriter--out]': 'phase() === "fading"',
  },
})
export class Typewriter {
  /** The lines, in the order they type. The first is what the server and a still page show. */
  readonly lines = input.required<readonly string[]>();

  /** Cycle through the lines instead of stopping on the last. @default false */
  readonly loop = input(false, { transform: booleanAttribute });

  /** How long a finished line stands before it is deleted for the next, in ms. @default 1800 */
  readonly hold = input(TYPEWRITER_HOLD, { transform: numAttr(TYPEWRITER_HOLD) });

  /** Pause before the first character, in ms, from the moment the host is in view: room for the eye to land above it. @default 0 */
  readonly delay = input(0, { transform: numAttr(0) });

  /**
   * `view` types once most of the host is in view and leaves a host that was
   * already in view at boot whole. `load` types at once, wherever the host is.
   * @default 'view'
   */
  readonly trigger = input<TypewriterTrigger>('view');

  protected readonly phase = signal<TypewriterPhase>('idle');

  /** Which line is on show. */
  protected readonly index = signal(0);

  /** How many characters of the line are typed, or `null` for the whole line: at rest and on the server. */
  private readonly count = signal<number | null>(null);

  protected readonly line = computed(() => this.lines()[this.index()] ?? '');

  private readonly chars = computed(() => graphemes(this.line()));

  private readonly shown = computed(() => Math.min(this.count() ?? Infinity, this.chars().length));

  protected readonly typed = computed(() => this.chars().slice(0, this.shown()).join(''));

  protected readonly rest = computed(() => this.chars().slice(this.shown()).join(''));

  /** Every line once, for a screen reader. */
  protected readonly speech = computed(() => this.lines().join(' '));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);

  private readonly intersecting = signal(false);
  /** `afterNextRender` ran in a browser that can play. */
  private readonly ready = signal(false);

  /** The clock runs: in view, page visible, something still to do. */
  private readonly active = computed(
    () => this.ready() && this.phase() !== 'idle' && this.intersecting() && this.platform.pageVisible()
  );

  /** Arms the host while it is still under the fold; gone once it has decided. */
  private armer: IntersectionObserver | null = null;
  /** Starts and pauses the typing on most of the host being in view. */
  private viewer: IntersectionObserver | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** How many blinks the caret gives in `ending`. */
  private blinks = TYPEWRITER_END_BLINKS;
  /** `delay` is spent once, before the first line. */
  private delayed = false;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
      const host = this.host.nativeElement;
      // The armer first: its first notification decides before the viewer's reports where the host is.
      if (this.trigger() === 'load') {
        this.arm();
      } else {
        this.armer = new IntersectionObserver(entries => this.decide(entries[entries.length - 1]), {
          rootMargin: TYPEWRITER_ARM_MARGIN,
          threshold: 0,
        });
        this.armer.observe(host);
      }
      this.viewer = new IntersectionObserver(
        entries => this.intersecting.set(entries[entries.length - 1]?.isIntersecting ?? false),
        { threshold: VISIBLE }
      );
      this.viewer.observe(host);
      this.ready.set(true);
    });

    // One place decides whether the clock runs. Reduced motion at any moment
    // puts the line on show whole and takes the caret away.
    effect(() => {
      if (this.platform.prefersReducedMotion()) {
        untracked(() => this.still());
        return;
      }
      const on = this.active();
      untracked(() => (on ? this.run() : this.clear()));
    });

    inject(DestroyRef).onDestroy(() => {
      this.armer?.disconnect();
      this.armer = null;
      this.viewer?.disconnect();
      this.viewer = null;
      this.clear();
    });
  }

  /**
   * The host entered the band under the viewport, or was in it at boot. In
   * the viewport itself, any part of it, it stands whole: erasing it now would
   * be seen. Under the viewport, it is armed while nobody is looking.
   */
  private decide(entry: IntersectionObserverEntry | undefined): void {
    if (!entry?.isIntersecting) return;
    this.armer?.disconnect();
    this.armer = null;
    const rect = entry.boundingClientRect;
    const height = this.doc.defaultView?.innerHeight ?? 0;
    if (rect.top < height && rect.bottom > 0) this.complete();
    else this.arm();
  }

  /** Hide the untyped text: the line types from nothing once in view. */
  private arm(): void {
    this.count.set(0);
    this.phase.set('typing');
  }

  /** Leave the line whole; the caret blinks twice and goes. */
  private complete(): void {
    this.blinks = TYPEWRITER_BOOT_BLINKS;
    this.phase.set('ending');
  }

  /** At rest: the line on show whole, no caret, no clock. */
  private still(): void {
    this.clear();
    this.count.set(null);
    this.phase.set('idle');
  }

  /** Start the wait for the next step, unless it already counts. The chain carries itself while the clock runs. */
  private run(): void {
    if (this.timer !== null) return;
    const wait = this.wait();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.step();
      if (this.active()) this.run();
    }, wait);
  }

  private clear(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  /** How long until the next step, from the phase and the character it waits for. */
  private wait(): number {
    const count = this.count() ?? this.chars().length;
    switch (this.phase()) {
      case 'typing':
        if (count > 0) return typewriterTyping(this.line())[count];
        if (this.delayed) return TYPEWRITER_BREATH;
        this.delayed = true;
        return Math.max(0, this.delay());
      case 'deleting':
        return typewriterDeleting(this.line())[count - 1];
      case 'holding':
        return Math.max(0, this.hold());
      case 'ending':
        return this.blinks * TYPEWRITER_BLINK;
      case 'fading':
        return TYPEWRITER_FADE;
      default:
        return 0;
    }
  }

  private step(): void {
    const count = this.count() ?? this.chars().length;
    const last = this.index() >= this.lines().length - 1;
    switch (this.phase()) {
      case 'typing':
        this.count.set(count + 1);
        if (count + 1 < this.chars().length) return;
        if (last && !this.loop()) {
          this.blinks = TYPEWRITER_END_BLINKS;
          this.phase.set('ending');
        } else {
          this.phase.set('holding');
        }
        return;
      case 'holding':
        this.phase.set('deleting');
        return;
      case 'deleting':
        this.count.set(count - 1);
        if (count - 1 > 0) return;
        this.index.set(last ? 0 : this.index() + 1);
        this.phase.set('typing');
        return;
      case 'ending':
        this.phase.set('fading');
        return;
      case 'fading':
        this.still();
        return;
      default:
        return;
    }
  }
}

export {
  TYPEWRITER_ARM_MARGIN,
  TYPEWRITER_BLINK,
  TYPEWRITER_BOOT_BLINKS,
  TYPEWRITER_BREATH,
  TYPEWRITER_DELETE_MAX,
  TYPEWRITER_DELETE_MIN,
  TYPEWRITER_END_BLINKS,
  TYPEWRITER_FADE,
  TYPEWRITER_HOLD,
  TYPEWRITER_PUNCT_BEAT,
  TYPEWRITER_SPACE_BEAT,
  TYPEWRITER_TYPE_MAX,
  TYPEWRITER_TYPE_MIN,
  typewriterDeleting,
  typewriterTyping,
};
export type { TypewriterPhase, TypewriterTrigger };
