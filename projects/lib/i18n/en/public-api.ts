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
    of: 'of',
  },
  pagination: {
    prev: 'Previous page',
    next: 'Next page',
    itemsPerPage: 'Items per page',
    pageOf: 'Page {{current}} of {{total}}',
    of: 'of',
  },
  table: {
    empty: 'No data',
    loading: 'Loading…',
    sort: 'Sort column',
    filter: 'Filter column',
  },
  select: {
    placeholder: 'Select…',
    empty: 'No options',
    clearSelection: 'Clear selection',
    removeItem: 'Remove {{label}}',
    noResults: 'No results',
    loading: 'Loading…',
  },
  // `tree` covers both inline display and combobox-mode pickers
  // (replaces the dropped `treeSelect` namespace).
  tree: {
    expand: 'Expand',
    collapse: 'Collapse',
    placeholder: 'Select…',
    clearSelection: 'Clear selection',
    removeItem: 'Remove {{label}}',
  },
  commandPalette: {
    placeholder: 'Type a command or search…',
    noResults: 'No results',
  },
  empty: {
    noData: 'No data',
  },
  fileUpload: {
    browse: 'Click to browse',
    dropZone: 'or drop files here',
    dropZoneLabel: 'File upload drop zone — click or drop files',
    removeFile: 'Remove file',
    invalid: 'Unsupported file type',
    tooBig: 'File too large',
  },
  upload: {
    drop: 'Drop files here or click to browse',
    invalid: 'Unsupported file type',
    tooBig: 'File too large',
  },
  popconfirm: {
    confirm: 'Confirm',
    cancel: 'Cancel',
  },
  toast: {
    close: 'Close',
    copy: 'Copy',
    copied: 'Copied',
    closeAll: 'Close all',
  },
  input: {
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  inputNumber: {
    increment: 'Increment',
    decrement: 'Decrement',
  },
  backTop: {
    label: 'Back to top',
  },
  calendar: {
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    prevYear: 'Previous year',
    nextYear: 'Next year',
  },
  carousel: {
    prev: 'Previous slide',
    next: 'Next slide',
    pagination: 'Carousel pagination',
  },
  alert: {
    close: 'Close alert',
  },
  image: {
    open: 'Open preview',
    close: 'Close preview',
  },
  window: {
    close: 'Close',
  },
  datePicker: {
    open: 'Open calendar',
    openTime: 'Open time picker',
    openDateTime: 'Open date and time picker',
  },
  spinner: {
    label: 'Loading',
  },
  rating: {
    label: 'Rating',
  },
  result: {
    notFound: 'Sorry, the page you visited does not exist.',
    forbidden: 'Sorry, you are not authorized to access this page.',
    serverError: 'Sorry, something went wrong.',
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
