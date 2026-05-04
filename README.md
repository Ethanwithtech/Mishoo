# Mishoo / 咪咻

Mishoo 是一个面向久坐打工人的桌面休息守护应用。到点后，一只宠物会走到屏幕前，创建全屏置顶休息遮罩，温柔但坚定地让用户离开屏幕休息。

## 当前 MVP

- 工作/休息时长设置
- `Pawse Mode` 全屏休息遮罩
- 真实宠物照片：小猫、小狗、兔兔
- 金毛休息遮罩已支持网页背景可见的透明 WebM 覆盖层：`public/videos/golden-alpha.webm`
- 中文 / English 双语切换
- 休息期间拦截遮罩窗口内键盘输入
- 本地休息记录
- 明显的安全退出按钮，避免开发测试时卡住全屏
- 浏览器预览降级：如果不在 Electron 中运行，`立即召唤咪咻` 会打开网页内遮罩
- Chrome Extension MVP：弹窗设置页、后台工作计时、内容脚本注入网页内宠物覆盖层
- 默认本地优先，不需要账号，不读取屏幕内容，不启用摄像头，不上传数据

## Chrome Extension MVP

当前构建会同时输出 Electron 网页和浏览器插件文件。插件核心文件包括：

```text
public/manifest.json
extension/popup.html
src/extension/popup.tsx
src/extension/background.ts
src/extension/content.ts
```

构建后在 Chrome 中加载：

```bash
npm run build
```

然后打开 Chrome：`chrome://extensions` → 开启 Developer mode → Load unpacked → 选择项目的 `dist` 目录。

插件能力：

- popup 中设置工作/休息时长、宠物、语言和 Pawse Mode
- 点击“立即召唤”会把咪咻注入到当前网页
- 点击“开始专注计时”后，到点由后台脚本向当前活动网页发送休息提醒
- 内容脚本在网页最上层创建透明前景覆盖层，播放 `videos/golden-alpha.webm`
- 网页内容仍在底下可见，左上角显示小倒计时，右上角保留退出按钮

注意：Chrome 内置页面、扩展商店页面和部分受限页面无法注入 content script；请在普通网页中测试。

## 重要边界

出于系统安全限制，当前 MVP 不会拦截操作系统级快捷键，也不会真正锁死整台电脑。它会创建一个置顶、全屏休息遮罩，用于验证“宠物强制休息”是否比普通提醒更有效且更可接受。当前版本始终保留可见退出按钮，避免用户被困在全屏窗口中。

## 图片来源

当前真实宠物照片来自 Unsplash 公开图片链接，仅用于 MVP 验证；正式商用前应替换为自有授权素材或用户上传宠物照片。

## 本地运行

```bash
npm install
npm run dev
```

## 类型检查与构建

```bash
npm run build
```

## 视频抠像

项目内置了基于 `ffmpeg-static` 的视频抠像脚本：

```bash
npm run video:key -- dog-greenscreen.mp4 --mode chroma --key 00ff00 --similarity 0.25 --blend 0.10
```

如果剪映导出的是真正带透明通道的 `MOV ProRes 4444`：

```bash
npm run video:key -- dog-alpha.mov --mode alpha
```

如果普通绿幕/黑底抠像不够干净，可以使用开源 AI 自动抠像流程：

```bash
npm run video:ai -- input.mp4
```

第一次运行会创建本地 Python 虚拟环境 `.mishoo-video-env`，安装 PyTorch CPU 版本和 `backgroundremover`，并下载模型，耗时会比较久。

更多说明见：`docs/video-matting.md`

## 产品方向

第一阶段验证的问题不是“能不能做 AI 宠物”，而是：当宠物全屏出现并要求休息时，目标用户是否觉得这是帮助而不是打扰。

建议下一步：用这个 MVP 或录屏演示访谈 15 位每天电脑工作 6 小时以上的白领用户，重点观察他们是否愿意安装试用 3 天。

## 研究文档

- `research_plan_mixiu_rest_pet_app.md`
- `research_report_mixiu_rest_pet_app.md`
