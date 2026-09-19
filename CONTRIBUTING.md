# Contributing

Thanks for taking an interest. This is a small, opinionated repository: a Supabase
schema, a dependency-free Python telemetry SDK, and a Next.js frontend. Most of the
friction a newcomer hits here comes from rules that already exist and are enforced by
CI, so this page front-loads them.

Two documents outrank this one on matters of substance:

- **[`AGENTS.md`](AGENTS.md)** — the permanent context of the repository: what it is,
  how it is laid out, and the hard rules. Read it before writing code. If something
  there is out of date, fix it in the same PR.
- **[`docs/API.md`](docs/API.md)** — the contract between the database and the
  frontend: endpoints, types, and the closed vocabularies.

Both are written in Spanish, as are all code comments and commit subjects. Issues and
pull requests in English are welcome too — see [Language](#language).

---

## Branches

`dev` is the integration branch. **Everything targets `dev`**, never `main`.

```
main  ←  dev  ←  your branch
```

- Branch off the latest `dev`: `git fetch origin dev && git switch -c feature/<thing> origin/dev`
- Branch names in use: `feature/<thing>`, `fix/<thing>`.
- Open the pull request against `dev`. `main` only ever moves by merging `dev`.
- Keep commits small. A commit that changes behaviour should be readable on its own.

## Commits

Conventional commits, with the **subject written in Spanish, in the imperative, no
trailing period, ≤50 characters**. The repository ships a template — turn it on once:

```bash
git config commit.template .gitmessage
```

Types: `feat` `fix` `docs` `style` `refactor` `test` `chore` `perf` `ci` `revert`.

Scopes actually in use in this repository: `front`, `live`, `sdk`, `telemetry`, `seed`,
`sql`, `backend`, `contrato`, `vocabulario`. A scope is optional; a wrong one is worse
than none.

The body explains **why**, not what — the diff already says what.

**If the commit changes behaviour, put a number in it.** This repository exists to
measure improvement; a commit that claims one without evidence is the thing it was
built to prevent:

```
feat(planner): reordena la cola por masa descendente

nivel 2: 62 % -> 81 % de bultos colocados (n=50)
```

Real examples from the history:

```
fix(live): el aviso de conexion perdida saltaba sin haberse perdido nada
feat(front): pantalla de detalle de una ejecución (#4)
refactor(front): un solo .env, el de la raiz
test(contrato): vocabulario de fallos cuadrado en los tres sitios
```

Footer: `Closes #123`, `BREAKING CHANGE: …`.

---

## Getting set up

You need **Node 22**, **Python 3.11+**, and a Supabase project you can write to.
(Docker only if you want to run the networked backend tests.)

### 1. Credentials

There is exactly **one** credentials file: `.env` at the repository root. Copy the
example and fill it in from *Supabase → Project Settings → Data API*:

```bash
cp .env.example .env
```

```dotenv
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...       # public, read-only under RLS
SUPABASE_SERVICE_KEY=eyJ...    # SECRET, Python side only
```

> [!WARNING]
> **`SUPABASE_SERVICE_KEY` bypasses row-level security.** It must never reach the
> browser and never be committed. `frontend/next.config.ts` publishes only an explicit
> whitelist of keys as `NEXT_PUBLIC_*`, and fails the build if a public variable's name
> smells like a secret. Do not widen that whitelist. There is no
> `frontend/.env.local` — a second copy of the same values desynchronises on its own,
> and it already did once.

### 2. Schema

The schema is applied **by hand**, in order, from the Supabase SQL editor. All three
files are idempotent, so pasting one again is safe:

| File | What it adds |
|---|---|
| [`backend/sql/001_schema.sql`](backend/sql/001_schema.sql) | tables, views, RLS |
| [`backend/sql/002_design.sql`](backend/sql/002_design.sql) | the columns and views the design needs |
| [`backend/sql/003_snapshots.sql`](backend/sql/003_snapshots.sql) | pallet snapshots (URLs; the PNGs live in Storage) |

### 3. Everything else, in one command

```bash
./dev.sh
```

`dev.sh` checks the credentials, installs the SDK into `.venv` if it is missing, runs
`npm ci` when `package-lock.json` is newer than `node_modules`, **probes the live schema
for the specific columns the frontend queries**, and then starts the dev server on
<http://localhost:3000>.

```bash
./dev.sh --check     # verify only, start nothing
./dev.sh --seed      # seed sample data first
```

That schema probe is the point of the script: the SQL is pasted by hand, so it is normal
for the repository to run ahead of the database. Discovering that in front of an
audience is the expensive failure.

If the project is empty, the generators under `backend/seed/` will fill it — see
[Sample data](README.md#4-sample-data) in the README.

---

## Checks

Run both before you push. **CI runs exactly these**, so a red result here is a red PR.

```bash
# Frontend
cd frontend && npm ci && npm run lint && npm run build

# Backend
pip install -e './backend[dev]'
ruff check backend
pytest backend -q
```

`pytest backend -q` touches no network. Export `DATABASE_URL` pointing at a throwaway
Postgres and it additionally applies the real schema and verifies the contract against
the frontend's queries (`backend/tests/test_contrato.py`) — which is what CI does:

```bash
docker run --rm -d --name pg -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:16
export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/postgres
pytest backend -q
```

### What CI enforces

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and every pull
request, in two jobs:

- **backend** — Python 3.11 with a `postgres:16` service, then `ruff check backend` and
  `pytest backend -q` with `DATABASE_URL` set, so the schema tests really run.
- **frontend** — Node 22, `npm ci`, `npm run lint`, `npm run build`. It is `build` and
  not `tsc --noEmit` on purpose: Next 16 generates the `PageProps<'/runs/[id]'>` types
  during the build, so only a build catches a route typed against them.

### `npm run lint` is three checkers, not one

```
eslint  &&  node scripts/check-colors.mjs  &&  node scripts/check-contrast.mjs
```

The two project-specific ones fail more often than eslint does:

- **`check-colors.mjs`** — no colour literals anywhere outside
  `frontend/styles/colors.css`. It catches `#hex`, `rgb()/rgba()`, `hsl()/hsla()`,
  `hwb()`, `lab()/lch()`, `oklab()/oklch()`, and named colours used as a value, in CSS,
  TS and TSX alike. `transparent`, `currentColor` and `inherit` are allowed — they are
  not a specific colour. Run it alone with `npm run lint:colors`.
- **`check-contrast.mjs`** — WCAG contrast on every colour pair that carries text, in
  **both** themes: 4.5:1 for text, 3:1 for meaningful graphical elements. A grey that
  looks fine on the laptop it was picked on may not be readable on a projector. Run it
  alone with `npm run lint:contrast`.

---

## Hard rules

These are the ones a review will bounce you for. The reasoning behind each is in
[`AGENTS.md`](AGENTS.md) §4 and §7 — this is the checklist.

**No Tailwind.** The design is exact values in `docs/design/`; restating them as
utilities adds noise where there is no decision to make. Components use CSS Modules
next to the component.

**Colours only as variables, defined in one file.** `frontend/styles/colors.css` holds
every colour for both themes. No other file — CSS, TS, or TSX — carries a literal; they
consume `var(--…)`. A translucent colour is another variable in that same file, derived
from the base with `color-mix`. Enforced by `check-colors.mjs`.

**No server between the frontend and Supabase.** PostgREST, RLS and Realtime *are* the
backend. One more process is one more thing that falls over at 3am.

**Never put `service_role` in the frontend.** It bypasses RLS.

**No dependencies without a reason.** The Python SDK has none on purpose: it speaks
PostgREST with `urllib` from the standard library. Keep it that way — it is imported by
the simulation repositories, and every package it grows is a package they inherit.

**Units are always visible, and converted in one place.** The database stores SI
(metres, radians, seconds); the screen shows millimetres and degrees. That conversion
lives only in `frontend/lib/ui.ts`. `4.1 mm`, never `4.1`.

**Never show a raw failure identifier.** `stack_collapse` reads as «el montón se
derrumbó». The translation is `FAILURE_TEXT` in `frontend/lib/ui.ts`.

**Don't compute in the client what a view can compute.** Totals, medians and dominant
causes come out of the SQL views. Two places summing the same thing eventually disagree.

**Medians, not means.** One episode that collapses at 3 s drags the mean cycle time down
and makes a bad run look fast.

**Synthetic and oracle data never share a comparison with measured data.** `runs.oracle`
and `runs.synthetic` are drawn with a diagonal hatch, and `comparability()` in
`frontend/lib/supabase.ts` blocks the delta outright. A pretty, false chart is exactly
what an evaluator will find.

### Adding a failure cause

The vocabulary is closed. A new one means touching **three** places:

1. `FAILURES` in `backend/theker_telemetry/schema.py`
2. the `CHECK` on `episodes.failure` in `backend/sql/001_schema.sql`
3. `FAILURE_TEXT` in `frontend/lib/ui.ts`

Skip the second and the episode writes to disk fine while the upload fails wholesale —
nobody notices until the interface is empty. You no longer have to remember:
`backend/tests/test_vocabulario.py` compares all three and fails if one lags behind.

---

## Language

- **Code identifiers:** English.
- **Comments, documentation and commit subjects:** Spanish.
- **`README.md`, `CONTRIBUTING.md` and `LICENSE`:** English — they are the public face
  of the repository.
- Issues and pull requests: either. Write in whichever you are clearer in.

## A note on `frontend/AGENTS.md`

That file is written and re-added by `next dev` itself (see
`node_modules/next/dist/server/lib/generate-agent-files.js`). Deleting it from a diff
only recreates the uncommitted change; commit it with your work to keep the tree clean.

## Licence

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).
