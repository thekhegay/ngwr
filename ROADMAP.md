# Roadmap

## Very high

- **Missing stylesheet warning**: a component whose `@use 'ngwr/<name>'` is
  missing renders unstyled and silent. Each entry point's sheet declares a
  marker; in dev mode the component checks it once and logs which `@use` to add.
- **`wr-table` cell templates ignored without `WrTableCell`**: if Angular does
  not reject an unknown `[wrTableCell]` on `ng-template`, `wr-table` warns in dev
  mode when templates are projected and no cell template registered.
- **`wr-slider` `labelWith`**: `(value: number) => string` for the value label,
  like `displayWith` on `wr-select`.
- **`wr-dropdown` `trigger="manual"`**: no listener on the host, opened only
  through `open()`, `close()` and `toggle()`.
- **Light-only apps**: a paragraph in `llms.txt` and on the theme page on
  `color-scheme: light dark` and `withTheme({ defaultMode: 'light', storageKey: null })`.
- **`wr-select` `freeText` commit points**: document that the raw text commits on
  Enter and on blur, and hold it with a spec.
- **`wr-select` `position`**: the panel only flips between below and above on
  its own; add an input to ask for a side, falling back to the other one when
  there is no room, like `wr-dropdown`.
- **`wr-select` `[options]` in every mode**: today the array works only in
  `mode="search"`; single and multi select take it too, labelled by `displayWith`.

## High

## Medium

## Low

- **`wr-graph` zoom and pan**: zoom in and out and drag the field, like NG-ZORRO's
  graph. Selection and highlight come after that.

## Very low

- **`ngwr/kit` standalone utilities**: publish the internal signal utils,
  positioning, density, hotkey and storage helpers as a zero-dep package usable
  without the components.
- **Ejectable components**: keep npm and `ng update`, and add a schematic that
  copies a component's source into the user's repo.
