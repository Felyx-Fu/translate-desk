import {
  Component,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Dismiss24Regular } from "@fluentui/react-icons";
import type {
  CapturePayload,
  ClipboardHistoryItem,
  CommandPayload,
  DesktopApi,
  Direction,
  OcrResultState,
  OcrSelectResult,
  SelectionRect,
  ShortcutStatus,
  WordbookEntry,
} from "./desktop";
import {
  chineseDefault,
  detectDirection,
  englishDefault,
  hasChinese,
  languageDirections,
  loadSettings,
  translateText,
  translationProviders,
  translateWithSettings,
  type TranslationProvider,
  type TranslationSettings,
} from "./services/translation";

const navItems = [
  "翻译工作台",
  "设置中心",
  "截图 OCR",
  "剪贴板监听",
  "生词本",
  "离线词库",
  "朗读设置",
] as const;

type ActiveNav = (typeof navItems)[number];
type TopPanel = "search" | "command" | "settings" | null;
type Point = Pick<SelectionRect, "x" | "y">;

type ErrorBoundaryState = {
  error: Error | null;
};

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Translate Desk crashed", error, info);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <main className="error-shell">
        <section>
          <h1>程序遇到了一点问题</h1>
          <p>你可以尝试重新加载应用。如果问题仍然存在，请反馈日志信息。</p>
          <button type="button" onClick={() => window.location.reload()}>重新加载</button>
        </section>
      </main>
    );
  }
}

const quickStatus = [
  "划词后显示悬浮窗",
  "检测剪贴板英文",
  "离线翻译已准备",
  "朗读：英音 / 1.0x",
];

const defaultWordbook: WordbookEntry[] = [
  { word: "supplier", meaning: "供应商", context: "商务合同" },
  { word: "schedule", meaning: "计划表", context: "项目管理" },
  { word: "notice", meaning: "通知", context: "法务文件" },
];

const clipboardHistory = [
  "The supplier acknowledged the revised terms.",
  "Payment instructions must remain unchanged.",
  "Within five business days.",
];

function getDesktop(): DesktopApi | null {
  return typeof window !== "undefined" ? window.desktop ?? null : null;
}

