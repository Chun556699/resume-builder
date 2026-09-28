# 📄 AI 简历制作系统 · Resume Builder

一个功能强大的 **Web 端在线简历制作系统**：支持**在线实时预览与编辑**、**导出 PDF / PNG / JSON**，并接入 **DeepSeek 大模型（deepseek-flash，原生多模态）**，实现简历的**一键生成、全模块润色、语言润色、JD 定制**与**各求职网站简历导入识别**。

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
- 9 款中文字体 + 4 款英文字体（中英文可分别设置）、8 种主题色、字号（10–18px）、行高（1.15–2.0）自由调节
- **头像**：圆形 / 矩形切换，大小 48–160px 可调
- **批量样式**：勾选多个模块，一键同时应用「加粗 / 字号± / 颜色 / 清除格式」
- **局部文字样式**：预览区框选文字后弹出工具栏，可加粗 / 斜体 / 下划线 / 字号 / 颜色

### 多格式导出
- 📕 **PDF**：默认导出**矢量文本版**（`@react-pdf/renderer` 内嵌中文字体，文字可复制检索、矢量高清），招聘系统 ATS 可精确解析简历内容
- 🖼 **PNG**：`html-to-image` 高清导出（约 400+ DPI）
- 📦 **JSON**：简历数据备份 / 恢复（免费）
- 🖨 **打印**：浏览器打印 / 另存为 PDF

