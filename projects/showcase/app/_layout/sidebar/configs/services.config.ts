import type { SidebarGroup } from '../sidebar.types';

/** Flat sidebar for `/services/*` — one direct-link row per service. */
export const SERVICES_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'WrClipboard', url: ['/services', 'clipboard'] },
  { title: 'WrCookie', url: ['/services', 'cookie'] },
  { title: 'WrDensity', url: ['/services', 'density'] },
  { title: 'WrHotkey', url: ['/services', 'hotkey'] },
  { title: 'WrI18n', url: ['/services', 'i18n'] },
  { title: 'WrLoadingBar', url: ['/services', 'loading-bar'] },
  { title: 'WrMedia', url: ['/services', 'media'] },
  { title: 'WrMeta', url: ['/services', 'meta'] },
  { title: 'WrPlatform', url: ['/services', 'platform'] },
  { title: 'WrScroll', url: ['/services', 'scroll'] },
  { title: 'WrStorage', url: ['/services', 'storage'] },
  { title: 'WrTheme', url: ['/services', 'theme'] },
];
