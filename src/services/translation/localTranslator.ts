import type { Direction } from "../../desktop";
import { detectChineseContent, getTranslation } from "../../translations";

export const englishDefault =
  "The contract requires the supplier to provide written notice within five business days after receiving the updated delivery schedule.";

export const chineseDefault =
  "合同要求供应商在收到更新后的交付计划后五个工作日内提供书面通知。";

export const languageDirections = ["英 → 中", "中 → 英", "自动检测"] satisfies Direction[];

export function hasChinese(value: string): boolean {
  return detectChineseContent(value);
}

export function detectDirection(value: string): Direction | null {
  const input = value.trim();
  if (!input) return null;
  return hasChinese(input) ? "中 → 英" : "英 → 中";
}

export function translateText(value: string, mode: Direction): string {
  const input = value.trim();
  if (!input) return "";

  const resolvedMode = mode === "自动检测" ? detectDirection(input) : mode;
  const enhancedTranslation = getTranslation(input, resolvedMode !== "中 → 英");
  if (enhancedTranslation && enhancedTranslation !== input) return enhancedTranslation;

  const lower = input.toLowerCase();

  if (resolvedMode === "中 → 英") {
    if (input.includes("合同要求供应商")) return englishDefault;
    if (input.includes("付款说明")) return "Payment instructions must remain unchanged.";
    if (input.includes("五个工作日")) return "within five business days";
    return `Offline English draft: ${input}`;
  }

  if (lower.includes("payment instructions")) return "付款说明必须保持不变。";
  if (lower.includes("the contract requires") || lower.includes("supplier")) return chineseDefault;
  if (lower.includes("within five business days")) return "五个工作日内。";
  return `离线中文译文草稿：${input}`;
}
