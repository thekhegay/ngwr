/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  type ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { WrSpinner } from 'ngwr/spinner';
import { wrResolveCssSize, type WrResolvedCssSize, wrCheckStyles, wrInitials } from 'ngwr/utils';

import type { WrAvatarShape, WrAvatarSize } from './types';

const DEFAULT_SIZE: WrAvatarSize = '6rem';

/**
 * The tints `tint` picks from, each a `-soft` fill under its `-ink` text. Index
 * order is part of the contract: the same name lands on the same tint on every
 * render, server or client, and a reorder would re-colour every avatar.
 */
const TINTS = ['primary', 'success', 'warning', 'danger', 'info'] as const;

/** FNV-1a over the UTF-16 units: small, dependency-free and the same everywhere. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    // eslint-disable-next-line no-bitwise -- the hash is defined on bits
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // eslint-disable-next-line no-bitwise -- to an unsigned 32-bit integer
  return h >>> 0;
}

/**
 * Image avatar with configurable corner treatment.
 *
 * Projected content (typically initials) is the FALLBACK: it shows with no
 * `url`, while the image loads and after it fails, and leaves the paint once the
 * image has loaded. It is projected into a `.wr-avatar__content` wrapper, so a
 * `wr-avatar > …` child selector no longer reaches it. While it is there, no
 * spinner is drawn over it; with nothing projected, the spinner marks the
 * loading state instead. See `alt` for what a screen reader hears.
 *
 * `name` is the shorter route to the same avatar: it names the image, draws the
 * person's initials (`wrInitials` from `ngwr/utils`) as the fallback, and with
 * `tint` colours the box from a hash of the name. The fallback order is
 * projected content, then the `name` initials, then the spinner: the initials
 * are drawn only when nothing is projected.
 *
 * Projected initials take the text size around the avatar, capped at
 * `--wr-avatar-initials-scale` (`0.375`) of the box, so they shrink only where
 * they would not fit: a 16px avatar in a 14px chip draws 6px letters, while a
 * `6rem` one keeps the surrounding size up to 36px and is capped only past it.
 * Anything projected that is sized in `em` follows the cap too — a `<wr-icon>`
 * at its default `1.2em` included — so pin a `px` or `rem` size on the projected
 * element, or override the hook, to keep it. A `font-size` rule on the avatar
 * itself still wins, unless it sits in a cascade layer (Tailwind v4's utilities
 * do), which ngwr's unlayered stylesheet beats whatever the selector.
 *
 * The initials are inert: `pointer-events: none` hands a click on them to whatever
 * holds the avatar, and `user-select: none` keeps them out of a text selection.
 *
 * @example
 * ```html
 * <wr-avatar url="/me.png" alt="Roman" size="3rem" shape="circle" />
 * <wr-avatar [url]="photo" alt="Roman Khegay" [size]="48">RK</wr-avatar>
 * <wr-avatar [url]="photo" name="Roman Khegay" [size]="48" tint />
 * ```
 *
 * @see https://ngwr.dev/reference/components/avatar
 */
@Component({
  selector: 'wr-avatar',
  templateUrl: './avatar.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-avatar',
    '[class]': 'classes()',
    '[style.width]': 'cssSize()',
    '[style.height]': 'cssSize()',
    // What the stylesheet sizes projected initials against. Always px or rem: a
    // value `wrResolveCssSize` has no pixels for falls back to the default box.
    '[style.--wr-avatar-size]': 'cssSize()',
  },
  imports: [WrSpinner],
})
export class WrAvatar {
  /**
   * Image URL. Projected content (e.g. initials) shows while it is unset,
   * loading or broken, and gives way once the image has loaded.
   *
   * @default null
   */
  readonly url = input<string | null>(null);

  /**
   * Alt text for the image. Falls back to `avatar.alt`, then `'Avatar'` — pass
   * the person's name where you have it, since that is what a reader wants.
   *
   * With an `alt`, projected initials are hidden from assistive technology while
   * an image is in play, so the name is announced once. Without one, the image
   * carries only the generic name, so the initials stay announced beside it —
   * visually hidden once it has loaded, never dropped.
   *
   * `alt=""` marks the avatar decorative, as it does on an `<img>`: the image is
   * silent and so are the initials while an image is in play — for an avatar beside
   * a name that is already printed. After a failed load with nothing projected, the
   * `alt` is still announced, so a broken image never leaves the avatar nameless.
   *
   * @default null
   */
  readonly alt = input<string | null>(null);

  /**
   * The person's name. It is the image's alt text when `alt` is not given
   * (`alt` wins when both are, `alt=""` included), and its initials are the
   * fallback when nothing is projected: shown with no `url`, while the image
   * loads and after it fails, hidden once the image has loaded. Announced as the
   * name rather than as two letters, and once only beside an image. A name with
   * no initial (`'...'`) draws nothing and leaves the spinner to the image.
   *
   * @default null
   */
  readonly name = input<string | null>(null);

  /**
   * Colour the initials avatar from a stable hash of `name`: the same name is
   * the same tint on every render, server and client alike, and a new name is a
   * new tint. Five tints, each an intent's `-soft` fill under its `-ink` text,
   * so the initials reach 4.5:1 in both schemes. Nothing without `name`, and
   * nothing while projected content stands in for the initials.
   *
   * @default false
   */
  readonly tint = input(false, { transform: coerceBooleanProperty });

