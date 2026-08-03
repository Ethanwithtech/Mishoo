import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock3, Coffee, Download, Globe2, Heart, HelpCircle, LogIn, PawPrint, Play, Shield, Sparkles, UploadCloud, X } from 'lucide-react';
import { DesktopPet } from './DesktopPet';

type PetId = 'mishoo-cat' | 'cocoa-dog' | 'snow-rabbit' | 'pom-puppy' | 'lop-rabbit' | 'bamboo-panda';
type Lang = 'zh' | 'en';
type PetActivityMode = 'calm' | 'patrol';

/** Prefixes static asset paths with the app's base URL so builds deployed
 * under a subpath (e.g. /mishoo/) still resolve images/videos/downloads. */
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

type Settings = {
  workMinutes: number;
  breakMinutes: number;
  pet: PetId;
  strictMode: boolean;
  language: Lang;
  petActivity: PetActivityMode;
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
  /** 视频是否已经带可靠透明通道；当前内置素材大多是纯色幕布源视频，需要实时抠像。 */
  hasAlpha?: boolean;
  /** 运行时抠像颜色。竹子是绿色，所以熊猫视频使用蓝/青蓝幕，避免竹子被抠掉。 */
  chromaKey?: 'green' | 'blue';
  /** 进场动作播放完、动物已经躺好开始休息的时间点（秒）。从这里开始 loop。 */
  restLoopStart?: number;
  credit: string;
};

const PETS: Record<PetId, PetMeta> = {
  'mishoo-cat': {
    name: { zh: '真实小猫 Mia', en: 'Mia the Real Cat' },
    description: { zh: '一只会认真挡住屏幕的三花小猫', en: 'A real calico cat who gently blocks your screen' },
    image: asset('/images/pets/video-covers/mia.webp'),
    video: asset('/videos/mia-source.webm'),
    restLoopStart: 5,
    credit: 'AI-generated green-screen test video, chroma-keyed in browser',
  },
  'cocoa-dog': {
    name: { zh: '金毛 Cocoa', en: 'Cocoa the Golden Retriever' },
    description: { zh: '会走到屏幕前躺下的金毛休息搭子', en: 'A golden retriever that walks in and lies down on your screen' },
    image: asset('/images/pets/video-covers/cocoa.webp'),
    video: asset('/videos/golden-source.webm'),
    restLoopStart: 4,
    credit: 'AI-generated green-screen test video, chroma-keyed in browser',
  },
  'snow-rabbit': {
    name: { zh: '萨摩耶 Snow', en: 'Snow the Samoyed' },
    description: { zh: '会趴在网页前的白色萨摩耶', en: 'A fluffy Samoyed that rests in front of your webpage' },
    image: asset('/images/pets/video-covers/snow.webp'),
    video: asset('/videos/samoyed-source.webm'),
    restLoopStart: 1,
    credit: 'AI-generated green-screen test video, chroma-keyed in browser',
  },
  'pom-puppy': {
    name: { zh: '博美 Mochi', en: 'Mochi the Pomeranian' },
    description: { zh: '小小一团趴在网页前的白色博美', en: 'A tiny white Pomeranian puppy resting in front of your webpage' },
    image: asset('/images/pets/video-covers/mochi.webp'),
    video: asset('/videos/pomeranian-source.webm'),
    restLoopStart: 4,
    credit: 'AI-generated green-screen test video, chroma-keyed in browser',
  },
  'lop-rabbit': {
    name: { zh: '垂耳兔 Mocha', en: 'Mocha the Lop Rabbit' },
    description: { zh: '安静趴在网页前的垂耳兔', en: 'A calm lop-eared rabbit resting in front of your webpage' },
    image: asset('/images/pets/video-covers/mocha.webp'),
    video: asset('/videos/lop-rabbit-source.webm'),
    restLoopStart: 4,
    credit: 'AI-generated green-screen test video, chroma-keyed in browser',
  },
  'bamboo-panda': {
    name: { zh: '竹子熊猫 BaoBao', en: 'BaoBao the Bamboo Panda' },
    description: { zh: '抱着竹子从屏幕下方爬出来的可爱熊猫', en: 'A cute panda climbing up with bamboo and sitting down to snack' },
    image: asset('/images/pets/video-covers/baobao.webp'),
    video: asset('/videos/panda-bamboo-source.webm'),
    hasAlpha: true,
    restLoopStart: 6,
    credit: 'AI-generated panda video, pre-matted to transparent WebM so bamboo stays green and the source watermark is removed',
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
    petMotion: '桌宠专注时动作',
    calmRest: '安静休息（推荐）',
    gentlePatrol: '轻柔巡逻',
    petMotionHint: '暂停计时后，桌宠始终停止移动并播放休息动作。',
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
    petMotion: 'Desktop pet motion',
    calmRest: 'Calm rest (recommended)',
    gentlePatrol: 'Gentle patrol while focusing',
    petMotionHint: 'Pausing the timer always stops movement and plays the rest animation.',
  },
};


