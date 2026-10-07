import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/**
 * Sidebar for `/bits/*` — animated UI effects. Mix of in-house ngwr
 * components and reactbits.dev ports. Per-page attribution lives on each
 * port page via `<ngwr-reactbits-credit>` so the nav stays uncluttered.
 *
 * Grouped by what the animation attaches to: text, block-level containers,
 * pointer/scroll effects, and full-bleed backgrounds.
 */
export const BITS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Backgrounds',
    children: [wrLink(ROUTES.bits, ROUTES.bits.aurora), wrLink(ROUTES.bits, ROUTES.bits.waves)],
  },
  {
    title: 'Blocks',
    children: [
      wrLink(ROUTES.bits, ROUTES.bits.borderGlow),
      wrLink(ROUTES.bits, ROUTES.bits.marquee),
      wrLink(ROUTES.bits, ROUTES.bits.spotlightCard),
      wrLink(ROUTES.bits, ROUTES.bits.starBorder),
      wrLink(ROUTES.bits, ROUTES.bits.tiltCard),
    ],
  },
  {
    title: 'Effects',
    children: [
      wrLink(ROUTES.bits, ROUTES.bits.clickSpark),
      wrLink(ROUTES.bits, ROUTES.bits.confetti),
      wrLink(ROUTES.bits, ROUTES.bits.splashCursor),
    ],
  },
  {
    title: 'Text',
    children: [
      wrLink(ROUTES.bits, ROUTES.bits.blurText),
      wrLink(ROUTES.bits, ROUTES.bits.circularText),
      wrLink(ROUTES.bits, ROUTES.bits.decryptText),
      wrLink(ROUTES.bits, ROUTES.bits.fallingText),
      wrLink(ROUTES.bits, ROUTES.bits.fuzzyText),
      wrLink(ROUTES.bits, ROUTES.bits.glitchText),
      wrLink(ROUTES.bits, ROUTES.bits.gradientText),
      wrLink(ROUTES.bits, ROUTES.bits.rotatingText),
      wrLink(ROUTES.bits, ROUTES.bits.shinyText),
      wrLink(ROUTES.bits, ROUTES.bits.splitText),
      wrLink(ROUTES.bits, ROUTES.bits.typewriter),
    ],
  },
];
