# Translate Desk

> 面向 Windows 办公场景的英汉互译桌面工具。主界面保持安静、克制，常用翻译、划词、截图 OCR、剪贴板监听和生词本集中在一个轻量工作台里。

![Platform](https://img.shields.io/badge/Platform-Windows-2563EB?style=flat-square)
![Stack](https://img.shields.io/badge/Stack-TypeScript%20%2B%20Electron-0F766E?style=flat-square)
![Status](https://img.shields.io/badge/Status-Local%20Prototype-A16207?style=flat-square)

## 项目定位

Translate Desk 是一个仍在迭代中的 Windows 英语翻译软件原型，目标是覆盖办公用户每天高频遇到的几类场景：

- 读合同、邮件、文档时快速完成英汉互译。
- 在其他 Windows 应用里选中文本后，通过快捷键调出悬浮翻译。
- 对截图区域做英文 OCR 识别，并尽量保留段落结构。
- 监听剪贴板里的英文内容，减少反复复制、粘贴、切窗口。
- 把常见词、业务词和生词沉淀到本地生词本。

当前翻译逻辑仍是本地原型规则，适合验证交互、窗口能力和产品路径；不是云端大模型翻译服务，也还不是专业词典级结果。

## 功能状态

| 模块 | 当前状态 | 说明 |
| --- | --- | --- |
| 英汉互译 | 可用原型 | 支持英译中、中译英和自动检测，翻译内容来自本地原型逻辑。 |
| 划词翻译 | 可用原型 | `Ctrl+Space` 会优先读取其他 Windows 应用中的选中文本，失败时回退剪贴板。 |
| 悬浮窗 | 可用原型 | 用于快速查看外部选中文本或剪贴板文本的翻译结果。 |
| 截图 OCR 翻译 | First-pass | 基于 `tesseract.js` 做英文识别，已经支持框选区域，准确率仍需继续优化。 |
| 剪贴板监听 | 可用原型 | 桌面模式下可监听剪贴板英文内容。 |
| 生词本 | 可用原型 | 通过 Electron user data 做本地持久化。 |
| 朗读 | 可用原型 | 使用系统可用的 Web Speech API。 |
| 离线能力 | 部分可用 | 界面和原型翻译逻辑本地运行；OCR 模型和识别效果仍在调整。 |

## 下载与安装

Windows 应用包会在 GitHub Releases 中发布。最新正式版本提供 `.exe` 后缀的 Windows portable 应用产物。

1. 打开项目的 GitHub Releases。
2. 下载最新 Windows 应用包。
3. 运行 `Translate Desk.exe`。

如果历史版本下载的是压缩包形式，先解压到本地目录，再运行其中的 `Translate Desk.exe`。

## 本地运行

项目使用 TypeScript、React、Vite 和 Electron。

```powershell
npm install
npm run dev
```

桌面开发模式：

```powershell
npm run desktop
```

从构建产物预览桌面端：

```powershell
npm run desktop:preview
```

构建 Windows 发布产物：

```powershell
npm run dist:win
```

发布输出位于 `release/`，正式版本应上传到匹配的 GitHub Release。

## 验证

提交或发布前建议至少跑完这些检查：

```powershell
npm run build
node --check dist-electron\main.cjs
node --check dist-electron\preload.cjs
npx electron . --smoke-test
```

如果已经构建 Windows 应用包，也应对打包后的 `Translate Desk.exe` 执行 smoke test。

## 隐私与本地处理

Translate Desk 当前优先按本地桌面工具设计：

- 剪贴板监听、选中文本读取、截图区域识别都发生在本机应用进程内。
- 生词本保存在 Electron user data 目录，不主动上传到远端服务。
- 当前没有接入云端翻译 API，也没有账户系统。
- OCR 使用 `tesseract.js` first-pass 方案，后续会继续评估模型体积、准确率和离线体验。

后续如果引入云端翻译、同步或账户能力，应在功能说明和发布说明中明确数据流向与开关。

## 路线图

- 发布 `.exe` 后缀的 Windows 应用产物，降低普通用户安装门槛。
- 提升自动检测和本地原型翻译质量，减少方向判断错误。
- 优化截图 OCR 的识别准确率、区域选择体验和结果排版。
- 完善生词本：搜索、分类、导入导出和复习状态。
- 增强快捷键、悬浮窗和剪贴板监听的可配置能力。
- 评估 Rust/Tauri 方案，用于更轻量的桌面壳、系统能力和发布体积优化。

## 发布策略

项目遵循语义化版本：

- Minor release：完成用户可感知的新功能或重要应用里程碑。
- Patch release：修复 bug、OCR/翻译问题、打包问题或小范围体验打磨。
- Security patch release：依赖或代码层面的安全修复。

每个正式版本都应更新 `CHANGELOG.md`，通过验证，创建 Git tag，并发布 GitHub Release。应用发布不能只有版本号，还应包含可运行的 Windows 应用产物。

## 贡献

贡献和 Pull Request 规则见 `CONTRIBUTING.md`。
