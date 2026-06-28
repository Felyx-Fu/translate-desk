# Translate Desk 品牌与应用视觉规范

> 版本：v0.2 / 适用于 Windows Electron 原型、README 展示图、发布页、应用安装包图标和后续官网。

## 1. 设计定位

Translate Desk 是一个面向 Windows 办公场景的 **多语言桌面翻译工作台**。现阶段可以先服务英汉场景，但品牌系统不应绑定在“只做英汉互译”上。后续无论扩展到日语、韩语、法语、德语、西语，还是接入云端翻译、OCR、多语词库，都应该看起来是同一个产品自然长出来的能力。

视觉方向应保持 **安静、克制、可信、轻量、国际化**，避免花哨的 AI 工具感，也不要做成游戏化、浏览器插件或单一语种词典风。

**核心关键词：**

- Calm Desk / 安静工作台
- Multilingual Bridge / 多语言桥接
- Local-first / 本地优先
- Office-grade / 办公可信
- Lightweight Utility / 轻量工具
- Expandable Language System / 可扩展语言系统

## 2. Logo 与应用图标

### 2.1 主图标概念

新版图标采用“语言卡片 + 地球镜头 + 双向轨道箭头”的组合，避免使用固定的英文、中文、日文或其他具体文字作为主识别符号。

- **圆角底座**：对应 Windows 桌面应用窗口，也保证任务栏、小图标识别度。
- **双层语言卡片**：代表源语言与目标语言，也可以扩展为多语言文档、网页、邮件和截图文本。
- **地球镜头 / 经纬线**：代表多语言、跨地区、跨语种，不把产品限制在英汉互译。
- **金色双向轨道箭头**：代表语言转换、流转和翻译动作。
- **深绿主色**：表达稳定、本地、办公和可信感。
- **抽象语言节点**：用短线和圆点表达文本结构，避免具体语种锁定。

### 2.2 图标文件

| 文件 | 用途 |
| --- | --- |
| `assets/brand/translate-desk-icon.svg` | 主应用图标源文件，适合导出 1024、512、256、128 PNG。 |
| `assets/brand/translate-desk-icon-small.svg` | 小尺寸优化版，适合任务栏、托盘、favicon、16-64px 场景。 |
| `assets/brand/translate-desk-icon-mono.svg` | 单色/水印/印刷/低对比展示场景。 |

### 2.3 使用规则

- 主图标优先用于安装包、Release、README 顶部展示。
- 小尺寸图标优先用于 Windows 任务栏、系统托盘、favicon。
- 单色图标只用于水印、浅色背景标记、极小型 UI 标识。
- 图标周围至少保留图标宽度 **12.5%** 的安全边距。
- 不要给图标重新加阴影、描边、旋转或换成高饱和渐变。
- 不要把图标改成只包含 `A/中`、`EN/CN`、国旗、具体国家轮廓或单一语种标记。

### 2.4 Windows 应用打包建议

Electron Builder 的 Windows 图标最终需要 `.ico`。可以把 SVG 导出为多尺寸 PNG 后合成为 ICO。

建议尺寸：

```text
16, 24, 32, 48, 64, 128, 256
```

推荐路径：

```text
build/icon.ico
build/icon.png
```

之后可在 `package.json` 的 `build.win` 内添加：

```json
{
  "icon": "build/icon.ico"
}
```

## 3. 色彩系统

Translate Desk 当前界面已经使用低饱和绿色、暖金色和少量紫色。新的品牌色延续这个方向，保持办公工具的安静感，同时为多语言能力留出扩展空间。

### 3.1 主色

| Token | Hex | 用途 |
| --- | --- | --- |
| `--td-green-900` | `#123E38` | 深色背景、图标暗部、强对比状态。 |
| `--td-green-800` | `#164C42` | 主按钮按下态、深色标题点缀。 |
| `--td-green-700` | `#185F50` | 主按钮 hover、重点文字。 |
| `--td-green-600` | `#1F6254` | 品牌主色、选中态、关键操作。 |
| `--td-green-200` | `#CFE2DC` | 绿色边框、轻提示。 |
| `--td-green-100` | `#E6F1EE` | 绿色浅底、选中背景。 |

### 3.2 中性色

| Token | Hex | 用途 |
| --- | --- | --- |
| `--td-ink-900` | `#142022` | 最高强调文字。 |
| `--td-ink-800` | `#20272B` | 正文主文字。 |
| `--td-ink-600` | `#4A5559` | 二级标题、标签。 |
| `--td-ink-500` | `#687377` | 辅助文字。 |
| `--td-paper-000` | `#FFFFFF` | 主卡片。 |
| `--td-paper-100` | `#F8FAFA` | 轻卡片、输入区。 |
| `--td-paper-150` | `#F5F7F7` | 页面背景。 |
| `--td-paper-200` | `#EEF4F2` | 侧边栏、辅助区域。 |

### 3.3 辅助色

| Token | Hex | 用途 |
| --- | --- | --- |
| `--td-amber-800` | `#8A6A2F` | OCR、截图、转换动作、CTA 次重点。 |
| `--td-amber-100` | `#FCF8F0` | OCR 模块浅底。 |
| `--td-purple-700` | `#6E4C95` | 朗读、生词本、智能提示、多语词库类信息。 |
| `--td-purple-100` | `#F4F0FA` | 紫色浅底。 |

