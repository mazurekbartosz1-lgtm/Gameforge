# Gameforge — Development Log

## Rules for this file
- This file is ALWAYS updated at the end of every Claude Code session
- Each session gets a new entry with: date, what was done, decisions made, problems encountered, exact next step to continue
- Never delete old entries — append only
- When starting a new session, read this file first to restore full context

---

## Session 1 — 2026-03-19

### What was done
- Bootstrapped Next.js project with TypeScript + Tailwind CSS (`create-next-app`)
- Redesigned the home page (`src/app/page.tsx`)
- Added 8 Pixel Crawler asset packs (357 PNG files, 16×16 grid) to `public/assets/`
- Generated `public/assets/ASSETS_MAP.md` — full sprite sheet catalogue with dimensions, frame sizes, and category labels
- Created `public/assets/png_data.json` — raw image metadata

### Decisions made
- Assets go in `public/assets/` (not `src/`) so Next.js serves them as plain static files
- All Pixel Crawler sprites use a 16×16 pixel grid; two cover images (1260×1000) are not sprite sheets

### Problems encountered
- None significant

### Next step
- Set up Colyseus game server

---

## Session 2 — 2026-03-20

### What was done
- Created `server/` directory with full Colyseus 0.17.x game server
  - `server/src/GameRoom.ts` — all schemas (PlayerState, ResourceNode, FoodNode, EnemyState, BuildingState, CookingPotState, WorldState), GameRoom class with tick loop and message handlers
  - `server/src/index.ts` — Server entry point on `$PORT` (default 2567)
  - `server/tsconfig.json` — CommonJS target, experimentalDecorators, emitDecoratorMetadata
  - `server/package.json` — scripts: dev/build/start, engines: node ≥20
- Prepared Railway deployment config: `Procfile`, `railway.json`, `.env.example`
- Added `server/.gitignore` to exclude `node_modules/` and `dist/`
- Fixed two Colyseus 0.17 API surprises (see decisions)
- Verified server compiles and runs: `[Colyseus] Listening on ws://localhost:2567`

### Decisions made
- `Room<T>` generic in Colyseus 0.17 wraps a `RoomOptions`-shaped interface, not the state class directly — used `interface GameRoomOptions extends RoomOptions { state: WorldState }`
- `onLeave` signature is `(client, code?: number)`, not `(client, consented: boolean)`
- Server uses `"type": "commonjs"` + `module: commonjs` in tsconfig for ts-node compatibility
- `dist/` excluded from git; Railway runs `npm install && npm run build` on deploy

### Problems encountered
- Default `tsconfig.json` from `tsc --init` had `module: nodenext` and `jsx: react-jsx` — incompatible with ts-node/CommonJS; replaced entirely
- `server/node_modules` accidentally staged before `.gitignore` was created — removed with `git rm -r --cached`

### Next step
- Connect the Next.js frontend to the Colyseus server using the `colyseus.js` client SDK
- Create a game canvas (Phaser or plain Canvas API) inside a Next.js page/component
- Implement player movement: client sends `move` messages, server broadcasts state patches

---

## Session 3 — 2026-03-20 (continued)

### What was done
- Created ARCHITECTURE.md — full technical stack documentation with file structure, schema definitions, tick loop, message handlers, and key API decisions
- Created CLAUDE_HISTORY.md — running development log with append-only rules and session entries for Sessions 1 and 2
- Created SESSION_START_PROMPT.md — ready-to-paste prompt for starting new Claude Code sessions
- Created PLAN.md — complete 50-evening development plan with detailed, self-contained Claude Code prompts for each evening, referencing real file paths and technology names

### Decisions made
- PLAN.md uses status markers: [x] Done, [~] In progress, [ ] Not started
- Each prompt in PLAN.md is fully self-contained — no external context needed to execute
- All documentation is self-maintaining: instructions for updating are embedded in each file

### Problems encountered
- Railway outage is still blocking Wieczór 3 deploy — all files are ready, just waiting for Railway to be back online

### Next step
Resume with Wieczór 3 (Railway deploy) when Railway is back online.
Start next session by pasting SESSION_START_PROMPT.md to Claude Code.
Wieczór 3 prompt is in PLAN.md — it covers the /health endpoint and environment variable setup.

---

## Session 4 — 2026-03-20 (continued)

### What was done
- Fixed Vercel build — excluded `server/` from Next.js TypeScript compilation (`tsconfig.json` exclude array)
- Fixed Next.js 16 / Turbopack conflict — replaced webpack config with `turbopack: {}` in `next.config.ts`
- Fixed ESM/CommonJS conflict in Colyseus server crashing on Railway (`ERR_REQUIRE_ESM` from `rou3` via `@colyseus/better-call`)
  - Changed `server/package.json` `"type"` from `"commonjs"` to `"module"`
  - Changed `server/tsconfig.json` module + moduleResolution to `NodeNext`
  - Updated `server/src/index.ts` local import to `"./GameRoom.js"` (ESM requires explicit extensions)
- Successfully deployed Colyseus to Railway: `gameforge-production-d7c8.up.railway.app`
- Created all 5 documentation files: ARCHITECTURE.md, PRD.md, CLAUDE_HISTORY.md, SESSION_START_PROMPT.md, PLAN.md
- **Wieczór 3 — DONE ✅**

### Decisions made
- Server must use ESM (`"type": "module"`) because Colyseus 0.17.x dependency chain includes ESM-only packages
- Next.js 16 uses Turbopack by default — webpack config causes build failure; use `turbopack: {}` instead
- `server/` must be in root `tsconfig.json` exclude list to prevent Next.js from trying to compile Colyseus code

### Problems encountered
- Railway outage delayed Wieczór 3 deploy by one session
- `ERR_REQUIRE_ESM` from `rou3` — not obvious from Colyseus docs, required ESM conversion of entire server
- Next.js 16 Turbopack is a breaking change from Next.js 14/15 webpack behavior

### Next step
**Wieczór 4** — Phaser in Next.js + first Pixel Crawler sprite.
Prompt is in PLAN.md under "Wieczór 4".
Start next session by pasting SESSION_START_PROMPT.md to Claude Code.

---

## Session 5 — 2026-03-20 (continued)

### What was done
- Fixed Railway deployment: Root Directory set to `server/` in Railway project settings
- Domain port mapped to 8080 in Railway Networking settings
- Confirmed Colyseus server responding at `gameforge-production-d7c8.up.railway.app` — returns `Colyseus 0.17.39` ✅
- **Wieczór 3 COMPLETE ✅**

### Decisions made
- Railway requires Root Directory = `server/` so it reads `server/package.json` (not root Next.js package.json)
- Railway internal port must be set to 8080 in Networking settings and mapped to the public domain

### Problems encountered
- Server code and local build were correct all along — issue was purely Railway dashboard configuration
- `listen("0.0.0.0")` was already the right fix; Railway port mapping was the missing piece

### Next step
**Wieczór 4** — Install Phaser 3 in Next.js, create `/game` page with a GameCanvas component,
display first Pixel Crawler sprite (Body_A) with idle_down animation.
Prompt is in PLAN.md under "Wieczór 4".

---

## REMINDER: Update this file before ending every session
Run this prompt when finishing work:
"Update CLAUDE_HISTORY.md with what we did today, decisions made,
problems encountered, and the exact next step for next session."
