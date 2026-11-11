# Roadmap

Effects ship as `ngwr/animations/*` entry points, written from scratch in library idiom. Each one keeps its text readable to screen readers, renders under SSR and holds still under `prefers-reduced-motion`.

## Very high

- **Storage blocked by the browser**: the default storage engine reads `localStorage` outside its `try`, so with cookies or storage blocked (sandboxed iframe, block-all-cookies) the first component that resolves `WrI18n` throws. Fall back to memory.
- **Pagination focus**: the page cells are tracked by `$index`, so after a click focus lands on another page number, or on the body when the slot turns into an ellipsis. Track by page.
- **`wrPoll` interval**: a 0 or `NaN` interval is refused only in dev mode; in production the timer re-arms at 0 ms for ever. Guard it in every build.
- **`wr-transfer` right pane**: the target list rescans every item on each keystroke and checkbox toggle, and the orphan warning repeats with it.
- **`wr-countdown` end**: a finished countdown keeps its timer running, and a target already in the past never emits `countdownEnd`.
- **`wr-input-number` and `wr-date-picker` width**: in a form field the host stretches but its `wr-input-group` stays at content width, so the box is shorter than a `wrInput` beside it.
- **`wr-select` and `wr-table` lookups**: multi-select membership and table expand state compare arrays item by item; use sets.
- **`virtualScroll` on a plain select**: the flag only works with search, and does nothing without a word otherwise.
- **Date picker size**: `wr-date-picker` and `wr-date-range-picker` have no `size`, unlike every other field.
- **Open pickers from code**: select, cascader, tree overlay and date picker have no `open()` / `close()` and no `opened` / `closed`, unlike `wrDropdown` and `wrPopover`.
- **Date picker clear**: no `clearable`, unlike select, cascader and tree.
- **Naming and types**: small mismatches across tabs, slider, input, alert, drawer, toast, popover and dropdown.

## High

## Medium

- **jsdom 31**: the compare and graph specs assert exact inline-style strings; check the geometry instead so the Dependabot bump goes green.
- **Peer floors**: the `rxjs` and `prosemirror-*` floors are below anything tested. Extend the floor spec to every peer.
- **Testing guide**: the comment and load-state harnesses are missing from it, with a check that names every `/testing` entry point.
- **Toast action**: an action button such as Undo or Retry.
- **Date range presets**: one-click ranges such as Last 7 days, with labels from the app.
- **Sortable list groups**: drag between connected lists, with a move event that says from and to.
- **Dropdown submenus**: nested menus with arrow-key support, the base for a split button.
- **Slider marks and vertical mode**.
- **Lightbox gallery**: previous and next, a counter and arrow keys across a group.

## Low

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
