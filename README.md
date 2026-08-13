# 📄 AI 简历制作系统 · Resume Builder

一个功能强大的 **Web 端在线简历制作系统**：支持**在线实时预览与编辑**、**导出 PDF / PNG / JSON**，并接入**硅基流动（SiliconFlow）大模型**，实现简历的**一键生成、全模块润色、语言润色、JD 定制**与**旧简历 OCR 导入**。

> 数据保存在浏览器本地（localStorage），无需后端数据库，开箱即用，隐私友好。

<p align="center">
  <a href="#-功能特性">功能特性</a> ·
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-技术选型">技术选型</a> ·
  <a href="#-项目结构">项目结构</a> ·
  <a href="#-字体与模型">字体与模型</a>
</p>

---

## ✨ 功能特性

### 编辑与排版
- **实时双栏预览**：左侧编辑、右侧即时渲染，所见即所得
- **8 套 A4 简历模板**：经典 / 现代 / 紧凑 / 优雅（衬线）/ 极简 / 侧栏（深色）/ 时间轴 / 极客（程序员高密度）
- **自动排版布局**：按纸张高度自动分页、空白模块自动隐藏、板块顺序自由拖拽
- **预览区点击拖拽编辑**：
  - 点击任意文字直接就地编辑（内联富文本编辑）
  - 拖拽板块标题自由排序（不影响对齐排版）
  - 拖拽排序工作 / 项目 / 教育经历条目

### 高自由度 DIY
- 5 款字体、8 种主题色、字号（10–18px）、行高（1.15–2.0）自由调节
- **头像**：圆形 / 矩形切换，大小 48–160px 可调
- **批量样式**：勾选多个模块，一键同时应用「加粗 / 字号± / 颜色 / 清除格式」
- **局部文字样式**：预览区框选文字后弹出工具栏，可加粗 / 斜体 / 下划线 / 字号 / 颜色

### 多格式导出
- 📕 **PDF**：`@react-pdf/renderer` 客户端生成，内嵌中文字体，文字可复制检索、矢量高清
- 🖼 **PNG**：`html-to-image` 高清导出（约 400+ DPI）
- 📦 **JSON**：简历数据备份 / 恢复
- 🖨 **打印**：浏览器打印 / 另存为 PDF

### 🤖 AI 能力（硅基流动 SiliconFlow）
- ✨ **一键生成完整简历**
- 🪄 **模块润色**：个人简介 / 工作经历 / 项目经历 / 教育经历 / 技能 / 自定义模块，逐项润色建议
- ✍️ **语言润色**：把大白话写进去，AI 自动改成专业、量化的简历语言
- 🎯 **根据职位描述（JD）定制简历**
- 🔄 **以旧换新**：上传旧简历（图片 / PDF），AI 自动 OCR 识别并生成结构化简历

---

## 🚀 快速开始

### 环境要求
- Node.js ≥ 18（推荐 20+）

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/Chun556699/resume-builder.git
cd resume-builder

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的硅基流动 API Key
# （前往 https://cloud.siliconflow.cn 注册获取）

