/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  Component,
  type ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { WrSpinner } from 'ngwr/spinner';
import { resolveCssSize, type ResolvedCssSize } from 'ngwr/utils';

import type { WrAvatarShape, WrAvatarSize } from './interfaces';

const DEFAULT_SIZE: WrAvatarSize = '6rem';

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
 * @example
 * ```html
 * <wr-avatar url="/me.png" alt="Roman" size="3rem" shape="circle" />
 * <wr-avatar [url]="photo" alt="Roman Khegay" [size]="48">RK</wr-avatar>
 * ```
 *
 * @see https://ngwr.dev/reference/components/avatar
 */
@Component({
  selector: 'wr-avatar',
  templateUrl: './avatar.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[style.width]': 'cssSize()',
    '[style.height]': 'cssSize()',
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
   * @default null
   */
  readonly alt = input<string | null>(null);

  protected readonly resolvedAlt = useI18nText(this.alt, 'avatar.alt', 'Avatar');

  /**
   * Corner treatment. `rounded` (default) is a soft rounded square,
   * `circle` is the classic profile avatar, `squircle` is the iOS look.
   *
   * @default 'rounded'
   */
  readonly shape = input<WrAvatarShape>('rounded');

  /**
   * Box size. See {@link WrAvatarSize} for accepted values.
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

  protected readonly resolved = computed<ResolvedCssSize>(() => {
    const result = resolveCssSize(this.size(), { defaultValue: DEFAULT_SIZE });
    if (result.pxValue == null || result.pxValue <= 0) {
      return resolveCssSize(DEFAULT_SIZE, { defaultValue: DEFAULT_SIZE });
    }
    return result;
  });

  /**
   * Whether the projected fallback is `aria-hidden`: an `<img>` is in the DOM
   * (loading or loaded) AND the consumer named it. Then the image's `alt` owns
   * the name, announced once and unchanged at the moment the photo arrives.
   * Without a real `alt` the image is only "Avatar", and hiding the initials
   * would drop the one thing that says who this is.
   *
   * The stylesheet keys on the same attribute once `--loaded`: a hidden fallback
   * leaves the paint through `visibility`, a named-by-initials one is clipped and
   * stays in the accessibility tree. While loading it is painted either way.
   */
  protected readonly fallbackHidden = computed(() => !!this.url() && !this.failed() && !!this.alt()?.trim());

  protected readonly cssSize = computed(() => this.resolved().cssValue);
  protected readonly pxSize = computed(() => this.resolved().pxValue);

  protected readonly classes = computed(() => {
    const parts = ['wr-avatar'];
    const shape = this.shape();
    if (shape !== 'rounded') parts.push(`wr-avatar--${shape}`);
    if (this.loaded()) parts.push('wr-avatar--loaded');
    return parts.join(' ');
  });

  protected onImageLoad(): void {
    this.loaded.set(true);
  }

  protected onImageError(): void {
    this.failed.set(true);
  }
}
