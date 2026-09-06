import { type WrI18nCatalog } from 'ngwr/i18n';

/** Base Ukrainian catalog for ngwr built-in component strings. */
export const wrUk: WrI18nCatalog = {
  common: {
    ok: 'OK',
    cancel: 'Скасувати',
    close: 'Закрити',
    confirm: 'Підтвердити',
    delete: 'Видалити',
    save: 'Зберегти',
    edit: 'Редагувати',
    add: 'Додати',
    remove: 'Вилучити',
    clear: 'Очистити',
    search: 'Пошук',
    loading: 'Завантаження…',
    select: 'Вибрати',
    next: 'Далі',
    // `previous` and `back` are separate words in English and separate words
    // here: `common.*` is vocabulary offered to consumers with no component
    // rendering it, so collapsing both onto «Назад» would hand back one word
    // where two were asked for.
    previous: 'Попередній',
    back: 'Назад',
    today: 'Сьогодні',
    yesterday: 'Учора',
    tomorrow: 'Завтра',
    of: 'з',
  },
  pagination: {
    prev: 'Попередня сторінка',
    next: 'Наступна сторінка',
    itemsPerPage: 'Записів на сторінці',
    perPage: '{{size}} / стор.',
    goToPage: 'Перейти до сторінки {{page}}',
    label: 'Нумерація сторінок',
    pageOf: 'Сторінка {{current}} з {{total}}',
    range: '{{from}}–{{to}} з {{total}}',
    compact: '{{current}} / {{total}}',
  },
  table: {
    empty: 'Немає даних',
    loading: 'Завантаження…',
    sort: 'Сортувати стовпець',
    filter: 'Фільтрувати стовпець',
    selectAll: 'Вибрати всі рядки',
    selectRow: 'Вибрати рядок',
    expandRow: 'Показати деталі рядка',
    toggleRow: 'Показати вкладені рядки',
    selectGroup: 'Вибрати групу',
    // The two above name what the control REACHES — the details, the child
    // rows — which is why they survive both states. A group band has no such
    // noun to reach for, so a one-directional «Згорнути групу» is what gets
    // read out over a group that is already collapsed. Both directions, then.
    toggleGroup: 'Згорнути або розгорнути групу',
    noMatches: 'Нічого не знайдено',
    search: 'Пошук',
    reset: 'Скинути',
  },
  eventCalendar: {
    today: 'Сьогодні',
    previous: 'Назад',
    next: 'Вперед',
    month: 'Місяць',
    week: 'Тиждень',
    day: 'День',
    time: 'Час',
    allDay: 'Весь день',
    label: 'Календар',
    more: 'ще {{count}}',
    header: '{{month}} {{year}}',
    range: '{{from}} – {{to}}',
    chipLabel: '{{title}}, {{time}}',
    slotLabel: '{{time}} — {{date}}',
    allDayCellLabel: '{{label}} — {{date}}',
  },
  tour: {
    next: 'Далі',
    back: 'Назад',
    done: 'Готово',
    skip: 'Пропустити тур',
    progress: 'Крок {{current}} з {{total}}',
  },
  splitter: {
    divider: 'Змінити розмір панелей',
  },
  stepper: {
    optional: 'необов’язково',
  },
  transfer: {
    source: 'Доступні',
    target: 'Вибрані',
    search: 'Пошук',
    empty: 'Порожньо',
    selectAll: 'Вибрати всі',
    toTarget: 'Перенести до вибраних',
    toSource: 'Повернути до доступних',
    count: '{{checked}} / {{total}}',
  },
  form: {
    optional: 'необов’язково',
  },
  validation: {
    required: 'Обов’язкове поле.',
    requiredTrue: 'Це поле потрібно позначити.',
    email: 'Введіть коректну електронну адресу.',
    minlength: 'Мінімальна довжина: {{requiredLength}}.',
    maxlength: 'Максимальна довжина: {{requiredLength}}.',
    min: 'Не менше {{min}}.',
    max: 'Не більше {{max}}.',
    pattern: 'Значення не відповідає формату.',
    noWhitespace: 'Значення не може містити пробілів.',
    hexColor: 'Введіть колір у форматі #1a2b3c.',
    url: 'Введіть коректну URL-адресу.',
    cardNumber: 'Введіть коректний номер картки.',
    cvc: 'Введіть {{length}}-значний код безпеки.',
    iban: 'Введіть коректний IBAN.',
    match: 'Значення не збігаються.',
    matchFields: 'Значення полів не збігаються.',
    oneOf: 'Виберіть одне з допустимих значень.',
    minDate: 'Виберіть пізнішу дату.',
    maxDate: 'Виберіть ранішу дату.',
  },
  select: {
    label: 'Вибрати',
    placeholder: 'Виберіть…',
    empty: 'Немає варіантів',
    clearSelection: 'Очистити вибір',
    removeItem: 'Вилучити {{label}}',
    noResults: 'Нічого не знайдено',
    loading: 'Завантаження…',
    more: 'ще {{count}}',
  },
  // `tree` covers both inline display and combobox-mode pickers
  // (replaces the dropped `treeSelect` namespace).
  tree: {
    expand: 'Розгорнути',
    collapse: 'Згорнути',
    placeholder: 'Виберіть…',
    clearSelection: 'Очистити вибір',
    removeItem: 'Вилучити {{label}}',
    more: 'ще {{count}}',
  },
  commandPalette: {
    label: 'Палітра команд',
    placeholder: 'Введіть команду або запит…',
    noResults: 'Нічого не знайдено',
    loading: 'Триває пошук…',
    escHint: 'esc',
  },
  empty: {
    noData: 'Немає даних',
  },
  fileUpload: {
    browse: 'Натисніть, щоб вибрати',
    dropZone: 'або перетягніть файли сюди',
    dropZoneLabel: 'Зона завантаження файлів — натисніть або перетягніть',
    removeFile: 'Вилучити файл',
    invalid: 'Тип файлу не підтримується',
    tooBig: 'Файл завеликий',
    size: '{{value}} {{unit}}',
    unitByte: 'Б',
    unitKb: 'КБ',
    unitMb: 'МБ',
    unitGb: 'ГБ',
    unitTb: 'ТБ',
  },
  popconfirm: {
    label: 'Підтвердження дії',
    confirm: 'Підтвердити',
    cancel: 'Скасувати',
  },
  toast: {
    region: 'Сповіщення',
    close: 'Закрити',
    copy: 'Копіювати',
    copied: 'Скопійовано',
    closeAll: 'Закрити всі',
  },
  input: {
    showPassword: 'Показати пароль',
    hidePassword: 'Приховати пароль',
  },
  inputNumber: {
    increment: 'Збільшити',
    decrement: 'Зменшити',
  },
  inputOtp: {
    label: 'Код підтвердження',
    digit: 'Цифра {{index}}',
    character: 'Символ {{index}}',
  },
  anchor: {
    label: 'Зміст',
  },
  avatar: {
    alt: 'Аватар',
  },
  backTop: {
    label: 'Нагору',
  },
  breadcrumbs: {
    label: 'Навігаційний ланцюжок',
  },
  burger: {
    label: 'Перемкнути меню',
  },
  calendar: {
    prevMonth: 'Попередній місяць',
    nextMonth: 'Наступний місяць',
    prevYear: 'Попередній рік',
    nextYear: 'Наступний рік',
    // The month / year pickers are `role="listbox"`, and a listbox owes a
    // name — without one a screen reader announces the control as nothing at
    // all. Caught by `check:state-a11y` once a state finally opened the view.
    monthList: 'Місяці',
    yearList: 'Роки',
    prevYears: 'Попередні 12 років',
    nextYears: 'Наступні 12 років',
    header: '{{month}} {{year}}',
    yearRange: '{{from}} – {{to}}',
    dayLabel: '{{weekday}}, {{date}}',
  },
  imageCropper: {
    empty: 'Немає зображення',
    window: 'Область обрізки',
    keyHelp:
      'Стрілки переміщують область обрізки. Alt зі стрілкою змінює її розмір, Shift збільшує крок. ' +
      'Область озвучується як відступ ліворуч, відступ згори, ширина та висота в пікселях зображення.',
  },
  sortableList: {
    keyHelp:
      'Натисніть пробіл, щоб узяти елемент, потім переміщуйте його стрілками. ' +
      'Пробіл ще раз — відпустити, Escape — повернути на місце.',
    grabbed: 'Взято. {{index}} з {{total}}.',
    moved: '{{index}} з {{total}}.',
    dropped: 'Відпущено. {{index}} з {{total}}.',
    cancelled: 'Переміщення скасовано.',
  },
  colorPicker: {
    area: 'Насиченість і яскравість, {{saturation}}% і {{brightness}}%',
    hue: 'Відтінок',
    alpha: 'Непрозорість',
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
    label: 'Календарна теплова карта',
  },
  lineChart: {
    label: 'Лінійний графік',
    thousands: '{{value}} тис.',
  },
  donutChart: {
    label: 'Кільцева діаграма',
  },
  compare: {
    label: 'Роздільник порівняння',
  },
  // Два `roledescription` вимовляються ЗАМІСТЬ назви ролі, тож це іменники з
  // малої літери — «карусель», «слайд», — а не підписи з великої, як вище.
  carousel: {
    label: 'Карусель',
    goToSlide: 'Перейти до слайда {{index}}',
    prev: 'Попередній слайд',
    next: 'Наступний слайд',
    pagination: 'Нумерація слайдів',
    roledescription: 'карусель',
    slideRoledescription: 'слайд',
  },
  actionSheet: {
    label: 'Дії',
  },
  alert: {
    close: 'Закрити оповіщення',
  },
  qr: {
    label: 'QR-код',
  },
  image: {
    viewer: 'Перегляд зображення',
    open: 'Відкрити перегляд',
    close: 'Закрити перегляд',
  },
  window: {
    close: 'Закрити',
    minimize: 'Згорнути',
    maximize: 'Розгорнути',
    restore: 'Відновити',
    restoreDown: 'Відновити розмір',
    restoreWindow: 'Відновити {{title}}',
    closeWindow: 'Закрити вікно',
    untitled: 'Без назви',
    taskbar: 'Згорнуті вікна',
  },
  dialog: {
    close: 'Закрити діалогове вікно',
  },
  // Навмисно узагальнено: панель поповера не має універсальної назви, а
  // `role="dialog"` без імені не озвучується взагалі. Перевизначається на місці
  // через `[ariaLabel]`.
  popover: {
    label: 'Спливна панель',
  },
  markdown: {
    copy: 'Копіювати код',
    copied: 'Скопійовано',
    taskDone: 'Виконано:',
    taskTodo: 'Не виконано:',
  },
  // Іменник попереду — «Вставлено: Ада», а не «Ада вставлена»: рід імені
  // наперед невідомий, а інтерполятор узгоджувати його не вміє. З тієї ж
  // причини лічильник без відмінювання — форм множини в ньому немає.
  marquee: {
    label: 'Рухомий рядок',
    link: 'посилання',
  },
  mention: {
    listbox: 'Згадки',
    available: 'Знайдено збігів: {{count}}',
    inserted: 'Вставлено: {{label}}',
  },
  drawer: {
    close: 'Закрити панель',
  },
  datePicker: {
    open: 'Відкрити календар',
    openTime: 'Відкрити вибір часу',
    openDateTime: 'Відкрити вибір дати й часу',
    openRange: 'Відкрити календар періоду',
    panel: 'Вибір дати',
    panelTime: 'Вибір часу',
    panelDateTime: 'Вибір дати й часу',
    panelRange: 'Вибір періоду',
    panelRangeDateTime: 'Вибір періоду й часу',
    rangeStart: 'Початок періоду',
    rangeEnd: 'Кінець періоду',
    startTime: 'Час початку',
    endTime: 'Час завершення',
    hours: 'Години',
    minutes: 'Хвилини',
    seconds: 'Секунди',
    incrementHours: 'Збільшити години',
    decrementHours: 'Зменшити години',
    incrementMinutes: 'Збільшити хвилини',
    decrementMinutes: 'Зменшити хвилини',
    incrementSeconds: 'Збільшити секунди',
    decrementSeconds: 'Зменшити секунди',
    toggleAmPm: 'Перемкнути ДП / ПП',
    am: 'ДП',
    pm: 'ПП',
  },
  sidebar: {
    label: 'Бічна панель',
  },
  spinner: {
    label: 'Завантаження',
  },
  rating: {
    label: 'Оцінка',
  },
  gauge: {
    label: 'Індикатор',
  },
  progress: {
    label: 'Хід виконання',
  },
  meterGroup: {
    label: 'Шкала',
  },
  knob: {
    label: 'Значення',
  },
  slider: {
    label: 'Значення',
    lower: 'Нижнє значення',
    upper: 'Верхнє значення',
  },
  speedDial: {
    label: 'Дії',
  },
  statistic: {
    delta: '{{value}}{{suffix}}',
    deltaSuffix: '%',
  },
  result: {
    notFound: 'Вибачте, такої сторінки не існує.',
    forbidden: 'Вибачте, у вас немає доступу до цієї сторінки.',
    serverError: 'Вибачте, щось пішло не так.',
  },
  date: {
    months: {
      jan: 'Січень',
      feb: 'Лютий',
      mar: 'Березень',
      apr: 'Квітень',
      may: 'Травень',
      jun: 'Червень',
      jul: 'Липень',
      aug: 'Серпень',
      sep: 'Вересень',
      oct: 'Жовтень',
      nov: 'Листопад',
      dec: 'Грудень',
    },
  },
};
