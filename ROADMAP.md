# Roadmap

Effects ship as `ngwr/animations/*` entry points, written from scratch in library idiom. Each one keeps its text readable to screen readers, renders under SSR and holds still under `prefers-reduced-motion`.

## Very high

- **`wr-select` options of objects**: `[options]` with `valueWith` so the model holds the id, not the object; the same `[options]` on `wr-radio-group`.
- **Toast shorthands**: `toast.success(message, options?)`, `.info`, `.warning`, `.danger` beside `show()`.
- **Full-width form controls**: `block` on select, input-number, date pickers and segmented, or the form field stretches its control.
- **Icon-only button label**: `label` on `wr-btn` sets the accessible name and a tooltip from one string.

## High

- **Dialog sizes**: `size: 'sm' | 'md' | 'lg'` with a hook per size, plus `minWidth`, `height` and `maxHeight` options.
- **Signal Forms rules**: `wrMatches(a, b)` and `wrNotBlank(x)` beside the reactive-forms validators.
- **Table layout**: `layout="fixed"` with wrapping cells (today `--fixed` also clips every cell), and a row actions cell of square icon buttons.
- **Tabular digits**: `numeric` on `wrTypography`, beside `mono`.
- **Focus the first field**: `wrAutofocus="first"` inside a container, and `wrFocusFirstInvalid(root)` after a failed submit.

## Medium

- **HTTP error text**: `wrHttpStatus(error)` and `wrHttpErrorText(error, overrides)`, texts from the i18n catalog.
- **Form layout**: a column with a gap, `inline`, and rows of N equal columns.
- **Print rules**: sider, header, back-top, speed-dial and toasts hidden in print, plus a `.wr-no-print` class.
- **Page shell**: a `--wr-layout-content-padding` hook, truncation on breadcrumb items, a second row inside a sticky `wr-page-header`.
- **Canvas colour**: `--wr-color-canvas`, the page background one step behind `surface`.

## Low

- **One intent name**: alert and toast say `type`, result and load-state say `status`, button and tag say `color`; a rename waits for a major.
- **`wr-graph` selection and highlight**: pick a node and light up its links, after zoom and pan.
- **Pagination on one page**: `hideOnSinglePage` on `wr-pagination`.
- **`[wrInView]`**: an output with `threshold` and `once`, on one shared observer.
- **Table search**: client-side text search through each column's `format`.
- **Stored files**: already uploaded files (name, size, link, remove) in `wr-file-upload`'s list.
- **Cropper to file**: `WrImageCropper.toFile(name)` with the extension of the encoded type.
- **Small gaps**: a checked `wr-dropdown-item`, a count on `wr-tab`, an avatar group, a ghost `wr-btn`.
- **Exact router tabs**: an `exact` option, so an overview tab is not selected on every child route.

## Very low

- **`ngwr/kit` standalone utilities**: publish the internal signal utils,
  positioning, density, hotkey and storage helpers as a zero-dep package usable
  without the components.
