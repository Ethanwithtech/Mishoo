import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Coffee, Globe2, PawPrint, Play, Shield, Sparkles } from 'lucide-react';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  DEFAULT_TIMER,
  PET_LABELS,
  UI,
  clampMinutes,
  formatTime,
  type ExtensionSettings,
  type ExtensionState,
  type Lang,
  type PetId,
} from './shared';
import './popup.css';

const DEFAULT_STATE: ExtensionState = {
  settings: DEFAULT_SETTINGS,
  stats: DEFAULT_STATS,
  timer: DEFAULT_TIMER,
  lastMessage: '',
};

type SummonResponse = ExtensionState & {
  overlay?: {
    ok: boolean;
    message?: string;
  };
};

function secondsLeft(endAt: number | null) {
  if (!endAt) return 0;
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}

async function sendMessage<T>(type: string, payload?: unknown): Promise<T> {
  return chrome.runtime.sendMessage<T>({ type, payload });
}

function App() {
  const [state, setState] = useState<ExtensionState>(DEFAULT_STATE);
  const [tick, setTick] = useState(0);
  const t = UI[state.settings.language];
  const remaining = secondsLeft(state.timer.endAt);
  const isRunning = state.timer.running && remaining > 0;
  const statusText = state.lastMessage || (isRunning ? t.started : t.ready);

  useEffect(() => {
    void sendMessage<ExtensionState>('mishoo:get-state').then(setState);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state.timer.running && state.timer.endAt && state.timer.endAt <= Date.now()) {
      void sendMessage<ExtensionState>('mishoo:get-state').then(setState);
    }
  }, [state.timer.endAt, state.timer.running, tick]);

  const petOptions = useMemo(() => Object.entries(PET_LABELS) as Array<[PetId, Record<Lang, string>]>, []);

  const updateSettings = (nextPartial: Partial<ExtensionSettings>) => {
    const nextSettings = { ...state.settings, ...nextPartial };
    setState((current) => ({ ...current, settings: nextSettings }));
    void sendMessage<ExtensionState>('mishoo:save-settings', nextSettings).then(setState);
  };

  const startOrPause = () => {
    void sendMessage<ExtensionState>(isRunning ? 'mishoo:pause-timer' : 'mishoo:start-timer').then(setState);
  };

  const summonNow = () => {
    void sendMessage<SummonResponse>('mishoo:summon-now').then((nextState) => {
      setState(nextState);
    });
  };

  return (
    <main className="popupShell">
      <header className="popupHeader">
        <div className="brandMark"><PawPrint size={20} /></div>
        <div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <button
          className="iconButton"
          type="button"
          onClick={() => updateSettings({ language: state.settings.language === 'zh' ? 'en' : 'zh' })}
          aria-label={t.language}
        >
          <Globe2 size={17} />
        </button>
      </header>

      <section className="timerCard">
        <div>
          <span className="eyebrow">{isRunning ? t.running : t.ready}</span>
          <strong>{formatTime(isRunning ? remaining : state.settings.workMinutes * 60)}</strong>
        </div>
        <button className="primaryButton" type="button" onClick={startOrPause}>
          {isRunning ? <Coffee size={17} /> : <Play size={17} />}
          {isRunning ? t.pause : t.start}
        </button>
      </section>

      <section className="settingsGrid">
        <label className="field">
          <span>{t.workMinutes}</span>
          <input
            type="number"
            min="1"
            max="180"
            value={state.settings.workMinutes}
            onChange={(event) => updateSettings({ workMinutes: clampMinutes(Number(event.target.value), 1, 180) })}
          />
        </label>
        <label className="field">
          <span>{t.breakMinutes}</span>
          <input
            type="number"
            min="1"
            max="60"
            value={state.settings.breakMinutes}
            onChange={(event) => updateSettings({ breakMinutes: clampMinutes(Number(event.target.value), 1, 60) })}
          />
        </label>
      </section>

      <section className="panel">
        <div className="panelTitle"><Sparkles size={17} /> {t.pet}</div>
        <div className="petPicker">
          {petOptions.map(([pet, labels]) => (
            <button
              key={pet}
              type="button"
              className={`petOption ${state.settings.pet === pet ? 'selected' : ''}`}
              onClick={() => updateSettings({ pet })}
            >
              {labels[state.settings.language]}
            </button>
          ))}
        </div>
      </section>

      <label className="strictToggle">
        <input
          type="checkbox"
          checked={state.settings.strictMode}
          onChange={(event) => updateSettings({ strictMode: event.target.checked })}
        />
        <span><Shield size={16} /> {t.strictMode}</span>
      </label>

      <button className="summonButton" type="button" onClick={summonNow}>
        <PawPrint size={18} /> {t.summon}
      </button>

      <section className="statsGrid" aria-label={t.last}>
        <div><strong>{state.stats.completedBreaks}</strong><span>{t.completed}</span></div>
        <div><strong>{state.stats.totalBreakMinutes}</strong><span>{t.minutes}</span></div>
        <div><strong>{state.stats.skippedBreaks}</strong><span>{t.skipped}</span></div>
      </section>

      <p className="statusText"><strong>{t.last}：</strong>{statusText}</p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
