import type { Routes } from '@angular/router';

import { routes } from '#routing';

const components = routes.docs.components;

export default [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: components.icon,
  },
  {
    path: components.alert,
    loadComponent: () => import('./alert/alert.component'),
  },
  {
    path: components.autocomplete,
    loadComponent: () => import('./autocomplete/autocomplete.component'),
  },
  {
    path: components.avatar,
    loadComponent: () => import('./avatar/avatar.component'),
  },
  {
    path: components.badge,
    loadComponent: () => import('./badge/badge.component'),
  },
  {
    path: components.breadcrumbs,
    loadComponent: () => import('./breadcrumbs/breadcrumbs.component'),
  },
  {
    path: components.button,
    loadComponent: () => import('./button/button.component'),
  },
  {
    path: components.buttonGroup,
    loadComponent: () => import('./button-group/button-group.component'),
  },
  {
    path: components.calendar,
    loadComponent: () => import('./calendar/calendar.component'),
  },
  {
    path: components.checkbox,
    loadComponent: () => import('./checkbox/checkbox.component'),
  },
  {
    path: components.collapse,
    loadComponent: () => import('./collapse/collapse.component'),
  },
  {
    path: components.colorPicker,
    loadComponent: () => import('./color-picker/color-picker.component'),
  },
  {
    path: components.datePicker,
    loadComponent: () => import('./date-picker/date-picker.component'),
  },
  {
    path: components.dateTimePicker,
    loadComponent: () => import('./date-time-picker/date-time-picker.component'),
  },
  {
    path: components.dialog,
    loadComponent: () => import('./dialog/dialog.component'),
  },
  {
    path: components.divider,
    loadComponent: () => import('./divider/divider.component'),
  },
  {
    path: components.drawer,
    loadComponent: () => import('./drawer/drawer.component'),
  },
  {
    path: components.dropdown,
    loadComponent: () => import('./dropdown/dropdown.component'),
  },
  {
    path: components.fileUpload,
    loadComponent: () => import('./file-upload/file-upload.component'),
  },
  {
    path: components.form,
    loadComponent: () => import('./form/form.component'),
  },
  {
    path: components.icon,
    loadComponent: () => import('./icon/icon.component'),
  },
  {
    path: components.imageCropper,
    loadComponent: () => import('./image-cropper/image-cropper.component'),
  },
  {
    path: components.input,
    loadComponent: () => import('./input/input.component'),
  },
  {
    path: components.inputNumber,
    loadComponent: () => import('./input-number/input-number.component'),
  },
  {
    path: components.inputOtp,
    loadComponent: () => import('./input-otp/input-otp.component'),
  },
  {
    path: components.mention,
    loadComponent: () => import('./mention/mention.component'),
  },
  {
    path: components.pagination,
    loadComponent: () => import('./pagination/pagination.component'),
  },
  {
    path: components.popconfirm,
    loadComponent: () => import('./popconfirm/popconfirm.component'),
  },
  {
    path: components.popover,
    loadComponent: () => import('./popover/popover.component'),
  },
  {
    path: components.progress,
    loadComponent: () => import('./progress/progress.component'),
  },
  {
    path: components.qrCode,
    loadComponent: () => import('./qr/qr.component'),
  },
  {
    path: components.radio,
    loadComponent: () => import('./radio/radio.component'),
  },
  {
    path: components.rating,
    loadComponent: () => import('./rating/rating.component'),
  },
  {
    path: components.segmented,
    loadComponent: () => import('./segmented/segmented.component'),
  },
  {
    path: components.select,
    loadComponent: () => import('./select/select.component'),
  },
  {
    path: components.skeleton,
    loadComponent: () => import('./skeleton/skeleton.component'),
  },
  {
    path: components.slider,
    loadComponent: () => import('./slider/slider.component'),
  },
  {
    path: components.spinner,
    loadComponent: () => import('./spinner/spinner.component'),
  },
  {
    path: components.stepper,
    loadComponent: () => import('./stepper/stepper.component'),
  },
  {
    path: components.switch,
    loadComponent: () => import('./switch/switch.component'),
  },
  {
    path: components.table,
    loadComponent: () => import('./table/table.component'),
  },
  {
    path: components.tabs,
    loadComponent: () => import('./tabs/tabs.component'),
  },
  {
    path: components.tag,
    loadComponent: () => import('./tag/tag.component'),
  },
  {
    path: components.textarea,
    loadComponent: () => import('./textarea/textarea.component'),
  },
  {
    path: components.timePicker,
    loadComponent: () => import('./time-picker/time-picker.component'),
  },
  {
    path: components.toast,
    loadComponent: () => import('./toast/toast.component'),
  },
  {
    path: components.tooltip,
    loadComponent: () => import('./tooltip/tooltip.component'),
  },
  {
    path: components.tree,
    loadComponent: () => import('./tree/tree.component'),
  },
  {
    path: components.window,
    loadComponent: () => import('./window/window.component'),
  },
] satisfies Routes;