type StudioCopy = {
  title: string;
  subtitle: string;
  uploadTitle: string;
  uploadHint: string;
  uploadButton: string;
  localOnly: string;
  promptTitle: string;
  promptIntro: string;
  prompt: string;
  promptTips: string[];
  directionPromptTitle: string;
  directionPromptIntro: string;
  flowTitle: string;
  flowItems: string[];
  websiteTitle: string;
  websiteText: string;
};

const CUSTOM_STUDIO_COPY: Record<Lang, StudioCopy> = {
  zh: {
    title: '自定义动物工作台',
    subtitle: '以后用户可以把自家猫猫狗狗、熊猫、龙猫、甚至老板家的鹦鹉上传进来，生成专属休息守护兽。',
    uploadTitle: '上传动物视频',
    uploadHint: '建议上传 5-12 秒、动物全身清晰、动作从屏幕边缘进入并停在中间的视频。当前这里先做本地预览；商业版需要接云端抠像和账号系统。',
    uploadButton: '选择一个视频文件',
    localOnly: '已加载本地预览。下一步接入云端后，会自动抠背景、压缩成透明 WebM，并同步到插件。',
    promptTitle: '单动作视频 Prompt',
    promptIntro: '每次只生成一个动作视频。不要把多个朝向或多个边缘动作塞进同一段视频；在下方选择动作后复制完整 Prompt。',
    prompt: '动作视频必须使用图生视频/首帧参考模式。每个视频只包含一个动作，开头短暂停留，执行动作后稳定定格或形成无跳帧循环；禁止在同一视频里切换多个方向。',
    promptTips: [
      '不要让 AI 加字！Prompt 里一定写“不要文字、不要水印、不要字幕”。',
      '动物拿竹子、树叶、草地这种绿色道具时，背景别用绿幕，用蓝幕或紫幕。',
      '商业版最好让用户上传原视频后，服务器统一生成透明 WebM，插件只负责播放。',
    ],
    directionPromptTitle: '选择本次唯一动作',
    directionPromptIntro: '头部方向和浏览器四边动作已拆开。一次只生成当前选择的一条 3–4 秒视频，再逐条校准和抠像。',
    flowTitle: '商业版推荐流程',
    flowItems: ['用户登录网站', '上传/生成动物视频', '云端抠像去水印', '保存到个人素材库', '插件登录后自动同步'],
    websiteTitle: '插件能不能直接登录上传？',
    websiteText: '能，但不建议只靠插件承接。插件适合“播放和同步”，网站适合“注册、付费、上传、处理、素材管理”。最终商业化最好做一个 HTML 网站/后台作为主阵地，插件作为浏览器里的展示端。',
  },
  en: {
    title: 'Custom animal studio',
    subtitle: 'Let users upload their own cats, dogs, pandas, chinchillas, or any mascot and turn it into a personal break guardian.',
    uploadTitle: 'Upload an animal video',
    uploadHint: 'Best with a 5-12 second clip where the full animal is clear, enters from the screen edge, and settles near the center. This is local preview only for now; the commercial version needs cloud matting and accounts.',
    uploadButton: 'Choose a video file',
    localOnly: 'Local preview loaded. With the cloud pipeline, Mishoo will remove the background, compress to transparent WebM, and sync it to the extension.',
    promptTitle: 'One-action video prompt',
    promptIntro: 'Generate one action per video. Never combine multiple directions or edge behaviors in one clip; choose an action below and copy its complete prompt.',
    prompt: 'Use image-to-video / first-frame reference mode. Each clip contains exactly one action: briefly hold the source pose, perform the action, then hold the final pose or form a seamless loop. Never switch between several directions in the same clip.',
    promptTips: [
      'Always ask for no text, no watermark, and no subtitles.',
      'If props are green, such as bamboo or leaves, use blue/purple screen instead of green screen.',
      'For a commercial product, upload raw video to the server, output transparent WebM, and let the extension only play it.',
    ],
    directionPromptTitle: 'Choose the only action in this clip',
    directionPromptIntro: 'Head directions and browser-edge behaviors are separated. Generate one 3–4 second clip at a time, then calibrate and key it independently.',
    flowTitle: 'Recommended commercial flow',
    flowItems: ['User signs in on the website', 'Uploads or generates an animal clip', 'Cloud removes background/watermark', 'Asset is saved to user library', 'Extension syncs after sign-in'],
    websiteTitle: 'Can the extension handle login and upload?',
    websiteText: 'Yes, but it should not be the only entry point. The extension is best for playback and sync; the website is best for signup, payment, uploads, processing, and asset management.',
  },
};

