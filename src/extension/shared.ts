export type PetId = 'mishoo-cat' | 'cocoa-dog' | 'snow-rabbit' | 'pom-puppy' | 'lop-rabbit';
export type Lang = 'zh' | 'en';

export type ExtensionSettings = {
  workMinutes: number;
  breakMinutes: number;
  pet: PetId;
  strictMode: boolean;
  language: Lang;
};

export type ExtensionStats = {
  completedBreaks: number;
  totalBreakMinutes: number;
  skippedBreaks: number;
};

export type TimerState = {
  running: boolean;
  endAt: number | null;
};

export type ExtensionState = {
  settings: ExtensionSettings;
  stats: ExtensionStats;
  timer: TimerState;
  lastMessage: string;
};

export const STORAGE_KEYS = {
  settings: 'mishoo.extension.settings',
  stats: 'mishoo.extension.stats',
  timer: 'mishoo.extension.timer',
  lastMessage: 'mishoo.extension.lastMessage',
} as const;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  workMinutes: 50,
  breakMinutes: 5,
  pet: 'cocoa-dog',
  strictMode: true,
  language: 'zh',
};

export const DEFAULT_STATS: ExtensionStats = {
  completedBreaks: 0,
  totalBreakMinutes: 0,
  skippedBreaks: 0,
};

export const DEFAULT_TIMER: TimerState = {
  running: false,
  endAt: null,
};

export const UI = {
  zh: {
    title: 'Mishoo / 咪咻',
    subtitle: '让真实宠物走到当前网页上，提醒你离开屏幕休息。',
    workMinutes: '工作时长',
    breakMinutes: '休息时长',
    strictMode: 'Pawse Mode：休息时拦截网页操作',
    pet: '休息宠物',
    start: '开始专注计时',
    pause: '暂停计时',
    summon: '立即召唤到当前网页',
    running: '本轮专注剩余',
    ready: '准备好后开始计时。',
    completed: '次休息',
    minutes: '分钟',
    skipped: '次跳过',
    last: '最近状态',
    language: 'English',
    noPage: '请打开一个普通网页后再召唤咪咻。Chrome 内置页面无法注入宠物。',
    started: '咪咻会在本轮工作结束后出现。',
    paused: '计时已暂停。',
    summoned: '咪咻已出现在当前网页。',
    finished: '工作时间结束，咪咻已出现。',
    closed: '休息遮罩已关闭。',
  },
  en: {
    title: 'Mishoo / 咪咻',
    subtitle: 'Bring a real pet onto the current webpage and let it remind you to rest.',
    workMinutes: 'Work minutes',
    breakMinutes: 'Break minutes',
    strictMode: 'Pawse Mode: block webpage interaction while resting',
    pet: 'Break pet',
    start: 'Start focus timer',
    pause: 'Pause timer',
    summon: 'Summon on current page',
    running: 'Focus time left',
    ready: 'Start when you are ready.',
    completed: 'breaks',
    minutes: 'minutes',
    skipped: 'skipped',
    last: 'Latest status',
    language: '中文',
    noPage: 'Open a normal webpage before summoning Mishoo. Chrome internal pages cannot be injected.',
    started: 'Mishoo will appear when this work round ends.',
    paused: 'Timer paused.',
    summoned: 'Mishoo appeared on the current webpage.',
    finished: 'Work time is over. Mishoo appeared.',
    closed: 'Break overlay closed.',
  },
} as const;

export const PET_LABELS: Record<PetId, Record<Lang, string>> = {
  'mishoo-cat': { zh: '真实小猫 Mia', en: 'Mia the Real Cat' },
  'cocoa-dog': { zh: '金毛 Cocoa', en: 'Cocoa the Golden Retriever' },
  'snow-rabbit': { zh: '萨摩耶 Snow', en: 'Snow the Samoyed' },
  'pom-puppy': { zh: '博美 Mochi', en: 'Mochi the Pomeranian' },
  'lop-rabbit': { zh: '垂耳兔 Mocha', en: 'Mocha the Lop Rabbit' },
};

export function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const seconds = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function clampMinutes(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
