import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  DEFAULT_TIMER,
  STORAGE_KEYS,
  UI,
  type ExtensionSettings,
  type ExtensionState,
  type ExtensionStats,
  type TimerState,
} from './shared';

const WORK_ALARM = 'mishoo.work.complete';

type RuntimeMessage = {
  type?: string;
  payload?: unknown;
};

type OverlayResult = {
  ok: boolean;
  message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

async function readStored<T extends Record<string, unknown>>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  const stored = result[key];
  return isRecord(stored) ? ({ ...fallback, ...stored } as T) : fallback;
}

async function readPrimitive<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return result[key] === undefined ? fallback : (result[key] as T);
}

async function getSettings() {
  return readStored<ExtensionSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
}

async function getStats() {
  return readStored<ExtensionStats>(STORAGE_KEYS.stats, DEFAULT_STATS);
}

async function getTimer() {
  const timer = await readStored<TimerState>(STORAGE_KEYS.timer, DEFAULT_TIMER);
  if (timer.running && timer.endAt && timer.endAt <= Date.now()) {
    return DEFAULT_TIMER;
  }
  return timer;
}

async function getState(): Promise<ExtensionState> {
  const [settings, stats, timer, lastMessage] = await Promise.all([
    getSettings(),
    getStats(),
    getTimer(),
    readPrimitive(STORAGE_KEYS.lastMessage, ''),
  ]);

  return { settings, stats, timer, lastMessage };
}

async function saveLastMessage(message: string) {
  await chrome.storage.local.set({ [STORAGE_KEYS.lastMessage]: message });
}

async function saveSettings(payload: unknown) {
  const current = await getSettings();
  const next = isRecord(payload) ? ({ ...current, ...payload } as ExtensionSettings) : current;
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
  return getState();
}

async function startTimer() {
  const settings = await getSettings();
  const endAt = Date.now() + settings.workMinutes * 60 * 1000;
  const timer: TimerState = { running: true, endAt };
  await chrome.storage.local.set({ [STORAGE_KEYS.timer]: timer });
  chrome.alarms.create(WORK_ALARM, { when: endAt });
  await saveLastMessage(UI[settings.language].started);
  return getState();
}

async function pauseTimer() {
  await chrome.alarms.clear(WORK_ALARM);
  await chrome.storage.local.set({ [STORAGE_KEYS.timer]: DEFAULT_TIMER });
  const settings = await getSettings();
  await saveLastMessage(UI[settings.language].paused);
  return getState();
}

async function sendOverlayToActiveTab(settings: ExtensionSettings): Promise<OverlayResult> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  const lang = settings.language;

  if (!activeTab?.id) {
    return { ok: false, message: UI[lang].noPage };
  }

  try {
    await chrome.tabs.sendMessage(activeTab.id, {
      type: 'mishoo:show-overlay',
      payload: {
        durationSec: settings.breakMinutes * 60,
        pet: settings.pet,
        strictMode: settings.strictMode,
        language: lang,
      },
    });
    return { ok: true, message: UI[lang].summoned };
  } catch {
    return { ok: false, message: UI[lang].noPage };
  }
}

async function summonNow() {
  const settings = await getSettings();
  const result = await sendOverlayToActiveTab(settings);
  await saveLastMessage(result.message || '');
  return { ...(await getState()), overlay: result };
}

async function finishWorkAndTriggerBreak() {
  const settings = await getSettings();
  const stats = await getStats();
  const nextStats: ExtensionStats = {
    completedBreaks: stats.completedBreaks + 1,
    totalBreakMinutes: stats.totalBreakMinutes + settings.breakMinutes,
    skippedBreaks: stats.skippedBreaks,
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.timer]: DEFAULT_TIMER,
    [STORAGE_KEYS.stats]: nextStats,
  });

  const result = await sendOverlayToActiveTab(settings);
  await saveLastMessage(result.ok ? UI[settings.language].finished : result.message || UI[settings.language].noPage);
}

async function handleOverlayClosed(payload: unknown) {
  const settings = await getSettings();
  if (isRecord(payload) && payload.skipped === true) {
    const stats = await getStats();
    await chrome.storage.local.set({
      [STORAGE_KEYS.stats]: { ...stats, skippedBreaks: stats.skippedBreaks + 1 },
    });
  }
  await saveLastMessage(UI[settings.language].closed);
  return getState();
}

async function handleMessage(message: RuntimeMessage) {
  switch (message.type) {
    case 'mishoo:get-state':
      return getState();
    case 'mishoo:save-settings':
      return saveSettings(message.payload);
    case 'mishoo:start-timer':
      return startTimer();
    case 'mishoo:pause-timer':
      return pauseTimer();
    case 'mishoo:summon-now':
      return summonNow();
    case 'mishoo:overlay-closed':
      return handleOverlayClosed(message.payload);
    default:
      return { ok: false };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set({
    [STORAGE_KEYS.settings]: DEFAULT_SETTINGS,
    [STORAGE_KEYS.stats]: DEFAULT_STATS,
    [STORAGE_KEYS.timer]: DEFAULT_TIMER,
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handleMessage(message as RuntimeMessage)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Unknown error' });
    });
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === WORK_ALARM) {
    void finishWorkAndTriggerBreak();
  }
});
