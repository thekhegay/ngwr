import { Component } from '@angular/core';
import { DarkModeService } from 'showcase/@shared/services';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
})
export class RootComponent {
  constructor(private readonly darkModeService: DarkModeService) {
    this.darkModeService.init();
  }
}
