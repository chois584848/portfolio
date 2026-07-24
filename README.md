# Seyeon Choi — Portfolio (static build)

Self-contained static site. Every page has its assets, fonts, and scripts inlined, so it works offline and on any static host. All pages link to each other.

## Files
- `index.html` — home (entry point; duplicate of "Living System.dc.html")
- `Living System.dc.html` — home
- `LS Case 01 Trust.dc.html` … `LS Case 04 Legibility.dc.html` — case studies
- `About.dc.html`, `Resume.dc.html`

## Deploy to GitHub Pages
1. Create a new repo, e.g. `portfolio`.
2. Upload every file in this folder to the repo root (keep the filenames, spaces included).
3. Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` / `/root` → Save.
4. Wait ~1 min. Site is live at `https://<username>.github.io/portfolio/`.

GitHub Pages serves `index.html` automatically, and the internal links resolve to the sibling pages.
