import { ChangeDetectionStrategy, Component, ViewEncapsulation, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';

import { filter, map, startWith } from 'rxjs';

import { WrIconComponent, chevronDown, provideWrIcons } from 'ngwr/icon';

import { LayoutState } from '../layout-state.service';

type SidebarLink = {
  readonly title: string;
  readonly url?: string[];
  /** Mark items not yet migrated — rendered as plain disabled rows. */
  readonly disabled?: boolean;
};

type SidebarCategory = {
  readonly title: string;
  readonly children: readonly SidebarLink[];
};

type SidebarGroup = {
  readonly title: string;
  readonly children?: readonly SidebarLink[];
  readonly categories?: readonly SidebarCategory[];
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
  imports: [RouterLink, RouterLinkActive, WrIconComponent],
  providers: [provideWrIcons([chevronDown])],
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
      categories: [
        {
          title: 'Button',
          children: [
            { title: 'Button', url: ['/docs', 'components', 'button'] },
            { title: 'Button Group', url: ['/docs', 'components', 'button-group'] },
          ],
        },
        {
          title: 'Data',
          children: [
            { title: 'Pagination', url: ['/docs', 'components', 'pagination'] },
            { title: 'Table', url: ['/docs', 'components', 'table'] },
          ],
        },
        {
          title: 'Display',
          children: [
            { title: 'Alert', url: ['/docs', 'components', 'alert'] },
            { title: 'Avatar', url: ['/docs', 'components', 'avatar'] },
            { title: 'Badge', url: ['/docs', 'components', 'badge'] },
            { title: 'Divider', url: ['/docs', 'components', 'divider'] },
            { title: 'Icon', url: ['/docs', 'components', 'icon'] },
            { title: 'Progress', url: ['/docs', 'components', 'progress'] },
            { title: 'QR', url: ['/docs', 'components', 'qrcode'] },
            { title: 'Skeleton', url: ['/docs', 'components', 'skeleton'] },
            { title: 'Spinner', url: ['/docs', 'components', 'spinner'] },
            { title: 'Tag', url: ['/docs', 'components', 'tag'] },
          ],
        },
        {
          title: 'Form',
          children: [
            { title: 'Calendar', url: ['/docs', 'components', 'calendar'] },
            { title: 'Checkbox', url: ['/docs', 'components', 'checkbox'] },
            { title: 'Color Picker', url: ['/docs', 'components', 'color-picker'] },
            { title: 'Date Picker', url: ['/docs', 'components', 'date-picker'] },
            { title: 'Date Time Picker', url: ['/docs', 'components', 'date-time-picker'] },
            { title: 'Form', url: ['/docs', 'components', 'form'] },
            { title: 'Input', url: ['/docs', 'components', 'input'] },
            { title: 'Input Number', url: ['/docs', 'components', 'input-number'] },
            { title: 'Input OTP', url: ['/docs', 'components', 'input-otp'] },
            { title: 'Radio', url: ['/docs', 'components', 'radio'] },
            { title: 'Segmented', url: ['/docs', 'components', 'segmented'] },
            { title: 'Select', url: ['/docs', 'components', 'select'] },
            { title: 'Slider', url: ['/docs', 'components', 'slider'] },
            { title: 'Switch', url: ['/docs', 'components', 'switch'] },
            { title: 'Textarea', url: ['/docs', 'components', 'textarea'] },
            { title: 'Time Picker', url: ['/docs', 'components', 'time-picker'] },
          ],
        },
        {
          title: 'Layout',
          children: [{ title: 'Collapse', url: ['/docs', 'components', 'collapse'] }],
        },
        {
          title: 'Navigation',
          children: [
            { title: 'Breadcrumbs', url: ['/docs', 'components', 'breadcrumbs'] },
            { title: 'Dropdown', url: ['/docs', 'components', 'dropdown'] },
            { title: 'Tabs', url: ['/docs', 'components', 'tabs'] },
          ],
        },
        {
          title: 'Overlay',
          children: [
            { title: 'Dialog', url: ['/docs', 'components', 'dialog'] },
            { title: 'Drawer', url: ['/docs', 'components', 'drawer'] },
            { title: 'Popconfirm', url: ['/docs', 'components', 'popconfirm'] },
            { title: 'Popover', url: ['/docs', 'components', 'popover'] },
            { title: 'Toast', url: ['/docs', 'components', 'toast'] },
            { title: 'Tooltip', url: ['/docs', 'components', 'tooltip'] },
            { title: 'Window', url: ['/docs', 'components', 'window'] },
          ],
        },
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

  /** Titles of currently expanded groups. All groups are collapsed by default. */
  private readonly opened = signal<ReadonlySet<string>>(new Set());

  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  /** Last URL we auto-expanded for — prevents re-opening a group the user just collapsed. */
  private lastAutoUrl: string | null = null;

  constructor() {
    // Auto-expand whichever group contains the active route, but only on
    // URL change — so the user can collapse the active group and it stays
    // collapsed until they navigate elsewhere.
    effect(() => {
      const url = this.currentUrl();
      if (url === this.lastAutoUrl) return;
      this.lastAutoUrl = url;
      const match = this.findGroupForUrl(url);
      if (!match || this.opened().has(match)) return;
      const next = new Set(this.opened());
      next.add(match);
      this.opened.set(next);
    });
  }

  protected isOpen(title: string): boolean {
    return this.opened().has(title);
  }

  protected toggleGroup(title: string): void {
    const next = new Set(this.opened());
    if (next.has(title)) next.delete(title);
    else next.add(title);
    this.opened.set(next);
  }

  private findGroupForUrl(url: string): string | null {
    for (const group of this.groups) {
      if (group.children?.some(l => l.url && url.startsWith(l.url.join('/')))) {
        return group.title;
      }
      if (group.categories?.some(c => c.children.some(l => l.url && url.startsWith(l.url.join('/'))))) {
        return group.title;
      }
    }
    return null;
  }

  protected onLinkClick(): void {
    this.layoutState.closeSidebar();
  }
}
