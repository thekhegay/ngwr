import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrWindow } from 'ngwr/window';

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
  templateUrl: './window.html',
  imports: [
    WrButton,
    WrWindow,
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
  protected readonly osMacOpen = signal(false);
  protected readonly osLinuxOpen = signal(false);
  protected readonly sizeSmOpen = signal(false);
  protected readonly sizeLgOpen = signal(false);
  protected readonly stackedOpen = signal<readonly boolean[]>([false, false, false]);

  protected readonly snippets = {
    install: `import { WrWindow } from 'ngwr/window';

@Component({ imports: [WrWindow] })
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

    os: `<wr-window [(open)]="open" os="macos" title="Settings" />
<wr-window [(open)]="open" os="windows" title="Settings" />
<wr-window [(open)]="open" os="linux" title="Settings" />`,

    sizes: `<wr-window [(open)]="open" size="sm" title="Compact" />
<wr-window [(open)]="open" size="md" title="Default" />
<wr-window [(open)]="open" size="lg" title="Spacious" />`,

    manager: `import { inject } from '@angular/core';
import { WrWindowManager } from 'ngwr/window';

const manager = inject(WrWindowManager);

// Strictly increasing z-index — call when a window gains focus.
const z = manager.bringToFront();

// Cascade offset for the next window so two opens don't overlap.
const { x, y } = manager.nextStartOffset();`,
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
    {
      name: 'size',
      description: 'Size preset — seeds initial width / height when no explicit px values are passed.',
      type: "'sm' | 'md' | 'lg' | null",
      default: "'md'",
    },
    {
      name: 'initialWidth',
      description: 'Initial width in px. Wins over the `size` preset.',
      type: 'number | null',
      default: 'null',
    },
    {
      name: 'initialHeight',
      description: 'Initial height in px. Wins over the `size` preset.',
      type: 'number | null',
      default: 'null',
    },
    {
      name: 'os',
      description: 'Chrome style — picks the side, glyphs, and button look of the action cluster.',
      type: "'macos' | 'windows' | 'linux'",
      default: "'windows'",
    },
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

  protected readonly managerApi: readonly DocApiRow[] = [
    {
      name: 'WrWindowManager',
      description: 'Singleton (`providedIn: "root"`). Co-ordinates z-index + cascade across every `<wr-window>`.',
      type: 'service',
      default: '—',
    },
    {
      name: 'bringToFront()',
      sub: true,
      description: 'Returns a strictly-increasing z-index. Windows call this on focus to jump on top of the stack.',
      type: '() => number',
      default: '—',
    },
    {
      name: 'nextStartOffset()',
      sub: true,
      description: 'Cascade `{x, y}` for the next window so consecutive opens at the default position do not overlap.',
      type: '() => { x: number; y: number }',
      default: '—',
    },
  ];

  protected toggleStacked(i: number): void {
    const next = [...this.stackedOpen()];
    next[i] = !next[i];
    this.stackedOpen.set(next);
  }
}
