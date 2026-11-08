import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/**
 * Sidebar for `/animations/*`, grouped by what an effect is applied to: a run
 * of text, the background of a region, or the pointer and the elements it
 * reaches. Text comes first, since a heading is where most pages start.
 *
 * The effects move into the package in batches, and a group appears here with
 * its first page: `Interaction` follows Backgrounds. Rows are alphabetical
 * inside a group.
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
];
