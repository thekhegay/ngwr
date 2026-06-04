import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from './footer/footer';
import { Sidebar } from './sidebar/sidebar';

@Component({
  selector: 'ngwr-layout',
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
  imports: [RouterOutlet, Sidebar, Footer],
})
export default class Layout {}
