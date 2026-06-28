import type { BrowserWindow as BrowserWindowType, IpcMainInvokeEvent } from "electron";

/**
 * Logging utility for Electron main process
 */
type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 500;

  log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const prefix = `[${level.toUpperCase()}]`;
    const msg = data ? `${prefix} ${message} %O` : `${prefix} ${message}`;

    switch (level) {
      case "error":
        console.error(msg, data);
        break;
      case "warn":
        console.warn(msg, data);
        break;
      case "debug":
        console.debug(msg, data);
        break;
      default:
        console.log(msg, data);
    }
  }

  info(message: string, data?: unknown): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: unknown): void {
    this.log("error", message, data);
  }

  debug(message: string, data?: unknown): void {
    this.log("debug", message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

const logger = new Logger();

const {
  app,
  BrowserWindow,
  clipboard,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  nativeImage,
  screen,
} = require("electron") as typeof import("electron");
const { execFile } = require("node:child_process") as typeof import("node:child_process");
const fs = require("node:fs/promises") as typeof import("node:fs/promises");
const path = require("node:path") as typeof import("node:path");
const { promisify } = require("node:util") as typeof import("node:util");
const Tesseract = require("tesseract.js") as typeof import("tesseract.js");

const execFileAsync = promisify(execFile);

const devServerArg = process.argv.find((arg) => arg.startsWith("--dev-server="));
const devServerUrl = devServerArg?.slice("--dev-server=".length) || null;
const isSmokeTest = process.argv.includes("--smoke-test");

type CapturePayload = {
  name: string;
  dataUrl: string | null;
};

type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth?: number;
  viewportHeight?: number;
};

type CroppedRegion = Pick<SelectionRect, "x" | "y" | "width" | "height">;

type RecognitionMetadata = {
  name?: string;
  region?: CroppedRegion | null;
};

type RecognitionResult = CapturePayload &
  RecognitionMetadata & {
    text: string;
    confidence: number;
    error: string | null;
  };

type CaptureSelectionResult = RecognitionResult | { cancelled: true };

type ActiveCaptureSelection = {
  capture: CapturePayload & { dataUrl: string };
  resolve: (value: CaptureSelectionResult) => void;
};

type FloatingPayload = {
  source?: string;
  sourceKind?: string;
};

type ShortcutStatus = {
  accelerator: string;
  registered: boolean;
  error: string | null;
};

type ExternalSelectionResult = {
  text: string;
  source: "selection";
  error?: string;
};

let mainWindow: BrowserWindowType | null;
let floatingWindow: BrowserWindowType | null;
let captureWindow: BrowserWindowType | null;
let clipboardWatchTimer: ReturnType<typeof setInterval> | null;
let lastClipboardText = "";
let pendingFloatingPayload: { source: string } | null = null;
let activeCaptureSelection: ActiveCaptureSelection | null = null;
let suppressClipboardEventsUntil = 0;
let shortcutAccelerator = "CommandOrControl+Space";
let shortcutStatus: ShortcutStatus = {
  accelerator: shortcutAccelerator,
  registered: false,
  error: null,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appFile(...segments: string[]): string {
  return path.join(__dirname, "..", ...segments);
}

function getWordbookPath(): string {
  return path.join(app.getPath("userData"), "wordbook.json");
}

async function capturePrimaryScreen(): Promise<CapturePayload> {
  const display = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: display.size,
  });
  const source = sources.find((item) => item.display_id === String(display.id)) || sources[0];
  return {
    name: source?.name ?? "Primary screen",
    dataUrl: source?.thumbnail.toDataURL() ?? null,
  };
}

