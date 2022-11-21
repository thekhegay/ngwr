import { Component } from '@angular/core';

@Component({
  selector: 'app-components-form',
  templateUrl: './form.component.html',
})
export class FormComponent {
  readonly importCode: string = `import { WrFormModule } from 'ngwr'`;
  readonly exampleCode =
    '<wr-form-item>\n    <label>Username</label>\n    <wr-input placeholder="Username"></wr-input>\n</wr-form-item>';
  readonly errorCode =
    '<wr-form-item [hasError]="true">\n    <label></label>\n    <wr-input></wr-input>\n    <wr-form-error>Username is required</wr-form-error>\n</wr-form-item>\n';
}
