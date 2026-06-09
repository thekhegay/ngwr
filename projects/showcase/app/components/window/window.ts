import { Component, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrWindow, WrWindowManager, WrWindowTaskbar } from 'ngwr/window';

import WindowDemoBodyComponent from './window-demo-body';

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
    WrWindowTaskbar,
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
  protected readonly compactOpen = signal(false);
  protected readonly persistedOpen = signal(false);
  protected readonly stackedOpen = signal<readonly boolean[]>([false, false, false]);
  protected readonly lastProgrammaticResult = signal<string | null>(null);

  private readonly manager = inject(WrWindowManager);

  protected async openProgrammatic(opts?: { modal?: boolean; snap?: 'edges' | 'all' }): Promise<void> {
    const ref = this.manager.open<WindowDemoBodyComponent, string, { message: string }>(WindowDemoBodyComponent, {
      title: opts?.modal ? 'Confirm action' : 'Programmatic window',
      size: 'md',
      modal: opts?.modal,
      snap: opts?.snap,
      data: {
        message: opts?.modal
          ? 'Press ESC, click the backdrop, or use the button below.'
          : 'I was opened via WrWindowManager.open().',
      },
    });
    const result = await ref.afterClosed();
    this.lastProgrammaticResult.set(result ?? 'closed');
  }

  protected openTaskbarDemo(title: string): void {
    this.manager.open(WindowDemoBodyComponent, {
      title,
      size: 'sm',
      data: { message: 'Minimize me and I will land in the taskbar below.' },
    });
  }

  protected saveLayout(): void {
    this.manager.saveLayout('demo');
  }

  protected restoreLayout(): void {
    this.manager.restoreLayout('demo');
  }

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

// Open a window with any component as its body.
const ref = manager.open(EditorComponent, {
  title: 'Untitled.md',
  size: 'lg',
  storage: { key: 'editor', prefix: 'my-app' },
});

const saved = await ref.afterClosed(); // resolves with whatever close(value) passed`,

    programmatic: `manager.open(EditorComponent, {
  title: 'Editor',
  size: 'md',
  modal: true,             // backdrop + focus trap + ESC close
  data: { docId: 42 },     // available via inject(WR_WINDOW_DATA)
});`,

    persist: `manager.open(EditorComponent, {
  title: 'Sticky position',
  storage: {
    key: 'editor',          // wr:window:my-app:editor
    prefix: 'my-app',
    persist: 'all',         // 'position' | 'size' | 'all'
  },
});`,

    taskbar: `<wr-window-taskbar />          <!-- bottom -->
<wr-window-taskbar position="top" />`,

    snap: `manager.open(EditorComponent, {
  title: 'Snappy',
  snap: 'all',  // drag to an edge to snap halves, corners for quarters
});`,

    workspace: `// snapshot every open window's geometry + state
manager.saveLayout('default');

// later — open the same set of windows yourself, then:
manager.restoreLayout('default');`,
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
    {
      name: 'chromeSize',
      description: 'Title bar density. `compact` shrinks the bar + action dots for utility / docked panels.',
      type: "'normal' | 'compact'",
      default: "'normal'",
    },
    {
      name: 'snap',
      description: 'Drag-to-edge snap regions — `edges` (halves + maximise) or `all` (also corners).',
      type: "'none' | 'edges' | 'all'",
      default: "'none'",
    },
    {
      name: 'animations',
      description: 'Open-fade + minimize/maximize transitions. Auto-disabled by `prefers-reduced-motion`.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'dragHandle',
      description: 'CSS selector restricting the move-grab area inside the title bar.',
      type: 'string | null',
      default: 'null',
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
      description:
        'Singleton service — opens windows, owns the z-index stack, tracks minimized windows, saves layouts.',
      type: 'service',
      default: '—',
    },
    {
      name: 'open(component, config?)',
      sub: true,
      description: 'Open a window with `component` as its body. Returns a `WrWindowRef` you can drive imperatively.',
      type: '<C, R>(c, cfg?) => WrWindowRef<C, R>',
      default: '—',
    },
    {
      name: 'closeAll()',
      sub: true,
      description: 'Close every programmatically-opened window.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'windows',
      sub: true,
      description: 'Signal of every currently-open programmatic window.',
      type: 'Signal<readonly WrWindowRef[]>',
      default: '—',
    },
    {
      name: 'minimized',
      sub: true,
      description: 'Signal of minimized windows opted into the taskbar — drives `<wr-window-taskbar>`.',
      type: 'Signal<readonly WrWindowRef[]>',
      default: '—',
    },
    {
      name: 'bringToFront()',
      sub: true,
      description: 'Reserve the next strictly-increasing z-index. Windows call this on focus.',
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
    {
      name: 'clearPersistedPosition(storage)',
      sub: true,
      description: 'Drop the saved geometry for a window so the next open uses config defaults.',
      type: '(cfg: WrWindowStorageConfig) => void',
      default: '—',
    },
    {
      name: 'saveLayout(name)',
      sub: true,
      description: "Persist every open window's geometry + state under `name`.",
      type: '(name: string) => void',
      default: '—',
    },
    {
      name: 'restoreLayout(name)',
      sub: true,
      description: 'Apply a saved workspace to currently-open windows (match by `id`). Re-open the windows first.',
      type: '(name: string) => void',
      default: '—',
    },
    {
      name: 'clearLayout(name)',
      sub: true,
      description: 'Drop a saved workspace.',
      type: '(name: string) => void',
      default: '—',
    },
  ];

  protected readonly refApi: readonly DocApiRow[] = [
    {
      name: 'WrWindowRef',
      description: 'Handle returned by `manager.open()`. Drive the window imperatively, await its result.',
      type: 'class',
      default: '—',
    },
    {
      name: 'id',
      sub: true,
      description: 'Stable id (from `config.id` or auto-generated).',
      type: 'string',
      default: '—',
    },
    { name: 'componentInstance', sub: true, description: 'The projected component instance.', type: 'C', default: '—' },
    {
      name: 'state / x / y / width / height / z / title',
      sub: true,
      description: 'Live geometry + state signals.',
      type: 'Signal<…>',
      default: '—',
    },
    {
      name: 'close(result?)',
      sub: true,
      description: 'Closes the window, running `beforeClose` if registered.',
      type: '(result?: R) => Promise<void>',
      default: '—',
    },
    {
      name: 'afterClosed()',
      sub: true,
      description: 'Resolves with the close result.',
      type: '() => Promise<R | undefined>',
      default: '—',
    },
    {
      name: 'beforeClose(hook)',
      sub: true,
      description: 'Register a guard — return falsy to veto a close.',
      type: '(hook) => void',
      default: '—',
    },
    {
      name: 'minimize() / maximize() / restore() / focus()',
      sub: true,
      description: 'Lifecycle controls.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'moveTo(x, y) / resizeTo(w, h) / center()',
      sub: true,
      description: 'Programmatic geometry.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'setTitle(title)',
      sub: true,
      description: 'Update the chrome title.',
      type: '(title: string) => void',
      default: '—',
    },
  ];

  protected toggleStacked(i: number): void {
    const next = [...this.stackedOpen()];
    next[i] = !next[i];
    this.stackedOpen.set(next);
  }
}
