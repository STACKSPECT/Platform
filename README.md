<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="frontend/public/brand/mark.png">
  <img alt="" src="docs/img/mark-light.png" height="72">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="frontend/public/brand/wordmark.png">
  <img alt="STACKSPECT" src="docs/img/wordmark-light.png" width="380">
</picture>

### Palletizing observability platform

**Every episode a robotic arm runs, measured — centre of gravity, stability and the
improvement curve between commits.**

[![License: MIT](https://img.shields.io/badge/License-MIT-1f1f1f?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/STACKSPECT/Platform/ci.yml?branch=dev&style=flat-square&label=CI)](https://github.com/STACKSPECT/Platform/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.5-1f1f1f?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11%2B-1f1f1f?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgREST%20%C2%B7%20Realtime-1f1f1f?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)

[Installation](#installation) ·
[Development](#development) ·
[Usage](#usage) ·
[Dependencies](#dependencies) ·
[Contributing](CONTRIBUTING.md)

</div>

---

## What this is

A robotic arm stacks packages on a pallet while watching the centre of gravity, reads
the parcels by vision, and reproduces ordered stacks. **This repository is the
instrument panel for that arm** — not the arm.

It answers three questions, and nothing else:

|  | Screen | Question |
|---|---|---|
| **Live** | `/` | What is happening on the pallet *right now*? |
| **Runs** | `/runs` | Which runs exist, and did the last change actually help? |
| **Episode** | `/runs/{id}` · `/runs/{id}/{seed}` | Why did *this* episode end the way it did? |

Built for the THEKER Robotics challenge at HackSpain '26. One of the five criteria on
track B asks literally for *"measured iteration and improvement: your own indicators,
measured, and data backing how much you improved the solution during development."*
This platform **is** that evidence, which is why it refuses to draw a comparison between
two runs that did not measure the same thing, and marks every synthetic number it shows.

**The simulation lives in another repository.** There is no MuJoCo here, no physics, no
perception. This repository knows about episodes, metrics and screens.

---

## Screenshots

> [!NOTE]
> **Placeholder — screenshots pending.** Two images go here, captured from a running
> instance: `/runs` (the runs table, with filters, totals and the comparison panel) and
> `/runs/{id}` (the episode dashboard: top view, side elevation, KPI grid and event
> feed). They will live in `docs/img/`.
>
> <!-- SCREENSHOT:runs -->
> <!-- SCREENSHOT:episode -->

---

## Architecture

There is **no server of our own**. Supabase *is* the backend: PostgREST for reads, RLS
for authorisation, Realtime for the live screen, Storage for pallet snapshots. One less
process to fall over at 3am.

```mermaid
flowchart LR
    subgraph producer ["Simulation repo (MuJoCo)"]
        direction TB
        SIM["Palletizing<br/>simulation"]
        JSONL[("episodes.jsonl<br/><i>source of truth</i>")]
        SIM -->|"disk first, always"| JSONL
    end

    SDK["<b>theker_telemetry</b><br/>Python SDK<br/><i>zero deps · urllib</i>"]

    subgraph supabase ["Supabase — this is the backend"]
        direction TB
        PGREST["<b>PostgREST</b><br/><i>REST over the schema</i>"]
        PG[("<b>PostgreSQL</b><br/>runs · episodes · placements<br/>pallet_states · events · snapshots<br/><i>v_*_summary views · RLS</i>")]
        RT["<b>Realtime</b><br/><i>episodes · events<br/>pallet_states</i>"]
        ST["<b>Storage</b><br/><i>pallet snapshot PNGs</i>"]
        PGREST <--> PG
        PG --> RT
    end

    FE["<b>Next.js 16 frontend</b><br/>Live · Runs · Episode"]

    SIM -->|"RunLog.begin / event /<br/>pallet_state / end()"| SDK
    JSONL -.->|"backfill.py"| SDK
    SDK -->|"<b>write</b> · service_role"| PGREST
    SDK -->|"snapshot upload"| ST

    PGREST -->|"<b>read</b> · anon key, under RLS"| FE
    RT -->|"live push"| FE
    ST -->|"image URLs"| FE
```

Two properties are worth stating out loud, because everything else follows from them:

- **The dependency points one way.** The simulation imports `theker_telemetry`; this
  platform does not know MuJoCo exists. The metrics schema lives here, with whoever
  stores the data — so rewriting the simulation does not take observability down with it.
- **Disk wins.** The `episodes.jsonl` the simulation writes is the source of truth;
  Supabase is a queryable replica. A network failure warns once and the episode carries
  on, because the demo cannot depend on the room's wifi. If the replica is lost,
  [`backend/backfill.py`](backend/backfill.py) rebuilds it.

---

## Requirements

| | Version | Why |
|---|---|---|
| **Node.js** | **22.x** | what CI pins, and what `frontend/package.json` declares in `engines` |
| **Python** | **3.11+** | declared by `backend/pyproject.toml`; CI runs 3.11 |
| **Supabase project** | any | the free tier is enough; it provides PostgREST, RLS, Realtime and Storage |
| Docker | optional | only to run the networked backend tests against a throwaway `postgres:16` |

No database server, no application server and no container runtime are needed to develop
against a Supabase project.

---

## Installation

### 1. Clone and configure credentials

There is exactly **one** credentials file: `.env` at the repository root. It is read by
`load_env()` on the Python side and, through
[`frontend/next.config.ts`](frontend/next.config.ts), by the frontend as well.

```bash
git clone https://github.com/STACKSPECT/Platform.git
cd Platform
cp .env.example .env
```

Fill it in from *Supabase → Project Settings → Data API*:

```dotenv
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...       # public: read-only, under RLS
SUPABASE_SERVICE_KEY=eyJ...    # SECRET: bypasses RLS, Python side only
```

> [!WARNING]
> **`SUPABASE_SERVICE_KEY` bypasses row-level security and must never reach the
> browser.** Everything prefixed `NEXT_PUBLIC_` is bundled into JavaScript that anyone
> can download. `next.config.ts` therefore promotes an explicit **whitelist** of two
> keys and never walks the file; as a second belt, it throws at build time if any
> `NEXT_PUBLIC_*` variable has a name that smells like a secret (`SERVICE_KEY`,
> `SERVICE_ROLE`, `SECRET`, `PASSWORD`). `.env` and `.env.*` are gitignored.
>
> There is deliberately no `frontend/.env.local`: two copies of the same values
> desynchronise on their own, and once did.

### 2. Apply the schema

The schema is pasted **by hand**, in order, into the Supabase SQL editor. All three
files are idempotent — pasting one again breaks nothing.

| Order | File | What it creates |
|---|---|---|
| 1 | [`backend/sql/001_schema.sql`](backend/sql/001_schema.sql) | tables, views and RLS policies |
| 2 | [`backend/sql/002_design.sql`](backend/sql/002_design.sql) | the extra columns and views the design needs |
| 3 | [`backend/sql/003_snapshots.sql`](backend/sql/003_snapshots.sql) | the `snapshots` table — URLs only; the PNGs live in Storage |

Everything derivable is derived in a view rather than stored in a column. A stored
number that can also be computed is a number that will one day disagree with the
computed one, and then nobody knows which is lying.

### 3. Start everything with one command

```bash
./dev.sh
```

[`dev.sh`](dev.sh) is the whole installation procedure in a script. It:

1. **verifies the credentials** — that `.env` exists and all three keys have values, and
   warns if a stale `frontend/.env.local` would shadow them;
2. **installs the SDK** into `.venv` if `theker_telemetry` is not importable;
3. **runs `npm ci`** when `package-lock.json` is newer than `node_modules`;
4. **probes the live schema** for the exact columns the frontend queries
   (`v_episode_summary.started_at`, `v_episode_summary.config`, `v_run_summary.config`,
   `snapshots.url`) and names the `.sql` file to paste if one is missing;
5. **prints how much data is there** — runs, how many measured versus seeded, episodes;
6. **starts the dev server** on <http://localhost:3000>.

```bash
./dev.sh --check     # run every check, start nothing
./dev.sh --seed      # seed sample data, then start
./dev.sh --help
```

Step 4 is the reason the script exists. The SQL is applied by hand, so it is *normal*
for the repository to run ahead of the database — and a missing column returns a 400 and
leaves the screen blank. Finding that out in front of an audience is the expensive
failure.

<details>
<summary><b>Manual setup, without <code>dev.sh</code></b></summary>

```bash
# Python SDK (plus pytest and ruff)
python3 -m venv .venv && .venv/bin/pip install -e './backend[dev]'

# Frontend
cd frontend && npm ci && npm run dev
```

</details>

### 4. Sample data

The interface needs rows before it shows anything. Three generators, all writing through
the real SDK rather than raw SQL — so the write path the production pipeline will use is
exercised before it exists:

```bash
python backend/seed/palletizing.py            # a seeded history: 6 runs
python backend/seed/palletizing.py --wipe     # remove only what was seeded
python backend/seed/ejemplo_contrato.py       # one entry touching the ENTIRE contract
python backend/seed/humo_live.py              # builds a pallet slowly: smoke-tests Live
```

- **`palletizing.py`** — a plausible history. Not a simulation, but the causality is
  real: the CoG moves according to where and with what mass each package lands, and the
  stack collapses when it leaves the support polygon.
- **`ejemplo_contrato.py`** — one run that exercises every column in
  [`docs/API.md`](docs/API.md): all five tables, all six event kinds with the `payload`
  keys the event feed expects, several failure causes, and the edge cases the frontend
  has to render (an episode that placed nothing, planned versus actual poses, positive
  overhang).
- **`humo_live.py`** — uses the live cycle so Realtime has something to deliver. With
  `/` open in the browser, the pallet must build package by package and the KPIs move on
  their own, without a reload.

> [!IMPORTANT]
> Everything these scripts write is marked **`synthetic = true`**, and that is neither
> optional nor switchable. The interface hatches synthetic data and never lets it into a
> comparison with measured data. An invented number that reads as a measured one is the
> fastest way to lose credibility in front of a jury.

To import real episodes already on disk:

```bash
python backend/backfill.py --runs-dir <simulation repo>/simulation/runs --dry-run
python backend/backfill.py --runs-dir <simulation repo>/simulation/runs
```

---

## Development

### Layout

```
backend/                 SQL + SDK. Supabase IS the backend; there is no server of ours.
  sql/001_schema.sql       tables, views, RLS
  sql/002_design.sql       the columns and views the design needs
  sql/003_snapshots.sql    pallet snapshots (URLs; PNGs live in Storage)
  theker_telemetry/        the SDK imported by whoever produces episodes
    schema.py                EpisodeResult, FAILURES, TASKS, RunWriter
    core.py                  PostgREST client and RunLog
    pallet.py                support polygon and stability margin
  seed/                    sample-data generators
  backfill.py              uploads runs/ from disk to Supabase
  tests/                   the networked ones need DATABASE_URL

frontend/                Next.js 16. Reads Supabase with the anon key, under RLS.
  app/                     routes: / (Live), /runs, /runs/[id], /runs/[id]/[seed]
  api/clients/             one function per PostgREST endpoint
  api/hooks/               the same, wrapped in TanStack Query
  components/              atoms / molecules / organisms / screens
  lib/ui.ts                ALL unit conversion, in one place
  lib/pallet.ts            drawing geometry; the pallet size is NOT fixed
  lib/supabase.ts          the types, which are half the contract
  styles/colors.css        ALL colours, both themes, in one place
  scripts/                 check-colors.mjs · check-contrast.mjs

docs/
  API.md                       the contract: endpoints, types and vocabularies
  BRIEFING-observabilidad.md   what is being built and why
  design/                      the 11 design boards, at 1440 px
```

### Checks

These are exactly what CI runs, so a red result here is a red pull request.

```bash
# Frontend
cd frontend && npm ci && npm run lint && npm run build

# Backend
pip install -e './backend[dev]'
ruff check backend && pytest backend -q
```

`npm run lint` is **three** checkers, not one:

```
eslint  &&  node scripts/check-colors.mjs  &&  node scripts/check-contrast.mjs
```

- **`check-colors.mjs`** fails on any colour literal outside
  `frontend/styles/colors.css` — `#hex`, `rgb()`, `hsl()`, `oklch()`, named colours — in
  CSS, TS and TSX alike.
- **`check-contrast.mjs`** fails on any text colour pair below WCAG 4.5:1 (3:1 for
  meaningful graphical elements), **in both themes**.

`pytest backend -q` touches no network. Point `DATABASE_URL` at a throwaway Postgres and
it additionally applies the real schema and verifies the contract against the frontend's
queries — which is what CI does:

```bash
docker run --rm -d --name pg -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:16
export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/postgres
pytest backend -q
```

### npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | dev server on <http://localhost:3000> |
| `npm run build` | production build (also generates Next 16's `PageProps<…>` route types) |
| `npm run start` | serve the production build |
| `npm run lint` | eslint + colour checker + contrast checker |
| `npm run lint:colors` | the colour checker alone |
| `npm run lint:contrast` | the contrast checker alone |

### House rules worth knowing before the first commit

The full list, with the reasoning, is in [`AGENTS.md`](AGENTS.md) and
[`CONTRIBUTING.md`](CONTRIBUTING.md).

- **No Tailwind.** CSS Modules next to each component; the design is exact values.
- **Colours only as `var(--…)`**, defined once in `frontend/styles/colors.css`.
- **The unit is always visible** — `4.1 mm`, never `4.1`. The database stores SI; the
  screen shows millimetres and degrees; the conversion lives only in `frontend/lib/ui.ts`.
- **Never render a raw failure identifier.** `stack_collapse` reads as *«el montón se
  derrumbó»*, via `FAILURE_TEXT`.
- **Medians, not means.** One episode collapsing at 3 s drags the mean cycle time down
  and makes a bad run look fast.
- **The client aggregates nothing.** Totals, medians and dominant causes come out of the
  SQL views.

---

## Usage

### Producing telemetry from a simulation

This is the only integration point. A simulation repository installs the SDK
(`pip install -e <path>/backend`) and imports it — that pulls in nothing else, because
it speaks PostgREST with `urllib` from the standard library.

```python
from theker_telemetry import EpisodeResult, RunLog

log = RunLog(
    repo,                                   # writes runs/<timestamp>/episodes.jsonl here
    task="palletizing", level=2,
    oracle=False,                           # True when perception is replaced by real poses
    config={"pallet_size_m": [0.6, 0.4]},   # the real pallet may be a scale model
    remote=True,                            # also replicate to Supabase
)

log.episode(
    EpisodeResult(
        seed=7, level=2, n_objects=12, n_placed=11, n_misrouted=0,
        success=False, duration_s=48.2, failure="stack_collapse", oracle=False,
        task="palletizing", metrics={"cog_offset_xy": 0.031, "fill_ratio": 0.62},
    ),
    placements=[...], pallet_states=[...], events=[...],
)
log.close()
```

**For the Live screen to be live, use the episode lifecycle instead.** `episode()`
uploads everything at once, so there is no `running` row and no `UPDATE` for Realtime to
react to — Live would show a pallet that is already built:

```python
log.begin(seed=7, n_objects=12)         # inserts the episode as `running`
for i, package in enumerate(queue):
    log.event(kind="pick", package_id=package.id, payload={...})
    log.placement(seq=i, package_id=package.id, actual_pose=[...])
    log.pallet_state(after_seq=i, mass_kg=..., cog_x=..., stability_margin_m=...)
log.end(result)                         # closes it with the EpisodeResult
```

`failure` and `task` are validated against closed vocabularies on construction — an
unknown value raises immediately rather than failing the upload later.

<details>
<summary><b>The failure vocabulary</b></summary>

| enum | on screen (Spanish) |
|---|---|
| `no_detection` | no vio ningún paquete |
| `ik_unreachable` | no alcanza la posición |
| `collision` | chocó |
| `grasp_slip` | se le escapó de la pinza |
| `wrong_placement` | lo dejó fuera de tolerancia |
| `timeout` | se quedó sin tiempo |
| `stack_collapse` | el montón se derrumbó |
| `overhang_violation` | lo dejó fuera del palé |
| `place_inaccurate` | *historical, no longer emitted* |

The vocabulary is closed. Adding one means touching three places —
`backend/theker_telemetry/schema.py`, the `CHECK` in `backend/sql/001_schema.sql`, and
`frontend/lib/ui.ts` — and `backend/tests/test_vocabulario.py` fails if one lags behind.

</details>

### Reading the screens

**Live** (`/`) shows the episode that is running *now*. When it finishes it holds the
result for ten seconds, so the outcome is visible and so a following episode of the same
run replaces it directly instead of flickering. With nothing running it says so — it does
**not** backfill with the last finished episode, because that would read as if it were
happening. If the connection drops mid-episode it freezes the last thing it received and
says that too. It never goes blank.

**Runs** (`/runs`) lists every run with its totals, filters, and a comparison panel.
`comparability()` in `frontend/lib/supabase.ts` refuses to show a delta between two runs
that did not measure the same thing — different task, different level, different seed
range, or one of them oracle or synthetic. Blocking that is not form validation; a
pretty, false chart is exactly what an evaluator goes looking for.

**Episode** (`/runs/{id}`, or `/runs/{id}/{seed}`) is the same dashboard as Live against
a chosen episode: a top view and a side elevation of the pallet — drawn to the real
pallet size from `config.pallet_size_m`, with a toggle to the simulator's own snapshot —
plus the KPI grid, the result card and the event feed.

### The API

The frontend talks to PostgREST directly, with the anon key, under RLS. Every endpoint,
type and closed vocabulary is written down in **[`docs/API.md`](docs/API.md)**; the
design rationale is in
**[`docs/BRIEFING-observabilidad.md`](docs/BRIEFING-observabilidad.md)**.

Reads go through three views — `v_run_summary`, `v_episode_summary`,
`v_failure_breakdown` — plus the `placements`, `pallet_states`, `events` and `snapshots`
tables. Realtime is published on `episodes`, `events` and `pallet_states`.

---

## Dependencies

Both sides are deliberately thin.

### Python — `backend/`

**The SDK has no runtime dependencies at all**, and that is a rule rather than a
coincidence: it is imported by the simulation repositories, so every package it grows is
a package they inherit, and one more thing that can break the night before a demo. It
speaks PostgREST with `urllib` from the standard library.

`pytest` and `ruff` are pinned to exact versions in the `dev` extra — `ruff` changes its
default rule set between minor releases, and a `>=` range lets CI go red on a Tuesday
over something nobody touched.

### Node — `frontend/`

Five runtime dependencies, each pinned exactly to what `package-lock.json` had already
resolved:

| Package | Version | Licence |
|---|---|---|
| [`next`](https://github.com/vercel/next.js) | 16.3.5 | MIT |
| [`react`](https://github.com/facebook/react) | 19.2.8 | MIT |
| [`react-dom`](https://github.com/facebook/react) | 19.2.8 | MIT |
| [`@supabase/supabase-js`](https://github.com/supabase/supabase-js) | 2.116.0 | MIT |
| [`@tanstack/react-query`](https://github.com/TanStack/query) | 5.103.1 | MIT |

Dev: `typescript` 5.9.3, `eslint` 9.39.5, `eslint-config-next` 16.3.5 and the `@types/*`
packages — pinned exactly too.

### Licence audit

Measured, not assumed — `license-checker` over the installed Node tree, `pip-licenses`
over a clean venv of `backend[dev]`:

```bash
cd frontend && npm ci && npx license-checker --production --summary
pip install -e './backend[dev]' pip-licenses && pip-licenses
```

**Python** — `backend[dev]` resolves to six packages: `pytest` (MIT), `ruff` (MIT),
`iniconfig` (MIT), `pluggy` (MIT), `Pygments` (BSD-2-Clause) and `packaging`
(Apache-2.0 OR BSD-2-Clause). All permissive.

**Node** — the shipped set (`--production`, 32 packages):

| Licence | Count |
|---|---|
| MIT | 21 |
| Apache-2.0 | 5 |
| ISC | 2 |
| BSD-3-Clause | 1 |
| 0BSD | 1 |
| CC-BY-4.0 | 1 |
| LGPL-3.0-or-later | 1 |

Including dev dependencies (350 packages) adds only BSD-2-Clause ×7, MPL-2.0,
Python-2.0, CC0-1.0 and BlueOak-1.0.0 — all permissive, all build-time only.

Two entries deserve a sentence each, since they are the only ones that are not plainly
permissive:

- **`@img/sharp-libvips-linux-x64` — LGPL-3.0-or-later.** This is the prebuilt `libvips`
  binary behind `sharp`, which Next.js declares as an **optional** dependency for image
  optimisation. It is a separate, platform-specific npm package loaded dynamically at
  runtime: it is not vendored into this repository, not statically linked, and not
  bundled into the JavaScript the browser downloads. Using an LGPL library that way puts
  no obligation on the licence of the work that uses it, so it does not constrain
  releasing this project under MIT. (`sharp` itself is Apache-2.0.)
- **`caniuse-lite` — CC-BY-4.0.** A browser-support *dataset* consumed by the toolchain
  at build time. Permissive with attribution, and none of it is redistributed here.

**Conclusion: nothing in the dependency tree is incompatible with releasing this project
under the MIT licence.**

---

## Security

- **`SUPABASE_SERVICE_KEY` bypasses row-level security.** It exists only on the Python
  side — SDK, backfill, seeds. It must never be committed and must never reach the
  browser, under any variable name.
- Everything prefixed `NEXT_PUBLIC_` is compiled into JavaScript that anyone can
  download. [`frontend/next.config.ts`](frontend/next.config.ts) therefore promotes an
  explicit whitelist of exactly two keys, never iterating the `.env` file, and **throws
  at build time** if any `NEXT_PUBLIC_*` variable's name contains `SERVICE_KEY`,
  `SERVICE_ROLE`, `SECRET` or `PASSWORD`.
- The frontend reads with the **anon** key only, under the RLS policies created by
  `backend/sql/001_schema.sql`.
- `.env` and `.env.*` are gitignored. `.env.example` is the only one committed, and it
  carries placeholders.

Found something that looks like a real problem? Open an issue without the exploit details
and we will take it from there.

---

## Documentation

| Document | What it covers |
|---|---|
| [`AGENTS.md`](AGENTS.md) | permanent repository context and the hard rules *(Spanish)* |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | branches, commits, checks, what CI enforces |
| [`docs/API.md`](docs/API.md) | the database↔frontend contract *(Spanish)* |
| [`docs/BRIEFING-observabilidad.md`](docs/BRIEFING-observabilidad.md) | what is being built and why *(Spanish)* |
| [`docs/design/`](docs/design/) | the 11 design boards at 1440 px — open the HTML bundle in a browser |

Code identifiers are in English; comments and internal documents are in Spanish.

---

## Licence

[MIT](LICENSE) © 2026 STACKSPECT
