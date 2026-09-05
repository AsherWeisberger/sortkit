# Sortkit

Reorder the pages. Files stay here.

Made by [Asher Weisberger](https://x.com/AsherWeisberger) ([@AsherWeisberger](https://x.com/AsherWeisberger))

No account. No daily cap. Organize and rotate PDFs in the tab. Bytes never leave the browser.

## Why

ILovePDF Organize uploads your files, shows ads, and walls free use behind Premium. Sortkit does the job here — drag-reorder, rotate, blank pages, multi-file mix, extract ZIP or PDF, optional page numbers, IndexedDB sessions. Unlimited. Nothing uploaded.

## What it does

- **Drop, paste, or pick** — one or many PDFs into one board
- **Drag-reorder** thumbnails (phone: select + move up/down)
- **Rotate** 90 / 180 / 270 (selected or all selected)
- **Delete · Duplicate · Insert blank**
- **Color-coded source chips** so mixed files stay clear
- **Extract** selected → ZIP of single-page PDFs or one multi-page extract
- **Optional page-number footer** baked on export
- **IndexedDB recent sessions** — save and recall locally
- **Sample pack** — report.pdf + invoice.pdf
- **Phone (390)** — island orb under the cutout, dock on the home indicator
- Bytes never POST anywhere

Honest leftover: OCR rebuild, unlock without password, Drive/Dropbox import, desktop native apps.

## Privacy

Organizing runs in this tab with pdf.js and pdf-lib. There is no Sortkit server.

## Run

```bash
bun install
bun run dev
```

Build writes `docs/` for GitHub Pages (legacy, no Actions):

```bash
bun run build
bun run preview
```

MIT © 2026 Asher Weisberger ([@AsherWeisberger](https://x.com/AsherWeisberger))
