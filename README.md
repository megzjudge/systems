# Systems & Feelings Survey

Interactive visualization of empathizing and systemizing scores, sourced from [YourMorals.org](https://yourmorals.org/).

## Background

The site is a companion to the **Systems & Feelings** survey hosted on YourMorals.org — a combination of the Empathizing and Systemizing scales developed by Simon Baron-Cohen at Cambridge University. Empathizing is "the drive to identify another person's emotions and thoughts, and to respond to these with an appropriate emotion"; Systemizing is "the drive to analyze the variables in a system, and to derive the underlying rules that govern the behavior of the system." Both scores range from 1.0 to 4.0.

YourMorals.org shows you your own scores after you take the survey, but doesn't let you plot them against a wide range of demographic breakdowns in one place. This site fills that gap: take the official survey, then bring your two numbers here to see where you land relative to gender, age, political ideology, education, race, and religiosity groups (and combinations of those).

## What it does

- `index.html` explains the empathizing/systemizing framework and links out to the official survey.
- `results.html` is the interactive tool:
  - Enter your systemizing and empathizing scores (1.0–4.0) as **Your Result**.
  - A pre-set **My Result** (the site owner's own scores, 3.30 / 2.95) is always shown as a baseline comparison.
  - Both are rendered as a grouped bar chart (Chart.js) alongside demographic reference bars.
  - Filter by up to three demographic groups at once — one per category (gender, age, political ideology, education, race, religiosity).
  - Select two-way demographic combinations (e.g. Female + Liberal, Liberal + ≥65) where YourMorals.org has published combined data; groups with no published combo data are marked as such in the UI instead of silently omitted.
  - Mix single-group filters and combos on the same chart.
  - One-click mass presets for the highest/lowest 10 empathizing or systemizing groups (across singles and combos).
  - Bar colors are auto-generated per session (HSL-based, with a minimum perceptual distance check) so charts stay readable regardless of how many groups are selected; your own "Your Result" color can be cycled with a button.
  - Your entered score and chosen colour persist in `localStorage`, so they survive a page refresh.

No backend, build step, or package manager is involved — it's static HTML/CSS/JS you can open directly or serve from any static host.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | About the empathizing–systemizing framework and links to the survey |
| `results.html` | Score entry, chart, demographic filters, and combo explorer |

## Project structure

```
.
├── index.html      # About page
├── results.html    # Score entry + chart + filters
├── data.js         # Bundled demographic data (see below)
├── results.js      # Chart rendering, filtering, color assignment, presets, localStorage
├── styles.css      # Layout and typography
├── robots.txt      # Crawler rules (allow-all with per-bot crawl delays)
├── images/         # Favicon/OG icon + a results screenshot
└── LICENSE         # MIT (code only — see Data & License below)
```

## Data

Everything lives in plain JS objects loaded via `<script>` tags — there is no API call at runtime.

- **`data.js`**
  - `MY_RESULT` — the site owner's own scores/colour, shown as the default comparison bar.
  - `DEMOGRAPHICS` — an array of single-group demographic averages, each with `id`, `label`, `category` (`gender` / `political` / `education` / `race` / `age` / `religiosity`), a display `color`, and `systemizing`/`empathy` averages.
  - `DEMOGRAPHIC_COMBOS` — a map keyed by sorted, comma-joined demographic `id` pairs (e.g. `'female,liberal'`) to their combined `systemizing`/`empathy` averages, for two-way filter combinations.
  - `DEMOGRAPHIC_NO_DATA` — a set of combo keys YourMorals.org doesn't publish data for, so the UI can show "no data" instead of a wrong or missing bar.
  - `MASS_PRESET_LABELS` — display labels for the four mass presets (lowest/highest empathizing/systemizing).
- **`results.js`** — all client-side behavior: color generation (`hslToHex`/`hexToHsl`/`colorDistance`, used to keep bars visually distinct), chart building and rendering (`buildChartData`, `renderChart`), demographic/combo filter UI (`renderDemographicFilters`, `renderComboPanel`, `applyComboSelection`), mass presets (`applyMassPreset`), and visitor score persistence (`loadVisitorResults`/`localStorage`).

Demographic and combo averages were captured from the YourMorals.org `average1` API on **22 June 2026** and bundled here as static data — they won't update automatically if YourMorals.org's published averages change. For live, current comparisons, use the official results page on yourmorals.org directly.

## Running locally

Since it's static files with no build step, any static file server works, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Opening `index.html`/`results.html` directly via `file://` also works, though some browsers restrict local script/font loading under `file://` — a local server avoids that.

## Credits

- Survey and demographic data: [YourMorals.org](https://yourmorals.org/) (Jonathan Haidt et al.)
- Scale based on Simon Baron-Cohen's empathizing–systemizing psychology test research
- Charting via [Chart.js](https://www.chartjs.org/)

## License

Code is MIT licensed (see `LICENSE`). This is a personal project, not affiliated with YourMorals.org — survey content and demographic API data belong to YourMorals.org and their contributors, and are not covered by the MIT license.
