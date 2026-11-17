import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-focus-first-invalid-page',
  templateUrl: './wr-focus-first-invalid.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class WrFocusFirstInvalidPage {
  protected readonly snippet = `import { Component, ElementRef, Injector, inject, signal, viewChild } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';

import { wrFocusFirstInvalid } from 'ngwr/utils';

@Component({
  template: \`
    <form #formEl (submit)="$event.preventDefault(); save()">
      <wr-form-field label="Name">
        <input wrInput [formField]="profile.name" />
      </wr-form-field>
      <button wr-btn type="submit">Save</button>
    </form>
  \`,
})
export class Profile {
  private readonly injector = inject(Injector);
  private readonly formEl = viewChild.required<ElementRef<HTMLElement>>('formEl');

  private readonly model = signal({ name: '' });
  protected readonly profile = form(this.model, path => {
    required(path.name, { message: 'Enter a name.' });
  });

  protected async save(): Promise<void> {
    const sent = await submit(this.profile, async () => this.api.save(this.model()));
    if (!sent) void wrFocusFirstInvalid(this.formEl().nativeElement, { injector: this.injector });
  }
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrFocusFirstInvalid(root, options?)',
      description:
        'Focuses the first invalid control inside `root` and scrolls its field into view. Resolves to whether there was one.',
      type: '(root: HTMLElement, options?: WrFocusFirstInvalidOptions) => Promise<boolean>',
      default: '-',
    },
    {
      name: 'options.injector',
      description: 'Waits for the next render before looking. Pass it when the call follows the submit.',
      type: 'Injector',
      default: '-',
    },
    {
      name: 'options.scroll',
      description:
        'Options for `scrollIntoView`, or `false` to leave the scroll to the browser. Reduced motion always jumps.',
      type: 'ScrollIntoViewOptions | false',
      default: "{ block: 'center', behavior: 'smooth' }",
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Forms', url: ['/guides', 'forms'] },
    { kind: 'Directive', title: 'wrAutofocus', url: ['/reference/directives', 'autofocus'] },
  ];
}
