# Project notes for Claude

## Publishing workflow (requested by the owner)
Every time a change is applied to the live site (`docs/`):
1. Commit it and push to **main** (GitHub Pages deploys from `main` → `/docs`).
2. Republish the same page to the Claude artifact so it can be viewed right away
   while Pages builds: https://claude.ai/artifact/NezNQYHk4Z25QCZ2F7uz7t
   - The artifact page is `docs/index.html` without its `<!DOCTYPE>`, `<html>`, `<head>`,
     `<body>` wrappers and charset/viewport metas (the artifact publisher adds those).
   - Publish `docs/css/style.css` and every `docs/js/*.js` file alongside it at the
     same relative paths (`css/style.css`, `js/...`).
   - Update the existing artifact (pass its URL); don't create a new one.

## Two versions — keep them separate
| Version | Files | Pages URL path | Artifact |
|---|---|---|---|
| Grayscale (original) | `docs/index.html`, `docs/css/`, `docs/js/` | `/` | https://claude.ai/artifact/NezNQYHk4Z25QCZ2F7uz7t |
| Color | `docs/color/index.html`, `docs/color/css/`, `docs/color/js/` | `/color/` | https://claude.ai/artifact/61nNMg3nDaXKxbTqTX7coe |

- Change only the version the owner names; never edit the grayscale files for a colour request.
- The two versions share no files. A change wanted in both must be made in both.
- Republish only the artifact of the version that changed (same steps as above, using that
  version's folder).
