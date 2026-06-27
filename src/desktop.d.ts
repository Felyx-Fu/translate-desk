export type Direction = "英 → 中" | "中 → 英" | "自动检测";

export type WordbookEntry = {
  word: string;
  meaning: string;
  context: string;
};

export type ClipboardTextPayload = {
  text: string;
  capturedAt: string;
};

export type ClipboardHistoryItem = {
  source: string;
  target: string;
  capturedAt: string | null;
};

export type CommandPayload = {
  source: string;
  target: string;
};

export type FloatingPayload = {
  source?: string;
  sourceKind?: string;
  target?: string;
};

export type SelectionReadResult = {
  text: string;
  source: "selection";
  error?: string;
};

export type ShortcutPayload = {
  text?: string;
  sourceKind?: "selection" | "clipboard";
  error?: string | null;
};

export type CapturePayload = {
  name: string;
  dataUrl: string | null;
};

export type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth?: number;
  viewportHeight?: number;
};

export type OcrReadyResult = CapturePayload & {
  text: string;
  translation?: string;
  confidence: number;
  error: string | null;
  status?: "ready" | "recognizing";
  region?: SelectionRect | null;
};

export type OcrSelectResult = OcrReadyResult | { cancelled: true };

export type OcrResultState = OcrReadyResult & {
  status: "ready" | "recognizing";
};

export type DesktopApi = {
  isDesktop: boolean;
  platform: string;
  clipboard: {
    getText: () => Promise<string>;
    writeText: (text: string) => Promise<void>;
    startWatch: () => Promise<boolean>;
    stopWatch: () => Promise<boolean>;
    onText: (callback: (payload: ClipboardTextPayload) => void) => () => void;
  };
  floating: {
    show: (payload: FloatingPayload) => Promise<boolean>;
    hide: () => Promise<boolean>;
    onPayload: (callback: (payload: FloatingPayload) => void) => () => void;
  };
  shortcuts: {
    onTranslate: (callback: (payload: ShortcutPayload) => void) => () => void;
  };
  selection: {
    read: () => Promise<SelectionReadResult>;
  };
  screen: {
    capturePrimary: () => Promise<CapturePayload>;
  };
  ocr: {
    recognizePrimary: () => Promise<OcrReadyResult>;
    selectRegion: () => Promise<OcrSelectResult>;
  };
  capture: {
    submit: (selection: SelectionRect) => Promise<boolean>;
    cancel: () => Promise<boolean>;
    onPayload: (callback: (payload: CapturePayload) => void) => () => void;
  };
  wordbook: {
    load: () => Promise<WordbookEntry[]>;
    save: (entries: WordbookEntry[]) => Promise<boolean>;
  };
};

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}
