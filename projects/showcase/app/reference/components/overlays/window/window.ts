import { Component, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrWindowManager, WrWindowTaskbar } from 'ngwr/window';

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
    WrWindowTaskbar,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class WindowPageComponent {
  protected readonly lastProgrammaticResult = signal<string | null>(null);

  private readonly manager = inject(WrWindowManager);

  protected async openBasic(): Promise<void> {
    const ref = this.manager.open<WindowDemoBodyComponent, string, { message: string }>(WindowDemoBodyComponent, {
      title: 'Programmatic window',
      size: 'md',
      data: { message: 'I was opened via WrWindowManager.open().' },
    });
    const result = await ref.afterClosed();
    this.lastProgrammaticResult.set(result ?? 'closed');
  }

  protected openSnap(): void {
    this.manager.open(WindowDemoBodyComponent, {
      title: 'Snappy',
      size: 'md',
      snap: 'all',
      data: { message: 'Drag me to any viewport edge or corner to snap.' },
    });
  }

  protected openCompact(): void {
    this.manager.open(WindowDemoBodyComponent, {
      title: 'Compact',
      size: 'sm',
      chromeSize: 'sm',
      data: { message: 'Tight title bar — good for utility panels.' },
    });
  }

  protected openOs(os: 'auto' | 'macos' | 'windows' | 'linux'): void {
    this.manager.open(WindowDemoBodyComponent, {
      title: os === 'auto' ? 'Auto (detected)' : `${os}-style chrome`,
      size: 'md',
      os,
      data: {
        message:
          os === 'auto'
            ? "config.os: 'auto' reads your browser to pick macos / windows / linux."
            : `Rendered with the ${os} chrome preset.`,
      },
    });
  }

  protected openPersisted(): void {
    this.manager.open(WindowDemoBodyComponent, {
      title: 'Sticky position',
      id: 'docs.persisted',
      size: 'md',
      storage: { key: 'docs.persisted', prefix: 'ngwr-showcase', persist: 'all' },
      data: { message: 'Move/resize me, close, open again — same geometry.' },
    });
  }

  protected openTaskbarDemo(title: string): void {
    this.manager.open(WindowDemoBodyComponent, {
      title,
      id: `docs.taskbar.${title}`,
      size: 'sm',
      // Explicit, because this demo is ABOUT the taskbar and the Linux chrome is
      // close-only by default — without it the section tells a Linux reader to
      // press a button their window does not have.
      showMinimize: true,
      data: { message: 'Minimize me and I will land in the taskbar at the bottom of the page.' },
    });
  }

  protected saveLayout(): void {
    this.manager.saveLayout('demo');
  }

  protected restoreLayout(): void {
    // Provide an opener so windows that aren't currently mounted get
    // re-created. Match the same id scheme the taskbar demo uses.
    this.manager.restoreLayout('demo', (id, snap) => {
      if (id.startsWith('docs.taskbar.')) {
        const title = snap.title || id.replace('docs.taskbar.', '');
        this.openTaskbarDemo(title);
      }
    });
  }

  protected closeAll(): void {
    this.manager.closeAll();
  }

  protected readonly snippets = {
    install: `import { WrWindowManager, WrWindowTaskbar } from 'ngwr/window';

@Component({
  imports: [WrWindowTaskbar],
  template: '<wr-window-taskbar />',
})
export class AppRoot {
  private readonly windows = inject(WrWindowManager);

  open(): void {
    this.windows.open(EditorComponent, { title: 'Editor' });
  }
}`,

    basic: `const ref = manager.open(EditorComponent, {
  title: 'Untitled.md',
  size: 'md',
  id: 'editor', // the same id reuses the open window
});

const result = await ref.afterClosed();`,

    os: `manager.open(EditorComponent, { os: 'macos' }); // 'auto' | 'macos' | 'windows' | 'linux'`,

    persist: `manager.open(EditorComponent, {
  id: 'editor',
  storage: {
    key: 'editor',
    prefix: 'my-app',
    persist: 'all', // 'position' | 'size' | 'all'
  },
});

// Forget the saved geometry:
manager.clearPersistedPosition({ key: 'editor', prefix: 'my-app' });`,

    snap: `manager.open(EditorComponent, { snap: 'all' });`,

    taskbar: `<wr-window-taskbar />
<wr-window-taskbar position="top" />`,

    workspace: `manager.saveLayout('default');

// The callback re-opens windows that are closed.
manager.restoreLayout('default', (id, snap) => {
  if (id.startsWith('editor:')) {
    manager.open(EditorComponent, { id, title: snap.title });
  } else if (id === 'settings') {
    manager.open(SettingsComponent, { id, title: snap.title });
  }
});

manager.clearLayout('default');`,

    focus: `// Opened in the background: focus stays where it is.
manager.open(LogComponent, { title: 'Build log', autoFocus: false });`,

    refInside: `const ref = inject<WrWindowRef<MyComponent, MyResult>>(WR_WINDOW_REF);
const data = inject<MyData>(WR_WINDOW_DATA);

ref.beforeClose(async () => {
  if (!isDirty) return true;
  return await confirmDiscard();
});

ref.setTitle(\`\${docName} — \${isDirty ? 'unsaved' : 'saved'}\`);

await save();
ref.close(savedDocId);`,
  };

  protected readonly configApi: readonly DocApiRow[] = [
    {
      name: 'WrWindowConfig',
      description: 'Options for `WrWindowManager.open(component, config)`.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'id',
      sub: true,
      description: 'Stable identifier — used by the taskbar and workspace save. Auto-generated when omitted.',
      type: 'string',
      default: 'auto',
    },
    { name: 'title', sub: true, description: 'Chrome title text.', type: 'string', default: "''" },
    {
      name: 'os',
      sub: true,
      description: "OS chrome preset. `'auto'` follows the user's platform.",
      type: "'auto' | 'macos' | 'windows' | 'linux'",
      default: "'auto'",
    },
    {
      name: 'size',
      sub: true,
      description: 'Initial size preset. Overridden by `width` / `height` when provided.',
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
    },
    {
      name: 'chromeSize',
      sub: true,
      description: 'Title-bar size.',
      type: "'sm' | 'md'",
      default: "'md'",
    },
    {
      name: 'initialX / initialY / initialWidth / initialHeight',
      sub: true,
      description: 'Opening geometry in px, read once at open. Unset uses the cascade.',
      type: 'number | null',
      default: 'null (cascade)',
    },
    {
      name: '(closed)',
      sub: true,
      description: 'The window was dismissed — by its own ✕, by `close()`, or by the service.',
      type: 'void',
      default: '—',
    },
    {
      name: '(moved)',
      sub: true,
      description:
        'Fires once when a header drag ends, with the final position. Silent for `moveTo()`, `center()` and the opening cascade.',
      type: '{ x: number; y: number }',
      default: '—',
    },
    {
      name: '(resized)',
      sub: true,
      description: 'Fires once when a resize or an edge snap ends, with the final size. Silent for `resizeTo()`.',
      type: '{ width: number; height: number }',
      default: '—',
    },
    {
      name: 'minWidth / minHeight / maxWidth / maxHeight',
      sub: true,
      description: 'Resize bounds.',
      type: 'number',
      default: '220 / 140 / ∞ / ∞',
    },
    {
      name: 'movable / resizable / keepInViewport',
      sub: true,
      description: 'Drag, resize, viewport-clamp toggles.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'snap',
      sub: true,
      description: 'Drag-to-edge snap — `edges` (halves + maximise) or `all` (also corners).',
      type: "'none' | 'edges' | 'all'",
      default: "'none'",
    },
    {
      name: 'showMinimize / showMaximize',
      sub: true,
      description: 'Show that chrome action. By default every OS but Linux shows both.',
      type: 'boolean',
      default: 'per-OS',
    },
    {
      name: 'showClose',
      sub: true,
      description: 'Show the close action.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'closeOnEscape',
      sub: true,
      description: 'Close when the ESC key is pressed.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'autoFocus',
      sub: true,
      description: 'Move focus into the window on open. Windows `restoreLayout()` reopens default to `false`.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'taskbar',
      sub: true,
      description: 'Show in `<wr-window-taskbar>` when minimized.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'animations',
      sub: true,
      description: 'Open and state transitions. Off under `prefers-reduced-motion`.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'dragHandle',
      sub: true,
      description: 'CSS selector inside the projected content that restricts the move-grab area.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: 'storage',
      sub: true,
      description: '`{ key, prefix?, persist? }` — auto-save geometry to `WrStorage`, hydrate on next open.',
      type: 'WrWindowStorageConfig',
      default: '—',
    },
    {
      name: 'panelClass',
      sub: true,
      description: 'Extra classes on the overlay pane. The chrome is `.wr-window` inside it.',
      type: 'WrClassInput',
      default: '—',
    },
    {
      name: 'data',
      sub: true,
      description: 'Arbitrary payload — read it inside the projected component via `inject(WR_WINDOW_DATA)`.',
      type: 'D',
      default: 'null',
    },
  ];

  protected readonly managerApi: readonly DocApiRow[] = [
    {
      name: 'WrWindowManager',
      description: 'Opens windows and owns the stack, the taskbar list and saved layouts.',
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
      description: 'Close every currently-open window.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'findById(id)',
      sub: true,
      description: 'Look up an open window by its `config.id` — `null` when no match.',
      type: '(id: string) => WrWindowRef | null',
      default: '—',
    },
    {
      name: 'windows',
      sub: true,
      description: 'Signal of every currently-open window.',
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
      name: 'readLayout(name)',
      description: 'Read a saved layout without applying it. `null` when none is saved.',
      type: '(name: string) => readonly WrWindowLayoutSnapshot[] | null',
      default: '—',
    },
    {
      name: 'restoreLayout(name, open?)',
      sub: true,
      description: 'Apply a saved layout by `id`. The `open` callback re-creates windows that are closed.',
      type: '(name, open?: (id, snap) => void) => void',
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
}
