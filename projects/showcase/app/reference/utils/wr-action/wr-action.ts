import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-action-page',
  templateUrl: './wr-action.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrActionPage {
  protected readonly snippet = `import { wrAction } from 'ngwr/utils';

@Component({
  template: \`
    <button wr-btn [loading]="save.loading()" (click)="save.run(draft())">Save</button>
    @if (save.status() === 'error') {
      <wr-alert type="danger">Could not save.</wr-alert>
    }
  \`,
})
export class DraftEditor {
  private readonly api = inject(DraftApi);
  readonly draft = signal<Draft>({ title: '' });
  readonly save = wrAction((draft: Draft) => this.api.save(draft));
}`;

  protected readonly keyedSnippet = `import { wrKeyedAction } from 'ngwr/utils';

@Component({
  template: \`
    @for (row of rows(); track row.id) {
      <button wr-btn size="sm" [loading]="remove.pending(row.id)" (click)="remove.run(row.id)">
        Remove
      </button>
    }
  \`,
})
export class RowList {
  readonly remove = wrKeyedAction((id: string) => this.api.remove(id));
}`;

  protected readonly resourceSnippet = `import { httpResource } from '@angular/common/http';
import { wrResourceValue } from 'ngwr/utils';

@Component({
  template: \`<wr-table [items]="rows()" [loading]="users.isLoading()" />\`,
})
export class Users {
  readonly page = signal(1);
  readonly users = httpResource<User[]>(() => \`/api/users?page=\${this.page()}\`);
  readonly rows = wrResourceValue(this.users, []);
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrAction(fn)',
      description:
        'Wraps `fn` in a `WrAction`: `status` (`idle` / `pending` / `success` / `error`), `loading`, the last `value`, the last `error`, `run(arg)` and `reset()`. Needs no injection context.',
      type: '<A, R>(fn: (arg: A) => Promise<R>) => WrAction<A, R>',
      default: '-',
    },
    {
      name: 'WrAction.run(arg)',
      description:
        'Starts the write, or returns the promise of the run in flight. Resolves with the result, or `undefined` when the call threw or `reset()` ran first. Never rejects.',
      type: '(arg: A) => Promise<R | undefined>',
      default: '-',
    },
    {
      name: 'WrAction.reset()',
      description:
        'Back to `idle` with `value` and `error` cleared. A run in flight is disowned: its result is dropped.',
      type: '() => void',
      default: '-',
    },
    {
      name: 'wrKeyedAction(fn)',
      description:
        'The row form: `pending(key)` as a reactive read, `loading` while any key runs, `error` of the most recently settled run, `run(key, arg)` single-flight per key, and `reset()`.',
      type: '<K, A, R>(fn: (key: K, arg: A) => Promise<R>) => WrKeyedAction<K, A, R>',
      default: '-',
    },
    {
      name: 'wrResourceValue(resource, fallback)',
      description:
        "A read-only signal of the resource's value: the value when it has one, the last settled value while it loads, reloads or sits in `error`, and `fallback` before anything settled. Needs an injection context.",
      type: '<T>(resource: Resource<T | undefined>, fallback: T) => Signal<T>',
      default: '-',
    },
  ];
}
