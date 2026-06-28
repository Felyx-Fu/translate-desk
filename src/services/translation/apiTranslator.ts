import type { TranslationLangPair, TranslationSettings } from "./types";

export function getTranslationLangPair(mode: "英 → 中" | "中 → 英"): TranslationLangPair {
  return mode === "中 → 英"
    ? { source: "zh", target: "en" }
    : { source: "en", target: "zh" };
}

export async function translateWithUserApi(
  input: string,
  pair: TranslationLangPair,
  settings: TranslationSettings,
): Promise<string> {
  const response = await fetch(settings.apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: input,
      source: pair.source,
      target: pair.target,
      format: "text",
      api_key: settings.apiKey.trim(),
    }),
  });
  if (!response.ok) throw new Error(`翻译服务返回 ${response.status}`);
  const data = await response.json() as { translatedText?: string };
  return data.translatedText?.trim() ?? "";
}

export async function translateWithFreeApi(input: string, pair: TranslationLangPair): Promise<string> {
  const params = new URLSearchParams({
    q: input,
    langpair: `${pair.source}|${pair.target === "zh" ? "zh-CN" : pair.target}`,
  });
  const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);
  if (!response.ok) throw new Error(`翻译服务返回 ${response.status}`);
  const data = await response.json() as { responseData?: { translatedText?: string } };
  return data.responseData?.translatedText?.trim() ?? "";
}
