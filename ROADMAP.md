# Roadmap

## Very high

- **`wr-table` cell templates ignored without `WrTableCell`**: if Angular does
  not reject an unknown `[wrTableCell]` on `ng-template`, `wr-table` warns in dev
  mode when templates are projected and no cell template registered.
- **`wr-slider` `labelWith`**: `(value: number) => string` for the value label,
  like `displayWith` on `wr-select`.
- **`wr-dropdown` `trigger="manual"`**: no listener on the host, opened only
  through `open()`, `close()` and `toggle()`.
- **Light-only apps**: a paragraph in `llms.txt` and on the theme page on
  `color-scheme: light dark` and `withTheme({ defaultMode: 'light', storageKey: null })`.

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
