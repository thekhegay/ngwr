import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/**
 * Sidebar for `/animations/*`, grouped by what an effect is applied to: a run
 * of text, the background of a region, or the pointer and the elements it
 * reaches.
 *
 * Groups and rows are alphabetical. The glow border runs round an
 * element's edge, so it sits with the pointer effects under Interaction, and
 * the marquee, a row of links under the pointer, sits there too.
 *
 * Each group is a folder under `app/animations/`; the URL never contains it.
 */
export const ANIMATIONS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Backgrounds',
    children: [
      wrLink(ROUTES.animations, ROUTES.animations.aurora),
      wrLink(ROUTES.animations, ROUTES.animations.dotGrid),
      wrLink(ROUTES.animations, ROUTES.animations.flowLines),
      wrLink(ROUTES.animations, ROUTES.animations.rippleGrid),
      wrLink(ROUTES.animations, ROUTES.animations.threadLines),
    ],
  },
  {
    title: 'Interaction',
    children: [
      wrLink(ROUTES.animations, ROUTES.animations.clickSparks),
      wrLink(ROUTES.animations, ROUTES.animations.confetti),
      wrLink(ROUTES.animations, ROUTES.animations.fluidCursor),
      wrLink(ROUTES.animations, ROUTES.animations.glowBorder),
      wrLink(ROUTES.animations, ROUTES.animations.marquee),
      wrLink(ROUTES.animations, ROUTES.animations.spotlight),
      wrLink(ROUTES.animations, ROUTES.animations.tilt),
    ],
  },
  {
    title: 'Text',
    children: [
      wrLink(ROUTES.animations, ROUTES.animations.blurReveal),
      wrLink(ROUTES.animations, ROUTES.animations.decode),
      wrLink(ROUTES.animations, ROUTES.animations.destruct),
      wrLink(ROUTES.animations, ROUTES.animations.fallingLetters),
      wrLink(ROUTES.animations, ROUTES.animations.glitch),
      wrLink(ROUTES.animations, ROUTES.animations.gradientFlow),
      wrLink(ROUTES.animations, ROUTES.animations.orbit),
      wrLink(ROUTES.animations, ROUTES.animations.reveal),
      wrLink(ROUTES.animations, ROUTES.animations.rotateReveal),
      wrLink(ROUTES.animations, ROUTES.animations.shimmer),
      wrLink(ROUTES.animations, ROUTES.animations.typewriter),
    ],
  },
];
