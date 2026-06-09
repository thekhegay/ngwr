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

  protected openModal(): void {
    this.manager.open(WindowDemoBodyComponent, {
      title: 'Confirm action',
      size: 'md',
      modal: true,
      data: { message: 'Press ESC, click the backdrop, or use the button below.' },
    });
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
      chromeSize: 'compact',
      data: { message: 'Tight title bar — good for utility panels.' },
    });
  }

  protected openOs(os: 'macos' | 'windows' | 'linux'): void {
    this.manager.open(WindowDemoBodyComponent, {
      title: `${os}-style chrome`,
      size: 'md',
      os,
      data: { message: `Rendered with the ${os} chrome preset.` },
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
      data: { message: 'Minimize me and I will land in the taskbar at the bottom of the page.' },
    });
  }

  protected saveLayout(): void {
    this.manager.saveLayout('demo');
  }

  protected restoreLayout(): void {
    this.manager.restoreLayout('demo');
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
});

const result = await ref.afterClosed();`,

    modal: `manager.open(ConfirmComponent, {
  title: 'Confirm delete',
  modal: true,             // backdrop + focus trap + ESC close
  data: { count: selectedIds.length },
});`,

    os: `manager.open(EditorComponent, { os: 'macos',   title: 'macOS-style' });
manager.open(EditorComponent, { os: 'windows', title: 'Windows-style' });
manager.open(EditorComponent, { os: 'linux',   title: 'Linux-style' });`,

    persist: `manager.open(EditorComponent, {
  id: 'editor',                              // stable id used by workspace save
  storage: {
    key: 'editor',                           // wr:window:my-app:editor
    prefix: 'my-app',
    persist: 'all',                          // 'position' | 'size' | 'all'
  },
});

// Drop the persisted state when you need a fresh open:
manager.clearPersistedPosition({ key: 'editor', prefix: 'my-app' });`,

    snap: `manager.open(EditorComponent, {
  snap: 'all',  // drag to any edge to snap halves; corners give quarters
});`,

    taskbar: `<wr-window-taskbar />          <!-- bottom (default) -->
<wr-window-taskbar position="top" />`,

    workspace: `// snapshot every open window's geometry + state
manager.saveLayout('default');

// later — re-open the same set of components, then:
manager.restoreLayout('default');

// drop a snapshot
manager.clearLayout('default');`,

    refInside: `// Inside the projected component
const ref = inject<WrWindowRef<MyComponent, MyResult>>(WR_WINDOW_REF);
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
      description: 'OS chrome preset — side, glyphs, button look of the action cluster.',
      type: "'macos' | 'windows' | 'linux'",
      default: "'windows'",
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
      description: 'Title-bar density. `compact` shrinks the bar + action dots for utility panels.',
      type: "'normal' | 'compact'",
      default: "'normal'",
    },
    {
      name: 'x / y / width / height',
      sub: true,
      description: 'Explicit initial geometry in px.',
      type: 'number',
      default: 'cascade',
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
      name: 'showMinimize / showMaximize / showClose',
      sub: true,
      description: 'Render the corresponding chrome action.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'modal',
      sub: true,
      description: 'Render with a backdrop + focus trap + ESC close. Restores prior focus on close.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'closeOnBackdrop',
      sub: true,
      description: 'Close when the backdrop is clicked (modal mode only).',
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
      name: 'taskbar',
      sub: true,
      description: 'Show in `<wr-window-taskbar>` when minimized.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'animations',
      sub: true,
      description: 'Open-fade + state transitions. Auto-disabled by `prefers-reduced-motion`.',
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
      description:
        'Singleton service — the only entry point for `<wr-window>`. Owns the stack, taskbar list, and workspace save.',
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
}
