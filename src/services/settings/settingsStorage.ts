import {
  defaultSettings,
  normalizeSettings,
  type TranslationSettings,
} from "../translation";

const settingsStorageKey = "translate-desk-settings";

export function loadSettings(): TranslationSettings {
  if (typeof localStorage === "undefined") return defaultSettings;
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(settingsStorageKey) || "null"));
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: TranslationSettings): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
}
