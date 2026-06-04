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
  // Boot the service so the router subscription kicks in.
  constructor() {
    inject(WrLoadingBar);
  }
}
