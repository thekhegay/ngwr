import type { Routes } from '@angular/router';

import { routes } from '#routing';

const components = routes.components;

export default [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: components.icon,
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
    path: components.autocomplete,
    loadComponent: () => import('./autocomplete/autocomplete'),
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
    path: components.bottomSheet,
    loadComponent: () => import('./bottom-sheet/bottom-sheet'),
  },
  {
    path: components.breadcrumb,
    loadComponent: () => import('./breadcrumb/breadcrumb'),
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
    path: components.carousel,
    loadComponent: () => import('./carousel/carousel'),
  },
  {
    path: components.charts,
    loadComponent: () => import('./charts/charts'),
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
    path: components.chipsInput,
    loadComponent: () => import('./chips-input/chips-input'),
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
    path: components.dateTimePicker,
    loadComponent: () => import('./date-time-picker/date-time-picker'),
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
    path: components.icon,
    loadComponent: () => import('./icon/icon'),
  },
  {
    path: components.image,
    loadComponent: () => import('./image/image'),
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
  {
    path: components.tag,
    loadComponent: () => import('./tag/tag'),
  },
  {
    path: components.typography,
    loadComponent: () => import('./typography/typography'),
  },
  {
    path: components.textarea,
    loadComponent: () => import('./textarea/textarea'),
  },
  {
    path: components.timePicker,
    loadComponent: () => import('./time-picker/time-picker'),
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
    path: components.tooltip,
    loadComponent: () => import('./tooltip/tooltip'),
  },
  {
    path: components.tree,
    loadComponent: () => import('./tree/tree'),
  },
  {
    path: components.treeSelect,
    loadComponent: () => import('./tree-select/tree-select'),
  },
  {
    path: components.window,
    loadComponent: () => import('./window/window'),
  },
] satisfies Routes;
