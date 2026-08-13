/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The states `check:state-contrast` drives, and the only hand-maintained part
 * of that gate.
 *
 * Selectors are the library's own BEM classes wherever possible. Those are
 * public API — consumers style against them and they do not get renamed on a
 * whim — so a table written against `.wr-option--selected` is stabler than one
 * written against the showcase's demo markup, which is free to change.
 *
 * Adding one: give it an `id` that reads as "component / state", the docs route
 * it lives on, the steps that create it, and a `target` that EXISTS ONLY in
 * that state. The target is asserted visible before anything is measured, and a
 * miss fails the run rather than passing quietly — so a wrong selector is loud,
 * which is the whole reason it is a separate field from `scope`.
 */

const REF = '/reference/components';

/**
 * Scope a selector to a live demo.
 *
 * Not cosmetic. The showcase's own chrome is built out of the library, so the
 * FIRST `.wr-dropdown-trigger` on every page is the header's version switcher
 * and the first `.wr-tabs__tab` may be a docs tab — a table written against
 * bare class names silently measures the docs site instead of the component it
 * names. Overlay panels still escape to the overlay container, so only the
 * trigger and the in-page states take this.
 */
const demo = (selector: string): string => `:is(ngwr-doc-snippet, ngwr-doc-playground) ${selector}`;

/**
 * `demo()` prefixes ONE selector, so a comma inside it would scope the first
 * branch and leave the rest matching the whole page. Alternatives go through
 * here instead, and each branch gets the prefix.
 */
const demoAny = (...selectors: readonly string[]): string => selectors.map(demo).join(', ');

