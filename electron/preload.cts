import type { IpcRendererEvent } from "electron";

const { contextBridge, ipcRenderer } = require("electron") as typeof import("electron");

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  platform: process.platform,
  clipboard: {
    getText: () => ipcRenderer.invoke("clipboard:get-text"),
    writeText: (text: string) => ipcRenderer.invoke("clipboard:write-text", text),
    startWatch: () => ipcRenderer.invoke("clipboard:start-watch"),
    stopWatch: () => ipcRenderer.invoke("clipboard:stop-watch"),
    onText: (callback: (payload: unknown) => void) => subscribe("clipboard:text", callback),
  },
  floating: {
    show: (payload: unknown) => ipcRenderer.invoke("floating:show", payload),
    hide: () => ipcRenderer.invoke("floating:hide"),
    onPayload: (callback: (payload: unknown) => void) => subscribe("floating:payload", callback),
  },
  shortcuts: {
    onTranslate: (callback: (payload: unknown) => void) => subscribe("shortcut:translate", callback),
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
    submit: (selection: unknown) => ipcRenderer.invoke("capture:submit", selection),
    cancel: () => ipcRenderer.invoke("capture:cancel"),
    onPayload: (callback: (payload: unknown) => void) => subscribe("capture:payload", callback),
  },
  wordbook: {
    load: () => ipcRenderer.invoke("wordbook:load"),
    save: (entries: unknown) => ipcRenderer.invoke("wordbook:save", entries),
  },
});
