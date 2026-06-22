# Systems & Feelings Survey

Interactive visualization of empathizing and systemizing scores, sourced from [YourMorals.org](https://yourmorals.org/).

## What it does

The site links to the official [Systems & Feelings survey](https://yourmorals.org/) on YourMorals.org and provides a results page where you can:

- Enter your systemizing and empathizing scores (1.0–4.0)
- See them on a grouped bar chart alongside reference scores
- Filter by demographic groups (gender, age, political ideology, education, race, religiosity)
- Select two-way demographic combinations (e.g. Female + Liberal, Liberal + ≥65)
- Mix single-group filters and combinations on the same chart
- Use presets for highest/lowest empathy or systemizing groups

Demographic averages are pre-captured from the YourMorals.org API and bundled in `data.js` — no backend required.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | About the empathizing–systemizing framework and links to the survey |
| `results.html` | Score entry, chart, demographic filters, and combo explorer |

## Data

- `data.js` — demographic singles, two-filter combinations, and metadata (`DEMOGRAPHIC_COMBOS`, `DEMOGRAPHIC_NO_DATA`, etc.)
- `results.js` — Chart.js rendering, filter logic, color assignment, mass presets
- `styles.css` — layout and typography

Two-filter combos are captured from YourMorals `average1` API responses. Groups with no published data are marked accordingly in the UI.

## Credits

- Survey and demographic data: [YourMorals.org](https://yourmorals.org/) (Jonathan Haidt et al.)
- Scale based on Simon Baron-Cohen’s empathizing–systemizing research

## License

Personal project. Survey content and API data belong to YourMorals.org and their contributors.
