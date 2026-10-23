/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { PagePreset } from './schema';

interface Rendered {
  readonly ts: string;
  readonly html: string;
  readonly scss?: string;
}

/** Render a starter page for the given preset + dasherized name. */
function render(preset: PagePreset, dashName: string, pascalName: string): Rendered {
  switch (preset) {
    case 'form':
      return renderForm(dashName, pascalName);
    case 'table':
      return renderTable(dashName, pascalName);
    case 'dashboard':
      return renderDashboard(dashName, pascalName);
  }
}

function renderForm(dashName: string, pascalName: string): Rendered {
  const ts = `import { Component, signal } from '@angular/core';
import { FormsModule, type NgForm } from '@angular/forms';

import { WrButton } from 'ngwr/button';
import { WrFormError, WrFormField } from 'ngwr/form';
import { WrInput } from 'ngwr/input';

@Component({
  selector: 'app-${dashName}',
  templateUrl: './${dashName}.html',
  styleUrl: './${dashName}.scss',
  imports: [FormsModule, WrButton, WrFormError, WrFormField, WrInput],
})
export default class ${pascalName} {
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly submitting = signal(false);

  protected async onSubmit(form: NgForm): Promise<void> {
    // A field shows its error once touched, so an invalid submit touches them
    // all, the ones never reached included, and sends nothing.
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      await fetch('/api/${dashName}', {
        method: 'POST',
        body: JSON.stringify({ name: this.name(), email: this.email() }),
      });
    } finally {
      this.submitting.set(false);
    }
  }
}
`;

  const html = `<form class="${dashName}" #form="ngForm" (ngSubmit)="onSubmit(form)">
  <h1>${titleCase(pascalName)}</h1>

  <wr-form-field label="Name" required>
    <input wrInput [(ngModel)]="name" name="name" required />
    <wr-form-error key="required">Enter your name.</wr-form-error>
  </wr-form-field>

  <wr-form-field label="Email" required>
    <input wrInput type="email" [(ngModel)]="email" name="email" required />
    <wr-form-error key="required">Enter your email.</wr-form-error>
  </wr-form-field>

  <button wr-btn color="primary" type="submit" [loading]="submitting()">
    Submit
  </button>
</form>
`;

  const scss = `.${dashName} {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 28rem;
  margin: 2rem auto;
  padding: 1.5rem;
}
`;

  return { ts, html, scss };
}

function renderTable(dashName: string, pascalName: string): Rendered {
  const ts = `import { Component, computed, signal } from '@angular/core';

import { WrTable } from 'ngwr/table';
import type { WrTableColumns, WrTableSortState } from 'ngwr/table';

interface Row {
  readonly id: number;
  readonly name: string;
  readonly status: 'active' | 'archived';
}

@Component({
  selector: 'app-${dashName}',
  templateUrl: './${dashName}.html',
  styleUrl: './${dashName}.scss',
  imports: [WrTable],
})
export default class ${pascalName} {
  protected readonly columns: WrTableColumns = {
    id: { title: 'ID' },
    name: { title: 'Name', sortable: true },
    status: { title: 'Status' },
  };

  protected readonly rows = signal<readonly Row[]>([
    { id: 1, name: 'Alpha', status: 'active' },
    { id: 2, name: 'Bravo', status: 'archived' },
    { id: 3, name: 'Charlie', status: 'active' },
  ]);

  /** wr-table writes the sort and never reorders \`items\`: applying it is the page's job. */
  protected readonly sort = signal<readonly WrTableSortState[]>([]);

  protected readonly sortedRows = computed(() => {
    const rules = this.sort().filter(rule => rule.direction !== null);
    if (rules.length === 0) return this.rows();

    return [...this.rows()].sort((a, b) => {
      for (const { key, direction } of rules) {
        const order = String(a[key as keyof Row]).localeCompare(String(b[key as keyof Row]), undefined, {
          numeric: true,
        });
        if (order !== 0) return direction === 'asc' ? order : -order;
      }
      return 0;
    });
  });

  /** The table slices \`items\` itself, and draws its pager once they outgrow a page. */
  protected readonly page = signal(1);
  protected readonly pageSize = 10;
}
`;

  const html = `<section class="${dashName}">
  <h1>${titleCase(pascalName)}</h1>

  <wr-table
    [columns]="columns"
    [items]="sortedRows()"
    [(sort)]="sort"
    [pageSize]="pageSize"
    [(page)]="page"
  />
</section>
`;

  const scss = `.${dashName} {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}
`;

  return { ts, html, scss };
}

function renderDashboard(dashName: string, pascalName: string): Rendered {
  const ts = `import { Component, signal } from '@angular/core';

import { WrCard } from 'ngwr/card';
import { WrStatistic } from 'ngwr/statistic';

@Component({
  selector: 'app-${dashName}',
  templateUrl: './${dashName}.html',
  styleUrl: './${dashName}.scss',
  imports: [WrCard, WrStatistic],
})
export default class ${pascalName} {
  protected readonly users = signal(1284);
  protected readonly revenue = signal(45_320);
  protected readonly active = signal(372);
}
`;

  const html = `<section class="${dashName}">
  <h1>${titleCase(pascalName)}</h1>

  <div class="${dashName}__grid">
    <wr-card>
      <wr-statistic label="Users" [value]="users()" />
    </wr-card>

    <wr-card>
      <wr-statistic label="Revenue" prefix="$" [value]="revenue()" />
    </wr-card>

    <wr-card>
      <wr-statistic label="Active" [value]="active()" />
    </wr-card>
  </div>
</section>
`;

  const scss = `.${dashName} {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 1rem;
  }
}
`;

  return { ts, html, scss };
}

function titleCase(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

export { render };
