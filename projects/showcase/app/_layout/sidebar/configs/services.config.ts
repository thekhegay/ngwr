import type { SidebarGroup } from '../sidebar.types';

/** Flat sidebar for `/services/*` — one direct-link row per service. */
export const SERVICES_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'WrTheme', url: ['/services', 'theme'] },
  { title: 'WrScroll', url: ['/services', 'scroll'] },
  { title: 'WrHotkey', url: ['/services', 'hotkey'] },
  { title: 'WrMedia', url: ['/services', 'media'] },
  { title: 'WrPlatform', url: ['/services', 'platform'] },
  { title: 'WrMeta', url: ['/services', 'meta'] },
  { title: 'WrStorage', url: ['/services', 'storage'] },
  { title: 'WrI18n', url: ['/services', 'i18n'] },
  { title: 'WrDensity', url: ['/services', 'density'] },
  { title: 'WrClipboard', url: ['/services', 'clipboard'] },
  { title: 'WrCookie', url: ['/services', 'cookie'] },
];