function loadRenderer(browserWindow: BrowserWindowType, hash = ""): void {
  if (devServerUrl) {
    browserWindow.loadURL(`${devServerUrl}${hash}`);
    return;
  }

  browserWindow.loadFile(appFile("dist", "index.html"), {
    hash: hash.replace(/^#/, ""),
  });
}

async function recognizeImage(
  dataUrl: string | null,
  metadata: RecognitionMetadata = {},
): Promise<RecognitionResult> {
  const resultMetadata = {
    ...metadata,
    name: metadata.name ?? "Captured image",
  };

  if (!dataUrl) {
    return {
      ...resultMetadata,
      dataUrl,
      text: "",
      confidence: 0,
      error: "No image available",
    };
  }

  try {
    const result = await Tesseract.recognize(dataUrl, "eng", {
      logger: () => {},
    });
    return {
      ...resultMetadata,
      dataUrl,
      text: result.data.text.trim(),
      confidence: Math.round(result.data.confidence || 0),
      error: null,
    };
  } catch (error: unknown) {
    return {
      ...resultMetadata,
      dataUrl,
      text: "",
      confidence: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function cropCapture(
  capture: CapturePayload & { dataUrl: string },
  selection: SelectionRect,
): { dataUrl: string; region: CroppedRegion } {
  const image = nativeImage.createFromDataURL(capture.dataUrl);
  const imageSize = image.getSize();
  const viewportWidth = Math.max(1, Number(selection.viewportWidth) || imageSize.width);
  const viewportHeight = Math.max(1, Number(selection.viewportHeight) || imageSize.height);
  const scaleX = imageSize.width / viewportWidth;
  const scaleY = imageSize.height / viewportHeight;
  const x = Math.max(0, Math.round(Number(selection.x) * scaleX));
  const y = Math.max(0, Math.round(Number(selection.y) * scaleY));
  const width = Math.max(1, Math.round(Number(selection.width) * scaleX));
  const height = Math.max(1, Math.round(Number(selection.height) * scaleY));
  const safeRect = {
    x: Math.min(x, imageSize.width - 1),
    y: Math.min(y, imageSize.height - 1),
    width: Math.min(width, imageSize.width - x),
    height: Math.min(height, imageSize.height - y),
  };
  return {
    dataUrl: image.crop(safeRect).toDataURL(),
    region: safeRect,
  };
}

function createMainWindow(): void {
  logger.info("Creating main window");
  mainWindow = new BrowserWindow({
    width: 1248,
    height: 860,
    minWidth: 980,
    minHeight: 720,
    title: "Translate Desk",
    backgroundColor: "#f5f7f7",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loadRenderer(mainWindow);

  // Add detailed error handling
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    logger.error("Failed to load main window", {
      errorCode,
      errorDescription,
    });
  });

  mainWindow.webContents.on("render-process-gone", (event, details) => {
    logger.error("WebContents render process gone", { reason: details.reason });
  });

  mainWindow.webContents.on("did-finish-load", () => {
    logger.info("Main window loaded successfully");
  });

  mainWindow.on("closed", () => {
    logger.info("Main window closed");
    mainWindow = null;
  });
}

function createFloatingWindow(): BrowserWindowType {
  if (floatingWindow) return floatingWindow;

  const display = screen.getPrimaryDisplay();
  const width = 520;
  const height = 260;
  const x = Math.round(display.workArea.x + display.workArea.width - width - 32);
  const y = Math.round(display.workArea.y + display.workArea.height - height - 48);

  floatingWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    title: "Translate Desk Floating",
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  floatingWindow.setAlwaysOnTop(true, "floating");
  loadRenderer(floatingWindow, "#floating");

  floatingWindow.webContents.on("did-finish-load", () => {
    if (pendingFloatingPayload && floatingWindow) {
      floatingWindow.webContents.send("floating:payload", pendingFloatingPayload);
      pendingFloatingPayload = null;
    }
  });

  floatingWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error(`Floating window failed to load: ${errorCode} ${errorDescription}`);
  });

  floatingWindow.on("closed", () => {
    floatingWindow = null;
  });

  return floatingWindow;
}

function closeCaptureWindow(): void {
  if (!captureWindow) return;
  captureWindow.close();
  captureWindow = null;
}

function createCaptureWindow(capture: CapturePayload & { dataUrl: string }): void {
  closeCaptureWindow();

  const display = screen.getPrimaryDisplay();
  captureWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    title: "Translate Desk Capture",
    backgroundColor: "#111111",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  captureWindow.setAlwaysOnTop(true, "screen-saver");
  loadRenderer(captureWindow, "#capture");
  captureWindow.once("ready-to-show", () => {
    captureWindow?.show();
    captureWindow?.focus();
  });
  captureWindow.webContents.on("did-finish-load", () => {
    captureWindow?.webContents.send("capture:payload", {
      name: capture.name,
      dataUrl: capture.dataUrl,
    });
  });
  captureWindow.on("closed", () => {
    captureWindow = null;
    if (activeCaptureSelection) {
      activeCaptureSelection.resolve({ cancelled: true });
      activeCaptureSelection = null;
    }
  });
}

function showFloating(payload: FloatingPayload = {}): void {
  const source = payload.source || clipboard.readText().trim();
  const popup = createFloatingWindow();
  pendingFloatingPayload = { source };

  if (popup.webContents.isLoading()) {
    popup.once("ready-to-show", () => popup.showInactive());
  } else {
    popup.webContents.send("floating:payload", pendingFloatingPayload);
    pendingFloatingPayload = null;
    popup.showInactive();
  }
}

function emitClipboardText(text: string): void {
  if (!text || text.length < 6) return;
  mainWindow?.webContents.send("clipboard:text", {
    text,
    capturedAt: new Date().toISOString(),
  });
}

function startClipboardWatch(): void {
  if (clipboardWatchTimer) return;
  lastClipboardText = clipboard.readText();
  clipboardWatchTimer = setInterval(() => {
    const text = clipboard.readText().trim();
    if (Date.now() < suppressClipboardEventsUntil) {
      lastClipboardText = text;
      return;
    }
    if (text && text !== lastClipboardText) {
      lastClipboardText = text;
      emitClipboardText(text);
    }
  }, 800);
}

function stopClipboardWatch(): void {
  if (!clipboardWatchTimer) return;
  clearInterval(clipboardWatchTimer);
  clipboardWatchTimer = null;
}

async function copyCurrentSelection(): Promise<void> {
  if (process.platform !== "win32") return;

  await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Sta",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^c')",
    ],
    {
      timeout: 2500,
      windowsHide: true,
    },
  );
}

