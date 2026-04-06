# TypeFast

TypeFast is a Bun monorepo for a competitive typing game. The web app lets players complete monthly prompts, build streaks and XP, claim territory on a hex map, and compare performance on global or country leaderboards. The backend is powered by Convex and Better Auth.

## Workspace Layout

- `apps/web`: React 19 + Vite frontend
- `apps/backend`: Convex functions, schema, auth, and leaderboard logic
- `scripts/check-web-bundle.mjs`: bundle budget guard for the web build
- `.docs/`: local-only research notes and reference material, intentionally ignored by git

## Requirements

- Bun `1.3.5` or newer
- A Convex project for the backend

## Getting Started

1. Install dependencies:

```bash
bun install
```

2. Create local env files from the examples:

```bash
cp apps/backend/.env.example apps/backend/.env.local
cp apps/web/.env.example apps/web/.env.local
```

3. Fill in the backend env values:

- `CONVEX_DEPLOYMENT`
- `CONVEX_URL`
- `CONVEX_SITE_URL`
- `BETTER_AUTH_SECRET`
- `SITE_URL` defaults to `http://localhost:3000`

4. Fill in the web env values:

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`

5. Start the workspace:

```bash
bun run dev
```

This starts the Convex backend and the Vite frontend together. The web app runs on `http://localhost:3000`.

## Root Commands

Run these from the repo root:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start all workspace dev processes |
| `bun run dev:web` | Start only the Vite app |
| `bun run dev:backend` | Start only Convex |
| `bun run build` | Build the web app |
| `bun run lint` | Run all available workspace lint scripts |
| `bun run typecheck` | Run all workspace typechecks |
| `bun run check` | Run the backend check plus the full web validation flow |
| `bun run check:web` | Run formatting, lint, typecheck, build, and bundle budget checks for the web app |
| `bun run check:backend` | Run backend static validation |
| `bun run format` | Check Prettier formatting for the web app |
| `bun run format:write` | Apply Prettier formatting to the web app |
| `bun run bundle:check` | Verify the web bundle stays within budget |

## App Commands

### `apps/web`

- `cd apps/web && bun run dev`
- `cd apps/web && bun run build`
- `cd apps/web && bun run preview`
- `cd apps/web && bun run lint`
- `cd apps/web && bun run lint:fix`
- `cd apps/web && bun run typecheck`
- `cd apps/web && bun run format`
- `cd apps/web && bun run format:write`
- `cd apps/web && bun run check`
- `cd apps/web && bun run fix`

### `apps/backend`

- `cd apps/backend && bun run dev`
- `cd apps/backend && bun run deploy`
- `cd apps/backend && bun run typecheck`
- `cd apps/backend && bun run check`

## Notes

- `.docs/` is treated as local workspace material and is not part of the git-tracked project surface.
- Env examples stay tracked; local env files and common secret file formats are ignored.
