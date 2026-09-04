# wr-pagination writes `currentPage` back from state it cannot trust

**Versions:** ngwr 12.0.0, Angular 22.1.3. Present since 11.0.0 (see *Origin*).

Two separate defects, filed together because they share a root: the component
corrects the host's `currentPage` from a value that is either transient or
already stale, and emits the correction as if the user had navigated. Happy to
split them.

---

## 1. Clamping against a transient `total` locks the pager on page 1

With server-side paging, `total` is not a constant — it is unknown while a page
is in flight. The guard effect treats that gap as authoritative:

```ts
// projects/lib/pagination/pagination.ts:207
effect(() => {
  const clamped = Math.min(Math.max(1, this.currentPage()), this.totalPages());
  if (clamped !== this.currentPage()) this.currentPage.set(clamped);
});
```

`totalPages()` is `max(1, ceil(total / pageSize))`, so `total = 0` means exactly
one page and every page above 1 gets pulled back.

### What happens

Angular's `resource` discards its value when the params change — the previous
stream is reused only when the params object is identical by reference, and a
params function returning an object literal never is. So the host's `total`
legitimately reads 0 between the click and the response:

1. user clicks page 2 → `goTo(2)` → `currentPage.set(2)` → `currentPageChange(2)`
2. host stores page 2, the request goes out, its `total` drops to 0
3. `totalPages()` becomes 1, the guard clamps 2 → 1 and emits `currentPageChange(1)`
4. host stores page 1 and requests page 1

The pager cannot leave page 1. Two events per click, and the second one is
indistinguishable from a real navigation.

### Reproduction

No backend needed — a delayed stream is enough:

```ts
@Component({
  selector: 'app-repro',
  imports: [WrPagination],
  template: `
    <p>page {{ pageIndex() }} — total {{ total() }} — first {{ list()[0] ?? '—' }}</p>
    <wr-pagination
      [total]="total()"
      [currentPage]="pageIndex()"
      [pageSize]="pageSize()"
      (currentPageChange)="pageIndex.set($event)"
    />
  `,
})
export class Repro {
  readonly pageIndex = signal(1);
  readonly pageSize = signal(10);

  private readonly page = rxResource({
    params: () => ({ page: this.pageIndex(), size: this.pageSize() }),
    stream: ({ params }) =>
      of({
        data: Array.from({ length: params.size }, (_, i) => (params.page - 1) * params.size + i + 1),
        total: 51,
      }).pipe(delay(700)),
  });

  // the shape every paginated store ends up with
  readonly list = computed(() => (this.page.hasValue() ? this.page.value().data : []));
  readonly total = computed(() => (this.page.hasValue() ? this.page.value().total : 0));
}
```

**Expected:** clicking page 2 lands on page 2.
**Actual:** it returns to page 1. Observed event log for one click:

```
currentPageChange -> 2 (host was 1)
currentPageChange -> 1 (host was 2)
```

### Suggestion

Skip the correction while `total()` is 0. Zero is indistinguishable from "not
loaded yet", and it is the only value for which the clamp is destructive rather
than cosmetic — when the list really is empty there is a single page and nothing
to navigate to, so nothing needs correcting. Everything the guard was added for
(no `aria-current` past the end, a backwards `rangeLabel()`) concerns a *settled*
`total` and still works.

```ts
effect(() => {
  if (this.total() === 0) return;
  const clamped = Math.min(Math.max(1, this.currentPage()), this.totalPages());
  if (clamped !== this.currentPage()) this.currentPage.set(clamped);
});
```

A host reporting 0 mid-flight is arguably also the host's problem, and we fixed
it on our side. But a pagination component's primary use case is server-side
data, and today a plain `rxResource` wiring — the shape the Angular docs lead
you to — silently bricks it.

---

## 2. `onSizeChange` clamps from a stale `currentPage` and overwrites the host

```ts
// projects/lib/pagination/pagination.ts:213
protected onSizeChange(size: unknown): void {
  // …
  this.pageSize.set(next);                                   // emits pageSizeChange
  const cap = Math.max(1, Math.ceil(this.total() / next));
  if (this.currentPage() > cap) this.currentPage.set(cap);   // reads a value already superseded
}
```

`pageSize.set()` emits synchronously, so by line 3 the host has already handled
`pageSizeChange` and applied its own policy — most tables reset to page 1. That
new value has not reached the model yet; it arrives on the next binding pass. So
`this.currentPage()` still holds the pre-change page, and the component writes a
decision derived from it over the host's.

### Reproduction

Same component as above, plus `showSizeChanger`, `[pageSizeOptions]="[5, 10, 25]"`
and the conventional handler:

```ts
onPageSizeChange(size: number): void {
  this.pageSize.set(size);
  this.pageIndex.set(1);   // reset to the first page
}
```

From page 6 at size 10, choose 25 per page.

**Expected:** page 1, one request.
**Actual:** page 3, two requests. Event log:

```
pageSizeChange   -> 25 (host was 10)   → host sets page 1
currentPageChange -> 3  (host was 1)   → host overwritten
```

The host cannot tell this `currentPageChange` from a user navigation, so there
is no way to defend the reset.

### Suggestion

Drop the imperative clamp. The guard effect in the constructor already covers
it, and it runs after the bindings settle, so it reads the page the host
actually wants:

```ts
protected onSizeChange(size: unknown): void {
  // …
  this.pageSize.set(next);
}
```

---

## Workaround

For anyone hitting this before a fix:

1. keep the last successful payload so `total` never dips to 0 while loading
   (a `linkedSignal` over the resource whose computation falls back to the
   previous value);
2. do not reset the page on a size change — apply the component's own rule
   instead, `min(page, ceil(total / newSize))`, so its follow-up event is a
   no-op and only one request goes out.

## Origin

- `3ec0f563` *fix(pagination): pull the page back when the total shrinks* — first
  released in **v11.0.0**. Downward-only and `untracked`, but it already tracked
  `totalPages()`, so problem 1 dates from here rather than from v12.
- `b24d9e77` — released in **v12.0.0**; made the guard two-sided and tracked.
  Same failure, now also correcting upward.
- The `cap` clamp in `onSizeChange` predates both.
