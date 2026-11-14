# AGENTS.md

This file provides guidance to AI coding agents working in this repository. It describes the current 52coder blog, not just the upstream AstroPaper template.

## Project overview

This is the personal technical blog behind `https://52codernet.vercel.app/`. It is based on AstroPaper 5.5.0 and contains mostly Chinese technical writing about C/C++, MySQL, distributed systems, quantitative trading, and developer tools. The site is statically generated; there is no application server or database in the production runtime.

The main stack is:

- Astro 5 with TypeScript in strict mode
- Tailwind CSS 4 through `@tailwindcss/vite`
- Markdown content collections with Zod validation
- Pagefind for static client-side search
- Shiki for syntax highlighting and Mermaid for browser-rendered diagrams
- Satori and `@resvg/resvg-js` for generated Open Graph images
- pnpm for dependency management
- Vercel for the documented production deployment

`README.md` is primarily the upstream AstroPaper documentation. Site-specific behavior is implemented in `src/`, documented in `CLAUDE.md`, and described operationally in `src/data/blog/AstroPaper博客本地构建与Vercel部署实录.md`.

## Repository layout

- `src/data/blog/`: blog posts as Markdown. Current posts are directly in this directory, although nested paths are supported.
- `src/assets/icons/`: SVG icons imported by Astro components.
- `src/assets/images/`: shared and older post images.
- `src/assets/images/posts/<post-slug>/`: current convention for images owned by one post.
- `src/components/`: reusable Astro UI components, including cards, navigation, pagination, sharing, comments, and Mermaid support.
- `src/layouts/`: page shells. `Layout.astro` owns the HTML head and global metadata; `Main.astro` wraps standard page content; `PostDetails.astro` renders full posts.
- `src/pages/`: file-based routes and static endpoints.
- `src/styles/`: Tailwind theme, global styles, and article typography.
- `src/utils/`: collection filtering, URL generation, tag/archive helpers, OG image generation, and the custom Shiki filename transformer.
- `public/`: files served as-is, including the favicon, default OG image, and early theme script.
- `scripts/generate-transformer-diagrams.mjs`: standalone generator for the Transformer article's PNG diagrams.
- `astro.config.ts`: Astro, sitemap, Markdown/Shiki, Vite, image, and environment configuration.
- `src/config.ts`: central `SITE` configuration.
- `src/content.config.ts`: blog collection loader and frontmatter schema.
- `src/constants.ts`: social and sharing links.

Generated or local directories such as `dist/`, `.astro/`, `node_modules/`, `public/pagefind/`, and `.vercel/` are ignored. Do not hand-edit generated output.

## Install, develop, build, and check

Run commands from the repository root. The lockfile and scripts use pnpm.

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run preview
```

- `pnpm run dev` starts Astro's development server, normally at `http://localhost:4321`.
- `pnpm run build` is the complete production build. It runs `astro check`, `astro build`, `pagefind --site dist`, and then copies `dist/pagefind` into `public/pagefind`. Use this full command rather than only `astro build`; it performs type checking and creates the search index.
- `pnpm run preview` serves the existing production build. Re-run the build after changing content or code before previewing those changes.
- Search needs a completed build at least once before its development-mode UI can show results.

Additional commands:

```bash
pnpm run sync          # Regenerate Astro/content-collection types
pnpm run lint          # ESLint
pnpm run format:check  # Check formatting without changing files
pnpm run format        # Format with Prettier
```

Run `pnpm run sync` after changing the collection schema or adding frontmatter fields. The project does not declare a Node.js engine or pin a package-manager version in `package.json`; the Docker build uses Node LTS and activates pnpm through Corepack.

`pnpm-workspace.yaml` allows dependency build scripts for `@tailwindcss/oxide`, `esbuild`, and `sharp`. Keep this file when changing installation or native-dependency behavior.

## Testing and verification

There is no automated unit, integration, or end-to-end test suite, no `test` package script, and no GitHub Actions workflow. `astro check`, which is included in `pnpm run build`, is the main correctness gate.

For changes to code or content:

1. Run `pnpm run lint` for lint-sensitive changes.
2. Run `pnpm run format:check` or format only the files you intentionally changed.
3. Run `pnpm run build` and require it to finish without errors.
4. Use `pnpm run preview` to inspect the real generated pages when the change affects rendering, routing, images, metadata, search, or client-side behavior.

