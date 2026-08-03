# Mishoo 幼年金毛桌宠素材 Prompt 清单

更新日期：2026-08-03

## 使用原则

这套素材用于重新搭建 Mishoo Windows 桌面宠物。角色统一为“幼年金毛”，每次只生成一个动作视频，禁止把多个动作混到同一条视频里。后续程序负责窗口移动、缩放、贴边、点击交互和状态切换，AI 视频只负责角色本身的动作循环或短动作。

建议全部使用图生视频 / 首帧参考模式。先生成一张固定角色参考图，再用同一张图作为所有视频的唯一视觉依据。

通用技术要求：

- 画面比例：1:1。
- 分辨率：1024x1024。
- 时长：循环动作 3-4 秒，短交互动作 1.5-2.5 秒。
- 帧率：24fps。
- 背景：纯蓝幕 `#0047FF`，均匀无渐变。
- 单个主体：只有一只幼年金毛。
- 禁止文字、字幕、数字、Logo、水印、UI、边框。
- 主体必须完整，不能裁切耳朵、爪子、尾巴。
- 不要真实地跨屏移动；需要移动的动作都在原地循环，屏幕位置由代码控制。

通用 Negative Prompt：

> text, subtitle, watermark, logo, numbers, UI, border, extra objects, second animal, human hands, collar text, clothes, accessories, changing breed, adult dog, redesign, different face, different fur pattern, camera movement, zoom, shake, changing background, floor shadow, reflection, green screen, motion blur, flicker, ghosting, duplicated limbs, broken paws, distorted face, cropped ears, cropped tail, cropped paws, body drifting, scale changing, multiple actions in one clip.

## 00 角色参考图

文件建议：`golden-puppy-reference.png`

用途：所有视频的唯一参考图。先确认这张图，再进入视频生成。

Prompt：

> Create a clean full-body reference image of one juvenile golden retriever puppy for a desktop pet. The puppy is cute, small, soft golden fur, round friendly face, floppy ears, dark warm eyes, tiny paws, fluffy tail, sitting naturally and facing front. Keep the whole body visible with generous transparent-safe margin around the subject. Use a simple high-quality semi-realistic 3D / soft illustration style suitable for a desktop pet. No collar, no clothes, no accessories, no text, no logo, no watermark, no extra object. Perfectly uniform solid blue background #0047FF, no floor, no shadow, no reflection. 1024x1024.

## 01 正面待机循环

文件建议：`golden-puppy-idle-front.webm`

用途：默认桌宠、暂停状态、普通待机。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1: same face, eyes, ears, fur color, body shape, proportions, tail, paws, lighting, and style. The puppy sits facing front and performs a subtle seamless idle loop: gentle breathing, tiny blink, very slight ear movement. The body stays in the same position and scale. The first and last frames must match in pose and velocity for a seamless loop. No walking, no jumping, no head turn, no second action. Locked camera, no zoom, no shake. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

## 02 向右走原地循环

文件建议：`golden-puppy-walk-right.webm`

用途：桌宠向右水平巡逻。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces right and performs a natural lightweight walk cycle in place. Paws alternate clearly, tail has a small soft sway, body has a gentle walking bounce. The puppy must not travel across the canvas; it walks in place only. The first and last frames must match in pose and velocity for a seamless loop. No jumping, no sitting, no turning around, no second action. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

## 03 向左走原地循环

文件建议：`golden-puppy-walk-left.webm`

用途：桌宠向左水平巡逻。建议单独生成，不要简单镜像，以免毛发和光影看起来假。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces left and performs a natural lightweight walk cycle in place. Paws alternate clearly, tail has a small soft sway, body has a gentle walking bounce. The puppy must not travel across the canvas; it walks in place only. The first and last frames must match in pose and velocity for a seamless loop. No jumping, no sitting, no turning around, no second action. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

## 04 左边缘反向短动作

文件建议：`golden-puppy-turn-left-to-right.webm`

用途：桌宠碰到左屏幕边缘后，从面向左切到面向右。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy starts facing left, notices the edge, then gently turns its head and body to face right. The action is small, cute, and stable, like a desktop pet changing patrol direction. Keep the puppy centered in the canvas; do not make it walk away. End with the puppy clearly facing right and holding still for 0.4 seconds. No jumping, no sitting, no extra gesture, no second action. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 1.5-2 seconds, 24fps, 1024x1024.

