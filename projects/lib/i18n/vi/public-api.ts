import { type WrI18nCatalog } from 'ngwr/i18n';

/** Base Vietnamese catalog for ngwr built-in component strings. */
export const wrVi: WrI18nCatalog = {
  common: {
    ok: 'OK',
    cancel: 'Hủy',
    close: 'Đóng',
    confirm: 'Xác nhận',
    delete: 'Xóa',
    save: 'Lưu',
    edit: 'Sửa',
    add: 'Thêm',
    remove: 'Gỡ bỏ',
    clear: 'Xóa hết',
    search: 'Tìm kiếm',
    loading: 'Đang tải…',
    select: 'Chọn',
    next: 'Tiếp theo',
    previous: 'Trước',
    back: 'Quay lại',
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    tomorrow: 'Ngày mai',
    of: 'trong số',
  },
  pagination: {
    prev: 'Trang trước',
    next: 'Trang sau',
    itemsPerPage: 'Số mục mỗi trang',
    perPage: '{{size}} / trang',
    goToPage: 'Đến trang {{page}}',
    label: 'Phân trang',
    pageOf: 'Trang {{current}} trên {{total}}',
    range: '{{from}}–{{to}} trong số {{total}}',
    compact: '{{current}} / {{total}}',
  },
  table: {
    empty: 'Không có dữ liệu',
    loading: 'Đang tải…',
    sort: 'Sắp xếp cột',
    filter: 'Lọc cột',
    selectAll: 'Chọn tất cả hàng',
    selectRow: 'Chọn hàng',
    expandRow: 'Hiện/ẩn chi tiết hàng',
    toggleRow: 'Hiện/ẩn hàng con',
    selectGroup: 'Chọn nhóm',
    toggleGroup: 'Mở/thu gọn nhóm',
    noMatches: 'Không có kết quả phù hợp',
    search: 'Tìm kiếm',
    reset: 'Đặt lại',
  },
  eventCalendar: {
    today: 'Hôm nay',
    previous: 'Trước',
    next: 'Sau',
    month: 'Tháng',
    week: 'Tuần',
    day: 'Ngày',
    time: 'Giờ',
    allDay: 'Cả ngày',
    label: 'Lịch',
    more: '+{{count}} nữa',
    // Tiếng Việt viết “tháng 3 năm 2026”, không phải “tháng 3 2026” — chỗ đặt
    // chữ “năm” chính là phần phải dịch ở đây, giống như ja-JP viết 2026年3月.
    header: '{{month}} năm {{year}}',
    range: '{{from}} – {{to}}',
    chipLabel: '{{title}}, {{time}}',
    slotLabel: '{{time}} — {{date}}',
    allDayCellLabel: '{{label}} — {{date}}',
  },
  tour: {
    next: 'Tiếp theo',
    back: 'Quay lại',
    done: 'Xong',
    skip: 'Bỏ qua',
    progress: 'Bước {{current}} trên {{total}}',
  },
  splitter: {
    divider: 'Đổi kích thước khung',
  },
  stepper: {
    optional: 'tùy chọn',
  },
  transfer: {
    source: 'Có sẵn',
    target: 'Đã chọn',
    search: 'Tìm kiếm',
    empty: 'Trống',
    selectAll: 'Chọn tất cả',
    toTarget: 'Chuyển sang danh sách đã chọn',
    toSource: 'Chuyển về danh sách có sẵn',
    count: '{{checked}} / {{total}}',
  },
  form: {
    optional: 'tùy chọn',
  },
  validation: {
    required: 'Trường này là bắt buộc.',
    requiredTrue: 'Cần đánh dấu vào ô này.',
    email: 'Nhập địa chỉ email hợp lệ.',
    minlength: 'Nhập ít nhất {{requiredLength}} ký tự.',
    maxlength: 'Nhập tối đa {{requiredLength}} ký tự.',
    min: 'Nhập {{min}} trở lên.',
    max: 'Nhập {{max}} trở xuống.',
    pattern: 'Giá trị không đúng định dạng.',
    noWhitespace: 'Giá trị không được chứa dấu cách.',
    hexColor: 'Nhập mã màu hex, ví dụ #1a2b3c.',
    url: 'Nhập URL hợp lệ.',
    cardNumber: 'Nhập số thẻ hợp lệ.',
    cvc: 'Nhập mã bảo mật {{length}} chữ số.',
    iban: 'Nhập số IBAN hợp lệ.',
    match: 'Hai giá trị không khớp nhau.',
    matchFields: 'Các trường này không khớp nhau.',
    oneOf: 'Chọn một trong các giá trị cho phép.',
    minDate: 'Chọn ngày muộn hơn.',
    maxDate: 'Chọn ngày sớm hơn.',
  },
  select: {
    label: 'Chọn',
    placeholder: 'Chọn…',
    empty: 'Không có lựa chọn',
    clearSelection: 'Xóa lựa chọn',
    removeItem: 'Xóa {{label}}',
    noResults: 'Không có kết quả',
    loading: 'Đang tải…',
    more: '+{{count}} nữa',
  },
  // `tree` covers both inline display and combobox-mode pickers
  // (replaces the dropped `treeSelect` namespace).
  tree: {
    expand: 'Mở rộng',
    collapse: 'Thu gọn',
    placeholder: 'Chọn…',
    clearSelection: 'Xóa lựa chọn',
    removeItem: 'Xóa {{label}}',
    more: '+{{count}} nữa',
  },
  commandPalette: {
    label: 'Bảng lệnh',
    placeholder: 'Nhập lệnh hoặc tìm kiếm…',
    noResults: 'Không có kết quả',
    loading: 'Đang tìm…',
    escHint: 'esc',
  },
  empty: {
    noData: 'Không có dữ liệu',
  },
  fileUpload: {
    browse: 'Nhấn để chọn tệp',
    dropZone: 'hoặc kéo thả tệp vào đây',
    dropZoneLabel: 'Vùng tải tệp lên — nhấn hoặc kéo thả tệp',
    removeFile: 'Xóa tệp',
    invalid: 'Loại tệp không được hỗ trợ',
    tooBig: 'Tệp quá lớn',
    size: '{{value}} {{unit}}',
    unitByte: 'B',
    unitKb: 'KB',
    unitMb: 'MB',
    unitGb: 'GB',
    unitTb: 'TB',
  },
  popconfirm: {
    label: 'Xác nhận hành động',
    confirm: 'Xác nhận',
    cancel: 'Hủy',
  },
  toast: {
    region: 'Thông báo',
    close: 'Đóng',
    copy: 'Sao chép',
    copied: 'Đã sao chép',
    closeAll: 'Đóng tất cả',
  },
  input: {
    showPassword: 'Hiện mật khẩu',
    hidePassword: 'Ẩn mật khẩu',
  },
  inputNumber: {
    increment: 'Tăng',
    decrement: 'Giảm',
  },
  inputOtp: {
    label: 'Mã xác minh',
    digit: 'Chữ số {{index}}',
    character: 'Ký tự {{index}}',
  },
  anchor: {
    label: 'Mục lục',
  },
  avatar: {
    alt: 'Ảnh đại diện',
  },
  backTop: {
    label: 'Lên đầu trang',
  },
  breadcrumbs: {
    label: 'Đường dẫn trang',
  },
  burger: {
    label: 'Mở/đóng menu',
  },
  calendar: {
    prevMonth: 'Tháng trước',
    nextMonth: 'Tháng sau',
    prevYear: 'Năm trước',
    nextYear: 'Năm sau',
    // The month / year pickers are `role="listbox"`, and a listbox owes a
    // name — without one a screen reader announces the control as nothing at
    // all. Caught by `check:state-a11y` once a state finally opened the view.
    monthList: 'Các tháng',
    yearList: 'Các năm',
    // “12 năm trước” đọc ra thành “12 years ago” chứ không phải “previous 12
    // years”, nên hai nút này phải nói rõ là trước đó / tiếp theo.
    prevYears: '12 năm trước đó',
    nextYears: '12 năm tiếp theo',
    header: '{{month}} năm {{year}}',
    yearRange: '{{from}} – {{to}}',
    dayLabel: '{{weekday}}, {{date}}',
  },
  imageCropper: {
    empty: 'Không có ảnh',
    window: 'Vùng cắt',
    keyHelp:
      'Các phím mũi tên di chuyển vùng cắt. Giữ Alt cùng phím mũi tên để đổi kích thước, giữ Shift để bước nhảy lớn hơn. ' +
      'Vùng cắt được đọc theo thứ tự lề trái, lề trên, chiều rộng và chiều cao, tính bằng pixel của ảnh.',
  },
  sortableList: {
    keyHelp:
      'Nhấn phím cách để nhấc mục này lên, rồi dùng các phím mũi tên để di chuyển. ' +
      'Nhấn phím cách lần nữa để thả, hoặc nhấn Escape để trả về chỗ cũ.',
    grabbed: 'Đã nhấc. {{index}} trên {{total}}.',
    moved: '{{index}} trên {{total}}.',
    dropped: 'Đã thả. {{index}} trên {{total}}.',
    cancelled: 'Đã hủy di chuyển.',
  },
  colorPicker: {
    area: 'Độ bão hòa và độ sáng, {{saturation}}% và {{brightness}}%',
    hue: 'Tông màu',
    alpha: 'Độ mờ',
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
    label: 'Bản đồ nhiệt theo lịch',
  },
  lineChart: {
    label: 'Biểu đồ đường',
    thousands: '{{value}} N',
  },
  donutChart: {
    label: 'Biểu đồ vành khuyên',
  },
  compare: {
    label: 'Thanh trượt so sánh',
  },
  // Hai giá trị `roledescription` được đọc THAY CHO tên vai trò, nên chúng là danh
  // từ viết thường — “băng chuyền”, “trang chiếu” — chứ không phải nhãn viết hoa
  // như các chuỗi phía trên.
  carousel: {
    label: 'Băng chuyền',
    goToSlide: 'Đến trang chiếu {{index}}',
    prev: 'Trang chiếu trước',
    next: 'Trang chiếu sau',
    pagination: 'Phân trang băng chuyền',
    roledescription: 'băng chuyền',
    slideRoledescription: 'trang chiếu',
  },
  actionSheet: {
    label: 'Thao tác',
  },
  alert: {
    close: 'Đóng cảnh báo',
  },
  qr: {
    label: 'Mã QR',
  },
  image: {
    viewer: 'Xem trước ảnh',
    open: 'Mở xem trước',
    close: 'Đóng xem trước',
  },
  window: {
    close: 'Đóng',
    minimize: 'Thu nhỏ',
    maximize: 'Phóng to',
    restore: 'Khôi phục',
    restoreDown: 'Khôi phục kích thước',
    restoreWindow: 'Khôi phục {{title}}',
    closeWindow: 'Đóng cửa sổ',
    untitled: 'Không có tiêu đề',
    taskbar: 'Cửa sổ đã thu nhỏ',
  },
  dialog: {
    close: 'Đóng hộp thoại',
  },
  // Cố ý chung chung: bảng popover không có tên gọi phổ quát, còn `role="dialog"`
  // không có tên thì hoàn toàn không được đọc lên. Ghi đè cho từng trường hợp
  // bằng `[ariaLabel]`.
  popover: {
    label: 'Bảng bật lên',
  },
  markdown: {
    copy: 'Sao chép mã',
    copied: 'Đã sao chép',
    taskDone: 'Đã xong:',
    taskTodo: 'Chưa xong:',
  },
  // Danh từ đứng trước con số — “Số kết quả phù hợp: 1” vẫn đọc đúng, vì tiếng Việt
  // không đổi dạng từ theo số lượng và bộ nội suy cũng không có luật số nhiều.
  marquee: {
    label: 'Dòng chữ chạy',
    link: 'liên kết',
  },
  mention: {
    listbox: 'Danh sách nhắc đến',
    available: 'Số kết quả phù hợp: {{count}}',
    inserted: 'Đã chèn: {{label}}',
  },
  drawer: {
    close: 'Đóng bảng trượt',
  },
  datePicker: {
    open: 'Mở lịch',
    openTime: 'Mở bộ chọn giờ',
    openDateTime: 'Mở bộ chọn ngày và giờ',
    openRange: 'Mở lịch chọn khoảng ngày',
    panel: 'Chọn ngày',
    panelTime: 'Chọn giờ',
    panelDateTime: 'Chọn ngày và giờ',
    panelRange: 'Chọn khoảng ngày',
    panelRangeDateTime: 'Chọn khoảng ngày và giờ',
    rangeStart: 'Ngày bắt đầu',
    rangeEnd: 'Ngày kết thúc',
    startTime: 'Giờ bắt đầu',
    endTime: 'Giờ kết thúc',
    hours: 'Giờ',
    minutes: 'Phút',
    seconds: 'Giây',
    incrementHours: 'Tăng giờ',
    decrementHours: 'Giảm giờ',
    incrementMinutes: 'Tăng phút',
    decrementMinutes: 'Giảm phút',
    incrementSeconds: 'Tăng giây',
    decrementSeconds: 'Giảm giây',
    toggleAmPm: 'Chuyển SA / CH',
    am: 'SA',
    pm: 'CH',
  },
  sidebar: {
    label: 'Thanh bên',
  },
  spinner: {
    label: 'Đang tải',
  },
  rating: {
    label: 'Đánh giá',
  },
  gauge: {
    label: 'Đồng hồ đo',
  },
  progress: {
    label: 'Tiến trình',
  },
  meterGroup: {
    label: 'Thước đo',
  },
  knob: {
    label: 'Giá trị',
  },
  slider: {
    label: 'Giá trị',
    lower: 'Giá trị dưới',
    upper: 'Giá trị trên',
  },
  speedDial: {
    label: 'Thao tác',
  },
  statistic: {
    delta: '{{value}}{{suffix}}',
    deltaSuffix: '%',
  },
  result: {
    notFound: 'Rất tiếc, trang bạn truy cập không tồn tại.',
    forbidden: 'Rất tiếc, bạn không có quyền truy cập trang này.',
    serverError: 'Rất tiếc, đã xảy ra lỗi.',
  },
  date: {
    months: {
      jan: 'Tháng 1',
      feb: 'Tháng 2',
      mar: 'Tháng 3',
      apr: 'Tháng 4',
      may: 'Tháng 5',
      jun: 'Tháng 6',
      jul: 'Tháng 7',
      aug: 'Tháng 8',
      sep: 'Tháng 9',
      oct: 'Tháng 10',
      nov: 'Tháng 11',
      dec: 'Tháng 12',
    },
  },
};
