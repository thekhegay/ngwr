import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LayoutState } from './layout-state';
import { SidebarComponent } from './sidebar/sidebar';

/**
 * Docs sub-layout. Renders the sidebar next to the docs content area.
 * Header + footer are owned by the parent `ShellComponent`.
 */
@Component({
  selector: 'ngwr-layout',
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-layout' },
  imports: [RouterOutlet, SidebarComponent],
})
export default class LayoutComponent {
  protected readonly layoutState = inject(LayoutState);

  protected onBackdropClick(): void {
    this.layoutState.closeSidebar();
  }
}
