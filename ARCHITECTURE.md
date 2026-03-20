# Gameforge — Architecture

## How to update this file
When starting a new Claude Code session, paste this file as context.
When finishing a session, ask Claude Code to update this file with any
new decisions, installed packages, or structural changes made during the session.

## Last updated
2026-03-20 (Session 3, end of Wieczór 8)

## Completed milestones
- ✅ Wieczór 1: Accounts (Clerk, Supabase, Resend, Railway)
- ✅ Wieczór 2: Next.js + Pixel Crawler assets in `public/assets/`
- ✅ Wieczór 3: Colyseus deployed on Railway (`gameforge-production-d7c8.up.railway.app`)
- ✅ Wieczór 4: Phaser 3.90.0 installed, first sprite displayed in browser
- ✅ Wieczór 5: WorldState schema complete (all 6 schemas in `server/src/GameRoom.ts`)
- ✅ Wieczór 6: Body_A animations complete — 8 directions, grass background, scale ×1.5, cycling demo
- ✅ Wieczór 7: Player movement synchronized via Colyseus — WASD/arrows, sends `move` every 50ms
- ✅ Wieczór 8: Remote players rendered with interpolation — nickname labels, lerp 0.2
- ⏳ Wieczór 9: Tool and attack animations — NEXT

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

## Wieczór 8 additions

### Changes
- `server/src/GameRoom.ts` — added `player_add`, `player_move`, `player_remove` broadcasts; added `request_players` handler; `onLeave` broadcasts `player_remove`
- `src/app/game/scenes/PlayScene.ts` — replaced schema callbacks with `setupMessageHandlers`; remote players use multi-sprite + lerp interpolation (factor 0.2); nickname labels at Y-52
- `src/app/game/network/ColyseusClient.ts` — custom `joinOrCreate` workaround: calls matchmake HTTP endpoint directly and reformats response before `consumeSeatReservation` (protocol mismatch between colyseus.js@0.16 client and colyseus@0.17 server)

### Key decisions
- **Protocol mismatch colyseus@0.17 vs colyseus.js@0.16** — server 0.17 returns flat `{name, roomId, sessionId, processId}` from matchmake; client 0.16 expects `{room: {name, roomId, processId}, sessionId}`. Fixed by calling matchmake fetch ourselves and reformatting before `consumeSeatReservation`.
- **Schema state not used on client** — `@colyseus/schema@4.x` (server) vs `@colyseus/schema@3.x` (client bundle) are incompatible. All state sync done via explicit broadcast messages instead.
- **`request_players` on scene ready** — `players_init` sent on join arrives before `PlayScene.create()` registers handlers → message dropped. Fix: client sends `request_players` after handlers are set up; server responds with current player list.
- **Remote player multi-sprite** — same pattern as local player: 6 sprites per texture, `setVisible` toggle. Stored in `RemotePlayer` interface with `x/y/targetX/targetY` for lerp.

## Wieczór 7 additions

### New files
- `src/app/game/network/ColyseusClient.ts` — singleton `Client`; `connectRoom()` joins `game_room`; `getRoom()` returns current room
- `src/app/game/scenes/PlayScene.ts` — replaces demo `GameScene`; WASD + arrow movement, Body_A multi-texture animations, sends `move` {x,y,direction,animKey} to Colyseus every 50ms
- `.env.local` — `NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:2567`

### Changes
- `PhaserGame.tsx` — now imports `PlayScene` and calls `connectRoom()` before Phaser init
- `server/package.json` — replaced `ts-node` dev script with `tsx watch src/index.ts` (ts-node can't handle ESM `"type":"module"`)

### Key decisions
- **tsx for server dev** — `ts-node` crashes with `ERR_MODULE_NOT_FOUND` on ESM imports (`.js` extensions required by NodeNext); `tsx` handles ESM natively without extra flags
- **side sprite flipX** — `idle_side`/`walk_side` sheets face RIGHT by default; `flipX: true` = left, `flipX: false` = right (opposite of initial assumption)
- **connectRoom before Phaser** — Colyseus must connect before `PlayScene.create()` so `getRoom()` returns a non-null room

## Key decisions
- **Body_A animation sheets** — PLAN.md assumed a single `Body_A.png`; actual assets are separate sheets per animation (Idle_Down-Sheet.png, Walk_Down-Sheet.png, etc.) with 4 rows each. Row 0 = base Body_A layer. Sheets copied to `public/assets/player/` to avoid spaces in URLs.
- **Body_A frame size** — ASSETS_MAP was wrong (claimed 16×16). Actual frame size is **64×64**. Idle sheets 256×64 → 4 frames (0–3). Walk sheets 384×64 → 6 frames (0–5). `idle_right`/`walk_right` reuse side sheet with `setFlipX(true)`.
- **Body_A multi-texture switching** — each animation direction is a separate spritesheet key; Phaser cross-texture `play()` is unreliable. Use one sprite per texture, toggle `setVisible`.
- **Orc frame size** — ASSETS_MAP says 16×16 but actual frame is 16×32 (character is 2 tiles tall). Idle: 128×32 → 8 cols × 1 row = 8 frames. Run: 384×64 → 24 cols × 2 rows, row 0 = frames 0–23.
- **pixelArt: true** — required in Phaser Game config for nearest-neighbor rendering; without it pixel art sprites are blurry at scale.
- **Scale.FIT + CENTER_BOTH** — use Phaser Scale Manager instead of fixed canvas size; prevents CSS stretching the canvas.
- **Assets in `public/`** — moved from `src/app/assets/` so Next.js serves them as static files
- **Phaser ESM imports** — Phaser 3.90 ESM build has no default export; use named imports: `import { Scene, Game, AUTO } from "phaser"`
- **Phaser + Next.js 16** — `ssr: false` must be in a Client Component (`GameLoader.tsx`); `PhaserGame.tsx` initializes `Phaser.Game` async in `useEffect`
- **Asset paths** — spaces in Pixel Crawler folder names cause 404 in some cases; copy assets to flat paths (e.g. `public/assets/test/`) for reliable serving
- **Fairy Forest frame 15** — solid grass tile, used as base map tile
- **ESM server** — `"type": "module"` in server/package.json; tsconfig uses `module: NodeNext` / `moduleResolution: NodeNext`; local imports require `.js` extensions
- **ESM migration reason** — Colyseus 0.17 depends on `@colyseus/better-call` → `rou3` which is ESM-only; `ERR_REQUIRE_ESM` crash on Railway with CommonJS
- **`onLeave` signature** — Colyseus 0.17 uses `(client, code?: number)`, not `(client, consented: boolean)`
- **Room generic** — `Room<T>` in 0.17 takes a `RoomOptions`-shaped object (`{ state?: object }`), not the state type directly
