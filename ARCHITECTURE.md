# Gameforge — Architecture

## How to update this file
When starting a new Claude Code session, paste this file as context.
When finishing a session, ask Claude Code to update this file with any
new decisions, installed packages, or structural changes made during the session.

## Last updated
2026-03-21 (Session 5, end of Wieczór 15)

## Completed milestones
- ✅ Wieczór 1: Accounts (Clerk, Supabase, Resend, Railway)
- ✅ Wieczór 2: Next.js + Pixel Crawler assets in `public/assets/`
- ✅ Wieczór 3: Colyseus deployed on Railway (`gameforge-production-d7c8.up.railway.app`)
- ✅ Wieczór 4: Phaser 3.90.0 installed, first sprite displayed in browser
- ✅ Wieczór 5: WorldState schema complete (all 6 schemas in `server/src/GameRoom.ts`)
- ✅ Wieczór 6: Body_A animations — 8 directions, scale ×1.5
- ✅ Wieczór 7: Player movement synchronized via Colyseus — WASD/arrows, `move` every 50ms
- ✅ Wieczór 8: Remote players rendered with interpolation — nickname labels, lerp 0.2
- ✅ Wieczór 9: Tool and attack animations — slice/collect/crush/pierce in 3 dirs
- ✅ Wieczór 10: Multiplayer test — CORS fix, "Players online: N" overlay
- ✅ Wieczór 11+12: Procedural infinite world — hash-based terrain, TileSprite grass, forest overlay
- ✅ Wieczór 13: Fog of war — per-tile discovered Set, VISION_RADIUS=60 tiles
- ✅ Wieczór 14: Resource nodes — client-side chunk generation, tree/rock sprites, dead-resource sync, box collision
- ✅ Wieczór 15: Gameplay polish — inventory HUD, harvest detection fix, sprite destroy-on-death, overlapping footprints fix, tree/rock tuning
- ✅ Wieczór 16: Camera deadzone + lerp, minimap z mgłą wojny, VISION_RADIUS 60→16
- ⏳ Wieczór 17: TBD

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

## Wieczór 16 additions

### Camera deadzone + lerp
- `cameras.main.startFollow(followTarget, true, 0.08, 0.08)` — płynne śledzenie (lerp)
- `cameras.main.setDeadzone(200, 140)` — gracz porusza się swobodnie w centrum bez ruszania kamerą

### Minimap
- `minimapGfx: Graphics`, scrollFactor 0, depth 25, prawy górny róg `(632, 8)`, rozmiar `160×120` px
- `MINIMAP_SCALE = 4` — 1 px minimapy = 4 tile świata
- Pass 1: terrain (trawa `#2a4a2a`, las `#1a6a1a`) dla odkrytych kafelków
- Pass 2: czarna nakładka 65% dla odkrytych ale zafoggowanych kafelków
- Drzewa (zielone), kamienie (szare), inni gracze (niebieskie), gracz (biały 3×3)

### Fog of war fix
- `VISION_RADIUS` zmniejszony z 60 → 16 tile (256px promień)
- Poprzednia wartość 60 była większa niż połowa przekątnej ekranu → mgła nigdy nie była widoczna

## Wieczór 15 additions

### Inventory HUD
- `PlayScene.ts` — `inventory: Map<string,number>`, `hudTexts: Map<string,Text>`
- `initInventoryHud()` — Wood/Stone labels at bottom-center, scrollFactor 0, depth 20
- `addItems(drops)` — updates counts + shows floating pickup text (yellow, tween up 40px, fade 1400ms)
- `harvest_reward` message from server triggers `addItems`; offline fallback gives items locally

### Harvest detection fix
- `findAdjacentResource` rewritten to pixel-based directional rectangle (REACH=48px, WIDE=24px)
- Fixes up/down harvest not working — PLAYER_HH=20px > 1 tile so ±1 tile check was too short

### Sprite destroy-on-death
- Dead resource sprites are now **destroyed** via `killResourceSprite(id)` instead of `setVisible(false)`
- Eliminates stale-sprite artifacts when harvesting

### Overlapping footprints fix
- `tileToResource: Map<string,string>` replaced with `tileToResources: Map<string,Set<string>>`
- Each tile tracks all resources covering it; `unregisterFootprint` only removes the dying resource's id
- `aliveResourceAt(key)` returns first alive resource id in a tile's set
- Fixes: harvesting one tree from an overlapping pair no longer empties the other's footprint

