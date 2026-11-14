---
title: AstroPaper 博客本地构建与 Vercel 部署实录
author: 52coder
pubDatetime: 2026-07-19T10:00:00+08:00
modDatetime: 2026-11-08T00:00:00+08:00
slug: astropaper-local-build-and-vercel-deploy
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - astro
  - vercel
  - pnpm
  - deployment
  - blog
description: 记录本站（基于 AstroPaper）从零搭建本地环境、构建静态站点到用 Vercel 部署的完整流程，含 pnpm 构建脚本放行、草稿可见性、Vercel CLI 在本地代理下 fetch failed 等一系列实际踩过的坑与解法。
---

![Forrest Gump Fake Quote](@/assets/images/forrest-gump-quote.png)

## Table of contents

## 前言

本站基于 [AstroPaper](https://github.com/satnaing/astro-paper) 主题（Astro + TailwindCSS，静态站点），部署在 Vercel。这篇文章把“本地把项目跑起来 → 构建静态产物 → 推送触发 Vercel 部署”这条链路完整记录一遍，重点是中间**实际踩到的几个坑**，方便换机器或有人接手时照着走。

这里涉及的组件：

- **框架**：Astro（内容为 `src/data/blog/**` 下的 Markdown）
- **包管理**：pnpm
- **搜索**：Pagefind（构建期生成静态索引）
- **部署**：Vercel（推送到 `main` 自动构建）

## 一、本地环境准备

### 1. 安装 Node.js

用 Homebrew 装即可：

```bash
brew install node
node -v   # 验证
npm -v
```

### 2. 安装 pnpm

官方文档常让你用 corepack 启用 pnpm：

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

但 **Node.js 从 25 版本起不再随核心自带 corepack**，新版 Homebrew node 上直接跑会报 `command not found: corepack`。两种解法二选一：

```bash
# 方案 A（最简单）：直接用 npm 全局装 pnpm
npm install -g pnpm

# 方案 B：先把 corepack 单独装回来，再用它
npm install -g corepack
corepack enable
corepack prepare pnpm@latest --activate
```

验证：

```bash
pnpm -v
```

## 二、安装依赖与构建脚本放行

### 1. 安装依赖

```bash
pnpm install
```

### 2. 放行原生包的构建脚本

pnpm 10 起改变了依赖构建脚本的默认执行策略；使用相应版本时，安装后可能看到类似提示：

```text
Ignored build scripts: @tailwindcss/oxide, esbuild, sharp
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
```

这些包包含原生组件，但不一定每次安装都要在本机编译，也可能使用预编译产物。如果构建提示缺少所需组件，先查看安装日志，只批准项目需要且来源明确的脚本：

```bash
pnpm approve-builds   # 交互式，空格选中这几个包，回车确认
pnpm install          # 重新安装，让被批准的脚本真正执行
```

批准结果保存在 `pnpm-workspace.yaml`。本站当前使用 `allowBuilds`；pnpm 10 的文档使用 `onlyBuiltDependencies`，字段应与包管理器版本配套，不能直接混用。参见 [当前文档](https://pnpm.io/cli/approve-builds)和 [pnpm 10 文档](https://pnpm.io/10.x/cli/approve-builds)。

本站配置示例：

```yaml
# pnpm-workspace.yaml
allowBuilds:
  "@tailwindcss/oxide": true
  esbuild: true
  sharp: true
```

将所需的构建许可随 `pnpm-workspace.yaml` 提交，并让本地和部署环境使用一致的 pnpm 版本，减少两边安装行为不同的问题。

## 三、本地开发与构建

常用命令（都在项目根目录跑）：

| 命令               | 作用                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `pnpm run dev`     | 起开发服务器，`localhost:4321`，热更新                                                     |
| `pnpm run build`   | 生产构建：`astro check`（类型检查）+ `astro build` + `pagefind` 建搜索索引，产物在 `dist/` |
| `pnpm run preview` | 本地预览 `dist/` 的静态构建结果，托管平台的路由等配置还需线上核对                          |
| `pnpm run lint`    | ESLint 检查（`no-console` 是 error）                                                       |

本仓库没有测试套件，**`astro check`（包含在 `build` 里）就是正确性关卡**。判断一次改动是否 OK，跑：

```bash
pnpm run build     # 走完整流程，0 error 才算过
pnpm run preview   # 起本地服务器验证真实产物
```

### 预览博客的最短步骤

```bash
pnpm run build
pnpm run preview
```

打开终端显示的地址，通常是 `http://localhost:4321`。`preview` 不会重新编译 Markdown；改完文章后需要再运行 `build`。写作时用 `pnpm run dev` 更方便，可以随保存刷新。搜索索引则由完整构建生成。

如果构建停在 `fonts.googleapis.com` 的网络错误，先检查字体请求的连通性。本站构建会读取在线字体，不能把这类失败误判为 Markdown 写错了。

## 四、草稿和未来发布时间的区别

新文章的 frontmatter 里有 `draft` 字段。在本站，`draft` 同时影响列表与页面生成：

> **`draft: true` 的文章在任何环境都看不到，本地 `pnpm run dev` 也不例外。**

原因在两处：

- **列表层**（`src/utils/postFilter.ts`）：`!data.draft && ...`，草稿从首页、标签、归档全部剔除。
- **路由层**（`src/pages/posts/[...slug]/index.astro` 的 `getStaticPaths`）：只给 `!data.draft` 的文章生成页面，**草稿根本没有 URL**，直接访问会 404。

一个常见误区：`postFilter` 里那个 `import.meta.env.DEV` 的“开发模式豁免”**只对“未来发布时间”生效，对 draft 不生效**。对照表：

| 情况                                 | 生产构建                                               | 本地 `pnpm run dev` |
| ------------------------------------ | ------------------------------------------------------ | ------------------- |
| `draft: true`                        | 不生成文章页面，直接访问 404                           | 同样不生成页面      |
| `draft: false`，尚未达到发布时间判定 | 首页、普通列表可隐藏；直接链接、归档和站点地图仍可访问 | 列表也会显示        |

本站的发布时间判定还包含 `scheduledPostMargin` 配置，当前为 15 分钟。由于站点是静态构建，到时间后需要重新构建，列表才会变化。未来日期不能用来保密文章；暂不发布的内容应保留 `draft: true`。

**想预览一篇草稿**：没有内置草稿预览路由，只能临时把 `draft: true` 改成 `false`（或删掉这行，该字段可选），`pnpm run dev` 看完再改回去。因为 dev 会豁免日期检查，预览时不用管 `pubDatetime` 是不是未来。

## 五、部署到 Vercel

### 1. 推送即部署

本站按 Git 集成方式连接 Vercel，并将 `main` 设为生产分支。在这些配置生效的前提下，推送会触发自动构建：

```bash
git add <改动文件>
git commit -m "..."
git push origin main   # 触发 Vercel 自动构建
```

构建成功后，`draft: false` 的文章上线。是否成功、构建日志可以在 **[vercel.com](https://vercel.com) → 项目 → Deployments** 里直接看，可以在那里检查，不必先安装 CLI。

### 2. 安装 Vercel CLI（可选，命令行盯部署）

```bash
npm i -g vercel
vercel --version
```

安装时可能看到一条 `allow-scripts` 警告说 `esbuild` 的 `postinstall` 被拦。若之后要用 `vercel dev`/`vercel build`（本地用 esbuild 打包），放行即可；只用 `vercel ls`/`logs` 看部署则无所谓：

```bash
npm i -g --allow-scripts=esbuild vercel
```

## 六、排查 Vercel CLI 在本地代理下 `fetch failed`

如果你机器上配了本地代理（`~/.zshrc` 里 `export http_proxy=http://127.0.0.1:xxxx` 这类），大概率会撞到这个：

```text
vercel login   # 或 vercel ls / vercel link
Error: An unexpected error occurred in login: TypeError: fetch failed
```

### 排查过程

先分清是**网络**还是**认证**问题。用 Node 原生 fetch 测 Vercel 连通性：

```bash
node -e "fetch('https://api.vercel.com/v2/user').then(r=>console.log('HTTP',r.status)).catch(e=>console.log('ERR',e.cause?.code||e.message))"
# 输出 HTTP 403 → 连得通（403 只是没带认证）
```

这次记录中，Node 原生 fetch 成功，而 CLI 的两种认证路径都失败。它说明应继续比较请求路径，但还不足以证明一定是某个 Node 版本或代理库的缺陷。

Node 是否使用环境代理，与版本和启动选项有关；支持的版本可通过 `--use-env-proxy` 等设置启用，不能笼统地说 fetch 永远不读代理变量。参见 [Node 代理选项](https://nodejs.org/api/cli.html#--use-env-proxy)。

用 curl 分别测试直连和代理，再查看 CLI 错误的 `cause`、HTTP 状态和调试日志：

```bash
curl -s -o /dev/null -w "%{http_code}\n" --proxy http://127.0.0.1:2080 https://api.vercel.com/v2/user   # 走代理
curl -s -o /dev/null -w "%{http_code}\n" --noproxy '*'                    https://api.vercel.com/v2/user   # 直连
```

### 解法：让 vercel 命令绕开代理直连

如果对照测试确认直连可用，可以先只对这一条命令清除代理环境变量：

```bash
env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY vercel ls
```

验证可用后，把它固化成 alias 追加到 `~/.zshrc`，以后 `vercel ...` 自动直连：

```bash
# Vercel CLI 的 proxy-agent 在新版 Node 上与本地代理不兼容（fetch failed），
# 直连 Vercel 可用，故让 vercel 命令绕开 http(s)_proxy
alias vercel='env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY vercel'
```

（`no_proxy` 里已包含 `127.0.0.1,localhost`，本地 `vercel dev` 不受影响。）

清除代理变量后仍失败，就继续检查 DNS、TLS、网络出口和服务端响应。也可以换到项目与 Vercel CLI 支持的 Node LTS 版本做对照，但不能只凭 `fetch failed` 判断“Node 太新”。系统级代理或透明代理也不一定受这些环境变量控制。

## 七、认证：alias 不能替代 token/login

要分清：

- **alias 解决“网络”**，绕开坏掉的代理直连。
- **token / `vercel login` 解决“认证”**，证明你是谁。

两者无关。绕开代理后网络通了，但仍需认证信息。二选一持久化：

- **推荐 `vercel login`**：代理绕开后登录能成，凭证存到本地配置目录，之后**任何新终端直接 `vercel ls` 即可，不用 token、不用每次 export**。
- **自动化环境使用 token**：由 CI 的凭证配置注入，避免把真实 token 写进博客、项目文件或提交记录。

登录/认证好之后，常用命令：

```bash
vercel ls               # 部署列表与状态（Building / Ready / Error）
vercel logs <部署URL>   # 构建/运行日志
vercel inspect <部署URL> # 部署详情
vercel --prod           # 手动部署到生产
vercel dev              # 本地模拟 Vercel 环境
```

## 八、一页速查

```bash
# —— 环境 ——
brew install node
npm install -g pnpm

# —— 依赖（首次遇到 Ignored build scripts 时）——
pnpm install
pnpm approve-builds     # 放行 sharp/esbuild/@tailwindcss/oxide，提交 pnpm-workspace.yaml
pnpm install

# —— 开发 / 构建 ——
pnpm run dev            # localhost:4321
pnpm run build          # astro check + build + pagefind，产物 dist/
pnpm run preview        # 预览生产产物

# —— 部署 ——
git push origin main    # 触发 Vercel 自动构建

# —— Vercel CLI（本地有代理时）——
npm i -g vercel
alias vercel='env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY vercel'
vercel login
vercel ls
```

## 部署后检查

打开一篇新文章，确认图片和内部链接正常，再用站内搜索找一个正文关键词。首页出现文章、文章直链可访问、搜索能命中是三个不同的检查点；只看到构建成功，还不能替代这些页面检查。
