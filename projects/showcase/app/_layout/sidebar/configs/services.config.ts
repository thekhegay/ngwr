import type { SidebarGroup } from '../sidebar.types';

/** The Services group of the Reference sidebar — one row per injectable. */
export const SERVICES_GROUP: SidebarGroup = {
  title: 'Services',
  children: [
    { title: 'WrClipboard', url: ['/reference/services', 'clipboard'] },
    { title: 'WrCookie', url: ['/reference/services', 'cookie'] },
    { title: 'WrDensity', url: ['/reference/services', 'density'] },
    { title: 'WrHotkey', url: ['/reference/services', 'hotkey'] },
    { title: 'WrI18n', url: ['/reference/services', 'i18n'] },
    { title: 'WrLoadingBar', url: ['/reference/services', 'loading-bar'] },
    { title: 'WrMedia', url: ['/reference/services', 'media'] },
    { title: 'WrMeta', url: ['/reference/services', 'meta'] },
    { title: 'WrPlatform', url: ['/reference/services', 'platform'] },
    { title: 'WrScroll', url: ['/reference/services', 'scroll'] },
    { title: 'WrStorage', url: ['/reference/services', 'storage'] },
    { title: 'WrTheme', url: ['/reference/services', 'theme'] },
    { title: 'WrTour', url: ['/reference/services', 'tour'] },
  ],
};
