# frontend

The Next.js 16 interface of the STACKSPECT palletizing observability platform. It reads
Supabase directly with the anon key, under RLS — there is no server of ours in between.

**Everything you need is in the [root README](../README.md):** requirements,
installation, development, usage and dependencies. Conventions and the checks CI runs
are in [`CONTRIBUTING.md`](../CONTRIBUTING.md).

Three things that trip people up here, in short:

- Credentials come from the **root `.env`**, translated by
  [`next.config.ts`](next.config.ts). There is no `.env.local`.
- `npm run lint` is eslint **plus** `scripts/check-colors.mjs` and
  `scripts/check-contrast.mjs`. Colours only ever live in `styles/colors.css`.
- No Tailwind. CSS Modules next to each component.

```bash
npm ci
npm run dev      # http://localhost:3000  — or ../dev.sh, which checks the schema first
```
