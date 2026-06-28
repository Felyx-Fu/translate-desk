/**
 * Enhanced translation dictionary for offline translation
 * Organized by categories for better coverage and accuracy
 */

interface TranslationPair {
  zh: string;
  en: string;
}

interface TranslationMap {
  [key: string]: string;
}

// Business and contract terminology
const businessTranslations: TranslationMap = {
  "contract": "合同",
  "supplier": "供应商",
  "payment": "付款",
  "delivery": "交付",
  "schedule": "计划表",
  "notice": "通知",
  "requirement": "要求",
  "terms": "条款",
  "condition": "条件",
  "agreement": "协议",
  "invoice": "发票",
  "purchase order": "采购订单",
  "confirmed": "已确认",
  "acknowledged": "已确认",
  "revised": "修订的",
  "deadline": "截止日期",
  "business days": "工作日",
  "written notice": "书面通知",
  "updated": "更新的",
  "instructions": "说明",
  "remained unchanged": "保持不变",
  "within": "在...内",
  "after receiving": "收到后",
};

// Business Chinese to English
const businessChinese: TranslationMap = {
  "合同": "contract",
  "供应商": "supplier",
  "付款说明": "payment instructions",
  "交付计划": "delivery schedule",
  "计划表": "schedule",
  "通知": "notice",
  "要求": "requirement",
  "条款": "terms",
  "协议": "agreement",
  "发票": "invoice",
  "采购订单": "purchase order",
  "已确认": "confirmed",
  "修订的": "revised",
  "截止日期": "deadline",
  "工作日": "business days",
  "书面通知": "written notice",
  "五个工作日": "five business days",
};

// Office and communication terminology
const officeTranslations: TranslationMap = {
  "meeting": "会议",
  "agenda": "议程",
  "email": "邮件",
  "attachments": "附件",
  "document": "文档",
  "report": "报告",
  "summary": "摘要",
  "feedback": "反馈",
  "deadline": "截止日期",
  "status": "状态",
  "urgent": "紧急",
  "please": "请",
  "regarding": "关于",
  "subject to": "受限于",
};

// Technical terminology
const techTranslations: TranslationMap = {
  "error": "错误",
  "warning": "警告",
  "success": "成功",
  "failed": "失败",
  "loading": "加载中",
  "timeout": "超时",
  "connection": "连接",
  "server": "服务器",
  "client": "客户端",
  "database": "数据库",
  "cache": "缓存",
  "version": "版本",
  "update": "更新",
  "download": "下载",
  "upload": "上传",
};

// Common phrases and sentences
const commonPhrases: TranslationMap = {
  "the contract requires the supplier to provide written notice within five business days after receiving the updated delivery schedule":
    "合同要求供应商在收到更新后的交付计划后五个工作日内提供书面通知。",
  "payment instructions must remain unchanged":
    "付款说明必须保持不变。",
  "the supplier acknowledged the revised terms":
    "供应商确认了修订后的条款。",
  "thank you for your email":
    "感谢您的邮件。",
  "please let me know":
    "请告诉我。",
  "best regards":
    "最好的祝愿。",
  "looking forward to hearing from you":
    "期待收到您的回复。",
};

// Reverse common phrases (Chinese to English)
const commonPhraseChinese: TranslationMap = {
  "合同要求供应商在收到更新后的交付计划后五个工作日内提供书面通知":
    "The contract requires the supplier to provide written notice within five business days after receiving the updated delivery schedule.",
  "付款说明必须保持不变":
    "Payment instructions must remain unchanged.",
  "供应商确认了修订后的条款":
    "The supplier acknowledged the revised terms.",
  "感谢您的邮件":
    "Thank you for your email.",
  "请告诉我":
    "Please let me know.",
  "最好的祝愿":
    "Best regards.",
  "期待收到您的回复":
    "Looking forward to hearing from you.",
};

/**
 * Merge all English to Chinese translations
 */
function buildEnglishToChinese(): TranslationMap {
  return {
    ...businessTranslations,
    ...officeTranslations,
    ...techTranslations,
    ...commonPhrases,
  };
}

/**
 * Merge all Chinese to English translations
 */
function buildChineseTToEnglish(): TranslationMap {
  return {
    ...businessChinese,
    ...commonPhraseChinese,
  };
}

export const englishToChinese = buildEnglishToChinese();
export const chineseToEnglish = buildChineseTToEnglish();

/**
 * Find matching translation using substring matching
 * Falls back to longer substring matches if exact match not found
 */
export function findTranslation(
  text: string,
  dictionary: TranslationMap,
): string | null {
  const lower = text.toLowerCase().trim();

  // Try exact match first
  if (lower in dictionary) {
    return dictionary[lower];
  }

  // Try matching common substrings (longest first)
  const sortedKeys = Object.keys(dictionary).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      return dictionary[key];
    }
  }

  return null;
}

/**
 * Detect if text is likely Chinese
 */
export function detectChineseContent(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Enhanced translation with fallback strategy
 */
export function getTranslation(
  sourceText: string,
  toChinese: boolean,
): string {
  const text = sourceText.trim();
  if (!text) return "";

  const dictionary = toChinese ? englishToChinese : chineseToEnglish;
  const match = findTranslation(text, dictionary);

  if (match) {
    return match;
  }

  // Fallback: word-by-word translation
  const words = text.split(/\s+/);
  const translated = words
    .map((word) => {
      const cleaned = word.toLowerCase().replace(/[^\w]/g, "");
      return findTranslation(cleaned, dictionary) || word;
    })
    .join(" ");

  return translated;
}
