import { type WrI18nCatalog } from 'ngwr/i18n';

/**
 * Base English catalog for ngwr built-in component strings. Spread this
 * into your root catalog or pass it to `provideWrI18nStaticLoader`.
 *
 * @example
 * ```ts
 * import { wrEn } from 'ngwr/i18n/en';
 *
 * provideWrI18nStaticLoader({
 *   en: { ...wrEn, app: { title: 'My app' } },
 * });
 * ```
 */
export const wrEn: WrI18nCatalog = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    delete: 'Delete',
    save: 'Save',
    edit: 'Edit',
    add: 'Add',
    remove: 'Remove',
    clear: 'Clear',
    search: 'Search',
    loading: 'Loading…',
    select: 'Select',
    next: 'Next',
    previous: 'Previous',
    back: 'Back',
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
  },
  pagination: {
    prev: 'Previous',
    next: 'Next',
    pageOf: 'Page {{current}} of {{total}}',
  },
  table: {
    empty: 'No data',
    loading: 'Loading…',
  },
  select: {
    placeholder: 'Select…',
    empty: 'No options',
  },
  upload: {
    drop: 'Drop files here or click to browse',
    invalid: 'Unsupported file type',
    tooBig: 'File too large',
  },
  date: {
    months: {
      jan: 'January',
      feb: 'February',
      mar: 'March',
      apr: 'April',
      may: 'May',
      jun: 'June',
      jul: 'July',
      aug: 'August',
      sep: 'September',
      oct: 'October',
      nov: 'November',
      dec: 'December',
    },
  },
};
