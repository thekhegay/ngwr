export { WrI18n } from './i18n';
export { WrTPipe } from './t.pipe';
export { WrTDirective } from './t.directive';
export {
  WR_I18N_CONFIG,
  DEFAULT_WR_I18N_CONFIG,
  type WrI18nCatalog,
  type WrI18nConfig,
  type WrI18nConfigResolved,
  type WrI18nParams,
  type WrI18nMissingHandler,
} from './i18n-config';
export { WR_I18N_LOADER, type WrI18nLoader } from './i18n-loader';
export {
  WrI18nStaticLoader,
  type WrI18nStaticCatalogs,
  type WrI18nStaticScopedCatalogs,
} from './loaders/static-loader';
export { WrI18nHttpLoader, type WrI18nHttpLoaderConfig } from './loaders/http-loader';
export {
  provideWrI18n,
  provideWrI18nStaticLoader,
  provideWrI18nHttpLoader,
  type ProvideWrI18nOptions,
} from './provide-wr-i18n';
export { useI18nText, readI18nText } from './util';
