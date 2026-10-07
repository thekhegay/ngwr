import { ROUTES, wrPath, type WrRoute } from '#routes';
import type { SidebarGroup, SidebarLink } from '#types';

const base = [ROUTES.bits];

/** A row takes its title and its link from the route node, so the two cannot disagree. */
const link = (route: WrRoute): SidebarLink => ({ title: route.title, url: wrPath(...base, route) });

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
    children: [link(ROUTES.bits.aurora), link(ROUTES.bits.waves)],
  },
  {
    title: 'Blocks',
    children: [
      link(ROUTES.bits.borderGlow),
      link(ROUTES.bits.marquee),
      link(ROUTES.bits.spotlightCard),
      link(ROUTES.bits.starBorder),
      link(ROUTES.bits.tiltCard),
    ],
  },
  {
    title: 'Effects',
    children: [link(ROUTES.bits.clickSpark), link(ROUTES.bits.confetti), link(ROUTES.bits.splashCursor)],
  },
  {
    title: 'Text',
    children: [
      link(ROUTES.bits.blurText),
      link(ROUTES.bits.circularText),
      link(ROUTES.bits.decryptText),
      link(ROUTES.bits.fallingText),
      link(ROUTES.bits.fuzzyText),
      link(ROUTES.bits.glitchText),
      link(ROUTES.bits.gradientText),
      link(ROUTES.bits.rotatingText),
      link(ROUTES.bits.shinyText),
      link(ROUTES.bits.splitText),
      link(ROUTES.bits.typewriter),
    ],
  },
];
