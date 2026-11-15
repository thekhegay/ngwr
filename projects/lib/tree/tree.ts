/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  PLATFORM_ID,
  PendingTasks,
  TemplateRef,
  ViewContainerRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormValueControl } from '@angular/forms/signals';

import { finalize, from, isObservable, take } from 'rxjs';

import { WrEmpty } from 'ngwr/empty';
import { useFormFieldAria } from 'ngwr/form';
import { useI18nFormatter, useI18nText, wrReadI18nText } from 'ngwr/i18n';
import { WR_OVERLAY, WrOutsideClick, wrFollowDirection } from 'ngwr/overlay';
import { WrMark } from 'ngwr/pipes';
import { WrSpinner } from 'ngwr/spinner';
import { WR_LIVE_LOCALE, wrToClassList, wrCheckStyles, wrTypeahead, type WrClassInput } from 'ngwr/utils';

import type {
  WrTreeCanDrop,
  WrTreeChildrenLoader,
  WrTreeFilterFn,
  WrTreeMoveEnd,
  WrTreeMoveEvent,
  WrTreeNode,
  WrTreeSelectionMode,
  WrTreeSize,
} from './types';

interface FlatNode<TId> {
  readonly node: WrTreeNode<TId>;
  readonly depth: number;
  readonly hasChildren: boolean;
  /** Absolute position in the flattened visible list. */
  readonly index: number;
  /** 1-based position within its sibling group (ARIA `aria-posinset`). */
  readonly posinset: number;
  /** Sibling count at this level (ARIA `aria-setsize`). */
  readonly setsize: number;
  /** `@for` key: the node id, or an object of its own for a status row. */
  readonly key: unknown;
  /** Set on the row standing for a branch's pending or failed load; `node` is that branch. */
  readonly status: 'loading' | 'error' | null;
  /** The node's own children are loading. */
  readonly busy: boolean;
}

/** What `loadChildren` answered for one node id. */
type LazyEntry<TId> =
  | { readonly status: 'loading' | 'error' }
  | { readonly status: 'loaded'; readonly children: readonly WrTreeNode<TId>[] };

type LazyMap<TId> = ReadonlyMap<TId, LazyEntry<TId>>;

/** A move in progress, by drag or by keyboard. `target` is where a drop would land now. */
interface MoveState<TId> {
  readonly node: WrTreeNode<TId>;
  readonly from: WrTreeMoveEnd<TId>;
  readonly keyboard: boolean;
  readonly target: WrTreeMoveEnd<TId> | null;
}

/** The row that carries the drop indicator, and how. */
interface DropMark {
  readonly row: number;
  readonly position: 'before' | 'after' | 'inside';
  readonly depth: number;
}

const NO_NODES: readonly never[] = [];

/** The keys a held row answers to. */
const MOVE_KEYS: ReadonlySet<string> = new Set([
  'Escape',
  'Enter',
  ' ',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);

/** How long a drag rests on a collapsed branch before it opens. */
const HOVER_EXPAND_MS = 700;

function isLazy<TId>(node: WrTreeNode<TId>): boolean {
  return node.children === undefined && node.hasChildren === true;
}

function childrenOf<TId>(node: WrTreeNode<TId>, lazy: LazyMap<TId>): readonly WrTreeNode<TId>[] {
  if (node.children) return node.children;
  const entry = lazy.get(node.id);
  return entry?.status === 'loaded' ? entry.children : NO_NODES;
}

function sameEnd<TId>(a: WrTreeMoveEnd<TId> | null, b: WrTreeMoveEnd<TId> | null): boolean {
  return a === b || (!!a && !!b && a.parentId === b.parentId && a.index === b.index);
}

interface SelectedChip<TId> {
  readonly id: TId;
  readonly label: string;
}

let panelUid = 0;

/**
 * Hierarchical tree. Data-driven — pass `[nodes]` with optional `children`
 * arrays. Supports single / multi selection (two-way `[(selected)]`),
 * controlled expand state (two-way `[(expanded)]`), and full keyboard
 * navigation.
 *
 * Two render shapes, picked by `[openOn]`:
 * - `'inline'` (default) — renders the tree list in-place. Use as a display
 *   widget or form-less hierarchical picker.
 * - `'overlay'` — renders a `<wr-select>`-style trigger button (with chips
 *   in multi mode) that opens a popover containing the tree. A signal-forms
 *   native control: it implements `FormValueControl<unknown>`, so `[formField]`
 *   binds straight to its `value` model — no `ControlValueAccessor` in between.
 *   `[(value)]` and classic `[(ngModel)]` / reactive forms all keep working via
 *   Angular's bridge. Replaces the standalone `<wr-tree-select>`.
 *
 * Value type in `overlay` mode: `TId | null` in single mode,
 * `readonly TId[]` in multi mode.
 *
 * @example
 * ```html
 * <!-- Inline tree (display widget) -->
 * <wr-tree [nodes]="folders" [(selected)]="picked" [(expanded)]="open" />
 *
 * <!-- Form-bound combobox (signal forms) -->
 * <wr-tree
 *   openOn="overlay"
 *   [nodes]="folders"
 *   selectionMode="single"
 *   [formField]="form.folder"
 *   placeholder="Pick a folder"
 * />
 *
 * <!-- standalone two-way binding -->
 * <wr-tree openOn="overlay" [nodes]="folders" [(value)]="picked" placeholder="Pick a folder" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/tree
 */
@Component({
  selector: 'wr-tree',
  templateUrl: './tree.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-tree',
    '[class]': 'classes()',
    // A static `draggable="true"` also lands on the host as the HTML attribute,
    // which would make the whole tree one native drag source.
    '[attr.draggable]': 'null',
    '(focusout)': 'onFocusOut($event)',
  },
  imports: [NgTemplateOutlet, WrEmpty, WrMark, WrSpinner],
})
export class WrTree<TId = string> implements FormValueControl<unknown> {
  /** Tree data. */
  readonly nodes = input<readonly WrTreeNode<TId>[]>([]);

  /** Selected node ids (two-way bindable). */
  readonly selected = model<readonly TId[]>([]);

  /** Expanded node ids (two-way bindable). */
  readonly expanded = model<readonly TId[]>([]);

  /**
   * Opens and closes a node by a click anywhere on its row, not only on the
   * arrow. In `selectionMode="single"` the click selects too. Under `cascade`
   * the checkbox is the way to check a branch, so a click elsewhere on its row
   * only opens it. A disabled node and a leaf behave as without it.
   * @default true
   */
  readonly expandOnClick = input(true, { transform: coerceBooleanProperty });

  /** Selection behavior. @default 'single' */
  readonly selectionMode = input<WrTreeSelectionMode>('single');

  /**
   * Disable the whole tree. Bound automatically from the field's disabled
   * state when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Refuse selection changes while the tree stays focusable and the value still
   * submits. Bound automatically from the field's readonly state when used with
   * `[formField]`.
   *
   * Expanding and collapsing keep working: a branch is NAVIGATION, not a value,
   * so a read-only tree is still browsable — it is picking and un-picking that
   * stops. In `overlay` mode the trigger additionally refuses to open, because
   * there the panel exists only to choose from and it already shows what is
   * chosen.
   *
   * `aria-readonly` rides on the combobox trigger only; role `tree` does not
   * support the state, so the inline shape has nothing valid to mirror it onto.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /** The surrounding `<wr-form-field>`'s error state. @internal */
  protected readonly fieldAria = useFormFieldAria();

  // Overlay-mode inputs (ignored when openOn='inline')

  /** Render shape. @default 'inline' */
  readonly openOn = input<'inline' | 'overlay'>('inline');

  /** Trigger size — shares the `--wr-control-*` contract. The panel keeps its size. @default 'md' */
  readonly size = input<WrTreeSize>('md');

  /** Placeholder shown on the trigger when no node is selected. */
  readonly placeholder = input<string>('');

  /**
   * The same fall-through `wr-select` has had all along: an unset placeholder
   * takes the catalog's `tree.placeholder`, so an overlay trigger with nothing
   * selected reads "Select…" in the app's language instead of rendering an
   * empty span. The key shipped in both catalogs and nothing read it.
   */
  protected readonly resolvedPlaceholder = useI18nText(this.placeholder, 'tree.placeholder', '');

  /**
   * Accessible name of the overlay trigger. Falls back to the placeholder, then
   * to `select.label` — a `role="combobox"` with nothing selected and no
   * placeholder otherwise has no name at all.
   *
   * An INLINE tree puts it on the `role="tree"` itself, which ARIA requires to
   * have a name — an `aria-label` on the `<wr-tree>` host never reaches it.
   * Inside a `<wr-form-field>` the field's label names the tree instead.
   */
  readonly ariaLabel = input<string | null>(null);

