# kayaergin.com

Personal site: a static Windows 95-style desktop on large screens, and a simple list on small ones.

## Run locally

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:45950](http://127.0.0.1:45950)

```bash
npm run build
npm run preview
```

`npm run build` writes a static `dist/` folder. That is the only deploy artifact.

## Add a project

Drop a markdown file in `content/projects/`. Filename becomes the slug (`dinnerparty.md` → `dinnerparty`).

```markdown
---
title: My Project
description: One line only.
github: https://github.com/you/repo
url: https://optional.example
image: /projects/my-project.png
---

Optional notes. The terminal can `cat` this file.
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Shown in the Projects window |
| `description` | yes | One line |
| `github` | no | Repo link |
| `url` | no | Live site |
| `image` | no | File under `public/` (for example `public/projects/foo.png` → `/projects/foo.png`) |

Files whose names start with `_` are ignored. Restart or let Vite hot-reload after adding a file.

The Terminal window uses the same files as a virtual filesystem (`ls`, `cd`, `cat`, `open`).

## Deploy to Cloudflare Pages

1. Push this repo to Git.
2. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** `22` (set `NODE_VERSION=22` if needed)
4. Custom domain: **Custom domains → Set up a domain** → `kayaergin.com` (and `www` if you want it). Point DNS to Cloudflare. Pages will issue the certificate.

Local production check:

```bash
npm run build
npx wrangler pages dev dist
```

Or upload `dist/` with `npx wrangler pages deploy dist`.
