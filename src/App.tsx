import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Coffee, Heart, PawPrint, Play, Shield, Sparkles } from 'lucide-react';

type PetId = 'mishoo-cat' | 'cocoa-dog' | 'pixel-fox';

type Settings = {
  workMinutes: number;
  breakMinutes: number;
  pet: PetId;
  strictMode: boolean;
};

type Stats = {
  completedBreaks: number;
  totalBreakMinutes: number;
  skippedBreaks: number;
};

const PETS: Record<PetId, { name: string; description: string; accent: string; variant: string }> = {
  'mishoo-cat': {
    name: '咪咻猫',
    description: '温柔但很坚持的休息守护者',
    accent: '#f97316',
    variant: 'cat',
  },
  'cocoa-dog': {
    name: '可可犬',
    description: '适合需要一点鼓励的工作日',
    accent: '#8b5cf6',
    variant: 'dog',
  },
  'pixel-fox': {
    name: '赛博狐',
    description: '轻微科幻感的桌面休息搭子',
    accent: '#06b6d4',
    variant: 'fox',
  },
};

const DEFAULT_SETTINGS: Settings = {
  workMinutes: 50,
  breakMinutes: 5,
  pet: 'mishoo-cat',
  strictMode: true,
};

const DEFAULT_STATS: Stats = {
  completedBreaks: 0,
  totalBreakMinutes: 0,
  skippedBreaks: 0,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readJson(key, fallback));

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function updateStats(next: Partial<Stats>) {
  const current = readJson<Stats>('mishoo.stats', DEFAULT_STATS);
  const updated = { ...current, ...next };
  localStorage.setItem('mishoo.stats', JSON.stringify(updated));
}

function PetIllustration({ pet, large = false }: { pet: PetId; large?: boolean }) {
  const meta = PETS[pet];

  return (
    <div className={`pet ${meta.variant} ${large ? 'petLarge' : ''}`} style={{ '--pet-accent': meta.accent } as React.CSSProperties}>
      <div className="petEar petEarLeft" />
      <div className="petEar petEarRight" />
      <div className="petFace">
        <div className="petEye petEyeLeft" />
        <div className="petEye petEyeRight" />
        <div className="petNose" />
        <div className="petMouth" />
        <div className="petWhisker petWhiskerLeft" />
        <div className="petWhisker petWhiskerRight" />
      </div>
      <div className="petBody" />
      <div className="petTail" />
    </div>
  );
}

