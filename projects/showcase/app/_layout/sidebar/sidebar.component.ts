import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { LayoutState } from '../layout-state.service';

type SidebarLink = {
  readonly title: string;
  readonly url?: string[];
  /** Mark items not yet migrated — rendered as plain disabled rows. */
  readonly disabled?: boolean;
};

type SidebarGroup = {
  readonly title: string;
  readonly children: readonly SidebarLink[];
};

@Component({
  selector: 'ngwr-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ngwr-sidebar',
    '[class.ngwr-sidebar--opened]': 'layoutState.sidebarOpen()',
  },
  imports: [RouterLink, RouterLinkActive],
})
export class SidebarComponent {
  protected readonly layoutState = inject(LayoutState);

  protected readonly groups: readonly SidebarGroup[] = [
    {
      title: 'Getting started',
      children: [{ title: 'Installation', url: ['/docs', 'getting-started', 'installation'] }],
    },
    {
      title: 'Components',
      children: [
        { title: 'Alert', url: ['/docs', 'components', 'alert'] },
        { title: 'Avatar', url: ['/docs', 'components', 'avatar'] },
        { title: 'Badge', url: ['/docs', 'components', 'badge'] },
        { title: 'Breadcrumbs', url: ['/docs', 'components', 'breadcrumbs'] },
        { title: 'Button', url: ['/docs', 'components', 'button'] },
        { title: 'Button Group', url: ['/docs', 'components', 'button-group'] },
        { title: 'Checkbox', url: ['/docs', 'components', 'checkbox'] },
        { title: 'Collapse', url: ['/docs', 'components', 'collapse'] },
        { title: 'Dialog', url: ['/docs', 'components', 'dialog'] },
        { title: 'Divider', url: ['/docs', 'components', 'divider'] },
        { title: 'Drawer', url: ['/docs', 'components', 'drawer'] },
        { title: 'Dropdown', url: ['/docs', 'components', 'dropdown'] },
        { title: 'Form', url: ['/docs', 'components', 'form'] },
        { title: 'Icon', url: ['/docs', 'components', 'icon'] },
        { title: 'Input', url: ['/docs', 'components', 'input'] },
        { title: 'Pagination', url: ['/docs', 'components', 'pagination'] },
        { title: 'Popconfirm', url: ['/docs', 'components', 'popconfirm'] },
        { title: 'Popover', url: ['/docs', 'components', 'popover'] },
        { title: 'Progress', url: ['/docs', 'components', 'progress'] },
        { title: 'QR', url: ['/docs', 'components', 'qrcode'] },
        { title: 'Radio', url: ['/docs', 'components', 'radio'] },
        { title: 'Segmented', url: ['/docs', 'components', 'segmented'] },
        { title: 'Select', url: ['/docs', 'components', 'select'] },
        { title: 'Skeleton', url: ['/docs', 'components', 'skeleton'] },
        { title: 'Spinner', url: ['/docs', 'components', 'spinner'] },
        { title: 'Switch', url: ['/docs', 'components', 'switch'] },
        { title: 'Table', url: ['/docs', 'components', 'table'] },
        { title: 'Tabs', url: ['/docs', 'components', 'tabs'] },
        { title: 'Tag', url: ['/docs', 'components', 'tag'] },
        { title: 'Textarea', url: ['/docs', 'components', 'textarea'] },
        { title: 'Toast', url: ['/docs', 'components', 'toast'] },
        { title: 'Tooltip', url: ['/docs', 'components', 'tooltip'] },
      ],
    },
    {
      title: 'Core',
      children: [
        { title: 'Color', url: ['/docs', 'core', 'color'] },
        { title: 'Grid', url: ['/docs', 'core', 'grid'] },
        { title: 'Overlay', url: ['/docs', 'core', 'overlay'] },
        { title: 'Utils', url: ['/docs', 'core', 'utils'] },
      ],
    },
  ];

  protected onLinkClick(): void {
    this.layoutState.closeSidebar();
  }
}
