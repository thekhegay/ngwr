import { Component, signal } from '@angular/core';

import { WrPagination } from 'ngwr/pagination';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pagination-page',
  templateUrl: './pagination.html',
  imports: [
    WrPagination,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class PaginationComponent {
  protected readonly page = signal(1);
  protected readonly size = signal(10);

  protected readonly snippets = {
    install: `import { WrPagination } from 'ngwr/pagination';

@Component({ imports: [WrPagination] })
export class MyComponent {}`,
    basic: `<wr-pagination [total]="120" [(currentPage)]="page" />`,
    sizes: `<wr-pagination [total]="120" [(currentPage)]="page" size="xs" />
<wr-pagination [total]="120" [(currentPage)]="page" size="sm" />
<wr-pagination [total]="120" [(currentPage)]="page" size="md" />
<wr-pagination [total]="120" [(currentPage)]="page" size="lg" />
<wr-pagination [total]="120" [(currentPage)]="page" size="xl" />`,
    shapes: `<wr-pagination [total]="120" [(currentPage)]="page" shape="rounded" />
<wr-pagination [total]="120" [(currentPage)]="page" shape="square" />`,
    full: `<wr-pagination
  [total]="120"
  [(currentPage)]="page"
  [(pageSize)]="size"
  showTotal
  showSizeChanger
  align="end"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'currentPage', description: 'Current page (1-based). Two-way bindable.', type: 'number', default: '1' },
    { name: 'pageSize', description: 'Items per page. Two-way bindable.', type: 'number', default: '10' },
    { name: 'total', description: 'Total item count.', type: 'number', default: '0' },
    {
      name: 'pageSizeOptions',
      description: 'Choices in the size dropdown.',
      type: 'readonly number[]',
      default: '[10, 20, 50, 100]',
    },
    { name: 'showSizeChanger', description: 'Render the page-size dropdown.', type: 'boolean', default: 'false' },
    { name: 'showTotal', description: 'Render the "X–Y of Z" label.', type: 'boolean', default: 'false' },
    {
      name: 'align',
      description: 'Horizontal alignment.',
      type: "'start' | 'center' | 'end'",
      default: "'start'",
    },
    {
      name: 'size',
      description: 'Size variant. `xs` and `xl` extend the button scale via padding/font overrides.',
      type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'",
      default: "'sm'",
    },
    {
      name: 'shape',
      description: 'Cell corner treatment. `square` flattens corners for a numeric grid look.',
      type: "'rounded' | 'square'",
      default: "'rounded'",
    },
    { name: 'disabled', description: 'Disable interaction.', type: 'boolean', default: 'false' },
    { name: 'ofLabel', description: 'Localised "of" word.', type: 'string', default: "'of'" },
  ];
}
