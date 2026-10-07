import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrButton } from 'ngwr/button';
import { WrResult404 } from 'ngwr/result';

import { Footer } from '../_layout/footer/footer';

import { MetaService } from '#core/services';
import { routes } from '#routing';

/**
 * The `**` route's page.
 *
 * Before it existed an unmatched URL threw `NG04002` out of the router, the
 * outlet never activated, and Angular's own error handling rewrote the address
 * bar back to `/` — so a rotted link left the header sitting over a blank page
 * that claimed to be the homepage. `routing.ts` records which links this site
 * still publishes reach it.
 *
 * `<wr-result-404>` rather than hand-rolled markup — the library ships the empty
 * / error state, and the docs site should be its own first consumer.
 */
@Component({
  selector: 'ngwr-not-found',
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
  imports: [RouterLink, WrButton, WrResult404, Footer],
})
export default class NotFound {
  protected readonly routes = routes;

  constructor() {
    // The page is client-rendered by construction (see `app.routes.server.ts`),
    // so this is what a JS-executing agent reads instead of a status code.
    inject(MetaService).setTitle('Page not found');
  }
}
