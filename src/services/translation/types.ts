import type { Direction } from "../../desktop";

export type TranslationProvider = "免费翻译 API" | "用户 API Key" | "离线规则";

export type TranslationSettings = {
  provider: TranslationProvider;
  apiEndpoint: string;
  apiKey: string;
  defaultDirection: Direction;
  autoDetect: boolean;
  officePolish: boolean;
  keepHistory: boolean;
  selectionShortcut: string;
};

export type TranslationResult = {
  text: string;
  usedFallback: boolean;
  error: string | null;
};

export type TranslationLangPair = {
  source: "en" | "zh";
  target: "en" | "zh";
};
