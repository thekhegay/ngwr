import { Component, computed, inject, signal } from '@angular/core';
import { email, FormField, form, required, submit } from '@angular/forms/signals';

import { WrAlert } from 'ngwr/alert';
import { WrButton } from 'ngwr/button';
import { WrCheckbox } from 'ngwr/checkbox';
import { WrFormField } from 'ngwr/form';
import { WrInput } from 'ngwr/input';
import { WrOption, WrSelect } from 'ngwr/select';

import {
  type DocCodeFile,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { SandboxService } from '#core/sandbox';

/** What the demo form collects. Mirrored by the snippet below, deliberately. */
interface Signup {
  email: string;
  team: string;
  agree: boolean;
}

/**
 * The trial surface: one live Signal Forms demo, and the same demo offered as a
 * complete Angular workspace on StackBlitz. The corner icon every other snippet
 * carries is suppressed here with `[sandboxable]="false"` — the labelled button
 * below opens a byte-identical project, and two controls doing one thing on the
 * page whose subject IS that action is one too many.
 *
 * The demo is written twice — once as markup in `playground.html`, once as the
 * `demo` snippet below — and that is not an accident waiting to drift. The
 * snippet is a WHOLE component (imports, decorator, inline template, class), so
 * the sandbox ships it verbatim instead of synthesising one; a fragment would
 * be wired up by the scanner, and the scanner refuses `[formField]` on purpose
 * (a field tree lives in TypeScript a fragment does not show). Keeping the two
 * in step by hand is the price of the one page where the sandbox has to be
 * exactly what the page shows.
 */
@Component({
  selector: 'ngwr-gs-playground-page',
  templateUrl: './playground.html',
  imports: [
    WrAlert,
    FormField,
    WrButton,
    WrCheckbox,
    WrFormField,
    WrInput,
    WrOption,
    WrSelect,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class PlaygroundPage {
  private readonly sandbox = inject(SandboxService);

  private readonly model = signal<Signup>({ email: '', team: '', agree: false });

  /**
   * `signup.email` writes the input's `value` model and `signup.agree` the
   * checkbox's `checked` model — no `ControlValueAccessor`, because the library
   * does not contain one. The copy for `required` and `email` comes from the
   * `ngwr/i18n` `validation.*` catalog through `<wr-form-field>`, so no
   * `<wr-form-error>` has to be written unless a field wants its own wording.
   */
  protected readonly signup = form(this.model, path => {
    required(path.email);
    email(path.email);
    required(path.team);
    // `isEmpty()` counts `false` as empty, so a plain `required` is the right
    // rule for a consent checkbox — no `requiredTrue` equivalent needed.
    required(path.agree);
  });

  /** Set once a submit passes, so the demo shows what the form produced. */
  protected readonly submitted = signal<Signup | null>(null);

  protected readonly submittedJson = computed(() => JSON.stringify(this.submitted(), null, 2));

  protected reserve(event: Event): void {
    // The `<form>` is here for Enter-to-submit; the navigation it would
    // otherwise do is not.
    event.preventDefault();
    this.submitted.set(null);
    void submit(this.signup, () => {
      this.submitted.set(this.model());
      // `TreeValidationResult` — `undefined` means "the server found nothing
      // wrong". A real action would POST here and map a 4xx onto the field it
      // belongs to.
      return Promise.resolve(undefined);
    });
  }

  protected openSandbox(): void {
    void this.sandbox.open({
      title: 'ngwr — Signal Forms',
      description: 'A signals-first Angular UI library whose value controls bind straight to Signal Forms.',
      files: this.demoFiles,
    });
  }

  protected readonly snippets = {
    demo: `import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';

import { WrButton } from 'ngwr/button';
import { WrCheckbox } from 'ngwr/checkbox';
import { WrFormField } from 'ngwr/form';
import { WrInput } from 'ngwr/input';
import { WrOption, WrSelect } from 'ngwr/select';

interface Signup {
  email: string;
  team: string;
  agree: boolean;
}

@Component({
  selector: 'demo-root',
  imports: [JsonPipe, FormField, WrButton, WrCheckbox, WrFormField, WrInput, WrOption, WrSelect],
  template: \`
    <form (submit)="reserve($event)" style="display: flex; flex-direction: column; gap: 1rem; max-width: 26rem">
      <wr-form-field label="Work email" hint="We'll never share it." required>
        <input wrInput type="email" placeholder="ada@example.com" [formField]="signup.email" />
      </wr-form-field>

      <wr-form-field label="Team size" required>
        <wr-select ariaLabel="Team size" placeholder="Pick one" [formField]="signup.team">
          <wr-option value="solo">Just me</wr-option>
          <wr-option value="small">2–10 people</wr-option>
          <wr-option value="large">More than 10</wr-option>
        </wr-select>
      </wr-form-field>

      <wr-form-field>
        <wr-checkbox [formField]="signup.agree">I agree to the terms</wr-checkbox>
      </wr-form-field>

      <button wr-btn type="submit" color="primary" style="align-self: flex-start">Reserve your spot</button>

      @if (submitted(); as value) {
        <pre>{{ value | json }}</pre>
      }
    </form>
  \`,
})
export class Demo {
  private readonly model = signal<Signup>({ email: '', team: '', agree: false });

  // Two bindings and nothing in between: \`[formField]\` writes the component's
  // own \`value\` / \`checked\` model, because each of these ngwr controls implements
  // \`FormValueControl\` itself. There is no ControlValueAccessor in the library.
  protected readonly signup = form(this.model, path => {
    required(path.email);
    email(path.email);
    required(path.team);
    required(path.agree);
  });

  protected readonly submitted = signal<Signup | null>(null);

  protected reserve(event: Event): void {
    event.preventDefault();
    void submit(this.signup, () => {
      this.submitted.set(this.model());
      // undefined means "the server found nothing wrong" — a real action would
      // POST here and map a 4xx onto the field it belongs to.
      return Promise.resolve(undefined);
    });
  }
}`,

    local: `# The same workspace on your machine — prompts for styles, date adapter,
# density and theme, then prints the bootstrap snippet you picked.
ng new my-app --style=scss
cd my-app
ng add ngwr`,

    /**
     * `src/main.ts`, character for character what `buildSandboxProject` emits —
     * keep it that way. A bootstrap on this page that is not the one in the tab
     * is the page lying about the thing it exists to demonstrate.
     */
    bootstrap: `import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';

import { provideWrDateAdapter } from 'ngwr/date';
import { provideWrOverlay } from 'ngwr/overlay';

import { Demo } from './app/demo';

bootstrapApplication(Demo, {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter([], withDisabledInitialNavigation()),
    provideWrDateAdapter(),
    provideWrOverlay(),
  ],
}).catch(error => console.error(error));`,

    styles: `// src/styles.scss — one import for the whole library.
@use 'ngwr';`,
  };

  /**
   * What the sandbox opens. The `json` pipe in the snippet's template is the one
   * thing the page's own demo spells out longhand — `<ngwr-doc-code>` shows the
   * file as a consumer would write it, and a consumer would reach for the pipe.
   */
  protected readonly demoFiles: readonly DocCodeFile[] = [
    { label: 'demo.ts', language: 'angular-ts', code: this.snippets.demo },
  ];
}
