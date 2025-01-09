import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FooterComponent, HeaderComponent } from '#core/components';

@Component({
    selector: 'ngwr-root',
    template: '<ngwr-header /><router-outlet /><ngwr-footer />',
    styleUrl: './root.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [RouterOutlet, HeaderComponent, FooterComponent]
})
export class RootComponent {
  @HostBinding() class = 'ngwr-root';
}
