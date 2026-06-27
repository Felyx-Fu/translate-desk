const { app, BrowserWindow, clipboard, desktopCapturer, globalShortcut, ipcMain, screen } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const Tesseract = require("tesseract.js");

const devServerArg = process.argv.find((arg) => arg.startsWith("--dev-server="));
const devServerUrl = devServerArg ? devServerArg.split("=")[1] : null;
const isSmokeTest = process.argv.includes("--smoke-test");

let mainWindow;
let floatingWindow;
let clipboardWatchTimer;
let lastClipboardText = "";
let pendingFloatingPayload = null;

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

function registerShortcuts() {
  globalShortcut.register("CommandOrControl+Space", () => {
    const text = clipboard.readText().trim();
    showFloating({ source: text });
    mainWindow?.webContents.send("shortcut:translate", { text });
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

  try {
    const result = await Tesseract.recognize(capture.dataUrl, "eng", {
      logger: () => {},
    });
    return {
      ...capture,
      text: result.data.text.trim(),
      confidence: Math.round(result.data.confidence || 0),
      error: null,
    };
  } catch (error) {
    return {
      ...capture,
      text: "",
      confidence: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
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
