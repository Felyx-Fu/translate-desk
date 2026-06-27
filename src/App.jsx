import { useEffect, useState } from "react";
import { Dismiss24Regular } from "@fluentui/react-icons";

const englishDefault =
  "The contract requires the supplier to provide written notice within five business days after receiving the updated delivery schedule.";

const chineseDefault =
  "合同要求供应商在收到更新后的交付计划后五个工作日内提供书面通知。";

const navItems = [
  "翻译工作台",
  "截图 OCR",
  "剪贴板监听",
  "生词本",
  "离线词库",
  "朗读设置",
];

const quickStatus = [
  "划词后显示悬浮窗",
  "检测剪贴板英文",
  "离线翻译已准备",
  "朗读：英音 / 1.0x",
];

const defaultWordbook = [
  { word: "supplier", meaning: "供应商", context: "商务合同" },
  { word: "schedule", meaning: "计划表", context: "项目管理" },
  { word: "notice", meaning: "通知", context: "法务文件" },
];

const clipboardHistory = [
  "The supplier acknowledged the revised terms.",
  "Payment instructions must remain unchanged.",
  "Within five business days.",
];

function hasChinese(value) {
  return /[\u4e00-\u9fff]/.test(value);
}

function detectDirection(value) {
  const input = value.trim();
  if (!input) return null;
  return hasChinese(input) ? "中 → 英" : "英 → 中";
}

