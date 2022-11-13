import { Component } from '@angular/core';

import { wrIconSet } from 'ngwr/icon';

@Component({
  selector: 'app-components-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['icon.component.scss'],
})
export class IconComponent {
  readonly icons = wrIconSet;
  readonly iconRootCode = '@NgModule({\n  imports: [WrIconModule.forRoot()],\n})';
  readonly iconCode = `<wr-icon name="add"></wr-icon>`;
}
