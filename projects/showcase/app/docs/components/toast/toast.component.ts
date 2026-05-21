import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { WrButtonComponent } from 'ngwr/button';
import { WrSegmentedComponent, type WrSegmentedOption } from 'ngwr/segmented';
import { WrToastService, type WrToastPosition, type WrToastType } from 'ngwr/toast';

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
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrButtonComponent,
    WrSegmentedComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ToastPageComponent {
  private readonly toast = inject(WrToastService);
  protected readonly position = signal<WrToastPosition>('top-end');

  protected readonly positionOptions: readonly WrSegmentedOption<WrToastPosition>[] = [
    { value: 'top-start', label: 'Top start' },
    { value: 'top', label: 'Top' },
    { value: 'top-end', label: 'Top end' },
    { value: 'bottom-start', label: 'Bottom start' },
    { value: 'bottom', label: 'Bottom' },
    { value: 'bottom-end', label: 'Bottom end' },
  ];

  protected readonly snippets = {
    install: `import { WrToastService } from 'ngwr/toast';

@Component({...})
export class MyComponent {
  private readonly toast = inject(WrToastService);
}`,
    show: `this.toast.show({
  type: 'success',
  title: 'Saved',
  message: 'Profile updated.',
  duration: 4000,
});`,
    persistent: `this.toast.show({
  type: 'danger',
  message: 'Network error',
  duration: 0, // disables auto-dismiss
});`,
    position: `this.toast.setPosition('bottom-end');`,
  };

  protected readonly api: readonly DocApiRow[] = [
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
      description: 'Move the toast stack to a different corner.',
      type: '(WrToastPosition) => void',
      default: '—',
    },
  ];

  protected readonly configApi: readonly DocApiRow[] = [
    { name: 'type', description: 'Visual variant.', type: 'WrToastType', default: "'info'" },
    { name: 'title', description: 'Optional heading.', type: 'string', default: '—' },
    { name: 'message', description: 'Body text.', type: 'string', required: true },
    { name: 'duration', description: 'Auto-dismiss after N ms. 0 disables.', type: 'number', default: '4000' },
    { name: 'dismissible', description: 'Show close button.', type: 'boolean', default: 'true' },
  ];

  protected fire(type: WrToastType): void {
    this.toast.show({
      type,
      title: this.titleFor(type),
      message: this.messageFor(type),
    });
  }

  protected onPositionChange(value: WrToastPosition | null): void {
    if (!value) return;
    this.position.set(value);
    this.toast.setPosition(value);
  }

  protected firePersistent(): void {
    this.toast.show({ type: 'warning', title: 'Read me', message: 'No timeout — dismiss me manually.', duration: 0 });
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
