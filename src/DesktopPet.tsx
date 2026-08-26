import React, { useEffect, useRef, useState } from 'react';
import { BellOff, Check, Moon, Pause, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react';

type TimerPhase = 'work' | 'shortBreak' | 'longBreak';
type PetMotion = 'idle' | 'walk' | 'jump' | 'rest';
type PetActivityMode = 'calm' | 'patrol';

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
  'One focused step at a time.',
  'Drop your shoulders and blink.',
  'Mishoo is watching your posture.',
  'Have you been kind to yourself today?',
  'Finish this round, then we rest!',
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
  const [bubble, setBubble] = useState<string | null>(null);
  const [controlsRevealed, setControlsRevealed] = useState(false);
  const [reminderKind, setReminderKind] = useState<'water' | 'posture' | null>(null);
  const [todos, setTodos] = useState<Todo[]>(() => readStored('mishoo.todos', []));
  const [todoOpen, setTodoOpen] = useState(false);
  const [todoText, setTodoText] = useState('');
  const [activityMode, setActivityMode] = useState<PetActivityMode>(() => readStored<{ petActivity?: PetActivityMode }>('mishoo.settings', {}).petActivity ?? 'calm');
  const [patrol, setPatrol] = useState<{ direction: -1 | 1; mode: 'walking' | 'idle' }>({ direction: -1, mode: 'walking' });
  // User-controlled rest: pins the pet to its lie-down animation and stops it moving,
  // independent of the timer. This is the "let it settle down" control.
  const [restPinned, setRestPinned] = useState<boolean>(() => readStored<{ restPinned?: boolean }>('mishoo.settings', {}).restPinned ?? false);
  // Do-Not-Disturb: silences water/posture reminders, bubbles and patrol for a
  // focused stretch, so a companion never becomes a nag.
  const [dnd, setDnd] = useState<boolean>(() => readStored<{ dnd?: boolean }>('mishoo.settings', {}).dnd ?? false);
  const dndRef = useRef(dnd);
  dndRef.current = dnd;
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0 });
  const bubbleTimer = useRef<number | null>(null);
  const controlsTimer = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('desktopPetDocument');
    document.body.classList.add('desktopPetDocument');
    const syncSettings = (event: StorageEvent) => {
      if (event.key !== 'mishoo.settings' || !event.newValue) return;
      try {
        const settings = JSON.parse(event.newValue) as { petActivity?: PetActivityMode; restPinned?: boolean; dnd?: boolean };
        if (settings.petActivity === 'calm' || settings.petActivity === 'patrol') {
          setActivityMode(settings.petActivity);
        }
        if (typeof settings.restPinned === 'boolean') setRestPinned(settings.restPinned);
        if (typeof settings.dnd === 'boolean') setDnd(settings.dnd);
      } catch {
        // Keep the current mode if another window writes malformed settings.
      }
    };
    window.addEventListener('storage', syncSettings);
    return () => {
      window.removeEventListener('storage', syncSettings);
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

  const revealControls = (timeout = 4200) => {
    setControlsRevealed(true);
    if (controlsTimer.current) window.clearTimeout(controlsTimer.current);
    controlsTimer.current = window.setTimeout(() => setControlsRevealed(false), timeout);
  };

  const toggleTimer = () => {
    setRunning((current) => {
      showBubble(current ? 'Timer paused. Mishoo is resting.' : phase === 'work' ? 'Focus timer started!' : 'Break timer started!');
      return !current;
    });
  };

  const persistSetting = (patch: Record<string, unknown>) => {
    const settings = readStored<Record<string, unknown>>('mishoo.settings', {});
    localStorage.setItem('mishoo.settings', JSON.stringify({ ...settings, ...patch }));
  };

  const saveActivityMode = (mode: PetActivityMode) => {
    setActivityMode(mode);
    persistSetting({ petActivity: mode });
    showBubble(mode === 'calm' ? 'Calm mode on. Mishoo will rest quietly.' : 'Gentle patrol is on during focus time.');
  };

  const toggleRestPinned = () => {
    setRestPinned((current) => {
      const next = !current;
      persistSetting({ restPinned: next });
      showBubble(next ? 'Okay, lying down. Wake me with a tap.' : 'Up and about again!');
      return next;
    });
  };

  const toggleDnd = () => {
    setDnd((current) => {
      const next = !current;
      persistSetting({ dnd: next });
      if (next) {
        setReminderKind(null);
        setBubble(null);
      }
      showBubble(next ? 'Do-Not-Disturb on. I will stay quiet.' : 'Do-Not-Disturb off.');
      return next;
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
          showBubble(nextPhase === 'longBreak' ? 'Four rounds done. Take a proper break!' : 'Round complete. Time to stand and stretch!', 8000);
          return phaseDuration(nextPhase);
        }

        setPhase('work');
        showBubble('Break complete. Continue when you feel ready.', 6500);
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
      // Do-Not-Disturb silences reminders entirely (still slides the schedule
      // forward so nothing fires in a burst the moment it's turned off).
      if (dndRef.current) {
        const current = readStored<ReminderState>('mishoo.reminders', reminders);
        const currentTime = Date.now();
        if (currentTime >= current.nextWaterAt) current.nextWaterAt = currentTime + WATER_INTERVAL;
        if (currentTime >= current.nextPostureAt) current.nextPostureAt = currentTime + POSTURE_INTERVAL;
        localStorage.setItem('mishoo.reminders', JSON.stringify(current));
        return;
      }
      const current = readStored<ReminderState>('mishoo.reminders', reminders);
      const currentTime = Date.now();
      if (currentTime >= current.nextWaterAt) {
        current.nextWaterAt = currentTime + WATER_INTERVAL;
        setReminderKind('water');
        showBubble('Time for some water!', 12000);
        playReminderTone();
      } else if (currentTime >= current.nextPostureAt) {
        current.nextPostureAt = currentTime + POSTURE_INTERVAL;
        setReminderKind('posture');
        showBubble('You have been sitting for 45 minutes. Stand and stretch!', 12000);
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
    const cleanupActivityMode = window.mishoo?.onPetActivityMode(saveActivityMode);
    return () => {
      cleanupTimer?.();
      cleanupTodos?.();
      cleanupPatrol?.();
      cleanupActivityMode?.();
      if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
      if (controlsTimer.current) window.clearTimeout(controlsTimer.current);
    };
  });

  useEffect(() => {
    // Rest-pinned or DND both stop the pet wandering.
    const shouldPatrol = running && phase === 'work' && activityMode === 'patrol' && !todoOpen && !restPinned && !dnd;
    void window.mishoo?.setPetPatrolPaused(!shouldPatrol);
  }, [activityMode, phase, running, todoOpen, restPinned, dnd]);

  const interact = () => {
    revealControls();
    // Tapping a resting-pinned pet wakes it rather than making it jump in place.
    if (restPinned) {
      toggleRestPinned();
      return;
    }
    setActiveReaction('jump');
    setAnimationKey((value) => value + 1);
    if (!dnd) {
      const chat = CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)];
      showBubble(chat);
    }
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
    showBubble('Okay, I will remind you again in 10 minutes.');
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

  const baseMotion: PetMotion = restPinned || !running || phase !== 'work' || activityMode === 'calm'
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
      className={`desktopPetRoot ${controlsRevealed ? 'petControlsRevealed' : ''}`}
      onContextMenu={(event) => {
        event.preventDefault();
        void window.mishoo?.showPetMenu({ running, phase, remaining, activityMode });
      }}
      onWheel={(event) => {
        event.preventDefault();
        void window.mishoo?.resizePet(event.deltaY < 0 ? 0.1 : -0.1);
      }}
    >
      {bubble && !todoOpen && (
        <aside className="petBubble" role="status">
          <span>{bubble}</span>
          {reminderKind && <button onClick={snoozeReminder}><RotateCcw size={13} /> Remind me in 10 min</button>}
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
          <span>{phase === 'work' ? 'Focus' : phase === 'longBreak' ? 'Long break' : 'Break'}</span>
          <strong>{formatTime(remaining)}</strong>
          <button
            className="petTimerControl"
            type="button"
            aria-label={running ? 'Pause timer and let Mishoo rest' : 'Start timer'}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              revealControls();
              toggleTimer();
            }}
          >
            {running ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            {running ? 'Pause & rest' : 'Start'}
          </button>
          <div className="petQuickToggles" onPointerDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={`petToggleChip ${restPinned ? 'isActive' : ''}`}
              aria-pressed={restPinned}
              aria-label={restPinned ? 'Wake Mishoo up' : 'Let Mishoo lie down and rest'}
              title={restPinned ? 'Wake up' : 'Lie down'}
              onClick={(event) => { event.stopPropagation(); toggleRestPinned(); }}
            >
              <Moon size={12} /> {restPinned ? 'Resting' : 'Lie down'}
            </button>
            <button
              type="button"
              className={`petToggleChip ${dnd ? 'isActive' : ''}`}
              aria-pressed={dnd}
              aria-label={dnd ? 'Turn off Do Not Disturb' : 'Turn on Do Not Disturb'}
              title="Do Not Disturb"
              onClick={(event) => { event.stopPropagation(); toggleDnd(); }}
            >
              <BellOff size={12} /> {dnd ? 'Quiet' : 'DND'}
            </button>
          </div>
        </div>
        <div className={`desktopPetVisual facing-${patrol.direction === 1 ? 'right' : 'left'}`}>
          <div className={`desktopPetMotion patrol-${patrol.mode}`}>
            <video
              key={`${currentMotion}-${animationKey}`}
              className={petVideoClassName}
              src={asset(GOLDEN_PUPPY_ASSETS[currentMotion])}
              poster={asset(GOLDEN_PUPPY_ASSETS.poster)}
              aria-label="Mishoo golden retriever puppy desktop pet"
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
        <section className="petTodoPanel" aria-label="Mishoo to-do list">
          <header><strong>To-do</strong><button onClick={() => setTodoOpen(false)} aria-label="Close to-do list"><X size={17} /></button></header>
          <form onSubmit={addTodo}>
            <input value={todoText} onChange={(event) => setTodoText(event.target.value)} placeholder="Add a small task…" autoFocus />
            <button type="submit" aria-label="Add task"><Plus size={17} /></button>
          </form>
          <div className="petTodoList">
            {todos.length === 0 && <p>No tasks yet. Keep it light.</p>}
            {todos.map((todo) => (
              <div className={todo.done ? 'isDone' : ''} key={todo.id}>
                <button onClick={() => setTodos((current) => current.map((item) => item.id === todo.id ? { ...item, done: !item.done } : item))} aria-label="Toggle task status">
                  {todo.done && <Check size={13} />}
                </button>
                <span>{todo.text}</span>
                <button onClick={() => setTodos((current) => current.filter((item) => item.id !== todo.id))} aria-label="Delete task"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
