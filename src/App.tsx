import { useEffect, useMemo, useState } from 'react';
import { Clock3, Coffee, Globe2, Heart, PawPrint, Play, Shield, Sparkles, X } from 'lucide-react';

type PetId = 'mishoo-cat' | 'cocoa-dog' | 'snow-rabbit';
type Lang = 'zh' | 'en';

type Settings = {
  workMinutes: number;
  breakMinutes: number;
  pet: PetId;
  strictMode: boolean;
  language: Lang;
};

type Stats = {
  completedBreaks: number;
  totalBreakMinutes: number;
  skippedBreaks: number;
};

type PetMeta = {
  name: Record<Lang, string>;
  description: Record<Lang, string>;
  image: string;
  video?: string;
  credit: string;
};

const PETS: Record<PetId, PetMeta> = {
  'mishoo-cat': {
    name: { zh: '真实小猫 Mia', en: 'Mia the Real Cat' },
    description: { zh: '一只会认真挡住屏幕的小猫', en: 'A real cat who gently blocks your screen' },
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=85',
    credit: 'Photo by Eric Han on Unsplash',
  },
  'cocoa-dog': {
    name: { zh: '金毛 Cocoa', en: 'Cocoa the Golden Retriever' },
    description: { zh: '会走到屏幕前躺下的金毛休息搭子', en: 'A golden retriever that walks in and lies down on your screen' },
    image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1200&q=85',
    video: '/videos/golden-alpha.webm',
    credit: 'AI-generated green-screen test video, keyed to WebM alpha',
  },
  'snow-rabbit': {
    name: { zh: '雪球兔兔', en: 'Snow the Rabbit' },
    description: { zh: '安静陪你从屏幕前离开一下', en: 'A calm pet that helps you step away' },
    image: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=1200&q=85',
    credit: 'Photo from Unsplash',
  },
};

const UI: Record<Lang, Record<string, string>> = {
  zh: {
    heroTitle: '让真实宠物替你按下暂停键。',
    heroText: '咪咻是给久坐打工人的桌面休息守护应用。到点后，真实宠物会走到屏幕前，温柔地挡住工作，让你真正离开屏幕休息一会儿。',
    start: '开始专注计时',
    pause: '暂停本轮计时',
    summon: '立即召唤咪咻',
    workRound: '本轮工作',
    willAppear: '咪咻会在时间结束后自动出现。',
    ready: '准备好后开始计时。',
    boundary: '休息边界',
    workMinutes: '工作时长',
    breakMinutes: '休息时长',
    strict: '开启 Pawse Mode：休息期间键盘输入会被遮罩拦截，但可以点击按钮安全退出',
    choosePet: '选择真实宠物',
    stats: '休息记录',
    breaks: '次休息',
    minutes: '分钟',
    skipped: '次跳过',
    waiting: '还没有开始，咪咻正在等你。',
    finished: '咪咻刚刚带你休息了',
    noteTitle: '当前 MVP 边界：',
    note: '咪咻会创建一个全屏置顶休息遮罩。为了避免再次卡住屏幕，当前版本始终提供明显的安全退出按钮；它不会读取屏幕内容、摄像头或上传任何数据。',
    overlayEyebrow: 'Pawse Mode',
    overlayTitle: '咪咻已经挡住屏幕，请你休息一下。',
    overlayDone: '休息完成，咪咻把屏幕还给你。',
    overlayText: '看远处、站起来、喝口水，或者只是闭上眼睛。',
    overlayDoneText: '如果感觉好一点了，就回到工作；如果还累，可以继续休息。',
    finish: '回到工作',
    skip: '现在退出休息屏幕',
    browserFallback: '当前在浏览器预览中运行，已使用网页内休息遮罩。桌面版会打开真正的全屏窗口。',
  },
  en: {
    heroTitle: 'Let a real pet press pause for you.',
    heroText: 'Mishoo is a desktop break guardian for people who sit too long. When it is time to rest, a real pet walks onto your screen and gently blocks work so you actually step away.',
    start: 'Start focus timer',
    pause: 'Pause this round',
    summon: 'Summon Mishoo now',
    workRound: 'Current work round',
    willAppear: 'Mishoo will appear automatically when time is up.',
    ready: 'Start the timer when you are ready.',
    boundary: 'Break boundary',
    workMinutes: 'Work minutes',
    breakMinutes: 'Break minutes',
    strict: 'Enable Pawse Mode: keyboard input is blocked inside the overlay, but the safe exit button is always visible',
    choosePet: 'Choose a real pet',
    stats: 'Break stats',
    breaks: 'breaks',
    minutes: 'minutes',
    skipped: 'skipped',
    waiting: 'Mishoo is waiting for you.',
    finished: 'Mishoo just helped you rest for',
    noteTitle: 'Current MVP boundary: ',
    note: 'Mishoo creates a fullscreen always-on-top break overlay. To avoid trapping you again, this version always shows a clear safe exit button. It does not read your screen, use the camera, or upload data.',
    overlayEyebrow: 'Pawse Mode',
    overlayTitle: 'Mishoo is blocking your screen. Please take a break.',
    overlayDone: 'Break complete. Mishoo gives your screen back.',
    overlayText: 'Look away, stand up, drink water, or simply close your eyes.',
    overlayDoneText: 'If you feel better, return to work. If not, keep resting.',
    finish: 'Back to work',
    skip: 'Exit break screen now',
    browserFallback: 'You are running in browser preview, so Mishoo used an in-page overlay. The desktop app opens a real fullscreen window.',
  },
};

