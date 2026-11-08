# Roadmap

Effects are written from scratch for the docs site first, in library idiom, so they can move into their own package later. Each one keeps its text readable to screen readers, renders under SSR and holds still under `prefers-reduced-motion`.

## Very high

## High

## Medium

- **Text on a circle**: a label set around a circle that turns slowly and speeds up on hover.
- **Noise text**: the text jitters with noise and calms down when the pointer leaves.
- **Falling letters**: letters drop and pile up when triggered, and spring back on reset.
- **Aurora background**: soft colour bands drift behind a section.
- **Dot grid**: a field of dots that lights up and pushes away around the pointer.
- **Ripple grid**: a grid that sends a ripple out from where it is clicked.
- **Thread lines**: thin lines that sway with a slow wave and bend toward the pointer.

## Low

- **`wr-graph` zoom and pan**: zoom in and out and drag the field, like NG-ZORRO's
  graph. Selection and highlight come after that.
- **Click sparks**: short sparks burst from the point of a click.
- **Confetti**: a one-shot burst for a success moment, from a point or the whole screen.
- **Spotlight card**: a soft light follows the pointer across a card.
- **Tilt card**: a card leans toward the pointer in 3D and settles back.
- **Ticker**: a row of items that scrolls in a loop and pauses on hover and focus.
- **Fluid cursor**: a colour trail that flows behind the pointer.

## Very low

- **`ngwr/kit` standalone utilities**: publish the internal signal utils,
  positioning, density, hotkey and storage helpers as a zero-dep package usable
  without the components.
- **Ejectable components**: keep npm and `ng update`, and add a schematic that
  copies a component's source into the user's repo.
- **Effects package**: move the docs site effects into their own package once the set settles.
