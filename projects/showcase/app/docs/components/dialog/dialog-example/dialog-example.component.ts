import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrButtonModule } from 'ngwr/button';
import { WrDialogModule } from 'ngwr/dialog';
import { WrPipesModule } from 'ngwr/pipes';

@Component({
  standalone: true,
  selector: 'ngwr-dialog-example',
  templateUrl: './dialog-example.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrButtonModule, WrDialogModule, WrPipesModule],
})
export class DialogExampleComponent {}
