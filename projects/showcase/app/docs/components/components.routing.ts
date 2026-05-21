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
    path: components.checkbox,
    loadComponent: () => import('./checkbox/checkbox.component'),
  },
  {
    path: components.collapse,
    loadComponent: () => import('./collapse/collapse.component'),
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
    path: components.form,
    loadComponent: () => import('./form/form.component'),
  },
  {
    path: components.icon,
    loadComponent: () => import('./icon/icon.component'),
  },
  {
    path: components.input,
    loadComponent: () => import('./input/input.component'),
  },
  {
    path: components.inputOtp,
    loadComponent: () => import('./input-otp/input-otp.component'),
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
    path: components.toast,
    loadComponent: () => import('./toast/toast.component'),
  },
  {
    path: components.tooltip,
    loadComponent: () => import('./tooltip/tooltip.component'),
  },
] satisfies Routes;
