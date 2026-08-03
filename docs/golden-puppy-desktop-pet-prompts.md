# Mishoo 幼年金毛桌宠 v1 精选 Prompt

更新日期：2026-08-03

这份文件只保留当前阶段真正要生成的素材：1 张参考图 + 5 条视频。先不要生成完整动作库。第一版桌宠重点是跑通“透明桌宠、自动巡逻、点击反馈、休息状态”，其余动作先用程序里的窗口移动、CSS 动效、气泡和提示音解决。

## 生成顺序

1. `golden-puppy-reference.png`：固定真实幼年金毛形象。
2. `golden-puppy-idle-front.webm`：默认待机、暂停、菜单打开时复用。
3. `golden-puppy-walk-right.webm`：向右巡逻。
4. `golden-puppy-walk-left.webm`：向左巡逻。
5. `golden-puppy-click-jump.webm`：左键点击反馈。
6. `golden-puppy-rest-loop.webm`：番茄钟休息、喝水提醒、久坐提醒时复用。

## 通用要求

- 每次只生成一个动作，禁止把多个动作混到同一条视频里。
- 使用图生视频 / 首帧参考模式。
- 视频统一使用同一张 `golden-puppy-reference.png` 作为唯一角色依据。
- 画面比例：1:1。
- 分辨率：1024x1024。
- 视频时长：循环动作 3-4 秒，点击动作 1.5-2 秒。
- 帧率：24fps。
- 背景：纯蓝幕 `#0047FF`，均匀无渐变。
- 单个主体：只有一只真实幼年金毛幼犬。
- 主体必须完整，不能裁切耳朵、爪子、尾巴。
- 不要让角色真实跨屏移动；走路只做原地循环，屏幕位移由程序控制。
- 禁止文字、字幕、数字、Logo、水印、UI、边框。

## 通用 Negative Prompt

> text, subtitle, watermark, logo, numbers, UI, border, extra objects, cartoon, anime, illustration, 3D mascot, toy, plush, doll, fantasy character, plastic texture, fake fur, stylized eyes, oversized mascot head, second animal, human hands, collar text, clothes, accessories, changing breed, adult dog, labrador, poodle, corgi, samoyed, pomeranian, wolf, fox, redesign, different face, different fur pattern, camera movement, zoom, shake, changing background, floor shadow, reflection, green screen, motion blur, flicker, ghosting, duplicated limbs, broken paws, distorted face, cropped ears, cropped tail, cropped paws, body drifting, scale changing, multiple actions in one clip.

## 00 角色参考图

文件建议：`golden-puppy-reference.png`

用途：所有视频的唯一参考图。先确认这张图真实、幼年、金毛特征明确，再进入视频生成。

Prompt：

> Create a photorealistic full-body reference image of one real juvenile golden retriever puppy for a desktop pet. The puppy must look like a real young golden retriever, not a cartoon, not a toy, not a plush, not a doll, not a 3D mascot, and not an illustrated character. The puppy is small, cute, and young, with realistic soft golden fur texture, a round friendly puppy face, floppy ears, dark natural eyes, tiny paws, a fluffy tail, and natural puppy proportions. It sits naturally facing front. Keep the whole body visible with generous transparent-safe margin around the subject. No collar, no clothes, no accessories, no text, no logo, no watermark, no extra object. Perfectly uniform solid blue background #0047FF, no floor, no shadow, no reflection. 1024x1024.

## 01 正面待机循环

文件建议：`golden-puppy-idle-front.webm`

用途：桌宠默认状态。暂停、菜单打开、无动作时都复用这一条。

Prompt：

> Use the uploaded photorealistic real juvenile golden retriever reference image as the only visual source. The puppy must remain a real young golden retriever, not a cartoon, toy, plush, doll, 3D mascot, or illustrated character. Preserve the puppy exactly 1:1: same face, eyes, ears, fur color, body shape, proportions, tail, paws, lighting, and style. The puppy sits facing front and performs a subtle seamless idle loop: gentle breathing, tiny blink, and very slight ear movement. The body stays in the same position and scale. The first and last frames must match in pose and velocity for a seamless loop. No walking, no jumping, no head turn, no second action. Locked camera, no zoom, no shake. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