const DEFAULT_SETTINGS: Settings = {
  workMinutes: 50,
  breakMinutes: 5,
  pet: 'cocoa-dog',
  strictMode: true,
  language: 'zh',
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
  localStorage.setItem('mishoo.stats', JSON.stringify({ ...current, ...next }));
}

function PetPhoto({ pet, large = false }: { pet: PetId; large?: boolean }) {
  const meta = PETS[pet];

  return (
    <figure className={`petPhoto ${large ? 'petPhotoLarge' : ''}`}>
      <img src={meta.image} alt={meta.name.zh} draggable={false} />
    </figure>
  );
}

function BreakOverlay({
  duration,
  pet,
  strict,
  language,
  onClose,
}: {
  duration: number;
  pet: PetId;
  strict: boolean;
  language: Lang;
  onClose?: () => void;
}) {
  const [remaining, setRemaining] = useState(duration);
  const [canFinish, setCanFinish] = useState(false);
  const t = UI[language];
  const petMeta = PETS[pet];

  useEffect(() => {
    const stopKeys = (event: KeyboardEvent) => {
      if (strict && !canFinish) {
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
  }, [canFinish, strict]);

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

  const close = (skipped = false) => {
    if (skipped && !canFinish) {
      const current = readJson<Stats>('mishoo.stats', DEFAULT_STATS);
      updateStats({ skippedBreaks: current.skippedBreaks + 1 });
    }

    if (onClose) {
      onClose();
      return;
    }

    void window.mishoo?.closeBreakOverlay();
  };

  return (
    <main className={`breakOverlay ${petMeta.video ? 'videoOverlay' : ''}`}>
      {petMeta.video && (
        <video
          className="breakPetVideoFull"
          src={petMeta.video}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
      )}
      <button className="closeButton" onClick={() => close(true)} aria-label={t.skip}>
        <X size={18} /> {t.skip}
      </button>
      {!petMeta.video && <div className="floatingBlob blobOne" />}
      {!petMeta.video && <div className="floatingBlob blobTwo" />}
      {petMeta.video ? (
        <section className="breakTimerPill" aria-live="polite">
          <span>{formatTime(remaining)}</span>
          {canFinish && <button className="timerFinishButton" onClick={() => close(false)}>{t.finish}</button>}
        </section>
      ) : (
        <section className="breakContent">
          <div className="breakPetStage">
            <PetPhoto pet={pet} large />
          </div>
          <p className="breakEyebrow">{t.overlayEyebrow}</p>
          <h1>{canFinish ? t.overlayDone : t.overlayTitle}</h1>
          <p className="breakMessage">{canFinish ? t.overlayDoneText : t.overlayText}</p>
          <div className="breakTimer">{formatTime(remaining)}</div>
          <p className="photoCredit">{petMeta.credit}</p>
          {canFinish && <button className="primaryButton finishButton" onClick={() => close(false)}>{t.finish}</button>}
        </section>
      )}
    </main>
  );
}

function ControlPanel() {
  const [settings, setSettings] = useStoredState<Settings>('mishoo.settings', DEFAULT_SETTINGS);
  const [stats, setStats] = useStoredState<Stats>('mishoo.stats', DEFAULT_STATS);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(settings.workMinutes * 60);
  const [lastBreak, setLastBreak] = useState<string>(UI[settings.language].waiting);
  const [browserBreak, setBrowserBreak] = useState<Settings | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState(false);
  const t = UI[settings.language];

  useEffect(() => {
    if (!running) {
      setRemaining(settings.workMinutes * 60);
    }
  }, [settings.workMinutes, running]);

  useEffect(() => {
    setLastBreak((current) => (current === UI.zh.waiting || current === UI.en.waiting ? t.waiting : current));
  }, [t.waiting]);

  const triggerBreak = () => {
    setRunning(false);
    const durationSec = settings.breakMinutes * 60;

    if (window.mishoo) {
      void window.mishoo.showBreakOverlay({
        durationSec,
        pet: settings.pet,
        strictMode: settings.strictMode,
        language: settings.language,
      });
      return;
    }

    setFallbackNotice(true);
    setBrowserBreak({ ...settings });
  };

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          triggerBreak();
          const nextStats = {
            completedBreaks: stats.completedBreaks + 1,
            totalBreakMinutes: stats.totalBreakMinutes + settings.breakMinutes,
          };
          setStats((currentStats) => ({ ...currentStats, ...nextStats }));
          setLastBreak(`${t.finished} ${settings.breakMinutes} ${t.minutes}.`);
          return settings.workMinutes * 60;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running, settings, setStats, stats.completedBreaks, stats.totalBreakMinutes, t.finished, t.minutes]);

  const petOptions = Object.entries(PETS) as Array<[PetId, PetMeta]>;
  const progress = 1 - remaining / (settings.workMinutes * 60);

  return (
    <>
    <main className="appShell">
      <section className="heroCard">
        <div className="heroCopy">
          <div className="topBar">
            <div className="brandRow">
              <div className="brandMark"><PawPrint size={22} /></div>
              <span>Mishoo / 咪咻</span>
            </div>
            <button
              className="languageButton"
              onClick={() => setSettings({ ...settings, language: settings.language === 'zh' ? 'en' : 'zh' })}
            >
              <Globe2 size={16} /> {settings.language === 'zh' ? 'English' : '中文'}
            </button>
          </div>
          <h1>{t.heroTitle}</h1>
          <p>{t.heroText}</p>
          {fallbackNotice && <div className="notice">{t.browserFallback}</div>}
          <div className="heroActions">
            <button className="primaryButton" onClick={() => setRunning((value) => !value)}>
              {running ? <Coffee size={18} /> : <Play size={18} />}
              {running ? t.pause : t.start}
            </button>
            <button className="ghostButton" onClick={triggerBreak}>{t.summon}</button>
          </div>
        </div>
        <div className="heroPetPanel">
          <PetPhoto pet={settings.pet} large />
          <div className="petName">{PETS[settings.pet].name[settings.language]}</div>
          <div className="petHint">{PETS[settings.pet].description[settings.language]}</div>
        </div>
      </section>

      <section className="dashboardGrid">
        <article className="timerCard panel">
          <div className="panelTitle"><Clock3 size={18} /> {t.workRound}</div>
          <div className="timeDisplay">{formatTime(remaining)}</div>
          <div className="progressTrack"><div className="progressFill" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <p>{running ? t.willAppear : t.ready}</p>
        </article>

        <article className="panel">
          <div className="panelTitle"><Shield size={18} /> {t.boundary}</div>
          <label className="field">
            <span>{t.workMinutes}</span>
            <input type="number" min="1" max="180" value={settings.workMinutes} onChange={(event) => setSettings({ ...settings, workMinutes: Number(event.target.value) })} />
          </label>
          <label className="field">
            <span>{t.breakMinutes}</span>
            <input type="number" min="1" max="60" value={settings.breakMinutes} onChange={(event) => setSettings({ ...settings, breakMinutes: Number(event.target.value) })} />
          </label>
          <label className="toggleField">
            <input type="checkbox" checked={settings.strictMode} onChange={(event) => setSettings({ ...settings, strictMode: event.target.checked })} />
            <span>{t.strict}</span>
          </label>
        </article>

        <article className="panel petPickerPanel">
          <div className="panelTitle"><Sparkles size={18} /> {t.choosePet}</div>
          <div className="petPicker">
            {petOptions.map(([id, pet]) => (
              <button key={id} className={`petOption ${settings.pet === id ? 'selected' : ''}`} onClick={() => setSettings({ ...settings, pet: id })}>
                <PetPhoto pet={id} />
                <span>{pet.name[settings.language]}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel statsPanel">
          <div className="panelTitle"><Heart size={18} /> {t.stats}</div>
          <div className="statsGrid">
            <div><strong>{stats.completedBreaks}</strong><span>{t.breaks}</span></div>
            <div><strong>{stats.totalBreakMinutes}</strong><span>{t.minutes}</span></div>
            <div><strong>{stats.skippedBreaks}</strong><span>{t.skipped}</span></div>
          </div>
          <p>{lastBreak}</p>
        </article>
      </section>

      <section className="notePanel"><strong>{t.noteTitle}</strong>{t.note}</section>
    </main>
    {browserBreak && (
      <BreakOverlay
        duration={browserBreak.breakMinutes * 60}
        pet={browserBreak.pet}
        strict={browserBreak.strictMode}
        language={browserBreak.language}
        onClose={() => setBrowserBreak(null)}
      />
    )}
    </>
  );
}

export function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const mode = params.get('mode');
  const petParam = params.get('pet') as PetId | null;
  const langParam = params.get('lang') as Lang | null;
  const pet = petParam && petParam in PETS ? petParam : 'mishoo-cat';
  const language = langParam === 'en' ? 'en' : 'zh';

  if (mode === 'break') {
    return (
      <BreakOverlay
        duration={Math.max(10, Number(params.get('duration') || 300))}
        pet={pet}
        strict={params.get('strict') !== '0'}
        language={language}
      />
    );
  }

  return <ControlPanel />;
}
