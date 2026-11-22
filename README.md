# Timapp

A minimalist, local-first time tracker inspired by Clockify. Built with zero build steps using pure HTML, CSS, and vanilla JavaScript — runs directly from your filesystem or hosted statically on GitHub Pages.

## Features

- **Live Stopwatch & Manual Entry**: Track time in real time (persists across reloads, with optional live browser tab title) or log manual start/end durations, plus one-click **Continue** on any past entry.
- **Projects & Flexible Tags**: Organize work under color-coded projects and assign multiple custom tags with search, autocomplete, and inline creation.
- **Editable Entries**: Inline task editing, instant project/tag popovers, duplicate, delete with Undo toast, and a full Edit modal with midnight-crossing support.
- **Visual Calendar**: 24-hour Week and Day timeline grid with click-or-drag slot creation and side-by-side overlap layout.
- **Detailed Analytics**: Filterable across Day, Week, Month, Year, All Time, or Custom ranges with period-over-period comparisons, SVG stacked bar chart, project donut breakdown, tag breakdown, GitHub-style activity heatmap, and CSV export.
- **Local Database & Portable Backups**: Uses IndexedDB with automatic `localStorage` fallback. Export your entire database to `.json` and import in either Merge or Replace mode.
- **Themes & Extensible i18n**: Light, Dark, and System theme modes, plus a modular locale system ready for additional languages.

## Running Locally

Simply open `index.html` in any modern desktop browser (Chrome, Firefox, Edge, Safari) — no server, Node.js, or build step required.

## Hosting on GitHub Pages

1. Push this repository to GitHub.
2. Open your repository **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**, choose `main` and `/ (root)`, and click **Save**.
4. Your app will be live at `https://<your-username>.github.io/<repo-name>/`.

## Adding a New Language

1. Copy `js/locales/en.js` to `js/locales/<code >.js` (for example `js/locales/de.js`).
2. Update `App.locales.<code >` and its `_meta` (`code`, `name`, `nativeName`) and translate the strings.
3. Add `<script src="js/locales/<code >.js"></script>` in `index.html` right after `js/locales/en.js`.
4. The new language will automatically appear in **Settings → Language**.