export const STATES: readonly State[] = [
  // ── Overlays. Prerendered HTML does not contain them at all, so every pixel
  // below this comment is unmeasured by both other gates.
  {
    id: 'select/panel',
    route: `${REF}/select`,
    steps: [{ click: demo('.wr-select__trigger') }],
    target: '.wr-option',
    scope: '.wr-select-panel',
    note: 'wr-option--selected measured 4.17:1 in light before the -ink move.',
  },
  {
    id: 'select/option-active',
    route: `${REF}/select`,
    steps: [{ click: demo('.wr-select__trigger') }, { press: 'ArrowDown' }],
    target: '.wr-option--active, .wr-option[aria-selected="true"]',
    scope: '.wr-select-panel',
  },
  {
    id: 'dropdown/menu',
    route: `${REF}/dropdown`,
    steps: [{ click: demo('.wr-dropdown-trigger') }],
    target: '.wr-dropdown-menu',
    scope: '.wr-dropdown-menu',
  },
  {
    id: 'dropdown/item-hover',
    route: `${REF}/dropdown`,
    steps: [{ click: demo('.wr-dropdown-trigger') }, { hover: '.wr-dropdown-item' }],
    target: '.wr-dropdown-item',
    scope: '.wr-dropdown-menu',
  },
  {
    id: 'context-menu/open',
    route: `${REF}/context-menu`,
    steps: [{ rightClick: demo('.wr-context-menu-host') }],
    target: '.wr-context-menu-item',
    scope: '.wr-context-menu',
    note: 'Its :focus-visible twin can never match — items are tabindex="-1" and the menu holds focus.',
  },
  {
    id: 'context-menu/item-hover',
    route: `${REF}/context-menu`,
    steps: [{ rightClick: demo('.wr-context-menu-host') }, { hover: '.wr-context-menu-item' }],
    target: '.wr-context-menu-item',
    scope: '.wr-context-menu',
  },
  {
    id: 'command-palette/active-option',
    route: `${REF}/command-palette`,
    steps: [{ click: demo('button:has-text("Open palette")') }],
    target: '.wr-command-palette__option--active',
    scope: '.wr-command-palette',
    note: 'The shortcut <kbd> here measured 4.17:1 in light — a translucent chip over the active row tint.',
  },
  {
    id: 'cascader/panel',
    route: `${REF}/cascader`,
    steps: [{ click: demo('.wr-cascader__trigger') }],
    target: '.wr-cascader__opt',
    scope: '.wr-cascader-panel',
  },
  {
    id: 'cascader/option-active',
    route: `${REF}/cascader`,
    steps: [{ click: demo('.wr-cascader__trigger') }, { hover: '.wr-cascader__opt' }],
    target: '.wr-cascader__opt',
    scope: '.wr-cascader-panel',
  },
  {
    id: 'date-picker/calendar',
    route: `${REF}/date-picker`,
    steps: [{ click: demo('.wr-date-picker__trigger') }],
    target: '.wr-calendar__day',
    scope: '.wr-calendar',
    note: 'wr-calendar__day--today paints --wr-calendar-accent, which no token grep finds.',
  },
  {
    id: 'dialog/open',
    route: `${REF}/dialog`,
    steps: [{ click: demo('.wr-btn:has-text("Open confirm dialog")') }],
    target: '.wr-dialog-panel',
    scope: '.wr-dialog-panel',
  },
  {
    id: 'drawer/open',
    route: `${REF}/drawer`,
    steps: [{ click: demo('.wr-btn:has-text("Open drawer")') }],
    target: '.wr-drawer__panel',
    scope: '.wr-drawer__panel',
  },
  {
    id: 'action-sheet/open',
    route: `${REF}/action-sheet`,
    steps: [{ click: demo('.wr-btn:has-text("Open action sheet")') }],
    target: '.wr-action-sheet__action',
    scope: '.wr-action-sheet',
    note: 'Its actions paint the intent as TEXT, which is the -ink case.',
  },
  {
    id: 'popconfirm/open',
    route: `${REF}/popconfirm`,
    steps: [{ click: demo('.wr-popconfirm-trigger') }],
    target: '.wr-popconfirm',
    scope: '.wr-popconfirm',
  },
  {
    id: 'toast/danger',
    route: `${REF}/toast`,
    steps: [{ click: demo('.wr-btn:has-text("Danger")') }, { wait: 200 }],
    target: '.wr-toast',
    scope: '.wr-toast',
  },
  {
    id: 'lightbox/open',
    route: `${REF}/lightbox`,
    steps: [{ click: demo('.wr-lightbox__trigger') }, { wait: 200 }],
    target: '.wr-lightbox',
    scope: '.wr-lightbox',
  },

  // ── Hover and selection states on the page itself. Painted, but only after
  // an interaction, so a page at rest never shows them either.
  {
    id: 'segmented/option-hover',
    route: `${REF}/segmented`,
    steps: [{ hover: demo('.wr-segmented__option:not(.wr-segmented__option--selected)') }],
    target: demo('.wr-segmented__option'),
    scope: demo('.wr-segmented'),
    note: 'Was 4.19:1 in light for as long as the rule existed.',
  },
  {
    id: 'tree/row-selected',
    route: `${REF}/tree`,
    steps: [{ click: demo('.wr-tree__label') }],
    target: demoAny('.wr-tree__row--selected', '.wr-tree__row[aria-selected="true"]'),
    scope: demo('.wr-tree'),
  },
  {
    id: 'tree/row-hover',
    route: `${REF}/tree`,
    steps: [{ hover: demo('.wr-tree__row') }],
    target: demo('.wr-tree__row'),
    scope: demo('.wr-tree'),
  },
  {
    id: 'table/row-hover',
    route: `${REF}/table`,
    steps: [{ hover: demo('.wr-table tbody tr') }],
    target: demo('.wr-table tbody tr'),
    scope: demo('.wr-table'),
  },
  {
    id: 'button/focus-ring',
    route: `${REF}/button`,
    steps: [{ focus: demo('.wr-btn--primary') }],
    target: demo('.wr-btn--primary'),
    scope: demo('.wr-btn--primary'),
  },
  {
    id: 'input/focus',
    route: `${REF}/input`,
    steps: [{ focus: demo('input.wr-input') }],
    target: demo('input.wr-input'),
    scope: demo('.wr-input-group'),
  },
  {
    id: 'tabs/tab-hover',
    route: `${REF}/tabs`,
    steps: [{ hover: demo('.wr-tabs__tab:not(.wr-tabs__tab--active)') }],
    target: demo('.wr-tabs__tab'),
    scope: demo('.wr-tabs'),
  },
  {
    id: 'pagination/page-hover',
    route: `${REF}/pagination`,
    steps: [{ hover: demo('.wr-pagination__page') }],
    target: demo('.wr-pagination__page'),
    scope: demo('.wr-pagination'),
  },
  {
    id: 'mention/panel',
    route: `${REF}/mention`,
    steps: [{ fill: [demo('textarea'), 'hey @'] }, { wait: 200 }],
    target: '.wr-mention-panel__option',
    scope: '.wr-mention-panel',
  },
  {
    id: 'color-picker/panel',
    route: `${REF}/color-picker`,
    steps: [{ click: demo('.wr-color-picker') }, { wait: 300 }],
    target: '.wr-color-picker__field',
    scope: '.wr-color-picker__inputs',
  },
  {
    id: 'speed-dial/open',
    route: `${REF}/speed-dial`,
    steps: [{ click: demo('.wr-speed-dial__trigger') }],
    target: demo('.wr-speed-dial__action'),
    scope: demo('.wr-speed-dial'),
  },
  {
    id: 'tour/step',
    // A service, so its page is under /reference/services rather than /components.
    route: '/reference/services/tour',
    steps: [{ click: demo('.wr-btn--secondary') }, { wait: 400 }],
    target: '.wr-tour-popup',
    scope: '.wr-tour-popup',
  },
  {
    id: 'window/open',
    route: `${REF}/window`,
    steps: [{ click: demo('.wr-btn') }, { wait: 300 }],
    target: '.wr-window',
    scope: '.wr-window',
  },
  {
    id: 'popover/open',
    route: `${REF}/popover`,
    steps: [{ click: demo('.wr-popover-trigger') }],
    target: '.wr-popover-overlay',
    scope: '.wr-popover-overlay',
  },

  // ── Selected / active states that a page at rest never shows, and the hover
  // twins of the ones it does.
  {
    id: 'tabs/tab-active',
    route: `${REF}/tabs`,
    steps: [{ hover: demo('.wr-tabs__tab--active') }],
    target: demo('.wr-tabs__tab--active'),
    scope: demo('.wr-tabs'),
  },
  {
    id: 'segmented/option-selected',
    route: `${REF}/segmented`,
    steps: [{ hover: demo('.wr-segmented__option--selected') }],
    target: demo('.wr-segmented__option--selected'),
    scope: demo('.wr-segmented'),
  },
  {
    id: 'pagination/page-active',
    route: `${REF}/pagination`,
    steps: [{ hover: demo('.wr-pagination__page[aria-current="page"]') }],
    target: demo('.wr-pagination__page[aria-current="page"]'),
    scope: demo('.wr-pagination'),
  },
  {
    id: 'tree/chip',
    route: `${REF}/tree`,
    steps: [{ click: demo('.wr-tree__trigger') }, { click: '.wr-tree__label' }],
    target: '.wr-tree__chip, .wr-tree__row--selected',
    scope: demo('.wr-tree'),
  },
  {
    id: 'anchor/link-hover',
    route: `${REF}/anchor`,
    // Its `--active` twin needs a scroll position, which is a state this table
    // cannot create from a selector — the hover rule is the one that paints an
    // intent as text, and it is reachable.
    steps: [{ hover: demo('.wr-anchor__link') }],
    target: demo('.wr-anchor__link'),
    scope: demo('.wr-anchor'),
  },
  {
    id: 'list/item-hover',
    route: `${REF}/list`,
    steps: [{ hover: demo('.wr-list__item') }],
    target: demo('.wr-list__item'),
    scope: demo('.wr-list'),
  },
  {
    id: 'collapse/header-hover',
    route: `${REF}/collapse`,
    steps: [{ hover: demo('.wr-collapse__header') }],
    target: demo('.wr-collapse__header'),
    scope: demo('.wr-collapse'),
  },
  {
    id: 'breadcrumbs/link-hover',
    route: `${REF}/breadcrumbs`,
    steps: [{ hover: demo('.wr-breadcrumbs__link') }],
    target: demo('.wr-breadcrumbs__link'),
    scope: demo('.wr-breadcrumbs'),
  },
  {
    id: 'stepper/header-hover',
    route: `${REF}/stepper`,
    steps: [{ hover: demo('.wr-stepper__header') }],
    target: demo('.wr-stepper__header'),
    scope: demo('.wr-stepper'),
  },
  {
    id: 'transfer/item-hover',
    route: `${REF}/transfer`,
    steps: [{ hover: demo('.wr-transfer__item') }],
    target: demo('.wr-transfer__item'),
    scope: demo('.wr-transfer'),
  },
  {
    id: 'table/sort-active',
    route: `${REF}/table`,
    steps: [{ click: demo('.wr-table th button') }],
    target: demo('.wr-table th[aria-sort="ascending"]'),
    scope: demo('.wr-table'),
  },
  {
    id: 'calendar/today-and-selected',
    route: `${REF}/calendar`,
    steps: [{ hover: demo('.wr-calendar__day--today') }],
    target: demo('.wr-calendar__day--today'),
    scope: demo('.wr-calendar'),
    note: 'Paints --wr-calendar-accent, a component-local alias no token grep reaches.',
  },

  // ── Focus rings. A focus ring is a state by definition and the one both other
  // gates are structurally blind to.
  {
    id: 'switch/focus',
    route: `${REF}/switch`,
    steps: [{ focus: demo('.wr-switch input') }],
    target: demo('.wr-switch__track'),
    scope: demo('.wr-switch'),
  },
  {
    id: 'checkbox/focus',
    route: `${REF}/checkbox`,
    steps: [{ focus: demo('.wr-checkbox__input') }],
    target: demo('.wr-checkbox__box'),
    scope: demo('.wr-checkbox'),
  },
  {
    id: 'slider/thumb-focus',
    route: `${REF}/slider`,
    steps: [{ focus: demo('.wr-slider__thumb') }],
    target: demo('.wr-slider__thumb'),
    scope: demo('.wr-slider'),
  },
  {
    id: 'input-otp/cell-focus',
    route: `${REF}/input-otp`,
    steps: [{ focus: demo('.wr-input-otp__cell') }],
    target: demo('.wr-input-otp__cell'),
    scope: demo('.wr-input-otp'),
  },
  {
    id: 'select/trigger-hover',
    route: `${REF}/select`,
    steps: [{ hover: demo('.wr-select__trigger') }],
    target: demo('.wr-select__trigger'),
    scope: demo('.wr-select'),
  },
  {
    id: 'select/option-selected',
    route: `${REF}/select`,
    steps: [{ click: demo('.wr-select__trigger') }, { click: '.wr-option' }, { click: demo('.wr-select__trigger') }],
    target: '.wr-option--selected',
    scope: '.wr-select-panel',
    note: 'Measured 4.17:1 in light before the -ink move, and invisible to both other gates the whole time.',
  },
  {
    id: 'table/row-selected',
    route: `${REF}/table`,
    steps: [{ click: demo('.wr-table tbody .wr-checkbox__input') }],
    target: demo('.wr-table__tr--selected'),
    scope: demo('.wr-table'),
  },
  {
    id: 'table/filter-panel',
    route: `${REF}/table`,
    steps: [{ click: demo('.wr-table-filter') }, { wait: 200 }],
    target: '.wr-table-filter__item',
    scope: '.wr-table-filter__panel',
    note: 'wr-table-filter__reset is a real text button painting the intent — one of the six the hand audit caught.',
  },
  {
    id: 'carousel/dot-active',
    route: `${REF}/carousel`,
    steps: [{ hover: demo('.wr-carousel__dot--active') }],
    target: demo('.wr-carousel__dot--active'),
    scope: demo('.wr-carousel'),
  },
  {
    id: 'file-upload/zone-hover',
    route: `${REF}/file-upload`,
    steps: [{ hover: demo('.wr-file-upload__zone') }],
    target: demo('.wr-file-upload__zone'),
    scope: demo('.wr-file-upload'),
  },
  {
    id: 'splitter/divider-hover',
    route: `${REF}/splitter`,
    steps: [{ hover: demo('.wr-splitter__divider') }],
    target: demo('.wr-splitter__divider'),
    scope: demo('.wr-splitter'),
  },
  {
    id: 'lightbox/viewer-chrome',
    route: `${REF}/lightbox`,
    steps: [{ click: demo('.wr-lightbox__trigger') }, { wait: 300 }],
    target: '.wr-lightbox-viewer__close',
    scope: '.wr-lightbox-viewer',
  },
  {
    id: 'sidebar/item-active',
    route: `${REF}/sidebar`,
    steps: [{ hover: demo('.wr-sidebar__item--active') }],
    target: demo('.wr-sidebar__item--active'),
    scope: demo('.wr-sidebar'),
  },
  {
    id: 'tree/overlay-trigger',
    route: `${REF}/tree`,
    steps: [{ click: demo('.wr-tree__trigger') }, { wait: 200 }],
    target: '.wr-tree__row',
    scope: '.wr-tree-overlay, .wr-tree',
  },
  {
    id: 'window/taskbar',
    route: `${REF}/window`,
    // A tab exists only for a MINIMIZED window, so the window has to be opened
    // and then minimized — the taskbar is empty otherwise, and an empty taskbar
    // is exactly the "measured nothing, reported green" case.
    steps: [
      { click: demo('.wr-btn') },
      { wait: 400 },
      { click: '.wr-window__chrome-action--minimize' },
      { wait: 400 },
    ],
    target: '.wr-window-taskbar__tab',
    scope: '.wr-window-taskbar',
  },
  {
    id: 'date-picker/time',
    route: `${REF}/date-picker`,
    steps: [{ click: demo('.wr-date-picker--time .wr-date-picker__trigger') }, { wait: 200 }],
    target: '.wr-time-picker',
    scope: '.wr-time-picker',
  },
];

/** One action. `hover` / `focus` are forced through CDP rather than a pointer. */
export type Step =
  | { readonly click: string }
  | { readonly rightClick: string }
  | { readonly hover: string }
  | { readonly focus: string }
  | { readonly fill: readonly [selector: string, text: string] }
  | { readonly press: string }
  | { readonly wait: number };

export interface State {
  /** `component/state`, and what `--filter` matches against. */
  readonly id: string;
  readonly route: string;
  readonly steps: readonly Step[];
  /** Must exist only once the state is real. Asserted visible, with a box. */
  readonly target: string;
  /** What axe runs over. Defaults to `target`; widen it to cover a whole panel. */
  readonly scope?: string;
  readonly note?: string;
}
