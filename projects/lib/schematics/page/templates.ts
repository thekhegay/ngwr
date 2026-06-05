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
import { FormsModule } from '@angular/forms';

import { WrButton } from 'ngwr/button';
import { WrFormField, WrLabel, WrErrorMessage } from 'ngwr/form-field';
import { WrInput } from 'ngwr/input';

@Component({
  selector: 'app-${dashName}',
  templateUrl: './${dashName}.html',
  styleUrl: './${dashName}.scss',
  imports: [FormsModule, WrButton, WrFormField, WrLabel, WrErrorMessage, WrInput],
})
export default class ${pascalName} {
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly submitting = signal(false);

  protected async onSubmit(): Promise<void> {
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

  const html = `<form class="${dashName}" (ngSubmit)="onSubmit()">
  <h1>${titleCase(pascalName)}</h1>

  <wr-form-field>
    <wr-label>Name</wr-label>
    <input wrInput [(ngModel)]="name" name="name" required />
  </wr-form-field>

  <wr-form-field>
    <wr-label>Email</wr-label>
    <input wrInput type="email" [(ngModel)]="email" name="email" required />
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
  const ts = `import { Component, signal } from '@angular/core';

import { WrTable } from 'ngwr/table';
import { WrPagination } from 'ngwr/pagination';

interface Row {
  readonly id: number;
  readonly name: string;
  readonly status: 'active' | 'archived';
}

@Component({
  selector: 'app-${dashName}',
  templateUrl: './${dashName}.html',
  styleUrl: './${dashName}.scss',
  imports: [WrTable, WrPagination],
})
export default class ${pascalName} {
  protected readonly columns = ['id', 'name', 'status'] as const;

  protected readonly rows = signal<readonly Row[]>([
    { id: 1, name: 'Alpha', status: 'active' },
    { id: 2, name: 'Bravo', status: 'archived' },
    { id: 3, name: 'Charlie', status: 'active' },
  ]);

  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly total = signal(3);
}
`;

  const html = `<section class="${dashName}">
  <h1>${titleCase(pascalName)}</h1>

  <wr-table [data]="rows()" [columns]="columns" />

  <wr-pagination
    [(page)]="page"
    [pageSize]="pageSize()"
    [total]="total()"
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
import { WrCountUp } from 'ngwr/count-up';

@Component({
  selector: 'app-${dashName}',
  templateUrl: './${dashName}.html',
  styleUrl: './${dashName}.scss',
  imports: [WrCard, WrStatistic, WrCountUp],
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
      <wr-statistic title="Users">
        <wr-count-up [to]="users()" />
      </wr-statistic>
    </wr-card>

    <wr-card>
      <wr-statistic title="Revenue" prefix="$">
        <wr-count-up [to]="revenue()" />
      </wr-statistic>
    </wr-card>

    <wr-card>
      <wr-statistic title="Active">
        <wr-count-up [to]="active()" />
      </wr-statistic>
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
