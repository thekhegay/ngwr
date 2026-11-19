# Roadmap

Effects ship as `ngwr/animations/*` entry points, written from scratch in library idiom. Each one keeps its text readable to screen readers, renders under SSR and holds still under `prefers-reduced-motion`.

## Very high

## High

- **Table rows that lead somewhere**: `rowLink` on `wr-table`, a real link per row that keyboard and middle-click reach; the row tint only on rows that link or click.
- **Day strings**: `wrToDay(date)` and `wrToday()` in `ngwr/date` for `YYYY-MM-DD` values, then `valueFormat="day"` on `wr-date-picker`.

## Medium

- **Compact table**: `size="sm"` on `wr-table` and cell padding hooks, and sorting from anywhere in a sortable header cell.
- **Sidebar rows**: an action row, header and footer slots, and a neutral active row in `wr-sidebar`.
- **Progress marks**: `marks` on `wr-progress`, for a term strip.
- **Follow the end**: a stick-to-bottom mode on `WrScroll` that keeps its place when older items load above.

## Low

- **`[wrTooltip]`**: a short form of `wrPopover` with `mode="tooltip"`.
- **Kazakh**: an `ngwr/i18n/kk` catalog.
- **Option leading with `valueWith`**: `wrOptionLeading` gets the item, not only its id.

- **One intent name**: alert and toast say `type`, result and load-state say `status`, button and tag say `color`; a rename waits for a major.

## Very low

- **`ngwr/kit` standalone utilities**: publish the internal signal utils,
  positioning, density, hotkey and storage helpers as a zero-dep package usable
  without the components.
