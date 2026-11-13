# Roadmap

Effects ship as `ngwr/animations/*` entry points, written from scratch in library idiom. Each one keeps its text readable to screen readers, renders under SSR and holds still under `prefers-reduced-motion`.

## Very high

## High

## Medium

- **Unused devDependency**: drop `@angular-devkit/core` if nothing needs it directly.

## Low

- **One intent name**: alert and toast say `type`, result and load-state say `status`, button and tag say `color`; a rename waits for a major.
- **`wr-graph` zoom and pan**: zoom in and out and drag the field, like NG-ZORRO's
  graph. Selection and highlight come after that.

## Very low

- **Typeahead**: type to jump in select, dropdown, tree and context menu, from the cascader's logic moved into one `ngwr/utils` helper.
- **Carousel autoplay**: a pause button, an announced slide change and bigger dots.
- **Tour step text**: the step's text is not tied to the dialog, so a screen reader skips it.
- **Select announcements**: say loading and no results in a search or async select.
- **File-upload remove buttons**: each carries the file name, and the two dead catalog keys go.
- **`ngwr/kit` standalone utilities**: publish the internal signal utils,
  positioning, density, hotkey and storage helpers as a zero-dep package usable
  without the components.
- **Ejectable components**: keep npm and `ng update`, and add a schematic that
  copies a component's source into the user's repo.
