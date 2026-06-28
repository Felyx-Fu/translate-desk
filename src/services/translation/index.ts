export {
  chineseDefault,
  detectDirection,
  englishDefault,
  hasChinese,
  languageDirections,
  translateText,
} from "./localTranslator";
export {
  defaultSettings,
  loadSettings,
  normalizeSettings,
  translationProviders,
  translateWithSettings,
} from "./translationService";
export type { TranslationProvider, TranslationResult, TranslationSettings } from "./types";
