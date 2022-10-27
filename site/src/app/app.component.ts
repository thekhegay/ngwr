import { Component } from '@angular/core';

import { WrButtonColor, wrIconSet, WrTagColor } from 'ngwr';

@Component({
  selector: 'wr-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  readonly currentYear: number = new Date().getFullYear();

  readonly icons = wrIconSet;
  readonly colors: Array<WrButtonColor | WrTagColor> = [
    'primary',
    'secondary',
    'success',
    'warning',
    'danger',
    'light',
    'medium',
    'dark'
  ];

  readonly colorsCode = `--wr-color-white: #ffffff;
--wr-color-black: #000000;
--wr-color-primary: #3969e2;
--wr-color-secondary: #f51c6a;
--wr-color-light: #dee0e8;
--wr-color-medium: #b5bccc;
--wr-color-dark: #322e4f;
--wr-color-success: #40da15;
--wr-color-warning: #F99B00;
--wr-color-danger: #e01d34;`;
  readonly btnCode = `<wr-btn color="primary" disabled outlined rounded loading></wr-btn>`;
  readonly checkboxCode = `<wr-checkbox [ngModel]="true" (checkedChange)="$event" checked disabled></wr-checkbox>`;
  readonly tagCode = `<wr-tag color="primary" transparent outlined rounded loading></wr-tag>`;
  readonly exInputCode = `<wr-extended-input prefix="prefix" suffix="suffix"></wr-extended-input>`;
  readonly passInput = `<wr-password-input></wr-password-input>`;
  readonly iconCode = `<wr-icon name="add"></wr-icon>`;
  readonly formCode = `<wr-form-item>
    <label>Form label</label>
    <input wr-input value="Form item" />
    <wr-form-error>Form error</wr-form-error>
</wr-form-item>`;
  readonly skeletonCode = `<wr-skeleton style="height: 2rem; width: 2rem; border-radius: 50rem"></wr-skeleton>
<wr-skeleton style="height: 1rem; width: 25%"></wr-skeleton>
<wr-skeleton style="height: 1rem; width: 50%"></wr-skeleton>
<wr-skeleton style="height: 1rem; width: 75%"></wr-skeleton>
<wr-skeleton style="height: 4rem; width: 100%"></wr-skeleton>`;
  readonly spinCode = `<wr-spin></wr-spin>`;
  readonly dividerCode = `<wr-divider></wr-divider>`;
  readonly iconRootCode = `@NgModule({
  imports: [WrIconModule.forRoot()],
})
`;
}