## 4. 字体与文字风格

### 4.1 字体栈

```css
font-family: "Noto Sans SC", "Microsoft YaHei UI", "Segoe UI", Arial, sans-serif;
```

理由：

- Windows 中文显示稳定。
- `Segoe UI` 与 Windows 原生界面气质一致。
- 中英文混排更稳，不容易显得廉价。
- 后续多语言文本可以继续扩展到更完整的 fallback 字体栈。

### 4.2 文案气质

Translate Desk 的产品文案要像工具，不像营销页。

**推荐：**

- “选择文本后显示悬浮翻译”
- “自动识别剪贴板语言”
- “识别完成后自动回填到翻译工作台”
- “本地保存，不主动上传”
- “添加到多语词库”

**避免：**

- “AI 赋能极速翻译”
- “一键解决所有语言问题”
- “全网最强翻译神器”
- “秒杀所有词典”
- “专为英汉互译而生”

## 5. 界面风格

### 5.1 布局原则

- 三栏结构继续保留：左侧导航 / 中间工作台 / 右侧状态信息。
- 主工作区优先保证阅读空间，不要塞太多按钮。
- 状态信息用小卡片承载，不做强弹窗。
- OCR 和截图属于“动作场景”，可以使用暖金色，但面积不要过大。
- 语言选择不要只显示“英 → 中 / 中 → 英”，后续应支持源语言、目标语言和自动检测的组合。

### 5.2 圆角

| Token | Value | 用途 |
| --- | --- | --- |
| `--td-radius-xs` | `8px` | 图标按钮、短按钮。 |
| `--td-radius-sm` | `10px` | 列表项、输入框。 |
| `--td-radius-md` | `12px` | 普通卡片、翻译面板。 |
| `--td-radius-lg` | `16px` | 浮层、Popover。 |
| `--td-radius-window` | `18px` | 主窗口、Dialog。 |
| `--td-radius-pill` | `999px` | 标签、主按钮。 |

### 5.3 阴影

阴影应该像 Windows 桌面浮层，而不是网页海报。

```css
--td-shadow-window: 0 34px 68px rgba(18, 30, 34, 0.1);
--td-shadow-popover: 0 28px 68px rgba(17, 27, 31, 0.16);
--td-shadow-dialog: 0 30px 80px rgba(17, 27, 31, 0.22);
```

### 5.4 交互状态

- Hover：只轻微改变背景和文字色。
- Active：允许 1px 下沉，但不要夸张动画。
- Focus：必须保留清晰可见轮廓，尤其是快捷键用户。
- Disabled：透明度降低，不要完全隐藏。

## 6. 组件样式建议

### 6.1 主按钮

用于“开始截图”“立即翻译”“保存到词库”等关键动作。

```css
.td-primary-button {
  min-height: 38px;
  padding: 0 18px;
  color: #fff;
  background: var(--td-primary);
  border: 0;
  border-radius: var(--td-radius-pill);
  font-weight: 700;
}
```

### 6.2 安静按钮

用于“复制”“朗读”“清空”“打开设置”等次级动作。

```css
.td-quiet-button {
  min-height: 34px;
  padding: 0 14px;
  color: var(--td-primary);
  background: var(--td-paper-050);
  border: 1px solid var(--td-green-200);
  border-radius: var(--td-radius-xs);
  font-weight: 700;
}
```

### 6.3 翻译结果卡片

- 源文本：使用普通正文色。
- 译文：使用深绿，字号略大，字重 600。
- 长文本：行高至少 1.55，避免密集压迫。
- 多语言文本要允许不同脚本的行高差异，不要强制过小 line-height。

### 6.4 OCR 区域

OCR 是一个独立功能场景，建议继续使用暖金色浅底：

- 背景：`#FCF8F0`
- 边框：`#EADDC4`
- 强调：`#8A6A2F`

## 7. 设计变量文件

新增文件：

```text
src/brand-tokens.css
```

建议后续逐步把 `src/styles.css` 里的硬编码颜色迁移到这些 token。不要一次性大改 UI，先从主色、按钮、卡片、边框开始。

## 8. 后续落地清单

- [ ] 将 `assets/brand/translate-desk-icon.svg` 导出为 1024/512/256 PNG。
- [ ] 使用小尺寸图标生成 16/24/32/48/64 PNG。
- [ ] 合成 `build/icon.ico`，并接入 `electron-builder`。
- [ ] 在 README 顶部加入主图标或品牌横幅。
- [ ] 将 `src/brand-tokens.css` 引入入口文件。
- [ ] 逐步替换 `src/styles.css` 中的颜色硬编码。
- [ ] 将语言方向 UI 从固定英汉改成“源语言 / 目标语言 / 自动检测”。
- [ ] 为深色模式预留一套 `@media (prefers-color-scheme: dark)` token。

## 9. 一句话视觉标准

> Translate Desk 应该看起来像一个每天都能安心打开的 Windows 多语言翻译工作台：清爽、可靠、本地、轻量，并且不会被任何单一语种限制住。
