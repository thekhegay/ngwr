import { Routes } from '@angular/router';

import { routes } from '#routing';

const components = routes.docs.components;

export default [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: components.alert,
  },
  {
    path: components.alert,
    loadComponent: () => import('./alert/alert.component').then(c => c.AlertComponent),
  },
  {
    path: components.avatar,
    loadComponent: () => import('./avatar/avatar.component').then(c => c.AvatarComponent),
  },
  {
    path: components.button,
    loadComponent: () => import('./button/button.component').then(c => c.ButtonComponent),
  },
  {
    path: components.buttonGroup,
    loadComponent: () => import('./button-group/button-group.component').then(c => c.ButtonGroupComponent),
  },
  {
    path: components.checkbox,
    loadComponent: () => import('./checkbox/checkbox.component').then(c => c.CheckboxComponent),
  },
  {
    path: components.dialog,
    loadComponent: () => import('./dialog/dialog.component').then(c => c.DialogComponent),
  },
  {
    path: components.divider,
    loadComponent: () => import('./divider/divider.component').then(c => c.DividerComponent),
  },
  {
    path: components.form,
    loadComponent: () => import('./form/form.component').then(c => c.FormComponent),
  },
  {
    path: components.icon,
    loadComponent: () => import('./icon/icon.component').then(c => c.IconComponent),
  },
  {
    path: components.input,
    loadComponent: () => import('./input/input.component').then(c => c.InputComponent),
  },
  {
    path: components.progress,
    loadComponent: () => import('./progress/progress.component').then(c => c.ProgressComponent),
  },
  {
    path: components.qrCode,
    loadComponent: () => import('./qrcode/qrcode.component').then(c => c.QRCodeComponent),
  },
  {
    path: components.skeleton,
    loadComponent: () => import('./skeleton/skeleton.component').then(c => c.SkeletonComponent),
  },
  {
    path: components.spinner,
    loadComponent: () => import('./spinner/spinner.component').then(c => c.SpinnerComponent),
  },
  {
    path: components.tag,
    loadComponent: () => import('./tag/tag.component').then(c => c.TagComponent),
  },
  {
    path: components.textarea,
    loadComponent: () => import('./textarea/textarea.component').then(c => c.TextareaComponent),
  },
] satisfies Routes;
