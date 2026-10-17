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
