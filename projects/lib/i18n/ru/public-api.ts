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
  },
  pagination: {
    prev: 'Назад',
    next: 'Далее',
    pageOf: 'Страница {{current}} из {{total}}',
  },
  table: {
    empty: 'Нет данных',
    loading: 'Загрузка…',
  },
  select: {
    placeholder: 'Выбрать…',
    empty: 'Нет вариантов',
  },
  upload: {
    drop: 'Перетащите файлы или нажмите для выбора',
    invalid: 'Неподдерживаемый тип файла',
    tooBig: 'Файл слишком большой',
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
