import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, RotateCcw, Trash2, X } from 'lucide-react';

type TimerPhase = 'work' | 'shortBreak' | 'longBreak';
type PetMotion = 'idle' | 'walk' | 'jump' | 'rest';

type Todo = {
  id: string;
  text: string;
  done: boolean;
};

type ReminderState = {
  nextWaterAt: number;
  nextPostureAt: number;
};

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
const WORK_SECONDS = 25 * 60;
const SHORT_BREAK_SECONDS = 5 * 60;
const LONG_BREAK_SECONDS = 15 * 60;
const WATER_INTERVAL = 60 * 60 * 1000;
const POSTURE_INTERVAL = 45 * 60 * 1000;

const CHAT_LINES = [
  '先认真一下，再一起摸鱼。',
  '肩膀放松，眼睛眨一眨。',
  '咪咻正在监督你的坐姿。',
  '今天也有好好照顾自己吗？',
  '做完这一轮就休息！',
];

const GOLDEN_PUPPY_ASSETS: Record<PetMotion | 'poster', string> = {
  poster: '/desktop-pet/golden-puppy/poster.webp',
  idle: '/desktop-pet/golden-puppy/idle.webm',
  walk: '/desktop-pet/golden-puppy/walk.webm',
  jump: '/desktop-pet/golden-puppy/jump.webm',
  rest: '/desktop-pet/golden-puppy/rest.webm',
};

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

function phaseDuration(phase: TimerPhase) {
  if (phase === 'work') return WORK_SECONDS;
  if (phase === 'longBreak') return LONG_BREAK_SECONDS;
  return SHORT_BREAK_SECONDS;
}

function playReminderTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = 620;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.18);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.2);
    oscillator.addEventListener('ended', () => void audio.close());
  } catch {
    // The pet remains useful when audio is unavailable or disabled.
  }
}