### Tree/rock tuning
- `TREE_STEP` raised from 7 → 10 (fewer trees, more space between)
- `TREE_MAX_OFFSET` raised from 1 → 3 (jitter 0–2 tiles, occasional 1–1.5 tile overlap)
- Tree depth raised from 2 → 3 (renders above rocks)
- `ROCK_DENSITY` lowered from 0.75 → 0.375 (half as many rocks)
- Rocks never respawn — `deadRocks` set tracks harvested ids permanently
- Server: removed `deadRocks` map and `respawnDeadRocks`; rock harvest still broadcasts `rock_dead`

### /objects page (enemy animations)
- Auto-detect frame size for generic `-sheet` files (sentinel `{w:0,h:0}` → use `dim.h`)
- Enemies grouped by character name not animation type (extended `SUB_FOLDER` regex)
- `GroupPreview` capped to 72×72px; `AnimGroupRow` shows 4-direction squares per animation

## Wieczór 14 additions

### New files / major changes
- `src/app/game/world/MapGenerator.ts` — rewritten: `treeAtChunk(cx,cy,seed)`, `rockAtChunk(cx,cy,seed)`, `isForestTile(wx,wy,seed)`, constants `TREE_STEP=10`, `ROCK_STEP=3`, `FOREST_THRESHOLD=0.494`, `SPAWN_CLEAR_RADIUS=16`, `SMOOTH_RADIUS=10`
- `src/app/game/scenes/PlayScene.ts` — client-side infinite chunk generation, tree/rock sprites, footprint collision, dead-resource sync, box collision with sliding, debug overlay

### Client-side chunk generation
- Trees generated with `generateTreeChunksAround(tileX, tileY)` — radius `ceil(VISION_RADIUS/TREE_STEP)+2` chunks
- Rocks generated with `generateRockChunksAround(tileX, tileY)` — radius `ceil(VISION_RADIUS/ROCK_STEP)+2` chunks
- Each chunk generated once and cached in `generatedTreeChunks`/`generatedRockChunks` (Set of `"cx,cy"`)
- Triggers on tile-change only — fires alongside fog reveal

### Resource sprites
- **Tree** — `tree_sheet.png` (4×2 frames, 112×184px each), frame 0 or 1, scale 1.0, cropped to 112×152 (removes dirt mound), origin (0.5, 1.0)
- **Rock** — `rocks.png` (13 cols × 19 rows, 16×16 frames), frame 18 (row 1 col 5, most opaque), scale 3.0, origin (0, 0)

### Collision footprints (`tileToResource` map)
- **Tree**: 7 wide (dx –3..+3) × 10 tall (dy –9..0) — full sprite coverage
- **Rock**: 3×3 tiles (dx 0..2, dy 0..2) — matches 48×48px scaled sprite

### Dead-resource multiplayer sync
- Server: `deadTrees: Map<string,number>` and `deadRocks: Map<string,number>` (id → respawnAt)
- Messages: `request_dead_trees` → `dead_trees_init`, `request_dead_rocks` → `dead_rocks_init`
- Broadcast on harvest: `tree_dead`, `rock_dead`; on respawn: `rock_respawn` (trees never respawn)
- Client waits for BOTH `dead_trees_init` AND `dead_rocks_init` before initial generation (`tryInitialGenerate` barrier)

### Player collision box
- `PLAYER_HW=12`, `PLAYER_HH=20` — 24×40px box centered at `(px, py)`
- `isBoxBlocked(px, py)` — checks every tile overlapping the AABB against `tileToResource`
- Sliding movement: X and Y checked independently (player slides along wall edges)

### Collision debug overlay (`collisionGfx`, depth 6)
- Dark red (0x660000, 35%) on all blocked resource tiles
- Cyan rectangle (0x00ffff, 40%) — player collision box
- Orange rectangle (0xff8800, 30%) — slice attack range (48px forward, 32px wide) based on `this.direction`

### Server simplification
- `ResourceNode` entries removed from server (all client-side) — no `spawnResources`, no server-side terrain functions
- `Encoder.BUFFER_SIZE` raised to 256 KB in `index.ts` for large initial state patches

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
