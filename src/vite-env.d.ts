/// <reference types="vite/client" />

interface MishooBridge {
  showBreakOverlay: (payload: {
    durationSec: number;
    pet: string;
    strictMode: boolean;
    language?: 'zh' | 'en';
  }) => Promise<void>;
  closeBreakOverlay: () => Promise<void>;
  getAppVersion: () => Promise<string>;
}

interface Window {
  mishoo?: MishooBridge;
}
