import type { Routes } from '@angular/router';

import { routes } from '#routing';

const components = routes.components;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  {
    path: components.actionSheet,
    loadComponent: () => import('./action-sheet/action-sheet'),
  },
  {
    path: components.alert,
    loadComponent: () => import('./alert/alert'),
  },
  {
    path: components.anchor,
    loadComponent: () => import('./anchor/anchor'),
  },
  {
    path: components.avatar,
    loadComponent: () => import('./avatar/avatar'),
  },
  {
    path: components.backTop,
    loadComponent: () => import('./back-top/back-top'),
  },
  {
    path: components.badge,
    loadComponent: () => import('./badge/badge'),
  },
  {
    path: components.breadcrumbs,
    loadComponent: () => import('./breadcrumbs/breadcrumbs'),
  },
  {
    path: components.burger,
    loadComponent: () => import('./burger/burger'),
  },
  {
    path: components.button,
    loadComponent: () => import('./button/button'),
  },
  {
    path: components.buttonGroup,
    loadComponent: () => import('./button-group/button-group'),
  },
  {
    path: components.calendar,
    loadComponent: () => import('./calendar/calendar'),
  },
  {
    path: components.card,
    loadComponent: () => import('./card/card'),
  },
  {
    path: components.carousel,
    loadComponent: () => import('./carousel/carousel'),
  },
  {
    path: components.charts,
    pathMatch: 'full',
    redirectTo: components.sparkline,
  },
  {
    path: components.sparkline,
    loadComponent: () => import('./sparkline/sparkline'),
  },
  {
    path: components.gauge,
    loadComponent: () => import('./gauge/gauge'),
  },
  {
    path: components.barChart,
    loadComponent: () => import('./bar-chart/bar-chart'),
  },
  {
    path: components.donutChart,
    loadComponent: () => import('./donut-chart/donut-chart'),
  },
  {
    path: components.lineChart,
    loadComponent: () => import('./line-chart/line-chart'),
  },
  {
    path: components.calendarHeatmap,
    loadComponent: () => import('./calendar-heatmap/calendar-heatmap'),
  },
  {
    path: components.squircle,
    loadComponent: () => import('./squircle/squircle'),
  },
  {
    path: components.cascader,
    loadComponent: () => import('./cascader/cascader'),
  },
  {
    path: components.checkbox,
    loadComponent: () => import('./checkbox/checkbox'),
  },
  {
    path: components.collapse,
    loadComponent: () => import('./collapse/collapse'),
  },
  {
    path: components.colorPicker,
    loadComponent: () => import('./color-picker/color-picker'),
  },
  {
    path: components.commandPalette,
    loadComponent: () => import('./command-palette/command-palette'),
  },
  {
    path: components.compare,
    loadComponent: () => import('./compare/compare'),
  },
  {
    path: components.contextMenu,
    loadComponent: () => import('./context-menu/context-menu'),
  },
  {
    path: components.counter,
    loadComponent: () => import('./counter/counter'),
  },
  {
    path: components.empty,
    loadComponent: () => import('./empty/empty'),
  },
  {
    path: components.keyboard,
    loadComponent: () => import('./keyboard/keyboard'),
  },
  {
    path: components.datePicker,
    loadComponent: () => import('./date-picker/date-picker'),
  },
  {
    path: components.descriptions,
    loadComponent: () => import('./descriptions/descriptions'),
  },
  {
    path: components.dialog,
    loadComponent: () => import('./dialog/dialog'),
  },
  {
    path: components.divider,
    loadComponent: () => import('./divider/divider'),
  },
  {
    path: components.drawer,
    loadComponent: () => import('./drawer/drawer'),
  },
  {
    path: components.dropdown,
    loadComponent: () => import('./dropdown/dropdown'),
  },
  {
    path: components.fileUpload,
    loadComponent: () => import('./file-upload/file-upload'),
  },
  {
    path: components.form,
    loadComponent: () => import('./form/form'),
  },
  {
    path: components.formField,
    loadComponent: () => import('./form-field/form-field'),
  },
  {
    path: components.icon,
    loadComponent: () => import('./icon/icon'),
  },
  {
    path: components.lightbox,
    loadComponent: () => import('./lightbox/lightbox'),
  },
  {
    path: components.imageCropper,
    loadComponent: () => import('./image-cropper/image-cropper'),
  },
  {
    path: components.input,
    loadComponent: () => import('./input/input'),
  },
  {
    path: components.layout,
    loadComponent: () => import('./layout/layout'),
  },
  {
    path: components.list,
    loadComponent: () => import('./list/list'),
  },
  {
    path: components.inputNumber,
    loadComponent: () => import('./input-number/input-number'),
  },
  {
    path: components.inputOtp,
    loadComponent: () => import('./input-otp/input-otp'),
  },
  {
    path: components.knob,
    loadComponent: () => import('./knob/knob'),
  },
  {
    path: components.markdown,
    loadComponent: () => import('./markdown/markdown'),
  },
  {
    path: components.mention,
    loadComponent: () => import('./mention/mention'),
  },
  {
    path: components.meterGroup,
    loadComponent: () => import('./meter-group/meter-group'),
  },
  {
    path: components.pageHeader,
    loadComponent: () => import('./page-header/page-header'),
  },
  {
    path: components.pagination,
    loadComponent: () => import('./pagination/pagination'),
  },
  {
    path: components.pullToRefresh,
    loadComponent: () => import('./pull-to-refresh/pull-to-refresh'),
  },
  {
    path: components.popconfirm,
    loadComponent: () => import('./popconfirm/popconfirm'),
  },
  {
    path: components.popover,
    loadComponent: () => import('./popover/popover'),
  },
  {
    path: components.progress,
    loadComponent: () => import('./progress/progress'),
  },
  {
    path: components.qrCode,
    loadComponent: () => import('./qr/qr'),
  },
  {
    path: components.radio,
    loadComponent: () => import('./radio/radio'),
  },
  {
    path: components.rating,
    loadComponent: () => import('./rating/rating'),
  },
  {
    path: components.result,
    loadComponent: () => import('./result/result'),
  },
  {
    path: components.segmented,
    loadComponent: () => import('./segmented/segmented'),
  },
  {
    path: components.select,
    loadComponent: () => import('./select/select'),
  },
  {
    path: components.sidebar,
    loadComponent: () => import('./sidebar/sidebar'),
  },
  {
    path: components.skeleton,
    loadComponent: () => import('./skeleton/skeleton'),
  },
  {
    path: components.slider,
    loadComponent: () => import('./slider/slider'),
  },
  {
    path: components.speedDial,
    loadComponent: () => import('./speed-dial/speed-dial'),
  },
  {
    path: components.spinner,
    loadComponent: () => import('./spinner/spinner'),
  },
  {
    path: components.splitter,
    loadComponent: () => import('./splitter/splitter'),
  },
  {
    path: components.statistic,
    loadComponent: () => import('./statistic/statistic'),
  },
  {
    path: components.stepper,
    loadComponent: () => import('./stepper/stepper'),
  },
  {
    path: components.switch,
    loadComponent: () => import('./switch/switch'),
  },
  {
    path: components.table,
    loadComponent: () => import('./table/table'),
  },
  {
    path: components.virtualScroll,
    loadComponent: () => import('./virtual-scroll/virtual-scroll'),
  },
  {
    path: components.dragDrop,
    loadComponent: () => import('./drag-drop/drag-drop'),
  },
  {
    path: components.tabs,
    loadComponent: () => import('./tabs/tabs'),
  },
  // Typography moved to its own top-level section; keep old links alive. At its
  // current path, not the pre-reorg `/typography`, which bounced twice more.
  {
    path: components.typography,
    redirectTo: '/guides/typography/overview',
  },
  // Three components were hard-merged into a neighbour, and their slugs are
  // still indexed — a usability test's first search result was
  // `/docs/components/tag`. Each target is where the merged API is DOCUMENTED,
  // not a near-enough page: `badge` imports and demos `WrTag` from `ngwr/badge`,
  // `counter` is what `count-up` became, and `popover` carries `mode="tooltip"`.
  // The v7 consolidations are not guesses either: `/start/migration` publishes
  // each mapping by name, and `migration-v7` rewrites the same pairs in source.
  // Leaving a slug at the 404 while the site itself prints its successor two
  // clicks away is the gap a usability test walked into.
  { path: 'tag', redirectTo: components.badge },
  { path: 'count-up', redirectTo: components.counter },
  { path: 'tooltip', redirectTo: components.popover },
  { path: 'autocomplete', redirectTo: components.select },
  { path: 'chips-input', redirectTo: components.select },
  { path: 'tree-select', redirectTo: components.tree },
  { path: 'bottom-sheet', redirectTo: components.drawer },
  { path: 'time-picker', redirectTo: components.datePicker },
  { path: 'date-time-picker', redirectTo: components.datePicker },
  // `animated-text` stays at the 404 on purpose — it split three ways by mode
  // (`typewriter` / `decrypt-text` / `split-text`), into a different cluster,
  // so any single target would be the guess the others are not.
  {
    path: components.textarea,
    loadComponent: () => import('./textarea/textarea'),
  },
  {
    path: components['event-calendar'],
    loadComponent: () => import('./event-calendar/event-calendar'),
  },
  {
    path: components.transfer,
    loadComponent: () => import('./transfer/transfer'),
  },
  {
    path: components.timeline,
    loadComponent: () => import('./timeline/timeline'),
  },
  {
    path: components.toast,
    loadComponent: () => import('./toast/toast'),
  },
  {
    path: components.toolbar,
    loadComponent: () => import('./toolbar/toolbar'),
  },
  {
    path: components.tree,
    loadComponent: () => import('./tree/tree'),
  },
  {
    path: components.window,
    loadComponent: () => import('./window/window'),
  },
] satisfies Routes;
