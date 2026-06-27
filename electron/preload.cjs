const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  platform: process.platform,
  clipboard: {
    getText: () => ipcRenderer.invoke("clipboard:get-text"),
    writeText: (text) => ipcRenderer.invoke("clipboard:write-text", text),
    startWatch: () => ipcRenderer.invoke("clipboard:start-watch"),
    stopWatch: () => ipcRenderer.invoke("clipboard:stop-watch"),
    onText: (callback) => subscribe("clipboard:text", callback),
  },
  floating: {
    show: (payload) => ipcRenderer.invoke("floating:show", payload),
    hide: () => ipcRenderer.invoke("floating:hide"),
    onPayload: (callback) => subscribe("floating:payload", callback),
  },
  shortcuts: {
    onTranslate: (callback) => subscribe("shortcut:translate", callback),
  },
  selection: {
    read: () => ipcRenderer.invoke("selection:read"),
  },
  screen: {
    capturePrimary: () => ipcRenderer.invoke("screen:capture-primary"),
  },
  ocr: {
    recognizePrimary: () => ipcRenderer.invoke("ocr:recognize-primary"),
    selectRegion: () => ipcRenderer.invoke("ocr:select-region"),
  },
  capture: {
    submit: (selection) => ipcRenderer.invoke("capture:submit", selection),
    cancel: () => ipcRenderer.invoke("capture:cancel"),
    onPayload: (callback) => subscribe("capture:payload", callback),
  },
  wordbook: {
    load: () => ipcRenderer.invoke("wordbook:load"),
    save: (entries) => ipcRenderer.invoke("wordbook:save", entries),
  },
});