type PromptActionId =
  | 'frontIdle'
  | 'lookUp'
  | 'lookUpRight'
  | 'lookRight'
  | 'lookDownRight'
  | 'lookDown'
  | 'lookDownLeft'
  | 'lookLeft'
  | 'lookUpLeft'
  | 'bottomWalkRight'
  | 'bottomWalkLeft'
  | 'leftEdgeClimb'
  | 'rightEdgeClimb'
  | 'topEdgePeek';

type PromptAction = {
  id: PromptActionId;
  kind: 'head' | 'edge';
  label: Record<Lang, string>;
  action: Record<Lang, string>;
};

const PROMPT_ACTIONS: PromptAction[] = [
  { id: 'frontIdle', kind: 'head', label: { zh: '正面待机', en: 'Front idle' }, action: { zh: '头部保持正面，只做一次非常轻微、自然的眨眼和呼吸待机，不看向其他方向', en: 'keep the head facing front and perform only a very subtle natural blink-and-breathe idle, without looking in any other direction' } },
  { id: 'lookUp', kind: 'head', label: { zh: '抬头 / 向上看', en: 'Look up' }, action: { zh: '头部从正面缓慢转向正上方并保持，视线明确向上', en: 'slowly turn the head from front to look straight up, then hold with the gaze clearly upward' } },
  { id: 'lookUpRight', kind: 'head', label: { zh: '向右上看', en: 'Look upper-right' }, action: { zh: '头部从正面缓慢转向右上方并保持，视线明确指向右上', en: 'slowly turn the head from front to the upper-right, then hold with the gaze clearly upper-right' } },
  { id: 'lookRight', kind: 'head', label: { zh: '向右看', en: 'Look right' }, action: { zh: '头部从正面缓慢转向正右方并保持，视线明确向右', en: 'slowly turn the head from front to look directly right, then hold with the gaze clearly right' } },
  { id: 'lookDownRight', kind: 'head', label: { zh: '向右下看', en: 'Look lower-right' }, action: { zh: '头部从正面缓慢转向右下方并保持，视线明确指向右下', en: 'slowly turn the head from front to the lower-right, then hold with the gaze clearly lower-right' } },
  { id: 'lookDown', kind: 'head', label: { zh: '低头 / 向下看', en: 'Look down' }, action: { zh: '头部从正面缓慢转向正下方并保持，视线明确向下', en: 'slowly turn the head from front to look straight down, then hold with the gaze clearly downward' } },
  { id: 'lookDownLeft', kind: 'head', label: { zh: '向左下看', en: 'Look lower-left' }, action: { zh: '头部从正面缓慢转向左下方并保持，视线明确指向左下', en: 'slowly turn the head from front to the lower-left, then hold with the gaze clearly lower-left' } },
  { id: 'lookLeft', kind: 'head', label: { zh: '向左看', en: 'Look left' }, action: { zh: '头部从正面缓慢转向正左方并保持，视线明确向左', en: 'slowly turn the head from front to look directly left, then hold with the gaze clearly left' } },
  { id: 'lookUpLeft', kind: 'head', label: { zh: '向左上看', en: 'Look upper-left' }, action: { zh: '头部从正面缓慢转向左上方并保持，视线明确指向左上', en: 'slowly turn the head from front to the upper-left, then hold with the gaze clearly upper-left' } },
  { id: 'bottomWalkRight', kind: 'edge', label: { zh: '底边：原地向右走循环', en: 'Bottom: walk-right loop' }, action: { zh: '角色面向右侧，在原地完成自然轻量的走路循环，脚步首尾无跳变；不要在画面中横向位移', en: 'face right and perform a natural lightweight walk cycle in place with a seamless first and last frame; do not travel across the canvas' } },
  { id: 'bottomWalkLeft', kind: 'edge', label: { zh: '底边：原地向左走循环', en: 'Bottom: walk-left loop' }, action: { zh: '角色面向左侧，在原地完成自然轻量的走路循环，脚步首尾无跳变；不要在画面中横向位移', en: 'face left and perform a natural lightweight walk cycle in place with a seamless first and last frame; do not travel across the canvas' } },
  { id: 'leftEdgeClimb', kind: 'edge', label: { zh: '左边：贴边向上爬循环', en: 'Left edge: climb loop' }, action: { zh: '角色身体贴住画面左边缘，在原地完成向上攀爬循环，手脚交替且首尾无跳变；不要实际向上位移', en: 'cling to the left edge and perform an upward climbing cycle in place, alternating limbs with a seamless first and last frame; do not actually travel upward' } },
  { id: 'rightEdgeClimb', kind: 'edge', label: { zh: '右边：贴边向上爬循环', en: 'Right edge: climb loop' }, action: { zh: '角色身体贴住画面右边缘，在原地完成向上攀爬循环，手脚交替且首尾无跳变；不要实际向上位移', en: 'cling to the right edge and perform an upward climbing cycle in place, alternating limbs with a seamless first and last frame; do not actually travel upward' } },
  { id: 'topEdgePeek', kind: 'edge', label: { zh: '顶边：倒挂探头待机', en: 'Top edge: hanging peek idle' }, action: { zh: '角色固定依附在画面顶边，从上方自然探头向下看，只做轻微眨眼和呼吸待机，不离开顶边', en: 'remain attached to the top edge, naturally peek downward from above, and perform only a subtle blink-and-breathe idle without leaving the top edge' } },
];

