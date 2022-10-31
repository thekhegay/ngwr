import { Component, HostBinding } from '@angular/core';

interface SidebarItem {
  title: string;
  url: string;
}

@Component({
  selector: 'site-layout',
  templateUrl: './layout.component.html'
})
export class LayoutComponent {
  @HostBinding('class') class = 'wrapper';

  readonly gettingStartedSidebarLinks: SidebarItem[] = [
    { title: 'Installation', url: '/getting-started/installation' },
    { title: 'Browser support', url: '/getting-started/browser-support' }
  ];

  readonly coreSidebarLinks: SidebarItem[] = [
    { title: 'Colors', url: '/core/color' },
    { title: 'Grid', url: '/core/grid' }
  ];

  readonly componentsSidebarLinks: SidebarItem[] = [
    { title: 'Button', url: '/components/button' },
    { title: 'Checkbox', url: '/components/checkbox' },
    { title: 'Divider', url: '/components/divider' },
    { title: 'Form', url: '/components/form' },
    { title: 'Icon', url: '/components/icon' },
    { title: 'Input', url: '/components/input' },
    { title: 'Extended Input', url: '/components/extended-input' },
    { title: 'Password Input', url: '/components/password-input' },
    { title: 'Skeleton', url: '/components/skeleton' },
    { title: 'Spinner', url: '/components/spinner' },
    { title: 'Tag', url: '/components/tag' }
  ];
}
