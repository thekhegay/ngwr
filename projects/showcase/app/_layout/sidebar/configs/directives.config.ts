import type { SidebarGroup } from '../sidebar.types';

/**
 * Flat sidebar for `/directives` — currently a single landing page; add
 * one entry per directive here as they get their own pages.
 */
export const DIRECTIVES_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Overview', url: ['/directives'] },
];