function buildSingleActionPrompt(language: Lang, actionId: PromptActionId) {
  const item = PROMPT_ACTIONS.find((action) => action.id === actionId) ?? PROMPT_ACTIONS[0];
  if (language === 'zh') {
    const motionLock = item.kind === 'head'
      ? '角色身体、肩膀、手、竹子和颈部以下区域完全固定，只允许头部和眼睛执行指定动作。主体位置、尺寸和身体轮廓全程不变。'
      : '只执行指定的单一循环动作，不添加跳跃、转头、挥手、坐下或其他第二动作。角色应保持在画面中心安全区内，避免裁切。';
    const timing = item.kind === 'head'
      ? '开头保持参考姿势 0.5 秒，然后只执行本动作；在最终姿态稳定停留至少 1.2 秒，并且不要返回起始姿势。'
      : '从第一帧开始执行循环动作，动作节奏均匀，第一帧与最后一帧姿势和速度连续，形成无跳变循环。';
    return `严格使用我上传的参考图片作为唯一视觉依据，1:1 保留角色原有脸型、五官、眼睛、耳朵、毛发颜色、白色/灰色/黑色区域、竹子、身体轮廓、比例、材质、光线和画风。禁止重新设计、美化、换装、增加或删除元素。本视频只能生成一个动作：${item.action.zh}。${motionLock}固定相机、固定焦距、无镜头移动、无缩放、无抖动。${timing}背景为完全均匀的纯蓝色 #0047FF，无渐变、纹理、地面、阴影或反光。禁止文字、字幕、数字、Logo、水印、UI、边框和额外物体。单个角色，3–4 秒，24fps，1024×1024，清晰稳定，无闪烁、鬼影、运动模糊或肢体变形。`;
  }
  const motionLock = item.kind === 'head'
    ? 'Lock the body, shoulders, hands, bamboo, and everything below the neck completely. Only the head and eyes may perform the requested action. Keep the subject position, scale, and body silhouette unchanged.'
    : 'Perform only the requested single loop. Do not add jumping, head turns, waving, sitting, or any second action. Keep the character inside the safe center area with no cropping.';
  const timing = item.kind === 'head'
    ? 'Hold the reference pose for 0.5 seconds, then perform only this action. Hold the final pose for at least 1.2 seconds and do not return to the start pose.'
    : 'Run the loop from the first frame at an even rhythm. The first and last frames must match in pose and velocity to create a seamless loop.';
  return `Use the uploaded reference image as the only visual source. Preserve the character exactly 1:1: identical face, facial features, eyes, ears, fur colors, every white/gray/black region, bamboo, silhouette, proportions, material, lighting, and art style. No redesign, beautification, costume change, added or removed elements. This video contains exactly one action: ${item.action.en}. ${motionLock} Locked camera and focal length; no camera movement, zoom, or shake. ${timing} Perfectly uniform solid blue background #0047FF with no gradient, texture, floor, shadow, or reflection. No text, captions, numbers, logo, watermark, UI, border, or extra object. One character, 3–4 seconds, 24 fps, 1024×1024, clean and stable, no flicker, ghosting, motion blur, or limb deformation.`;
}


