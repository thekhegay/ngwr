import { type WrI18nCatalog } from 'ngwr/i18n';

/** Base Arabic catalog for ngwr built-in component strings. */
export const wrAr: WrI18nCatalog = {
  common: {
    ok: 'موافق',
    cancel: 'إلغاء',
    close: 'إغلاق',
    confirm: 'تأكيد',
    delete: 'حذف',
    save: 'حفظ',
    edit: 'تعديل',
    add: 'إضافة',
    remove: 'إزالة',
    clear: 'مسح',
    search: 'بحث',
    loading: 'جارٍ التحميل…',
    select: 'تحديد',
    next: 'التالي',
    previous: 'السابق',
    back: 'رجوع',
    today: 'اليوم',
    yesterday: 'أمس',
    tomorrow: 'غدًا',
    of: 'من',
  },
  pagination: {
    prev: 'الصفحة السابقة',
    next: 'الصفحة التالية',
    itemsPerPage: 'عدد العناصر في الصفحة',
    perPage: '{{size}} / صفحة',
    goToPage: 'الانتقال إلى الصفحة {{page}}',
    label: 'ترقيم الصفحات',
    pageOf: 'الصفحة {{current}} من {{total}}',
    range: '{{from}}–{{to}} من {{total}}',
    compact: '{{current}} / {{total}}',
  },
  table: {
    empty: 'لا توجد بيانات',
    loading: 'جارٍ التحميل…',
    sort: 'فرز العمود',
    filter: 'تصفية العمود',
    selectAll: 'تحديد كل الصفوف',
    selectRow: 'تحديد الصف',
    expandRow: 'تبديل تفاصيل الصف',
    toggleRow: 'تبديل الصفوف الفرعية',
    selectGroup: 'تحديد المجموعة',
    toggleGroup: 'تبديل المجموعة',
    noMatches: 'لا توجد نتائج مطابقة',
    search: 'بحث',
    reset: 'إعادة تعيين',
  },
  eventCalendar: {
    today: 'اليوم',
    previous: 'السابق',
    next: 'التالي',
    month: 'شهر',
    week: 'أسبوع',
    day: 'يوم',
    time: 'الوقت',
    allDay: 'طوال اليوم',
    label: 'التقويم',
    more: '+{{count}} أخرى',
    header: '{{month}} {{year}}',
    range: '{{from}} – {{to}}',
    chipLabel: '{{title}}، {{time}}',
    slotLabel: '{{time}} — {{date}}',
    allDayCellLabel: '{{label}} — {{date}}',
  },
  tour: {
    next: 'التالي',
    back: 'السابق',
    done: 'تم',
    skip: 'تخطي الجولة',
    progress: 'الخطوة {{current}} من {{total}}',
  },
  splitter: {
    divider: 'تغيير حجم الأجزاء',
  },
  stepper: {
    optional: 'اختياري',
  },
  transfer: {
    source: 'المتاح',
    target: 'المحدد',
    search: 'بحث',
    empty: 'لا شيء هنا',
    selectAll: 'تحديد الكل',
    toTarget: 'النقل إلى المحدد',
    toSource: 'النقل إلى المتاح',
    count: '{{checked}} / {{total}}',
    selectAllAria: '{{pane}} — {{action}}',
  },
  form: {
    optional: 'اختياري',
  },
  validation: {
    required: 'هذا الحقل مطلوب.',
    requiredTrue: 'يجب تحديد هذا الحقل.',
    email: 'أدخل عنوان بريد إلكتروني صالحًا.',
    minlength: 'الحد الأدنى لعدد الأحرف: {{requiredLength}}.',
    maxlength: 'الحد الأقصى لعدد الأحرف: {{requiredLength}}.',
    min: 'أدخل {{min}} أو أكثر.',
    max: 'أدخل {{max}} أو أقل.',
    pattern: 'هذه القيمة لا تطابق التنسيق المتوقع.',
    noWhitespace: 'لا يمكن أن تحتوي هذه القيمة على مسافات.',
    hexColor: 'أدخل لونًا بالنظام الست عشري، مثل #1a2b3c.',
    url: 'أدخل عنوان URL صالحًا.',
    cardNumber: 'أدخل رقم بطاقة صالحًا.',
    cvc: 'أدخل رمز الأمان (عدد الخانات: {{length}}).',
    iban: 'أدخل رقم IBAN صالحًا.',
    match: 'القيمتان غير متطابقتين.',
    matchFields: 'الحقول غير متطابقة.',
    oneOf: 'اختر إحدى القيم المسموح بها.',
    minDate: 'اختر تاريخًا لاحقًا.',
    maxDate: 'اختر تاريخًا سابقًا.',
  },
  select: {
    // The combobox's own accessible name, also read by `wr-tree` and
    // `wr-cascader`. «تحديد» is the word this catalog uses for marking rows and
    // groups that already exist; picking one value out of a list is «اختيار»,
    // which is also the verb the placeholder «اختر…» below opens with.
    label: 'اختيار',
    placeholder: 'اختر…',
    empty: 'لا توجد خيارات',
    clearSelection: 'مسح التحديد',
    removeItem: 'إزالة {{label}}',
    noResults: 'لا توجد نتائج',
    loading: 'جارٍ التحميل…',
    more: '+{{count}} أخرى',
  },
  // `tree` covers both inline display and combobox-mode pickers
  // (replaces the dropped `treeSelect` namespace).
  tree: {
    expand: 'توسيع',
    collapse: 'طي',
    placeholder: 'اختر…',
    clearSelection: 'مسح التحديد',
    removeItem: 'إزالة {{label}}',
    more: '+{{count}} أخرى',
  },
  commandPalette: {
    label: 'لوحة الأوامر',
    placeholder: 'اكتب أمرًا أو ابحث…',
    noResults: 'لا توجد نتائج',
    loading: 'جارٍ البحث…',
    escHint: 'esc',
  },
  empty: {
    noData: 'لا توجد بيانات',
  },
  fileUpload: {
    browse: 'انقر للاستعراض',
    dropZone: 'أو أفلت الملفات هنا',
    dropZoneLabel: 'منطقة إفلات الملفات — انقر أو أفلت الملفات',
    removeFile: 'إزالة الملف',
    invalid: 'نوع ملف غير مدعوم',
    tooBig: 'حجم الملف كبير جدًا',
    size: '{{value}} {{unit}}',
    unitByte: 'بايت',
    unitKb: 'كيلوبايت',
    unitMb: 'ميجابايت',
    unitGb: 'جيجابايت',
    unitTb: 'تيرابايت',
  },
  popconfirm: {
    label: 'تأكيد الإجراء',
    confirm: 'تأكيد',
    cancel: 'إلغاء',
  },
  toast: {
    region: 'الإشعارات',
    close: 'إغلاق',
    copy: 'نسخ',
    copied: 'تم النسخ',
    closeAll: 'إغلاق الكل',
  },
  input: {
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
  },
  inputNumber: {
    increment: 'زيادة',
    decrement: 'إنقاص',
  },
  inputOtp: {
    label: 'رمز التحقق',
    digit: 'الرقم {{index}}',
    character: 'الحرف {{index}}',
  },
  anchor: {
    label: 'جدول المحتويات',
  },
  avatar: {
    alt: 'الصورة الرمزية',
  },
  backTop: {
    label: 'العودة إلى الأعلى',
  },
  breadcrumbs: {
    label: 'مسار التنقل',
  },
  burger: {
    label: 'تبديل القائمة',
  },
  calendar: {
    prevMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',
    prevYear: 'السنة السابقة',
    nextYear: 'السنة التالية',
    // The month / year pickers are `role="listbox"`, and a listbox owes a
    // name — without one a screen reader announces the control as nothing at
    // all. Caught by `check:state-a11y` once a state finally opened the view.
    monthList: 'الأشهر',
    yearList: 'السنوات',
    prevYears: '12 سنة سابقة',
    nextYears: '12 سنة تالية',
    header: '{{month}} {{year}}',
    yearRange: '{{from}} – {{to}}',
    dayLabel: '{{weekday}}، {{date}}',
  },
  imageCropper: {
    empty: 'لا توجد صورة',
    window: 'منطقة الاقتصاص',
    keyHelp:
      'مفاتيح الأسهم تحرّك منطقة الاقتصاص. اضغط باستمرار على Alt مع أحد مفاتيح الأسهم لتغيير حجمها، وعلى Shift لخطوات أكبر. ' +
      'يُعلن عن المنطقة بقيم اليسار والأعلى والعرض والارتفاع بالبكسل داخل الصورة.',
  },
  sortableList: {
    keyHelp:
      'اضغط مفتاح المسافة لالتقاط هذا العنصر، ثم استخدم مفاتيح الأسهم لتحريكه. ' +
      'اضغط مفتاح المسافة مرة أخرى لإفلاته، أو Escape لإعادته إلى مكانه.',
    grabbed: 'تم الالتقاط. {{index}} من {{total}}.',
    moved: '{{index}} من {{total}}.',
    dropped: 'تم الإفلات. {{index}} من {{total}}.',
    cancelled: 'تم إلغاء النقل.',
  },
  colorPicker: {
    area: 'التشبع والسطوع، {{saturation}}% و{{brightness}}%',
    hue: 'درجة اللون',
    alpha: 'العتامة',
    formatHex: 'HEX',
    formatRgb: 'RGB',
    formatHsl: 'HSL',
    channelHex: 'HEX',
    channelRed: 'R',
    channelGreen: 'G',
    channelBlue: 'B',
    channelHue: 'H',
    channelSaturation: 'S%',
    channelLightness: 'L%',
    channelAlpha: 'A%',
  },
  calendarHeatmap: {
    label: 'خريطة حرارية للتقويم',
  },
  lineChart: {
    label: 'مخطط خطي',
    // The one counted string that cannot dodge the noun — it IS the noun. Arabic
    // wants «آلاف» from three to ten and «ألف» from eleven up, and one axis
    // carries ticks from both ranges. «ألف» invariant is what Arabic analytics
    // UIs print, and it is the correct form for the large ticks that are the
    // reason to abbreviate at all.
    thousands: '{{value}} ألف',
  },
  donutChart: {
    label: 'مخطط دائري مجوف',
  },
  compare: {
    label: 'فاصل المقارنة',
  },
  // The two `roledescription` values are spoken INSTEAD of the role name, so they
  // are bare nouns. Arabic has no letter case, so English's lowercase rule has no
  // counterpart here — what carries it is dropping the definite article.
  carousel: {
    label: 'العرض الدوّار',
    goToSlide: 'الانتقال إلى الشريحة {{index}}',
    prev: 'الشريحة السابقة',
    next: 'الشريحة التالية',
    pagination: 'ترقيم شرائح العرض الدوّار',
    roledescription: 'عرض دوّار',
    slideRoledescription: 'شريحة',
  },
  actionSheet: {
    label: 'الإجراءات',
  },
  alert: {
    close: 'إغلاق التنبيه',
  },
  qr: {
    label: 'رمز QR',
  },
  image: {
    viewer: 'معاينة الصورة',
    open: 'فتح المعاينة',
    close: 'إغلاق المعاينة',
  },
  window: {
    close: 'إغلاق',
    minimize: 'تصغير',
    maximize: 'تكبير',
    restore: 'استعادة',
    restoreDown: 'استعادة لأسفل',
    restoreWindow: 'استعادة {{title}}',
    closeWindow: 'إغلاق النافذة',
    untitled: 'بلا عنوان',
    taskbar: 'النوافذ المصغّرة',
  },
  dialog: {
    close: 'إغلاق مربع الحوار',
  },
  // Deliberately generic: a popover panel has no universal name, and an unnamed
  // `role="dialog"` announces as nothing at all. Override per instance with
  // `[ariaLabel]`.
  popover: {
    label: 'لوحة منبثقة',
  },
  markdown: {
    copy: 'نسخ الكود',
    copied: 'تم النسخ',
    taskDone: 'تم:',
    taskTodo: 'لم يتم:',
  },
  // Arabic inflects a counted noun differently at one, at two, at three-to-ten
  // and at eleven-and-up, and the interpolator has no plural machinery — so a
  // string that counts ITEMS here does one of two things rather than write
  // "{{count}} <noun>" and be wrong at most counts. Either the number goes LAST,
  // after a colon, so no noun has to agree with it (`mention.available`,
  // `validation.minlength` / `.maxlength` / `.cvc`), or the noun is dropped: the
  // overflow chips in `select`, `tree` and `eventCalendar` read
  // «+{{count}} أخرى», the invariable feminine-singular form a non-human plural
  // takes, leaving nothing for the count to inflect. `lineChart.thousands` is
  // the one string that can do neither, and the note there says why.
  marquee: {
    label: 'شريط متحرك',
    link: 'رابط',
  },
  mention: {
    listbox: 'الإشارات',
    available: 'المطابقات المتاحة: {{count}}',
    inserted: 'تم الإدراج: {{label}}',
  },
  drawer: {
    close: 'إغلاق اللوحة',
  },
  datePicker: {
    open: 'فتح التقويم',
    openTime: 'فتح منتقي الوقت',
    openDateTime: 'فتح منتقي التاريخ والوقت',
    openRange: 'فتح تقويم الفترة',
    panel: 'اختيار التاريخ',
    panelTime: 'اختيار الوقت',
    panelDateTime: 'اختيار التاريخ والوقت',
    panelRange: 'اختيار الفترة',
    panelRangeDateTime: 'اختيار الفترة بالتاريخ والوقت',
    rangeStart: 'بداية الفترة',
    rangeEnd: 'نهاية الفترة',
    startTime: 'وقت البدء',
    endTime: 'وقت الانتهاء',
    hours: 'الساعات',
    minutes: 'الدقائق',
    seconds: 'الثواني',
    incrementHours: 'زيادة الساعات',
    decrementHours: 'إنقاص الساعات',
    incrementMinutes: 'زيادة الدقائق',
    decrementMinutes: 'إنقاص الدقائق',
    incrementSeconds: 'زيادة الثواني',
    decrementSeconds: 'إنقاص الثواني',
    toggleAmPm: 'تبديل ص / م',
    am: 'ص',
    pm: 'م',
  },
  sidebar: {
    label: 'الشريط الجانبي',
  },
  spinner: {
    label: 'جارٍ التحميل',
  },
  rating: {
    label: 'التقييم',
  },
  gauge: {
    label: 'عداد',
  },
  progress: {
    label: 'التقدم',
  },
  meterGroup: {
    label: 'مقياس',
  },
  knob: {
    label: 'القيمة',
  },
  slider: {
    label: 'القيمة',
    lower: 'القيمة الدنيا',
    upper: 'القيمة العليا',
  },
  speedDial: {
    label: 'الإجراءات',
  },
  statistic: {
    delta: '{{value}}{{suffix}}',
    deltaSuffix: '%',
  },
  result: {
    notFound: 'عذرًا، الصفحة التي زرتها غير موجودة.',
    forbidden: 'عذرًا، ليس لديك إذن بالوصول إلى هذه الصفحة.',
    serverError: 'عذرًا، حدث خطأ ما.',
  },
  date: {
    months: {
      jan: 'يناير',
      feb: 'فبراير',
      mar: 'مارس',
      apr: 'أبريل',
      may: 'مايو',
      jun: 'يونيو',
      jul: 'يوليو',
      aug: 'أغسطس',
      sep: 'سبتمبر',
      oct: 'أكتوبر',
      nov: 'نوفمبر',
      dec: 'ديسمبر',
    },
  },
};
