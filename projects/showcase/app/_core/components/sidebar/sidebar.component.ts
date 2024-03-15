import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';

import { routes } from '#core/routes';

interface SidebarItem {
  title: string;
  url: string;
}

@Component({
  selector: 'ngwr-sidebar',
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  @HostBinding('class') class = 'ngwr-sidebar';

  readonly documentationSidebarLinks: SidebarItem[] = [
    { title: 'Installation', url: `${routes.DOCS.GETTING_STARTED.INDEX}/${routes.DOCS.GETTING_STARTED.INSTALLATION}` },
  ];

  readonly commonSidebarLinks: SidebarItem[] = [
    { title: 'Colors', url: `${routes.DOCS.CORE.INDEX}/${routes.DOCS.CORE.COLORS}` },
    { title: 'Grid', url: `${routes.DOCS.CORE.INDEX}/${routes.DOCS.CORE.GRID}` },
  ];

  readonly componentsSidebarLinks: SidebarItem[] = [
    { title: 'Alert', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.ALERT}` },
    { title: 'Button', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.BUTTON}` },
    { title: 'Checkbox', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.CHECKBOX}` },
    { title: 'Dialog', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.DIALOG}` },
    { title: 'Divider', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.DIVIDER}` },
    { title: 'Form', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.FORM}` },
    { title: 'Icon', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.ICON}` },
    { title: 'Input', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.INPUT}` },
    { title: 'Progress', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.PROGRESS}` },
    { title: 'QRCode', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.QRCODE}` },
    { title: 'Skeleton', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.SKELETON}` },
    { title: 'Spinner', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.SPINNER}` },
    { title: 'Tag', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.TAG}` },
    { title: 'Tooltip', url: `${routes.DOCS.COMPONENTS.INDEX}/${routes.DOCS.COMPONENTS.TOOLTIP}` },
  ];
}
