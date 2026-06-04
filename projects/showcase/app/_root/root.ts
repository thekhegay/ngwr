import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from './header/header';

@Component({
  selector: 'ngwr-root',
  templateUrl: './root.html',
  styleUrl: './root.scss',
  imports: [RouterOutlet, Header],
})
export class RootComponent {}