export function DesktopPet() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<TimerPhase>('work');
  const [remaining, setRemaining] = useState(WORK_SECONDS);
  const [completedWorkRounds, setCompletedWorkRounds] = useState(0);
  const [activeReaction, setActiveReaction] = useState<PetMotion | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [bubble, setBubble] = useState<string | null>('右键打开咪咻菜单');
  const [reminderKind, setReminderKind] = useState<'water' | 'posture' | null>(null);
  const [todos, setTodos] = useState<Todo[]>(() => readStored('mishoo.todos', []));
  const [todoOpen, setTodoOpen] = useState(false);
  const [todoText, setTodoText] = useState('');
  const [patrol, setPatrol] = useState<{ direction: -1 | 1; mode: 'walking' | 'idle' }>({ direction: -1, mode: 'walking' });
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0 });
  const bubbleTimer = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('desktopPetDocument');
    document.body.classList.add('desktopPetDocument');
    return () => {
      document.documentElement.classList.remove('desktopPetDocument');
      document.body.classList.remove('desktopPetDocument');
    };
  }, []);

  const showBubble = (message: string, timeout = 4200) => {
    setBubble(message);
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => {
      setBubble(null);
      setReminderKind(null);
    }, timeout);
  };

  const toggleTimer = () => {
    setRunning((current) => {
      showBubble(current ? '本轮已暂停，慢慢来。' : phase === 'work' ? '专注计时开始！' : '休息计时开始！');
      return !current;
    });
  };

  useEffect(() => {
    localStorage.setItem('mishoo.todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current > 1) return current - 1;

        playReminderTone();
        if (phase === 'work') {
          const nextRounds = completedWorkRounds + 1;
          const nextPhase: TimerPhase = nextRounds % 4 === 0 ? 'longBreak' : 'shortBreak';
          setCompletedWorkRounds(nextRounds);
          setPhase(nextPhase);
          showBubble(nextPhase === 'longBreak' ? '四轮完成，去好好休息一下！' : '这一轮完成，起来走走吧！', 8000);
          return phaseDuration(nextPhase);
        }

        setPhase('work');
        showBubble('休息结束，准备好再继续。', 6500);
        return WORK_SECONDS;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [completedWorkRounds, phase, running]);

  useEffect(() => {
    const now = Date.now();
    const reminders = readStored<ReminderState>('mishoo.reminders', {
      nextWaterAt: now + WATER_INTERVAL,
      nextPostureAt: now + POSTURE_INTERVAL,
    });
    localStorage.setItem('mishoo.reminders', JSON.stringify(reminders));

    const check = () => {
      const current = readStored<ReminderState>('mishoo.reminders', reminders);
      const currentTime = Date.now();
      if (currentTime >= current.nextWaterAt) {
        current.nextWaterAt = currentTime + WATER_INTERVAL;
        setReminderKind('water');
        showBubble('喝水时间到啦！', 12000);
        playReminderTone();
      } else if (currentTime >= current.nextPostureAt) {
        current.nextPostureAt = currentTime + POSTURE_INTERVAL;
        setReminderKind('posture');
        showBubble('坐了 45 分钟，站起来伸伸腰吧！', 12000);
        playReminderTone();
      }
      localStorage.setItem('mishoo.reminders', JSON.stringify(current));
    };

    const timer = window.setInterval(check, 15000);
    check();
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const cleanupTimer = window.mishoo?.onPetTimerToggle(toggleTimer);
    const cleanupTodos = window.mishoo?.onPetShowTodos(() => setTodoOpen(true));
    const cleanupPatrol = window.mishoo?.onPetPatrolState(setPatrol);
    return () => {
      cleanupTimer?.();
      cleanupTodos?.();
      cleanupPatrol?.();
      if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    };
  });

  useEffect(() => {
    void window.mishoo?.setPetPatrolPaused(todoOpen);
  }, [todoOpen]);

  const interact = () => {
    setActiveReaction('jump');
    setAnimationKey((value) => value + 1);
    const nextRunning = !running;
    setRunning(nextRunning);
    const chat = CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)];
    showBubble(`${chat} ${nextRunning ? '专注计时开始！' : '本轮已暂停。'}`);
  };

  const snoozeReminder = () => {
    const current = readStored<ReminderState>('mishoo.reminders', {
      nextWaterAt: Date.now() + WATER_INTERVAL,
      nextPostureAt: Date.now() + POSTURE_INTERVAL,
    });
    if (reminderKind === 'water') current.nextWaterAt = Date.now() + 10 * 60 * 1000;
    if (reminderKind === 'posture') current.nextPostureAt = Date.now() + 10 * 60 * 1000;
    localStorage.setItem('mishoo.reminders', JSON.stringify(current));
    setReminderKind(null);
    showBubble('好，10 分钟后再提醒你。');
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 || todoOpen) return;
    drag.current = { active: true, moved: false, startX: event.screenX, startY: event.screenY };
    event.currentTarget.setPointerCapture(event.pointerId);
    void window.mishoo?.beginPetDrag({ screenX: event.screenX, screenY: event.screenY });
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current.active) return;
    if (Math.hypot(event.screenX - drag.current.startX, event.screenY - drag.current.startY) > 4) {
      drag.current.moved = true;
    }
    void window.mishoo?.movePet({ screenX: event.screenX, screenY: event.screenY });
  };

  const onPointerUp = () => {
    if (!drag.current.active) return;
    const shouldInteract = !drag.current.moved;
    drag.current.active = false;
    void window.mishoo?.endPetDrag();
    if (shouldInteract) interact();
  };

  const addTodo = (event: React.FormEvent) => {
    event.preventDefault();
    const text = todoText.trim();
    if (!text) return;
    setTodos((current) => [...current, { id: `${Date.now()}-${Math.random()}`, text, done: false }]);
    setTodoText('');
  };

  const baseMotion: PetMotion = phase !== 'work'
    ? 'rest'
    : patrol.mode === 'walking'
      ? 'walk'
      : 'idle';
  const currentMotion = activeReaction ?? baseMotion;
  const petVideoClassName = [
    'desktopPetImage',
    'desktopPetVideo',
    currentMotion === 'jump' ? 'interaction-jump' : '',
  ].filter(Boolean).join(' ');

  return (
    <main
      className="desktopPetRoot"
      onContextMenu={(event) => {
        event.preventDefault();
        void window.mishoo?.showPetMenu({ running, phase, remaining });
      }}
      onWheel={(event) => {
        event.preventDefault();
        void window.mishoo?.resizePet(event.deltaY < 0 ? 0.1 : -0.1);
      }}
    >
      {bubble && !todoOpen && (
        <aside className="petBubble" role="status">
          <span>{bubble}</span>
          {reminderKind && <button onClick={snoozeReminder}><RotateCcw size={13} /> 延后 10 分钟</button>}
        </aside>
      )}

      <section
        className="desktopPetStage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className={`petTimerBadge ${running ? 'isRunning' : ''}`}>
          <span>{phase === 'work' ? '专注' : phase === 'longBreak' ? '长休' : '休息'}</span>
          <strong>{formatTime(remaining)}</strong>
        </div>
        <div className={`desktopPetVisual facing-${patrol.direction === 1 ? 'right' : 'left'}`}>
          <div className={`desktopPetMotion patrol-${patrol.mode}`}>
            <video
              key={`${currentMotion}-${animationKey}`}
              className={petVideoClassName}
              src={asset(GOLDEN_PUPPY_ASSETS[currentMotion])}
              poster={asset(GOLDEN_PUPPY_ASSETS.poster)}
              aria-label="Mishoo 幼年金毛桌宠"
              autoPlay
              loop={currentMotion !== 'jump'}
              muted
              playsInline
              preload="auto"
              draggable={false}
              onLoadedMetadata={(event) => {
                void event.currentTarget.play().catch(() => undefined);
              }}
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                if (currentMotion === 'jump' && video.currentTime >= 2.4) {
                  setActiveReaction(null);
                }
              }}
              onEnded={() => {
                if (currentMotion === 'jump') setActiveReaction(null);
              }}
            />
          </div>
        </div>
      </section>

      {todoOpen && (
        <section className="petTodoPanel" aria-label="咪咻待办">
          <header><strong>待办</strong><button onClick={() => setTodoOpen(false)} aria-label="关闭待办"><X size={17} /></button></header>
          <form onSubmit={addTodo}>
            <input value={todoText} onChange={(event) => setTodoText(event.target.value)} placeholder="新增一件小事…" autoFocus />
            <button type="submit" aria-label="新增待办"><Plus size={17} /></button>
          </form>
          <div className="petTodoList">
            {todos.length === 0 && <p>还没有待办，轻装上阵。</p>}
            {todos.map((todo) => (
              <div className={todo.done ? 'isDone' : ''} key={todo.id}>
                <button onClick={() => setTodos((current) => current.map((item) => item.id === todo.id ? { ...item, done: !item.done } : item))} aria-label="切换完成状态">
                  {todo.done && <Check size={13} />}
                </button>
                <span>{todo.text}</span>
                <button onClick={() => setTodos((current) => current.filter((item) => item.id !== todo.id))} aria-label="删除待办"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
