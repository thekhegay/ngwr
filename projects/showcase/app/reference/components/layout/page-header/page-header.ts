import { Component } from '@angular/core';

import { WrTag } from 'ngwr/badge';
import { WrBreadcrumbs, WrBreadcrumbsItem } from 'ngwr/breadcrumbs';
import { WrButton } from 'ngwr/button';
import { WrInput } from 'ngwr/input';
import { WrPageHeader } from 'ngwr/page-header';
import { WrOption, WrSelect } from 'ngwr/select';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
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
    WrInput,
    WrOption,
    WrPageHeader,
    WrSelect,
    WrTag,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class PageHeaderPageComponent {
  protected readonly rows = Array.from({ length: 24 }, (_, i) => i + 1);

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

  <!-- ng-container: the row does not space a wrapper's children. -->
  <ng-container wrPageHeaderExtra>
    <wr-tag color="success">Active</wr-tag>
    <wr-tag>Pro</wr-tag>
  </ng-container>
</wr-page-header>`;

  protected readonly compact = `<wr-page-header compact title="Billing" subtitle="Plan, invoices and payment method">
  <wr-breadcrumbs wrPageHeaderBreadcrumbs>…</wr-breadcrumbs>
  <div wrPageHeaderActions>…</div>
</wr-page-header>`;

  protected readonly filters = `<wr-page-header compact title="Invoices">
  <div wrPageHeaderActions>
    <wr-btn color="primary">New invoice</wr-btn>
  </div>
  <div wrPageHeaderFilters>
    <wr-select placeholder="Status">
      <wr-option value="paid">Paid</wr-option>
      <wr-option value="due">Due</wr-option>
    </wr-select>
    <input wrInput placeholder="Search invoices" />
  </div>
</wr-page-header>`;

  protected readonly sticky = `<wr-page-header sticky compact title="Invoices">…</wr-page-header>`;

  protected readonly stickyScss = `wr-page-header {
  --wr-page-header-sticky-top: var(--app-bar-height);
}

// The consumer's half: a focused row stops short of the header.
html {
  scroll-padding-block-start: calc(var(--app-bar-height) + 4rem);
}`;

  protected readonly api = API.WrPageHeader;

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Directive',
      title: 'wrAffix',
      url: ['/reference/directives', 'affix'],
      description: 'Stick any element and style it while it is stuck.',
    },
  ];
}
