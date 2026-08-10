import { type WrI18nCatalog } from 'ngwr/i18n';

/** Base Russian catalog for ngwr built-in component strings. */
export const wrRu: WrI18nCatalog = {
  common: {
    ok: 'OK',
    cancel: 'Отмена',
    close: 'Закрыть',
    confirm: 'Подтвердить',
    delete: 'Удалить',
    save: 'Сохранить',
    edit: 'Изменить',
    add: 'Добавить',
    remove: 'Удалить',
    clear: 'Очистить',
    search: 'Поиск',
    loading: 'Загрузка…',
    select: 'Выбрать',
    next: 'Далее',
    previous: 'Назад',
    back: 'Назад',
    today: 'Сегодня',
    yesterday: 'Вчера',
    tomorrow: 'Завтра',
    of: 'из',
  },
  pagination: {
    prev: 'Предыдущая страница',
    next: 'Следующая страница',
    itemsPerPage: 'Записей на страницу',
    perPage: '{{size}} / стр.',
    goToPage: 'Перейти на страницу {{page}}',
    label: 'Пагинация',
    pageOf: 'Страница {{current}} из {{total}}',
    of: 'из',
  },
  table: {
    empty: 'Нет данных',
    loading: 'Загрузка…',
    sort: 'Сортировать столбец',
    filter: 'Фильтр столбца',
    selectAll: 'Выбрать все строки',
    selectRow: 'Выбрать строку',
    expandRow: 'Показать детали строки',
    toggleRow: 'Показать вложенные строки',
    selectGroup: 'Выбрать группу',
    toggleGroup: 'Свернуть группу',
    noMatches: 'Ничего не найдено',
  },
  eventCalendar: {
    today: 'Сегодня',
    previous: 'Назад',
    next: 'Вперёд',
    month: 'Месяц',
    week: 'Неделя',
    day: 'День',
    time: 'Время',
    allDay: 'Весь день',
    label: 'Календарь',
    more: 'ещё {{count}}',
  },
  tour: {
    next: 'Далее',
    back: 'Назад',
    done: 'Готово',
    skip: 'Пропустить',
    progress: 'Шаг {{current}} из {{total}}',
  },
  splitter: {
    divider: 'Изменить размер областей',
  },
  transfer: {
    source: 'Доступно',
    target: 'Выбрано',
    search: 'Поиск',
    empty: 'Пусто',
    selectAll: 'Выбрать все',
    toTarget: 'Перенести в выбранные',
    toSource: 'Вернуть в доступные',
    count: '{{checked}} / {{total}}',
  },
  validation: {
    required: 'Обязательное поле.',
    requiredTrue: 'Нужно поставить отметку.',
    email: 'Введите корректный адрес почты.',
    minlength: 'Не короче {{requiredLength}} символов.',
    maxlength: 'Не длиннее {{requiredLength}} символов.',
    min: 'Не меньше {{min}}.',
    max: 'Не больше {{max}}.',
    pattern: 'Значение не соответствует формату.',
    noWhitespace: 'Поле не может состоять из пробелов.',
    hexColor: 'Введите цвет в формате #1a2b3c.',
    url: 'Введите корректный адрес.',
    cardNumber: 'Введите корректный номер карты.',
    cvc: 'Введите {{length}}-значный код проверки.',
    iban: 'Введите корректный IBAN.',
    match: 'Значения не совпадают.',
    matchFields: 'Значения полей не совпадают.',
    oneOf: 'Выберите одно из допустимых значений.',
    minDate: 'Выберите более позднюю дату.',
    maxDate: 'Выберите более раннюю дату.',
  },
  select: {
    label: 'Выбрать',
    placeholder: 'Выберите…',
    empty: 'Нет вариантов',
    clearSelection: 'Очистить выбор',
    removeItem: 'Удалить {{label}}',
    noResults: 'Ничего не найдено',
    loading: 'Загрузка…',
  },
  // `tree` covers both inline display and combobox-mode pickers
  // (replaces the dropped `treeSelect` namespace).
  tree: {
    expand: 'Развернуть',
    collapse: 'Свернуть',
    placeholder: 'Выберите…',
    clearSelection: 'Очистить выбор',
    removeItem: 'Удалить {{label}}',
  },
  commandPalette: {
    label: 'Палитра команд',
    placeholder: 'Введите команду или поиск…',
    noResults: 'Ничего не найдено',
  },
  empty: {
    noData: 'Нет данных',
  },
  fileUpload: {
    browse: 'Нажмите, чтобы выбрать',
    dropZone: 'или перетащите файлы сюда',
    dropZoneLabel: 'Зона загрузки файлов — нажмите или перетащите',
    removeFile: 'Удалить файл',
    invalid: 'Неподдерживаемый тип файла',
    tooBig: 'Файл слишком большой',
  },
  popconfirm: {
    label: 'Подтверждение действия',
    confirm: 'Подтвердить',
    cancel: 'Отмена',
  },
  toast: {
    close: 'Закрыть',
    copy: 'Копировать',
    copied: 'Скопировано',
    closeAll: 'Закрыть все',
  },
  input: {
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
  },
  inputNumber: {
    increment: 'Увеличить',
    decrement: 'Уменьшить',
  },
  anchor: {
    label: 'Содержание',
  },
  backTop: {
    label: 'Наверх',
  },
  calendar: {
    prevMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    prevYear: 'Предыдущий год',
    nextYear: 'Следующий год',
  },
  calendarHeatmap: {
    label: 'Календарная тепловая карта',
  },
  lineChart: {
    label: 'Линейный график',
  },
  donutChart: {
    label: 'Круговая диаграмма',
  },
  compare: {
    label: 'Разделитель сравнения',
  },
  carousel: {
    label: 'Карусель',
    goToSlide: 'Перейти к слайду {{index}}',
    prev: 'Предыдущий слайд',
    next: 'Следующий слайд',
    pagination: 'Пагинация карусели',
  },
  alert: {
    close: 'Закрыть оповещение',
  },
  qr: {
    label: 'QR-код',
  },
  image: {
    viewer: 'Просмотр изображения',
    open: 'Открыть превью',
    close: 'Закрыть превью',
  },
  window: {
    close: 'Закрыть',
  },
  dialog: {
    close: 'Закрыть диалог',
  },
  // Намеренно обобщённо: у панели поповера нет универсального имени, а
  // `role="dialog"` без имени не озвучивается вовсе. Переопределяется на месте
  // через `[ariaLabel]`.
  popover: {
    label: 'Всплывающая панель',
  },
  // Существительное впереди — «Вставлено: Ада», а не «Ада вставлена»: род имени
  // заранее неизвестен, а интерполятор согласовывать его не умеет. По той же
  // причине счётчик без склонения — форм множественного числа в нём нет.
  mention: {
    listbox: 'Упоминания',
    available: 'Найдено совпадений: {{count}}',
    inserted: 'Вставлено: {{label}}',
  },
  drawer: {
    close: 'Закрыть панель',
  },
  datePicker: {
    open: 'Открыть календарь',
    openTime: 'Открыть выбор времени',
    openDateTime: 'Открыть выбор даты и времени',
    openRange: 'Открыть календарь периода',
    panel: 'Выбор даты',
    panelTime: 'Выбор времени',
    panelDateTime: 'Выбор даты и времени',
    panelRange: 'Выбор периода',
    panelRangeDateTime: 'Выбор периода и времени',
    rangeStart: 'Начало периода',
    rangeEnd: 'Конец периода',
    startTime: 'Время начала',
    endTime: 'Время окончания',
  },
  spinner: {
    label: 'Загрузка',
  },
  rating: {
    label: 'Рейтинг',
  },
  gauge: {
    label: 'Индикатор',
  },
  progress: {
    label: 'Прогресс',
  },
  meterGroup: {
    label: 'Шкала',
  },
  knob: {
    label: 'Значение',
  },
  speedDial: {
    label: 'Действия',
  },
  result: {
    notFound: 'Извините, страница не найдена.',
    forbidden: 'Извините, доступ к этой странице ограничен.',
    serverError: 'Извините, что-то пошло не так.',
  },
  date: {
    months: {
      jan: 'Январь',
      feb: 'Февраль',
      mar: 'Март',
      apr: 'Апрель',
      may: 'Май',
      jun: 'Июнь',
      jul: 'Июль',
      aug: 'Август',
      sep: 'Сентябрь',
      oct: 'Октябрь',
      nov: 'Ноябрь',
      dec: 'Декабрь',
    },
  },
};
