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
- `src/utils/postFilter.ts` decides post visibility: `!data.draft && (import.meta.env.DEV || isPublishTimePassed)`. Two distinct gates, and the dev bypass only applies to the second one:
  - **`draft: true` hides a post everywhere, including `pnpm run dev`.** On top of the listing filter, `getStaticPaths` in `src/pages/posts/[...slug]/index.astro` filters `!data.draft` directly, so a draft gets *no route generated at all* — its URL 404s. To preview a draft you must flip `draft` to `false`; there is no draft-preview route.
  - **A future `pubDatetime` (minus `SITE.scheduledPostMargin`, 15 min) only hides the post from listings** (home, post list), and dev mode shows it anyway. Two consequences worth knowing: (1) because this is a *static* site the filter is evaluated at build time, so a scheduled post does **not** appear on its own when the time arrives — a rebuild must be triggered after that moment; (2) scheduled posts still appear in `archives/`, still have a working direct URL, and are still listed in `sitemap.xml`, since those paths only filter `draft`. So `pubDatetime` is a listing-order tool, not a way to keep content unseen — use `draft: true` for that.
- Posts can live in nested subdirectories under `src/data/blog/`; `src/utils/getPath.ts` derives each post's URL by stripping the blog base path, slugifying each directory segment, and dropping any `_`-prefixed segments — this is the single source of truth for post URLs, used by listings, prev/next links, and RSS/sitemap.
- **Post images go in `src/assets/images/posts/<post-slug>/`** — one directory per post, named exactly after that post's frontmatter `slug`. The `src/assets/images/` root is reserved for site-wide/shared assets (e.g. `forrest-gump-quote.png`, the common fallback `ogImage`). Keeping the directory name equal to the slug makes image→post ownership mechanically derivable: orphaned image directories can be found by diffing directory names against post slugs, rather than relying on memory. Reference images as `@/assets/images/posts/<slug>/foo.png` in body Markdown, but note the `ogImage` frontmatter field needs a *relative* path (`../../assets/images/posts/<slug>/foo.png`) — a repo-wide search for the old path after moving images must cover both forms. Astro's image pipeline rewrites these to responsive WebP with `srcset` at build time, so built HTML references `.webp` under `/_astro/`, not the original `.png`.
- `src/utils/getSortedPosts.ts`, `getPostsByTag.ts`, `getUniqueTags.ts`, `getPostsByGroupCondition.ts` implement listing/tag/archive views on top of the filtered collection.

#### Writing Chinese Markdown: `**bold**` breaks next to full-width punctuation

Posts are mostly Chinese, and CommonMark's emphasis [flanking rules](https://spec.commonmark.org/0.31.2/#left-flanking-delimiter-run) interact badly with CJK punctuation. A `**` marker only works when it is adjacent to a *letter*; put it next to punctuation such as `（）「」“”，。` and the emphasis silently fails to parse, rendering the literal asterisks on the page. The build does **not** warn — `astro check` passes and the page ships with visible `**`.

Both ends can fail independently:

```markdown
答案藏在**盘口（Order Book）**里：      <!-- BROKEN: closing ** preceded by `）`, followed by a letter -->
答案藏在**盘口**（Order Book）里：      <!-- OK: closing ** now preceded by `口` -->

这个**“不作为的绝大多数时间”，…原因**   <!-- BROKEN: opening ** followed by `“`, preceded by a letter -->
**这个“不作为的绝大多数时间”，…原因**   <!-- OK: opening ** now followed by `这` -->
```

Rule of thumb when authoring: **keep at least one side of each `**` touching a Han character or letter — never let it sit between two punctuation marks.** The usual fixes are to move a parenthetical outside the emphasis, or to pull the preceding word inside it.

To find every occurrence across the site, don't reason about the rule — grep the *built* output for surviving literal asterisks (code blocks legitimately contain `***`, so filter those out):

```bash
grep -o '[^<>]\{0,20\}\*\*[^<>*]\{1,40\}\*\*' dist/posts/*/index.html | grep -v '\*\*\*\*'
```

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