Manual checks are especially important for accessibility, light/dark mode, mobile navigation, page transitions, Mermaid diagrams, and Markdown rendering because none of these has automated coverage. Dynamic OG generation downloads fonts from Google during the build, so network failures from `fonts.googleapis.com` are build-environment issues rather than Markdown validation errors.

## Content model and authoring conventions

### Frontmatter

`src/content.config.ts` loads `src/data/blog/**/[^_]*.md` with Astro's glob loader. A Markdown filename beginning with `_` is excluded by that pattern. The Zod schema defines:

- Required: `title`, `pubDatetime`, and `description`.
- Defaulted: `author` defaults to `SITE.author`; `tags` defaults to `["others"]`.
- Optional: `modDatetime`, `featured`, `draft`, `ogImage`, `canonicalURL`, `hideEditPost`, and `timezone`.

Current posts also set an explicit `slug` in frontmatter. Astro's loader uses it for the entry ID; it is not a field in the Zod object. Add new frontmatter fields to the schema when they are intended to become part of `post.data`.

Use a `## Table of contents` heading when a post should use the existing `remark-toc`/`remark-collapse` pipeline. The VS Code snippets in `.vscode/astro-paper.code-snippets` provide the expected frontmatter and article skeleton.

### Filenames, slugs, and URLs

The repository convention is that a post's Markdown filename matches its human-readable `title`. Filenames may contain Chinese characters, spaces, or `+`. This is for source-tree readability and does not determine the URL.

Use a stable, short English kebab-case `slug` for the URL and for the post's image directory. Do not casually change an existing slug: it changes the public URL and breaks links to that post. Renaming only the Markdown file does not change the URL.

`src/utils/getPath.ts` is the single URL-construction helper. It removes the Markdown filename from the path, slugifies directory segments, omits `_`-prefixed directory segments, and uses the final entry-ID segment as the URL leaf. Listings, post routes, previous/next links, and RSS use this helper; preserve that convention when adding related functionality.

### Drafts and scheduled posts

Visibility has two separate gates in `src/utils/postFilter.ts`:

- `draft: true` hides a post in both development and production. `src/pages/posts/[...slug]/index.astro` also excludes drafts from `getStaticPaths`, so no post route is generated. There is no special draft-preview route; temporarily set `draft` to `false` to preview one.
- A future `pubDatetime`, adjusted by the 15-minute `SITE.scheduledPostMargin`, is hidden from sorted listings in production but shown in development.

Scheduling is evaluated at build time. A scheduled post does not automatically enter listings when its time arrives; the site must be rebuilt. Future-dated non-draft posts can still have direct routes and appear in archives and the sitemap because those paths only exclude drafts. Do not use a future date to keep content private.

Posts are sorted by `modDatetime` when present, otherwise by `pubDatetime`.

### Images

For new post-specific images, use:

```text
src/assets/images/posts/<post-slug>/
```

Reference body images with `@/assets/images/posts/<post-slug>/<file>`. A local `ogImage` frontmatter value instead uses a path relative to the Markdown file, normally `../../assets/images/posts/<post-slug>/<file>` for a top-level post. Remote URLs and local image assets are both accepted. Existing shared and older post images also remain directly under `src/assets/images/`.

### Chinese Markdown emphasis

CommonMark emphasis rules can leave literal `**` markers when bold delimiters touch full-width punctuation. The build does not warn about this. Keep at least one side of each delimiter next to a Han character or letter rather than placing it between punctuation marks.

For example, move a parenthetical outside the bold span:

```markdown
答案藏在**盘口**（Order Book）里：
```

After changing Chinese prose with bold text, inspect the rendered page. If necessary, search generated post HTML for surviving literal asterisks; code blocks can produce false positives.

## Rendering and runtime architecture

### Routes

`src/pages/` provides:

- `index.astro`: featured and recent posts on the home page.
- `posts/[...page].astro`: paginated post listings, using `SITE.postPerPage`.
- `posts/[...slug]/index.astro`: individual posts.
- `posts/[...slug]/index.png.ts`: per-post OG images when dynamic generation applies.
- `tags/index.astro` and `tags/[tag]/[...page].astro`: tag index and paginated tag listings.
- `archives/index.astro`: year/month archives, controlled by `SITE.showArchives`.
- `search.astro`: Pagefind UI.
- `about.md` and `404.astro`: static informational pages.
- `rss.xml.ts`, `robots.txt.ts`, and `og.png.ts`: generated static endpoints.

