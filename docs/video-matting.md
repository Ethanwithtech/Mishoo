# Mishoo 视频抠像工作流

Mishoo 的浏览器插件效果需要“动物前景视频 + 透明背景”。浏览器里最适合的格式是 `WebM VP9 with alpha`。

## 推荐方案

优先级从高到低：

1. AI 视频工具直接导出透明背景视频，或剪映导出 `MOV ProRes 4444 with alpha`。
2. 如果有纯绿幕/纯蓝幕/纯黑幕，用本项目的 `video:key` 脚本自动转透明 `WebM`。
3. 如果背景复杂、地面/阴影/水印很多，使用 AI 背景移除工具，例如开源 `backgroundremover`。

## 本项目内置脚本

```bash
npm run video:key -- <input-video> [options]
```

常用命令：

```bash
npm run video:key -- dog-greenscreen.mp4 --mode chroma --key 00ff00 --similarity 0.25 --blend 0.10
```

如果剪映导出了真正带透明通道的 `MOV`：

```bash
npm run video:key -- dog-alpha.mov --mode alpha
```

如果素材是纯黑背景：

```bash
npm run video:key -- dog-black.mov --mode black --similarity 0.12 --blend 0.08
```

默认输出：

```text
public/videos/golden-alpha.webm
public/videos/golden-alpha-preview.png
```

其中 `golden-alpha.webm` 是脚本默认输出名，`golden-alpha-preview.png` 用来检查抠像效果。输出文件需要先确认在 Chrome/Electron 中透明通道可靠，再在宠物配置里替换路径并设置 `hasAlpha: true`；当前内置演示素材默认仍使用 `*-source.webm` 走运行时 canvas 抠绿。

## 参数说明

```text
--mode auto|alpha|chroma|black|white
--key 00ff00
--similarity 0.22
--blend 0.08
--fps 30
--width 1920
--height 1080
--crf 28
```

`similarity` 越大，抠得越多；`blend` 越大，边缘越柔。动物毛发被吃掉时降低 `similarity`；背景残留时提高 `similarity`。

## 开源 AI 抠像项目调研

### backgroundremover

仓库：`https://github.com/nadermx/backgroundremover`

这是最适合当前需求的开源命令行工具，因为它支持图片和视频背景移除，并能输出透明视频。它基于 U2Net / PyTorch，通用物体比人像专用模型更适合尝试宠物素材。

本项目已经接入包装命令：

```bash
npm run video:ai -- input.mp4
```

第一次真实运行会自动创建 `.mishoo-video-env`，安装 PyTorch CPU 版本和 `backgroundremover`，并下载 U2Net 模型。默认输出：

```text
public/videos/golden-alpha.webm
public/videos/golden-alpha-preview.png
```

可选参数：

```bash
npm run video:ai -- input.mp4 --model u2netp
npm run video:ai -- input.mp4 --out public/videos/golden-alpha.webm
npm run video:ai -- input.mp4 --skip-install
```

也可以直接使用原始命令：

```bash
backgroundremover -i input.mp4 -tv --alpha-codec libvpx-vp9 -o output.webm
```

如果输出 `MOV ProRes 4444`：

```bash
backgroundremover -i input.mp4 -tv -o output.mov
npm run video:key -- output.mov --mode alpha
```

注意：这个方案会安装 PyTorch、下载模型，占用较多 CPU/GPU 和磁盘；第一次运行会比较慢。

### BackgroundMattingV2

仓库：`https://github.com/PeterL1n/BackgroundMattingV2`

质量高，但需要同机位的“无动物干净背景图”。AI 生成素材通常没有这种空背景，所以不适合作为 Mishoo 的默认流程。

### Robust Video Matting

项目页：`https://peterl1n.github.io/RobustVideoMatting/`

它主要面向人物视频抠像，不是宠物专用。可以研究，但不建议作为当前 MVP 的主流程。

### FFmpeg chromakey / colorkey

这是当前项目推荐的离线生成透明素材方案，适合纯色背景素材。当前内置演示为了保证动物一定可见，运行时仍用 canvas 对源视频抠绿；产品化后应把离线透明 WebM 验证稳定后再切到直接播放。优点是快、稳定、完全本地；缺点是对复杂背景、渐变地面、阴影、水印无能为力。

## 素材生成要求

为了保证自动抠像成功，AI 视频 prompt 应尽量要求：

```text
transparent background with alpha channel
```

如果不支持透明，则要求：

```text
pure #00FF00 chroma key green background, no floor, no wall, no shadow, no watermark, isolated animal only
```

不要生成地面、墙、灰色摄影棚、阴影或水印，否则普通 chroma key 很难干净抠掉。
