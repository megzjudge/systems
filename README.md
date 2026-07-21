# Systems & Feelings Survey

Interactive visualization of empathizing and systemizing scores, sourced from [YourMorals.org](https://yourmorals.org/).

Live site: [systems-feelings-survey.jdge.cc](https://systems-feelings-survey.jdge.cc/)

## Background

The site is a companion to the **Systems & Feelings** survey hosted on YourMorals.org — a combination of the Empathizing and Systemizing scales developed by Simon Baron-Cohen at Cambridge University. Empathizing is "the drive to identify another person's emotions and thoughts, and to respond to these with an appropriate emotion"; Systemizing is "the drive to analyze the variables in a system, and to derive the underlying rules that govern the behavior of the system." Both scores range from 1.0 to 4.0.

YourMorals.org shows you your own scores after you take the survey, but doesn't let you plot them against a wide range of demographic breakdowns in one place. This site fills that gap: take the official survey, then bring your two numbers here to see where you land relative to gender, age, political ideology, education, race, and religiosity groups (and combinations of those).

## What it does

- `index.html` explains the empathizing/systemizing framework and links out to the official survey.
- `results.html` is the interactive tool: enter your own scores, compare them against a pre-set baseline result and demographic averages, filter by group, and explore two-way group combinations — all rendered as a grouped bar chart.

No backend, build step, or package manager is involved — everything is static HTML/CSS/JS with the demographic data baked into `data.js` at build time (i.e. when it was collected), not fetched live.

## How it works

**Chart.** Every score, whether it's your entered result, the baseline "My Result", a single demographic, or a combo, is just an object with a `label`, `systemizing`, and `empathy` value. `buildChartData()` turns whatever set of these objects is currently "visible" into two Chart.js bars — one for systemizing, one for empathy — with one dataset per group. `renderChart()` decides whether to rebuild the whole chart or just call `.update()`, based on whether the label set has changed.

**What's visible on the chart** is resolved by `getVisibleDemographics()` each time a filter changes, in priority order:
1. If a mass preset is active, show the top/bottom 10 scored groups for that preset (see below) plus your personal bars.
2. Else if you've checked any single demographics or combos, show those plus your personal bars.
3. Else if "Clear demographics" was clicked, show personal bars only.
4. Otherwise, show personal bars plus every single demographic (the default view).

"Personal bars" (`getPersonalBars()`) is always your entered **Your Result** (if you've submitted one) plus the fixed **My Result** baseline.

**Combos.** A two-way filter selection (e.g. Female + Liberal) is looked up by a key of the two demographic `id`s sorted and joined with a comma (`'female,liberal'`) against `DEMOGRAPHIC_COMBOS`. Only one combo per pair exists in the data (max two categories at once), and any pair YourMorals.org didn't publish combined data for is listed in `DEMOGRAPHIC_NO_DATA` so the UI can say "no data" instead of silently dropping the bar or showing a wrong number.

**Mass presets** (e.g. "Highest empathy") pool every single demographic *and* every combo into one list (`getAllScoredGroups()`), sort it by the relevant field (`empathy` or `systemizing`), and take the top or bottom 10 — so the preset can surface a combo (like a specific age+gender pairing) above a plain single-demographic group if its average is more extreme.

**Colors.** Each group needs a bar color that's visually distinct from every other currently-plotted group, even though the set of visible groups changes constantly as you filter. `generateDiverseColorPool()` pre-builds a large pool of HSL colors spread around the hue wheel; `pickDistinctColor()` walks that pool and rejects candidates that are too close (in hue/saturation/lightness space, via `colorDistance()`) to already-used colors, falling back to a denser manual sweep if the pool runs out. Demographics get colors assigned once per page load (`initBarColors()`, with a random hue offset so repeat visits don't look identical); your own "Your Result" bar can be cycled through the distinct-color picker on demand via the "Change colour" button.

**Persistence.** Your entered scores and your chosen "Your Result" color are written to `localStorage` (`loadVisitorResults()`/save counterpart) so they're still there if you refresh or come back later — nothing is sent to a server.

## Data collection methodology

The values in `data.js` are not live — they're a manual snapshot, captured **22 June 2026** and bundled as static data. There's no script or automated scraper in this repo: each demographic average (and each two-way combo average) was gathered by opening the results page on YourMorals.org, applying each filter combination in its UI, and reading the resulting values off its `average1` API responses in the browser's DevTools Network tab — then transcribing those numbers by hand into `DEMOGRAPHICS` and `DEMOGRAPHIC_COMBOS` below. Because it's a snapshot, this site won't update automatically if YourMorals.org's published averages change; refreshing it means repeating that process and updating the "captured" date in `data.js`, `results.html`, and this README. For live, current comparisons, use the official results page on yourmorals.org directly.

`data.js` holds:
- `MY_RESULT` — the site owner's own scores/colour, shown as the default comparison bar.
- `DEMOGRAPHICS` — single-group averages, each with `id`, `label`, `category` (`gender` / `political` / `education` / `race` / `age` / `religiosity`), a display `color`, and `systemizing`/`empathy` values.
- `DEMOGRAPHIC_COMBOS` — keyed by sorted, comma-joined demographic `id` pairs (e.g. `'female,liberal'`), mapping to their combined `systemizing`/`empathy` averages.
- `DEMOGRAPHIC_NO_DATA` — combo keys YourMorals.org doesn't publish data for, so the UI shows "no data" rather than a wrong or missing bar.
- `MASS_PRESET_LABELS` — display labels for the four mass presets.

## Project structure

```
.
├── index.html      # About page
├── results.html    # Score entry + chart + filters
├── data.js         # Demographic data snapshot (see Data collection methodology)
├── results.js      # Chart rendering, filtering, color assignment, presets, localStorage
├── styles.css      # Layout and typography
├── robots.txt      # Crawler rules (allow-all with per-bot crawl delays)
├── images/         # Favicon/OG icon + a results screenshot
└── LICENSE         # MIT (code only — see License section)
```

## Credits

- Survey and demographic data: [YourMorals.org](https://yourmorals.org/) (Jonathan Haidt et al.)
- Scale based on Simon Baron-Cohen's empathizing–systemizing psychology test research
- Charting via [Chart.js](https://www.chartjs.org/)

## License

Code is MIT licensed (see `LICENSE`). This is a personal project, not affiliated with YourMorals.org — survey content and demographic API data belong to YourMorals.org and their contributors, and are not covered by the MIT license.