function ControlPanel() {
  const [settings, setSettings] = useStoredState<Settings>('mishoo.settings', DEFAULT_SETTINGS);
  const [stats, setStats] = useStoredState<Stats>('mishoo.stats', DEFAULT_STATS);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(settings.workMinutes * 60);
  const [lastBreak, setLastBreak] = useState<string>('还没有开始，咪咻正在等你。');

  useEffect(() => {
    if (!running) {
      setRemaining(settings.workMinutes * 60);
    }
  }, [settings.workMinutes, running]);

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setRunning(false);
          void window.mishoo?.showBreakOverlay({
            durationSec: settings.breakMinutes * 60,
            pet: settings.pet,
            strictMode: settings.strictMode,
          });
          const nextStats = {
            completedBreaks: stats.completedBreaks + 1,
            totalBreakMinutes: stats.totalBreakMinutes + settings.breakMinutes,
          };
          setStats((currentStats) => ({ ...currentStats, ...nextStats }));
          setLastBreak(`咪咻刚刚带你休息了 ${settings.breakMinutes} 分钟。`);
          return settings.workMinutes * 60;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running, setStats, settings.breakMinutes, settings.pet, settings.strictMode, settings.workMinutes, stats.completedBreaks, stats.totalBreakMinutes]);

  const petOptions = Object.entries(PETS) as Array<[PetId, (typeof PETS)[PetId]]>;
  const progress = 1 - remaining / (settings.workMinutes * 60);

  const startBreakNow = () => {
    setRunning(false);
    void window.mishoo?.showBreakOverlay({
      durationSec: settings.breakMinutes * 60,
      pet: settings.pet,
      strictMode: settings.strictMode,
    });
  };

  return (
    <main className="appShell">
      <section className="heroCard">
        <div className="heroCopy">
          <div className="brandRow">
            <div className="brandMark"><PawPrint size={22} /></div>
            <span>Mishoo / 咪咻</span>
          </div>
          <h1>让一只宠物替你按下暂停键。</h1>
          <p>
            咪咻是给久坐打工人的桌面休息守护应用。到点后，宠物会走到屏幕前，温柔地挡住工作，让你真正离开屏幕休息一会儿。
          </p>
          <div className="heroActions">
            <button className="primaryButton" onClick={() => setRunning((value) => !value)}>
              {running ? <Coffee size={18} /> : <Play size={18} />}
              {running ? '暂停本轮计时' : '开始专注计时'}
            </button>
            <button className="ghostButton" onClick={startBreakNow}>
              立即召唤咪咻
            </button>
          </div>
        </div>
        <div className="heroPetPanel">
          <PetIllustration pet={settings.pet} large />
          <div className="petName">{PETS[settings.pet].name}</div>
          <div className="petHint">{PETS[settings.pet].description}</div>
        </div>
      </section>

      <section className="dashboardGrid">
        <article className="timerCard panel">
          <div className="panelTitle"><Clock3 size={18} /> 本轮工作</div>
          <div className="timeDisplay">{formatTime(remaining)}</div>
          <div className="progressTrack"><div className="progressFill" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <p>{running ? '咪咻会在时间结束后自动出现。' : '准备好后开始计时。'}</p>
        </article>

        <article className="panel">
          <div className="panelTitle"><Shield size={18} /> 休息边界</div>
          <label className="field">
            <span>工作时长</span>
            <input
              type="number"
              min="1"
              max="180"
              value={settings.workMinutes}
              onChange={(event) => setSettings({ ...settings, workMinutes: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>休息时长</span>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.breakMinutes}
              onChange={(event) => setSettings({ ...settings, breakMinutes: Number(event.target.value) })}
            />
          </label>
          <label className="toggleField">
            <input
              type="checkbox"
              checked={settings.strictMode}
              onChange={(event) => setSettings({ ...settings, strictMode: event.target.checked })}
            />
            <span>开启 Pawse Mode：休息期间不可轻易关闭遮罩</span>
          </label>
        </article>

        <article className="panel petPickerPanel">
          <div className="panelTitle"><Sparkles size={18} /> 选择守护宠物</div>
          <div className="petPicker">
            {petOptions.map(([id, pet]) => (
              <button
                key={id}
                className={`petOption ${settings.pet === id ? 'selected' : ''}`}
                onClick={() => setSettings({ ...settings, pet: id })}
              >
                <PetIllustration pet={id} />
                <span>{pet.name}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel statsPanel">
          <div className="panelTitle"><Heart size={18} /> 休息记录</div>
          <div className="statsGrid">
            <div><strong>{stats.completedBreaks}</strong><span>次休息</span></div>
            <div><strong>{stats.totalBreakMinutes}</strong><span>分钟</span></div>
            <div><strong>{stats.skippedBreaks}</strong><span>次跳过</span></div>
          </div>
          <p>{lastBreak}</p>
        </article>
      </section>

      <section className="notePanel">
        <strong>当前 MVP 边界：</strong>
        咪咻会创建一个全屏置顶休息遮罩，并在遮罩内拦截键盘输入。出于系统安全限制，它不会拦截操作系统级快捷键，也不会读取屏幕内容、摄像头或上传任何数据。
      </section>
    </main>
  );
}

function BreakOverlay() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const duration = Math.max(20, Number(params.get('duration') || 300));
  const pet = ((params.get('pet') || 'mishoo-cat') as PetId) in PETS ? (params.get('pet') as PetId) : 'mishoo-cat';
  const strict = params.get('strict') !== '0';
  const [remaining, setRemaining] = useState(duration);
  const [canFinish, setCanFinish] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const stopKeys = (event: KeyboardEvent) => {
      if (strict) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('keydown', stopKeys, true);
    window.addEventListener('keyup', stopKeys, true);
    return () => {
      window.removeEventListener('keydown', stopKeys, true);
      window.removeEventListener('keyup', stopKeys, true);
    };
  }, [strict]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setCanFinish(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const finishBreak = () => {
    void window.mishoo?.closeBreakOverlay();
  };

  const startEmergencyHold = () => {
    if (holdTimerRef.current !== null || canFinish) return;
    let current = 0;
    holdTimerRef.current = window.setInterval(() => {
      current += 1;
      setHoldProgress(current);
      if (current >= 8) {
        if (holdTimerRef.current !== null) {
          window.clearInterval(holdTimerRef.current);
        }
        updateStats({ skippedBreaks: readJson<Stats>('mishoo.stats', DEFAULT_STATS).skippedBreaks + 1 });
        finishBreak();
      }
    }, 1000);
  };

  const stopEmergencyHold = () => {
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  return (
    <main className="breakOverlay">
      <div className="floatingBlob blobOne" />
      <div className="floatingBlob blobTwo" />
      <section className="breakContent">
        <div className="breakPetStage">
          <PetIllustration pet={pet} large />
        </div>
        <p className="breakEyebrow">Pawse Mode</p>
        <h1>{canFinish ? '休息完成，咪咻把屏幕还给你。' : '咪咻已经挡住屏幕，请你休息一下。'}</h1>
        <p className="breakMessage">
          {canFinish
            ? '如果感觉好一点了，就回到工作；如果还累，可以继续休息。'
            : '看远处、站起来、喝口水，或者只是闭上眼睛。键盘暂时交给咪咻保管。'}
        </p>
        <div className="breakTimer">{formatTime(remaining)}</div>
        {canFinish ? (
          <button className="primaryButton finishButton" onClick={finishBreak}>回到工作</button>
        ) : (
          <button
            className="emergencyButton"
            onMouseDown={startEmergencyHold}
            onMouseUp={stopEmergencyHold}
            onMouseLeave={stopEmergencyHold}
          >
            紧急退出：按住 8 秒 {holdProgress > 0 ? `(${holdProgress}/8)` : ''}
          </button>
        )}
      </section>
    </main>
  );
}

export function App() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');

  if (mode === 'break') {
    return <BreakOverlay />;
  }

  return <ControlPanel />;
}