type DownloadCopy = {
  title: string;
  subtitle: string;
  windows: string;
  windowsHint: string;
  chrome: string;
  edge: string;
  firefox: string;
  safari: string;
  safariHint: string;
  login: string;
  uploadAnimal: string;
  installTitle: string;
  installSteps: string[];
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
  loginTitle: string;
  loginText: string;
};

const DOWNLOAD_COPY: Record<Lang, DownloadCopy> = {
  zh: {
    title: '下载 Mishoo',
    subtitle: 'Windows 桌宠和 Chrome、Edge、Firefox 插件都已接入。桌宠常驻桌面陪你专注，插件负责在网页里准点劝你休息。',
    windows: 'Windows 桌宠',
    windowsHint: '单文件 EXE · 双击运行',
    chrome: 'Chrome 下载',
    edge: 'Edge 下载',
    firefox: 'Firefox 下载',
    safari: 'Safari / macOS 即将支持',
    safariHint: 'Safari 需要单独走 Apple / Xcode 打包流程，等我们把苹果那套“优雅但磨人”的流程驯服。',
    login: '登录入口',
    uploadAnimal: '上传我的动物',
    installTitle: '安装教程',
    installSteps: [
      'Windows 桌宠：下载 EXE 后直接双击运行，无需安装 Python 或其他依赖。首次运行可能出现 SmartScreen 提示，这是测试版尚未购买代码签名证书。',
      '下载对应浏览器的插件压缩包，并解压到一个你找得到的文件夹。',
      'Chrome / Edge 打开扩展管理页，开启“开发者模式”。',
      '点击“加载已解压的扩展程序”，选择刚刚解压出来的插件文件夹。',
      'Firefox 打开 about:debugging，选择“此 Firefox”，点击“临时载入附加组件”。正式上架后会改成商店一键安装。',
      '装好后打开任意普通网页，点 Mishoo 图标，选择动物，开始摸鱼——啊不是，开始健康休息。',
    ],
    faqTitle: '常见问题',
    faqs: [
      { q: '它能在所有网页上用吗？', a: '大部分 http/https 网页都可以。浏览器商店页、部分系统页、隐私限制很强的页面可能不让插件插入内容。' },
      { q: '为什么现在还要开发者模式安装？', a: '这是测试分发包。商业版正式发布后，会放到 Chrome Web Store、Edge Add-ons、Firefox Add-ons 等商店。' },
      { q: '上传动物现在会真的传到服务器吗？', a: '当前页面先做本地预览和流程演示，不会上传。商业版会接登录、云端抠像、素材库和插件同步。' },
      { q: 'Safari 为什么不是一个 zip？', a: 'Safari 扩展通常需要 macOS App / Xcode 包装，分发方式和 Chrome 系不一样，所以我们先标成即将支持。' },
    ],
    loginTitle: '账号登录入口',
    loginText: '商业版这里会接注册、登录、会员订阅和素材同步。现在先放入口，免得产品长大后找不到家门。',
  },
  en: {
    title: 'Download Mishoo',
    subtitle: 'The Windows desktop pet and Chrome, Edge, and Firefox extensions are ready. Keep your pet on the desktop and let it remind you to rest across webpages.',
    windows: 'Windows desktop pet',
    windowsHint: 'Single EXE · Double-click to run',
    chrome: 'Download for Chrome',
    edge: 'Download for Edge',
    firefox: 'Download for Firefox',
    safari: 'Safari / macOS coming soon',
    safariHint: 'Safari requires Apple/Xcode-specific packaging, so it has a separate release track.',
    login: 'Sign in',
    uploadAnimal: 'Upload my animal',
    installTitle: 'Install guide',
    installSteps: [
      'Windows desktop pet: download the EXE and double-click it. No Python or extra dependency is required. The unsigned test build may trigger a SmartScreen notice.',
      'Download the package for your browser and unzip it into a folder you can find later.',
      'For Chrome / Edge, open the extensions page and enable Developer mode.',
      'Click “Load unpacked” and choose the unzipped extension folder.',
      'For Firefox, open about:debugging, choose “This Firefox”, and temporarily load the add-on. Store installation will come later.',
      'Open any normal webpage, click the Mishoo icon, choose a pet, and start resting like a responsible human.',
    ],
    faqTitle: 'FAQ',
    faqs: [
      { q: 'Does it work on every page?', a: 'It works on most normal http/https pages. Browser store pages, system pages, and restricted pages may block extensions.' },
      { q: 'Why developer mode for now?', a: 'These are testing packages. The commercial release should go through official browser extension stores.' },
      { q: 'Does upload send my video to a server today?', a: 'Not yet. The current upload area is a local preview and product demo. The commercial version will add cloud processing and sync.' },
      { q: 'Why no Safari zip?', a: 'Safari extensions usually need a macOS app/Xcode wrapper, so the release path is different from Chromium browsers.' },
    ],
    loginTitle: 'Account entrance',
    loginText: 'The commercial version will connect sign-in, subscriptions, and custom animal sync here. This placeholder keeps the product structure ready.',
  },
};