function translateText(value, mode) {
  const input = value.trim();
  if (!input) return "";

  const resolvedMode = mode === "自动检测" ? detectDirection(input) : mode;
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

function getDesktop() {
  return typeof window !== "undefined" ? window.desktop : null;
}

function formatTime(value, fallback = "09:42") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function speakText(value, onDone) {
  if (!value || typeof window === "undefined" || !window.speechSynthesis) {
    onDone?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = hasChinese(value) ? "zh-CN" : "en-US";
  utterance.rate = 1;
  utterance.onend = () => onDone?.();
  utterance.onerror = () => onDone?.();
  window.speechSynthesis.speak(utterance);
}

function createWordbookEntry(source, target) {
  const match = source.match(/[A-Za-z][A-Za-z-]+/);
  const word = match?.[0]?.toLowerCase() || source.slice(0, 12);
  const meaning = hasChinese(target) ? target.slice(0, 18) : "待复习";
  return {
    word,
    meaning,
    context: hasChinese(source) ? "中译英" : "英译中",
  };
}

function IconButton({ label, children, onClick, active = false }) {
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

function Pill({ children, active, onClick }) {
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

function Metric({ label, value, tone }) {
  return (
    <div className="metric">
      <strong className={`metric-value ${tone}`}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function StatusRow({ children, active, onClick }) {
  return (
    <button className={`status-row${active ? " is-on" : ""}`} type="button" onClick={onClick}>
      <span>{children}</span>
    </button>
  );
}

function OcrResult({ ocrResult }) {
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

function OcrDialog({ ocrResult, onClose }) {
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

function TranslationWorkspace({
  direction,
  sourceText,
  targetText,
  speaking,
  saved,
  onDirectionChange,
  onSourceChange,
  onTargetChange,
  onSpeakToggle,
  onSave,
  onSelectionTranslate,
  onCopySource,
  onCompare,
  onExport,
  onOcrOpen,
}) {
  return (
    <>
      <div className="language-tabs" aria-label="Translation direction">
        {["英 → 中", "中 → 英", "自动检测"].map((item) => (
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

function OcrWorkspace({ ocrResult, onOcrOpen }) {
  return (
    <section className="feature-page">
      <header className="page-header">
        <h2>截图 OCR</h2>
        <p>框选屏幕区域，识别英文并直接给出中文结果。</p>
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
        <article className="page-card result-card">
          <OcrResult ocrResult={ocrResult} />
          <button type="button" onClick={onOcrOpen}>
            {ocrResult?.status === "recognizing" ? "识别中" : "开始截图识别"}
          </button>
        </article>
      </div>
    </section>
  );
}

function ClipboardWorkspace({ clipboardOn, items, onToggle, onUseItem }) {
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

function WordbookWorkspace({ words, onSpeakWord }) {
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

function VoiceWorkspace({ speaking, onSpeakToggle }) {
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

function SearchPanel({ onClose }) {
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

function CommandPanel({ payload, onClose, onCopy, onSave, onSpeak }) {
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

function SettingsPanel({ onClose }) {
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
  const [source, setSource] = useState("written notice within five business days");
  const target = translateText(source, "自动检测");

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

  async function copyTarget() {
    const desktop = getDesktop();
    if (desktop) {
      await desktop.clipboard.writeText(target);
      return;
    }
    await navigator.clipboard?.writeText(target);
  }

  return (
    <main className="floating-shell">
      <header>
        <strong>Translate Desk</strong>
        <button type="button" onClick={() => getDesktop()?.floating.hide()}>关闭</button>
      </header>
      <textarea
        aria-label="悬浮窗原文"
        value={source}
        onChange={(event) => setSource(event.target.value)}
      />
      <section>
        <span>译文</span>
        <p>{target}</p>
      </section>
      <footer>
        <button type="button" onClick={() => speakText(source)}>朗读</button>
        <button type="button" onClick={copyTarget}>复制译文</button>
      </footer>
    </main>
  );
}

function MainApp() {
  const [activeNav, setActiveNav] = useState("翻译工作台");
  const [direction, setDirection] = useState("英 → 中");
  const [sourceText, setSourceText] = useState(englishDefault);
  const [targetText, setTargetText] = useState(chineseDefault);
  const [clipboardItems, setClipboardItems] = useState(() =>
    clipboardHistory.map((source) => ({
      source,
      target: translateText(source, "自动检测"),
      capturedAt: null,
    })),
  );
  const [wordbookEntries, setWordbookEntries] = useState(defaultWordbook);
  const [wordbookReady, setWordbookReady] = useState(false);
  const [clipboardOn, setClipboardOn] = useState(true);
  const [saved, setSaved] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [topPanel, setTopPanel] = useState(null);
  const [commandPayload, setCommandPayload] = useState({
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
      const stored = JSON.parse(localStorage.getItem("translate-desk-wordbook") || "[]");
      if (Array.isArray(stored) && stored.length > 0) setWordbookEntries(stored);
    } catch {
      // Ignore malformed local prototype data.
    }
    setWordbookReady(true);
  }, []);

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
      const target = translateText(source, "自动检测");
      setClipboardItems((current) => [
        { source, target, capturedAt: item.capturedAt },
        ...current.filter((entry) => entry.source !== source),
      ].slice(0, 8));
    });
  }, [clipboardOn]);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return undefined;

    return desktop.shortcuts.onTranslate((payload) => {
      const source = payload?.text?.trim();
      if (!source) return;
      const target = translateText(source, "自动检测");
      setCommandPayload({ source, target });
      setTopPanel("command");
    });
  }, []);

  function applyTranslation(value) {
    const nextDirection = detectDirection(value) || direction;
    const nextTarget = translateText(value, nextDirection);
    setDirection(nextDirection);
    setSourceText(value);
    setTargetText(nextTarget);
    return { source: value, target: nextTarget };
  }

  function handleSourceChange(value) {
    const detectedDirection = detectDirection(value);
    const nextDirection =
      direction === "自动检测" ? direction : detectedDirection ?? direction;
    setSourceText(value);
    if (detectedDirection && direction !== "自动检测" && detectedDirection !== direction) {
      setDirection(detectedDirection);
    }
    setTargetText(translateText(value, nextDirection));
  }

  function selectDirection(nextDirection) {
    setDirection(nextDirection);
    if (nextDirection === "自动检测") {
      setTargetText(translateText(sourceText, nextDirection));
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
  }

  async function writeClipboard(value) {
    const desktop = getDesktop();
    if (desktop) {
      await desktop.clipboard.writeText(value);
      return;
    }
    await navigator.clipboard?.writeText(value);
  }

  function addWordbookEntry(source = sourceText, target = targetText) {
    const entry = createWordbookEntry(source, target);
    setWordbookEntries((current) => [
      entry,
      ...current.filter((item) => item.word !== entry.word),
    ]);
    setSaved(true);
  }

  function handleSpeak(value = sourceText) {
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
    const selectedText = window.getSelection?.().toString().trim();
    const clipboardText = desktop ? await desktop.clipboard.getText() : "";
    const source = selectedText || clipboardText?.trim() || sourceText;
    const payload = applyTranslation(source);
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
        dataUrl: null,
        text: "Payment instructions must remain unchanged.",
        translation: "付款说明必须保持不变。",
        confidence: 100,
        error: null,
      });
      return;
    }

    setOcrResult((current) => ({
      ...current,
      status: "recognizing",
      error: null,
    }));
    try {
      const result = await desktop.ocr.recognizePrimary();
      const text = result.text?.trim() || "";
      const translation = text ? translateText(text, "自动检测") : "";
      const nextResult = {
        ...result,
        text,
        translation,
        status: "ready",
      };
      setOcrResult(nextResult);
      if (text) {
        applyTranslation(text);
        setActiveNav("翻译工作台");
      }
    } catch (error) {
      setOcrResult({
        status: "ready",
        dataUrl: null,
        text: "",
        translation: "",
        confidence: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function handleUseClipboardItem(item) {
    applyTranslation(item.source);
    setActiveNav("翻译工作台");
  }

  function renderWorkspace() {
    if (activeNav === "截图 OCR") return <OcrWorkspace ocrResult={ocrResult} onOcrOpen={handleOcrOpen} />;
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
        speaking={speaking}
        saved={saved}
        onDirectionChange={selectDirection}
        onSourceChange={handleSourceChange}
        onTargetChange={setTargetText}
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
  if (typeof window !== "undefined" && window.location.hash === "#floating") {
    return <FloatingTranslator />;
  }

  return <MainApp />;
}
