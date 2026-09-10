import { type WrI18nCatalog } from 'ngwr/i18n';

/** Base Turkish catalog for ngwr built-in component strings. */
export const wrTr: WrI18nCatalog = {
  common: {
    ok: 'Tamam',
    cancel: 'İptal',
    close: 'Kapat',
    confirm: 'Onayla',
    delete: 'Sil',
    save: 'Kaydet',
    edit: 'Düzenle',
    add: 'Ekle',
    remove: 'Kaldır',
    clear: 'Temizle',
    search: 'Ara',
    loading: 'Yükleniyor…',
    select: 'Seç',
    next: 'Sonraki',
    previous: 'Önceki',
    back: 'Geri',
    today: 'Bugün',
    yesterday: 'Dün',
    tomorrow: 'Yarın',
    of: 'üzerinden',
  },
  pagination: {
    prev: 'Önceki sayfa',
    next: 'Sonraki sayfa',
    itemsPerPage: 'Sayfa başına öğe',
    perPage: '{{size}} / sayfa',
    goToPage: '{{page}}. sayfaya git',
    label: 'Sayfalama',
    pageOf: 'Sayfa {{current}} / {{total}}',
    range: '{{from}}–{{to}} / {{total}}',
    compact: '{{current}} / {{total}}',
  },
  table: {
    empty: 'Veri yok',
    loading: 'Yükleniyor…',
    sort: 'Sütunu sırala',
    filter: 'Sütunu filtrele',
    selectAll: 'Tüm satırları seç',
    selectRow: 'Satırı seç',
    expandRow: 'Satır ayrıntılarını aç/kapat',
    toggleRow: 'Alt satırları aç/kapat',
    selectGroup: 'Grubu seç',
    toggleGroup: 'Grubu aç/kapat',
    noMatches: 'Eşleşme yok',
    search: 'Ara',
    reset: 'Sıfırla',
  },
  eventCalendar: {
    today: 'Bugün',
    previous: 'Önceki',
    next: 'Sonraki',
    month: 'Ay',
    week: 'Hafta',
    day: 'Gün',
    time: 'Saat',
    allDay: 'Tüm gün',
    label: 'Takvim',
    more: '+{{count}} daha',
    header: '{{month}} {{year}}',
    range: '{{from}} – {{to}}',
    chipLabel: '{{title}}, {{time}}',
    slotLabel: '{{time}} — {{date}}',
    allDayCellLabel: '{{label}} — {{date}}',
  },
  tour: {
    next: 'İleri',
    back: 'Geri',
    done: 'Bitti',
    skip: 'Turu atla',
    progress: 'Adım {{current}} / {{total}}',
  },
  splitter: {
    divider: 'Bölmeleri yeniden boyutlandır',
  },
  stepper: {
    optional: 'isteğe bağlı',
  },
  transfer: {
    source: 'Kullanılabilir',
    target: 'Seçilenler',
    search: 'Ara',
    empty: 'Burası boş',
    selectAll: 'Tümünü seç',
    toTarget: 'Seçilenlere taşı',
    toSource: 'Kullanılabilirlere taşı',
    count: '{{checked}} / {{total}}',
    selectAllAria: '{{pane}} — {{action}}',
  },
  form: {
    optional: 'isteğe bağlı',
  },
  validation: {
    required: 'Bu alan zorunludur.',
    requiredTrue: 'Bu alan işaretlenmelidir.',
    email: 'Geçerli bir e-posta adresi girin.',
    minlength: 'En az {{requiredLength}} karakter girin.',
    maxlength: 'En fazla {{requiredLength}} karakter girin.',
    min: 'En az {{min}} girin.',
    max: 'En fazla {{max}} girin.',
    pattern: 'Bu değer beklenen biçimde değil.',
    noWhitespace: 'Bu değer boşluk içeremez.',
    hexColor: 'Onaltılık renk kodu girin, örn. #1a2b3c.',
    url: 'Geçerli bir URL girin.',
    cardNumber: 'Geçerli bir kart numarası girin.',
    cvc: '{{length}} haneli güvenlik kodunu girin.',
    iban: 'Geçerli bir IBAN girin.',
    match: 'İki değer eşleşmiyor.',
    matchFields: 'Bu alanlar eşleşmiyor.',
    oneOf: 'İzin verilen değerlerden birini seçin.',
    minDate: 'Daha ileri bir tarih seçin.',
    maxDate: 'Daha erken bir tarih seçin.',
  },
  select: {
    // `role="combobox"` denetiminin erişilebilir adı, yani buyruk değil ad
    // olmalı: ekran okuyucu “Seç” diye bir komut değil, “Seçim” diye bir
    // denetim duyurur. Eylemi isteyen dize aşağıdaki yer tutucudur.
    label: 'Seçim',
    placeholder: 'Seçin…',
    empty: 'Seçenek yok',
    clearSelection: 'Seçimi temizle',
    removeItem: '{{label}} öğesini kaldır',
    noResults: 'Sonuç yok',
    loading: 'Yükleniyor…',
    more: '+{{count}} daha',
  },
  // `tree` covers both inline display and combobox-mode pickers
  // (replaces the dropped `treeSelect` namespace).
  tree: {
    expand: 'Genişlet',
    collapse: 'Daralt',
    placeholder: 'Seçin…',
    clearSelection: 'Seçimi temizle',
    removeItem: '{{label}} öğesini kaldır',
    more: '+{{count}} daha',
  },
  commandPalette: {
    label: 'Komut paleti',
    placeholder: 'Bir komut yazın veya arayın…',
    noResults: 'Sonuç yok',
    loading: 'Aranıyor…',
    escHint: 'esc',
  },
  empty: {
    noData: 'Veri yok',
  },
  fileUpload: {
    browse: 'Seçmek için tıklayın',
    dropZone: 'veya dosyaları buraya bırakın',
    dropZoneLabel: 'Dosya yükleme alanı — tıklayın veya dosya bırakın',
    removeFile: 'Dosyayı kaldır',
    invalid: 'Desteklenmeyen dosya türü',
    tooBig: 'Dosya çok büyük',
    size: '{{value}} {{unit}}',
    unitByte: 'B',
    unitKb: 'KB',
    unitMb: 'MB',
    unitGb: 'GB',
    unitTb: 'TB',
  },
  popconfirm: {
    label: 'İşlemi onayla',
    confirm: 'Onayla',
    cancel: 'İptal',
  },
  toast: {
    region: 'Bildirimler',
    close: 'Kapat',
    copy: 'Kopyala',
    copied: 'Kopyalandı',
    closeAll: 'Tümünü kapat',
  },
  input: {
    showPassword: 'Parolayı göster',
    hidePassword: 'Parolayı gizle',
  },
  inputNumber: {
    increment: 'Artır',
    decrement: 'Azalt',
  },
  inputOtp: {
    label: 'Doğrulama kodu',
    digit: '{{index}}. hane',
    character: '{{index}}. karakter',
  },
  anchor: {
    label: 'İçindekiler',
  },
  avatar: {
    alt: 'Avatar',
  },
  backTop: {
    label: 'Başa dön',
  },
  breadcrumbs: {
    label: 'Sayfa yolu',
  },
  burger: {
    label: 'Menüyü aç/kapat',
  },
  calendar: {
    prevMonth: 'Önceki ay',
    nextMonth: 'Sonraki ay',
    prevYear: 'Önceki yıl',
    nextYear: 'Sonraki yıl',
    // The month / year pickers are `role="listbox"`, and a listbox owes a
    // name — without one a screen reader announces the control as nothing at
    // all. Caught by `check:state-a11y` once a state finally opened the view.
    monthList: 'Aylar',
    yearList: 'Yıllar',
    prevYears: 'Önceki 12 yıl',
    nextYears: 'Sonraki 12 yıl',
    header: '{{month}} {{year}}',
    yearRange: '{{from}} – {{to}}',
    dayLabel: '{{weekday}}, {{date}}',
  },
  imageCropper: {
    empty: 'Görsel yok',
    window: 'Kırpma alanı',
    keyHelp:
      'Ok tuşları kırpma alanını taşır. Yeniden boyutlandırmak için Alt tuşunu basılı tutarak ok tuşlarına basın, daha büyük adımlar için Shift tuşunu basılı tutun. ' +
      'Kırpma alanı, görsel pikselleri cinsinden sol, üst, genişlik ve yükseklik olarak duyurulur.',
  },
  sortableList: {
    keyHelp:
      'Bu öğeyi almak için Boşluk tuşuna basın, sonra ok tuşlarıyla taşıyın. ' +
      'Bırakmak için Boşluk tuşuna yeniden basın, geri koymak için Escape tuşuna basın.',
    grabbed: 'Alındı. {{index}} / {{total}}.',
    moved: '{{index}} / {{total}}.',
    dropped: 'Bırakıldı. {{index}} / {{total}}.',
    cancelled: 'Taşıma iptal edildi.',
  },
  colorPicker: {
    area: 'Doygunluk ve parlaklık, %{{saturation}} ve %{{brightness}}',
    hue: 'Ton',
    alpha: 'Opaklık',
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
    label: 'Takvim ısı haritası',
  },
  lineChart: {
    // Belirtisiz ad tamlaması: Türkçede tamlanan ad iyelik eki alır — “çizgi
    // grafiği”, “halka grafiği”, tıpkı yukarıdaki “takvim ısı haritası” gibi.
    label: 'Çizgi grafiği',
    thousands: '{{value}} B',
  },
  donutChart: {
    label: 'Halka grafiği',
  },
  compare: {
    label: 'Karşılaştırma ayırıcısı',
  },
  // İki `roledescription` değeri rol adının YERİNE seslendirilir; bu yüzden
  // yukarıdaki etiketler gibi büyük harfle değil, bir rol adı gibi küçük harfle
  // yazılmış adlardır — “karusel”, “slayt”.
  carousel: {
    label: 'Karusel',
    goToSlide: '{{index}}. slayda git',
    prev: 'Önceki slayt',
    next: 'Sonraki slayt',
    pagination: 'Karusel sayfalaması',
    roledescription: 'karusel',
    slideRoledescription: 'slayt',
  },
  actionSheet: {
    label: 'İşlemler',
  },
  alert: {
    close: 'Uyarıyı kapat',
  },
  qr: {
    label: 'QR kodu',
  },
  image: {
    // “Görsel önizleme” sıfat + ad olarak okunur (“visual preview”); adın adı
    // olduğu için tamlama eki şart.
    viewer: 'Görsel önizlemesi',
    open: 'Önizlemeyi aç',
    close: 'Önizlemeyi kapat',
  },
  window: {
    close: 'Kapat',
    minimize: 'Küçült',
    maximize: 'Büyüt',
    restore: 'Geri yükle',
    restoreDown: 'Eski boyutuna getir',
    restoreWindow: '{{title}} penceresini geri yükle',
    closeWindow: 'Pencereyi kapat',
    untitled: 'Adsız',
    taskbar: 'Küçültülmüş pencereler',
  },
  dialog: {
    close: 'İletişim kutusunu kapat',
  },
  // Bilinçli olarak genel: açılır panelin evrensel bir adı yoktur ve adsız bir
  // `role="dialog"` hiç seslendirilmez. Her kullanımda `[ariaLabel]` ile
  // değiştirin.
  popover: {
    label: 'Açılır panel',
  },
  markdown: {
    copy: 'Kodu kopyala',
    copied: 'Kopyalandı',
    taskDone: 'Tamamlandı:',
    taskTodo: 'Yapılacak:',
  },
  // Sayaç çekimsiz: kütüphanede çokluk eki mekanizması yok, bu yüzden sayının
  // ardından gelen sözcük her değer için doğru olmalı — “+1 daha” da “+9 daha”
  // kadar doğru okunur. Aynı nedenle ad öne alınır: “Eklendi: Ada”.
  marquee: {
    label: 'Kayan yazı',
    link: 'bağlantı',
  },
  mention: {
    listbox: 'Bahsetmeler',
    available: 'Bulunan eşleşme: {{count}}',
    inserted: 'Eklendi: {{label}}',
  },
  drawer: {
    close: 'Paneli kapat',
  },
  datePicker: {
    open: 'Takvimi aç',
    openTime: 'Saat seçiciyi aç',
    openDateTime: 'Tarih ve saat seçiciyi aç',
    openRange: 'Aralık takvimini aç',
    panel: 'Tarih seçin',
    panelTime: 'Saat seçin',
    panelDateTime: 'Tarih ve saat seçin',
    panelRange: 'Tarih aralığı seçin',
    panelRangeDateTime: 'Tarih ve saat aralığı seçin',
    rangeStart: 'Aralık başlangıcı',
    rangeEnd: 'Aralık bitişi',
    startTime: 'Başlangıç saati',
    endTime: 'Bitiş saati',
    hours: 'Saat',
    minutes: 'Dakika',
    seconds: 'Saniye',
    incrementHours: 'Saati artır',
    decrementHours: 'Saati azalt',
    incrementMinutes: 'Dakikayı artır',
    decrementMinutes: 'Dakikayı azalt',
    incrementSeconds: 'Saniyeyi artır',
    decrementSeconds: 'Saniyeyi azalt',
    // İki değer arasında gidip gelen bir düğme; Türkçede “aç/kapat” değil
    // “arasında geçiş yap” denir — “aç/kapat” yalnızca açılıp kapanan öğeler
    // (satır, grup, menü) için doğru.
    toggleAmPm: 'ÖÖ / ÖS arasında geçiş yap',
    am: 'ÖÖ',
    pm: 'ÖS',
  },
  sidebar: {
    label: 'Kenar çubuğu',
  },
  spinner: {
    label: 'Yükleniyor',
  },
  rating: {
    label: 'Puanlama',
  },
  gauge: {
    label: 'Gösterge',
  },
  progress: {
    label: 'İlerleme',
  },
  meterGroup: {
    label: 'Ölçer',
  },
  knob: {
    label: 'Değer',
  },
  slider: {
    label: 'Değer',
    lower: 'Alt değer',
    upper: 'Üst değer',
  },
  speedDial: {
    label: 'İşlemler',
  },
  statistic: {
    delta: '{{value}}{{suffix}}',
    deltaSuffix: '%',
  },
  result: {
    notFound: 'Üzgünüz, aradığınız sayfa mevcut değil.',
    forbidden: 'Üzgünüz, bu sayfaya erişim yetkiniz yok.',
    serverError: 'Üzgünüz, bir şeyler ters gitti.',
  },
  date: {
    months: {
      jan: 'Ocak',
      feb: 'Şubat',
      mar: 'Mart',
      apr: 'Nisan',
      may: 'Mayıs',
      jun: 'Haziran',
      jul: 'Temmuz',
      aug: 'Ağustos',
      sep: 'Eylül',
      oct: 'Ekim',
      nov: 'Kasım',
      dec: 'Aralık',
    },
  },
};
