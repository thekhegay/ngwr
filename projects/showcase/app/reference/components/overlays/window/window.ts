import { Component, type TemplateRef, type WritableSignal, inject, signal, viewChild } from '@angular/core';

import { WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import {
  type WrWindowRef,
  type WrWindowSlotContext,
  type WrWindowSnapTarget,
  type WrWindowTaskbarShow,
  WrWindowManager,
  WrWindowTaskbar,
} from 'ngwr/window';

import WindowDemoBodyComponent from './window-demo-body';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

type DemoRef = WrWindowRef<WindowDemoBodyComponent, string>;

@Component({
  selector: 'ngwr-window-page',
  templateUrl: './window.html',
  imports: [
    WrButton,
    WrSegmented,
    WrTag,
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

  /** What the page's own taskbar lists — the Taskbar section switches it. */
  protected readonly taskbarShow = signal<WrWindowTaskbarShow>('minimized');
  protected readonly taskbarShowOptions: readonly WrSegmentedOption<WrWindowTaskbarShow>[] = [
    { value: 'minimized', label: 'Minimized' },
    { value: 'all', label: 'All' },
  ];
  /** How many tabs the page's taskbar shows before it folds the rest; 0 leaves it to the width. */
  protected readonly taskbarMax = signal(0);
  protected readonly taskbarMaxOptions: readonly WrSegmentedOption<number>[] = [
    { value: 0, label: 'Fit the width' },
    { value: 3, label: 'At most 3' },
  ];

  /** The window each interactive section drives, while it is open. */
  protected readonly keyboardRef = signal<DemoRef | null>(null);
  protected readonly snapRef = signal<DemoRef | null>(null);
  protected readonly lockRef = signal<DemoRef | null>(null);
  protected readonly locked = signal(false);

  protected readonly manager = inject(WrWindowManager);

  private readonly titleBadge = viewChild.required<TemplateRef<WrWindowSlotContext>>('titleBadge');
  private readonly statusLine = viewChild.required<TemplateRef<WrWindowSlotContext>>('statusLine');

  /** Open a demo window and keep its ref in `slot` until it closes. */
  protected openDemo(
    config: Parameters<WrWindowManager['open']>[1] & { readonly message: string },
    slot?: WritableSignal<DemoRef | null>
  ): DemoRef {
    const { message, ...rest } = config;
    const ref = this.manager.open<WindowDemoBodyComponent, string, { message: string }>(WindowDemoBodyComponent, {
      size: 'md',
      ...rest,
      data: { message },
    });
    if (slot) {
      slot.set(ref);
      void ref.afterClosed().then(() => {
        if (slot() === ref) slot.set(null);
      });
    }
    return ref;
  }

  protected async openBasic(): Promise<void> {
    const ref = this.openDemo({ title: 'Programmatic window', message: 'I was opened via WrWindowManager.open().' });
    const result = await ref.afterClosed();
    this.lastProgrammaticResult.set(result ?? 'closed');
  }

  protected openCompact(): void {
    this.openDemo({
      title: 'Compact',
      size: 'sm',
      chromeSize: 'sm',
      message: 'Tight title bar — good for utility panels.',
    });
  }

  protected openOs(os: 'auto' | 'macos' | 'windows' | 'linux'): void {
    this.openDemo({
      title: os === 'auto' ? 'Auto (detected)' : `${os}-style chrome`,
      os,
      message:
        os === 'auto'
          ? "config.os: 'auto' reads your browser to pick macos / windows / linux."
          : `Rendered with the ${os} chrome preset.`,
    });
  }

  protected openActive(title: string): void {
    this.openDemo({
      title,
      id: `docs.active.${title}`,
      message: 'Click another window, or Tab into it: it becomes the active one.',
    });
  }

  protected openKeyboard(): void {
    this.openDemo(
      {
        title: 'Keyboard',
        id: 'docs.keyboard',
        message: 'Press Alt+F7 to move me or Alt+F8 to resize me, then the arrow keys, Enter or Escape.',
      },
      this.keyboardRef
    );
  }

  protected openSnap(): void {
    this.openDemo(
      {
        title: 'Snappy',
        id: 'docs.snap',
        snap: 'all',
        message: 'Drag me to an edge or a corner, or use the buttons. Drag a snapped window to get its size back.',
      },
      this.snapRef
    );
  }

  protected snapTo(target: WrWindowSnapTarget | null): void {
    const ref =
      this.snapRef() ?? this.openDemo({ title: 'Snappy', id: 'docs.snap', snap: 'all', message: '' }, this.snapRef);
    ref.snapTo(target);
  }

  protected openBounded(): void {
    // The site header stays visible: the work area starts under it.
    const header = document.querySelector('ngwr-header')?.getBoundingClientRect().bottom ?? 0;
    this.openDemo({
      title: 'Below the header',
      id: 'docs.bounds',
      snap: 'all',
      bounds: { top: Math.round(header) },
      message: 'Maximize me or snap me: I stop at the site header, and above the taskbar when it shows tabs.',
    });
  }

  protected openTaskbarDemo(title: string): void {
    this.openDemo({
      title,
      id: `docs.taskbar.${title}`,
      size: 'sm',
      // Explicit, because this demo is ABOUT the taskbar and the Linux chrome is
      // close-only by default — without it the section tells a Linux reader to
      // press a button their window does not have.
      showMinimize: true,
      message: 'Minimize me and I will land in the taskbar at the bottom of the page.',
    });
  }

  /** Enough windows to fold the rail on a phone, and past three anywhere. */
  protected openManyTaskbarDemos(): void {
    for (const title of ['Notes', 'Calendar', 'Mail', 'Music', 'Photos', 'Terminal']) this.openTaskbarDemo(title);
  }

  protected openSlots(): void {
    this.openDemo({
      title: 'Report.md',
      id: 'docs.slots',
      titleExtra: this.titleBadge(),
      statusBar: this.statusLine(),
      message: 'The badge in my title bar and the line under my body are templates passed in the config.',
    });
  }

  protected openLockable(): void {
    this.locked.set(false);
    this.openDemo(
      { title: 'Upload', id: 'docs.lock', message: 'Lock me from the page while a task runs.' },
      this.lockRef
    );
  }

  protected toggleLock(): void {
    const ref = this.lockRef();
    if (!ref) return;
    const locked = !this.locked();
    this.locked.set(locked);
    ref.update({
      title: locked ? 'Uploading…' : 'Upload',
      movable: !locked,
      resizable: !locked,
      showClose: !locked,
      closeOnEscape: !locked,
    });
  }

  protected openMany(): void {
    for (const title of ['Inbox', 'Editor', 'Logs', 'Preview']) {
      this.openDemo({ title, id: `docs.arrange.${title}`, size: 'sm', autoFocus: false, message: title });
    }
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

    active: `manager.active(); // the window with the keyboard, or null
ref.isActive();
ref.activate(); // back from the taskbar, raised, focused

// Ctrl+F6 steps through the windows, with ngwr/hotkey
inject(WrHotkey).bind('ctrl+f6', () => manager.activateNext());`,

    keyboard: `// Alt+F7 / Alt+F8 work on every window. Offer it from a menu too:
ref.startMove();
ref.startResize();

manager.open(EditorComponent, { keyboardStep: 20 }); // keyboard: false turns it off`,

    snap: `manager.open(EditorComponent, { snap: 'all' });

ref.snapTo('left'); // 'right' | 'top' | 'top-left' | … | null
ref.snap(); // 'left'`,

    bounds: `manager.open(EditorComponent, { bounds: { top: 64 } }); // an app header
manager.open(EditorComponent, { bounds: deskElement });  // a desktop in a panel

// App-wide:
provideWr(withWindows({ bounds: { top: 64 } }));`,

    taskbar: `<wr-window-taskbar />
<wr-window-taskbar show="all" />
<wr-window-taskbar position="top" />
<wr-window-taskbar show="all" [maxTabs]="5" />`,

    arrange: `manager.cascade();
manager.tile(); // 'grid' | 'columns' | 'rows'
manager.minimizeAll();
manager.restoreAll();`,

    slots: `<ng-template #badge let-ref>
  <wr-tag color="warning">Draft</wr-tag>
</ng-template>

manager.open(EditorComponent, {
  titleExtra: this.badge(),
  statusBar: StatusBarComponent, // a component can inject WR_WINDOW_REF
});`,

    update: `ref.update({ movable: false, resizable: false, showClose: false, title: 'Uploading…' });
await upload();
ref.update({ movable: true, resizable: true, showClose: true, title: 'Upload' });`,

    events: `ref.closed.subscribe(result => …);    // once, then completes
ref.moved.subscribe(({ x, y }) => …);   // a drag or a keyboard move ended
ref.resized.subscribe(({ width, height }) => …);
ref.stateChanges.subscribe(state => …); // 'normal' | 'minimized' | 'maximized'

const result = await ref.awaitClose();`,

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
      description:
        'Stable identifier. A second `open()` with an open id switches to that window. Generated when omitted.',
      type: 'string',
      default: 'auto',
    },
    {
      name: 'title',
      sub: true,
      description: 'Title-bar text and accessible name. Empty shows the catalog’s "Untitled".',
      type: 'string',
      default: "''",
    },
    {
      name: 'os',
      sub: true,
      description: "Chrome style. `'auto'` follows the visitor's platform.",
      type: 'WrWindowOs',
      default: "'auto'",
    },
    {
      name: 'size',
      sub: true,
      description: 'Opening size preset: 320×200, 480×320, 720×480. `width` / `height` win.',
      type: 'WrWindowSize',
      default: "'md'",
    },
    { name: 'chromeSize', sub: true, description: 'Title-bar density.', type: 'WrWindowChromeSize', default: "'md'" },
    {
      name: 'x / y',
      sub: true,
      description: 'Opening position in viewport px. Omit to cascade from the work area’s start edge.',
      type: 'number',
      default: 'cascade',
    },
    {
      name: 'width / height',
      sub: true,
      description: 'Opening size in px, capped at the work area while `keepInViewport`.',
      type: 'number',
      default: 'from size',
    },
    {
      name: 'minWidth / minHeight / maxWidth / maxHeight',
      sub: true,
      description: 'Bounds for dragging, snapping, maximizing and opening.',
      type: 'number',
      default: '220 / 140 / ∞ / ∞',
    },
    {
      name: 'movable / resizable',
      sub: true,
      description: 'Allow moving and resizing, by pointer and from the keyboard.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'keepInViewport',
      sub: true,
      description: 'Keep the window reachable inside the work area, and open it wholly inside when it fits.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'bounds',
      sub: true,
      description: 'The work area: the viewport, insets from its edges, or an element.',
      type: "'viewport' | WrWindowInsets | HTMLElement | ElementRef",
      default: "'viewport'",
    },
    {
      name: 'snap',
      sub: true,
      description: 'Drag-to-edge snap — `edges` (halves + maximize) or `all` (also corners).',
      type: 'WrWindowSnap',
      default: "'none'",
    },
    {
      name: 'restoreOnDrag',
      sub: true,
      description: 'Dragging a maximized or snapped window restores its own size under the pointer.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'keyboard',
      sub: true,
      description: 'Alt+F7 / Alt+F8 keyboard move and resize.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'keyboardStep',
      sub: true,
      description: 'Pixels per arrow key. Shift steps 1px.',
      type: 'number',
      default: '10',
    },
    {
      name: 'showMinimize',
      sub: true,
      description: 'Show minimize. By default every OS but Linux.',
      type: 'boolean',
      default: 'per-OS',
    },
    {
      name: 'showMaximize',
      sub: true,
      description: 'Show maximize. By default every OS but Linux.',
      type: 'boolean',
      default: 'per-OS',
    },
    { name: 'showClose', sub: true, description: 'Show close.', type: 'boolean', default: 'true' },
    {
      name: 'closeOnEscape',
      sub: true,
      description: 'Close on Escape, from inside the window, or from nowhere while it is the active one.',
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
      description: 'List the window in `<wr-window-taskbar>`.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'titleExtra / statusBar',
      sub: true,
      description: 'Content for the title bar and a status bar. A template gets the ref as `$implicit`.',
      type: 'WrWindowSlotContent',
      default: '—',
    },
    {
      name: 'animations',
      sub: true,
      description: 'The window’s own open animation. Off under `prefers-reduced-motion`; the body is never touched.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'dragHandle',
      sub: true,
      description:
        'Selector for the parts that move the window, in the body or the title bar. Replaces the title bar as the grab area; a double-click on a match maximizes.',
      type: 'string',
      default: '—',
    },
    {
      name: 'storage',
      sub: true,
      description: '`{ key, prefix?, persist? }` — save the geometry to `WrStorage` and open there next time.',
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
      description: 'Payload for the body, read with `inject(WR_WINDOW_DATA)`.',
      type: 'D',
      default: '—',
    },
  ];

  protected readonly managerApi: readonly DocApiRow[] = [
    {
      name: 'WrWindowManager',
      description: 'Opens windows and owns the stack, the active window, the taskbar list and saved layouts.',
      type: 'service',
      default: '—',
    },
    {
      name: 'open(component, config?)',
      sub: true,
      description: 'Open a window with `component` as its body.',
      type: '<C, R, D>(component: ComponentType<C>, config?: WrWindowConfig<D>) => WrWindowRef<C, R>',
      default: '—',
    },
    {
      name: 'windows',
      sub: true,
      description: 'Every open window, in the order they opened.',
      type: 'Signal<readonly WrWindowRef[]>',
      default: '—',
    },
    {
      name: 'active',
      sub: true,
      description: 'The window with the keyboard, or `null`.',
      type: 'Signal<WrWindowRef | null>',
      default: '—',
    },
    {
      name: 'minimized',
      sub: true,
      description: 'Minimized windows the taskbar lists.',
      type: 'Signal<readonly WrWindowRef[]>',
      default: '—',
    },
    {
      name: 'findById(id)',
      sub: true,
      description: 'An open window by its `config.id`, or `null`.',
      type: '(id: string) => WrWindowRef | null',
      default: '—',
    },
    { name: 'closeAll()', sub: true, description: 'Close every open window.', type: '() => void', default: '—' },
    {
      name: 'activateNext() / activatePrevious()',
      sub: true,
      description: 'Switch to the next or previous window, in open order.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'cascade()',
      sub: true,
      description: 'Stack the windows on screen from the work area’s corner.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'tile(mode?)',
      sub: true,
      description: 'Share the work area between the windows on screen.',
      type: "(mode?: 'grid' | 'columns' | 'rows') => void",
      default: "'grid'",
    },
    {
      name: 'minimizeAll() / restoreAll()',
      sub: true,
      description: 'Minimize every window on screen; bring every minimized one back.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'saveLayout(name)',
      sub: true,
      description: "Save every open window's geometry, state and snap under `name`.",
      type: '(name: string) => void',
      default: '—',
    },
    {
      name: 'readLayout(name)',
      sub: true,
      description: 'Read a saved layout without applying it. `null` when none is saved.',
      type: '(name: string) => readonly WrWindowLayoutSnapshot[] | null',
      default: '—',
    },
    {
      name: 'restoreLayout(name, open?)',
      sub: true,
      description: 'Apply a saved layout by `id`. The `open` callback re-creates windows that are closed.',
      type: '(name: string, open?: (id: string, snapshot: { title: string }) => void) => void',
      default: '—',
    },
    {
      name: 'clearLayout(name)',
      sub: true,
      description: 'Drop a saved layout.',
      type: '(name: string) => void',
      default: '—',
    },
    {
      name: 'clearPersistedPosition(storage)',
      sub: true,
      description: 'Drop the geometry a window saved through `storage`.',
      type: '(cfg: WrWindowStorageConfig) => void',
      default: '—',
    },
    {
      name: 'bringToFront()',
      sub: true,
      description: 'Reserve the next z-index above every window.',
      type: '() => number',
      default: '—',
    },
  ];

  protected readonly refApi: readonly DocApiRow[] = [
    {
      name: 'WrWindowRef',
      description: 'Handle returned by `manager.open()`. Right from the moment it is returned.',
      type: 'class',
      default: '—',
    },
    { name: 'id', sub: true, description: 'The `config.id`, or a generated one.', type: 'string', default: '—' },
    { name: 'componentInstance', sub: true, description: 'The body component.', type: 'C', default: '—' },
    {
      name: 'state / x / y / width / height / z / title',
      sub: true,
      description: 'Live state and the box on screen.',
      type: 'Signal<…>',
      default: '—',
    },
    {
      name: 'snap',
      sub: true,
      description: 'The half or quarter the window is snapped to.',
      type: 'Signal<WrWindowSnapTarget | null>',
      default: '—',
    },
    {
      name: 'isActive',
      sub: true,
      description: 'Whether this window has the keyboard.',
      type: 'Signal<boolean>',
      default: '—',
    },
    {
      name: 'closed',
      sub: true,
      description: 'The close result, once, then completes.',
      type: 'Observable<R | undefined>',
      default: '—',
    },
    {
      name: 'moved / resized',
      sub: true,
      description: 'Where a drag, a snap or a keyboard move left the window. Silent for calls from code.',
      type: 'Observable<{ x, y }> / Observable<{ width, height }>',
      default: '—',
    },
    {
      name: 'stateChanges',
      sub: true,
      description: 'Every state change.',
      type: 'Observable<WrWindowState>',
      default: '—',
    },
    {
      name: 'close(result?)',
      sub: true,
      description: 'Close the window, after `beforeClose` agrees.',
      type: '(result?: R) => Promise<void>',
      default: '—',
    },
    {
      name: 'afterClosed() / awaitClose()',
      sub: true,
      description: 'Resolves with the close result.',
      type: '() => Promise<R | undefined>',
      default: '—',
    },
    {
      name: 'beforeClose(hook)',
      sub: true,
      description: 'Register a guard — return falsy to veto a close.',
      type: '(hook: WrWindowBeforeCloseHook<R>) => void',
      default: '—',
    },
    {
      name: 'minimize() / maximize()',
      sub: true,
      description: 'Toggles. Leaving minimized returns to the state it was minimized from.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'restore()',
      sub: true,
      description: 'Back to normal at the window’s own geometry.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'activate()',
      sub: true,
      description: 'Switch to the window: un-minimize, raise, focus its last control.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'focus()',
      sub: true,
      description: 'Raise the window. Focus stays where it is.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'moveTo(x, y)',
      sub: true,
      description: 'Move the window. While maximized it moves where restore lands.',
      type: '(x: number, y: number) => void',
      default: '—',
    },
    {
      name: 'resizeTo(width, height)',
      sub: true,
      description: 'Resize the window, held to its bounds.',
      type: '(width: number, height: number) => void',
      default: '—',
    },
    { name: 'center()', sub: true, description: 'Center it in its work area.', type: '() => void', default: '—' },
    {
      name: 'snapTo(target)',
      sub: true,
      description: "Snap to a half or a quarter; `'top'` maximizes, `null` un-snaps.",
      type: '(target: WrWindowSnapTarget | null) => void',
      default: '—',
    },
    {
      name: 'startMove() / startResize()',
      sub: true,
      description: 'Keyboard move or resize, from a menu item or a button.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'update(patch)',
      sub: true,
      description: 'Change title, bounds and behaviour on an open window.',
      type: '(patch: WrWindowUpdate) => void',
      default: '—',
    },
    {
      name: 'setTitle(title)',
      sub: true,
      description: 'Update the title-bar text.',
      type: '(title: string) => void',
      default: '—',
    },
    {
      name: 'overlayRef',
      sub: true,
      description: 'The underlying CDK overlay.',
      type: 'OverlayRef',
      default: '—',
    },
  ];

  protected readonly taskbarApi: readonly DocApiRow[] = [
    { name: 'position', description: 'Edge the rail is pinned to.', type: "'top' | 'bottom'", default: "'bottom'" },
    {
      name: 'show',
      description: 'List the minimized windows, or every open one with the active one marked.',
      type: "'minimized' | 'all'",
      default: "'minimized'",
    },
    {
      name: 'maxTabs',
      description:
        'The most tabs the rail shows; the rest fold under a `+N` button. Tabs that do not fit the width fold too.',
      type: 'number | null',
      default: 'null',
    },
  ];

  protected readonly featureApi: readonly DocApiRow[] = [
    {
      name: 'withWindows(defaults)',
      description: 'App-wide window defaults for `provideWr()` — today the `bounds` every window keeps inside.',
      type: '(defaults: WrWindowDefaults) => WrFeature',
      default: '—',
    },
  ];
}
