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
  @HostBinding('class') class = 'layout';

  readonly gettingStartedSidebarLinks: SidebarItem[] = [
    { title: 'Installation', url: '/getting-started/installation' }
  ];

  readonly commonSidebarLinks: SidebarItem[] = [
    { title: 'Colors', url: '/common/colors' },
    { title: 'Grid', url: '/common/grid' }
  ];

  readonly componentsSidebarLinks: SidebarItem[] = [
    { title: 'Button', url: '/components/button' },
    { title: 'Checkbox', url: '/components/checkbox' },
    { title: 'Divider', url: '/components/divider' },
    { title: 'Form', url: '/components/form' },
    { title: 'Icon', url: '/components/icon' },
    { title: 'Input', url: '/components/input' },
    { title: 'Skeleton', url: '/components/skeleton' },
    { title: 'Spinner', url: '/components/spinner' },
    { title: 'Tag', url: '/components/tag' }
  ];
}
