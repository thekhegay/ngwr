/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';

import { graphemes, optionalSelector, roundTo } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { numAttr, wrCheckStyles } from 'ngwr/utils';

import type { WrFallingLettersState } from './types';

/** How long the heap lies still before the letters spring back on their own, in ms. */
const FALLING_LETTERS_REST = 4000;

/** Downward acceleration, in px/s²: a letter crosses half a screen in about two thirds of a second. */
const GRAVITY = 2400;

/** The most a letter drifts sideways as it falls, each way, in px/s. */
const DRIFT = 80;

/** The most a letter spins as it falls, each way, in degrees per second. */
const SPIN = 160;

/** The letters let go over this long, not all at once, in ms. */
const RELEASE = 240;

/** The width of one column of the height map, in px: narrower than a letter, so a heap has a shape. */
const COLUMN = 8;

/** How much of the landing speed comes back as a hop. */
const RESTITUTION = 0.25;

/** Landing slower than this, a letter settles instead of hopping, in px/s. */
const BOUNCE_MIN = 300;

/** What a hop and a wall take off the sideways speed and the spin. */
const FRICTION = 0.5;

/** How long one letter's flight back to its place takes, in ms. */
const RETURN = 700;

/** The gap between two letters leaving the heap, in ms, and how far the last may start after the first. */
const RETURN_GAP = 24;
const RETURN_SPREAD = 300;

/** The spring that brings a letter back: this much damping, this many turns of the overshoot per flight. */
const SPRING_DAMP = 7;
const SPRING_FREQ = 2.4 * Math.PI;

/** The longest step one frame may integrate, in seconds: a stalled frame moves a little, never jumps. */
const MAX_STEP = 0.04;

/**
 * Multipliers of the low-discrepancy sequences, one per channel: `(n * m) mod 1`
 * spreads over (0, 1) with no two neighbours close, and three irrationals far
 * apart keep the release order, the drift and the spin from following one another.
 */
const SCATTER = [0.618_033_988_749_895, 0.414_213_562_373_095, 0.732_050_807_568_877] as const;

/** Letter `i`'s place in (0, 1) on channel `k`: the same for the same letter every time. */
function scatter(i: number, k: 0 | 1 | 2): number {
  const x = ((i + 1) * SCATTER[k]) % 1;
  return x < 0 ? x + 1 : x;
}

/**
 * A springy ease: overshoots its target by about seven percent, comes back a
 * little under, and is there at `t = 1`. `t` is clamped to [0, 1].
 */
function spring(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-SPRING_DAMP * t) * Math.cos(SPRING_FREQ * t);
}

/**
 * The floor, as a row of narrow columns, each remembering the top of what has
 * landed in it. A letter lands on the highest top among the columns it covers,
 * so later letters sit on earlier ones and the floor fills into a heap.
 */
class Heap {
  private readonly tops: Float64Array;

  /** `floor` is the y of the empty floor; the columns span `from` to `to`. */
  constructor(
    private readonly from: number,
    to: number,
    floor: number
  ) {
    this.tops = new Float64Array(Math.max(1, Math.ceil((to - from) / COLUMN))).fill(floor);
  }

  /** The y a body spanning `a` to `b` lands on: the smallest y (highest top) among its columns. */
  top(a: number, b: number): number {
    let top = Infinity;
    for (let c = this.column(a); c <= this.column(b); c++) top = Math.min(top, this.tops[c]);
    return top;
  }

  /** A body spanning `a` to `b` has settled with its top at `y`: its columns now end there. */
  settle(a: number, b: number, y: number): void {
    for (let c = this.column(a); c <= this.column(b); c++) this.tops[c] = Math.min(this.tops[c], y);
  }

  private column(x: number): number {
    return Math.min(this.tops.length - 1, Math.max(0, Math.floor((x - this.from) / COLUMN)));
  }
}

