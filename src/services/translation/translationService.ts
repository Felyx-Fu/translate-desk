import type { Direction } from "../../desktop";
import { getTranslationLangPair, translateWithFreeApi, translateWithUserApi } from "./apiTranslator";
import { detectDirection, languageDirections, translateText } from "./localTranslator";
import type { TranslationProvider, TranslationResult, TranslationSettings } from "./types";

export const translationProviders = ["免费翻译 API", "用户 API Key", "离线规则"] satisfies TranslationProvider[];

export const defaultSettings: TranslationSettings = {
  provider: "免费翻译 API",
  apiEndpoint: "https://libretranslate.com/translate",
  apiKey: "",
  defaultDirection: "英 → 中",
  autoDetect: true,
  officePolish: true,
  keepHistory: true,
  selectionShortcut: "CommandOrControl+Space",
};

export function normalizeSettings(value: unknown): TranslationSettings {
  if (!value || typeof value !== "object") return defaultSettings;
  const settings = value as Partial<TranslationSettings>;
  return {
    provider: translationProviders.includes(settings.provider as TranslationProvider)
      ? (settings.provider as TranslationProvider)
      : defaultSettings.provider,
    apiEndpoint: typeof settings.apiEndpoint === "string" && settings.apiEndpoint.trim()
      ? settings.apiEndpoint.trim()
      : defaultSettings.apiEndpoint,
    apiKey: typeof settings.apiKey === "string" ? settings.apiKey : "",
    defaultDirection: languageDirections.includes(settings.defaultDirection as Direction)
      ? (settings.defaultDirection as Direction)
      : defaultSettings.defaultDirection,
    autoDetect: typeof settings.autoDetect === "boolean" ? settings.autoDetect : defaultSettings.autoDetect,
    officePolish: typeof settings.officePolish === "boolean" ? settings.officePolish : defaultSettings.officePolish,
    keepHistory: typeof settings.keepHistory === "boolean" ? settings.keepHistory : defaultSettings.keepHistory,
    selectionShortcut: typeof settings.selectionShortcut === "string" && settings.selectionShortcut.trim()
      ? settings.selectionShortcut.trim()
      : defaultSettings.selectionShortcut,
  };
}

export function loadSettings(): TranslationSettings {
  if (typeof localStorage === "undefined") return defaultSettings;
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem("translate-desk-settings") || "null"));
  } catch {
    return defaultSettings;
  }
}

export async function translateWithSettings(
  value: string,
  mode: Direction,
  settings: TranslationSettings,
): Promise<TranslationResult> {
  const input = value.trim();
  if (!input) return { text: "", usedFallback: false, error: null };

  const resolvedMode = mode === "自动检测" ? detectDirection(input) || settings.defaultDirection : mode;
  const apiMode: Exclude<Direction, "自动检测"> = resolvedMode === "自动检测" ? "英 → 中" : resolvedMode;
  const fallback = translateText(input, resolvedMode);
  if (settings.provider === "离线规则") {
    return { text: fallback, usedFallback: true, error: null };
  }

  const pair = getTranslationLangPair(apiMode);
  try {
    if (settings.provider === "用户 API Key") {
      if (!settings.apiKey.trim()) {
        return { text: fallback, usedFallback: true, error: "请先在设置中心填写 API Key。" };
      }
      const translatedText = await translateWithUserApi(input, pair, settings);
      return { text: translatedText || fallback, usedFallback: !translatedText, error: null };
    }

    const translatedText = await translateWithFreeApi(input, pair);
    return { text: translatedText || fallback, usedFallback: !translatedText, error: null };
  } catch (error) {
    return {
      text: fallback,
      usedFallback: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
