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
    perPage: '{{size}} / page',
    goToPage: 'Go to page {{page}}',
    label: 'Pagination',
    pageOf: 'Page {{current}} of {{total}}',
    of: 'of',
  },
  table: {
    empty: 'No data',
    loading: 'Loading…',
    sort: 'Sort column',
    filter: 'Filter column',
    selectAll: 'Select all rows',
    selectRow: 'Select row',
    expandRow: 'Toggle row details',
    toggleRow: 'Toggle child rows',
    selectGroup: 'Select group',
    toggleGroup: 'Toggle group',
    noMatches: 'No matches',
  },
  eventCalendar: {
    today: 'Today',
    previous: 'Previous',
    next: 'Next',
    month: 'Month',
    week: 'Week',
    day: 'Day',
    time: 'Time',
    allDay: 'All day',
    label: 'Calendar',
    more: '+{{count}} more',
  },
  tour: {
    next: 'Next',
    back: 'Back',
    done: 'Done',
    skip: 'Skip tour',
    progress: 'Step {{current}} of {{total}}',
  },
  transfer: {
    source: 'Available',
    target: 'Selected',
    search: 'Search',
    empty: 'Nothing here',
    toTarget: 'Move to selected',
    toSource: 'Move to available',
    count: '{{checked}} / {{total}}',
  },
  validation: {
    required: 'This field is required.',
    requiredTrue: 'This field must be checked.',
    email: 'Enter a valid email address.',
    minlength: 'Enter at least {{requiredLength}} characters.',
    maxlength: 'Enter at most {{requiredLength}} characters.',
    min: 'Enter {{min}} or more.',
    max: 'Enter {{max}} or less.',
    pattern: 'This value is not in the expected format.',
    noWhitespace: 'This field cannot be blank.',
    hexColor: 'Enter a hex colour, e.g. #1a2b3c.',
    url: 'Enter a valid URL.',
    cardNumber: 'Enter a valid card number.',
    cvc: 'Enter the {{length}}-digit security code.',
    iban: 'Enter a valid IBAN.',
    match: 'The two values do not match.',
    oneOf: 'Choose one of the allowed values.',
    minDate: 'Choose a later date.',
    maxDate: 'Choose an earlier date.',
  },
  select: {
    label: 'Select',
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
    label: 'Command palette',
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
  dialog: {
    close: 'Close dialog',
  },
  // Count-neutral on purpose: `wrInterpolate` does `{{name}}` substitution only,
  // with no plural support, so "Matches available: 1" has to read correctly too.
  mention: {
    listbox: 'Mentions',
    available: 'Matches available: {{count}}',
    inserted: 'Inserted: {{label}}',
  },
  drawer: {
    close: 'Close drawer',
  },
  datePicker: {
    open: 'Open calendar',
    openTime: 'Open time picker',
    openDateTime: 'Open date and time picker',
    openRange: 'Open range calendar',
    rangeStart: 'Range start',
    rangeEnd: 'Range end',
    startTime: 'Start time',
    endTime: 'End time',
  },
  spinner: {
    label: 'Loading',
  },
  rating: {
    label: 'Rating',
  },
  gauge: {
    label: 'Gauge',
  },
  progress: {
    label: 'Progress',
  },
  meterGroup: {
    label: 'Meter',
  },
  knob: {
    label: 'Value',
  },
  speedDial: {
    label: 'Actions',
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