Astro's sitemap integration uses `SITE.website` as the canonical site URL. The base layout emits canonical, Open Graph, Twitter, RSS, and JSON-LD metadata.

### Browser-side behavior

Most HTML is produced at build time. Browser JavaScript adds view transitions, navigation state, light/dark mode, search, post reading progress, heading links, code-copy buttons, comments, and Mermaid diagrams. Existing components use Astro lifecycle events such as `astro:page-load` and `astro:after-swap`; preserve this behavior when changing scripts so features continue to work after client-side navigation.

`public/toggle-theme.js` runs early to prevent a theme flash, stores preference in `localStorage`, follows system theme changes, and emits `theme-change`. `src/components/Mermaid.astro` lazily imports Mermaid only when a diagram exists and rerenders diagrams when the theme changes. Giscus comments are configured directly in `src/components/PostComments.astro`.

### Search and OG images

Pagefind indexes the built `dist/` site. The build copies the generated index to `public/pagefind/` so subsequent development sessions can use it. Do not treat this copied index as source code.

A post's explicit `ogImage` takes precedence. Without one, `SITE.dynamicOgImage` enables a generated `/posts/.../index.png` using Satori, Resvg, and the templates in `src/utils/og-templates/`. The default site image and site-level OG endpoint are configured separately.

## Configuration and code style

- Edit `src/config.ts` for site identity, canonical URL, pagination, archive visibility, dynamic OG behavior, edit links, language, and timezone. The current global display timezone is `Asia/Bangkok`; a post can override it with `timezone`.
- Edit `src/constants.ts` for social and share providers, together with their SVG icons.
- Use the `@/*` alias for `src/*`, as configured in `tsconfig.json`, instead of introducing inconsistent deep relative imports.
- Tailwind 4 is configured in CSS, not a `tailwind.config.js`. Global colors, fonts, variants, and utilities live in `src/styles/global.css`; article and code-block styles live in `src/styles/typography.css`.
- Prettier uses two-space indentation, semicolons, double quotes, 80-column wrapping, LF line endings, and `arrowParens: "avoid"`. It includes Astro and Tailwind plugins and sorts Tailwind classes against `src/styles/global.css`; do not hand-maintain class ordering.
- ESLint combines the recommended TypeScript and Astro configurations. `no-console` is an error.
- Markdown processing uses `remark-toc`, `remark-collapse`, Shiki light/dark themes, notation transformers, and the custom `file="..."` code-block filename transformer in `src/utils/transformers/fileName.js`.
- `cz.yaml` configures Commitizen with conventional commits and semver metadata. Follow the repository's existing concise commit style when making requested commits.

## Standalone diagram generation

Regenerate only the Transformer article's original diagrams with:

```bash
node scripts/generate-transformer-diagrams.mjs
```

The script writes PNGs to `src/assets/images/posts/attention-is-all-you-need-explained/` and requires a locally available Chinese font such as PingFang SC or Microsoft YaHei. Setting `TRANSFORMER_DIAGRAM_REVIEW_DIR` additionally writes SVGs to that directory for inspection.

## Deployment

The documented production deployment is Vercel's Git integration. The `main` branch is the production branch, and pushing to it triggers a Vercel build. The public site URL used by Astro comes from `SITE.website`. Vercel CLI use is optional; deployment status and logs are available in the Vercel dashboard.

There is no `vercel.json` and no repository CI deployment workflow. Hosting behavior therefore comes from the Vercel project settings plus Astro's defaults.

Two Docker configurations are also present:

- `docker compose up -d` mounts the repository into a Node LTS container and runs the development server on port 4321.
- `Dockerfile` defines a multi-stage production build using Node LTS/pnpm, then copies `dist/` into an nginx Alpine image exposing port 80. The README documents `docker build -t astropaper .` and `docker run -p 4321:80 astropaper`.

## Security and local environment

- `.env*` files, including `.env.local`, are ignored and must not be committed or copied into documentation.
- The only environment variable declared in `astro.config.ts` is optional `PUBLIC_GOOGLE_SITE_VERIFICATION`. It is intentionally public client-side configuration, not a secret.
- Keep Vercel tokens and login credentials outside the repository. Use Vercel's normal login flow locally or injected credentials for automation.
- Build-time Google Fonts requests and browser-side Giscus/Mermaid/Pagefind behavior involve external or client-loaded resources; do not assume they provide a server-side backend.
- Preserve user changes and generated ignored files unless a task explicitly requires regenerating or removing them.