## 05 右边缘反向短动作

文件建议：`golden-puppy-turn-right-to-left.webm`

用途：桌宠碰到右屏幕边缘后，从面向右切到面向左。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy starts facing right, notices the edge, then gently turns its head and body to face left. The action is small, cute, and stable, like a desktop pet changing patrol direction. Keep the puppy centered in the canvas; do not make it walk away. End with the puppy clearly facing left and holding still for 0.4 seconds. No jumping, no sitting, no extra gesture, no second action. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 1.5-2 seconds, 24fps, 1024x1024.

## 06 点击轻微跳动

文件建议：`golden-puppy-click-jump.webm`

用途：用户左键点击桌宠。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces front, does one small happy hop in place, lands softly, and returns to the original front-facing pose. Keep the motion gentle and lightweight, suitable for a desktop pet click reaction. Do not move across the canvas. No spinning, no barking text, no second action. The first and final pose should be visually close so the clip can return to idle smoothly. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 1.5-2 seconds, 24fps, 1024x1024.

## 07 压扁回弹

文件建议：`golden-puppy-squash-bounce.webm`

用途：点击交互第二种动作。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces front and performs one soft cartoon-like squash-and-bounce reaction: slightly compress downward, cheeks and body gently squish, then rebound back to the original shape. Keep it cute and subtle, not exaggerated. The puppy remains centered and complete. No jumping away, no spinning, no second action. Final pose returns close to the original idle pose. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 1.5-2 seconds, 24fps, 1024x1024.

## 08 左右抖动

文件建议：`golden-puppy-shake.webm`

用途：点击交互第三种动作。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces front and performs one playful left-right wiggle in place: head, ears, and body gently shake side to side, then return to the original front-facing pose. Keep the action small, clean, and readable. No walking, no jumping, no sitting, no second action. Final pose returns close to the idle pose. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 1.5-2 seconds, 24fps, 1024x1024.

## 09 专注开始表情

文件建议：`golden-puppy-focus-start.webm`

用途：番茄计时开始时的状态切换。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces front, becomes slightly attentive, lifts its head a little, blinks once, and holds a focused but gentle expression. The body remains mostly still. No walking, no jumping, no second action. Final pose should be stable and suitable to transition into idle. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 1.5-2 seconds, 24fps, 1024x1024.

## 10 暂停 / 疲惫待机

文件建议：`golden-puppy-pause-tired.webm`

用途：暂停计时、用户久坐时的轻状态。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces front and slowly relaxes into a slightly sleepy/tired idle pose, with a soft blink and tiny head dip. Keep it cute and gentle, not sad. The movement is subtle and stable. No lying down, no walking, no second action. Final pose holds still for 0.5 seconds. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 2-3 seconds, 24fps, 1024x1024.

## 11 休息开始趴下

文件建议：`golden-puppy-rest-lie-down.webm`

用途：工作结束进入短休或长休。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy starts facing front in a sitting pose, then gently lies down in place and rests its head on its front paws. The motion is calm, slow, and readable. Keep the full body visible and centered. No walking across the canvas, no rolling, no second action. End with the puppy lying down and breathing softly. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

## 12 休息趴着循环

文件建议：`golden-puppy-rest-loop.webm`

用途：短休/长休持续播放。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy lies down facing front with its head resting on its front paws and performs a seamless calm resting loop: gentle breathing, tiny blink, slight ear movement. The first and last frames must match in pose and velocity. No standing up, no walking, no rolling, no second action. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

## 13 喝水提醒

文件建议：`golden-puppy-water-reminder.webm`

用途：60 分钟喝水提醒。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces front and makes one gentle reminder gesture: perks up, tilts its head slightly, and raises one paw a little as if politely asking for attention. Do not add a cup, bottle, icon, text, or any object. Keep the body centered and complete. No walking, no jumping, no second action. End close to the front idle pose. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 2-3 seconds, 24fps, 1024x1024.

## 14 久坐提醒