/** One letter on its way: a piece over the page, its place in the line, and its motion. */
interface Piece {
  readonly el: HTMLElement;
  readonly w: number;
  readonly h: number;
  /** The centre of the letter in the line, from the target's padding box. */
  readonly x0: number;
  readonly y0: number;
  /** How long after the click this letter lets go, in seconds. */
  readonly release: number;
  cx: number;
  cy: number;
  angle: number;
  vx: number;
  vy: number;
  spin: number;
  settled: boolean;
  /** Where the flight back started from. */
  fromX: number;
  fromY: number;
  fromAngle: number;
}

/** The box the letters fall in, from the target's padding box. */
interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly floor: number;
}

/**
 * Click a line of text and its letters let go: each one drops with gravity,
 * drifts and tumbles a little on its own path, and lands on whatever already
 * lies under it, so the letters pile into a heap on the floor of a container.
 * Click again, or leave the heap for a few seconds, and every letter springs
 * back to its exact place in the line; the text is plain text again.
 *
 * No physics engine. A letter's path is gravity plus a sideways drift and a
 * spin drawn from a fixed low-discrepancy sequence by its index, so the same
 * text falls the same way every time and a spec can follow it. Letters do not
 * collide in the air; they meet on the floor, which is a {@link Heap}: a row
 * of narrow columns, each remembering the top of what has landed in it, and a
 * letter lands on the highest top among the columns it covers. A letter that
 * lands fast hops once or twice ({@link RESTITUTION}); a slow one settles. A
 * wall of the container turns the drift around. The floor and the walls are
 * the content box of `floor`'s element, measured when the fall starts.
 *
 * The line never moves. The authored nodes are moved into an invisible
 * wrapper that holds exactly their space, still the real text for a screen
 * reader and the clipboard, and the pieces, one `aria-hidden` span per
 * grapheme, are positioned from the target's own box and move by transform
 * alone, so nothing under them reflows and a button under a falling letter
 * stays clickable (`pointer-events: none`). They inherit the font and the
 * colour. When the last letter is back, the same authored node objects go
 * back where they were and the pieces are removed, so a binding inside the
 * text keeps working through the whole thing.
 *
 * One `requestAnimationFrame` loop runs only while a letter moves: it idles
 * once the heap is still and once the line is whole, and a hidden document
 * pauses it where it is. The return is a springy ease ({@link spring}) with a
 * short stagger in reading order. Nothing happens on the server, under
 * `prefers-reduced-motion: reduce`, or when the target has no box; a
 * preference that flips mid-fall puts the text back at once. Destroy puts the
 * text back, cancels the loop and drops the listener.
 *
 * The effect usually sits on its host, but a selector as the directive's value
 * points it at one descendant instead, for a paragraph a library component
 * draws (`<wr-result-404 wrFallingLetters=".wr-result__description">`). The
 * target is looked up once after the first render; if nothing matches, nothing
 * happens.
 */
@Directive({
  selector: '[wrFallingLetters]',
})
export class WrFallingLetters {
  /**
   * A selector for one descendant of the host whose letters fall instead of
   * the host's own, written as the directive's value:
   * `wrFallingLetters=".wr-result__description"`. Resolved once after the
   * first render with `querySelector`; a selector that matches nothing turns
   * the effect off. Unset or empty, the host.
   */
  readonly target = input<string | null, unknown>(null, { alias: 'wrFallingLetters', transform: optionalSelector });

  /**
   * A selector for the element whose content box is the floor and the walls,
   * found with `closest` from the host. Unset, the host's parent element: on
   * a `display: contents` host that is the box around it. On a `wr-*` host
   * write it as a binding (`[floor]="'main'"`), since a static attribute that
   * is not one of the component's inputs fails `check:attrs`.
   */
  readonly floor = input<string | null, unknown>(null, { transform: optionalSelector });

