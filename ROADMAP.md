# Roadmap

Effects ship as `ngwr/animations/*` entry points, written from scratch in library idiom. Each one keeps its text readable to screen readers, renders under SSR and holds still under `prefers-reduced-motion`.

## Very high

- **Rounded fields**: on textarea, cascader, date-picker, range picker and input-otp.
- **Per-instance labels**: `*Label` inputs on calendar, event-calendar, tree, chart-legend and stepper.
- **One position set**: popconfirm and dropdown take popover's twelve positions.

## High

## Medium

- **Testing guide**: the harness methods added in 16.x (range presets, alert dialogs, slider marks, toast actions).
- **Missing reference pages**: `ngwr/charts/core`, the `ngwr/date` exports (`wrIsDateOnly`, `wrToLocalDate`, `WR_DATE_INPUT`, `WR_DATE_STAMP_DEFAULTS`), `wrFeature`, `wrIsSafeCssValue`, `WR_LIVE_LOCALE`, `wrMatchesHotkey` and `wrParseHotkeySpec`.
- **Installation and migration**: a 16.x compatibility row, and the date output changes of 16.1 and 16.2.
- **See also and labels**: table to date-stamp and sortable-list, toast to drawer, and the date-picker's `clearLabel`.
- **Faster slow specs**: one cached Sass compile helper, the theme and layered-layout specs computing once, and timeouts on the MCP compile hook and the other heavy files.
- **Lint stages**: `check:selectors`, `check:install` and `check:attrs` build the selector map once.
- **Unused devDependency**: drop `@angular-devkit/core` if nothing needs it directly.
- **Table column visibility**: a hidden-columns model beside `columnOrder`, with an optional chooser.
- **Table bulk actions**: a bar over the header while rows are selected.
- **Table state**: one output for sort, filters, page and page size.
- **Select all**: in a multi select, honouring the search and `maxItems`.
- **Period pickers**: month, year, week and quarter modes on the date-picker.
- **Upload lifecycle**: progress, status, retry, image previews and paste in `wr-file-upload`.
- **Input mask**: a `wrMask` directive and grouped number input, so the docs stop pointing at ngx-mask.
- **Table inline edit**: an edit-cell template, Enter commits, Escape cancels.
- **Tree at scale**: lazy children, a filter and cascading checks.
- **Tree drag and drop**: reorder and reparent with an output.
- **Schema-form arrays and sections**: repeating groups, fieldsets and more field kinds.
- **Async graph layouts**: a layout that returns a promise draws when it resolves.

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