async function readExternalSelection(): Promise<ExternalSelectionResult> {
  const originalText = clipboard.readText();
  const marker = `__TRANSLATE_DESK_SELECTION_${Date.now()}__`;
  suppressClipboardEventsUntil = Date.now() + 2500;

  try {
    clipboard.writeText(marker);
    await delay(80);
    await copyCurrentSelection();

    for (let index = 0; index < 12; index += 1) {
      await delay(80);
      const copiedText = clipboard.readText();
      if (copiedText && copiedText !== marker) {
        return {
          text: copiedText.trim(),
          source: "selection",
        };
      }
    }

    return {
      text: "",
      source: "selection",
    };
  } catch (error: unknown) {
    return {
      text: "",
      source: "selection",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clipboard.writeText(originalText);
    lastClipboardText = originalText.trim();
    suppressClipboardEventsUntil = Date.now() + 800;
  }
}

async function triggerSelectionTranslate(): Promise<void> {
  logger.debug("Shortcut triggered", { accelerator: shortcutAccelerator });
  const selection = await readExternalSelection();
  const text = selection.text || clipboard.readText().trim();
  logger.debug("Translation triggered", {
    sourceLength: text.length,
    sourceKind: selection.text ? "selection" : "clipboard",
  });
  showFloating({ source: text, sourceKind: selection.text ? "selection" : "clipboard" });
  mainWindow?.webContents.send("shortcut:translate", {
    text,
    sourceKind: selection.text ? "selection" : "clipboard",
    error: selection.error ?? null,
  });
}

function registerTranslateShortcut(accelerator = shortcutAccelerator): ShortcutStatus {
  try {
    if (shortcutStatus.registered) {
      globalShortcut.unregister(shortcutAccelerator);
    }
    shortcutAccelerator = accelerator.trim() || "CommandOrControl+Space";
    const registered = globalShortcut.register(shortcutAccelerator, () => {
      void triggerSelectionTranslate();
    });
    shortcutStatus = {
      accelerator: shortcutAccelerator,
      registered,
      error: registered ? null : "快捷键注册失败，可能已被输入法、IDE 或系统工具占用。",
    };
  } catch (error: unknown) {
    shortcutStatus = {
      accelerator,
      registered: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  mainWindow?.webContents.send("shortcut:status", shortcutStatus);
  return shortcutStatus;
}

function registerShortcuts(): void {
  registerTranslateShortcut(shortcutAccelerator);
  logger.info("Global shortcuts registered");
}

ipcMain.handle("shortcuts:get-status", () => shortcutStatus);
ipcMain.handle("shortcuts:set-accelerator", (_event: IpcMainInvokeEvent, accelerator: unknown) => {
  return registerTranslateShortcut(String(accelerator ?? ""));
});

ipcMain.handle("clipboard:get-text", () => {
  const text = clipboard.readText();
  logger.debug("Clipboard text read", { length: text.length });
  return text;
});

ipcMain.handle("clipboard:write-text", (_event: IpcMainInvokeEvent, text: unknown) => {
  clipboard.writeText(String(text ?? ""));
  logger.debug("Clipboard text written", { length: String(text ?? "").length });
});

ipcMain.handle("clipboard:start-watch", () => {
  startClipboardWatch();
  logger.info("Clipboard watch started");
  return true;
});

ipcMain.handle("clipboard:stop-watch", () => {
  stopClipboardWatch();
  logger.info("Clipboard watch stopped");
  return true;
});

ipcMain.handle("ocr:recognize-primary", async () => {
  logger.info("OCR recognition started");
  const capture = await capturePrimaryScreen();
  if (!capture.dataUrl) {
    logger.warn("No screen capture available for OCR");
    return {
      ...capture,
      text: "",
      confidence: 0,
      error: "No screen capture available",
    };
  }

  const result = await recognizeImage(capture.dataUrl, {
    name: capture.name,
    region: null,
  });
  logger.info("OCR recognition completed", {
    textLength: result.text.length,
    confidence: result.confidence,
    hasError: !!result.error,
  });
  return result;
});

ipcMain.handle("wordbook:load", async () => {
  try {
    const raw = await fs.readFile(getWordbookPath(), "utf8");
    const parsed = JSON.parse(raw);
    const entries = Array.isArray(parsed) ? parsed : [];
    logger.debug("Wordbook loaded", { entryCount: entries.length });
    return entries;
  } catch (error: unknown) {
    logger.warn("Failed to load wordbook", {
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
});

ipcMain.handle("wordbook:save", async (_event: IpcMainInvokeEvent, entries: unknown) => {
  const safeEntries = Array.isArray(entries) ? entries : [];
  await fs.mkdir(path.dirname(getWordbookPath()), { recursive: true });
  await fs.writeFile(getWordbookPath(), JSON.stringify(safeEntries, null, 2), "utf8");
  logger.debug("Wordbook saved", { entryCount: safeEntries.length });
  return true;
});
ipcMain.handle("screen:capture-primary", async () => {
  return capturePrimaryScreen();
});
ipcMain.handle("ocr:recognize-primary", async () => {
  const capture = await capturePrimaryScreen();
  if (!capture.dataUrl) {
    return {
      ...capture,
      text: "",
      confidence: 0,
      error: "No screen capture available",
    };
  }

  return recognizeImage(capture.dataUrl, {
    name: capture.name,
    region: null,
  });
});
ipcMain.handle("ocr:select-region", async () => {
  const capture = await capturePrimaryScreen();
  const dataUrl = capture.dataUrl;
  if (!dataUrl) {
    return {
      ...capture,
      text: "",
      confidence: 0,
      error: "No screen capture available",
    };
  }

  return new Promise<CaptureSelectionResult>((resolve) => {
    const selectableCapture = { ...capture, dataUrl };
    activeCaptureSelection = { capture: selectableCapture, resolve };
    createCaptureWindow(selectableCapture);
  });
});
ipcMain.handle("capture:submit", async (_event: IpcMainInvokeEvent, selection: SelectionRect) => {
  if (!activeCaptureSelection) return false;

  const { capture, resolve } = activeCaptureSelection;
  activeCaptureSelection = null;
  const cropped = cropCapture(capture, selection);
  const result = await recognizeImage(cropped.dataUrl, {
    name: capture.name,
    region: cropped.region,
  });
  resolve(result);
  closeCaptureWindow();
  return true;
});
ipcMain.handle("capture:cancel", () => {
  if (activeCaptureSelection) {
    activeCaptureSelection.resolve({ cancelled: true });
    activeCaptureSelection = null;
  }
  closeCaptureWindow();
  return true;
});

app.whenReady().then(() => {
  logger.info("Application ready");
  createMainWindow();
  createFloatingWindow();
  startClipboardWatch();
  registerShortcuts();
  logger.info("All windows and services initialized");

  if (isSmokeTest) {
    logger.info("Smoke test mode enabled");
    setTimeout(() => {
      logger.info("Smoke test passed");
      console.log("electron-smoke-ok");
      app.quit();
    }, 1500);
  }

  app.on("activate", () => {
    logger.debug("App activated");
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  logger.info("All windows closed");
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  logger.info("Application will quit");
  stopClipboardWatch();
  globalShortcut.unregisterAll();
});