  /** How long the heap lies still before the letters spring back on their own, in ms. @default 4000 */
  readonly rest = input(FALLING_LETTERS_REST, { transform: numAttr(FALLING_LETTERS_REST) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private listeners: AbortController | null = null;
  /** The element whose letters fall, once resolved; `null` before and after. */
  private el: HTMLElement | null = null;
  private state: WrFallingLettersState = 'idle';
  /** The authored children while they sit in the wrapper, else `null`. */
  private original: ChildNode[] | null = null;
  private pieces: Piece[] = [];
  private heap: Heap | null = null;
  private bounds: Bounds | null = null;
  private frame: number | null = null;
  /** The timestamp of the last frame, or `null` when the next one is the first after a start. */
  private last: number | null = null;
  /** Seconds since the current phase began, summed from frame steps, so a pause adds nothing. */
  private clock = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/falling-letters');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      const host = this.host.nativeElement;
      const selector = this.target();
      const el = selector ? host.querySelector<HTMLElement>(selector) : host;
      if (!el) return;
      this.el = el;
      el.classList.add('wr-falling-letters');
      this.listeners = new AbortController();
      el.addEventListener('click', () => this.toggle(), { signal: this.listeners.signal });
    });

    // One place decides what the loop does: reduced motion puts the text
    // back, a hidden page pauses, otherwise a phase in motion gets a frame.
    effect(() => {
      const visible = this.platform.pageVisible();
      const reduced = this.platform.prefersReducedMotion();
      untracked(() => {
        if (reduced) this.restore();
        else if (!visible) this.pause();
        else if (this.state === 'fall' || this.state === 'return') this.start();
      });
    });

