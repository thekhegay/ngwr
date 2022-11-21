import { Component } from '@angular/core';

@Component({
  selector: 'app-components-divider',
  templateUrl: './divider.component.html',
})
export class DividerComponent {
  readonly importCode: string = `import { WrDividerModule } from 'ngwr'`;
  readonly dividerCode = `<wr-divider></wr-divider>`;
}
