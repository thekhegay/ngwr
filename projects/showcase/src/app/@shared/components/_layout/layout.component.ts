import { Component, HostBinding } from '@angular/core';

import { routes } from 'showcase/@shared/routes';

interface SidebarItem {
  title: string;
  url: string;
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
})
export class LayoutComponent {
  @HostBinding('class') class = 'layout';

  readonly documentationSidebarLinks: SidebarItem[] = [
    { title: 'Installation', url: `${routes.DOCUMENTATION.INDEX}/${routes.DOCUMENTATION.INSTALLATION}` },
  ];

  readonly commonSidebarLinks: SidebarItem[] = [
    { title: 'Colors', url: `${routes.CORE.INDEX}/${routes.CORE.COLORS}` },
    { title: 'Grid', url: `${routes.CORE.INDEX}/${routes.CORE.GRID}` },
  ];

  readonly componentsSidebarLinks: SidebarItem[] = [
    { title: 'Button', url: `${routes.COMPONENTS.INDEX}/${routes.COMPONENTS.BUTTON}` },
    { title: 'Checkbox', url: `${routes.COMPONENTS.INDEX}/${routes.COMPONENTS.CHECKBOX}` },
    { title: 'Divider', url: `${routes.COMPONENTS.INDEX}/${routes.COMPONENTS.DIVIDER}` },
    { title: 'Form', url: `${routes.COMPONENTS.INDEX}/${routes.COMPONENTS.FORM}` },
    { title: 'Icon', url: `${routes.COMPONENTS.INDEX}/${routes.COMPONENTS.ICON}` },
    { title: 'Input', url: `${routes.COMPONENTS.INDEX}/${routes.COMPONENTS.INPUT}` },
    { title: 'Skeleton', url: `${routes.COMPONENTS.INDEX}/${routes.COMPONENTS.SKELETON}` },
    { title: 'Spinner', url: `${routes.COMPONENTS.INDEX}/${routes.COMPONENTS.SPINNER}` },
    { title: 'Tag', url: `${routes.COMPONENTS.INDEX}/${routes.COMPONENTS.TAG}` },
  ];
}
