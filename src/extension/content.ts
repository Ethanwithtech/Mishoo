type PetId = 'mishoo-cat' | 'cocoa-dog' | 'snow-rabbit' | 'pom-puppy' | 'lop-rabbit' | 'bamboo-panda';
type Lang = 'zh' | 'en';

type OverlayPayload = {
  durationSec?: number;
  pet?: PetId;
  strictMode?: boolean;
  language?: Lang;
};

type PetMeta = {
  name: Record<Lang, string>;
  image?: string;
  video?: string;
  /** Whether the video has a verified transparent alpha channel; built-in videos are chroma-screen sources. */
  hasAlpha?: boolean;
  /** Runtime key color. Panda uses blue/cyan screen so the green bamboo is preserved. */
  chromaKey?: 'green' | 'blue';
  /** Time, in seconds, where the calm resting loop starts after the entrance animation. */
  restLoopStart?: number;
};

const ROOT_ID = 'mishoo-extension-overlay-root';
const PETS: Record<PetId, PetMeta> = {
  'mishoo-cat': {
    name: { zh: '真实小猫 Mia', en: 'Mia the Real Cat' },
    video: 'videos/mia-source.webm',
    restLoopStart: 5,
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=85',
  },
  'cocoa-dog': {
    name: { zh: '金毛 Cocoa', en: 'Cocoa the Golden Retriever' },
    video: 'videos/golden-source.webm',
    restLoopStart: 4,
  },
  'snow-rabbit': {
    name: { zh: '萨摩耶 Snow', en: 'Snow the Samoyed' },
    video: 'videos/samoyed-source.webm',
    restLoopStart: 1,
  },
  'pom-puppy': {
    name: { zh: '博美 Mochi', en: 'Mochi the Pomeranian' },
    video: 'videos/pomeranian-source.webm',
    restLoopStart: 4,
  },
  'lop-rabbit': {
    name: { zh: '垂耳兔 Mocha', en: 'Mocha the Lop Rabbit' },
    video: 'videos/lop-rabbit-source.webm',
    restLoopStart: 4,
  },
  'bamboo-panda': {
    name: { zh: '竹子熊猫 BaoBao', en: 'BaoBao the Bamboo Panda' },
    video: 'videos/panda-bamboo-source.webm',
    hasAlpha: true,
    restLoopStart: 6,
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
  return value === 'mishoo-cat' || value === 'snow-rabbit' || value === 'cocoa-dog' || value === 'pom-puppy' || value === 'lop-rabbit' || value === 'bamboo-panda' ? value : 'cocoa-dog';
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
      background: transparent;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      user-select: none;
    }

    .mishooOverlay::after {
      content: none;
    }

    .mishooPetSourceVideo {
      position: fixed;
      left: -10px;
      top: -10px;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }

    .mishooPetCanvas,
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

function appendKeyedPetVideo(overlay: HTMLElement, petMeta: PetMeta) {
  if (!petMeta.video) return () => undefined;

  const video = document.createElement('video');
  video.src = chrome.runtime.getURL(petMeta.video);
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  const isAlphaVideo = petMeta.hasAlpha === true;

  const loopFromRestPose = () => {
    const start = typeof petMeta.restLoopStart === 'number' ? petMeta.restLoopStart : 0;
    const dur = video.duration;
    if (!Number.isFinite(dur) || dur <= 0) return;
    try {
      video.currentTime = Math.max(0, Math.min(start, dur - 0.05));
    } catch {
      /* noop */
    }
  };

  if (isAlphaVideo) {
    video.className = 'mishooPetVideo';
    let hasFinishedIntro = false;
    const onEnded = () => {
      hasFinishedIntro = true;
      loopFromRestPose();
      void video.play().catch(() => undefined);
    };
    const onTimeUpdate = () => {
      const dur = video.duration;
      if (Number.isFinite(dur) && dur > 0 && video.currentTime >= dur - 0.1) {
        hasFinishedIntro = true;
        loopFromRestPose();
      }
    };
    const onLoaded = () => {
      void video.play().catch(() => undefined);
    };
    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    overlay.append(video);
    void video.play().catch(() => undefined);
    return () => {
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.pause();
      video.removeAttribute('src');
      video.load();
      void hasFinishedIntro;
    };
  }

  video.className = 'mishooPetSourceVideo';
  video.crossOrigin = 'anonymous';

  const canvas = document.createElement('canvas');
  canvas.className = 'mishooPetCanvas';
  overlay.append(video, canvas);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    video.className = 'mishooPetVideo';
    canvas.remove();
    void video.play().catch(() => undefined);
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }

  const maxCanvasSide = 1280;
  const targetFrameMs = 1000 / 24;
  let rafId = 0;
  let running = true;
  let hasFinishedIntro = false;
  let lastFrameAt = 0;

  const setupCanvas = () => {
    if (!video.videoWidth || !video.videoHeight) return;
    const scale = Math.min(1, maxCanvasSide / Math.max(video.videoWidth, video.videoHeight));
    const nextWidth = Math.max(1, Math.round(video.videoWidth * scale));
    const nextHeight = Math.max(1, Math.round(video.videoHeight * scale));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
  };

  const fallbackToRawVideo = () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    canvas.remove();
    video.className = 'mishooPetVideo';
  };

  const draw = (now = performance.now()) => {
    if (!running) return;

    if (video.readyState >= 2 && video.videoWidth && now - lastFrameAt >= targetFrameMs) {
      setupCanvas();
      lastFrameAt = now;

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          // Preserve existing alpha from already-matted WebM files.
          if (a <= 4) continue;

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (petMeta.chromaKey === 'blue') {
            // Panda holds green bamboo, so this source uses a blue/cyan screen instead of green.
            const blueVsRed = b - r;
            const greenVsRed = g - r;
            const isBlueScreen = b > 75 && blueVsRed > 24 && greenVsRed > 18 && b >= g - 10;
            const keyStrength = isBlueScreen
              ? Math.min(1, Math.max(0, (Math.min(blueVsRed, greenVsRed) - 18) / 34))
              : 0;

            if (keyStrength >= 0.96 || (isBlueScreen && blueVsRed > 52 && greenVsRed > 32)) {
              data[i + 3] = 0;
              continue;
            }

            if (keyStrength > 0) {
              data[i + 3] = Math.max(0, Math.round(a * (1 - keyStrength)));
              if (data[i + 3] < 28) {
                data[i + 3] = 0;
                continue;
              }
              // Despill blue/cyan edges while preserving green bamboo.
              data[i + 2] = Math.max(r, Math.round(b - blueVsRed * 0.75));
              data[i + 1] = Math.max(r, Math.round(g - greenVsRed * 0.45));
            }
            continue;
          }

          const maxRedBlue = Math.max(r, b);
          const minRedBlue = Math.min(r, b);
          const greenDominance = g - maxRedBlue;
          const greenness = 2 * g - r - b;
          const greenSaturation = g - minRedBlue;
          // 非常激进的绿幕清除：背景直接透明，边缘残绿快速衰减。
          // 当前素材背景不是纯 #00ff00，而是压缩后的暗绿/黄绿，所以阈值要低一些。
          const isGreenScreen = g > 42 && greenDominance > 7 && greenness > 16 && greenSaturation > 24;
          const keyStrength = isGreenScreen
            ? Math.min(1, Math.max(0, (greenDominance - 7) / 34))
            : 0;

          if (keyStrength >= 0.98 || (isGreenScreen && greenDominance > 46)) {
            data[i + 3] = 0;
            continue;
          }

          if (keyStrength > 0) {
            data[i + 3] = Math.max(0, Math.round(a * (1 - keyStrength)));
            if (data[i + 3] < 28) {
              data[i + 3] = 0;
              continue;
            }
          }

          // Despill green edges so fur looks less neon after chroma keying.
          // Pull green back toward the red/blue average rather than clamping at
          // max(r, b) — on light fur the red channel is already high, so the old
          // clamp was a no-op and left a visible green cast on the coat.
          const spillLimit = (r + b) / 2 + 6;
          if (g > spillLimit) {
            data[i + 1] = Math.round(g - (g - spillLimit) * 0.9);
          }
        }
        ctx.putImageData(frame, 0, 0);
      } catch {
        fallbackToRawVideo();
        return;
      }
    }

    rafId = requestAnimationFrame(draw);
  };

  const loopChromaFromRestPose = () => {
    const dur = video.duration;
    if (!Number.isFinite(dur) || dur <= 0) return;
    if (hasFinishedIntro || video.currentTime >= dur - 0.1) {
      hasFinishedIntro = true;
      loopFromRestPose();
    }
  };

  const onLoaded = () => {
    setupCanvas();
    void video.play().catch(() => undefined);
    if (rafId === 0) rafId = requestAnimationFrame(draw);
  };

  const onEnded = () => {
    loopChromaFromRestPose();
    void video.play().catch(() => undefined);
  };

  const onTimeUpdate = () => {
    const dur = video.duration;
    if (Number.isFinite(dur) && dur > 0 && video.currentTime >= dur - 0.1) {
      loopChromaFromRestPose();
    }
  };

  video.addEventListener('loadeddata', onLoaded);
  video.addEventListener('ended', onEnded);
  video.addEventListener('timeupdate', onTimeUpdate);
  if (video.readyState >= 2) onLoaded();

  void video.play().catch(() => undefined);

  return () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    video.removeEventListener('loadeddata', onLoaded);
    video.removeEventListener('ended', onEnded);
    video.removeEventListener('timeupdate', onTimeUpdate);
    video.pause();
    video.removeAttribute('src');
    video.load();
  };
}

function resolveAssetUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('blob:')) {
    return pathOrUrl;
  }

  return chrome.runtime.getURL(pathOrUrl.replace(/^\//, ''));
}

function appendPetImage(overlay: HTMLElement, petMeta: PetMeta, language: Lang) {
  if (!petMeta.image) return;
  const imageWrap = document.createElement('figure');
  imageWrap.className = 'mishooPetImageWrap';
  const image = document.createElement('img');
  image.src = resolveAssetUrl(petMeta.image);
  image.alt = petMeta.name[language];
  image.draggable = false;
  imageWrap.append(image);
  overlay.append(imageWrap);
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

  const cleanupPet = petMeta.video
    ? appendKeyedPetVideo(overlay, petMeta)
    : (() => {
      appendPetImage(overlay, petMeta, language);
      return () => undefined;
    })();

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
    cleanupPet?.();
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
