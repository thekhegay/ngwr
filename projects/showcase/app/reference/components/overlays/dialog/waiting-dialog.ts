import { Component } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrDialogClose, WrDialogContent, WrDialogFooter, WrDialogTitle } from 'ngwr/dialog';

@Component({
  selector: 'ngwr-waiting-dialog',
  templateUrl: './waiting-dialog.html',
  imports: [WrButton, WrDialogTitle, WrDialogContent, WrDialogFooter, WrDialogClose],
})
export class WaitingDialogComponent {}
