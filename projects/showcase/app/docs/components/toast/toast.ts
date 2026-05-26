import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import { WrToast, type WrToastMode, type WrToastPosition, type WrToastType } from 'ngwr/toast';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-toast-page',
  templateUrl: './toast.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrButton,
    WrSegmented,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ToastPageComponent {
  private readonly toast = inject(WrToast);

  protected readonly position = signal<WrToastPosition>('top-end');
  protected readonly mode = signal<WrToastMode>('stack');
  protected readonly showProgress = signal(true);
  protected readonly showCopy = signal(false);

  protected readonly modeOptions: readonly WrSegmentedOption<WrToastMode>[] = [
    { value: 'stack', label: 'Stack (Sonner)' },
    { value: 'list', label: 'List' },
  ];

  protected onModeChange(value: WrToastMode): void {
    this.mode.set(value);
    this.toast.setMode(value);
  }

  protected readonly positionOptions: readonly WrSegmentedOption<WrToastPosition>[] = [
    { value: 'top-start', label: 'Top start' },
    { value: 'top', label: 'Top' },
    { value: 'top-end', label: 'Top end' },
    { value: 'bottom-start', label: 'Bottom start' },
    { value: 'bottom', label: 'Bottom' },
    { value: 'bottom-end', label: 'Bottom end' },
  ];

  protected readonly snippets = {
    install: `import { WrToast } from 'ngwr/toast';

@Component({...})
export class MyComponent {
  private readonly toast = inject(WrToast);
}`,

    config: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideWrToastConfig } from 'ngwr/toast';

import { AppComponent } from './app/app';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrToastConfig({
      position: 'bottom-end',
      duration: 5000,
      showProgress: true,
      showCopy: true,
      maxStack: 5,
      labels: {
        close: 'Закрыть',
        copy: 'Копировать',
        copied: 'Скопировано',
        closeAll: 'Закрыть все',
      },
    }),
  ],
});`,

    show: `this.toast.show({
  type: 'success',
  title: 'Saved',
  message: 'Profile updated.',
});`,

    overrides: `this.toast.show({
  message: 'Permalink copied to clipboard',
  position: 'bottom',
  showCopy: true,
  duration: 6000,
});`,

    persistent: `this.toast.show({
  type: 'danger',
  message: 'Network error',
  duration: 0, // no auto-dismiss
});`,

    position: `this.toast.setPosition('bottom-end');`,
  };

  protected readonly serviceApi: readonly DocApiRow[] = [
    {
      name: 'show(options)',
      description: 'Opens a toast and returns a handle (`dismiss()`).',
      type: '(WrToastOptions) => WrToastRef',
      default: '—',
    },
    { name: 'dismiss(id)', description: 'Removes a single toast by id.', type: '(number) => void', default: '—' },
    { name: 'dismissAll()', description: 'Removes every toast in the stack.', type: '() => void', default: '—' },
    {
      name: 'setPosition(position)',
      description: 'Move the toast stack to a different corner. Affects future toasts.',
      type: '(WrToastPosition) => void',
      default: '—',
    },
  ];

  protected readonly optionsApi: readonly DocApiRow[] = [
    {
      name: 'type',
      description: 'Visual variant.',
      type: "'info' | 'success' | 'warning' | 'danger'",
      default: "'info'",
    },
    { name: 'title', description: 'Optional heading.', type: 'string', default: '—' },
    { name: 'message', description: 'Body text.', type: 'string', required: true },
    {
      name: 'duration',
      description: 'Auto-dismiss after N ms. 0 disables. Falls back to global config.',
      type: 'number',
      default: 'config.duration',
    },
    { name: 'dismissible', description: 'Show close (×) button.', type: 'boolean', default: 'true' },
    {
      name: 'position',
      description: 'Override the corner for this toast only.',
      type: 'WrToastPosition',
      default: 'config.position',
    },
    {
      name: 'showProgress',
      description: 'Override the progress bar visibility.',
      type: 'boolean',
      default: 'config.showProgress',
    },
    {
      name: 'showCopy',
      description: 'Override the copy button visibility.',
      type: 'boolean',
      default: 'config.showCopy',
    },
  ];

  protected readonly configApi: readonly DocApiRow[] = [
    {
      name: 'position',
      description: 'Default corner the stack renders in.',
      type: 'WrToastPosition',
      default: "'top-end'",
    },
    { name: 'duration', description: 'Default auto-dismiss in ms. 0 disables.', type: 'number', default: '4000' },
    { name: 'showProgress', description: 'Render a countdown bar; pauses on hover.', type: 'boolean', default: 'true' },
    { name: 'showCopy', description: 'Render a copy-message button on each toast.', type: 'boolean', default: 'false' },
    {
      name: 'showCloseAll',
      description: 'Render a "Close all" button above the stack.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'closeAllThreshold',
      description: 'Minimum stack size before "Close all" appears.',
      type: 'number',
      default: '2',
    },
    {
      name: 'maxStack',
      description: 'Max visible toasts; oldest dismissed when exceeded. 0 = unlimited.',
      type: 'number',
      default: '5',
    },
    {
      name: 'labels',
      description: 'Strings rendered in the UI — override individually for i18n.',
      type: '{ close; copy; copied; closeAll }',
      default: '—',
    },
  ];

  protected fire(type: WrToastType): void {
    this.toast.show({
      type,
      title: this.titleFor(type),
      message: this.messageFor(type),
      showProgress: this.showProgress(),
      showCopy: this.showCopy(),
    });
  }

  protected fireStack(): void {
    for (let i = 1; i <= 3; i++) {
      this.toast.show({
        type: 'info',
        title: `Notification #${i}`,
        message: 'Click "Close all" to dismiss the stack at once.',
        showProgress: this.showProgress(),
      });
    }
  }

  protected firePersistent(): void {
    this.toast.show({
      type: 'warning',
      title: 'Read me',
      message: 'No timeout — dismiss me manually.',
      duration: 0,
    });
  }

  protected fireCopy(): void {
    this.toast.show({
      message: 'Permalink copied to clipboard. Try the copy button →',
      showCopy: true,
      showProgress: this.showProgress(),
    });
  }

  protected onPositionChange(value: WrToastPosition | null): void {
    if (!value) return;
    this.position.set(value);
    this.toast.setPosition(value);
  }

  protected dismissAll(): void {
    this.toast.dismissAll();
  }

  private titleFor(type: WrToastType): string {
    return { info: 'Heads up', success: 'Saved', warning: 'Careful', danger: 'Failed' }[type];
  }

  private messageFor(type: WrToastType): string {
    return {
      info: 'Just a friendly note.',
      success: 'Profile updated.',
      warning: 'This action will affect 3 items.',
      danger: 'Something went wrong. Try again.',
    }[type];
  }
}
