import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrButtonComponent } from 'ngwr/button';
import { WrWindowComponent } from 'ngwr/window';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-window-page',
  templateUrl: './window.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrButtonComponent,
    WrWindowComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class WindowPageComponent {
  protected readonly basicOpen = signal(false);
  protected readonly fixedOpen = signal(false);
  protected readonly stackedOpen = signal<readonly boolean[]>([false, false, false]);

  protected readonly snippets = {
    install: `import { WrWindowComponent } from 'ngwr/window';

@Component({ imports: [WrWindowComponent] })
export class MyComponent {
  protected open = signal(false);
}`,

    basic: `<wr-window [(open)]="open" title="Settings">
  <p>Anything you want inside…</p>
</wr-window>`,

    fixed: `<wr-window
  [(open)]="open"
  title="Help"
  [initialX]="100"
  [initialY]="100"
  [initialWidth]="320"
  [initialHeight]="220"
  [resizable]="false"
  [showMaximize]="false"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'open', description: 'Two-way bindable visibility.', type: 'boolean', default: 'true' },
    {
      name: 'state',
      description: 'Two-way bindable visual state.',
      type: "'normal' | 'minimized' | 'maximized'",
      default: "'normal'",
    },
    { name: 'title', description: 'Header title text.', type: 'string', default: "''" },
    {
      name: 'initialX',
      description: 'Initial X in px. `null` cascades from the window manager.',
      type: 'number | null',
      default: 'null',
    },
    {
      name: 'initialY',
      description: 'Initial Y in px. `null` cascades from the window manager.',
      type: 'number | null',
      default: 'null',
    },
    { name: 'initialWidth', description: 'Initial width in px.', type: 'number', default: '400' },
    { name: 'initialHeight', description: 'Initial height in px.', type: 'number', default: '280' },
    { name: 'minWidth', description: 'Minimum width when resizing.', type: 'number', default: '220' },
    { name: 'minHeight', description: 'Minimum height when resizing.', type: 'number', default: '140' },
    { name: 'maxWidth', description: 'Maximum width when resizing.', type: 'number', default: 'Infinity' },
    { name: 'maxHeight', description: 'Maximum height when resizing.', type: 'number', default: 'Infinity' },
    { name: 'movable', description: 'Allow dragging the header.', type: 'boolean', default: 'true' },
    { name: 'resizable', description: 'Render 8 resize handles.', type: 'boolean', default: 'true' },
    {
      name: 'keepInViewport',
      description: 'Clamp position so the window can’t be dragged fully off-screen.',
      type: 'boolean',
      default: 'true',
    },
    { name: 'showMinimize', description: 'Render the minimize chrome button.', type: 'boolean', default: 'true' },
    { name: 'showMaximize', description: 'Render the maximize chrome button.', type: 'boolean', default: 'true' },
    { name: 'showClose', description: 'Render the close chrome button.', type: 'boolean', default: 'true' },
  ];

  protected readonly events: readonly DocApiRow[] = [
    { name: 'closed', description: 'Fires when the user clicks the close button.', type: '() => void', default: '—' },
    {
      name: 'moved',
      description: 'Fires after a drag, with the new position.',
      type: '({ x, y }) => void',
      default: '—',
    },
    {
      name: 'resized',
      description: 'Fires after a resize, with the new size.',
      type: '({ width, height }) => void',
      default: '—',
    },
  ];

  protected toggleStacked(i: number): void {
    const next = [...this.stackedOpen()];
    next[i] = !next[i];
    this.stackedOpen.set(next);
  }
}