  private readonly labelText = useI18nText(this.ariaLabel, 'select.label', 'Select');
  protected readonly resolvedAriaLabel = computed(() => {
    // Not `??`: an empty placeholder must fall through to the catalog string.
    const explicit = this.ariaLabel();
    if (explicit) return explicit;
    const placeholder = this.resolvedPlaceholder();
    return placeholder ? placeholder : this.labelText();
  });

  /** Show a clear-all (×) button on the trigger when at least one node is selected. @default true */
  readonly clearable = input(true, { transform: coerceBooleanProperty });

  /**
   * Cap on the number of chips rendered on the trigger before
   * collapsing the rest into `+N more` (multi mode only). `0` = render
   * every chip. @default 0
   */
  readonly maxTagCount = input(0, {
    transform: (v: unknown): number => Math.max(0, Number(v) || 0),
  });

  /** Auto-expand every node that has children on first open of the overlay. @default false */
  readonly defaultExpandAll = input(false, { transform: coerceBooleanProperty });

  /**
   * Window the visible-node list so a large tree keeps only ~one viewport of
   * rows in the DOM. Opt-in and OFF by default — a tree without it renders
   * byte-identically to today. Works in both `inline` and `overlay` shapes;
   * while on, keyboard navigation switches to the `aria-activedescendant`
   * pattern so Arrow / Home / End / Enter keep working across un-rendered rows.
   * @default false
   */
  readonly virtualScroll = input(false, { transform: coerceBooleanProperty });

  /**
   * Uniform row height in px used to map scroll offset to node index. `0`
   * (default) measures the first rendered row once and reuses it, so it adapts
   * to the active density / touch target automatically. Read only when
   * `virtualScroll` is on. @default 0
   */
  readonly rowHeight = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /**
   * Height of the scroll viewport when `virtualScroll` is on — a number (px) or
   * any CSS length (`'60vh'`). A numeric px value lets the server prerender the
   * exact first window. @default 288
   */
  readonly viewportHeight = input<number | string>(288);

