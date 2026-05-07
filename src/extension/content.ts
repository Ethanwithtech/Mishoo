type PetId = 'mishoo-cat' | 'cocoa-dog' | 'snow-rabbit' | 'pom-puppy' | 'lop-rabbit';
type Lang = 'zh' | 'en';

type OverlayPayload = {
  durationSec?: number;
  pet?: PetId;
  strictMode?: boolean;
  language?: Lang;
};

const ROOT_ID = 'mishoo-extension-overlay-root';
const PETS: Record<PetId, { name: Record<Lang, string>; image?: string; video?: string }> = {
  'mishoo-cat': {
    name: { zh: '真实小猫 Mia', en: 'Mia the Real Cat' },
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=85',
  },
  'cocoa-dog': {
    name: { zh: '金毛 Cocoa', en: 'Cocoa the Golden Retriever' },
    video: 'videos/golden-alpha.webm',
  },
  'snow-rabbit': {
    name: { zh: '萨摩耶 Snow', en: 'Snow the Samoyed' },
    video: 'videos/samoyed-source.webm',
  },
  'pom-puppy': {
    name: { zh: '博美 Mochi', en: 'Mochi the Pomeranian' },
    video: 'videos/pomeranian-source.webm',
  },
  'lop-rabbit': {
    name: { zh: '垂耳兔 Mocha', en: 'Mocha the Lop Rabbit' },
    video: 'videos/lop-rabbit-source.webm',
  },
};

const COPY = {
  zh: {
    finish: '回到网页',
    skip: '现在退出休息',
    done: '休息完成',
    resting: '咪咻正在守护休息时间',
  },
  en: {
    finish: 'Back to page',
    skip: 'Exit break now',
    done: 'Break complete',
    resting: 'Mishoo is guarding your break',
  },
} as const;

let cleanupOverlay: (() => void) | null = null;
let keyBlocker: ((event: KeyboardEvent) => void) | null = null;

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const seconds = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getSafePet(value: unknown): PetId {
  return value === 'mishoo-cat' || value === 'snow-rabbit' || value === 'cocoa-dog' || value === 'pom-puppy' || value === 'lop-rabbit' ? value : 'cocoa-dog';
}

function getSafeLanguage(value: unknown): Lang {
  return value === 'en' ? 'en' : 'zh';
}

function removeOverlay(skipped = false) {
  cleanupOverlay?.();
  cleanupOverlay = null;

  if (skipped) {
    void chrome.runtime.sendMessage({ type: 'mishoo:overlay-closed', payload: { skipped } });
  }
}

