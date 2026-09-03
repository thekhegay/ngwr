import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { WrLoadingBar, WrLoadingBarComponent } from 'ngwr/loading-bar';

import { Header } from './header/header';

@Component({
  selector: 'ngwr-root',
  templateUrl: './root.html',
  styleUrl: './root.scss',
  imports: [RouterOutlet, Header, WrLoadingBarComponent],
})
export class RootComponent {
  // The bar reads a service that no longer subscribes to the router on its own —
  // that moved to `provideWrLoadingBarRouter()` in `app.config.ts`, so an app
  // without routing stops paying 66 kB for a router it never asked for. Injecting
  // it here is what makes the instance exist before the first navigation; without
  // the provider above it existed and never moved, which is how this site shipped
  // a loading bar that was permanently at 0%.
  constructor() {
    inject(WrLoadingBar);
  }
}
