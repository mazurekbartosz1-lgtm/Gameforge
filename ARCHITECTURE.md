# Gameforge — Architecture

## How to update this file
When starting a new Claude Code session, paste this file as context.
When finishing a session, ask Claude Code to update this file with any
new decisions, installed packages, or structural changes made during the session.

## Last updated
2026-03-20

## Completed milestones
- ✅ Wieczór 1: Accounts (Clerk, Supabase, Resend, Railway)
- ✅ Wieczór 2: Next.js + Pixel Crawler assets in `public/assets/`
- ✅ Wieczór 3: Colyseus deployed on Railway (`gameforge-production-d7c8.up.railway.app`)
- ✅ Wieczór 4: Phaser 3.90.0 installed, first sprite displayed in browser
- ✅ Wieczór 5: WorldState schema complete (all 6 schemas in `server/src/GameRoom.ts`)
- ⏳ Wieczór 6: Body_A player character animations — NEXT

## Live URLs
- **Colyseus game server (Railway):** `wss://gameforge-production-d7c8.up.railway.app`
- **Railway internal port:** 8080 (domain mapped to port 8080 in Railway Networking settings)
- **Status:** Colyseus fully deployed and working on Railway ✅

---

## Project overview
Multiplayer browser game with a Next.js frontend and a Colyseus real-time game server.

## Repository structure
```
Gameforge/
├── src/app/          # Next.js frontend (App Router)
│   ├── page.tsx      # Home page
│   ├── layout.tsx    # Root layout
│   └── globals.css
├── public/
│   └── assets/       # Static game assets (Pixel Crawler sprite packs, 16×16 grid)
│       ├── ASSETS_MAP.md       # Sprite sheet catalogue (357 PNGs, frame size 16×16)
│       └── Pixel Crawler - */  # 8 asset packs: Castle, Cemetery, Desert, Fairy Forest,
│                               #   Forge, Free Pack, Hideout, Sewer
├── server/           # Colyseus game server (Node.js)
│   ├── src/
│   │   ├── index.ts      # Server entry point, port via $PORT (default 2567)
│   │   └── GameRoom.ts   # Room logic, schemas, tick loop
│   ├── Procfile          # Railway: web: node dist/index.js
│   ├── railway.json      # Railway build + deploy config
│   └── .env.example      # PORT=2567
└── ASSETS_MAP.md     # (also lives in public/assets/)
```

## Tech stack

### Frontend
| Concern | Choice |
|---------|--------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Game engine | Phaser 3.90.0 (ESM named imports, client-side only via `dynamic ssr:false`) |
| Runtime | Node.js ≥20 |

### Game server
| Concern | Choice |
|---------|--------|
| Framework | Colyseus 0.17.x |
| State sync | @colyseus/schema 4.x (`@type` decorators, 16-bit/float32 primitives) |
| Transport | @colyseus/ws-transport (WebSocket) |
| Language | TypeScript → compiled to `dist/` via `tsc` |
| Dev server | ts-node + nodemon |
| Deployment target | Railway — `gameforge-production-d7c8.up.railway.app` |
| WebSocket URL | `wss://gameforge-production-d7c8.up.railway.app` |

## Game server schemas (GameRoom.ts)
- `PlayerState` — sessionId, userId, nickname, x/y, hp, hunger, sanity, inventory, equipment, activeSlot, direction, animKey, isOnline
- `ResourceNode` — id, type, x/y, hp, respawnAt, isAlive
- `FoodNode` — id, type, x/y, isAlive, respawnAt
- `EnemyState` — id, type, x/y, hp, isAlive, animKey
- `BuildingState` — id, type, x/y, material, hp, ownerId
- `CookingPotState` — id, buildingId, slot1/2, currentRecipe, cookingUntil, isReady, result
- `WorldState` — MapSchema collections of all above + worldTime (0–1 day cycle) + isNight

## Tick loop (1 s interval)
1. Update `worldTime` and `isNight` (10-min real-time day cycle)
2. Drain hunger (0.5/s) and sanity at night (1.0/s) / regen sanity during day (0.5/s)
3. Respawn dead ResourceNodes and FoodNodes when `respawnAt` passes

## Message handlers (client → server)
- `move` — x, y, direction, animKey
- `equip` — slot, itemId
- `activeSlot` — slot index

## Key decisions
- **Assets in `public/`** — moved from `src/app/assets/` so Next.js serves them as static files
- **Phaser ESM imports** — Phaser 3.90 ESM build has no default export; use named imports: `import { Scene, Game, AUTO } from "phaser"`
- **Phaser + Next.js 16** — `ssr: false` must be in a Client Component (`GameLoader.tsx`); `PhaserGame.tsx` initializes `Phaser.Game` async in `useEffect`
- **Asset paths** — spaces in Pixel Crawler folder names cause 404 in some cases; copy assets to flat paths (e.g. `public/assets/test/`) for reliable serving
- **Fairy Forest frame 15** — solid grass tile, used as base map tile
- **ESM server** — `"type": "module"` in server/package.json; tsconfig uses `module: NodeNext` / `moduleResolution: NodeNext`; local imports require `.js` extensions
- **ESM migration reason** — Colyseus 0.17 depends on `@colyseus/better-call` → `rou3` which is ESM-only; `ERR_REQUIRE_ESM` crash on Railway with CommonJS
- **`onLeave` signature** — Colyseus 0.17 uses `(client, code?: number)`, not `(client, consented: boolean)`
- **Room generic** — `Room<T>` in 0.17 takes a `RoomOptions`-shaped object (`{ state?: object }`), not the state type directly
