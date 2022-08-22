import { Component } from '@angular/core';
import { wrIconSet } from 'ngwr';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  readonly icons = wrIconSet;
}