### 💰 账号与付费（ZPAY 支付）
- 支持**账号密码注册/登录**（密码服务端 scrypt 加盐散列，登录发放会话 token）。
- 游客免费制作并导出 1 张简历（PDF / PNG / 打印）；登录用户同样首张免费，之后 **6.6 元/次**购买导出额度。
- **AI 功能按次计费（1 元/次）**：AI 额度与导出额度相互独立，登录后可单独购买 AI 次卡。
- 已接入 [ZPAY 支付](https://z-pay.cn)（易支付兼容接口）：扫码支付 → 异步通知验签（签名 + 商户号 + 金额）→ 前端轮询订单状态自动到账。
- 服务端额度落盘（`DATA_DIR` 指向应用目录之外的持久化数据目录），支付成功后按订单幂等发放额度。
- 本地未配置商户信息时自动走「模拟支付」，便于预览。

### 🤖 AI 能力（DeepSeek deepseek-flash，原生多模态）
- ✨ **一键生成完整简历**
- 🪄 **模块润色**：个人简介 / 工作经历 / 项目经历 / 教育经历 / 技能 / 自定义模块，逐项润色建议
- ✍️ **语言润色**：把大白话写进去，AI 自动改成专业、量化的简历语言
- 🎯 **根据职位描述（JD）定制简历**
- 🔄 **以旧换新**：上传旧简历（图片 / PDF，支持 BOSS直聘、智联招聘、前程无忧、猎聘、LinkedIn 等各求职网站导出件），AI 自动识别并生成结构化简历

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
# 编辑 .env.local，填入你的 DeepSeek API Key
# （前往 https://platform.deepseek.com 注册获取）

# 4. 启动开发服务器
npm run dev
# 打开 http://localhost:3000
```

### 生产构建

```bash
npm run build
npm run start
```

---

## ☁️ 部署到云服务器

本系统无数据库、无状态（数据存于浏览器 localStorage），是标准的 Next.js 应用，可部署到任意支持 Node.js 的云服务器（阿里云 / 腾讯云 / AWS / 各 VPS）。AI 与 OCR 接口通过服务端 API 路由代理，服务器只需能访问外网（调用 DeepSeek API）即可。

### 方案一：Docker 部署（推荐，最省心）

```bash
# 构建镜像
docker build -t resume-builder .

# 运行（传入 DeepSeek 密钥）
docker run -d \
  --name resume-builder \
  -p 3000:3000 \
  -e DEEPSEEK_API_KEY=sk-你的密钥 \
  -e DEEPSEEK_MODEL=deepseek-flash \
  resume-builder

# 访问 http://服务器IP:3000
```

> 生产环境建议再挂一层 Nginx / Caddy 反向代理并配置 HTTPS 域名。

### 方案二：传统 Node + PM2 部署（本地构建，服务器仅运行）

> ⚠️ 本项目使用 `output: "standalone"`，**不要**在低内存服务器上直接 `npm run build`（容易 OOM）。推荐本地构建后上传 standalone 产物，服务器只负责运行。

```bash
# 1. 本地构建并打包 standalone 产物
npx next build
rm -rf /tmp/deploy && mkdir -p /tmp/deploy
cp -a .next/standalone/. /tmp/deploy/
cp -r .next/static /tmp/deploy/.next/static
cp -r public /tmp/deploy/public
cp ecosystem.config.js /tmp/deploy/
cp .env.example /tmp/deploy/.env.local   # 然后编辑填入 DeepSeek 密钥
tar -czf resume-deploy.tar.gz -C /tmp/deploy .

# 2. 上传 tar 包到服务器并解压
scp resume-deploy.tar.gz root@服务器IP:/opt/
ssh root@服务器IP "mkdir -p /opt/resume-builder-app && tar -xzf /opt/resume-deploy.tar.gz -C /opt/resume-builder-app"

# 3. 用 PM2 守护进程（端口可按需 PORT=3001 覆盖）
ssh root@服务器IP
cd /opt/resume-builder-app
npm i -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 访问 http://服务器IP:3000
```

### 方案三：一键部署到 Vercel（免费）

1. 将仓库推送到 GitHub（已完成）
2. 在 [vercel.com](https://vercel.com) 点击 “Import Project”，选择本仓库
3. 在 Environment Variables 中配置 `SILICONFLOW_API_KEY` 等变量
4. 点击 Deploy，即可获得公网访问地址

> Vercel 的 Serverless 函数会自动处理 `/api/ai` 和 `/api/ocr` 路由，无需额外配置。

### 环境变量说明

| 变量 | 说明 | 默认值 |
|---|---|---|
| `SILICONFLOW_API_KEY` | 硅基流动 API Key（必填） | — |
| `SILICONFLOW_MODEL` | 文本生成模型 | `deepseek-ai/DeepSeek-V3.2` |
| `SILICONFLOW_MODEL_FALLBACK` | 文本生成备用模型 | `Qwen/Qwen2.5-7B-Instruct` |
| `SILICONFLOW_OCR_MODEL` | OCR / 视觉识别模型 | `Qwen/Qwen3-VL-8B-Instruct` |
| `ZPAY_PID` | ZPAY 商户 ID（未配置则本地模拟支付） | — |
| `ZPAY_KEY` | ZPAY 商户密钥（仅服务端使用） | — |
| `ZPAY_API_BASE` | ZPAY 接口地址 | `https://zpayz.cn` |
| `ZPAY_NOTIFY_URL` | 支付异步通知回调地址 | — |
| `ZPAY_RETURN_URL` | 支付完成跳转地址 | — |
| `DATA_DIR` | 账号/订单持久化目录（生产建议置于应用目录之外） | `./data` |

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

### 内置字体（中英文可分别单独设置）

中文字体（9 款，均支持中文 PDF 渲染）：

| 字体 | 说明 | 许可 |
|---|---|---|
| 思源黑体（Noto Sans SC） | 现代无衬线 | OFL |
| 思源宋体（Noto Serif SC） | 优雅衬线 | OFL |
| 霞鹜文楷（LXGW WenKai） | 楷体 / 手写风 | OFL |
| 阿里巴巴普惠体 3.0 | 专业商务 | 阿里免费商用授权 |
| 得意黑（Smiley Sans） | 现代斜体风格 | OFL |
| 思源黑体 细体（Light） | 轻盈清爽 | OFL |
| 思源黑体 中黑（Medium） | 稳重醒目 | OFL |
| 思源黑体 巨黑（Black） | 厚重有力 | OFL |
| 思源柔黑（Resource Han Rounded） | 圆角思源黑体 | OFL |

英文字体（4 款，另有「跟随中文字体」默认选项）：

| 字体 | 说明 | 许可 |
|---|---|---|
| Source Sans 3 | 思源无衬线（与思源黑体同族） | OFL |
| Source Serif 4 | 思源衬线（与思源宋体同族） | OFL |
| Source Code Pro | 思源等宽（代码友好） | OFL |
| Google Sans Code | 现代无衬线 / 代码友好 | OFL |

> 字体文件位于 `public/fonts/`；预览端通过 `@font-face` 按需加载所选字体，PDF 导出与预览一致（所见即所得）。英文使用所选英文字体，中文自动回退到所选中文字体。

### 硅基流动模型

- **文本生成**：`deepseek-ai/DeepSeek-V3.2`（默认，中文质量高、非思考型稳定输出）
- **文本备用**：`Qwen/Qwen2.5-7B-Instruct`（失败自动降级）
- **OCR 识别**：`Qwen/Qwen3-VL-8B-Instruct`（简历图片 / PDF 结构化提取）

---

## 📁 项目结构

```
resume-builder/
├── public/
│   ├── fonts/                    # 内嵌中英文字体（预览 webfont + PDF 中文渲染）
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
- 思源黑体（含细体/中黑/巨黑）/ 思源宋体 / 思源柔黑（Resource Han Rounded）/ 霞鹜文楷 / 得意黑：SIL Open Font License 1.1（OFL）
- Source Sans 3 / Source Serif 4 / Source Code Pro / Google Sans Code：SIL Open Font License 1.1（OFL）
- 阿里巴巴普惠体 3.0：阿里巴巴普惠体免费商用授权

---

## 🙏 致谢

- [reactive-resume](https://github.com/amruthpillai/reactive-resume) · [open-resume](https://github.com/xitanggg/open-resume) · [resume-builder](https://github.com/sadanandpai/resume-builder) 等项目的技术方案参考
- [SiliconFlow 硅基流动](https://siliconflow.cn) 提供大模型 API
- [Noto CJK](https://github.com/notofonts/noto-cjk) · [Resource Han Rounded](https://github.com/CyanoHao/Resource-Han-Rounded) · [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) · [Smiley Sans](https://github.com/atelier-anchor/smiley-sans) · [阿里巴巴普惠体](https://puhuiti.taobao.com) · [Adobe Source Sans / Serif / Code Pro](https://github.com/adobe-fonts) · [Google Sans Code](https://github.com/googlefonts/googlesans-code) 字体项目