    inject(DestroyRef).onDestroy(() => {
      this.listeners?.abort();
      this.listeners = null;
      this.restore();
      this.el?.classList.remove('wr-falling-letters');
      this.el = null;
    });
  }

  /** A click: plain text falls; a heap, still or in the making, springs back; a flight back is left alone. */
  private toggle(): void {
    if (this.platform.prefersReducedMotion()) return;
    if (this.state === 'idle') this.fall();
    else if (this.state === 'fall' || this.state === 'rest') this.spring();
  }

  /**
   * Measure every grapheme in place, then swap in the pieces and hide the
   * line, all in one task, so the first paint shows each piece exactly over
   * its letter. The measurement wraps each grapheme in an inline-block for one
   * synchronous layout and puts the authored nodes straight back, so no frame
   * ever shows the probe.
   */
  private fall(): void {
    const el = this.el;
    if (!el) return;
    const doc = el.ownerDocument;
    const box = el.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;

    const original = Array.from(el.childNodes);
    const wrapper = doc.createElement('span');
    wrapper.className = 'wr-falling-letters__text';
    const glyphs: { el: HTMLElement; text: string; node: Node | null }[] = [];
    for (const node of original) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // An inline element (`<code>`, `<a>`) is one piece, a copy of the whole thing.
        const probe = doc.createElement('span');
        probe.className = 'wr-falling-letters__glyph';
        probe.append(node);
        wrapper.append(probe);
        glyphs.push({ el: probe, text: '', node });
      } else if (node.nodeType === Node.TEXT_NODE) {
        for (const grapheme of graphemes(node.textContent ?? '')) {
          if (grapheme.trim() === '') {
            wrapper.append(grapheme);
            continue;
          }
          const probe = doc.createElement('span');
          probe.className = 'wr-falling-letters__glyph';
          probe.textContent = grapheme;
          wrapper.append(probe);
          glyphs.push({ el: probe, text: grapheme, node: null });
        }
      }
    }
    el.replaceChildren(wrapper);

    const origin = { x: box.left + el.clientLeft, y: box.top + el.clientTop };
    const rects = glyphs.map(glyph => glyph.el.getBoundingClientRect());
    const container = this.container();
    const bounds = this.measure(container ?? el, origin, box);

    // The authored nodes back, the same objects, in their order: the wrapper now holds the line's space.
    wrapper.replaceChildren(...original);

    const layer = doc.createElement('span');
    layer.className = 'wr-falling-letters__pieces';
    layer.setAttribute('aria-hidden', 'true');
    const pieces: Piece[] = [];
    glyphs.forEach((glyph, i) => {
      const rect = rects[i];
      if (rect.width <= 0 || rect.height <= 0) return;
      const piece = doc.createElement('span');
      piece.className = 'wr-falling-letters__piece';
      if (glyph.node) piece.append(glyph.node.cloneNode(true));
      else piece.textContent = glyph.text;
      const n = pieces.length;
      const x0 = rect.left - origin.x + rect.width / 2;
      const y0 = rect.top - origin.y + rect.height / 2;
      pieces.push({
        el: piece,
        w: rect.width,
        h: rect.height,
        x0,
        y0,
        release: (scatter(n, 0) * RELEASE) / 1000,
        cx: x0,
        cy: y0,
        angle: 0,
        vx: (scatter(n, 1) - 0.5) * 2 * DRIFT,
        vy: 0,
        spin: (scatter(n, 2) - 0.5) * 2 * SPIN,
        settled: false,
        fromX: x0,
        fromY: y0,
        fromAngle: 0,
      });
      layer.append(piece);
    });
    if (pieces.length === 0) {
      el.replaceChildren(...original);
      return;
    }

    this.original = original;
    this.pieces = pieces;
    this.heap = new Heap(bounds.minX, bounds.maxX, bounds.floor);
    this.bounds = bounds;
    for (const piece of pieces) this.paint(piece);
    el.append(layer);
    el.classList.add('wr-falling-letters--out');
    this.state = 'fall';
    this.clock = 0;
    this.start();
  }

  /** The element whose content box is the floor: `floor`'s closest match from the host, else the host's parent. */
  private container(): HTMLElement | null {
    const host = this.host.nativeElement;
    const selector = this.floor();
    return selector ? host.closest<HTMLElement>(selector) : host.parentElement;
  }

  /**
   * The floor and the walls, from the target's padding box: the container's
   * content box, and never above the line itself, so a letter always has
   * somewhere to fall.
   */
  private measure(container: HTMLElement, origin: { x: number; y: number }, box: DOMRect): Bounds {
    const rect = container.getBoundingClientRect();
    const style = container.ownerDocument.defaultView?.getComputedStyle(container);
    const pad = (value: string | undefined): number => {
      const n = value === undefined ? NaN : parseFloat(value);
      return Number.isFinite(n) ? n : 0;
    };
    const minX = rect.left + pad(style?.paddingLeft) - origin.x;
    const maxX = rect.left + rect.width - pad(style?.paddingRight) - origin.x;
    const floor = rect.top + rect.height - pad(style?.paddingBottom) - origin.y;
    return { minX: Math.min(minX, 0), maxX: Math.max(maxX, box.width), floor: Math.max(floor, box.height) };
  }

  /** Every letter leaves where it is, heap or mid-air, for its place in the line. */
  private spring(): void {
    this.clearTimer();
    for (const piece of this.pieces) {
      piece.fromX = piece.cx;
      piece.fromY = piece.cy;
      piece.fromAngle = piece.angle;
    }
    this.state = 'return';
    this.clock = 0;
    this.start();
  }

  /** Ask for a frame, unless one is pending, nothing moves or the page is hidden. */
  private start(): void {
    if (this.frame !== null || this.state === 'idle' || this.state === 'rest') return;
    if (!untracked(() => this.platform.pageVisible())) return;
    this.last = null;
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  /** Drop the pending frame. The pieces stay where they are, so a restart continues from them. */
  private pause(): void {
    if (this.frame === null) return;
    cancelAnimationFrame(this.frame);
    this.frame = null;
    this.last = null;
  }

  /**
   * Put the authored children back, the same node objects, and drop the
   * wrapper and the pieces. Idempotent: the end of the flight back, reduced
   * motion and destroy all call it.
   */
  private restore(): void {
    this.pause();
    this.clearTimer();
    this.state = 'idle';
    if (!this.original) return;
    this.el?.replaceChildren(...this.original);
    this.el?.classList.remove('wr-falling-letters--out');
    this.original = null;
    this.pieces = [];
    this.heap = null;
    this.bounds = null;
  }

  /**
   * One frame. The first after a start has no length, so a pause of any length
   * moves nothing when the loop resumes. The fall ends when the last letter
   * settles, and the heap lies still until a click or the rest timer; the
   * flight back ends when the last letter is home, and the text is whole again.
   */
  private tick(now: number): void {
    const dt = this.last === null ? 0 : Math.min(Math.max(0, now - this.last) / 1000, MAX_STEP);
    this.last = now;
    this.clock += dt;
    const done = this.state === 'fall' ? this.stepFall(dt) : this.stepReturn();
    if (!done) {
      this.frame = requestAnimationFrame(t => this.tick(t));
      return;
    }
    this.frame = null;
    this.last = null;
    if (this.state === 'return') {
      this.restore();
      return;
    }
    this.state = 'rest';
    this.timer = setTimeout(
      () => {
        this.timer = null;
        this.spring();
      },
      Math.max(0, this.rest())
    );
  }

  /** Gravity, drift, spin, the walls and the heap for every letter still in the air. True once all have settled. */
  private stepFall(dt: number): boolean {
    const heap = this.heap;
    const bounds = this.bounds;
    if (!heap || !bounds) return true;
    let settled = true;
    for (const piece of this.pieces) {
      if (piece.settled) continue;
      settled = false;
      if (this.clock < piece.release) continue;
      piece.vy += GRAVITY * dt;
      piece.cx += piece.vx * dt;
      piece.cy += piece.vy * dt;
      piece.angle += piece.spin * dt;

      const rad = (piece.angle * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const hw = (piece.w * cos + piece.h * sin) / 2;
      const hh = (piece.h * cos + piece.w * sin) / 2;

      if (piece.cx - hw < bounds.minX) {
        piece.cx = bounds.minX + hw;
        piece.vx = Math.abs(piece.vx) * FRICTION;
      } else if (piece.cx + hw > bounds.maxX) {
        piece.cx = bounds.maxX - hw;
        piece.vx = -Math.abs(piece.vx) * FRICTION;
      }

      const top = heap.top(piece.cx - hw, piece.cx + hw);
      if (piece.cy + hh >= top) {
        piece.cy = top - hh;
        if (piece.vy > BOUNCE_MIN) {
          piece.vy = -piece.vy * RESTITUTION;
          piece.vx *= FRICTION;
          piece.spin *= FRICTION;
        } else {
          piece.vy = 0;
          piece.settled = true;
          heap.settle(piece.cx - hw, piece.cx + hw, piece.cy - hh);
        }
      }
      this.paint(piece);
    }
    return settled;
  }

  /** Each letter springs from where it left toward its place, in reading order. True once all are home. */
  private stepReturn(): boolean {
    const count = this.pieces.length;
    const gap = Math.min(RETURN_GAP, RETURN_SPREAD / Math.max(1, count - 1)) / 1000;
    let home = true;
    this.pieces.forEach((piece, i) => {
      const t = (this.clock - i * gap) / (RETURN / 1000);
      if (t < 0) {
        home = false;
        return;
      }
      const s = spring(t);
      piece.cx = piece.fromX + (piece.x0 - piece.fromX) * s;
      piece.cy = piece.fromY + (piece.y0 - piece.fromY) * s;
      piece.angle = piece.fromAngle * (1 - s);
      if (t < 1) home = false;
      this.paint(piece);
    });
    return home;
  }

  /** Written to the DOM by hand: a binding would wait for change detection, and this is every frame. */
  private paint(piece: Piece): void {
    const x = roundTo(piece.cx - piece.w / 2, 2);
    const y = roundTo(piece.cy - piece.h / 2, 2);
    const angle = roundTo(piece.angle, 2);
    piece.el.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}

export {
  BOUNCE_MIN,
  COLUMN,
  DRIFT,
  FALLING_LETTERS_REST,
  GRAVITY,
  Heap,
  RELEASE,
  RESTITUTION,
  RETURN,
  RETURN_GAP,
  RETURN_SPREAD,
  SPIN,
  scatter,
  spring,
};