  /** Extra rows kept rendered above and below the viewport as scroll headroom. @default 6 */
  readonly overscan = input(6, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 6)) });

  /**
   * `openOn="overlay"` only: focus the cursor row when the panel opens (the
   * list itself in a virtual tree). Off, focus stays on the trigger:
   * ArrowDown, ArrowUp or Tab there move into the panel, and a letter jumps to
   * the row it starts.
   *
   * @default false
   */
  readonly autoFocus = input(false, { transform: coerceBooleanProperty });

  /**
   * Extra CSS classes for the overlay pane, when `openOn` puts the tree in one.
   *
   * The pane is appended to the overlay container, not to this component, so
   * nothing in the consumer's own template encloses it and no descendant rule
   * written around the trigger can reach it. This input is the only per-instance
   * handle on it. A space-separated string works as well as an array.
   *
   * Inline trees never open an overlay, so this input does nothing for the
   * default `openOn="inline"` — the host element is right there to take a
   * class of its own.
   */
  readonly panelClass = input<WrClassInput>(null);

  /**
   * Loads the children of a node that set `hasChildren` and left `children`
   * undefined. Runs once, on the first expand, and the answer is cached by node
   * id: the row shows a loading row meanwhile and an error row with a retry
   * when the loader fails. Accepts an array, a Promise or an Observable.
   * @default null
   */
  readonly loadChildren = input<WrTreeChildrenLoader<TId> | null>(null);

  /**
   * Filter text. While set, only matching nodes and their ancestors show, the
   * ancestors open to reveal the matches and the match is highlighted.
   * `[(expanded)]` is left alone, so clearing the text restores it. Children a
   * `loadChildren` has not fetched yet are not searched.
   * @default ''
   */
  readonly filter = input<string | null>('');

  /**
   * Decides whether a node matches `filter`. The default is a case-insensitive
   * substring of the label.
   * @default null
   */
  readonly filterFn = input<WrTreeFilterFn<TId> | null>(null);

  /**
   * Cascading checks, in `selectionMode="multi"` only. Every row draws a
   * checkbox and a click toggles it: checking a node checks its loaded,
   * enabled descendants, and an ancestor is checked exactly while all of its
   * enabled children are. An ancestor with only some of them checked announces
   * `aria-checked="mixed"`. The value holds EVERY checked node, parents and
   * leaves alike, never a mixed one. Rows announce `aria-checked` in place of
   * `aria-selected`.
   * @default false
   */
  readonly cascade = input(false, { transform: coerceBooleanProperty });

  /**
   * Lets rows be moved: dragged between rows to reorder, onto a row to become
   * its child. The keyboard twin is Alt+Enter to pick the row up, the arrows to
   * move it (up and down among siblings, toward the indent into the sibling
   * above, away from it out of the parent), Enter to drop and Escape to cancel.
   * The tree never writes to `nodes`: apply `nodeMove` yourself, with
   * `wrMoveTreeNode`. Off while a `filter` is set, and for rows that came from
   * `loadChildren`, which `nodes` does not hold.
   * @default false
   */
  readonly draggable = input(false, { transform: coerceBooleanProperty });

  /**
   * Refuses a drop, by drag and by keyboard alike. A node is never offered its
   * own subtree, so that case does not reach the predicate.
   * @default null
   */
  readonly canDrop = input<WrTreeCanDrop<TId> | null>(null);

  /** Fired once when a row is dropped somewhere new. The tree does not move it: the handler does. */
  readonly nodeMove = output<WrTreeMoveEvent<TId>>();

  /**
   * Form value — the current selection as seen by a bound field. Bound by
   * `[formField]`, or two-way via `[(value)]`. Shape follows `selectionMode`:
   * `TId | null` in single mode, `readonly TId[]` in multi mode. Works in both
   * `openOn` modes; `[(selected)]` stays the inline-native API and always
   * carries an array, whatever the selection mode.
   */
  readonly value = model<unknown>(undefined);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /** Fires after the overlay panel opens. */
  readonly opened = output<void>();

  /** Fires after the overlay panel closes. */
  readonly closed = output<void>();

  // Internals

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly outsideClick = inject(WrOutsideClick);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly pendingTasks = inject(PendingTasks);
  /**
   * Ambient reading direction. Optional so a bare `TestBed` — or a consumer who
   * never set a direction — needs no provider; `Directionality` is root-provided
   * anyway, and a missing one simply reads as `ltr`.
   *
   * Read at keystroke time rather than cached, so a runtime `dir` flip needs no
   * subscription to `change` — the overlay is the half that does, and
   * `wrFollowDirection` in `openOverlay()` is where that lives.
   */
  private readonly dir = inject(Directionality, { optional: true });
  private readonly liveLocale = inject(WR_LIVE_LOCALE, { optional: true });
  private readonly typeahead = wrTypeahead({ locale: () => this.liveLocale?.() });

  /** Currently focused row's index in the flattened visible list. */
  protected readonly focusedIndex = signal(0);

  /**
   * The node the cursor is on, written with {@link focusedIndex}. The index alone
   * names a SLOT: opening a branch above the cursor or collapsing one around it
   * moves every row below, and the tab stop then sat on whichever node took the
   * slot — the next arrow walked from a row the user had never been on.
   */
  private readonly cursorId = signal<{ readonly id: TId } | null>(null);

  /** What `loadChildren` has answered so far, by node id. */
  private readonly lazy = signal<LazyMap<TId>>(new Map());

  /**
   * Every node the tree knows, loaded children included: the node and its
   * parent by id, and which ids sit under a `loadChildren` answer. Those live
   * in this component's cache rather than in `nodes`, so a move cannot touch them.
   */
  private readonly lookup = computed(() => {
    const lazy = this.lazy();
    const byId = new Map<TId, WrTreeNode<TId>>();
    const parents = new Map<TId, TId>();
    const cached = new Set<TId>();
    const walk = (list: readonly WrTreeNode<TId>[], parent: WrTreeNode<TId> | null, inCache: boolean): void => {
      for (const n of list) {
        byId.set(n.id, n);
        if (parent !== null) parents.set(n.id, parent.id);
        if (inCache) cached.add(n.id);
        const children = childrenOf(n, lazy);
        if (children.length) walk(children, n, inCache || !n.children);
      }
    };
    walk(this.nodes(), null, false);
    return { byId, parents, cached };
  });

  /** Each node's parent id, so a cursor hidden by a collapse can climb to a visible row. */
  private readonly parentMap = computed<ReadonlyMap<TId, TId>>(() => this.lookup().parents);

  /**
   * The cursor as the DOM sees it: the row of the cursor's node, else its
   * nearest visible ancestor when a collapse hid it, else the raw index clamped
   * to the list that exists RIGHT NOW.
   *
   * The clamp is the last resort for a node that left the data altogether.
   * Nothing shrank the raw index when the list did: collapsing a branch above
   * the cursor left it past the end, which gave the tree zero rows with
   * `tabindex="0"` (no way back in with Tab) and made every arrow key a no-op,
   * because `onKeydown` bails when `flat[i]` is undefined.
   */
  protected readonly cursorIndex = computed(() => {
    const cursor = this.cursorId();
    if (cursor) {
      const rows = this.flatIndex();
      const parents = this.parentMap();
      for (let id: TId | undefined = cursor.id; id !== undefined; id = parents.get(id)) {
        const at = rows.get(id);
        if (at !== undefined) return at;
      }
    }
    return Math.min(this.focusedIndex(), Math.max(0, this.flat().length - 1));
  });

  /** Accessible name of the clear button. Falls back to `tree.clearSelection`, then `'Clear selection'`. */
  readonly clearSelectionLabel = input<string | null>(null);

  /** Accessible name of the toggle of a collapsed node. Falls back to `tree.expand`, then `'Expand'`. */
  readonly expandLabel = input<string | null>(null);

  /** Accessible name of the toggle of an expanded node. Falls back to `tree.collapse`, then `'Collapse'`. */
  readonly collapseLabel = input<string | null>(null);

  /** Text of the row shown while children load. Falls back to `select.loading`, then `'Loading…'`. */
  readonly loadingLabel = input<string | null>(null);

  /** Text of the row shown when `loadChildren` failed. Falls back to `loadState.failed`, then `'Could not load'`. */
  readonly loadErrorLabel = input<string | null>(null);

  /** Label of the retry button on that row. Falls back to `loadState.retry`, then `'Try again'`. */
  readonly retryLabel = input<string | null>(null);

  /** Shown in place of the rows when `filter` matches nothing. Falls back to `select.noResults`. */
  readonly noMatchesLabel = input<string | null>(null);

  /**
   * The keyboard move, as a screen reader hears it on entering a `draggable`
   * tree. Falls back to `tree.moveKeyHelp`.
   */
  readonly moveHelpLabel = input<string | null>(null);

  protected readonly resolvedLoadingLabel = useI18nText(this.loadingLabel, 'select.loading', 'Loading…');
  protected readonly resolvedLoadErrorLabel = useI18nText(this.loadErrorLabel, 'loadState.failed', 'Could not load');
  protected readonly resolvedNoMatchesLabel = useI18nText(this.noMatchesLabel, 'select.noResults', 'No results');
  protected readonly resolvedRetryLabel = useI18nText(this.retryLabel, 'loadState.retry', 'Try again');
  protected readonly resolvedMoveHelp = useI18nText(
    this.moveHelpLabel,
    'tree.moveKeyHelp',
    'Press Alt+Enter to pick this item up, then use the arrow keys to move it. ' +
      'Press Enter to drop it, or Escape to put it back.'
  );

  // The position announcements are the sortable list's: the same gesture, the same words.
  private readonly grabbedText = useI18nFormatter('sortableList.grabbed', 'Grabbed. {{index}} of {{total}}.');
  private readonly movedText = useI18nFormatter('sortableList.moved', '{{index}} of {{total}}.');
  private readonly droppedText = useI18nFormatter('sortableList.dropped', 'Dropped. {{index}} of {{total}}.');
  private readonly cancelledText = wrReadI18nText('sortableList.cancelled', 'Move cancelled.');

  /** Resolved ARIA labels — signals, so they follow both a late catalog and a locale switch. */
  protected readonly resolvedClearSelectionLabel = useI18nText(
    this.clearSelectionLabel,
    'tree.clearSelection',
    'Clear selection'
  );
  protected readonly resolvedExpandLabel = useI18nText(this.expandLabel, 'tree.expand', 'Expand');
  protected readonly resolvedCollapseLabel = useI18nText(this.collapseLabel, 'tree.collapse', 'Collapse');
  protected readonly chipRemoveLabel = useI18nFormatter('tree.removeItem', 'Remove {{label}}');

  /**
   * The overflow chip past `maxTagCount`. It was the literal `+{{ extra }} more`
   * in the template while `wr-select` — the same chip, the same string — read
   * `select.more` from the catalog, so a Russian tree rendered
   * `["Черновик", "+2 more"]`.
   */
  protected readonly chipMoreLabel = useI18nFormatter('tree.more', '+{{count}} more');

  /** The trimmed filter text; `''` means no filter. */
  protected readonly filterQuery = computed(() => (this.filter() ?? '').trim());

  /**
   * Under a filter: the nodes that show (a match, or an ancestor of one) and
   * the ancestors that open to reveal a match. `null` with no filter.
   */
  private readonly filterView = computed(() => {
    const query = this.filterQuery();
    if (!query) return null;
    const lazy = this.lazy();
    const custom = this.filterFn();
    const needle = query.toLowerCase();
    const matches = (node: WrTreeNode<TId>): boolean =>
      custom ? custom(node, query) : node.label.toLowerCase().includes(needle);
    const visible = new Set<TId>();
    const opened = new Set<TId>();
    const walk = (list: readonly WrTreeNode<TId>[]): boolean => {
      let any = false;
      for (const node of list) {
        const below = walk(childrenOf(node, lazy));
        if (below) opened.add(node.id);
        if (below || matches(node)) {
          visible.add(node.id);
          any = true;
        }
      }
      return any;
    };
    walk(this.nodes());
    return { visible, opened };
  });

  /**
   * What the user opened and closed while a filter was showing, kept apart
   * from `expanded` so that clearing the filter restores the tree they had.
   * It belongs to one filter text and is ignored under any other.
   */
  private readonly filterToggles = signal<{ readonly query: string; readonly open: ReadonlyMap<TId, boolean> }>({
    query: '',
    open: new Map(),
  });

  /** A status row's `@for` key, one object per branch, so it never collides with a node id. */
  private readonly statusKeys = new Map<TId, object>();

  /** The visible rows, and the lazy branches that are open with nothing loaded yet. */
  private readonly view = computed(() => {
    const expanded = this.expandedSet();
    const lazy = this.lazy();
    const visible = this.filterView()?.visible ?? null;
    const canLoad = this.loadChildren() !== null;
    const rows: FlatNode<TId>[] = [];
    const toLoad: WrTreeNode<TId>[] = [];
    const walk = (list: readonly WrTreeNode<TId>[], depth: number): void => {
      const shown = visible ? list.filter(n => visible.has(n.id)) : list;
      shown.forEach((node, i) => {
        const state = lazy.get(node.id)?.status;
        const unloaded = isLazy(node) && state !== 'loaded';
        const children = childrenOf(node, lazy);
        const hasChildren = unloaded || (visible ? children.some(c => visible.has(c.id)) : children.length > 0);
        rows.push({
          node,
          depth,
          hasChildren,
          index: rows.length,
          posinset: i + 1,
          setsize: shown.length,
          key: node.id,
          status: null,
          busy: state === 'loading',
        });
        if (!hasChildren || !expanded.has(node.id)) return;
        if (!unloaded) {
          walk(children, depth + 1);
          return;
        }
        const status = state === 'error' ? 'error' : canLoad ? 'loading' : null;
        if (!status) return;
        if (!state) toLoad.push(node);
        let key = this.statusKeys.get(node.id);
        if (!key) this.statusKeys.set(node.id, (key = {}));
        rows.push({
          node,
          depth: depth + 1,
          hasChildren: false,
          index: rows.length,
          posinset: 1,
          setsize: 1,
          key,
          status,
          busy: false,
        });
      });
    };
    walk(this.nodes(), 0);
    return { rows, toLoad };
  });

  /** Flattened list of currently visible nodes — what the template renders. */
  protected readonly flat = computed<readonly FlatNode<TId>[]>(() => this.view().rows);

  /** Each visible node's row, the first one when an id repeats. */
  private readonly flatIndex = computed<ReadonlyMap<TId, number>>(() => {
    const map = new Map<TId, number>();
    for (const row of this.flat()) if (!row.status && !map.has(row.node.id)) map.set(row.node.id, row.index);
    return map;
  });

  protected readonly selectedSet = computed(() => new Set(this.selected()));

  /**
   * The branches that are open right now. `expanded` alone with no filter; under
   * one, also every ancestor of a match, then whatever the user toggled since.
   */
  protected readonly expandedSet = computed(() => {
    const set = new Set(this.expanded());
    const view = this.filterView();
    if (!view) return set;
    for (const id of view.opened) set.add(id);
    const toggles = this.filterToggles();
    if (toggles.query !== this.filterQuery()) return set;
    for (const [id, open] of toggles.open) {
      if (open) set.add(id);
      else set.delete(id);
    }
    return set;
  });

  protected readonly isCascade = computed(() => this.cascade() && this.selectionMode() === 'multi');

  /** Cascade only: the nodes that are not checked themselves and have a checked node below them. */
  protected readonly mixedSet = computed<ReadonlySet<TId>>(() => {
    const mixed = new Set<TId>();
    if (!this.isCascade()) return mixed;
    const selected = this.selectedSet();
    const lazy = this.lazy();
    const walk = (list: readonly WrTreeNode<TId>[]): boolean => {
      let any = false;
      for (const node of list) {
        const below = walk(childrenOf(node, lazy));
        const own = selected.has(node.id);
        if (below && !own) mixed.add(node.id);
        if (below || own) any = true;
      }
      return any;
    };
    walk(this.nodes());
    return mixed;
  });

  protected readonly isOverlay = computed(() => this.openOn() === 'overlay');
  protected readonly isMulti = computed(() => this.selectionMode() === 'multi');
  protected readonly hasSelection = computed(() => this.selected().length > 0);

  /** Overlay-mode trigger label / chip map. */
  private readonly labelMap = computed<ReadonlyMap<TId, string>>(() => {
    const map = new Map<TId, string>();
    for (const [id, node] of this.lookup().byId) map.set(id, node.label);
    return map;
  });

  protected readonly selectedChips = computed<readonly SelectedChip<TId>[]>(() => {
    const map = this.labelMap();
    return this.selected().map<SelectedChip<TId>>(id => ({ id, label: map.get(id) ?? String(id) }));
  });

  protected readonly visibleChips = computed<readonly SelectedChip<TId>[]>(() => {
    const cap = this.maxTagCount();
    const chips = this.selectedChips();
    return cap > 0 && chips.length > cap ? chips.slice(0, cap) : chips;
  });

  protected readonly hiddenChipCount = computed(() => {
    const cap = this.maxTagCount();
    const total = this.selectedChips().length;
    return cap > 0 && total > cap ? total - cap : 0;
  });

  protected readonly singleLabel = computed<string | null>(() => {
    if (this.isMulti()) return null;
    const first = this.selected()[0];
    if (first == null) return null;
    return this.labelMap().get(first) ?? null;
  });

  private readonly openState = signal(false);

  /**
   * Whether the overlay panel is open. Read-only: `open()` and `close()` change it.
   * Only meaningful when `openOn='overlay'`.
   */
  readonly isOpen = this.openState.asReadonly();

  /** Trigger / panel id for `aria-controls`. */
  protected readonly panelId = `wr-tree-panel-${++panelUid}`;

  protected readonly classes = computed(() => {
    const parts: string[] = [];
    if (this.disabled()) parts.push('wr-tree--disabled');
    else if (this.readonly()) parts.push('wr-tree--readonly');
    if (this.isOverlay()) {
      parts.push('wr-tree--combobox');
      const size = this.size();
      if (size !== 'md') parts.push(`wr-tree--${size}`);
      if (this.isOpen()) parts.push('wr-tree--open');
      if (this.isMulti()) parts.push('wr-tree--multi');
    }
    return parts.join(' ');
  });

  protected readonly panelTpl = viewChild('panelTpl', { read: TemplateRef });

  private overlayRef: OverlayRef | null = null;

  // --- Virtual scroll -------------------------------------------------------

  private static readonly FALLBACK_ROW_PX = 32;
  private static readonly FALLBACK_VIEWPORT_PX = 288;

  /** Live vertical scroll offset (px); 0 on the server / before first scroll. */
  private readonly scrollTop = signal(0);
  /** Measured viewport clientHeight (px); 0 until the browser observer fires. */
  private readonly viewportPx = signal(0);
  /** Measured first-row height (px) when `rowHeight` is auto; 0 until measured. */
  private readonly measuredRowPx = signal(0);

  /** Virtualization active (opt-in and there is anything to window). */
  protected readonly virtualized = computed(() => this.virtualScroll() && this.flat().length > 0);

  /** Effective uniform row height (px). */
  protected readonly effRowH = computed(() =>
    this.rowHeight() > 0 ? this.rowHeight() : this.measuredRowPx() || WrTree.FALLBACK_ROW_PX
  );

  /** Deterministic viewport px for SSR + first paint (numeric height, else fallback). */
  private readonly fallbackViewportPx = computed(() => {
    const h = this.viewportHeight();
    if (typeof h === 'number') return h;
    return /^\d+$/.test(h) ? Number(h) : WrTree.FALLBACK_VIEWPORT_PX;
  });

  /** `viewportHeight` as a CSS length for the inline max-height (bare number → px). */
  protected readonly resolvedViewportHeight = computed(() => {
    const h = this.viewportHeight();
    return typeof h === 'number' || /^\d+$/.test(h) ? `${h}px` : h;
  });

  /** Rendered window [start,end) + spacer pads (px). Pure math from `scrollTop`. */
  protected readonly virtualWindow = computed<{ start: number; end: number; padTop: number; padBottom: number }>(() => {
    const total = this.flat().length;
    if (!this.virtualized() || total === 0) return { start: 0, end: total, padTop: 0, padBottom: 0 };
    const h = this.effRowH();
    const vp = this.viewportPx() || this.fallbackViewportPx();
    const over = this.overscan();
    // Clamp `first` so a transient effRowH shrink (auto-measure landing below the
    // fallback within one frame) can't push it past the list and slice to empty.
    const first = Math.min(Math.floor(this.scrollTop() / h), total - 1);
    // `+ 1` covers the partial row at the viewport's bottom edge even at overscan 0.
    const count = Math.ceil(vp / h) + 1;
    const start = Math.max(0, first - over);
    const end = Math.min(total, first + count + over);
    return { start, end, padTop: start * h, padBottom: (total - end) * h };
  });

  /** Nodes placed in the list. SAME array instance as `flat()` when off → byte-identical DOM. */
  protected readonly windowRows = computed<readonly FlatNode<TId>[]>(() => {
    if (!this.virtualized()) return this.flat();
    const { start, end } = this.virtualWindow();
    return this.flat().slice(start, end);
  });

  /** Stable id for a row at flat index `i` — the `aria-activedescendant` target. */
  protected rowId(i: number): string {
    return `${this.panelId}-row-${i}`;
  }

  /**
   * Active-descendant id when virtualized (focus stays on the list container),
   * else `null`. Returns `null` while the focused row is outside the rendered
   * window (e.g. mouse-wheeled away) so `aria-activedescendant` never dangles at
   * a removed element — the next arrow key scrolls it back and re-establishes it.
   */
  protected readonly activeRowId = computed(() => {
    if (!this.virtualized()) return null;
    const i = this.cursorIndex();
    const { start, end } = this.virtualWindow();
    return i >= start && i < end ? this.rowId(i) : null;
  });

  /** The scrollable `<ul>` — inside the overlay panel in overlay mode, else in the host. */
  private get listElement(): HTMLElement | null {
    const root = this.overlayRef?.overlayElement ?? this.host.nativeElement;
    return root.querySelector<HTMLElement>('.wr-tree__list');
  }

  /** Scroll flat index `i` just into view (sets the `scrollTop` signal synchronously). */
  private ensureVisible(i: number): void {
    const h = this.effRowH();
    const vp = this.viewportPx() || this.fallbackViewportPx();
    const top = i * h;
    const cur = this.scrollTop();
    let next = cur;
    if (top < cur) next = top;
    else if (top + h > cur + vp) next = top + h - vp;
    if (next !== cur) {
      this.scrollTop.set(next);
      this.listElement?.scrollTo({ top: next });
    }
  }

  /** Whether this OPEN has already auto-expanded; reset when the panel closes. */
  private didExpandAll = false;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('tree');
    // Drive the overlay open/close in response to the `open` signal.
    effect(() => {
      if (!this.isOverlay()) return;
      if (this.isOpen()) {
        this.openOverlay();
        // Once per OPEN, which is what the input documents. Reading `expanded()`
        // as part of the guard made it a dependency of this effect, so closing
        // the last branch re-ran it and inflated the tree again — collapsible one
        // branch at a time, never all the way.
        if (this.defaultExpandAll() && !this.didExpandAll) {
          this.didExpandAll = true;
          untracked(() => {
            if (this.expanded().length === 0) this.expanded.set(this.collectExpandableIds(this.nodes()));
          });
        }
      } else {
        this.didExpandAll = false;
        this.closeOverlay();
      }
    });

    // Disabling the control closes any open overlay (mirrors the side effect
    // of the old CVA setDisabledState).
    effect(() => {
      if (this.disabled() || this.readonly()) this.openState.set(false);
    });

    // Bridge an external `value` write back into the internal `selected`
    // state (this is the old writeValue body). `undefined` is the untouched
    // sentinel — no field / ngModel has written yet, so leave any preset
    // `[(selected)]` alone; a real `null` still clears, exactly as
    // `writeValue(null)` did. Guarded against the echo of our own `emit()`
    // (equality check under `untracked`) so a live pick is never clobbered.
    effect(() => {
      const value = this.value();
      if (value === undefined) return;
      untracked(() => {
        const next: readonly TId[] = this.isMulti()
          ? Array.isArray(value)
            ? (value as readonly TId[])
            : []
          : value == null
            ? []
            : [value as TId];
        const current = this.selected();
        if (next.length === current.length && next.every((id, i) => id === current[i])) return;
        this.selected.set(next);
      });
    });

    // Wire the scroll listener + viewport/row measurement — only while virtual
    // and in the browser. Re-runs when the list (re)appears (overlay open, data
    // change), deferring the DOM read to a microtask so the portal / inline list
    // is attached. No-op on the server (SSR renders the deterministic first
    // window from inputs alone).
    effect(onCleanup => {
      if (!isPlatformBrowser(this.platformId) || !this.virtualScroll()) return;
      const open = this.isOverlay() ? this.isOpen() : true;
      this.flat();
      if (!open) return;
      let raf = 0;
      let ro: ResizeObserver | null = null;
      let el: HTMLElement | null = null;
      // `onCleanup` can run BEFORE the microtask below — the effect re-runs, or
      // the component is destroyed, in the same task that scheduled it. It would
      // then tear down nothing (`el` and `ro` are still null) and the
      // continuation would go on to attach a scroll listener and a
      // `ResizeObserver` that nothing is left to remove.
      let cancelled = false;
      const onScroll = (): void => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (el) this.scrollTop.set(el.scrollTop);
        });
      };
      queueMicrotask(() => {
        if (cancelled) return;
        el = this.listElement;
        if (!el) return;
        // The overlay `<ul>` is destroyed + recreated on each open, but the
        // `scrollTop` signal persists — restore the fresh element to it so a
        // reopened panel isn't blank (window computed from a non-zero signal
        // while the new DOM sits at scrollTop 0). No-op on first open / inline.
        if (el.scrollTop !== this.scrollTop()) el.scrollTop = this.scrollTop();
        this.viewportPx.set(el.clientHeight);
        if (this.rowHeight() === 0) {
          const h = el.querySelector<HTMLElement>('.wr-tree__row')?.offsetHeight ?? 0;
          if (h > 0) this.measuredRowPx.set(h);
        }
        el.addEventListener('scroll', onScroll, { passive: true });
        if (typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(() => {
            if (el) this.viewportPx.set(el.clientHeight);
          });
          ro.observe(el);
        }
      });
      onCleanup(() => {
        cancelled = true;
        if (raf) cancelAnimationFrame(raf);
        if (el) el.removeEventListener('scroll', onScroll);
        ro?.disconnect();
      });
    });

    // A lazy branch that is open with nothing loaded starts its load, whichever
    // way it came to be open: the toggle, the keyboard, or `expanded` itself.
    // Browser only, so a prerender draws the loading row and calls no loader.
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const pending = this.view().toLoad;
      if (pending.length) untracked(() => pending.forEach(node => this.load(node)));
    });

    this.destroyRef.onDestroy(() => {
      this.clearHoverExpand();
      this.closeOverlay(false);
    });
  }

  // Template handlers

  protected onRowClick(flat: FlatNode<TId>, event: MouseEvent): void {
    if (this.disabled() || flat.node.disabled) return;
    if (flat.status) {
      this.focusIndex(flat.index);
      return;
    }
    if (flat.hasChildren && (event.target as HTMLElement).closest('.wr-tree__toggle')) {
      this.toggleExpanded(flat.node.id);
      return;
    }
    this.focusIndex(flat.index);
    if (flat.hasChildren && this.expandOnClick()) {
      // Under cascade the box only checks, and the rest of the row only opens.
      const onBox = this.isCascade() && !!(event.target as HTMLElement).closest('.wr-tree__check');
      if (!onBox) {
        this.toggleExpanded(flat.node.id);
        if (this.isCascade()) return;
      }
    }
    this.select(flat.node.id, event.ctrlKey || event.metaKey);
  }

  protected onToggleClick(node: WrTreeNode<TId>, event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled() || node.disabled) return;
    this.toggleExpanded(node.id);
  }

  /**
   * Map a physical arrow onto the expand / collapse axis.
   *
   * The APG gives ArrowRight the job of opening a branch and ArrowLeft the job
   * of closing it because the arrows follow the INDENT, and the indent grows
   * rightward. Under `dir="rtl"` it grows leftward, so the two swap — without
   * this an RTL user cannot open a node at all.
   *
   * Up / Down travel the block axis and Home / End name a semantic position
   * (first / last), so all four are returned untouched in both directions.
   */
  private inlineKey(key: string): string {
    if (this.dir?.value !== 'rtl') return key;
    if (key === 'ArrowRight') return 'ArrowLeft';
    if (key === 'ArrowLeft') return 'ArrowRight';
    return key;
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const flat = this.flat();
    const i = this.cursorIndex();
    const current = flat[i];
    if (!current) return;

    if (this.move()?.keyboard) {
      this.onMoveKey(event);
      return;
    }
    if (this.draggable() && event.altKey && event.key === 'Enter') {
      event.preventDefault();
      if (this.canDrag(current)) this.grab(current);
      return;
    }

    // A letter moves to the next visible row that starts with it. It opens
    // nothing, a status row has no label of its own to match, and a disabled
    // node is a stop here as it is for the arrows.
    if (this.typeTo(event, i)) return;

    // The cursor move is identical in both render shapes — `focusIndex()` owns
    // the roving-tabindex / `aria-activedescendant` split — so mirroring here
    // covers the windowed tree too.
    switch (this.inlineKey(event.key)) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusIndex(Math.min(flat.length - 1, i + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusIndex(Math.max(0, i - 1));
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (current.hasChildren && !this.expandedSet().has(current.node.id)) {
          this.toggleExpanded(current.node.id);
        } else if (current.hasChildren) {
          this.focusIndex(Math.min(flat.length - 1, i + 1));
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (current.hasChildren && this.expandedSet().has(current.node.id)) {
          this.toggleExpanded(current.node.id);
        } else if (current.depth > 0) {
          for (let j = i - 1; j >= 0; j--) {
            if (flat[j].depth < current.depth) {
              this.focusIndex(j);
              break;
            }
          }
        }
        break;
      case 'Home':
        event.preventDefault();
        this.focusIndex(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusIndex(flat.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (current.status) {
          if (current.status === 'error') this.retryLoad(current.node);
        } else if (!current.node.disabled) {
          this.select(current.node.id, event.ctrlKey || event.metaKey);
        }
        break;
      default:
        break;
    }
  }

  /**
   * Focus the tree — what Signal Forms calls to focus this control. Focus goes
   * where Tab would put it: the row holding the roving tab stop, or the list
   * itself while it is windowed, since the list is the tab stop then. In overlay
   * mode that is the trigger, and the panel stays shut.
   */
  focus(options?: FocusOptions): void {
    const host = this.host.nativeElement;
    let stop: HTMLElement | null;
    if (this.isOverlay()) stop = host.querySelector<HTMLElement>('.wr-tree__trigger');
    else if (this.virtualized()) stop = host.querySelector<HTMLElement>('.wr-tree__list');
    else stop = host.querySelector<HTMLElement>(`[data-tree-index="${this.cursorIndex()}"]`);
    stop?.focus(options);
  }

  /** Open the overlay panel, as the trigger does. Refused inline, and while disabled or read-only. */
  open(): void {
    if (!this.isOverlay() || this.disabled() || this.readonly()) return;
    this.openState.set(true);
  }

  /** Close the overlay panel. */
  close(): void {
    this.openState.set(false);
  }

  // Overlay-mode trigger handlers

  protected onTriggerClick(): void {
    if (this.disabled() || this.readonly()) return;
    this.openState.update(v => !v);
  }

  /** Trigger blur — mark the bound field touched. */
  /**
   * Leaving an INLINE tree marks it touched.
   *
   * `onBlur` below belongs to the overlay trigger, which only renders under
   * `openOn="overlay"` — so an inline tree emitted `touch` on SELECTION and
   * nowhere else. Focusing it and walking away without choosing anything left
   * the control neither touched nor dirty, which is exactly the state a
   * `<wr-form-field>` waits for before it will show a message: a `required`
   * tree the user considered and skipped stayed silent, and the form looked
   * fine while being invalid.
   *
   * `relatedTarget` inside the host means focus only moved BETWEEN rows, which
   * is not leaving. A `null` one — clicking the page background, or a browser
   * that withholds it — counts as leaving, which is the safe direction: marking
   * touched too eagerly shows a message the field already had grounds for.
   */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && this.host.nativeElement.contains(next)) return;
    this.touch.emit();
  }

  protected onBlur(): void {
    this.touch.emit();
  }

  /**
   * Backspace on the CLOSED overlay trigger — the keyboard twin of the two ×
   * controls inside it.
   *
   * Both the clear × and every chip's remove × are `tabindex="-1"` spans inside
   * this `<button>`, and they carried `(keydown.enter)` / `(keydown.space)`
   * bindings that could never fire: a keydown goes to the focused element, and
   * those spans cannot be focused. The spans stay unfocusable, since a focusable
   * child of a button is `nested-interactive`.
   *
   * What that cost differs by mode, and the difference is worth keeping straight.
   * In SINGLE mode it was a real WCAG 2.1.1 failure: Enter on the selected row
   * re-selects it, so the × was the only way back to nothing. In MULTI mode it
   * was not — Ctrl/Cmd+Enter on a row in the panel toggles it off, which is the
   * route {@link WrTreeHarness.selectNode} drives with `additive`. The multi
   * branch below is parity with `wr-select` and a shorter path, not a repair.
   *
   * The same key and the same split `wr-select` uses, so the two read alike:
   * in MULTI mode Backspace drops the last chip — chip removal is its own
   * control, not gated on `clearable()` — and in SINGLE mode it clears, gated on
   * `clearable()`, because that input IS the clear control. Only while closed.
   *
   * While the panel is open the trigger is the way into it, since opening
   * leaves focus here unless `autoFocus` asks: the arrows and Tab move to the
   * cursor row, and a letter to the row it starts. The pane sits at the end of
   * `<body>`, where the browser's own Tab would not find it.
   */
  protected onTriggerKey(event: KeyboardEvent): void {
    if (this.isOpen()) {
      if (this.disabled() || event.defaultPrevented) return;
      if (this.typeTo(event, -1)) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Tab') return;
      if (this.flat().length === 0) return;
      event.preventDefault();
      this.focusPanel();
      return;
    }
    // The APG combobox keys, and the ones `wr-select` and `wr-cascader` open on:
    // ArrowDown / ArrowUp, with or without Alt. Enter and Space already open it
    // through the native button click.
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !this.isOpen()) {
      if (this.disabled() || this.readonly()) return;
      event.preventDefault();
      this.openState.set(true);
      return;
    }
    if (event.key !== 'Backspace') return;
    if (this.disabled() || this.readonly() || this.isOpen() || !this.hasSelection()) return;

    if (this.isMulti()) {
      const chips = this.selectedChips();
      const last = chips[chips.length - 1];
      if (!last) return;
      event.preventDefault();
      this.removeChip(last.id, event);
      return;
    }

    if (!this.clearable()) return;
    event.preventDefault();
    this.clearSelection(event);
  }

  /**
   * Type-ahead: move the cursor to the next visible row after `from` that
   * starts with the letters typed so far.
   *
   * @returns whether the key was a type-ahead key.
   */
  private typeTo(event: KeyboardEvent, from: number): boolean {
    if (!this.typeahead.type(event)) return false;
    event.preventDefault();
    const match = this.typeahead.find(
      this.flat().map(row => ({ label: row.node.label, disabled: row.status !== null })),
      from
    );
    if (match >= 0) this.focusIndex(match);
    return true;
  }

  protected removeChip(id: TId, event: Event): void {
    event.stopPropagation();
    if (this.disabled() || this.readonly()) return;
    if (this.isCascade()) this.setChecked(id, false);
    else this.selected.set(this.selected().filter(x => x !== id));
    this.emit();
  }

  protected clearSelection(event: Event): void {
    event.stopPropagation();
    if (this.disabled() || this.readonly()) return;
    this.selected.set([]);
    this.emit();
  }

  // Selection / expansion plumbing

  private toggleExpanded(id: TId): void {
    const collapsing = this.expandedSet().has(id);
    const query = this.filterQuery();
    if (query) {
      // Under a filter the toggle is a view of the results, not the user's tree.
      const toggles = this.filterToggles();
      const open = new Map(toggles.query === query ? toggles.open : []);
      open.set(id, !collapsing);
      this.filterToggles.set({ query, open });
    } else {
      const set = new Set(this.expanded());
      if (collapsing) set.delete(id);
      else set.add(id);
      this.expanded.set([...set]);
    }
    // A collapse that hid the cursor hands it to the row that hid it, the APG's
    // rule — so reopening the branch does not pull the tab stop back inside.
    if (!collapsing) return;
    const row = this.flat()[this.cursorIndex()];
    if (row && !row.status) this.cursorId.set({ id: row.node.id });
  }

  private select(id: TId, additive: boolean): void {
    // Every selection path funnels through here — row click, Enter, Space — so
    // one guard covers them all while expand / collapse stays reachable.
    if (this.readonly()) return;
    const mode = this.selectionMode();
    if (mode === 'none') return;
    if (mode === 'single') {
      this.selected.set([id]);
    } else if (this.isCascade()) {
      this.setChecked(id, !this.selectedSet().has(id));
    } else {
      const set = new Set(this.selected());
      if (additive) {
        if (set.has(id)) set.delete(id);
        else set.add(id);
      } else {
        // Plain click toggles single id in multi mode — common UX.
        if (set.size === 1 && set.has(id)) set.delete(id);
        else {
          set.clear();
          set.add(id);
        }
      }
      this.selected.set([...set]);
    }

    // Propagate to the bound value — in BOTH modes. The inbound half of this
    // bridge (the `value` -> `selected` effect above) was never gated, so
    // gating the outbound half left an inline tree in a form accepting a
    // programmatic write and never reporting the user's pick: `[formField]`
    // compiled, rows announced `aria-selected`, and the control stayed at its
    // initial value forever. One-way is worse than unsupported, because it
    // looks wired up. `[(selected)]` remains the inline-native API; `value`
    // simply stops lying. Closing on a single pick stays overlay-only — an
    // inline tree has no panel to close.
    this.emit();
    if (this.isOverlay() && mode === 'single' && this.selected().length > 0) {
      this.openState.set(false);
    }
  }

  private emit(): void {
    this.touch.emit();
    this.writeValue();
  }

  private writeValue(): void {
    if (this.isMulti()) {
      this.value.set(this.selected());
    } else {
      this.value.set(this.selected()[0] ?? null);
    }
  }

  /**
   * The cascade rule, in one place. Down: the node and its loaded descendants
   * take the new state, and a disabled node keeps its own and shields its
   * subtree. Up: each ancestor is checked exactly while all of its enabled
   * children are.
   */
  private setChecked(id: TId, checked: boolean): void {
    const { byId, parents } = this.lookup();
    const lazy = this.lazy();
    const set = new Set(this.selected());
    const apply = (node: WrTreeNode<TId>): void => {
      if (node.disabled) return;
      if (checked) set.add(node.id);
      else set.delete(node.id);
      for (const child of childrenOf(node, lazy)) apply(child);
    };
    const node = byId.get(id);
    if (node) apply(node);
    else set.delete(id);

    for (let up = parents.get(id); up !== undefined; up = parents.get(up)) {
      const parent = byId.get(up);
      if (!parent || parent.disabled) continue;
      const children = childrenOf(parent, lazy).filter(child => !child.disabled);
      if (!children.length) continue;
      if (children.every(child => set.has(child.id))) set.add(up);
      else set.delete(up);
    }
    this.selected.set([...set]);
  }

  // Lazy children

  private load(node: WrTreeNode<TId>): void {
    const loader = this.loadChildren();
    if (!loader) return;
    const id = node.id;
    const settle = (entry: LazyEntry<TId>): void => {
      // The status row leaves the DOM when the load settles, and takes real focus with it.
      const cursor = this.flat()[this.cursorIndex()];
      const active = this.host.nativeElement.ownerDocument.activeElement;
      const held = !!cursor?.status && cursor.node.id === id && !!this.listElement?.contains(active);
      this.lazy.update(map => new Map(map).set(id, entry));
      if (held && entry.status !== 'loading') this.refocusCursor();
    };
    settle({ status: 'loading' });
    // A pending task, so `whenStable()` and a harness wait for the children.
    const done = this.pendingTasks.add();
    let answer: ReturnType<WrTreeChildrenLoader<TId>>;
    try {
      answer = loader(node);
    } catch {
      settle({ status: 'error' });
      done();
      return;
    }
    (isObservable(answer) ? answer : from(Promise.resolve(answer)))
      .pipe(take(1), takeUntilDestroyed(this.destroyRef), finalize(done))
      .subscribe({
        next: children => {
          settle({ status: 'loaded', children });
          // Children that arrive under a checked parent are checked with it.
          if (this.isCascade() && this.selectedSet().has(id)) {
            this.setChecked(id, true);
            this.writeValue();
          }
        },
        error: () => settle({ status: 'error' }),
        // An observable that completed without a value has no children to show.
        complete: () => {
          if (this.lazy().get(id)?.status === 'loading') settle({ status: 'loaded', children: [] });
        },
      });
  }

  /** The error row's retry: by its button, or by Enter while the cursor is on the row. */
  protected retryLoad(node: WrTreeNode<TId>, event?: Event): void {
    event?.stopPropagation();
    if (this.disabled()) return;
    this.load(node);
  }

  // Moving a row: drag and drop, and its keyboard twin

  private readonly move = signal<MoveState<TId> | null>(null);

  /** The node being moved, for the row's `--dragging` modifier. */
  protected readonly movingNode = computed(() => this.move()?.node ?? null);

  /** Live-region text. Written by the keyboard move only: a drag is its own feedback. */
  protected readonly announcement = signal('');

  /** Links the tree to the keyboard move's description. */
  protected readonly moveHelpId = `${this.panelId}-move-help`;

  protected readonly listDescribedBy = computed(() => {
    const ids = [this.isOverlay() ? null : this.fieldAria.describedBy(), this.draggable() ? this.moveHelpId : null];
    return ids.filter(Boolean).join(' ') || null;
  });

  private hoverExpand: { readonly id: TId; readonly timer: ReturnType<typeof setTimeout> } | null = null;

  /** A filter shows a subset of every sibling group, and an index into a subset is not one into `nodes`. */
  private readonly movable = computed(() => this.draggable() && !this.disabled() && !this.filterQuery());

  protected canDrag(row: FlatNode<TId>): boolean {
    return this.movable() && !row.status && !row.node.disabled && !this.lookup().cached.has(row.node.id);
  }

  /** A sibling group as `nodes` holds it, without the node being moved. */
  private siblings(parentId: TId | null, moving: TId): readonly WrTreeNode<TId>[] {
    const list = parentId === null ? this.nodes() : (this.lookup().byId.get(parentId)?.children ?? NO_NODES);
    return list.filter(node => node.id !== moving);
  }

  private locate(node: WrTreeNode<TId>): WrTreeMoveEnd<TId> {
    const parentId = this.parentMap().get(node.id) ?? null;
    const list = parentId === null ? this.nodes() : (this.lookup().byId.get(parentId)?.children ?? NO_NODES);
    return { parentId, index: list.indexOf(node) };
  }

  /** Whether `node` may land at `target`: never under itself, never in the cache, and `canDrop` willing. */
  private allows(node: WrTreeNode<TId>, target: WrTreeMoveEnd<TId>): boolean {
    const { byId, parents, cached } = this.lookup();
    let parent: WrTreeNode<TId> | null = null;
    if (target.parentId !== null) {
      parent = byId.get(target.parentId) ?? null;
      if (!parent || parent.disabled || isLazy(parent) || cached.has(parent.id)) return false;
      for (let id: TId | undefined = parent.id; id !== undefined; id = parents.get(id)) {
        if (id === node.id) return false;
      }
    }
    return this.canDrop()?.(node, { ...target, parent }) ?? true;
  }

  /** Where the drop indicator sits for the current target. */
  protected readonly dropMark = computed<DropMark | null>(() => {
    const move = this.move();
    const target = move?.target;
    if (!move || !target) return null;
    const rows = this.flat();
    const at = this.flatIndex();
    const siblings = this.siblings(target.parentId, move.node.id);
    let depth = 0;
    if (target.parentId !== null) {
      const parentRow = at.get(target.parentId);
      if (parentRow === undefined) return null;
      depth = rows[parentRow].depth + 1;
      // A closed or empty parent has no row to draw a line against.
      if (!siblings.length || !this.expandedSet().has(target.parentId)) {
        return { row: parentRow, position: 'inside', depth };
      }
    }
    if (target.index < siblings.length) {
      const row = at.get(siblings[target.index].id);
      return row === undefined ? null : { row, position: 'before', depth };
    }
    const last = siblings[siblings.length - 1];
    let row = last ? at.get(last.id) : undefined;
    if (row === undefined) return null;
    // Below the last sibling's whole open subtree; the line's indent names the level.
    while (rows[row + 1] && rows[row + 1].depth > depth) row += 1;
    return { row, position: 'after', depth };
  });

  private rowOf(event: Event): { readonly row: FlatNode<TId>; readonly el: HTMLElement } | null {
    const target = event.target;
    const from = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    const el = from?.closest<HTMLElement>('[data-tree-index]');
    const row = el ? this.flat()[Number(el.getAttribute('data-tree-index'))] : undefined;
    return el && row ? { row, el } : null;
  }

  protected onDragStart(event: DragEvent): void {
    const hit = this.rowOf(event);
    if (!hit || !this.canDrag(hit.row)) {
      if (this.draggable()) event.preventDefault();
      return;
    }
    const node = hit.row.node;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // Firefox starts no drag without data.
      event.dataTransfer.setData('text/plain', node.label);
    }
    this.announcement.set('');
    this.move.set({ node, from: this.locate(node), keyboard: false, target: null });
    // On the row itself too: a windowed list can unrender it mid-drag, and the
    // event then never bubbles to the list.
    hit.el.addEventListener('dragend', () => this.endDrag(), { once: true });
  }

  protected onDragOver(event: DragEvent): void {
    const move = this.move();
    if (!move || move.keyboard) return;
    const hit = this.rowOf(event);
    const target = hit && !hit.row.status ? this.pointerTarget(move, hit.row, hit.el, event.clientY) : null;
    if (hit && !hit.row.status) this.restOn(move, hit.row);
    else this.clearHoverExpand();
    if (target) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    }
    if (!sameEnd(move.target, target)) this.move.set({ ...move, target });
  }

  protected onDragLeave(event: DragEvent): void {
    const move = this.move();
    if (!move || move.keyboard) return;
    const next = event.relatedTarget;
    if (next instanceof Node && this.listElement?.contains(next)) return;
    this.clearHoverExpand();
    if (move.target) this.move.set({ ...move, target: null });
  }

  protected onDrop(event: DragEvent): void {
    const move = this.move();
    if (!move || move.keyboard) return;
    event.preventDefault();
    this.endDrag();
    if (move.target) this.commit(move, move.target);
  }

  protected endDrag(): void {
    this.clearHoverExpand();
    if (this.move() && !this.move()!.keyboard) this.move.set(null);
  }

  /**
   * The target a pointer names on a row: its top quarter places the node
   * before it, its bottom quarter after it (as the first child, when the row
   * is an open branch), the middle makes it the row's last child. Where the
   * middle is refused the row splits in half instead.
   */
  private pointerTarget(
    move: MoveState<TId>,
    row: FlatNode<TId>,
    el: HTMLElement,
    clientY: number
  ): WrTreeMoveEnd<TId> | null {
    const { node } = move;
    const over = row.node;
    const rect = el.getBoundingClientRect();
    const ratio = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5;
    const parentId = this.parentMap().get(over.id) ?? null;
    const index = this.siblings(parentId, node.id).indexOf(over);
    const open = row.hasChildren && this.expandedSet().has(over.id);

    const inside: WrTreeMoveEnd<TId> = { parentId: over.id, index: this.siblings(over.id, node.id).length };
    const before: WrTreeMoveEnd<TId> = { parentId, index };
    const after: WrTreeMoveEnd<TId> = open ? { parentId: over.id, index: 0 } : { parentId, index: index + 1 };
    const ok = (target: WrTreeMoveEnd<TId>): boolean =>
      // `index < 0` is the moved row itself, or a row `nodes` does not hold.
      (target.parentId === over.id || index >= 0) && !sameEnd(target, move.from) && this.allows(node, target);

    const order = ratio < 0.25 ? [before] : ratio > 0.75 ? [after] : ratio < 0.5 ? [inside, before] : [inside, after];
    return order.find(ok) ?? null;
  }

  /** A drag resting on a collapsed branch opens it, so its children can be reached. */
  private restOn(move: MoveState<TId>, row: FlatNode<TId>): void {
    const id = row.node.id;
    if (this.hoverExpand?.id === id) return;
    this.clearHoverExpand();
    if (!row.hasChildren || row.node.disabled || id === move.node.id || this.expandedSet().has(id)) return;
    const timer = setTimeout(() => {
      this.hoverExpand = null;
      if (this.move() && !this.expandedSet().has(id)) this.toggleExpanded(id);
    }, HOVER_EXPAND_MS);
    this.hoverExpand = { id, timer };
  }

  private clearHoverExpand(): void {
    if (this.hoverExpand) clearTimeout(this.hoverExpand.timer);
    this.hoverExpand = null;
  }

  /** Reports the move and opens the new parent, so the row is in view once the consumer applies it. */
  private commit(move: MoveState<TId>, to: WrTreeMoveEnd<TId>): void {
    if (sameEnd(move.from, to)) return;
    if (to.parentId !== null && !this.expanded().includes(to.parentId)) {
      this.expanded.set([...this.expanded(), to.parentId]);
    }
    this.nodeMove.emit({ node: move.node, from: move.from, to });
  }

  private grab(row: FlatNode<TId>): void {
    const from = this.locate(row.node);
    this.move.set({ node: row.node, from, keyboard: true, target: from });
    this.announcement.set(this.grabbedText(this.position(row.node, from)));
  }

  /**
   * The held row's keys. Up and Down walk its sibling group, stepping over a
   * place `canDrop` refuses; the arrow toward the indent makes it the last
   * child of the sibling above, the other one puts it after its parent. The row
   * itself stays where it is until the consumer applies the drop: the
   * indicator and the live region say where it would land.
   */
  private onMoveKey(event: KeyboardEvent): void {
    const move = this.move();
    const target = move?.target;
    if (!move || !target) return;
    const { node, from } = move;
    const key = this.inlineKey(event.key);
    // Tab and everything else stay the browser's; Home and End are swallowed so the cursor stays on the held row.
    if (!MOVE_KEYS.has(key)) return;
    event.preventDefault();

    if (key === 'Escape') {
      // The overlay closes on Escape too; this one only puts the row back.
      event.stopPropagation();
      this.cancelMove();
      return;
    }
    if (key === 'Enter' || key === ' ') {
      this.move.set(null);
      this.announcement.set(this.droppedText(this.position(node, target)));
      this.commit(move, target);
      this.refocusCursor();
      return;
    }

    const ok = (to: WrTreeMoveEnd<TId>): boolean => sameEnd(to, from) || this.allows(node, to);
    const siblings = this.siblings(target.parentId, node.id);
    let next: WrTreeMoveEnd<TId> | null = null;
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const step = key === 'ArrowDown' ? 1 : -1;
      for (let index = target.index + step; index >= 0 && index <= siblings.length; index += step) {
        if (ok({ parentId: target.parentId, index })) {
          next = { parentId: target.parentId, index };
          break;
        }
      }
    } else if (key === 'ArrowRight') {
      const above = siblings[target.index - 1];
      if (above) next = { parentId: above.id, index: this.siblings(above.id, node.id).length };
    } else if (key === 'ArrowLeft' && target.parentId !== null) {
      const parentId = this.parentMap().get(target.parentId) ?? null;
      const parent = this.lookup().byId.get(target.parentId);
      if (parent) next = { parentId, index: this.siblings(parentId, node.id).indexOf(parent) + 1 };
    }
    if (!next || !ok(next)) return;

    // The indicator needs the new parent open to have a row to sit on.
    if (next.parentId !== null && next.parentId !== target.parentId && !this.expandedSet().has(next.parentId)) {
      this.expanded.set([...this.expanded(), next.parentId]);
    }
    this.move.set({ ...move, target: next });
    const place = this.movedText(this.position(node, next));
    const parent = next.parentId === null ? undefined : this.lookup().byId.get(next.parentId);
    this.announcement.set(parent && next.parentId !== target.parentId ? `${parent.label}. ${place}` : place);
    const mark = this.dropMark();
    if (mark && this.virtualized()) this.ensureVisible(mark.row);
  }

  private cancelMove(): void {
    if (!this.move()?.keyboard) return;
    this.move.set(null);
    this.announcement.set(this.cancelledText());
  }

  /** A held row is put back when focus leaves the list: nothing was written, so nothing is lost. */
  protected onListFocusOut(event: FocusEvent): void {
    if (!this.move()?.keyboard) return;
    const next = event.relatedTarget;
    if (next instanceof Node && this.listElement?.contains(next)) return;
    this.cancelMove();
  }

  private position(node: WrTreeNode<TId>, end: WrTreeMoveEnd<TId>): { index: number; total: number } {
    return { index: end.index + 1, total: this.siblings(end.parentId, node.id).length + 1 };
  }

  /** Puts real focus back on the cursor row, after the element that held it left the DOM or was moved in it. */
  private refocusCursor(): void {
    if (this.virtualized()) return;
    afterNextRender(
      () => {
        const root = this.overlayRef?.overlayElement ?? this.host.nativeElement;
        const active = root.ownerDocument.activeElement;
        if (active && active !== root.ownerDocument.body && !root.contains(active)) return;
        root.querySelector<HTMLElement>(`[data-tree-index="${this.cursorIndex()}"]`)?.focus();
      },
      { injector: this.injector }
    );
  }

  private focusIndex(i: number): void {
    this.focusedIndex.set(i);
    const row = this.flat()[i];
    // A status row has no id of its own: the slot index alone holds the cursor there.
    this.cursorId.set(row && !row.status ? { id: row.node.id } : null);
    if (this.virtualized()) {
      // Managed-focus (aria-activedescendant): focus stays on the list container.
      // Setting `scrollTop` synchronously materializes row `i` in the SAME change
      // detection pass, so the id referenced by `aria-activedescendant` is present
      // — no rAF/microtask race, no "points at an absent id" gap.
      this.ensureVisible(i);
      this.listElement?.focus();
      return;
    }
    // Non-virtual roving tabindex: defer so the DOM has updated tabindex, then
    // move focus to the row element.
    queueMicrotask(() => {
      const root = this.overlayRef?.overlayElement ?? this.host.nativeElement;
      const row = root.querySelector<HTMLElement>(`[data-tree-index="${i}"]`);
      row?.focus();
    });
  }

  // Overlay

  private collectExpandableIds(list: readonly WrTreeNode<TId>[]): readonly TId[] {
    const out: TId[] = [];
    const walk = (items: readonly WrTreeNode<TId>[]): void => {
      for (const n of items) {
        const children = childrenOf(n, this.lazy());
        if (children.length) {
          out.push(n.id);
          walk(children);
        }
      }
    };
    walk(list);
    return out;
  }

  private openOverlay(): void {
    if (this.overlayRef) return;
    const tpl = this.panelTpl();
    if (!tpl) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
      ])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      width: this.host.nativeElement.getBoundingClientRect().width,
      panelClass: wrToClassList('wr-tree-overlay', this.panelClass()),
    });

    // The pane is appended to `<body>`, so the only thing telling it which way
    // to read is the `dir` the CDK captured when this ref was created. The
    // arrow-key mapping above reads `Directionality` LIVE, so without this a
    // mid-session flip left ArrowLeft opening branches the panel still indented
    // rightward. Ends with the ref; reopening installs a new one.
    wrFollowDirection(this.overlayRef, this.dir, this.injector);

    this.overlayRef.attach(new TemplatePortal(tpl, this.vcr));

    // Opening moves no focus unless `autoFocus` asks. `onKeydown` lives on the
    // `<ul>` inside the portal and the pane is appended to `<body>`, so the
    // trigger's own keys are the way in: see `onTriggerKey`.
    //
    // `afterNextRender`, NOT `queueMicrotask`: under zoneless CD the scheduler
    // runs change detection in a macrotask, so a microtask queued here fires
    // first and focuses whatever the panel held before this open — the same trap
    // that once left `wr-calendar`'s ring and real focus on different days.
    if (this.autoFocus()) afterNextRender(() => this.focusPanel(), { injector: this.injector });

    this.outsideClick
      .outsidePointerEvents(this.overlayRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.openState.set(false);
      });

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.openState.set(false);
          return;
        }
        if (event.key === 'Tab') {
          // Already answered: Tab on the trigger walked into the panel.
          if (event.defaultPrevented) return;
          // Tab closes the panel and moves on from the TRIGGER, as `wr-dropdown`
          // does. Left alone, the browser's Tab ran from the row, and the pane
          // sits at the end of `<body>`: focus left the document and the panel
          // stayed open over a combobox nobody was on. So the trigger takes
          // focus here, synchronously and with no `preventDefault`, and the
          // browser's own Tab carries on from it to its real neighbour. Not from
          // a field outside the panel: the dispatcher routes every document
          // keydown to the topmost overlay, and that caret is not ours to move.
          const typedIn = event.target;
          const ours =
            typedIn instanceof Node &&
            (this.host.nativeElement.contains(typedIn) || (this.overlayRef?.overlayElement.contains(typedIn) ?? false));
          if (ours) this.host.nativeElement.querySelector<HTMLElement>('.wr-tree__trigger')?.focus();
          this.openState.set(false);
        }
      });

    this.opened.emit();
  }

  /**
   * Move focus into the open panel. Virtual mode focuses the LIST (managed
   * focus via `aria-activedescendant`); the non-virtual shape focuses the
   * roving row, which carries the tab stop.
   */
  private focusPanel(): void {
    if (this.virtualized()) {
      this.listElement?.focus();
      return;
    }
    this.overlayRef?.overlayElement.querySelector<HTMLElement>(`[data-tree-index="${this.cursorIndex()}"]`)?.focus();
  }

  /** `notify: false` is the destroy path: an output cannot emit from a destroyed view. */
  private closeOverlay(notify = true): void {
    if (!this.overlayRef) return;
    // Hand the focus back before the panel it lives in disappears. The keyboard
    // path in virtual mode focuses the list itself, so closing left the document
    // focused on `<body>` and the next Tab started from the top of the page —
    // `wr-dropdown` returns focus to its own trigger for the same reason.
    const active = this.host.nativeElement.ownerDocument.activeElement;
    const inPanel = active instanceof Node && this.overlayRef.overlayElement.contains(active);
    this.overlayRef.dispose();
    this.overlayRef = null;
    if (!notify) return;
    if (inPanel) this.host.nativeElement.querySelector<HTMLElement>('.wr-tree__trigger')?.focus();
    this.closed.emit();
  }
}
