import { ROUTES } from '#routes';
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
    children: [ROUTES.bits.aurora, ROUTES.bits.waves],
  },
  {
    title: 'Blocks',
    children: [
      ROUTES.bits.borderGlow,
      ROUTES.bits.marquee,
      ROUTES.bits.spotlightCard,
      ROUTES.bits.starBorder,
      ROUTES.bits.tiltCard,
    ],
  },
  {
    title: 'Effects',
    children: [ROUTES.bits.clickSpark, ROUTES.bits.confetti, ROUTES.bits.splashCursor],
  },
  {
    title: 'Text',
    children: [
      ROUTES.bits.blurText,
      ROUTES.bits.circularText,
      ROUTES.bits.decryptText,
      ROUTES.bits.fallingText,
      ROUTES.bits.fuzzyText,
      ROUTES.bits.glitchText,
      ROUTES.bits.gradientText,
      ROUTES.bits.rotatingText,
      ROUTES.bits.shinyText,
      ROUTES.bits.splitText,
      ROUTES.bits.typewriter,
    ],
  },
];
