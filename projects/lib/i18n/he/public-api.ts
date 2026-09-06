import { type WrI18nCatalog } from 'ngwr/i18n';

/** Base Hebrew catalog for ngwr built-in component strings. */
export const wrHe: WrI18nCatalog = {
  common: {
    ok: 'אישור',
    cancel: 'ביטול',
    close: 'סגירה',
    confirm: 'אישור',
    delete: 'מחיקה',
    save: 'שמירה',
    edit: 'עריכה',
    add: 'הוספה',
    remove: 'הסרה',
    clear: 'ניקוי',
    search: 'חיפוש',
    loading: 'טוען…',
    select: 'בחירה',
    next: 'הבא',
    previous: 'הקודם',
    back: 'חזרה',
    today: 'היום',
    yesterday: 'אתמול',
    tomorrow: 'מחר',
    of: 'מתוך',
  },
  pagination: {
    prev: 'העמוד הקודם',
    next: 'העמוד הבא',
    itemsPerPage: 'פריטים בעמוד',
    perPage: '{{size}} / עמוד',
    goToPage: 'מעבר לעמוד {{page}}',
    label: 'ניווט בין עמודים',
    pageOf: 'עמוד {{current}} מתוך {{total}}',
    range: '{{from}}–{{to}} מתוך {{total}}',
    compact: '{{current}} / {{total}}',
  },
  // ארבע התוויות שבאנגלית מתחילות ב-Toggle יושבות על כפתור שמפרסם `aria-expanded`,
  // ולכן «הצגת…» לבדה סותרת את המצב שמוכרז בחצי מהמקרים. «הצגה או הסתרה של…» היא
  // הצורה העברית שמכסה את שני הכיוונים; אותו שיקול חל על `burger.label`.
  table: {
    empty: 'אין נתונים',
    loading: 'טוען…',
    sort: 'מיון עמודה',
    filter: 'סינון עמודה',
    selectAll: 'בחירת כל השורות',
    selectRow: 'בחירת שורה',
    expandRow: 'הצגה או הסתרה של פרטי השורה',
    toggleRow: 'הצגה או הסתרה של שורות המשנה',
    selectGroup: 'בחירת קבוצה',
    toggleGroup: 'הצגה או הסתרה של הקבוצה',
    noMatches: 'אין תוצאות',
    search: 'חיפוש',
    reset: 'איפוס',
  },
  eventCalendar: {
    today: 'היום',
    previous: 'הקודם',
    next: 'הבא',
    month: 'חודש',
    week: 'שבוע',
    day: 'יום',
    time: 'שעה',
    allDay: 'כל היום',
    label: 'לוח שנה',
    more: 'עוד {{count}}',
    header: '{{month}} {{year}}',
    range: '{{from}} – {{to}}',
    chipLabel: '{{title}}, {{time}}',
    slotLabel: '{{time}} — {{date}}',
    allDayCellLabel: '{{label}} — {{date}}',
  },
  tour: {
    next: 'הבא',
    back: 'חזרה',
    done: 'סיום',
    skip: 'דילוג על הסיור',
    progress: 'שלב {{current}} מתוך {{total}}',
  },
  splitter: {
    divider: 'שינוי גודל החלוניות',
  },
  stepper: {
    optional: 'רשות',
  },
  transfer: {
    source: 'זמינים',
    target: 'נבחרים',
    search: 'חיפוש',
    empty: 'אין פריטים',
    selectAll: 'בחירת הכול',
    toTarget: 'העברה לנבחרים',
    toSource: 'העברה לזמינים',
    count: '{{checked}} / {{total}}',
  },
  form: {
    optional: 'רשות',
  },
  validation: {
    required: 'שדה חובה.',
    requiredTrue: 'יש לסמן את השדה.',
    email: 'יש להזין כתובת אימייל תקינה.',
    minlength: 'מספר התווים המינימלי: {{requiredLength}}.',
    maxlength: 'מספר התווים המקסימלי: {{requiredLength}}.',
    min: 'יש להזין {{min}} או יותר.',
    max: 'יש להזין {{max}} או פחות.',
    pattern: 'הערך אינו בתבנית הנדרשת.',
    noWhitespace: 'הערך אינו יכול להכיל רווחים.',
    hexColor: 'יש להזין צבע בפורמט HEX, למשל #1a2b3c.',
    url: 'יש להזין כתובת אינטרנט תקינה.',
    cardNumber: 'יש להזין מספר כרטיס תקין.',
    cvc: 'יש להזין קוד אבטחה באורך {{length}}.',
    iban: 'יש להזין IBAN תקין.',
    match: 'שני הערכים אינם זהים.',
    matchFields: 'הערכים בשדות אינם זהים.',
    oneOf: 'יש לבחור אחד מהערכים המותרים.',
    minDate: 'יש לבחור תאריך מאוחר יותר.',
    maxDate: 'יש לבחור תאריך מוקדם יותר.',
  },
  select: {
    label: 'בחירה',
    placeholder: 'בחירה…',
    empty: 'אין אפשרויות',
    clearSelection: 'ניקוי הבחירה',
    removeItem: 'הסרת {{label}}',
    noResults: 'אין תוצאות',
    loading: 'טוען…',
    more: 'עוד {{count}}',
  },
  // `tree` covers both inline display and combobox-mode pickers
  // (replaces the dropped `treeSelect` namespace).
  tree: {
    expand: 'הרחבה',
    collapse: 'כיווץ',
    placeholder: 'בחירה…',
    clearSelection: 'ניקוי הבחירה',
    removeItem: 'הסרת {{label}}',
    more: 'עוד {{count}}',
  },
  commandPalette: {
    label: 'לוח פקודות',
    placeholder: 'הקלידו פקודה או מונח חיפוש…',
    noResults: 'אין תוצאות',
    loading: 'מחפש…',
    escHint: 'esc',
  },
  empty: {
    noData: 'אין נתונים',
  },
  fileUpload: {
    browse: 'לחצו לבחירת קובץ',
    dropZone: 'או גררו קבצים לכאן',
    dropZoneLabel: 'אזור העלאת קבצים — לחיצה או גרירת קבצים',
    removeFile: 'הסרת הקובץ',
    invalid: 'סוג קובץ לא נתמך',
    tooBig: 'הקובץ גדול מדי',
    size: '{{value}} {{unit}}',
    // יחידות הגודל נכתבות באותיות לטיניות, כמו ב-CLDR של עברית וכמו בכל מערכת
    // הפעלה בעברית — «12.4 MB», לא «12.4 מ״ב». רק «בייט» מתורגם, וגם זו הצורה
    // ש-CLDR נותן.
    unitByte: 'בייט',
    unitKb: 'KB',
    unitMb: 'MB',
    unitGb: 'GB',
    unitTb: 'TB',
  },
  popconfirm: {
    label: 'אישור פעולה',
    confirm: 'אישור',
    cancel: 'ביטול',
  },
  toast: {
    region: 'התראות',
    close: 'סגירה',
    copy: 'העתקה',
    copied: 'הועתק',
    closeAll: 'סגירת הכול',
  },
  input: {
    showPassword: 'הצגת הסיסמה',
    hidePassword: 'הסתרת הסיסמה',
  },
  inputNumber: {
    increment: 'הגדלה',
    decrement: 'הקטנה',
  },
  inputOtp: {
    label: 'קוד אימות',
    digit: 'ספרה {{index}}',
    character: 'תו {{index}}',
  },
  anchor: {
    label: 'תוכן העניינים',
  },
  avatar: {
    alt: 'תמונת פרופיל',
  },
  backTop: {
    label: 'חזרה למעלה',
  },
  // «נתיב ניווט», לא «פירורי לחם»: זהו שם נגיש שמוקרא בקול, והתרגום המילולי נשמע
  // כפירורים של לחם ממש.
  breadcrumbs: {
    label: 'נתיב ניווט',
  },
  burger: {
    label: 'הצגה או הסתרה של התפריט',
  },
  calendar: {
    prevMonth: 'החודש הקודם',
    nextMonth: 'החודש הבא',
    prevYear: 'השנה הקודמת',
    nextYear: 'השנה הבאה',
    // The month / year pickers are `role="listbox"`, and a listbox owes a
    // name — without one a screen reader announces the control as nothing at
    // all. Caught by `check:state-a11y` once a state finally opened the view.
    monthList: 'חודשים',
    yearList: 'שנים',
    prevYears: '12 השנים הקודמות',
    nextYears: '12 השנים הבאות',
    header: '{{month}} {{year}}',
    yearRange: '{{from}} – {{to}}',
    dayLabel: '{{weekday}}, {{date}}',
  },
  imageCropper: {
    empty: 'אין תמונה',
    window: 'אזור החיתוך',
    keyHelp:
      'מקשי החיצים מזיזים את אזור החיתוך. Alt עם מקש חץ משנה את גודלו, ו-Shift מגדיל את הצעד. ' +
      'אזור החיתוך מוכרז כמרחק משמאל, מרחק מלמעלה, רוחב וגובה בפיקסלים של התמונה.',
  },
  sortableList: {
    keyHelp:
      'לחיצה על מקש הרווח מרימה את הפריט, ואז מקשי החיצים מזיזים אותו. ' +
      'רווח נוסף מניח אותו, ו-Escape מחזיר אותו למקומו.',
    grabbed: 'הורם. {{index}} מתוך {{total}}.',
    moved: '{{index}} מתוך {{total}}.',
    dropped: 'הונח. {{index}} מתוך {{total}}.',
    cancelled: 'ההזזה בוטלה.',
  },
  colorPicker: {
    area: 'רוויה ובהירות, {{saturation}}% ו-{{brightness}}%',
    hue: 'גוון',
    alpha: 'אטימות',
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
    label: 'מפת חום לפי תאריכים',
  },
  lineChart: {
    label: 'תרשים קווים',
    // «אלף» אינו מתאים את עצמו למספר שלפניו: זו בדיוק הצורה ש-CLDR של עברית נותן
    // לכל קטגוריית ריבוי («1 אלף», «2 אלף», «5 אלף»), ולכן היא נכונה בכל ערך.
    thousands: '{{value}} אלף',
  },
  donutChart: {
    label: 'תרשים טבעת',
  },
  compare: {
    label: 'מפריד ההשוואה',
  },
  // שני ערכי `roledescription` נאמרים במקום שם התפקיד, ולכן הם שמות עצם פשוטים —
  // «קרוסלה», «שקופית» — ולא תוויות כמו אלה שמעליהם. בעברית אין אותיות רישיות,
  // אז ההבדל נשמר בניסוח בלבד.
  carousel: {
    label: 'קרוסלה',
    goToSlide: 'מעבר לשקופית {{index}}',
    prev: 'השקופית הקודמת',
    next: 'השקופית הבאה',
    pagination: 'ניווט בין שקופיות',
    roledescription: 'קרוסלה',
    slideRoledescription: 'שקופית',
  },
  actionSheet: {
    label: 'פעולות',
  },
  alert: {
    close: 'סגירת ההתראה',
  },
  qr: {
    label: 'קוד QR',
  },
  image: {
    viewer: 'תצוגה מקדימה של התמונה',
    open: 'פתיחת התצוגה המקדימה',
    close: 'סגירת התצוגה המקדימה',
  },
  window: {
    close: 'סגירה',
    minimize: 'מזעור',
    maximize: 'הגדלה',
    restore: 'שחזור',
    restoreDown: 'שחזור הגודל',
    restoreWindow: 'שחזור {{title}}',
    closeWindow: 'סגירת החלון',
    untitled: 'ללא שם',
    taskbar: 'חלונות ממוזערים',
  },
  dialog: {
    close: 'סגירת תיבת הדו-שיח',
  },
  // בכוונה כללי: לחלונית מוקפצת אין שם אוניברסלי, ו-`role="dialog"` בלי שם אינו
  // מוכרז כלל. אפשר לדרוס לכל מופע דרך `[ariaLabel]`.
  popover: {
    label: 'חלונית קופצת',
  },
  markdown: {
    copy: 'העתקת הקוד',
    copied: 'הועתק',
    taskDone: 'בוצע:',
    taskTodo: 'לביצוע:',
  },
  marquee: {
    label: 'כתובית נעה',
    link: 'קישור',
  },
  // שם העצם קודם — «נוסף: אדה», ולא «אדה נוספה»: מין השם אינו ידוע מראש,
  // והאינטרפולטור אינו יודע להתאים אותו. מאותה סיבה המונה מנוסח בלי צורת רבים,
  // כדי שגם «התאמות שנמצאו: 1» ייקרא נכון.
  mention: {
    listbox: 'אזכורים',
    available: 'התאמות שנמצאו: {{count}}',
    inserted: 'נוסף: {{label}}',
  },
  drawer: {
    close: 'סגירת המגירה',
  },
  datePicker: {
    open: 'פתיחת לוח השנה',
    openTime: 'פתיחת בורר השעה',
    openDateTime: 'פתיחת בורר התאריך והשעה',
    openRange: 'פתיחת לוח השנה לבחירת טווח',
    panel: 'בחירת תאריך',
    panelTime: 'בחירת שעה',
    panelDateTime: 'בחירת תאריך ושעה',
    panelRange: 'בחירת טווח תאריכים',
    panelRangeDateTime: 'בחירת טווח תאריכים ושעות',
    rangeStart: 'תחילת הטווח',
    rangeEnd: 'סוף הטווח',
    startTime: 'שעת ההתחלה',
    endTime: 'שעת הסיום',
    hours: 'שעות',
    minutes: 'דקות',
    seconds: 'שניות',
    incrementHours: 'הגדלת השעות',
    decrementHours: 'הקטנת השעות',
    incrementMinutes: 'הגדלת הדקות',
    decrementMinutes: 'הקטנת הדקות',
    incrementSeconds: 'הגדלת השניות',
    decrementSeconds: 'הקטנת השניות',
    toggleAmPm: 'החלפה בין לפנה״צ לאחה״צ',
    am: 'לפנה״צ',
    pm: 'אחה״צ',
  },
  sidebar: {
    label: 'סרגל צד',
  },
  spinner: {
    label: 'טוען',
  },
  rating: {
    label: 'דירוג',
  },
  gauge: {
    label: 'מחוון',
  },
  progress: {
    label: 'התקדמות',
  },
  meterGroup: {
    label: 'מד',
  },
  knob: {
    label: 'ערך',
  },
  slider: {
    label: 'ערך',
    lower: 'ערך תחתון',
    upper: 'ערך עליון',
  },
  speedDial: {
    label: 'פעולות',
  },
  statistic: {
    delta: '{{value}}{{suffix}}',
    deltaSuffix: '%',
  },
  result: {
    notFound: 'מצטערים, העמוד שחיפשתם אינו קיים.',
    forbidden: 'מצטערים, אין לכם הרשאה לגשת לעמוד הזה.',
    serverError: 'מצטערים, משהו השתבש.',
  },
  date: {
    months: {
      jan: 'ינואר',
      feb: 'פברואר',
      mar: 'מרץ',
      apr: 'אפריל',
      may: 'מאי',
      jun: 'יוני',
      jul: 'יולי',
      aug: 'אוגוסט',
      sep: 'ספטמבר',
      oct: 'אוקטובר',
      nov: 'נובמבר',
      dec: 'דצמבר',
    },
  },
};
