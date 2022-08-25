import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { WrModule } from './wr.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    WrModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
