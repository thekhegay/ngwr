import type { Routes } from '@angular/router';

// Phase 1 keeps the existing single-page directives doc as the only
// route. Phase 2 will split it into per-directive pages (one route per
// directive).
export default [
  { path: '', loadComponent: () => import('./directives') },
] satisfies Routes;