  /** `alt=""`, given on purpose — see `alt`. */
  private readonly decorative = computed(() => this.alt() === '');

  private readonly locale = inject(LOCALE_ID);

  private readonly namedAlt = useI18nText(
    computed(() => {
      const name = this.name()?.trim();
      // A blank name is no name: the catalog fallback, as with no name at all.
      if (this.alt() === null && !name) return null;
      return this.alt() ?? name;
    }),
    'avatar.alt',
    'Avatar'
  );

  /** The initials `name` yields, `''` when it yields none. */
  protected readonly initials = computed(() => wrInitials(this.name(), this.locale));

  /** The tint modifier's intent, or `null` with `tint` off or no initials to colour. */
  private readonly tintName = computed(() => {
    if (!this.tint() || !this.initials()) return null;
    return TINTS[hash(this.name()!.trim()) % TINTS.length];
  });

  /** The image's text alternative: empty when decorative, else the catalog's fallback for an unset one. */
  protected readonly resolvedAlt = computed(() => (this.decorative() ? '' : this.namedAlt()));

  /**
   * Corner treatment. `rounded` (default) is a soft rounded square,
   * `circle` is the classic profile avatar, `squircle` is the iOS look.
   *
   * @default 'rounded'
   */
  readonly shape = input<WrAvatarShape>('rounded');

  /**
   * Box size. See {@link WrAvatarSize} for accepted values. The resolved value is
   * published on the host as `--wr-avatar-size`.
   *
   * @default '6rem'
   */
  readonly size = input<WrAvatarSize>(DEFAULT_SIZE);

  protected readonly loaded = signal(false);

  /**
   * Whether the image failed. Without this the spinner spun forever on a broken
   * URL — the one state where an avatar is guaranteed to have projected initials
   * worth showing instead.
   */
  protected readonly failed = signal(false);

  private readonly img = viewChild<ElementRef<HTMLImageElement>>('img');

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('avatar');
    // A new URL is a new attempt: after a failure the fallback would otherwise
    // stay put for an image that loads perfectly well.
    effect(() => {
      this.url();
      untracked(() => {
        this.loaded.set(false);
        this.failed.set(false);
      });
    });

    afterNextRender(() => this.adoptSettledImage());
  }

  /**
   * A prerendered `<img>` starts loading when the browser parses the HTML, and
   * `(load)` / `(error)` are only attached at hydration — so on a slow bundle the
   * image settles first, both events go nowhere, and the avatar sits on its
   * fallback over a photo it already has (or names a broken image it never
   * learns about). Only the FIRST render can race: every later `<img>` is
   * created on the client with its listeners in place before `src` is set.
   */
  private adoptSettledImage(): void {
    const img = this.img()?.nativeElement;
    if (!img?.complete || this.loaded() || this.failed()) return;

    if (img.naturalWidth > 0) {
      this.loaded.set(true);
      return;
    }

    // Zero wide is a broken image, or an SVG with no intrinsic size in an engine
    // that reports it as 0 — only the element can tell. Setting `src` to the
    // value it already has makes it fire `load` or `error` again, to listeners
    // that exist now.
    const src = img.getAttribute('src');
    if (src !== null) img.setAttribute('src', src);
  }

  protected readonly resolved = computed<WrResolvedCssSize>(() => {
    const result = wrResolveCssSize(this.size(), { defaultValue: DEFAULT_SIZE });
    if (result.pxValue == null || result.pxValue <= 0) {
      return wrResolveCssSize(DEFAULT_SIZE, { defaultValue: DEFAULT_SIZE });
    }
    return result;
  });

  /**
   * Whether the projected fallback is `aria-hidden`: an `<img>` is in the DOM
   * (loading or loaded) AND the consumer named it, or marked it decorative with
   * `alt=""`. Then the image's `alt` owns the name, announced once and unchanged
   * at the moment the photo arrives. Without a real `alt` the image is only
   * "Avatar", and hiding the initials would drop the one thing that says who
   * this is.
   *
   * The stylesheet keys on the same attribute once `--loaded`: a hidden fallback
   * leaves the paint through `visibility`, a named-by-initials one is clipped and
   * stays in the accessibility tree. While loading it is painted either way.
   */
  protected readonly fallbackHidden = computed(
    () => !!this.url() && !this.failed() && (this.decorative() || !!this.alt()?.trim() || !!this.name()?.trim())
  );

  /**
   * The `name` initials follow the projected fallback, and go silent for a
   * decorative avatar too: with `alt=""` there is a name printed beside it, and
   * two letters read on top of it would say it twice.
   */
  protected readonly initialsHidden = computed(() => this.fallbackHidden() || this.decorative());

  protected readonly cssSize = computed(() => this.resolved().cssValue);
  protected readonly pxSize = computed(() => this.resolved().pxValue);

  protected readonly classes = computed(() => {
    const parts: string[] = [];
    const shape = this.shape();
    if (shape !== 'rounded') parts.push(`wr-avatar--${shape}`);
    if (this.loaded()) parts.push('wr-avatar--loaded');
    const tint = this.tintName();
    if (tint) parts.push(`wr-avatar--tint-${tint}`);
    return parts.join(' ');
  });

  protected onImageLoad(): void {
    this.loaded.set(true);
  }

  protected onImageError(): void {
    this.failed.set(true);
  }
}