## 02 向右走原地循环

文件建议：`golden-puppy-walk-right.webm`

用途：桌宠向右水平巡逻。角色不要在视频里真的移动，程序会移动窗口。

Prompt：

> Use the uploaded photorealistic real juvenile golden retriever reference image as the only visual source. The puppy must remain a real young golden retriever, not a cartoon, toy, plush, doll, 3D mascot, or illustrated character. Preserve the puppy exactly 1:1: same face, eyes, ears, fur color, body shape, proportions, tail, paws, lighting, and style. The puppy faces right and performs a natural lightweight walk cycle in place. Paws alternate clearly, the tail has a small soft sway, and the body has a gentle walking bounce. The puppy must not travel across the canvas; it walks in place only. The first and last frames must match in pose and velocity for a seamless loop. No jumping, no sitting, no turning around, no second action. Locked camera, no zoom, no shake. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

## 03 向左走原地循环

文件建议：`golden-puppy-walk-left.webm`

用途：桌宠向左水平巡逻。建议单独生成，不要简单镜像右走素材，避免毛发和光影看起来假。

Prompt：

> Use the uploaded photorealistic real juvenile golden retriever reference image as the only visual source. The puppy must remain a real young golden retriever, not a cartoon, toy, plush, doll, 3D mascot, or illustrated character. Preserve the puppy exactly 1:1: same face, eyes, ears, fur color, body shape, proportions, tail, paws, lighting, and style. The puppy faces left and performs a natural lightweight walk cycle in place. Paws alternate clearly, the tail has a small soft sway, and the body has a gentle walking bounce. The puppy must not travel across the canvas; it walks in place only. The first and last frames must match in pose and velocity for a seamless loop. No jumping, no sitting, no turning around, no second action. Locked camera, no zoom, no shake. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

## 04 点击轻微跳动

文件建议：`golden-puppy-click-jump.webm`

用途：用户左键点击桌宠。第一版只保留一个点击反馈，不额外做压扁和抖动。

Prompt：

> Use the uploaded photorealistic real juvenile golden retriever reference image as the only visual source. The puppy must remain a real young golden retriever, not a cartoon, toy, plush, doll, 3D mascot, or illustrated character. Preserve the puppy exactly 1:1: same face, eyes, ears, fur color, body shape, proportions, tail, paws, lighting, and style. The puppy faces front, does one small happy hop in place, lands softly, and returns to the original front-facing pose. Keep the motion gentle, lightweight, and suitable for a desktop pet click reaction. Do not move across the canvas. No spinning, no barking text, no second action. The first and final pose should be visually close so the clip can return to idle smoothly. Locked camera, no zoom, no shake. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 1.5-2 seconds, 24fps, 1024x1024.

## 05 休息趴着循环

文件建议：`golden-puppy-rest-loop.webm`

用途：番茄钟休息、喝水提醒、久坐提醒都先复用这一条。不要额外生成喝水/久坐专属动作。

Prompt：

> Use the uploaded photorealistic real juvenile golden retriever reference image as the only visual source. The puppy must remain a real young golden retriever, not a cartoon, toy, plush, doll, 3D mascot, or illustrated character. Preserve the puppy exactly 1:1: same face, eyes, ears, fur color, body shape, proportions, tail, paws, lighting, and style. The puppy lies down facing front with its head resting on its front paws and performs a seamless calm resting loop: gentle breathing, tiny blink, and slight ear movement. The first and last frames must match in pose and velocity. No standing up, no walking, no rolling, no second action. Locked camera, no zoom, no shake. Perfectly uniform solid blue background #0047FF. No text, subtitle, logo, watermark, UI, border, or extra object. One puppy only, 3-4 seconds, 24fps, 1024x1024.

## 暂时不做

第一版暂时不生成这些动作：

- 碰边转身
- 压扁回弹
- 左右抖动
- 专注开始表情
- 喝水提醒专属动作
- 久坐提醒专属动作
- 拖拽悬空
- 浏览器四边动作

这些动作等 v1 桌宠替换成幼年金毛、抠像稳定、打包跑通后再补。
