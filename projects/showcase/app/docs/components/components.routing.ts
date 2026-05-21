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
    path: components.dialog,
    loadComponent: () => import('./dialog/dialog.component'),
  },
  {
    path: components.divider,
    loadComponent: () => import('./divider/divider.component'),
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
    path: components.pagination,
    loadComponent: () => import('./pagination/pagination.component'),
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
    path: components.select,
    loadComponent: () => import('./select/select.component'),
  },
  {
    path: components.skeleton,
    loadComponent: () => import('./skeleton/skeleton.component'),
  },
  {
    path: components.spinner,
    loadComponent: () => import('./spinner/spinner.component'),
  },
  {
    path: components.table,
    loadComponent: () => import('./table/table.component'),
  },
  {
    path: components.tag,
    loadComponent: () => import('./tag/tag.component'),
  },
  {
    path: components.textarea,
    loadComponent: () => import('./textarea/textarea.component'),
  },
] satisfies Routes;
