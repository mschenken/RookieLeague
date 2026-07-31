# The Rookie League

Fantasy football history dashboard, 2012–2025. Static site, deployed to GitHub Pages at
**https://mschenken.github.io/RookieLeague/**

## Running it

```bash
npm install
npm run dev      # rebuilds data, then starts Vite
npm run build    # data pipeline + typecheck + production build
```

Pushing to `main` deploys automatically. One-time setup: in the repo's
**Settings → Pages**, set **Source** to **GitHub Actions**.

## How the data works

Everything the site renders is precomputed by `scripts/build-data.mjs` into
`src/data/league.json`. The browser never parses a CSV. Run it with `npm run data`.

| File | What it is |
| --- | --- |
| `data/rookie_league_history_2012-2025.csv` | Scraped standings, champions, and records. The source of truth. |
| `data/managers.csv` | **Edit this.** Maps team names to the real person behind them. |
| `data/seasons.json` | Team count, playoff spots, and divisions per season. |
| `data/record_*.csv` | Week / season / player records transcribed from the ESPN screenshots in `data/screenshots/`. |
| `data/data-warnings.md` | Generated. Known quirks in the source data. |

### Filling in `data/managers.csv`

This is the one piece that needs a human. The league has 41 distinct team names across
14 seasons, and **24 of them appear in only one season** — those are mostly renames, not
new people. Until they are merged, a four-time champion shows up as four unrelated
one-season teams.

**Open `data/managers.csv` in Excel or Google Sheets. Type a person's name in the
`manager` column. That is the only column you touch.** Save as CSV, then run `npm run data`.

```csv
team_name,manager,seasons,years,record,titles,best_finish
The Elites,Dave,13,2013 2014 2015 …,94-80,1,1
Le'Voen a prayer,Mike,11,2015 2016 2017 …,101-47,4,1
Goff Balls,Dave,1,2019,3-10,0,8          <- same name as row 1, so it merges
```

Two rows with the same manager name become one person and their whole history merges.
Capitalisation does not matter; spelling does. The other columns (seasons, years, record,
titles, best finish) are there purely to jog your memory about who that team was.

Rows are sorted longest-tenured first. Do those twelve and the leftovers are almost all
the one-season renames.

You can leave rows blank — the site still builds and just shows that team under its own
name, with a banner on the dashboard counting how many are outstanding. The build only
fails if a team name is missing from the file entirely or listed twice, which would drop
or double-count a season.

### Data caveats worth knowing

- **The CSV's `Reg Season Rank` column is corrupt** and is ignored. All 14 year/division
  groups contain duplicate ranks; in 2025 the 12-2 Elites are listed below four sub-.500
  teams. Seeding is recomputed from W-L-T.
- **Seed ties cannot always be broken.** The source has no per-team points-for, so teams
  on identical records share a seed (marked `*` on manager pages). Six seasons have a tie
  straddling the playoff cutoff.
- **Playoff appearance** is derived from final placement against that year's bracket size,
  which holds in 10 of 14 seasons. The exceptions are listed in `data/data-warnings.md` —
  2013 had divisions (winners likely auto-qualified), and 2012 and 2018 need a human
  verdict against the original standings.
- **Records are one row per season.** ESPN's Hall of Fame stores only each season's best
  week / season / player performance, so a manager's second-best week is not in the data
  even if it would rank.
- **Win percentage is regular season only.** The source records no playoff game results.

## Layout

```
scripts/build-data.mjs   parse -> validate -> compute -> src/data/league.json
scripts/fetch-logos.mjs  one-time pull of the 32 NFL logos into public/logos/
src/lib/league.ts        typed accessors over the generated JSON
src/stats/definitions.tsx  the eight stat blocks, one entry each
src/components/Intro.tsx   the logo animation
```

Colours are the validated categorical palette from the dataviz skill, checked against the
`#16161a` chart surface for colourblind separation and contrast. The site is dark-only by
choice. Data marks use the series slots; gold is decoration and never encodes a value.
