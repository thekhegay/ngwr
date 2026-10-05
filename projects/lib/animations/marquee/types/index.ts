import type { TemplateRef } from '@angular/core';

/** Image-driven marquee entry. */
interface WrMarqueeImage {
  readonly src: string;
  readonly alt?: string;
  readonly href?: string;
  readonly title?: string;
  readonly width?: number;
  readonly height?: number;
  readonly srcSet?: string;
  readonly sizes?: string;
}

/** Template-driven marquee entry — `node` is rendered via `*ngTemplateOutlet`. */
interface WrMarqueeNode {
  readonly node: TemplateRef<unknown>;
  readonly href?: string;
  readonly ariaLabel?: string;
  readonly title?: string;
}

type WrMarqueeItem = WrMarqueeImage | WrMarqueeNode;

export type { WrMarqueeImage, WrMarqueeNode, WrMarqueeItem };
