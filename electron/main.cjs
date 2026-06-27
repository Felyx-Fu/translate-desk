const {
  app,
  BrowserWindow,
  clipboard,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  nativeImage,
  screen,
} = require("electron");
const { execFile } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const { promisify } = require("node:util");
const Tesseract = require("tesseract.js");

const execFileAsync = promisify(execFile);

const devServerArg = process.argv.find((arg) => arg.startsWith("--dev-server="));
const devServerUrl = devServerArg ? devServerArg.split("=")[1] : null;
const isSmokeTest = process.argv.includes("--smoke-test");

let mainWindow;
let floatingWindow;
let captureWindow;
let clipboardWatchTimer;
let lastClipboardText = "";
let pendingFloatingPayload = null;
let activeCaptureSelection = null;
let suppressClipboardEventsUntil = 0;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appFile(...segments) {
  return path.join(__dirname, "..", ...segments);
}

function getWordbookPath() {
  return path.join(app.getPath("userData"), "wordbook.json");
}

async function capturePrimaryScreen() {
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

function loadRenderer(window, hash = "") {
  if (devServerUrl) {
    window.loadURL(`${devServerUrl}${hash}`);
    return;
  }

  window.loadFile(appFile("dist", "index.html"), {
    hash: hash.replace(/^#/, ""),
  });
}

async function recognizeImage(dataUrl, metadata = {}) {
  if (!dataUrl) {
    return {
      ...metadata,
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
      ...metadata,
      dataUrl,
      text: result.data.text.trim(),
      confidence: Math.round(result.data.confidence || 0),
      error: null,
    };
  } catch (error) {
    return {
      ...metadata,
      dataUrl,
      text: "",
      confidence: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function cropCapture(capture, selection) {
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

function createMainWindow() {
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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createFloatingWindow() {
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
    if (pendingFloatingPayload) {
      floatingWindow.webContents.send("floating:payload", pendingFloatingPayload);
      pendingFloatingPayload = null;
    }
  });

  floatingWindow.on("closed", () => {
    floatingWindow = null;
  });

  return floatingWindow;
}

function closeCaptureWindow() {
  if (!captureWindow) return;
  captureWindow.close();
  captureWindow = null;
}

function createCaptureWindow(capture) {
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
    captureWindow.show();
    captureWindow.focus();
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

function showFloating(payload = {}) {
  const source = payload.source || clipboard.readText().trim();
  const window = createFloatingWindow();
  pendingFloatingPayload = { source };

  if (window.webContents.isLoading()) {
    window.once("ready-to-show", () => window.showInactive());
  } else {
    window.webContents.send("floating:payload", pendingFloatingPayload);
    pendingFloatingPayload = null;
    window.showInactive();
  }
}

function emitClipboardText(text) {
  if (!text || text.length < 6) return;
  mainWindow?.webContents.send("clipboard:text", {
    text,
    capturedAt: new Date().toISOString(),
  });
}

function startClipboardWatch() {
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

function stopClipboardWatch() {
  if (!clipboardWatchTimer) return;
  clearInterval(clipboardWatchTimer);
  clipboardWatchTimer = null;
}

async function copyCurrentSelection() {
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

async function readExternalSelection() {
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
  } catch (error) {
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

function registerShortcuts() {
  globalShortcut.register("CommandOrControl+Space", async () => {
    const selection = await readExternalSelection();
    const text = selection.text || clipboard.readText().trim();
    showFloating({ source: text, sourceKind: selection.text ? "selection" : "clipboard" });
    mainWindow?.webContents.send("shortcut:translate", {
      text,
      sourceKind: selection.text ? "selection" : "clipboard",
      error: selection.error ?? null,
    });
  });
}

ipcMain.handle("clipboard:get-text", () => clipboard.readText());
ipcMain.handle("clipboard:write-text", (_event, text) => {
  clipboard.writeText(String(text ?? ""));
});
ipcMain.handle("clipboard:start-watch", () => {
  startClipboardWatch();
  return true;
});
ipcMain.handle("clipboard:stop-watch", () => {
  stopClipboardWatch();
  return true;
});
ipcMain.handle("selection:read", async () => {
  return readExternalSelection();
});
ipcMain.handle("floating:show", (_event, payload) => {
  showFloating(payload);
  return true;
});
ipcMain.handle("floating:hide", () => {
  floatingWindow?.hide();
  return true;
});
ipcMain.handle("wordbook:load", async () => {
  try {
    const raw = await fs.readFile(getWordbookPath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});
ipcMain.handle("wordbook:save", async (_event, entries) => {
  const safeEntries = Array.isArray(entries) ? entries : [];
  await fs.mkdir(path.dirname(getWordbookPath()), { recursive: true });
  await fs.writeFile(getWordbookPath(), JSON.stringify(safeEntries, null, 2), "utf8");
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
  if (!capture.dataUrl) {
    return {
      ...capture,
      text: "",
      confidence: 0,
      error: "No screen capture available",
    };
  }

  return new Promise((resolve) => {
    activeCaptureSelection = { capture, resolve };
    createCaptureWindow(capture);
  });
});
ipcMain.handle("capture:submit", async (_event, selection) => {
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
  createMainWindow();
  createFloatingWindow();
  startClipboardWatch();
  registerShortcuts();

  if (isSmokeTest) {
    setTimeout(() => {
      console.log("electron-smoke-ok");
      app.quit();
    }, 1500);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  stopClipboardWatch();
  globalShortcut.unregisterAll();
});
