import { type WrI18nCatalog } from 'ngwr/i18n';

/** Base Polish catalog for ngwr built-in component strings. */
export const wrPl: WrI18nCatalog = {
  common: {
    ok: 'OK',
    cancel: 'Anuluj',
    close: 'Zamknij',
    confirm: 'Potwierdź',
    delete: 'Usuń',
    save: 'Zapisz',
    edit: 'Edytuj',
    add: 'Dodaj',
    remove: 'Usuń',
    clear: 'Wyczyść',
    search: 'Szukaj',
    loading: 'Ładowanie…',
    select: 'Wybierz',
    next: 'Dalej',
    previous: 'Poprzedni',
    back: 'Wstecz',
    today: 'Dzisiaj',
    yesterday: 'Wczoraj',
    tomorrow: 'Jutro',
    of: 'z',
  },
  pagination: {
    prev: 'Poprzednia strona',
    next: 'Następna strona',
    itemsPerPage: 'Elementów na stronę',
    perPage: '{{size}} / str.',
    goToPage: 'Przejdź do strony {{page}}',
    label: 'Paginacja',
    pageOf: 'Strona {{current}} z {{total}}',
    range: '{{from}}–{{to}} z {{total}}',
    compact: '{{current}} / {{total}}',
  },
  table: {
    empty: 'Brak danych',
    loading: 'Ładowanie…',
    sort: 'Sortuj kolumnę',
    filter: 'Filtruj kolumnę',
    selectAll: 'Zaznacz wszystkie wiersze',
    selectRow: 'Zaznacz wiersz',
    // „Toggle” to jeden przycisk w obie strony, więc nazwa nie może obiecywać
    // samego pokazywania — czytnik ekranu odczytuje ją także wtedy, gdy
    // kliknięcie zwinie wiersz.
    expandRow: 'Rozwiń lub zwiń szczegóły wiersza',
    toggleRow: 'Rozwiń lub zwiń wiersze podrzędne',
    selectGroup: 'Zaznacz grupę',
    toggleGroup: 'Rozwiń lub zwiń grupę',
    noMatches: 'Brak wyników',
    search: 'Szukaj',
    reset: 'Resetuj',
  },
  eventCalendar: {
    today: 'Dzisiaj',
    previous: 'Wstecz',
    next: 'Dalej',
    month: 'Miesiąc',
    week: 'Tydzień',
    day: 'Dzień',
    time: 'Godzina',
    allDay: 'Cały dzień',
    label: 'Kalendarz',
    more: '+{{count}} więcej',
    header: '{{month}} {{year}}',
    range: '{{from}} – {{to}}',
    chipLabel: '{{title}}, {{time}}',
    slotLabel: '{{time}} — {{date}}',
    allDayCellLabel: '{{label}} — {{date}}',
  },
  tour: {
    next: 'Dalej',
    back: 'Wstecz',
    done: 'Gotowe',
    skip: 'Pomiń przewodnik',
    progress: 'Krok {{current}} z {{total}}',
  },
  splitter: {
    divider: 'Zmień rozmiar paneli',
  },
  stepper: {
    optional: 'opcjonalnie',
  },
  transfer: {
    source: 'Dostępne',
    target: 'Wybrane',
    search: 'Szukaj',
    empty: 'Pusto',
    selectAll: 'Zaznacz wszystko',
    toTarget: 'Przenieś do wybranych',
    toSource: 'Przenieś do dostępnych',
    count: '{{checked}} / {{total}}',
    selectAllAria: '{{pane}} — {{action}}',
  },
  form: {
    optional: 'opcjonalnie',
  },
  validation: {
    required: 'To pole jest wymagane.',
    requiredTrue: 'To pole musi być zaznaczone.',
    email: 'Wpisz poprawny adres e-mail.',
    minlength: 'Minimalna liczba znaków: {{requiredLength}}.',
    maxlength: 'Maksymalna liczba znaków: {{requiredLength}}.',
    min: 'Wpisz {{min}} lub więcej.',
    max: 'Wpisz {{max}} lub mniej.',
    pattern: 'Wartość ma nieprawidłowy format.',
    noWhitespace: 'Wartość nie może zawierać spacji.',
    hexColor: 'Wpisz kolor w formacie szesnastkowym, np. #1a2b3c.',
    url: 'Wpisz poprawny adres URL.',
    cardNumber: 'Wpisz poprawny numer karty.',
    cvc: 'Wpisz {{length}}-cyfrowy kod zabezpieczający.',
    iban: 'Wpisz poprawny numer IBAN.',
    // „Nie są zgodne” to zwrot, którym polskie formularze mówią o niepasujących
    // do siebie polach — „nie są takie same” brzmi jak porównanie samych pól,
    // a nie ich wartości.
    match: 'Wartości nie są zgodne.',
    matchFields: 'Pola nie są zgodne.',
    oneOf: 'Wybierz jedną z dozwolonych wartości.',
    minDate: 'Wybierz późniejszą datę.',
    maxDate: 'Wybierz wcześniejszą datę.',
  },
  select: {
    // Dostępna nazwa elementu `role="combobox"`, więc rzeczownik, a nie polecenie
    // „Wybierz” — czytnik ekranu odczytuje ją jak etykietę pola, a do działania
    // zachęca dopiero placeholder poniżej.
    label: 'Wybór',
    placeholder: 'Wybierz…',
    empty: 'Brak opcji',
    clearSelection: 'Wyczyść wybór',
    removeItem: 'Usuń {{label}}',
    noResults: 'Brak wyników',
    loading: 'Ładowanie…',
    more: '+{{count}} więcej',
  },
  // `tree` covers both inline display and combobox-mode pickers
  // (replaces the dropped `treeSelect` namespace).
  tree: {
    expand: 'Rozwiń',
    collapse: 'Zwiń',
    placeholder: 'Wybierz…',
    clearSelection: 'Wyczyść wybór',
    removeItem: 'Usuń {{label}}',
    more: '+{{count}} więcej',
  },
  commandPalette: {
    label: 'Paleta poleceń',
    placeholder: 'Wpisz polecenie lub wyszukaj…',
    noResults: 'Brak wyników',
    loading: 'Wyszukiwanie…',
    escHint: 'esc',
  },
  empty: {
    noData: 'Brak danych',
  },
  fileUpload: {
    browse: 'Kliknij, aby wybrać',
    dropZone: 'lub upuść pliki tutaj',
    dropZoneLabel: 'Obszar przesyłania plików — kliknij lub upuść pliki',
    removeFile: 'Usuń plik',
    invalid: 'Nieobsługiwany typ pliku',
    tooBig: 'Plik jest za duży',
    size: '{{value}} {{unit}}',
    unitByte: 'B',
    unitKb: 'KB',
    unitMb: 'MB',
    unitGb: 'GB',
    unitTb: 'TB',
  },
  popconfirm: {
    label: 'Potwierdzenie działania',
    confirm: 'Potwierdź',
    cancel: 'Anuluj',
  },
  toast: {
    region: 'Powiadomienia',
    close: 'Zamknij',
    copy: 'Kopiuj',
    copied: 'Skopiowano',
    closeAll: 'Zamknij wszystkie',
  },
  input: {
    showPassword: 'Pokaż hasło',
    hidePassword: 'Ukryj hasło',
  },
  inputNumber: {
    increment: 'Zwiększ',
    decrement: 'Zmniejsz',
  },
  inputOtp: {
    label: 'Kod weryfikacyjny',
    digit: 'Cyfra {{index}}',
    character: 'Znak {{index}}',
  },
  anchor: {
    label: 'Spis treści',
  },
  avatar: {
    alt: 'Awatar',
  },
  backTop: {
    label: 'Wróć na górę',
  },
  breadcrumbs: {
    label: 'Ścieżka nawigacji',
  },
  burger: {
    label: 'Przełącz menu',
  },
  calendar: {
    prevMonth: 'Poprzedni miesiąc',
    nextMonth: 'Następny miesiąc',
    prevYear: 'Poprzedni rok',
    nextYear: 'Następny rok',
    // The month / year pickers are `role="listbox"`, and a listbox owes a
    // name — without one a screen reader announces the control as nothing at
    // all. Caught by `check:state-a11y` once a state finally opened the view.
    monthList: 'Miesiące',
    yearList: 'Lata',
    prevYears: 'Poprzednie 12 lat',
    nextYears: 'Następne 12 lat',
    header: '{{month}} {{year}}',
    yearRange: '{{from}} – {{to}}',
    dayLabel: '{{weekday}}, {{date}}',
  },
  imageCropper: {
    empty: 'Brak obrazu',
    window: 'Obszar kadrowania',
    keyHelp:
      'Strzałki przesuwają obszar kadrowania. Przytrzymaj Alt ze strzałką, aby zmienić jego rozmiar, ' +
      'a Shift, aby wykonywać większe kroki. ' +
      'Obszar jest odczytywany jako odległość od lewej, odległość od góry, szerokość i wysokość w pikselach obrazu.',
  },
  sortableList: {
    keyHelp:
      'Naciśnij spację, aby podnieść ten element, a następnie przesuwaj go strzałkami. ' +
      'Naciśnij spację ponownie, aby go upuścić, albo Escape, aby cofnąć przenoszenie.',
    grabbed: 'Podniesiono. {{index}} z {{total}}.',
    moved: '{{index}} z {{total}}.',
    dropped: 'Upuszczono. {{index}} z {{total}}.',
    cancelled: 'Przenoszenie anulowane.',
  },
  colorPicker: {
    area: 'Nasycenie i jasność, {{saturation}}% i {{brightness}}%',
    // „Barwa” to polska nazwa składowej H modelu HSL — tak nazywają ją narzędzia
    // graficzne i tak brzmi etykieta kanału obok. „Odcień” to rozjaśniona lub
    // przyciemniona wersja barwy, czyli zupełnie inna wielkość.
    hue: 'Barwa',
    alpha: 'Krycie',
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
    label: 'Mapa cieplna kalendarza',
  },
  lineChart: {
    label: 'Wykres liniowy',
    thousands: '{{value}} tys.',
  },
  donutChart: {
    label: 'Wykres pierścieniowy',
  },
  compare: {
    label: 'Suwak porównania',
  },
  // Oba `roledescription` są wymawiane ZAMIAST nazwy roli, więc to rzeczowniki
  // pisane małą literą — „karuzela”, „slajd” — a nie podpisy z wielkiej litery.
  carousel: {
    label: 'Karuzela',
    goToSlide: 'Przejdź do slajdu {{index}}',
    prev: 'Poprzedni slajd',
    next: 'Następny slajd',
    pagination: 'Paginacja karuzeli',
    roledescription: 'karuzela',
    slideRoledescription: 'slajd',
  },
  actionSheet: {
    label: 'Działania',
  },
  alert: {
    close: 'Zamknij komunikat',
  },
  qr: {
    label: 'Kod QR',
  },
  image: {
    viewer: 'Podgląd obrazu',
    open: 'Otwórz podgląd',
    close: 'Zamknij podgląd',
  },
  window: {
    close: 'Zamknij',
    minimize: 'Minimalizuj',
    maximize: 'Maksymalizuj',
    restore: 'Przywróć',
    restoreDown: 'Przywróć w dół',
    restoreWindow: 'Przywróć {{title}}',
    closeWindow: 'Zamknij okno',
    untitled: 'Bez nazwy',
    taskbar: 'Zminimalizowane okna',
  },
  dialog: {
    close: 'Zamknij okno dialogowe',
  },
  // Celowo ogólnie: panel popovera nie ma uniwersalnej nazwy, a `role="dialog"`
  // bez nazwy nie jest odczytywany wcale. Nadpisywane na miejscu przez
  // `[ariaLabel]`.
  popover: {
    label: 'Okno podręczne',
  },
  markdown: {
    copy: 'Kopiuj kod',
    copied: 'Skopiowano',
    taskDone: 'Zrobione:',
    taskTodo: 'Do zrobienia:',
  },
  // Rzeczownik na początku — „Wstawiono: Ada”, a nie „Ada wstawiona”: rodzaj
  // nazwy nie jest znany z góry, a interpolator go nie uzgodni. Z tego samego
  // powodu licznik jest bez odmiany — nie ma w nim form liczby mnogiej.
  marquee: {
    label: 'Przewijany tekst',
    link: 'link',
  },
  mention: {
    listbox: 'Wzmianki',
    available: 'Liczba dopasowań: {{count}}',
    inserted: 'Wstawiono: {{label}}',
  },
  drawer: {
    close: 'Zamknij panel',
  },
  datePicker: {
    open: 'Otwórz kalendarz',
    openTime: 'Otwórz wybór godziny',
    openDateTime: 'Otwórz wybór daty i godziny',
    openRange: 'Otwórz kalendarz zakresu',
    panel: 'Wybierz datę',
    panelTime: 'Wybierz godzinę',
    panelDateTime: 'Wybierz datę i godzinę',
    panelRange: 'Wybierz zakres dat',
    panelRangeDateTime: 'Wybierz zakres dat i godzin',
    rangeStart: 'Początek zakresu',
    rangeEnd: 'Koniec zakresu',
    startTime: 'Godzina początkowa',
    endTime: 'Godzina końcowa',
    hours: 'Godziny',
    minutes: 'Minuty',
    seconds: 'Sekundy',
    incrementHours: 'Zwiększ godziny',
    decrementHours: 'Zmniejsz godziny',
    incrementMinutes: 'Zwiększ minuty',
    decrementMinutes: 'Zmniejsz minuty',
    incrementSeconds: 'Zwiększ sekundy',
    decrementSeconds: 'Zmniejsz sekundy',
    toggleAmPm: 'Przełącz AM / PM',
    am: 'AM',
    pm: 'PM',
  },
  sidebar: {
    label: 'Panel boczny',
  },
  spinner: {
    label: 'Ładowanie',
  },
  rating: {
    label: 'Ocena',
  },
  gauge: {
    label: 'Wskaźnik',
  },
  progress: {
    label: 'Postęp',
  },
  meterGroup: {
    label: 'Miernik',
  },
  knob: {
    label: 'Wartość',
  },
  slider: {
    label: 'Wartość',
    lower: 'Dolna wartość',
    upper: 'Górna wartość',
  },
  speedDial: {
    label: 'Działania',
  },
  statistic: {
    delta: '{{value}}{{suffix}}',
    deltaSuffix: '%',
  },
  result: {
    notFound: 'Przepraszamy, ta strona nie istnieje.',
    forbidden: 'Przepraszamy, nie masz uprawnień do wyświetlenia tej strony.',
    serverError: 'Przepraszamy, coś poszło nie tak.',
  },
  date: {
    months: {
      jan: 'styczeń',
      feb: 'luty',
      mar: 'marzec',
      apr: 'kwiecień',
      may: 'maj',
      jun: 'czerwiec',
      jul: 'lipiec',
      aug: 'sierpień',
      sep: 'wrzesień',
      oct: 'październik',
      nov: 'listopad',
      dec: 'grudzień',
    },
  },
};
