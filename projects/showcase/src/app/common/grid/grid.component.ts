import { Component } from '@angular/core';

@Component({
  selector: 'app-common-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
})
export class GridComponent {
  readonly exampleCode =
    '<div class="grid">\n  <div class="col-6">.col-6</div>\n  <div class="col-6">.col-6</div>\n  <div class="col-6">.col-6</div>\n  <div class="col-6">.col-6</div>\n</div>';
}
