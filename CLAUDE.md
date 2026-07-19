# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is a personal tech blog (52coder.net) built on the **AstroPaper** Astro theme, deployed as a static site (Vercel per `astro.config.ts`'s `SITE.website`, with an alternative Docker/nginx deployment path via `Dockerfile`/`docker-compose.yml`). Content is primarily Chinese-language technical writing (C++, MySQL, quant trading, distributed systems, etc.) stored as Markdown in `src/data/blog/`.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`).

- `pnpm install` — install dependencies
- `pnpm run dev` — start dev server at `localhost:4321`
- `pnpm run build` — runs `astro check && astro build && pagefind --site dist`, then copies the generated pagefind index into `public/pagefind`. Always run this (not just `astro build`) before considering a change complete, since it also type-checks and rebuilds search.
- `pnpm run preview` — preview the production build locally
- `pnpm run sync` — regenerate Astro's content-collection types (run after changing `src/content.config.ts` or adding new frontmatter fields)
- `pnpm run lint` — ESLint (astro + typescript-eslint configs; `no-console` is an error)
- `pnpm run format` / `pnpm run format:check` — Prettier (with `prettier-plugin-astro` and `prettier-plugin-tailwindcss`; Tailwind classes are auto-sorted against `src/styles/global.css`)

There is no test suite in this repo; `astro check` (part of `build`) is the correctness gate.

Docker alternative: `docker compose up -d` for dev, or `docker build -t astropaper . && docker run -p 4321:80 astropaper` for a production-style build served by nginx.

## Architecture

### Content pipeline
- Blog posts are Markdown files under `src/data/blog/**`, loaded via the `glob` loader in `src/content.config.ts` (pattern `**/[^_]*.md` — files/dirs prefixed with `_` are excluded from the collection, useful for drafts-in-progress or non-post assets).
- Frontmatter schema (author, pubDatetime, modDatetime, title, featured, draft, tags, ogImage, description, canonicalURL, hideEditPost, timezone) is validated by the zod schema in `content.config.ts`. New frontmatter fields must be added there.
- `src/utils/postFilter.ts` decides post visibility: drafts are always excluded from production, and posts with a future `pubDatetime` (minus `SITE.scheduledPostMargin`) are hidden until their scheduled time — except in dev mode, where everything shows.
- Posts can live in nested subdirectories under `src/data/blog/`; `src/utils/getPath.ts` derives each post's URL by stripping the blog base path, slugifying each directory segment, and dropping any `_`-prefixed segments — this is the single source of truth for post URLs, used by listings, prev/next links, and RSS/sitemap.
- `src/utils/getSortedPosts.ts`, `getPostsByTag.ts`, `getUniqueTags.ts`, `getPostsByGroupCondition.ts` implement listing/tag/archive views on top of the filtered collection.

### Rendering & layouts
- `src/layouts/Layout.astro` is the base HTML shell (head, meta/OG tags, theme script); `src/layouts/Main.astro` wraps page content; `src/layouts/PostDetails.astro` renders a single post (title, datetime, edit-on-GitHub link, rendered `<Content />`, comments, tags, share links, prev/next navigation) and injects client-side `<script>` behavior for the scroll progress bar, heading anchor links, and code-block copy buttons.
- `src/pages/` maps directly to routes: `posts/[...page].astro` (paginated post list), `posts/[...slug]/index.astro` (single post) and its sibling `index.png.ts` (per-post OG image), `tags/[tag]/[...page].astro`, `archives/index.astro`, `search.astro` (Pagefind UI), plus `rss.xml.ts`, `robots.txt.ts`, and top-level `og.png.ts` (default OG image).
- OG images are generated dynamically with `satori`/`@resvg/resvg-js` via `src/utils/generateOgImages.ts` and the JSX-like templates in `src/utils/og-templates/` (`post.js`, `site.js`); `SITE.dynamicOgImage` in `src/config.ts` toggles this, falling back to a per-post `ogImage` frontmatter field (local asset or remote URL) when present.
- Comments use **giscus** (`src/components/PostComments.astro`), configured inline with a hardcoded repo/category/theme — update that file directly if the giscus discussion category changes.
- Search is static, generated at build time by **Pagefind** (`pagefind --site dist`, output copied to `public/pagefind`) and surfaced through `src/pages/search.astro`.

### Configuration
- `src/config.ts` (`SITE` object) is the central site-wide config: site URL, author, pagination size, dynamic OG toggle, edit-post link, timezone, etc. Most cross-cutting behavior toggles live here rather than being scattered across components.
- `src/constants.ts` defines `SOCIALS` (site social links) and `SHARE_LINKS` (per-post share buttons) — edit here to add/remove a social or share provider, alongside its icon in `src/assets/icons/`.
- Path alias `@/*` → `src/*` (see `tsconfig.json`), used throughout instead of relative imports.
- Markdown processing (in `astro.config.ts`) uses `remark-toc` + `remark-collapse` for the table of contents, and Shiki with custom transformers (`src/utils/transformers/fileName.js` for code-block filenames, plus diff/highlight/word-highlight notation) for syntax highlighting.

### Styling
- TailwindCSS v4 via the Vite plugin (`@tailwindcss/vite`), configured through `src/styles/global.css` rather than a `tailwind.config.js`. Prettier auto-sorts classes against that stylesheet, so don't hand-order Tailwind classes.