文件建议：`golden-puppy-posture-reminder.webm`

用途：连续 45 分钟久坐休息提醒。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces front, stretches gently in place like a small puppy waking up, then returns to a stable front-facing pose. Keep it subtle and cute, suitable for a posture break reminder. Do not add props, text, or second action. No walking across the canvas. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 2-3 seconds, 24fps, 1024x1024.

## 15 开心完成

文件建议：`golden-puppy-break-complete.webm`

用途：休息结束或完成一轮番茄钟。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces front and performs one happy but small celebration: bright expression, tiny tail wag, one soft bounce of excitement, then returns to a stable front-facing pose. Keep it gentle and not too energetic. No confetti, no text, no props, no second animal, no second action. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 2-3 seconds, 24fps, 1024x1024.

## 16 菜单 / 设置待机

文件建议：`golden-puppy-menu-idle.webm`

用途：右键菜单、设置、待办面板打开时，让桌宠停下并保持友好表情。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy sits facing front and looks calm and friendly, with only subtle breathing and a tiny blink. It should feel like it is patiently waiting while a menu is open. The first and last frames must match for a seamless loop. No walking, no jumping, no paw wave, no second action. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

## 17 拖拽悬空

文件建议：`golden-puppy-drag-hold.webm`

用途：用户拖拽桌宠时的状态。

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces front and appears gently lifted, with paws slightly tucked and ears softly floating, as if being picked up very carefully. The motion is a small seamless hover loop with subtle breathing. Do not add human hands, leash, collar, props, or text. Keep the puppy centered and complete. The first and last frames must match for a seamless loop. Locked camera. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

## 浏览器四边扩展动作

下面四条不是桌面宠物 v1 必需，但如果 Mishoo 要做“依附浏览器上/下/左/右边缘”的高级模式，需要单独生成。

### 18 底边向右走

文件建议：`golden-puppy-bottom-walk-right.webm`

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces right and performs a seamless walk cycle in place designed to sit visually on the bottom edge of a browser window. Paws should move clearly, body bounce gently, tail sway softly. Do not move across the canvas. No jumping, no turning, no second action. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

### 19 底边向左走

文件建议：`golden-puppy-bottom-walk-left.webm`

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy faces left and performs a seamless walk cycle in place designed to sit visually on the bottom edge of a browser window. Paws should move clearly, body bounce gently, tail sway softly. Do not move across the canvas. No jumping, no turning, no second action. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

### 20 左边缘扒窗

文件建议：`golden-puppy-left-edge-peek.webm`

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy is attached to the left edge of the frame, peeking inward as if holding the browser edge with tiny paws. It performs a seamless subtle idle loop: tiny paw movement, blink, and gentle breathing. Do not climb across the canvas, do not leave the left edge, no second action. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

### 21 右边缘扒窗

文件建议：`golden-puppy-right-edge-peek.webm`

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy is attached to the right edge of the frame, peeking inward as if holding the browser edge with tiny paws. It performs a seamless subtle idle loop: tiny paw movement, blink, and gentle breathing. Do not climb across the canvas, do not leave the right edge, no second action. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

### 22 顶边倒挂探头

文件建议：`golden-puppy-top-edge-peek.webm`

Prompt：

> Use the uploaded juvenile golden retriever reference image as the only visual source. Preserve the puppy exactly 1:1. The puppy hangs from the top edge of the frame and peeks downward into the browser window, with tiny paws visible near the top edge. It performs a seamless subtle idle loop: blink, small ear movement, gentle breathing. Do not fall, do not move away from the top edge, no second action. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

## 最小可上线素材包

如果先做 v1，不需要一次生成全部 22 条。最小闭环建议：

1. `golden-puppy-reference.png`
2. `golden-puppy-idle-front.webm`
3. `golden-puppy-walk-right.webm`
4. `golden-puppy-walk-left.webm`
5. `golden-puppy-click-jump.webm`
6. `golden-puppy-rest-loop.webm`
7. `golden-puppy-water-reminder.webm`
8. `golden-puppy-posture-reminder.webm`

后续再补齐 turn、squash、shake、focus、drag、browser-edge 等高级动作。