function createStyle() {
  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      color-scheme: light;
      pointer-events: auto;
    }

    .mishooOverlay {
      position: fixed;
      inset: 0;
      overflow: hidden;
      background: linear-gradient(180deg, rgba(255,255,255,0), rgba(38,24,15,0.08) 78%, rgba(38,24,15,0.14));
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      user-select: none;
    }

    .mishooOverlay::after {
      content: "";
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      height: 34vh;
      pointer-events: none;
      background: linear-gradient(180deg, transparent, rgba(0,0,0,0.08));
    }

    .mishooPetVideo {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      object-fit: contain;
      pointer-events: none;
      background: transparent;
      filter: drop-shadow(0 28px 42px rgba(0,0,0,0.22));
      animation: mishooFadeIn 520ms ease both;
    }

    .mishooPetImageWrap {
      position: fixed;
      left: 50%;
      bottom: 7vh;
      z-index: 2;
      width: min(46vw, 430px);
      transform: translateX(-50%);
      pointer-events: none;
      animation: mishooImageEnter 900ms cubic-bezier(.16,1,.3,1) both;
    }

    .mishooPetImageWrap img {
      display: block;
      width: 100%;
      border: 8px solid rgba(255,255,255,.88);
      border-radius: 42px;
      box-shadow: 0 32px 80px rgba(39,21,10,.28);
    }

    .mishooTimer {
      position: fixed;
      top: 18px;
      left: 18px;
      z-index: 4;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 8px 14px;
      border: 1px solid rgba(255,255,255,.28);
      border-radius: 999px;
      color: #fffaf4;
      background: rgba(31, 22, 16, .52);
      box-shadow: 0 16px 44px rgba(0,0,0,.18);
      backdrop-filter: blur(14px);
      font-size: 22px;
      font-weight: 950;
      letter-spacing: -.04em;
    }

    .mishooTimer small {
      max-width: 210px;
      color: rgba(255,250,244,.82);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .mishooExit {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 4;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 16px;
      border: 1px solid rgba(123,75,47,.14);
      border-radius: 999px;
      color: #653019;
      background: rgba(255,255,255,.9);
      box-shadow: 0 16px 44px rgba(0,0,0,.14);
      backdrop-filter: blur(12px);
      font: 900 14px/1 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .mishooFinish {
      border: 0;
      border-radius: 999px;
      color: #5b2a12;
      background: #fff4e7;
      min-height: 30px;
      padding: 0 12px;
      font: 900 13px/1 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    @keyframes mishooFadeIn {
      from { opacity: 0; transform: translateY(18px) scale(.985); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes mishooImageEnter {
      from { opacity: 0; transform: translate(-50%, 34px) scale(.96); }
      to { opacity: 1; transform: translate(-50%, 0) scale(1); }
    }

    @media (max-width: 720px) {
      .mishooTimer small { display: none; }
      .mishooPetImageWrap { width: min(76vw, 390px); }
    }
  `;
  return style;
}

function showOverlay(payload: OverlayPayload) {
  removeOverlay(false);

  const pet = getSafePet(payload.pet);
  const language = getSafeLanguage(payload.language);
  const duration = Math.max(10, Math.min(Number(payload.durationSec) || 300, 60 * 60));
  const strictMode = payload.strictMode !== false;
  const petMeta = PETS[pet];
  const text = COPY[language];
  let remaining = duration;
  let canFinish = false;

  const host = document.createElement('div');
  host.id = ROOT_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  const overlay = document.createElement('main');
  overlay.className = 'mishooOverlay';

  const timer = document.createElement('section');
  timer.className = 'mishooTimer';
  const timeText = document.createElement('span');
  timeText.textContent = formatTime(remaining);
  const timerLabel = document.createElement('small');
  timerLabel.textContent = text.resting;
  timer.append(timeText, timerLabel);

  const exitButton = document.createElement('button');
  exitButton.className = 'mishooExit';
  exitButton.type = 'button';
  exitButton.textContent = text.skip;
  exitButton.addEventListener('click', () => removeOverlay(!canFinish));

  if (petMeta.video) {
    const video = document.createElement('video');
    video.className = 'mishooPetVideo';
    video.src = chrome.runtime.getURL(petMeta.video);
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    overlay.append(video);
    void video.play().catch(() => undefined);
  } else if (petMeta.image) {
    const imageWrap = document.createElement('figure');
    imageWrap.className = 'mishooPetImageWrap';
    const image = document.createElement('img');
    image.src = petMeta.image;
    image.alt = petMeta.name[language];
    image.draggable = false;
    imageWrap.append(image);
    overlay.append(imageWrap);
  }

  overlay.append(timer, exitButton);
  shadow.append(createStyle(), overlay);
  document.documentElement.append(host);

  const interval = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      remaining = 0;
      canFinish = true;
      timerLabel.textContent = text.done;

      if (!timer.querySelector('.mishooFinish')) {
        const finishButton = document.createElement('button');
        finishButton.className = 'mishooFinish';
        finishButton.type = 'button';
        finishButton.textContent = text.finish;
        finishButton.addEventListener('click', () => removeOverlay(false));
        timer.append(finishButton);
      }
    }
    timeText.textContent = formatTime(remaining);
  }, 1000);

  if (strictMode) {
    keyBlocker = (event: KeyboardEvent) => {
      if (!canFinish) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', keyBlocker, true);
    window.addEventListener('keyup', keyBlocker, true);
  }

  cleanupOverlay = () => {
    window.clearInterval(interval);
    if (keyBlocker) {
      window.removeEventListener('keydown', keyBlocker, true);
      window.removeEventListener('keyup', keyBlocker, true);
      keyBlocker = null;
    }
    document.getElementById(ROOT_ID)?.remove();
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object' || !('type' in message)) {
    return false;
  }

  if (message.type === 'mishoo:show-overlay') {
    showOverlay((message as { payload?: OverlayPayload }).payload || {});
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'mishoo:close-overlay') {
    removeOverlay(false);
    sendResponse({ ok: true });
    return true;
  }

  return false;
});
