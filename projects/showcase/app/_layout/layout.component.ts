import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { LayoutState } from './layout-state.service';
import { SidebarComponent } from './sidebar/sidebar.component';

import { MetaService } from '#core/services';

@Component({
  selector: 'ngwr-layout',
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-layout' },
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, FooterComponent],
})
export default class LayoutComponent {
  protected readonly layoutState = inject(LayoutState);

  constructor() {
    inject(MetaService).setRobots();
  }

  protected onBackdropClick(): void {
    this.layoutState.closeSidebar();
  }
}