const DEFAULT_SETTINGS: Settings = {
  workMinutes: 25,
  breakMinutes: 5,
  pet: 'cocoa-dog',
  strictMode: true,
  language: 'en',
  petActivity: 'calm',
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

function ChromaKeyPet({
  src,
  restLoopStart,
  hasAlpha = false,
  chromaKey = 'green',
}: {
  src: string;
  restLoopStart?: number;
  hasAlpha?: boolean;
  chromaKey?: 'green' | 'blue';
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const isAlphaVideo = hasAlpha;

  useEffect(() => {
    if (!isAlphaVideo) return undefined;
    const video = videoRef.current;
    if (!video) return undefined;

    let hasFinishedIntro = false;
    const loopFromRestPose = () => {
      const start = typeof restLoopStart === 'number' ? restLoopStart : 0;
      const dur = video.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;
      hasFinishedIntro = true;
      try {
        video.currentTime = Math.max(0, Math.min(start, dur - 0.05));
      } catch {
        /* noop */
      }
    };

    const onLoaded = () => {
      void video.play().catch(() => undefined);
    };
    const onEnded = () => {
      loopFromRestPose();
      void video.play().catch(() => undefined);
    };
    const onTimeUpdate = () => {
      const dur = video.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;
      if (video.currentTime >= dur - 0.1) {
        if (!hasFinishedIntro || restLoopStart) loopFromRestPose();
      }
    };

    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    if (video.readyState >= 2) onLoaded();

    return () => {
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [isAlphaVideo, restLoopStart, src]);

  useEffect(() => {
    if (isAlphaVideo) return undefined;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

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

    const draw = (now = performance.now()) => {
      if (!running) return;
      if (video.readyState >= 2 && video.videoWidth && now - lastFrameAt >= targetFrameMs) {
        setupCanvas();
        lastFrameAt = now;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          // 保留源视频已有 alpha，避免透明 WebM 被二次处理成黑底。
          if (a <= 4) continue;

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (chromaKey === 'blue') {
            // 熊猫抱竹子：不能用绿幕抠像，否则绿色竹子会被误删。
            // 这条素材背景是偏灰蓝/青蓝色，因此用“蓝色/青蓝幕”条件，而不是纯 #0047ff 距离。
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
              // 去掉边缘蓝/青蓝残色，但保留竹子的绿色。
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

          // Despill：把绿色压回红/蓝的平均水平。
          // 之前用 max(r, b) 作下限，对浅色毛发无效——绿幕反光的像素
          // (如 rgb(215,222,168)) 红色本身就很高，钳位后几乎不变，绿膜留了下来。
          // 改用 (r + b) / 2 作参考，浅色区域的绿色偏色才能真正被消除。
          const spillLimit = (r + b) / 2 + 6;
          if (g > spillLimit) {
            data[i + 1] = Math.round(g - (g - spillLimit) * 0.9);
          }
        }
        ctx.putImageData(frame, 0, 0);
      }
      rafId = requestAnimationFrame(draw);
    };

    const onLoaded = () => {
      setupCanvas();
      void video.play().catch(() => undefined);
      if (rafId === 0) rafId = requestAnimationFrame(draw);
    };

    // 进场动作只播一次，之后只 loop 已经躺好的尾部片段
    const onEnded = () => {
      const start = typeof restLoopStart === 'number' ? restLoopStart : 0;
      hasFinishedIntro = true;
      try {
        video.currentTime = Math.max(0, Math.min(start, (video.duration || 0) - 0.05));
      } catch {
        // 某些浏览器在 ended 后 set currentTime 可能抛错，忽略
      }
      void video.play().catch(() => undefined);
    };

    // 兜底：有的视频不会触发 ended（loop 时不会触发），用 timeupdate 在接近末尾时手动跳转
    const onTimeUpdate = () => {
      const start = typeof restLoopStart === 'number' ? restLoopStart : 0;
      const dur = video.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;
      if (hasFinishedIntro) {
        if (video.currentTime >= dur - 0.1) {
          try {
            video.currentTime = start;
          } catch {
            /* noop */
          }
        }
      } else if (video.currentTime >= dur - 0.1) {
        hasFinishedIntro = true;
        try {
          video.currentTime = start;
        } catch {
          /* noop */
        }
      }
    };

    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    if (video.readyState >= 2) onLoaded();

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [src, restLoopStart, chromaKey]);

  if (isAlphaVideo) {
    return (
      <video
        ref={videoRef}
        className="breakPetVideoFull"
        src={src}
        autoPlay
        muted
        playsInline
        preload="auto"
      />
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        className="mishooPetSourceVideo"
        src={src}
        autoPlay
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      />
      <canvas ref={canvasRef} className="breakPetVideoFull" />
    </>
  );
}



function DownloadHub({ language }: { language: Lang }) {
  const copy = DOWNLOAD_COPY[language];
  const packages = [
    { label: copy.windows, hint: copy.windowsHint, href: asset('/downloads/Mishoo-0.2.0-Windows-x64.exe'), className: 'windowsDownload', icon: <Download size={22} /> },
    { label: copy.chrome, hint: 'ZIP', href: asset('/downloads/mishoo-chrome-extension.zip'), className: 'chromeDownload', icon: <Download size={22} /> },
    { label: copy.edge, hint: 'ZIP', href: asset('/downloads/mishoo-edge-extension.zip'), className: 'edgeDownload', icon: <Globe2 size={22} /> },
    { label: copy.firefox, hint: 'ZIP', href: asset('/downloads/mishoo-firefox-extension.zip'), className: 'firefoxDownload', icon: <Download size={22} /> },
  ];

  return (
    <section className="downloadHub panel" id="downloads">
      <div className="downloadHero">
        <div>
          <p className="sectionEyebrow">Downloads</p>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <div className="downloadQuickLinks">
          <a className="ghostButton compactButton" href="#login-entry"><LogIn size={17} />{copy.login}</a>
          <a className="primaryButton compactButton" href="#custom-animal-studio"><UploadCloud size={17} />{copy.uploadAnimal}</a>
        </div>
      </div>

      <div className="browserDownloadGrid">
        {packages.map((item) => (
          <a key={item.href} className={`browserDownloadCard ${item.className}`} href={item.href} download>
            {item.icon}
            <strong>{item.label}</strong>
            <span>{item.hint}</span>
          </a>
        ))}
        <div className="browserDownloadCard safariComingSoon">
          <Globe2 size={22} />
          <strong>{copy.safari}</strong>
          <span>{copy.safariHint}</span>
        </div>
      </div>

      <div className="downloadInfoGrid">
        <article className="installGuide">
          <h3><BookOpen size={20} /> {copy.installTitle}</h3>
          <ol>
            {copy.installSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
        <article className="faqPanel">
          <h3><HelpCircle size={20} /> {copy.faqTitle}</h3>
          <div className="faqList">
            {copy.faqs.map((faq) => (
              <details key={faq.q}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </article>
      </div>

      <article className="loginEntry" id="login-entry">
        <div>
          <h3><LogIn size={20} /> {copy.loginTitle}</h3>
          <p>{copy.loginText}</p>
        </div>
        <button className="ghostButton" type="button" onClick={() => window.alert(language === 'zh' ? '登录系统马上安排，现在先让按钮站岗。' : 'Sign-in is coming soon. The button is holding the place for now.')}>{copy.login}</button>
      </article>
    </section>
  );
}

function CustomAnimalStudio({ language }: { language: Lang }) {
  const copy = CUSTOM_STUDIO_COPY[language];
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [promptAction, setPromptAction] = useState<PromptActionId>('frontIdle');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
  };

  return (
    <section className="customStudio panel" id="custom-animal-studio">
      <div className="customStudioHeader">
        <div>
          <p className="sectionEyebrow">Custom Pet</p>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <div className="studioBadge"><UploadCloud size={22} /> Beta</div>
      </div>

      <div className="studioGrid">
        <article className="uploadCard">
          <h3>{copy.uploadTitle}</h3>
          <p>{copy.uploadHint}</p>
          <label className="uploadDropzone">
            <UploadCloud size={30} />
            <span>{copy.uploadButton}</span>
            <input type="file" accept="video/mp4,video/webm,video/quicktime,video/*" onChange={handleUpload} />
          </label>
          {previewUrl && (
            <div className="uploadPreview">
              <video src={previewUrl} controls playsInline />
              <strong>{fileName}</strong>
              <p>{copy.localOnly}</p>
            </div>
          )}
        </article>

        <article className="promptCard">
          <h3>{copy.promptTitle}</h3>
          <p>{copy.promptIntro}</p>
          <textarea readOnly value={copy.prompt} />
          <ul>
            {copy.promptTips.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
          <div className="directionPromptBlock">
            <h4>{copy.directionPromptTitle}</h4>
            <p>{copy.directionPromptIntro}</p>
            <label className="promptActionField">
              <span>{language === 'zh' ? '本次视频动作' : 'Action in this clip'}</span>
              <select value={promptAction} onChange={(event) => setPromptAction(event.target.value as PromptActionId)}>
                {PROMPT_ACTIONS.map((action) => (
                  <option key={action.id} value={action.id}>{action.label[language]}</option>
                ))}
              </select>
            </label>
            <textarea readOnly value={buildSingleActionPrompt(language, promptAction)} />
            <a className="promptPackLink" href={asset('/docs/mishoo-one-action-video-prompts.md')} target="_blank" rel="noreferrer">
              <BookOpen size={16} /> {language === 'zh' ? '打开完整单动作 Prompt 包' : 'Open the complete one-action prompt pack'}
            </a>
          </div>
        </article>
      </div>

      <div className="commerceFlow">
        <div>
          <h3>{copy.flowTitle}</h3>
          <div className="flowSteps">
            {copy.flowItems.map((item, index) => (
              <div key={item} className="flowStep"><span>{index + 1}</span>{item}</div>
            ))}
          </div>
        </div>
        <div className="websiteAnswer">
          <h3>{copy.websiteTitle}</h3>
          <p>{copy.websiteText}</p>
        </div>
      </div>
    </section>
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
        <ChromaKeyPet
          src={petMeta.video}
          restLoopStart={petMeta.restLoopStart}
          hasAlpha={petMeta.hasAlpha}
          chromaKey={petMeta.chromaKey}
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
          <label className="field">
            <span>{t.petMotion}</span>
            <select value={settings.petActivity} onChange={(event) => setSettings({ ...settings, petActivity: event.target.value as PetActivityMode })}>
              <option value="calm">{t.calmRest}</option>
              <option value="patrol">{t.gentlePatrol}</option>
            </select>
          </label>
          <p className="fieldHint">{t.petMotionHint}</p>
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

      <DownloadHub language={settings.language} />

      <CustomAnimalStudio language={settings.language} />

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

  if (mode === 'pet') {
    return <DesktopPet />;
  }

  return <ControlPanel />;
}
