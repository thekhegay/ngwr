import { Component } from '@angular/core';

@Component({
  selector: 'app-components-spinner',
  templateUrl: './spinner.component.html',
})
export class SpinnerComponent {
  readonly importCode: string = `import { WrSpinModule } from 'ngwr'`;
  readonly exampleCode = '<wr-spin></wr-spin>';
}
