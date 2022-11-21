import { Component } from '@angular/core';

@Component({
  selector: 'app-components-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss'],
})
export class InputComponent {
  readonly importCode: string = `import { WrInputModule } from 'ngwr'`;
  readonly exampleCode =
    '<wr-input value="Basic input usage"></wr-input>\n<wr-input [ngModel]="\'Basic input usage\'"></wr-input>';
  readonly prefixSuffixCode =
    '<wr-input value="Input value" prefix="Prefix"></wr-input>\n<wr-input value="Input value" suffix="Suffix"></wr-input>\n<wr-input value="Input value" prefix="Prefix" suffix="Suffix"></wr-input>';
  readonly passwordCode = '<wr-input value="Password input" type="password" passwordIcons></wr-input>';
  readonly disabledCode = '<wr-input value="Disabled" disabled></wr-input>';
  readonly readonlyCode = '<wr-input value="Readonly" readonly></wr-input>';
  readonly ngModelChangeReturn = 'EventEmitter<any>';
}