# 4. 启动开发服务器
npm run dev
# 打开 http://localhost:3000
```

### 生产构建

```bash
npm run build
npm run start
```

### 环境变量说明

| 变量 | 说明 | 默认值 |
|---|---|---|
| `SILICONFLOW_API_KEY` | 硅基流动 API Key（必填） | — |
| `SILICONFLOW_MODEL` | 文本生成模型 | `deepseek-ai/DeepSeek-V3.2` |
| `SILICONFLOW_MODEL_FALLBACK` | 文本生成备用模型 | `Qwen/Qwen2.5-7B-Instruct` |
| `SILICONFLOW_OCR_MODEL` | OCR / 视觉识别模型 | `Qwen/Qwen3-VL-8B-Instruct` |

---

## 🔍 技术选型

调研了 GitHub 上多个高星简历制作开源项目，成功技术栈高度一致：

| 项目 | Stars | 技术栈 |
|---|---|---|
| [reactive-resume](https://github.com/amruthpillai/reactive-resume) | 40k+ | React + Tailwind + TanStack + react-pdf |
| [open-resume](https://github.com/xitanggg/open-resume) | 8.8k+ | Next.js + React + TS + Tailwind + Redux + `@react-pdf/renderer` |
| [resume-builder](https://github.com/sadanandpai/resume-builder) | 1.2k+ | Next.js + React + Zustand + @dnd-kit |
| [resume-lm](https://github.com/olyaiy/resume-lm) | 300+ | Next.js 15 + React 19 + Tailwind + LLM |

**本项目采用的核心技术栈**：

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | **Next.js 14 (App Router) + React 18 + TypeScript** | 主流、自带 API 路由（用于 AI 密钥服务端代理） |
| 样式 | **Tailwind CSS** | 所有成功项目一致采用 |
| 状态管理 | **Zustand**（+ persist 中间件） | 轻量、天然支持 localStorage 持久化 |
| PDF 导出 | **@react-pdf/renderer** | 客户端直接生成 PDF |
| 图片导出 | **html-to-image** | 将预览 DOM 导出为 PNG |
| PDF 解析 | **pdfjs-dist** | 旧简历 PDF 转图片用于 OCR |
| AI 接入 | **SiliconFlow OpenAI 兼容 API** | 服务端代理，密钥不暴露到前端 |

---

## 🔤 字体与模型

### 内置 5 款字体（均支持中文 PDF 渲染）

| 字体 | 说明 | 许可 |
|---|---|---|
| 思源黑体（Noto Sans SC） | 现代无衬线 | OFL |
| 思源宋体（Noto Serif SC） | 优雅衬线 | OFL |
| 霞鹜文楷（LXGW WenKai） | 楷体 / 手写风 | OFL |
| 阿里巴巴普惠体 3.0 | 专业商务 | 阿里免费商用授权 |
| 得意黑（Smiley Sans） | 现代斜体风格 | OFL |

> 字体文件位于 `public/fonts/`，用于 PDF 导出时的中文渲染；预览端使用 CSS 字体栈自动回退。

### 硅基流动模型

- **文本生成**：`deepseek-ai/DeepSeek-V3.2`（默认，中文质量高、非思考型稳定输出）
- **文本备用**：`Qwen/Qwen2.5-7B-Instruct`（失败自动降级）
- **OCR 识别**：`Qwen/Qwen3-VL-8B-Instruct`（简历图片 / PDF 结构化提取）

---

## 📁 项目结构

```
resume-builder/
├── public/
│   ├── fonts/                    # 内嵌中文字体（5 款，PDF 中文渲染）
│   └── pdf.worker.min.js         # pdfjs-dist worker（PDF 解析）
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/route.ts       # AI 文本生成代理（服务端隐藏密钥）
│   │   │   └── ocr/route.ts      # OCR 视觉识别代理
│   │   ├── layout.tsx
│   │   ├── page.tsx              # 主页面（工具栏 + 编辑器 + 预览）
│   │   └── globals.css
│   ├── components/
│   │   ├── Toolbar.tsx           # 顶部工具栏（模板/字体/纸张/导出/压缩到一页）
│   │   ├── preview/
│   │   │   ├── ResumePreview.tsx # HTML 实时预览（8 套模板 + 自动分页 + 拖拽编辑）
│   │   │   ├── InlineEditable.tsx# 内联富文本编辑器
│   │   │   └── SelectionToolbar.tsx # 框选文字样式工具栏
│   │   ├── pdf/
│   │   │   ├── ResumePdf.tsx     # PDF 渲染器（8 套模板 + 富文本）
│   │   │   └── fonts.ts          # 字体注册
│   │   └── editor/
│   │       ├── EditorPanel.tsx   # 表单编辑器（6 大模块 + 布局排序）
│   │       ├── AiPanel.tsx       # AI 助手面板（润色/语言润色/导入）
│   │       ├── BatchStylePanel.tsx # 批量样式面板
│   │       └── fields.tsx        # 通用表单组件
│   ├── store/
│   │   ├── resumeStore.ts        # Zustand 状态 + localStorage 持久化
│   │   └── uiStore.ts            # 非持久化 UI 状态
│   ├── lib/
│   │   ├── ai.ts                 # AI 客户端封装 + 提示词 + JSON 解析
│   │   ├── importResume.ts       # 旧简历导入（图片/PDF → OCR）
│   │   ├── pdfExport.ts          # PDF 导出逻辑
│   │   ├── export.ts             # JSON/图片/打印导出
│   │   ├── fonts.ts              # 字体定义
│   │   ├── paper.ts              # 纸张尺寸定义
│   │   └── utils.ts              # 工具函数
│   ├── types/resume.ts           # 简历数据模型
│   └── data/sample.ts            # 示例数据
├── .env.example                  # 环境变量示例（需自行配置 .env.local）
├── package.json
└── README.md
```

---

## 📐 简历数据模型

核心 JSON Schema（`src/types/resume.ts`）：

```ts
interface ResumeData {
  personal: { fullName; jobTitle; email; phone; location; website; avatar; summary };
  experiences: [{ company; position; location; startDate; endDate; current; description }];
  education:   [{ school; degree; major; startDate; endDate; description }];
  projects:    [{ name; role; link; startDate; endDate; description }];
  skills:      [{ name; items }];
  customSections: [{ title; content; images }];
}
```

---

## 🔒 安全说明

- AI 调用通过 **Next.js API 路由服务端代理**，硅基流动的 API Key 只存在于 `.env.local`，不会暴露到浏览器
- `.env.local` 已加入 `.gitignore`，**请勿将密钥提交到仓库**

---

## 📄 许可证

本项目代码采用 [MIT License](LICENSE)。

内置字体遵循各自许可：
- 思源黑体 / 思源宋体 / 霞鹜文楷 / 得意黑：SIL Open Font License 1.1（OFL）
- 阿里巴巴普惠体 3.0：阿里巴巴普惠体免费商用授权

---

## 🙏 致谢

- [reactive-resume](https://github.com/amruthpillai/reactive-resume) · [open-resume](https://github.com/xitanggg/open-resume) · [resume-builder](https://github.com/sadanandpai/resume-builder) 等项目的技术方案参考
- [SiliconFlow 硅基流动](https://siliconflow.cn) 提供大模型 API
- [Noto CJK](https://github.com/notofonts/noto-cjk) · [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) · [Smiley Sans](https://github.com/atelier-anchor/smiley-sans) · [阿里巴巴普惠体](https://puhuiti.taobao.com) 字体项目
