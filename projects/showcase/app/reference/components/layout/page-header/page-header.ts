import { Component } from '@angular/core';

import { WrTag } from 'ngwr/badge';
import { WrBreadcrumbs, WrBreadcrumbsItem } from 'ngwr/breadcrumbs';
import { WrButton } from 'ngwr/button';
import { WrPageHeader } from 'ngwr/page-header';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-page-header-page',
  templateUrl: './page-header.html',
  imports: [
    WrBreadcrumbs,
    WrBreadcrumbsItem,
    WrButton,
    WrPageHeader,
    WrTag,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class PageHeaderPageComponent {
  protected readonly snippet = `<wr-page-header title="Settings" subtitle="Manage your workspace">
  <div wrPageHeaderActions>
    <wr-btn>Invite</wr-btn>
    <wr-btn color="primary">Save</wr-btn>
  </div>
</wr-page-header>`;

  protected readonly allSlots = `<wr-page-header title="Billing" subtitle="Plan, invoices and payment method">
  <wr-breadcrumbs wrPageHeaderBreadcrumbs>
    <wr-breadcrumbs-item>Workspace</wr-breadcrumbs-item>
    <wr-breadcrumbs-item>Billing</wr-breadcrumbs-item>
  </wr-breadcrumbs>

  <div wrPageHeaderActions>
    <wr-btn outlined>Download invoices</wr-btn>
    <wr-btn color="primary">Change plan</wr-btn>
  </div>

  <!-- An ng-container, not a div: the extra row spaces its own children and
       leaves a wrapper alone. -->
  <ng-container wrPageHeaderExtra>
    <wr-tag color="success">Active</wr-tag>
    <wr-tag>Pro</wr-tag>
  </ng-container>
</wr-page-header>`;

  protected readonly api = API.WrPageHeader;
}
