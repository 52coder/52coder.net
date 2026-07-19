---
title: AstroPaper 博客本地构建与 Vercel 部署实录
author: 52coder
pubDatetime: 2026-07-19T10:00:00+08:00
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

本站基于 [AstroPaper](https://github.com/satnaing/astro-paper) 主题（Astro + TailwindCSS，静态站点），部署在 Vercel。这篇文章把「本地把项目跑起来 → 构建静态产物 → 推送触发 Vercel 部署」这条链路完整记录一遍，重点是中间**实际踩到的几个坑**，方便换机器或有人接手时照着走。

技术栈一句话：

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

### 2. 安装 pnpm —— 注意 corepack 的坑

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

pnpm 10+ 出于安全默认**拦截依赖的 `postinstall`/构建脚本**，安装完你会看到类似：

```text
Ignored build scripts: @tailwindcss/oxide, esbuild, sharp
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
```

这几个包（`sharp` 处理图片、`esbuild`/`@tailwindcss/oxide` 是原生模块）**必须执行脚本编译原生二进制**，不放行的话后续 `pnpm run build` 会直接失败。放行方式：

```bash
pnpm approve-builds   # 交互式，空格选中这几个包，回车确认
pnpm install          # 重新安装，让被批准的脚本真正执行
```

`approve-builds` 会把白名单写进 `pnpm-workspace.yaml`：

```yaml
# pnpm-workspace.yaml
allowBuilds:
  '@tailwindcss/oxide': true
  esbuild: true
  sharp: true
```

> **务必把 `pnpm-workspace.yaml` 提交进仓库**。否则 CI / Vercel 上的 pnpm 会遇到同样的拦截，导致线上构建失败。

## 三、本地开发与构建

常用命令（都在项目根目录跑）：

| 命令 | 作用 |
| --- | --- |
| `pnpm run dev` | 起开发服务器，`localhost:4321`，热更新 |
| `pnpm run build` | 生产构建：`astro check`（类型检查）+ `astro build` + `pagefind` 建搜索索引，产物在 `dist/` |
| `pnpm run preview` | 本地预览 `dist/` 里的生产产物（和线上一致） |
| `pnpm run lint` | ESLint 检查（`no-console` 是 error） |

本仓库没有测试套件，**`astro check`（包含在 `build` 里）就是正确性关卡**。判断一次改动是否 OK，跑：

```bash
pnpm run build     # 走完整流程，0 error 才算过
pnpm run preview   # 起本地服务器验证真实产物
```

## 四、草稿（draft）的可见性 —— 一个容易误解的点

新文章的 frontmatter 里有 `draft` 字段。关于它的可见性，结论先行：

> **`draft: true` 的文章在任何环境都看不到，本地 `pnpm run dev` 也不例外。**

原因在两处：

- **列表层**（`src/utils/postFilter.ts`）：`!data.draft && ...` —— 草稿从首页、标签、归档全部剔除。
- **路由层**（`src/pages/posts/[...slug]/index.astro` 的 `getStaticPaths`）：只给 `!data.draft` 的文章生成页面，**草稿根本没有 URL**，直接访问会 404。

一个常见误区：`postFilter` 里那个 `import.meta.env.DEV` 的「开发模式豁免」**只对「未来发布时间」生效，对 draft 不生效**。对照表：

| 情况 | 生产环境 | 本地 `pnpm run dev` |
| --- | --- | --- |
| `draft: true` | 看不到（404） | 一样看不到（404） |
| `draft: false` + 未来 `pubDatetime` | 到点前隐藏 | **能看到**（dev 豁免日期检查） |

**想预览一篇草稿**：没有内置草稿预览路由，只能临时把 `draft: true` 改成 `false`（或删掉这行，该字段可选），`pnpm run dev` 看完再改回去。因为 dev 会豁免日期检查，预览时不用管 `pubDatetime` 是不是未来。

## 五、部署到 Vercel

### 1. 推送即部署

仓库已接入 Vercel，**推送到 `main` 分支就会自动触发构建部署**，不需要额外操作：

```bash
git add <改动文件>
git commit -m "..."
git push origin main   # 触发 Vercel 自动构建
```

构建成功后，`draft: false` 的文章上线。是否成功、构建日志可以在 **[vercel.com](https://vercel.com) → 项目 → Deployments** 里直接看 —— 这是**零折腾**的方式，不依赖任何 CLI。

### 2. 安装 Vercel CLI（可选，命令行盯部署）

```bash
npm i -g vercel
vercel --version
```

安装时可能看到一条 `allow-scripts` 警告说 `esbuild` 的 `postinstall` 被拦。若之后要用 `vercel dev`/`vercel build`（本地用 esbuild 打包），放行即可；只用 `vercel ls`/`logs` 看部署则无所谓：

```bash
npm i -g --allow-scripts=esbuild vercel
```

## 六、重点坑：Vercel CLI 在本地代理下 `fetch failed`

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

原生 fetch **通**，但 Vercel CLI **不通**，且 token 认证和 OAuth 登录**两种都一样失败** —— 说明问题不在认证，在 CLI 的 HTTP 请求层。根因：

> **Node 原生 `fetch()` 默认不读 `http_proxy`/`https_proxy` 环境变量**（所以直连成功）；而 **Vercel CLI 的 `@vercel/fetch` 会读代理变量**（通过 proxy-agent 走本地代理）。这层 proxy-agent 在较新的 Node（如 Node 26）上与代理组合会 `fetch failed`。

用 curl 对比可进一步确认（代理和直连其实都能到 Vercel，问题纯在 CLI 那层 proxy-agent）：

```bash
curl -s -o /dev/null -w "%{http_code}\n" --proxy http://127.0.0.1:2080 https://api.vercel.com/v2/user   # 走代理
curl -s -o /dev/null -w "%{http_code}\n" --noproxy '*'                    https://api.vercel.com/v2/user   # 直连
```

### 解法：让 vercel 命令绕开代理直连

既然直连 Vercel 完全通，最干净的办法是让 vercel **不走代理**：

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

> 若绕开代理后**仍** `fetch failed`，那才是 Node 版本本身太新，装一个 Vercel 支持的 LTS：
> `brew install node@22`，再 `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` 用它跑 vercel。

## 七、认证：alias 不能替代 token/login

要分清：

- **alias 解决「网络」** —— 绕开坏掉的代理直连。
- **token / `vercel login` 解决「认证」** —— 证明你是谁。

两者无关。绕开代理后网络通了，但仍需认证信息。二选一持久化：

- **推荐 `vercel login`**：代理绕开后登录能成，凭证存到本地配置目录，之后**任何新终端直接 `vercel ls` 即可，不用 token、不用每次 export**。
- **或固化 token**：`export VERCEL_TOKEN=xxx` 写进 `~/.zshrc`。能用，但**密钥明文进 dotfile 有泄露风险**，不如 login。

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

## 小结

整条链路本身很顺（Astro + Vercel 的组合几乎零配置），真正耗时间的都是**环境层面的坑**：Node 新版本不带 corepack、pnpm 默认拦构建脚本、草稿在 dev 也不显示、以及本地代理让 Vercel CLI `fetch failed`。把这些记下来，下次换机器照着走一遍即可。
