# Recipe Inventory — deploy & save setup

## Project layout

```
.
├── index.html, script.js, styles.css   # frontend
├── *.json                              # bundled fallback (GitHub repo root is source of truth)
├── wrangler.toml
├── worker.js, wrangler.worker.toml
├── _lib/server.js                      # shared server code
└── functions/                          # Cloudflare Pages Functions (required folder name)
    ├── api/[route].js                  # GET stores + unlock/lock
    └── api/save/[kind].js              # POST save + save/all
```

## Pages (site + API)

Deploy this folder as Cloudflare Pages (`pages_build_output_dir = "."`).

**Pages secrets / env vars:**

| Variable | Purpose |
|----------|---------|
| `AUTH` | Unlock password and session signing secret |
| `GITHUB_TOKEN` | PAT with `contents:write` on the repo |
| `GITHUB_OWNER` | GitHub user or org |
| `GITHUB_REPO` | Repository name |
| `GITHUB_BRANCH` | Branch to commit to (default `main`) |
| `GITHUB_PATH_PREFIX` | Optional subfolder before JSON filenames (default **empty** = repo root) |

JSON files at the **GitHub repo root** are read at runtime and written on Save. Local `*.json` in this folder are deploy-time fallbacks only.

## Save flow (GUI → GitHub)

1. Click **Unlock** and enter your `AUTH` password.
2. Edit inventory / likes / dislikes in the UI.
3. Click **Save** (per section) or **Save all** in the header.

**Save all** → `POST /api/save/all` (one commit when possible).

Per-section saves → `POST /api/save/:kind` for `inventory`, `likes`, `dislikes`, `used`.

## API routes

| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/inventory`, `/api/likes`, … | `functions/api/[route].js` |
| GET/POST | `/api/unlock` | `functions/api/[route].js` |
| POST | `/api/lock` | `functions/api/[route].js` |
| POST | `/api/save/:kind`, `/api/save/all` | `functions/api/save/[kind].js` |

## Standalone Worker (optional)

`worker.js` exposes save logic at `POST /save/:kind` for direct calls.

```bash
npx wrangler deploy -c wrangler.worker.toml
```

Worker secrets: `AUTH`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`. Optional: `GITHUB_BRANCH`, `ALLOWED_ORIGIN`, `GITHUB_PATH_PREFIX`.

The Pages site uses `/api/save/*` (session cookie auth). The Worker is only needed for saves from outside Pages.