function formatTime(value: string | null | undefined, fallback = "09:42"): string {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function speakText(value: string, onDone?: () => void): void {
  if (!value || typeof window === "undefined" || !window.speechSynthesis) {
    onDone?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  
  // Detect language and set appropriate properties
  if (hasChinese(value)) {
    utterance.lang = "zh-CN";
    utterance.rate = 0.9; // Slightly slower for clarity
  } else {
    utterance.lang = "en-US";
    utterance.rate = 1;
  }
  
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onend = () => onDone?.();
  utterance.onerror = () => onDone?.();
  window.speechSynthesis.speak(utterance);
}

function createWordbookEntry(source: string, target: string): WordbookEntry {
  const match = source.match(/[A-Za-z][A-Za-z-]+/);
  const word = match?.[0]?.toLowerCase() || source.slice(0, 12);
  const meaning = hasChinese(target) ? target.slice(0, 18) : "待复习";
  return {
    word,
    meaning,
    context: hasChinese(source) ? "中译英" : "英译中",
  };
}

function isWordbookEntry(value: unknown): value is WordbookEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<WordbookEntry>;
  return (
    typeof entry.word === "string" &&
    typeof entry.meaning === "string" &&
    typeof entry.context === "string"
  );
}

function isOcrCancelled(result: OcrSelectResult): result is { cancelled: true } {
  return "cancelled" in result && result.cancelled === true;
}

type IconButtonProps = {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
};

function IconButton({ label, children, onClick, active = false }: IconButtonProps) {
  return (
    <button
      className={`icon-button${active ? " is-active" : ""}`}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type PillProps = {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
};

function Pill({ children, active, onClick }: PillProps) {
  return (
    <button
      className={`pill${active ? " is-active" : ""}`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type MetricProps = {
  label: string;
  value: string;
  tone: string;
};

function Metric({ label, value, tone }: MetricProps) {
  return (
    <div className="metric">
      <strong className={`metric-value ${tone}`}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

type StatusRowProps = {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
};

function StatusRow({ children, active, onClick }: StatusRowProps) {
  return (
    <button className={`status-row${active ? " is-on" : ""}`} type="button" onClick={onClick}>
      <span>{children}</span>
    </button>
  );
}

type OcrResultProps = {
  ocrResult: OcrResultState | null;
};

function OcrResult({ ocrResult }: OcrResultProps) {
  if (ocrResult?.status === "recognizing") {
    return (
      <>
        <span>识别中</span>
        <strong>正在读取屏幕文字...</strong>
        <p>识别完成后会自动生成译文并回填到翻译工作台。</p>
      </>
    );
  }

  if (ocrResult?.error) {
    return (
      <>
        <span>识别失败</span>
        <strong>{ocrResult.error}</strong>
        <p>可以重新截图，或先复制文字到剪贴板翻译。</p>
      </>
    );
  }

  if (ocrResult?.text) {
    return (
      <>
        <span>{`识别结果 / 置信度 ${ocrResult.confidence ?? 0}%`}</span>
        <strong>{ocrResult.text}</strong>
        <p>{ocrResult.translation}</p>
      </>
    );
  }

  return (
    <>
      <span>识别结果</span>
      <strong>等待截图</strong>
      <p>点击开始截图后，会在这里显示 OCR 文字和译文。</p>
    </>
  );
}

type OcrDialogProps = OcrResultProps & {
  onClose: () => void;
};

function OcrDialog({ ocrResult, onClose }: OcrDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="ocr-dialog" role="dialog" aria-modal="true" aria-labelledby="ocr-title">
        <header className="dialog-header">
          <div>
            <h2 id="ocr-title">截图 OCR 翻译</h2>
            <p>框选屏幕区域后，自动识别英文并生成中文释义。</p>
          </div>
          <IconButton label="关闭 OCR 预览" onClick={onClose}>
            <Dismiss24Regular />
          </IconButton>
        </header>
        <div className="capture-preview">
          <div className="capture-frame">
            {ocrResult?.dataUrl ? (
              <img className="capture-image" src={ocrResult.dataUrl} alt="Captured screen" />
            ) : (
              <>
                <span />
                <p>Drag to capture text area</p>
              </>
            )}
          </div>
          <div className="capture-result">
            <OcrResult ocrResult={ocrResult} />
          </div>
        </div>
      </section>
    </div>
  );
}

type TranslationWorkspaceProps = {
  direction: Direction;
  sourceText: string;
  targetText: string;
  translationStatus: string;
  speaking: boolean;
  saved: boolean;
  onDirectionChange: (direction: Direction) => void;
  onSourceChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onTranslate: () => void;
  onSpeakToggle: () => void;
  onSave: () => void;
  onSelectionTranslate: () => void;
  onCopySource: () => void;
  onCompare: () => void;
  onExport: () => void;
  onOcrOpen: () => void;
};

function TranslationWorkspace({
  direction,
  sourceText,
  targetText,
  translationStatus,
  speaking,
  saved,
  onDirectionChange,
  onSourceChange,
  onTargetChange,
  onTranslate,
  onSpeakToggle,
  onSave,
  onSelectionTranslate,
  onCopySource,
  onCompare,
  onExport,
  onOcrOpen,
}: TranslationWorkspaceProps) {
  return (
    <>
      <div className="language-tabs" aria-label="Translation direction">
        {languageDirections.map((item) => (
          <Pill key={item} active={item === direction} onClick={() => onDirectionChange(item)}>
            {item}
          </Pill>
        ))}
      </div>

      <div className="translation-grid">
        <article className="text-panel">
          <div className="panel-label">原文</div>
          <textarea
            className="copy-editor source-copy"
            aria-label="原文编辑区"
            value={sourceText}
            onChange={(event) => onSourceChange(event.target.value)}
          />
          <div className="panel-actions">
            <button type="button" onClick={onTranslate}>翻译</button>
            <button type="button" onClick={onSelectionTranslate}>划词翻译</button>
            <button type="button" onClick={onSpeakToggle}>
              {speaking ? "停止" : "朗读"}
            </button>
            <button type="button" onClick={onCopySource}>复制</button>
          </div>
        </article>

        <article className="text-panel result-panel">
          <div className="panel-label">译文</div>
          <textarea
            className="copy-editor target-copy"
            aria-label="译文编辑区"
            value={targetText}
            onChange={(event) => onTargetChange(event.target.value)}
          />
          <div className="panel-actions">
            <button type="button" onClick={onSave}>
              {saved ? "已加入" : "加入生词本"}
            </button>
            <button type="button" onClick={onCompare}>对照</button>
            <button type="button" onClick={onExport}>导出</button>
          </div>
        </article>
      </div>

      <p className="translation-status">{translationStatus}</p>

      <article className="ocr-strip">
        <div>
          <div className="panel-label">截图 OCR 翻译</div>
          <p>框选屏幕区域后自动识别英文，保持原段落结构并生成中文释义。</p>
        </div>
        <button className="primary-action" type="button" onClick={onOcrOpen}>
          开始截图
        </button>
      </article>
    </>
  );
}

type OcrWorkspaceProps = OcrResultProps & {
  onOcrOpen: () => void;
  onTextChange: (value: string) => void;
  onTranslationChange: (value: string) => void;
  onRetranslate: () => void;
  onCopyOriginal: () => void;
  onCopyTranslation: () => void;
  onSaveWord: () => void;
};

function OcrWorkspace({
  ocrResult,
  onOcrOpen,
  onTextChange,
  onTranslationChange,
  onRetranslate,
  onCopyOriginal,
  onCopyTranslation,
  onSaveWord,
}: OcrWorkspaceProps) {
  const hasText = Boolean(ocrResult?.text?.trim());

  return (
    <section className="feature-page">
      <header className="page-header">
        <h2>截图 OCR</h2>
        <p>框选屏幕区域，识别英文后以原文和译文对照方式处理。</p>
      </header>
      <div className="ocr-layout">
        <div className="capture-frame large">
          {ocrResult?.dataUrl ? (
            <img className="capture-image" src={ocrResult.dataUrl} alt="Captured screen" />
          ) : (
            <>
              <span />
              <p>拖拽选择屏幕文字区域</p>
            </>
          )}
        </div>
        <article className="page-card result-card ocr-summary">
          <OcrResult ocrResult={ocrResult} />
          <button type="button" onClick={onOcrOpen}>
            {ocrResult?.status === "recognizing" ? "识别中" : "开始截图识别"}
          </button>
        </article>
      </div>
      <div className="ocr-compare-grid">
        <article className="text-panel">
          <div className="panel-label">OCR 原文</div>
          <textarea
            className="copy-editor source-copy ocr-editor"
            aria-label="OCR 原文编辑区"
            value={ocrResult?.text ?? ""}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="截图识别后，可在这里修正原文。"
          />
          <div className="panel-actions">
            <button type="button" onClick={onRetranslate} disabled={!hasText}>重新翻译</button>
            <button type="button" onClick={onCopyOriginal} disabled={!hasText}>复制原文</button>
          </div>
        </article>

        <article className="text-panel result-panel">
          <div className="panel-label">翻译结果</div>
          <textarea
            className="copy-editor target-copy ocr-editor"
            aria-label="OCR 译文编辑区"
            value={ocrResult?.translation ?? ""}
            onChange={(event) => onTranslationChange(event.target.value)}
            placeholder="译文会显示在这里，也可以手动微调。"
          />
          <div className="panel-actions">
            <button type="button" onClick={onCopyTranslation} disabled={!ocrResult?.translation}>复制译文</button>
            <button type="button" onClick={onSaveWord} disabled={!hasText}>加入生词本</button>
          </div>
        </article>
      </div>
    </section>
  );
}

type ClipboardWorkspaceProps = {
  clipboardOn: boolean;
  items: ClipboardHistoryItem[];
  onToggle: () => void;
  onUseItem: (item: ClipboardHistoryItem) => void;
};

function ClipboardWorkspace({ clipboardOn, items, onToggle, onUseItem }: ClipboardWorkspaceProps) {
  return (
    <section className="feature-page">
      <header className="page-header">
        <h2>剪贴板监听</h2>
        <p>复制英文后自动识别，保留来源时间，并提供翻译入口。</p>
      </header>
      <div className="list-panel">
        {items.map((item, index) => (
          <button className="history-row" type="button" key={`${item.source}-${index}`} onClick={() => onUseItem(item)}>
            <span>{formatTime(item.capturedAt, `09:${42 - index * 12}`)}</span>
            <strong>{item.source}</strong>
          </button>
        ))}
      </div>
      <article className="settings-card">
        <strong>{clipboardOn ? "监听状态：开启" : "监听状态：关闭"}</strong>
        <p>触发条件：复制英文超过 6 个字符。隐私策略：仅本地处理，不上传剪贴板内容。</p>
        <button type="button" onClick={onToggle}>{clipboardOn ? "停止监听" : "开启监听"}</button>
      </article>
    </section>
  );
}

type SettingsWorkspaceProps = {
  settings: TranslationSettings;
  shortcutStatus: ShortcutStatus | null;
  onSettingsChange: (settings: TranslationSettings) => void;
};

function SettingsWorkspace({ settings, shortcutStatus, onSettingsChange }: SettingsWorkspaceProps) {
  function updateSettings(patch: Partial<TranslationSettings>): void {
    onSettingsChange({ ...settings, ...patch });
  }

  return (
    <section className="feature-page">
      <header className="page-header">
        <h2>设置中心</h2>
        <p>配置翻译引擎、默认方向、OCR 行为、剪贴板监听和本地隐私选项。</p>
      </header>

      <div className="settings-grid">
        <article className="settings-section">
          <h3>翻译</h3>
          <label>
            <span>翻译服务商</span>
            <select
              value={settings.provider}
              onChange={(event) => updateSettings({ provider: event.target.value as TranslationProvider })}
            >
              {translationProviders.map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </label>
          <label>
            <span>默认翻译方向</span>
            <select
              value={settings.defaultDirection}
              onChange={(event) => updateSettings({ defaultDirection: event.target.value as Direction })}
            >
              {languageDirections.map((directionItem) => (
                <option key={directionItem} value={directionItem}>{directionItem}</option>
              ))}
            </select>
          </label>
          <label>
            <span>API Endpoint</span>
            <input
              value={settings.apiEndpoint}
              onChange={(event) => updateSettings({ apiEndpoint: event.target.value })}
              placeholder="https://libretranslate.com/translate"
            />
          </label>
          <label>
            <span>API Key</span>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(event) => updateSettings({ apiKey: event.target.value })}
              placeholder="用户自填，保存在本机浏览器存储"
            />
          </label>
        </article>

        <article className="settings-section">
          <h3>办公体验</h3>
          <label className="toggle-row">
            <span>自动检测语言</span>
            <input
              type="checkbox"
              checked={settings.autoDetect}
              onChange={(event) => updateSettings({ autoDetect: event.target.checked })}
            />
          </label>
          <label className="toggle-row">
            <span>启用办公润色提示</span>
            <input
              type="checkbox"
              checked={settings.officePolish}
              onChange={(event) => updateSettings({ officePolish: event.target.checked })}
            />
          </label>
          <label className="toggle-row">
            <span>保留翻译历史</span>
            <input
              type="checkbox"
              checked={settings.keepHistory}
              onChange={(event) => updateSettings({ keepHistory: event.target.checked })}
            />
          </label>
          <div className="settings-note">
            <strong>隐私提示</strong>
            <p>在线翻译会把原文发送到所选翻译服务商；剪贴板、生词本和离线规则数据默认只保存在本机。</p>
          </div>
        </article>

        <article className="settings-section">
          <h3>快捷键与 OCR</h3>
          <label>
            <span>划词翻译快捷键</span>
            <input
              value={settings.selectionShortcut}
              onChange={(event) => updateSettings({ selectionShortcut: event.target.value })}
              placeholder="CommandOrControl+Space"
            />
          </label>
          <div className={`shortcut-status${shortcutStatus?.registered ? " is-ok" : " is-warning"}`}>
            <strong>{shortcutStatus?.registered ? "注册成功" : "等待注册"}</strong>
            <span>{shortcutStatus?.error || "当前快捷键可用于全局划词翻译。"}</span>
          </div>
          <div className="readonly-setting">
            <span>备用快捷键建议</span>
            <strong>CommandOrControl+Alt+T</strong>
          </div>
          <div className="readonly-setting">
            <span>OCR 语言</span>
            <strong>英文 first-pass</strong>
          </div>
        </article>
      </div>
    </section>
  );
}

type WordbookWorkspaceProps = {
  words: WordbookEntry[];
  onSpeakWord: (word: string) => void;
};

function WordbookWorkspace({ words, onSpeakWord }: WordbookWorkspaceProps) {
  return (
    <section className="feature-page">
      <header className="page-header">
        <h2>生词本</h2>
        <p>自动收集翻译中标记的重点词，支持例句、朗读和复习状态。</p>
      </header>
      <div className="wordbook-grid">
        <div className="list-panel">
          {words.map((entry) => (
            <button className="wordbook-row" type="button" key={entry.word}>
              <strong>{entry.word}</strong>
              <span>{entry.meaning}</span>
              <small>{entry.context}</small>
            </button>
          ))}
        </div>
        <article className="page-card word-detail">
          <span>当前词条</span>
          <strong>{words[0]?.word || "supplier"}</strong>
          <p>{words[0]?.meaning || "供应商"}。例句：The supplier confirmed the updated delivery schedule.</p>
          <button type="button" onClick={() => onSpeakWord(words[0]?.word || "supplier")}>朗读词条</button>
        </article>
      </div>
    </section>
  );
}

function OfflineWorkspace() {
  const packs = ["基础商务词库 / 已安装", "法律合同词库 / 可更新", "学术阅读词库 / 未安装"];
  return (
    <section className="feature-page">
      <header className="page-header">
        <h2>离线词库</h2>
        <p>下载常用词库后，无网络环境下仍可完成基础英汉互译。</p>
      </header>
      <div className="list-panel">
        {packs.map((pack) => (
          <button className="history-row" type="button" key={pack}>
            <strong>{pack}</strong>
            <span>管理</span>
          </button>
        ))}
      </div>
      <article className="settings-card">
        <strong>离线模式可用</strong>
        <p>当前词库覆盖商务、合同、项目管理常见表达。</p>
      </article>
    </section>
  );
}

type VoiceWorkspaceProps = {
  speaking: boolean;
  onSpeakToggle: () => void;
};

function VoiceWorkspace({ speaking, onSpeakToggle }: VoiceWorkspaceProps) {
  return (
    <section className="feature-page">
      <header className="page-header">
        <h2>朗读设置</h2>
        <p>配置原文朗读、译文朗读、语速、音色和循环次数。</p>
      </header>
      <div className="list-panel">
        {["英音 / 1.0x", "美音 / 0.9x", "中文女声 / 1.0x"].map((voice) => (
          <button className="history-row" type="button" key={voice}>
            <strong>{voice}</strong>
            <span>试听</span>
          </button>
        ))}
      </div>
      <article className="settings-card">
        <strong>{speaking ? "正在朗读原文" : "朗读队列空闲"}</strong>
        <p>朗读顺序：原文 → 译文 → 重点词。循环次数：1 次。</p>
        <button type="button" onClick={onSpeakToggle}>{speaking ? "停止朗读" : "开始朗读"}</button>
      </article>
    </section>
  );
}

type ClosePanelProps = {
  onClose: () => void;
};

function SearchPanel({ onClose }: ClosePanelProps) {
  return (
    <section className="floating-panel search-panel">
      <header>
        <strong>搜索历史、生词或句子</strong>
        <button type="button" onClick={onClose}>关闭</button>
      </header>
      <input value="supplier" readOnly />
      {["supplier  供应商", "supplier acknowledged revised terms", "The supplier confirmed delivery schedule"].map((item) => (
        <button type="button" key={item}>{item}</button>
      ))}
    </section>
  );
}

type CommandPanelProps = ClosePanelProps & {
  payload: CommandPayload;
  onCopy: (value: string) => Promise<void>;
  onSave: (source: string, target: string) => void;
  onSpeak: (value: string) => void;
};

function CommandPanel({ payload, onClose, onCopy, onSave, onSpeak }: CommandPanelProps) {
  const source = payload?.source || "written notice within five business days";
  const target = payload?.target || "五个工作日内的书面通知";

  return (
    <section className="floating-panel command-panel">
      <header>
        <strong>Ctrl Space 悬浮翻译</strong>
        <button type="button" onClick={onClose}>关闭</button>
      </header>
      <div className="command-grid">
        <p>{source}</p>
        <strong>{target}</strong>
      </div>
      <div className="command-actions">
        <button type="button" onClick={() => onSave(source, target)}>加入生词本</button>
        <button type="button" onClick={() => onSpeak(source)}>朗读</button>
        <button type="button" onClick={() => onCopy(target)}>复制</button>
      </div>
    </section>
  );
}

function SettingsPanel({ onClose }: ClosePanelProps) {
  const rows = ["开机启动", "启用剪贴板监听", "划词后显示悬浮窗", "无网络时使用离线词库"];
  return (
    <aside className="settings-drawer">
      <header>
        <strong>设置</strong>
        <button type="button" onClick={onClose}>关闭</button>
      </header>
      {rows.map((row) => (
        <button type="button" key={row}>
          <span>{row}</span>
          <strong>ON</strong>
        </button>
      ))}
    </aside>
  );
}

function FloatingTranslator() {
  const [source, setSource] = useState<string>("written notice within five business days");
  const [target, setTarget] = useState<string>(() => translateText(source, "自动检测"));
  const [status, setStatus] = useState<string>("离线预览");
  const [pinned, setPinned] = useState<boolean>(false);
  const [showSource, setShowSource] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return undefined;

    desktop.clipboard.getText().then((value) => {
      if (value?.trim()) setSource(value.trim());
    });
    return desktop.floating.onPayload((payload) => {
      if (payload?.source?.trim()) setSource(payload.source.trim());
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const settings = loadSettings();
    setTarget(translateText(source, "自动检测"));
    setStatus("翻译中");
    void translateWithSettings(source, settings.autoDetect ? "自动检测" : settings.defaultDirection, settings)
      .then((result) => {
        if (cancelled) return;
        setTarget(result.text);
        setStatus(result.error ? "已回退到离线译文" : "在线译文");
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  async function copyTarget() {
    const desktop = getDesktop();
    if (desktop) {
      await desktop.clipboard.writeText(target);
      return;
    }
    await navigator.clipboard?.writeText(target);
  }

  async function saveFloatingWord() {
    const entry = createWordbookEntry(source, target);
    const desktop = getDesktop();
    if (desktop) {
      const entries = await desktop.wordbook.load();
      await desktop.wordbook.save([
        entry,
        ...entries.filter((item) => item.word !== entry.word),
      ]);
    } else {
      const stored = JSON.parse(localStorage.getItem("translate-desk-wordbook") || "[]") as unknown;
      const entries = Array.isArray(stored) ? stored.filter(isWordbookEntry) : [];
      localStorage.setItem("translate-desk-wordbook", JSON.stringify([
        entry,
        ...entries.filter((item) => item.word !== entry.word),
      ]));
    }
    setSaved(true);
  }

  return (
    <main className="floating-shell">
      <header>
        <strong>Translate Desk</strong>
        <div>
          <button type="button" onClick={() => setPinned((value) => !value)}>
            {pinned ? "取消固定" : "固定"}
          </button>
          <button type="button" onClick={() => getDesktop()?.floating.hide()} disabled={pinned}>关闭</button>
        </div>
      </header>
      <textarea
        aria-label="悬浮窗原文"
        value={source}
        onChange={(event) => setSource(event.target.value)}
      />
      <section>
        <span>{showSource ? "原文" : status}</span>
        <p>{showSource ? source : target}</p>
      </section>
      <footer>
        <button type="button" onClick={() => setShowSource((value) => !value)}>
          {showSource ? "看译文" : "看原文"}
        </button>
        <button type="button" onClick={saveFloatingWord}>{saved ? "已加入" : "加入生词本"}</button>
        <button type="button" onClick={() => speakText(source)}>朗读</button>
        <button type="button" onClick={copyTarget}>复制译文</button>
      </footer>
    </main>
  );
}

function CaptureSelector() {
  const [payload, setPayload] = useState<CapturePayload | null>(null);
  const [start, setStart] = useState<Point | null>(null);
  const [current, setCurrent] = useState<Point | null>(null);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return undefined;

    const unsubscribe = desktop.capture.onPayload(setPayload);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") desktop.capture.cancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const rect: SelectionRect | null = start && current
    ? {
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        width: Math.abs(current.x - start.x),
        height: Math.abs(current.y - start.y),
      }
    : null;

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    setStart({ x: event.clientX, y: event.clientY });
    setCurrent({ x: event.clientX, y: event.clientY });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!start) return;
    setCurrent({ x: event.clientX, y: event.clientY });
  }

  function handlePointerUp() {
    const desktop = getDesktop();
    if (!desktop || !rect) return;
    if (rect.width < 8 || rect.height < 8) {
      setStart(null);
      setCurrent(null);
      return;
    }

    desktop.capture.submit({
      ...rect,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
  }

  return (
    <main
      className="capture-shell"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {payload?.dataUrl ? <img src={payload.dataUrl} alt="Screen capture" /> : null}
      <div className="capture-dim" />
      {rect ? (
        <div
          className="capture-selection"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
        />
      ) : null}
      <section className="capture-help" onPointerDown={(event) => event.stopPropagation()}>
        <strong>拖拽框选要识别的英文区域</strong>
        <span>松开鼠标后自动 OCR。Esc 取消。</span>
        <button type="button" onClick={() => getDesktop()?.capture.cancel()}>取消</button>
      </section>
    </main>
  );
}

function MainApp() {
  const [activeNav, setActiveNav] = useState<ActiveNav>("翻译工作台");
  const [direction, setDirection] = useState<Direction>("英 → 中");
  const [sourceText, setSourceText] = useState<string>(englishDefault);
  const [targetText, setTargetText] = useState<string>(chineseDefault);
  const [settings, setSettings] = useState<TranslationSettings>(() => loadSettings());
  const [shortcutStatus, setShortcutStatus] = useState<ShortcutStatus | null>(null);
  const [translationStatus, setTranslationStatus] = useState<string>("默认使用免费在线翻译；失败时自动回退到离线草稿。");
  const [clipboardItems, setClipboardItems] = useState<ClipboardHistoryItem[]>(() =>
    clipboardHistory.map((source) => ({
      source,
      target: translateText(source, "自动检测"),
      capturedAt: null,
    })),
  );
  const [wordbookEntries, setWordbookEntries] = useState<WordbookEntry[]>(defaultWordbook);
  const [wordbookReady, setWordbookReady] = useState<boolean>(false);
  const [clipboardOn, setClipboardOn] = useState<boolean>(true);
  const [saved, setSaved] = useState<boolean>(false);
  const [speaking, setSpeaking] = useState<boolean>(false);
  const [ocrOpen, setOcrOpen] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<OcrResultState | null>(null);
  const [topPanel, setTopPanel] = useState<TopPanel>(null);
  const [commandPayload, setCommandPayload] = useState<CommandPayload>({
    source: "written notice within five business days",
    target: "五个工作日内的书面通知",
  });

  useEffect(() => {
    const desktop = getDesktop();
    if (desktop) {
      desktop.wordbook.load().then((entries) => {
        if (entries.length > 0) setWordbookEntries(entries);
        setWordbookReady(true);
      });
      return;
    }

    try {
      const stored = JSON.parse(localStorage.getItem("translate-desk-wordbook") || "[]") as unknown;
      if (Array.isArray(stored)) {
        const entries = stored.filter(isWordbookEntry);
        if (entries.length > 0) setWordbookEntries(entries);
      }
    } catch {
      // Ignore malformed local prototype data.
    }
    setWordbookReady(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("translate-desk-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return undefined;

    desktop.shortcuts.getStatus().then(setShortcutStatus);
    return desktop.shortcuts.onStatus(setShortcutStatus);
  }, []);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;

    const timeout = window.setTimeout(() => {
      desktop.shortcuts.setAccelerator(settings.selectionShortcut).then(setShortcutStatus);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [settings.selectionShortcut]);

  useEffect(() => {
    if (!wordbookReady) return;

    const desktop = getDesktop();
    if (desktop) {
      desktop.wordbook.save(wordbookEntries);
      return;
    }
    localStorage.setItem("translate-desk-wordbook", JSON.stringify(wordbookEntries));
  }, [wordbookEntries, wordbookReady]);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return undefined;

    if (!clipboardOn) {
      desktop.clipboard.stopWatch();
      return undefined;
    }

    desktop.clipboard.startWatch();
    return desktop.clipboard.onText((item) => {
      const source = item?.text?.trim();
      if (!source) return;
      void translateWithSettings(source, settings.autoDetect ? "自动检测" : settings.defaultDirection, settings)
        .then(({ text }) => {
          if (!settings.keepHistory) return;
          setClipboardItems((current) => [
            { source, target: text, capturedAt: item.capturedAt },
            ...current.filter((entry) => entry.source !== source),
          ].slice(0, 8));
        });
    });
  }, [clipboardOn, settings]);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return undefined;

    return desktop.shortcuts.onTranslate((payload) => {
      const source = payload?.text?.trim();
      if (!source) return;
      void translateWithSettings(source, settings.autoDetect ? "自动检测" : settings.defaultDirection, settings)
        .then(({ text }) => {
          setCommandPayload({ source, target: text });
          setTopPanel("command");
        });
    });
  }, [settings]);

  async function applyTranslation(value: string): Promise<CommandPayload> {
    const nextDirection = settings.autoDetect ? detectDirection(value) || direction : settings.defaultDirection;
    setTranslationStatus("正在调用翻译服务...");
    const result = await translateWithSettings(value, nextDirection, settings);
    setDirection(nextDirection);
    setSourceText(value);
    setTargetText(result.text);
    setTranslationStatus(
      result.error
        ? `在线翻译失败，已使用离线草稿：${result.error}`
        : result.usedFallback
          ? "已使用离线规则生成译文。"
          : "已完成在线翻译。",
    );
    return { source: value, target: result.text };
  }

  function handleSourceChange(value: string): void {
    const detectedDirection = detectDirection(value);
    const nextDirection =
      direction === "自动检测" ? direction : detectedDirection ?? direction;
    setSourceText(value);
    if (detectedDirection && direction !== "自动检测" && detectedDirection !== direction) {
      setDirection(detectedDirection);
    }
    setTargetText(translateText(value, nextDirection));
    setTranslationStatus("已生成离线预览，点击“翻译”获取在线译文。");
  }

  function selectDirection(nextDirection: Direction): void {
    setDirection(nextDirection);
    if (nextDirection === "自动检测") {
      setTargetText(translateText(sourceText, nextDirection));
      setTranslationStatus("已切换方向，点击“翻译”刷新在线译文。");
      return;
    }

    const sourceDirection = detectDirection(sourceText);
    const useDefaults =
      !sourceDirection ||
      sourceDirection !== nextDirection ||
      sourceText === englishDefault ||
      sourceText === chineseDefault ||
      sourceText === translateText(chineseDefault, "中 → 英");
    const nextSource = useDefaults
      ? nextDirection === "英 → 中"
        ? englishDefault
        : chineseDefault
      : sourceText;
    setSourceText(nextSource);
    setTargetText(translateText(nextSource, nextDirection));
    setTranslationStatus("已切换方向，点击“翻译”刷新在线译文。");
  }

  async function writeClipboard(value: string): Promise<void> {
    const desktop = getDesktop();
    if (desktop) {
      await desktop.clipboard.writeText(value);
      return;
    }
    await navigator.clipboard?.writeText(value);
  }

  function addWordbookEntry(source = sourceText, target = targetText): void {
    const entry = createWordbookEntry(source, target);
    setWordbookEntries((current) => [
      entry,
      ...current.filter((item) => item.word !== entry.word),
    ]);
    setSaved(true);
  }

  function handleSpeak(value = sourceText): void {
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speakText(value, () => setSpeaking(false));
  }

  async function handleSelectionTranslate() {
    const desktop = getDesktop();
    const selectedText = window.getSelection?.()?.toString().trim() ?? "";
    const externalSelection =
      !selectedText && desktop?.selection
        ? await desktop.selection.read()
        : null;
    const clipboardText = desktop ? await desktop.clipboard.getText() : "";
    const source =
      selectedText ||
      externalSelection?.text?.trim() ||
      clipboardText?.trim() ||
      sourceText;
    const payload = await applyTranslation(source);
    setCommandPayload(payload);
    setTopPanel("command");
    desktop?.floating.show(payload);
  }

  async function handleOcrOpen() {
    setOcrOpen(true);
    const desktop = getDesktop();
    if (!desktop) {
      setOcrResult({
        status: "ready",
        name: "Prototype capture",
        dataUrl: null,
        text: "Payment instructions must remain unchanged.",
        translation: "付款说明必须保持不变。",
        confidence: 100,
        error: null,
      });
      return;
    }

    setOcrResult((current) => ({
      ...(current ?? {
        name: "Region capture",
        dataUrl: null,
        text: "",
        translation: "",
        confidence: 0,
        error: null,
      }),
      status: "recognizing",
      error: null,
    }));
    try {
      const result = await desktop.ocr.selectRegion();
      if (isOcrCancelled(result)) {
        setOcrResult((current) => current ? { ...current, status: "ready" } : null);
        return;
      }
      const text = result.text?.trim() || "";
      const translation = text
        ? (await translateWithSettings(text, settings.autoDetect ? "自动检测" : settings.defaultDirection, settings)).text
        : "";
      const nextResult: OcrResultState = {
        ...result,
        text,
        translation,
        status: "ready",
      };
      setOcrResult(nextResult);
      if (text) {
        await applyTranslation(text);
        setActiveNav("翻译工作台");
      }
    } catch (error) {
      setOcrResult({
        status: "ready",
        name: "Region capture",
        dataUrl: null,
        text: "",
        translation: "",
        confidence: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleOcrRetranslate(): Promise<void> {
    const text = ocrResult?.text?.trim();
    if (!text) return;
    const result = await translateWithSettings(
      text,
      settings.autoDetect ? "自动检测" : settings.defaultDirection,
      settings,
    );
    setOcrResult((current) => current ? { ...current, translation: result.text } : current);
    setTranslationStatus(
      result.error
        ? `OCR 重新翻译失败，已使用离线草稿：${result.error}`
        : "OCR 原文已重新翻译。",
    );
  }

  function updateOcrText(text: string): void {
    setOcrResult((current) => current
      ? { ...current, text }
      : {
          status: "ready",
          name: "Manual OCR text",
          dataUrl: null,
          text,
          translation: "",
          confidence: 0,
          error: null,
        });
  }

  function updateOcrTranslation(translation: string): void {
    setOcrResult((current) => current
      ? { ...current, translation }
      : {
          status: "ready",
          name: "Manual OCR text",
          dataUrl: null,
          text: "",
          translation,
          confidence: 0,
          error: null,
        });
  }

  function saveOcrWord(): void {
    if (!ocrResult?.text) return;
    addWordbookEntry(ocrResult.text, ocrResult.translation ?? "");
  }

  function handleUseClipboardItem(item: ClipboardHistoryItem): void {
    void applyTranslation(item.source);
    setActiveNav("翻译工作台");
  }

  function renderWorkspace(): ReactNode {
    if (activeNav === "设置中心") {
      return (
        <SettingsWorkspace
          settings={settings}
          shortcutStatus={shortcutStatus}
          onSettingsChange={setSettings}
        />
      );
    }
    if (activeNav === "截图 OCR") {
      return (
        <OcrWorkspace
          ocrResult={ocrResult}
          onOcrOpen={handleOcrOpen}
          onTextChange={updateOcrText}
          onTranslationChange={updateOcrTranslation}
          onRetranslate={() => {
            void handleOcrRetranslate();
          }}
          onCopyOriginal={() => {
            void writeClipboard(ocrResult?.text ?? "");
          }}
          onCopyTranslation={() => {
            void writeClipboard(ocrResult?.translation ?? "");
          }}
          onSaveWord={saveOcrWord}
        />
      );
    }
    if (activeNav === "剪贴板监听") {
      return (
        <ClipboardWorkspace
          clipboardOn={clipboardOn}
          items={clipboardItems}
          onToggle={() => setClipboardOn((value) => !value)}
          onUseItem={handleUseClipboardItem}
        />
      );
    }
    if (activeNav === "生词本") {
      return <WordbookWorkspace words={wordbookEntries} onSpeakWord={(word) => handleSpeak(word)} />;
    }
    if (activeNav === "离线词库") return <OfflineWorkspace />;
    if (activeNav === "朗读设置") {
      return <VoiceWorkspace speaking={speaking} onSpeakToggle={() => handleSpeak(sourceText)} />;
    }
    return (
      <TranslationWorkspace
        direction={direction}
        sourceText={sourceText}
        targetText={targetText}
        translationStatus={translationStatus}
        speaking={speaking}
        saved={saved}
        onDirectionChange={selectDirection}
        onSourceChange={handleSourceChange}
        onTargetChange={setTargetText}
        onTranslate={() => {
          void applyTranslation(sourceText);
        }}
        onSpeakToggle={() => handleSpeak(sourceText)}
        onSave={() => addWordbookEntry()}
        onSelectionTranslate={handleSelectionTranslate}
        onCopySource={() => writeClipboard(sourceText)}
        onCompare={() => {
          setCommandPayload({ source: sourceText, target: targetText });
          setTopPanel("command");
        }}
        onExport={() => writeClipboard(targetText)}
        onOcrOpen={handleOcrOpen}
      />
    );
  }

  return (
    <main className="prototype-shell">
      <section className="app-window" aria-label="Translate Desk static prototype">
        <header className="title-bar">
          <div className="brand">
            <strong>Translate Desk</strong>
          </div>
          <div className="window-tools">
            <button type="button" onClick={() => setTopPanel("search")}>Search</button>
            <button type="button" onClick={() => setTopPanel("command")}>Ctrl Space</button>
            <button type="button" onClick={() => setTopPanel("settings")}>Settings</button>
          </div>
        </header>

        <aside className="sidebar" aria-label="Feature navigation">
          <nav>
            {navItems.map((item) => (
              <button
                className={item === activeNav ? "is-selected" : ""}
                type="button"
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setTopPanel(null);
                }}
              >
                {item}
              </button>
            ))}
          </nav>
          <p>本地离线模式可用<br />无网络时自动切换词库</p>
        </aside>

        <section className="workspace">
          {renderWorkspace()}
        </section>

        <aside className="right-rail" aria-label="Realtime status">
          <h2>实时状态</h2>
          <div className="metric-grid">
            <button
              className="metric-toggle"
              type="button"
              onClick={() => setClipboardOn((value) => !value)}
              aria-pressed={clipboardOn}
            >
              <Metric label="剪贴板监听" value={clipboardOn ? "ON" : "OFF"} tone="green" />
            </button>
            <Metric
              label="今日生词"
              value={String(18 + Math.max(0, wordbookEntries.length - defaultWordbook.length))}
              tone="purple"
            />
          </div>

          <h2>快速入口</h2>
          <div className="status-list">
            {quickStatus.map((item, index) => (
              <StatusRow
                key={item}
                active={index === 1 ? clipboardOn : index !== 0}
                onClick={() => {
                  if (index === 1) setActiveNav("剪贴板监听");
                  if (index === 2) setActiveNav("离线词库");
                  if (index === 3) setActiveNav("朗读设置");
                  if (index === 0) handleSelectionTranslate();
                }}
              >
                {item}
              </StatusRow>
            ))}
          </div>

          <h2>最近生词</h2>
          <div className="word-list">
            {wordbookEntries.slice(0, 4).map((entry) => (
              <button key={entry.word} type="button" onClick={() => setActiveNav("生词本")}>
                <span>{entry.word}</span>
                <strong>{entry.meaning}</strong>
              </button>
            ))}
          </div>
        </aside>

        {topPanel === "search" && <SearchPanel onClose={() => setTopPanel(null)} />}
        {topPanel === "command" && (
          <CommandPanel
            payload={commandPayload}
            onClose={() => setTopPanel(null)}
            onCopy={writeClipboard}
            onSave={addWordbookEntry}
            onSpeak={handleSpeak}
          />
        )}
        {topPanel === "settings" && <SettingsPanel onClose={() => setTopPanel(null)} />}
      </section>

      {ocrOpen && <OcrDialog ocrResult={ocrResult} onClose={() => setOcrOpen(false)} />}
    </main>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      {typeof window !== "undefined" && window.location.hash === "#floating" ? (
        <FloatingTranslator />
      ) : typeof window !== "undefined" && window.location.hash === "#capture" ? (
        <CaptureSelector />
      ) : (
        <MainApp />
      )}
    </ErrorBoundary>
  );
}
