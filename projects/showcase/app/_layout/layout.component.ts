import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DocsBreadcrumbsComponent } from './docs-breadcrumbs/docs-breadcrumbs.component';
import { LayoutState } from './layout-state.service';
import { SidebarComponent } from './sidebar/sidebar.component';

/**
 * Docs sub-layout. Renders the sidebar next to the docs content area.
 * Header + footer are owned by the parent `ShellComponent`.
 */
@Component({
  selector: 'ngwr-layout',
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-layout' },
  imports: [RouterOutlet, SidebarComponent, DocsBreadcrumbsComponent],
})
export default class LayoutComponent {
  protected readonly layoutState = inject(LayoutState);

  protected onBackdropClick(): void {
    this.layoutState.closeSidebar();
  }
}
