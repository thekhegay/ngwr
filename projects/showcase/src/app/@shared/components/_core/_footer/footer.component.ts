import { Component } from '@angular/core';

@Component({
  selector: 'site-footer',
  templateUrl: './footer.component.html'
})
export class FooterComponent {
  readonly currentYear: number = new Date().getFullYear();
}
