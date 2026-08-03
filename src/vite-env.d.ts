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
  beginPetDrag: (point: { screenX: number; screenY: number }) => Promise<void>;
  movePet: (point: { screenX: number; screenY: number }) => Promise<void>;
  endPetDrag: () => Promise<void>;
  resizePet: (delta: number) => Promise<number>;
  showPetMenu: (state: { running: boolean; phase: 'work' | 'shortBreak' | 'longBreak'; remaining: number }) => Promise<void>;
  onPetTimerToggle: (callback: () => void) => () => void;
  onPetShowTodos: (callback: () => void) => () => void;
  onPetPatrolState: (callback: (state: { direction: -1 | 1; mode: 'walking' | 'idle' }) => void) => () => void;
  setPetPatrolPaused: (paused: boolean) => Promise<void>;
}

interface Window {
  mishoo?: MishooBridge;
}
