import type { Routes } from '@angular/router';

export const routes = {
  index: '/',
  docs: {
    index: 'docs',
    gettingStarted: {
      index: 'getting-started',
      installation: 'installation',
    },
    components: {
      index: 'components',
      alert: 'alert',
      avatar: 'avatar',
      badge: 'badge',
      breadcrumbs: 'breadcrumbs',
      button: 'button',
      buttonGroup: 'button-group',
      checkbox: 'checkbox',
      checkboxGroup: 'checkbox-group',
      collapse: 'collapse',
      dialog: 'dialog',
      divider: 'divider',
      form: 'form',
      icon: 'icon',
      input: 'input',
      progress: 'progress',
      qrCode: 'qrcode',
      radio: 'radio',
      radioGroup: 'radio-group',
      segmented: 'segmented',
      skeleton: 'skeleton',
      spinner: 'spinner',
      switch: 'switch',
      tag: 'tag',
      tabs: 'tabs',
      textarea: 'textarea',
      select: 'select',
      dropdown: 'dropdown',
      pagination: 'pagination',
      table: 'table',
    },
    core: {
      index: 'core',
      colors: 'color',
      grid: 'grid',
      utils: 'utils',
    },
  },
};

export const routing: Routes = [
  {
    path: '',
    loadComponent: () => import('#shell'),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./home/home.component'),
      },
      {
        path: routes.docs.index,
        loadChildren: () => import('./docs/docs.routing'),
      },
    ],
  },
];
