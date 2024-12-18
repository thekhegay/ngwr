import { Routes } from '@angular/router';

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
      button: 'button',
      buttonGroup: 'button-group',
      checkbox: 'checkbox',
      dialog: 'dialog',
      divider: 'divider',
      form: 'form',
      icon: 'icon',
      input: 'input',
      progress: 'progress',
      qrCode: 'qrcode',
      skeleton: 'skeleton',
      spinner: 'spinner',
      tag: 'tag',
      textarea: 'textarea',
    },
    core: {
      index: 'core',
      colors: 'color',
      grid: 'grid',
    },
  },
};

export const routing: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then(c => c.HomeComponent),
  },
  {
    path: routes.docs.index,
    loadChildren: () => import('./docs/docs.routing'),
  },
];
