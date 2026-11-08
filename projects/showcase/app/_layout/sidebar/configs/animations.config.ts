import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/**
 * Sidebar for `/animations/*`, grouped by what an effect is applied to: a run
 * of text, the background of a region, or the pointer and the elements it
 * reaches. Text comes first, since a heading is where most pages start.
 *
 * Rows are alphabetical inside a group. The signal sweep is an accent on a
 * run of text, so it sits under Text; the glow border runs round an element's
 * edge, so it sits with the pointer effects under Interaction.
 *
 * Each group is a folder under `app/animations/`; the URL never contains it.
 */
export const ANIMATIONS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Text',
    children: [
      wrLink(ROUTES.animations, ROUTES.animations.blurReveal),
      wrLink(ROUTES.animations, ROUTES.animations.circleText),
      wrLink(ROUTES.animations, ROUTES.animations.decode),
      wrLink(ROUTES.animations, ROUTES.animations.fallingLetters),
      wrLink(ROUTES.animations, ROUTES.animations.glitch),
      wrLink(ROUTES.animations, ROUTES.animations.gradientFlow),
      wrLink(ROUTES.animations, ROUTES.animations.letterStagger),
      wrLink(ROUTES.animations, ROUTES.animations.noiseText),
      wrLink(ROUTES.animations, ROUTES.animations.shine),
      wrLink(ROUTES.animations, ROUTES.animations.signalSweep),
      wrLink(ROUTES.animations, ROUTES.animations.typewriter),
      wrLink(ROUTES.animations, ROUTES.animations.wordRotator),
    ],
  },
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
      wrLink(ROUTES.animations, ROUTES.animations.spotlight),
      wrLink(ROUTES.animations, ROUTES.animations.ticker),
      wrLink(ROUTES.animations, ROUTES.animations.tilt),
    ],
  },
];
