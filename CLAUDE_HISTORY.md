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

## Session 6 — 2026-03-20 (continued)

### What was done
- Installed Phaser 3.90.0 in root `package.json`
- Created `src/app/game/page.tsx` — Server Component, `#game-container` div 100vw×100vh
- Created `src/app/game/GameLoader.tsx` — Client Component with `dynamic(..., { ssr: false })` (required by Next.js 16 Turbopack)
- Created `src/app/game/PhaserGame.tsx` — Client Component, initializes `Phaser.Game` async in `useEffect`, cleanup on unmount
- Created `src/app/game/GameScene.ts` — Phaser Scene loading Fairy Forest tileset, displaying frame 15 at scale ×8
- Fixed texture loading: `this.textures.list` crashed with `toJSON` error — replaced with `Object.keys(this.textures.list)`
- Fixed Phaser import: ESM build has no default export — used named imports `{ Scene, Game, AUTO }`
- Copied `Tiles.png` to `public/assets/test/tiles.png` (spaces in original path caused 404)
- Disabled Phaser audio: `audio: { noAudio: true }` in game config
- Used frame grid debug view (80 frames, scale ×4) to identify usable tiles — frame 15 = solid grass
- **Wieczór 4 COMPLETE ✅**

### Decisions made
- Phaser 3.90 ESM has no default export — always use named imports
- `ssr: false` in `next/dynamic` must live in a Client Component (`GameLoader.tsx`), not a Server Component
- Asset paths with spaces need to be copied to a flat path for reliable serving
- Frame 15 of Fairy Forest `Tiles.png` = solid grass tile (chosen as base map tile)

### Problems encountered
- `this.textures.list` passed to `console.log` crashes — Phaser's internal texture object calls `toJSON` during serialization
- Next.js 16 Turbopack rejects `ssr: false` in Server Components — required an extra Client Component wrapper

### Next step
**Wieczór 5** (WorldState Schema) already done in `server/src/GameRoom.ts`.
**Skip to Wieczór 6** — Player character Body_A animations in 4 directions.
Prompt is in PLAN.md under "Wieczór 6".

---

## Session 7 — END OF SESSION 1 — 2026-03-20

### Summary of Wieczory 1–5 completed this session

- ✅ **Wieczór 1** — Accounts setup: Clerk, Supabase, Resend, Railway
- ✅ **Wieczór 2** — Next.js project structure + 357 Pixel Crawler PNGs in `public/assets/`, `ASSETS_MAP.md` generated
- ✅ **Wieczór 3** — Colyseus game server deployed on Railway at `gameforge-production-d7c8.up.railway.app` (port 8080)
- ✅ **Wieczór 4** — Phaser 3.90.0 installed in root `package.json`, first Pixel Crawler sprite (Fairy Forest frame 15) displayed in browser at `/game`
- ✅ **Wieczór 5** — WorldState Schema complete: PlayerState, ResourceNode, FoodNode, EnemyState, BuildingState, CookingPotState all defined in `server/src/GameRoom.ts`

### Issues resolved this session
- ESM/CommonJS conflict in Colyseus — converted server to `"type": "module"`, `module: NodeNext`
- Railway port mapping — Root Directory set to `server/`, internal port 8080 mapped in Networking
- Vercel build failure — excluded `server/` from Next.js `tsconfig.json` + replaced webpack config with `turbopack: {}`
- Phaser default export missing in ESM — switched to named imports
- Next.js 16 `ssr: false` in Server Component error — added `GameLoader.tsx` Client Component wrapper
- Phaser `textures.list` toJSON crash — replaced with `Object.keys(this.textures.list)`

### Next session starts with
**Wieczór 6** — Body_A player character animations in 4 directions (idle + walk).
Paste `SESSION_START_PROMPT.md` first, then use the Wieczór 6 prompt from `PLAN.md`.

---

---

## Session 8 — 2026-03-20 (Session 2)

### What was done
- Discovered PLAN.md's Body_A description was incorrect — no single `Body_A.png` exists; the Free Pack uses **separate sheets per animation** (Idle_Down-Sheet.png, Walk_Down-Sheet.png, etc.)
- Copied 6 animation sheets to `public/assets/player/` (flat paths, no spaces): idle_down, idle_up, idle_side, walk_down, walk_up, walk_side
- Created `src/app/game/animations/playerAnimations.ts` — `createPlayerAnimations(scene)` registers all 8 Phaser animations
- Updated `src/app/game/GameScene.ts` — loads 6 spritesheets, creates player sprite at center (scale ×4), cycles through all 8 animations every 1 second with a label
- TypeScript compiles cleanly (no errors)
- **Wieczór 6 COMPLETE ✅**

### Decisions made
- Idle sheets (256×64) have 16 cols × 4 rows; row 0 = 16 animation frames at 8fps
- Walk sheets (384×64) have 24 cols × 4 rows; row 0 = 24 animation frames at 8fps
- `idle_right` / `walk_right` reuse the side-facing sheet — caller sets `setFlipX(true)`
- The 4 rows in each sheet are body-layer variants (for compositing multiple character pieces); row 0 is the base layer sufficient for Body_A

### Problems encountered
- PLAN.md assumed a monolithic `Body_A.png` with all directions in rows — this file doesn't exist; each direction/action is a separate sheet

### Next step
**Wieczór 7** — Player movement synchronized via Colyseus.
- Install `colyseus.js` client SDK
- Create `src/app/game/network/ColyseusClient.ts` singleton connection
- Implement WASD + arrow key movement in PlayScene.ts
- Send `move` messages to server every 50ms
- Prompt is in PLAN.md under "Wieczór 7"

---

---

## Session 9 — 2026-03-20 (Session 2, continued)

### What was done
- Debugged Wieczór 6 animation issues across multiple iterations
- Root cause found: ASSETS_MAP.md had **wrong frame size** — claimed 16×16 but actual Body_A frame is **64×64** (verified by user opening the PNG)
- Idle sheets 256×64 → 4 frames (0–3); Walk sheets 384×64 → 6 frames (0–5)
- Fixed `playerAnimations.ts` to use correct frame ranges
- Fixed `GameScene.ts` to cycle all 8 animations using 6 sprites (one per texture) with `setVisible` toggle — reliable alternative to Phaser cross-texture `play()`
- Fixed canvas scaling: `Scale.FIT + CENTER_BOTH + pixelArt:true` in PhaserGame.tsx, game world 800×600
- Added `overflow:hidden` to body via globals.css to remove browser scrollbar gap
- **Wieczór 6 COMPLETE ✅** (for real this time)

### Decisions made
- Body_A actual frame size: 64×64 (not 16×16 as ASSETS_MAP claimed)
- Multi-texture animation: use separate sprite per texture + `setVisible` toggle; Phaser `setTexture()+play()` is unreliable across different spritesheet keys
- Scale ×3 for Body_A (64×3=192px) is a good visible size for the demo
- `Scale.FIT + CENTER_BOTH` is the correct Phaser approach for full-screen canvas

### Problems encountered
- ASSETS_MAP.md frame size metadata was incorrect — led to multiple failed attempts with 16×16 and 16×32 frame sizes
- Orc sprites tried as fallback but had their own cross-texture animation issues
- `Scale.RESIZE` returned fractional heights (729.6); `window.innerWidth` gave positioning drift; `Scale.FIT` with 800×600 is the reliable solution

### Next step
**Wieczór 7** — Player movement synchronized via Colyseus.
- Install `colyseus.js` client SDK
- Create `src/app/game/network/ColyseusClient.ts` singleton
- WASD + arrow key movement in PlayScene
- Send `move` messages to server every 50ms
- Prompt is in PLAN.md under "Wieczór 7"

---

## Session 10 — 2026-03-20 (Session 3)

### What was done
- Discovered action animation sheets in Free Pack: Slice, Crush, Pierce, Collect (each with Down/Side/Up variants)
- Verified actual frame size: 512×64 → 8 frames of 64×64 each (consistent with player sprites)
- Copied 12 sheets to `public/assets/actions/` (flat paths, no spaces)
- Created `src/app/game/animations/toolAnimations.ts` — `preloadToolSprites()` and `createToolAnimations()` registering 12 animations (4 actions × 3 dirs, frameRate 12 for attacks, 8 for collect, repeat 0)
- Updated `PlayScene.ts`:
  - Imports from toolAnimations.ts
  - `toolSprites: Map<string, Phaser.GameObjects.Sprite>` — 12 hidden sprites at player position, depth 1
  - `actionKeys` — SPACE and E bindings
  - `playActionAnim(action)` — determines direction suffix+flipX, plays one-shot animation, hides on complete, sends `room.send('action', ...)`
  - `update()` — JustDown checks for SPACE (slice) and E (collect)
  - Tool sprites repositioned with player on move
- Added `action` message handler in `server/src/GameRoom.ts` — logs action type, player, and position
- TypeScript compiles with zero errors

### Decisions made
- Tool animation frame size: 64×64 (same as player sprites) — not 16×16 as original PLAN.md assumed
- `isActionPlaying` guard prevents animation overlap (subsequent presses ignored while animation plays)
- `Phaser.Input.Keyboard.JustDown()` used for action keys to prevent holding the key from spamming
- tool sprites positioned via `toolSprites.forEach` in the same move block as player sprites

### Problems encountered
- Tool sprite showed on top of idle body sprite — tool sheets include the full character, so body sprites must be hidden during action and restored on animationcomplete
- Default fps (12/8) felt too slow — bumped all action animations to 20fps

### Next step
**Wieczór 10** — Multiplayer test with two browser tabs.
- Run Colyseus server + Next.js dev server simultaneously
- Open two browser tabs at /game
- Verify movement interpolation works between tabs
- Fix CORS if needed, add "Players online: N" overlay text
- Prompt is in PLAN.md under "Wieczór 10"

---

## Session 11 — 2026-03-20 (Session 3, continued)

### What was done
- Added CORS Express middleware to `server/src/index.ts` via `transport.getExpressApp()` — sets `Access-Control-Allow-Origin: *` for Colyseus HTTP matchmaking endpoints
- Installed `@types/express` in server dev dependencies (needed for typed middleware params)
- Added "Players online: N" overlay (top-left) and session ID text (top-right) to PlayScene
  - Both use `setScrollFactor(0)` + `setDepth(10)` to stay fixed to camera
  - Count updates on `players_init`, `player_add`, `player_remove`
- **Wieczór 10 COMPLETE ✅**

### Decisions made
- CORS handled via Express middleware (not WebSocketTransport option — `cors` doesn't exist in `TransportOptions`)
- `playerCount` initialized to 1 (local player), updated on server messages — no room state query needed
- Overlay uses `setScrollFactor(0)` instead of setting camera-fixed position manually

### Problems encountered
- `cors` property doesn't exist in `WebSocketTransport` options — used `getExpressApp()` instead
- `@types/express` was missing from server devDependencies — caused TS7016 error on Express types import

### Additional fixes after commit
- Vercel was falling back to `ws://localhost:2567` because `NEXT_PUBLIC_COLYSEUS_URL` was not set in Vercel dashboard
- Fixed by adding `NEXT_PUBLIC_COLYSEUS_URL=wss://gameforge-production-d7c8.up.railway.app` in Vercel → Settings → Environment Variables → Redeploy

### Next step
**Wieczór 11** — Tiled editor + import Pixel Crawler Fairy Forest tileset.
- Download and install Tiled Map Editor
- Create 100×100 tile map (16×16 tiles = 1600×1600px)
- Import Fairy Forest tileset, create Ground/Decoration/Collision/Spawns layers
- Export as `public/assets/maps/world.tmj`
- Prompt is in PLAN.md under "Wieczór 11"

---

## Session 12 — 2026-03-20 (Session 3, continued)

### What was done
- Replaced Tiled-based map plan (Wieczory 11–12) with procedural generation
- Created `src/app/game/world/MapGenerator.ts`:
  - mulberry32 seeded PRNG — deterministic, same seed = same map
  - `generateMap(seed)` → 80×80 tiles, Tiles.png indices, grass variants (14/15/16)
  - Forest patches: 18 random circular clusters, tile 28 (forest floor), solid collision
  - Perimeter always solid; center 14-tile radius kept clear for spawn
  - Exports: `MAP_WIDTH=80`, `MAP_HEIGHT=80`, `TILE_SIZE=16`
- Added `@type("uint32") mapSeed` to `WorldState` in `GameRoom.ts`
- `GameRoom.onCreate()` generates random seed per room — all players in same room get same map
- Updated `PlayScene.ts`:
  - `preload()`: loads `fairy_tiles` as plain image (not spritesheet) for tilemap
  - `create()`: reads `room.state.mapSeed`, calls `generateMap()`, creates Phaser tilemap
  - Camera bounded to 80×80 tile world, follows player via `centerOn(px, py)` in update
  - Player movement checks collision against `collisionMap` array before applying
  - Player initial position: map center (640, 640)
- **Wieczór 11 + 12 COMPLETE ✅** (merged into one — no Tiled needed)

### Decisions made
- Procedural generation beats Tiled for a multiplayer game: each room gets a unique world
- Seed stored in WorldState so late-joining clients get the same map as existing players
- Collision is manual (not Phaser physics) — check tile in collisionMap before moving
- `centerOn()` in update() is simpler than `startFollow()` which requires a Game Object
- Tile 28 used for forest floor (row 2 col 2, same column as grass tile 15) — visually distinct

### Problems encountered
- Tile 28 (forest floor) looked identical to grass — not visually distinct
- `centerOn()` in update() unreliable for camera tracking — player appeared at bottom-right instead of center
- Fixed: forest = dark green Graphics overlay (0x0d2b0d, 75% alpha) over collisionMap tiles
- Fixed: camera uses `startFollow(followTarget)` with invisible Rectangle that moves with player

### Next step
**Wieczór 13** — Resource nodes (trees, rocks) visible on map.
- Spawn ResourceNode objects at Spawns layer positions (or procedurally from seed)
- Render tree/rock sprites from Pixel Crawler assets
- Handle player interaction (E key near resource)
- Prompt is in PLAN.md under "Wieczór 13"

---

## Session 13 — 2026-03-20 (Session 3, continued)

### What was done
- Implemented fog of war in PlayScene.ts (Wieczór 13)
- `discovered[y][x]: boolean[][]` — persists in memory during session
- `fogGraphics: Phaser.GameObjects.Graphics` — redrawn each frame (camera-visible tiles only)
- `revealAround(tileX, tileY)` — marks all tiles within VISION_RADIUS=6 as discovered
- `drawFog(tileX, tileY)` — renders per-tile: undiscovered=black 95%, explored=black 60%, visible=clear
- Fog update only triggers when player crosses tile boundary (optimization)
- Player sprites depth 9, tool sprites depth 10, fog depth 8, overlay text depth 10 (above fog)
- Initial reveal on create() so player starts with visible area
- **Wieczór 13 COMPLETE ✅**

### Decisions made
- Camera-visible tile range only redrawn each frame (~2000 tiles) — avoids full 6400-tile redraw
- `drawFog` always called (even without movement) so fog renders correctly during camera scroll
- `revealAround` called only on tile change for performance
- Depth hierarchy: tilemap(0) → forest overlay(1) → fog(8) → player(9) → tool(10) → UI(10+)

### Problems encountered
- None

### Next step
**Wieczór 14** — Resource nodes (trees, rocks) on map with interaction.
- Server generates ResourceNode positions from mapSeed
- Client receives and renders tree/rock sprites
- E key near resource → collect animation + server action handler

---

## Session 14 — 2026-03-20 (Session 3, continued)

### What was done
- Rewrote `MapGenerator.ts` for infinite procedural world (no fixed width/height):
  - Hash-based terrain: `terrainHash(wx, wy, seed)` — pure function, deterministic
  - Neighbourhood smoothing (`SMOOTH_RADIUS=10`, 441 neighbours) → organic blob-shaped forests
  - `isForestTile(wx, wy, seed)` — returns boolean, consistent for any coordinate + seed
  - `SPAWN_CLEAR_RADIUS=22` — tiles around (0,0) always open
  - Final `FOREST_THRESHOLD=0.522` → ~56% world is forest, large clusters
- Updated `PlayScene.ts` for infinite world:
  - `TileSprite` for grass background (GPU-tiled, 1 draw call, synced with camera scroll)
  - `forestGfx: Graphics` at depth 1 — redrawn per-frame for camera-visible tiles only using `isForestTile()`
  - `fogGraphics: Graphics` at depth 8 — per-frame redraw, camera-visible tiles only
  - `discovered: Set<string>` with `"tx,ty"` keys — infinite coordinate support
  - `VISION_RADIUS=10` tiles, `MAX_WORLD_PX=100_000`
  - `followTarget: Rectangle` — invisible object for `cameras.main.startFollow()`
  - Remote players: visible only when within vision radius (sprites hidden + label hidden outside)
- Tuned forest density iteratively from 30% → 80% → 50% → final 56%

### Decisions made
- Infinite world via hash function beats pre-generated array (zero memory overhead, works at any coords)
- `TileSprite.setTilePosition(scrollX, scrollY)` for GPU-tiled grass — 1 draw call regardless of world size
- `Set<string>` fog tracking instead of `boolean[][]` — no fixed size needed
- `startFollow(followTarget)` + initial `centerOn()` — reliable camera tracking (not `centerOn()` in update)
- Only camera-visible tiles processed per frame (~2000 tiles × 441 hash ops = ~882K ops/frame, negligible)
- Remote players hidden in explored-but-not-visible areas (consistent with fog of war design)

### Problems encountered
- `centerOn()` in update() was unreliable — player appeared at bottom-right corner. Fix: `startFollow()` with invisible Rectangle
- Remote player characters were invisible even inside vision (sprites not restored when entering vision). Fix: explicit sprite+flipX set when `inVision`
- Forest tile 28 looked identical to grass — replaced with dark Graphics overlay (0x0d2b0d, 78% alpha)

### Next step
**Wieczór 14** — Resource nodes (trees, rocks) rendered as sprites on map with interaction.
- Server generates ResourceNode positions from mapSeed (procedurally, server-side)
- Client receives nodes via WorldState and renders tree/rock sprites from Pixel Crawler assets
- E key near resource → collect animation + server action handler reducing ResourceNode HP
- Depleted nodes respawn after 60s

---

## Session 15 — 2026-03-21 (Session 4)

### What was done
- **Wieczór 14 COMPLETE ✅** — resource nodes (trees, rocks) on infinite procedural map
- Rewrote `MapGenerator.ts` for chunk-based generation:
  - `treeAtChunk(cx, cy, seed)` and `rockAtChunk(cx, cy, seed)` — deterministic per-chunk, generate as player walks
  - `TREE_STEP=7` (2–3 tile crown overlap), `ROCK_STEP=3` (dense), `FOREST_THRESHOLD=0.494` (mostly forest world)
  - `SPAWN_CLEAR_RADIUS=16`, `SMOOTH_RADIUS=10` (441-cell neighborhood smoothing for organic forest shapes)
  - `ROCK_BUFFER=0.492` (rocks spawn on open grass tiles only, just below forest threshold)
- Updated `PlayScene.ts`:
  - `generateTreeChunksAround` / `generateRockChunksAround` — chunk-cached infinite generation
  - Tree sprites: `tree_sheet.png`, frame 0–1, scale 1.0, crop (0,0,112,152), origin (0.5, 1.0)
  - Rock sprites: `rocks.png`, frame 18 (row 1 col 5, most opaque), scale 3.0, origin (0, 0)
  - Tree footprint: 7×10 tiles (dx –3..3, dy –9..0) in `tileToResource`
  - Rock footprint: 3×3 tiles (dx 0..2, dy 0..2) in `tileToResource`
  - Dead-resource sync: waits for both `dead_trees_init` AND `dead_rocks_init` before first generation
  - Harvest (E key): immediate local kill + `room.send("harvest", {id})`
  - `PLAYER_HW=12`, `PLAYER_HH=20` — box collision (24×40px) with `isBoxBlocked()`
  - Sliding movement: X and Y checked independently against `isBoxBlocked`
  - `drawCollision`: cyan box (player), orange directional rect (attack range), dark red (resource tiles)
- Updated `GameRoom.ts`:
  - Removed server-side resource spawning entirely (all client-side)
  - `deadTrees: Map<string,number>`, `deadRocks: Map<string,number>` for multiplayer sync
  - Handlers: `request_dead_trees/rocks`, `harvest` (→ `tree_dead`/`rock_dead` broadcast)
  - `respawnDeadRocks` in tick (60s); trees permanent (no respawn)

### Decisions made
- Trees never respawn (resource is permanently harvested like in Don't Starve)
- Rocks respawn after 60s
- All resource positions are client-generated and deterministic from `mapSeed` — server only tracks dead state
- `ROCK_BUFFER=0.492` (just below `FOREST_THRESHOLD=0.494`) means rocks spawn on all open/grass tiles
- Full 7×10 tree footprint preferred over trunk-only (user explicitly rejected trunk-only)
- Player box collision (HW=12, HH=20) with independent X/Y checks for sliding movement
- Debug overlay always visible (collision box + attack range) — to be toggled or removed in future polish pass

### Problems encountered
- `ROCK_BUFFER=0.43` (too low) → no rocks appeared on map. Fixed by raising to `0.492`
- Rock sprite frame 13 was empty/transparent watermark row. Fixed: frame 18 (row 1 col 5)
- Dark footprint overlay at `TREE_STEP=5` covered entire screen. Fixed: raised to `TREE_STEP=7`
- Player collision: single-tile check let player clip through trees at edges. Fixed: full AABB `isBoxBlocked`

### Next step
**Wieczór 15** — Gameplay polish pass:
- Tune or toggle collision debug overlay (hide in normal play, toggle with F1/F2 key)
- Inventory system: E harvests resource → adds item to `player.inventory[]` (wood/stone)
- Show inventory in UI (hotbar row at bottom, 8 slots)
- Resource drop: harvested tree drops 2–4 wood items, rock drops 1–2 stone items
- Colyseus: send updated inventory back from server on harvest

---

## Session 16 — 2026-03-21 (Session 4, continued)

### What was done
- **Wieczór 15 COMPLETE ✅** — inventory system, harvest fixes, resource polish
- Added Inventory HUD (`initInventoryHud()`) — Wood/Stone labels at bottom-center, `scrollFactor 0`, depth 20
- `addItems(drops)` — updates counts + shows floating pickup text (yellow tween up 40px, fade 1400ms)
- `harvest_reward` message from server triggers `addItems`; offline fallback gives items locally
- Rewrote `findAdjacentResource` to pixel-based directional rectangle (REACH=48px, WIDE=24px) — fixes up/down harvest not working
- Dead resource sprites now **destroyed** via `killResourceSprite(id)` instead of `setVisible(false)` — eliminates stale artifacts
- `tileToResource: Map<string,string>` replaced with `tileToResources: Map<string,Set<string>>` — overlapping trees keep full footprints
- `TREE_STEP` 7→10, `TREE_MAX_OFFSET` 1→3, tree depth 2→3
- `ROCK_DENSITY` 0.75→0.375 (half as many rocks), rocks never respawn
- `/objects` page: enemy grouping by character name, auto frame size for `-sheet` files, 4-direction preview

### Decisions made
- Full 7×10 tree footprint kept (user previously rejected trunk-only approach)
- Trees permanent (no respawn), rocks permanent (no respawn) — consistent with Don't Starve feel
- Floating pickup text preferred over static counter increment

### Problems encountered
- Up/down harvest was broken because `PLAYER_HH=20px > 1 tile` — ±1 tile check was too short. Fixed by switching to pixel-based directional AABB

### Next step
**Wieczór 16** — camera deadzone + lerp, minimap with fog of war

---

## Session 17 — 2026-03-21 (Session 4, continued)

### What was done
- **Wieczór 16 COMPLETE ✅** — camera deadzone, minimap, fog of war fix
- Camera: `startFollow(followTarget, true, 0.08, 0.08)` — smooth lerp follow
- `setDeadzone(200, 140)` — player moves freely in center without moving camera
- Minimap: `minimapGfx: Graphics`, scrollFactor 0, depth 25, top-right corner `(632, 8)`, 160×120px
  - `MINIMAP_SCALE = 4` — 1 px minimap = 4 world tiles
  - Pass 1: terrain (grass `#2a4a2a`, forest `#1a6a1a`) for discovered tiles
  - Pass 2: black 65% overlay for discovered-but-fogged tiles
  - Dots: trees (green), rocks (grey), other players (blue), self (white 3×3)
- `VISION_RADIUS` reduced 60→16 tiles — fog of war now actually visible on 800×600 screen
- Added `AGENTS.md` with mandatory session workflow rules

### Decisions made
- `VISION_RADIUS=60` was larger than half the screen diagonal — fog was never visible. 16 tiles (256px) is correct for 800×600
- Minimap redrawn every frame alongside fog (same tile loop, negligible overhead)

### Problems encountered
- Fog was invisible for entire project until this session — root cause was `VISION_RADIUS=60` tiles >> screen size

### Next step
**Wieczór 17** — enemy system (Hunter AI, zone spawning, combat)

---

## Session 18 — 2026-03-21 (Session 5)

### What was done
- **Wieczór 17 COMPLETE ✅** — full enemy system with Hunter AI, zone spawning, and player combat
- `EnemyState` schema: id, type, x/y, hp/maxHp, isAlive, animKey
- Hunter: 6 sprites per enemy (idle/walk/pierce × down/side/up), visibility toggled via `HUNTER_ANIM_MAP`, pierce loops `repeat: -1`
- Zone-based dynamic spawning: world divided into 256px zones, `enter_chunk` message triggers `activateZone(zx, zy)` for radius-2 neighbourhood; up to 8 spawn attempts per zone, skips positions blocked by trees/rocks
- `MAX_ALIVE_ENEMIES = 40`, `ENEMY_SPAWN_RADIUS = 2` enemies per zone
- Single `setSimulationInterval` → `masterTick(dt)` at 100ms (`gameTickAccum` accumulator fires full AI every 1000ms)
- `tickEnemyMovement()` at 100ms: applies velocity, blocks on map objects
- `tickEnemyAI()` at 1000ms: chase (`ENEMY_CHASE_RANGE=500px`), stop+attack (`ENEMY_STOP_DIST=54px`), wander
- `separateEnemies()` at 100ms: enemy-enemy separation only (player push removed)
- Server map collision ported from `MapGenerator.ts`: `mapHash / mapIsForestTile / mapTreeAtChunk / mapRockAtChunk`, `mapTileBlockedCache` per-tile cache (invalidated on rock harvest)
- `attack_enemy` message: validates dist < `ENEMY_ATTACK_RANGE=64px`, deals 10 damage, broadcasts kill
- `player_damage` targeted message sent to client when enemy reaches player
- Client SPACE attack: 64px in facing direction; client collision: circular check 28px radius
- Debug overlays: magenta rectangles (enemy collision boxes), bordeaux circles (attack range 64px), red circle (player damage range 54px)
- Pierce animation only triggers when enemy stops due to player proximity (not trees/rocks)

### Decisions made
- Single `setSimulationInterval` mandatory — Colyseus only keeps the last registered callback
- Enemy-player push (separation) removed from server — felt bad; client does 1-way block only
- Pierce anim only on player contact, not on map collision (cleaner UX)
- `mapTileBlockedCache` per-tile to avoid repeated hash computation at 100ms tick rate

### Problems encountered
- Colyseus drops all but last `setSimulationInterval` registration — had to merge all tick logic into `masterTick`
- Enemy stuck on map objects when pushing into corners — fixed by full AABB map collision check same as player

### Next step
**Wieczór 18** — Pass Clerk JWT token from frontend to Colyseus server for authenticated player identity.
Prompt is in PLAN.md under "Wieczór 18".

---

## Session 19 — 2026-03-23 (Session 7)

### What was done
- **Wieczór 18 COMPLETE ✅** — Clerk JWT authentication integrated with Colyseus
- Installed `@clerk/nextjs` (frontend) and `@clerk/backend` (server)
- `ClerkProvider` added to `src/app/layout.tsx`
- `src/app/AuthButton.tsx` — new client component using `useClerk()` for sign in/out (SignInButton component didn't support children properly in Clerk v6 — switched to `openSignIn()` method call)
- `src/app/page.tsx` — AuthButton added to header
- `ColyseusClient.ts` — `connectRoom(token?, nickname?)` — token passed in matchmake body
- `PhaserGame.tsx` — `useAuth().getToken()` called before connectRoom
- `server/src/GameRoom.ts` — `onJoin` made async, verifies token via `verifyToken`, guest fallback when no token
- `server/src/index.ts` — added `import "dotenv/config"` (was missing — `CLERK_SECRET_KEY` was undefined, causing JWKS fetch failure)
- `server/.env` created with `CLERK_SECRET_KEY`
- `server/.env.example` updated with `CLERK_SECRET_KEY` and `CLERK_JWT_KEY`
- Clerk dashboard: phone number disabled, email OTP only (Polish phone numbers not supported)

### Decisions made
- Guest fallback kept (no token → userId = sessionId) — strict enforcement deferred until login page is built
- `dotenv/config` import in `index.ts` is critical — without it all `process.env` vars from `.env` are undefined
- Clerk v6 `SignInButton` doesn't pass children reliably — use `useClerk().openSignIn()` instead
- `CLERK_JWT_KEY` added as optional fallback to avoid JWKS network fetch in local dev

### Problems encountered
- `verifyToken` failed with `jwk-failed-to-resolve` — root cause was missing `dotenv/config`, so `CLERK_SECRET_KEY` was `undefined`
- `SignedIn`/`SignedOut` components don't exist in `@clerk/nextjs` v6 — replaced with `useUser()` + `useClerk()` hooks
- `SignInButton` v6 doesn't render children as clickable trigger — replaced with plain button + `openSignIn()`

### Next step
**Wieczór 19** — Load player state on join from Supabase.
Prompt is in PLAN.md under "Wieczór 19".
Remember to add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `server/.env` and Railway.

---

## Session 20 — 2026-03-23 (Session 8)

### What was done
- **Wieczór 19 COMPLETE ✅** — Player HUD sidebar, status page, HomeAuth, combat stats, sanity overhaul
- `src/app/HomeAuth.tsx` — nowy komponent: `LoggedIn` (avatar, imię, e-mail, czas sesji od zalogowania) + `LoggedOut` (formularz SignIn)
- `src/app/page.tsx` — uproszczony do samego `<HomeAuth />`
- `src/app/status/page.tsx` — strona `/status` jako client component polling `/health` co 2s; pokazuje status serwisów, liczbę pokoi, graczy, zalogowanych vs. gości
- `server/src/index.ts` — endpoint GET `/health` zwracający dane o pokojach/graczach z metadanych Colyseus; `import "dotenv/config"` dodane
- `server/src/GameRoom.ts` — `setMetadata()` z agregowanymi statystykami (`_updateMetadata`)
- Layout `/game` zmieniony z kolumny na rząd: canvas (flex:1) + prawy sidebar 240px
- `src/app/game/PlayerPanel.tsx` — przepisany jako pionowy sidebar: nickname/Gość, przycisk Zaloguj się dla gości, paski HP/Głód/Zdrowie psych., kafelki Atak/Obrona
- `PlayerState` — dodano `attack: int16 = 5`, `defense: int16 = 2`
- Sanity: nowa mechanika — pasywny regen +0.3/tick, zabicie wroga -20, harvest +2
- `sendStatsToPlayers` — oblicza `effectiveAttack` (połowa przy sanity=0), wysyła do klienta
- `PlayScene.ts` — zaktualizowany typ `stats_update` (dodano sanity, attack, defense)
- `PlayerPanel.tsx` — atak czerwony + "↓ obniżony" przy sanity≤0

### Decisions made
- `effectiveAttack` obliczany po stronie serwera (nie klienta) — single source of truth dla damage
- Sanity nie drenauje w nocy — nowa mechanika oparta na zachowaniu gracza (walka vs. zbieranie)
- Sidebar 240px szerokości — stała szerokość, nie flex, żeby minimap Phasera miał stabilny obszar
- Pasywny regen sanity +0.3/tick ≈ 5.5 min od 0 do 100 przy braku zabijania

### Problems encountered
- Brak — wszystkie zmiany wprowadzone płynnie

### Next step
**Wieczór 20** — Zapis/odczyt stanu gracza z Supabase (load on join, save on leave).
Pamiętaj: dodać `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` do `server/.env` i Railway przed testem.

---

## Session 21 — 2026-03-23 (Session 9)

### What was done
- Stworzono `STITCH_BRIEF.md` — pełny design brief dla 8 ekranów Gameforge (Home, Status, Game+HUD, Objects, Inventory, Loot, Build, Leaderboard)
- Wysłano brief do Google Stitch MCP; utworzono projekt "Gameforge — Neon Quest UI" (ID: `11496012017862414056`) — Stitch wygenerował design system zgodny z briefem
- **PlayerPanel.tsx** — pełny redesign wg Stitch konceptu (screenshot jako referencja):
  - "OPERATOR" eyebrow + "DAY N ☀" / "NIGHT N 🌙" (licznik dni client-side — inkrementuje przy przejściu `isNight: true→false`)
  - Sekcja TACTICAL_MAP z `<canvas id="minimap-canvas">` + wyświetlanie X/Y tile gracza
  - Etykiety sekcji jasniejsze (`#a9a9c2`)
  - COMBAT tile: `2px solid` accent border top+right; OBRONA poprawny `#00e3fd`
  - Sloty ekwipunku: kolorowe symbole tekstowe (✕/◆/◉/+) zamiast emoji
  - Sekcja QUEST_OBJ z ★★☆; szerokość sidebar 216px
- **PlayScene.ts** — minimap przeniesiona z Phaser Graphics na HTML canvas:
  - `minimapGfx` całkowicie usunięty
  - `drawMinimap()` rewrite: `ImageData` + `putImageData` (1 draw call dla terenu, 19 200× szybciej niż fillRect)
  - Mgła: single pass z dim-factor 0.35 (zamiast double pass)
  - Emituje `gamePosition: {x, y}` event co klatkę
- **HomeAuth.tsx** + **page.tsx** — fix Clerk SignIn wychodził poza 320px kontener:
  - `appearance.elements`: `rootBox/card/cardBox` → `width: 100%`, transparent background, box-shadow: none
  - Panel: `overflow: hidden` jako failsafe

### Decisions made
- Minimap renderowana na HTML canvas zamiast Phaser Graphics — naturalne pod sidebar React; `ImageData` zamiast `fillRect` znacznie wydajniejszy (1 GPU upload vs ~19K calls/frame)
- Licznik dni po stronie klienta (nie serwer) — nie wymaga zmian w schemacie ani ticku serwera
- Sidebar zmniejszony do 216px (był 240px) — mniej miejsca zajmuje, więcej dla canvas gry
- Clerk SignIn: `appearance.elements` zamiast CSS — oficjalne API Clerk, nie hacki DOM

### Problems encountered
- Clerk `<SignIn>` renderuje własną kartę z hard-coded szerokością, która wychodziła poza 320px glassmorphism panel na stronie głównej
- Stitch `list_screens` zwracał `{}` (ekrany przetwarzane asynchronicznie) — projekt widoczny bezpośrednio w stitch.google.com

### Next step
**Wieczór 20** — Zapis/odczyt stanu gracza z Supabase (load on join, save on leave).
Pamiętaj: dodać `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` do `server/.env` i Railway przed testem.

---

## Session 22 — 2026-03-23 (Session 10)

### What was done
- **PLAN.md** — wyczyszczony i uaktualniony: W3/W4/W15–W19 oznaczone [x], wieczóry buildingowe przeniesione na koniec (W51-W55), dodane W20/W21/W22 (Supabase)
- **Supabase integration** — zainstalowano `@supabase/supabase-js` na serwerze
- **`server/src/db.ts`** (nowy plik):
  - `supabaseAdmin` — service role client
  - `loadPlayer(clerkId, nickname)` — SELECT/INSERT przy pierwszym logowaniu
  - `savePlayer(player, fog[])` — UPDATE wszystkich statystyk + fog
  - `loadWorldSeed()` / `saveWorldSeed(seed)` — persystentny seed mapy (tabela `world_config`)
- **`server/src/GameRoom.ts`** zmiany:
  - `onCreate` async — ładuje seed z DB; generuje i zapisuje jeśli brak
  - `onJoin` async — stale session detection (F5 fix: kopiuje stan + fog do nowej sesji); fresh join ładuje z Supabase
  - `onLeave` — `savePlayer(player, fog)` przed usunięciem; `playerFog.delete(sessionId)`
  - `playerFog: Map<sessionId, string[]>` — fog per-gracz w pamięci serwera
  - Auto-save co 30s (zamiast 60s)
  - `request_players` handler — `spawn_at` tylko dla zalogowanych; `fog_load` wysyłany do klienta
  - Nowy handler `fog_update` — merguje nowe kafle do `playerFog`
- **`server/src/index.ts`** — `WebSocketTransport({ maxPayload: 512 * 1024 })` (było 4KB domyślnie → crashowało połączenia przy dużych fog_update)
- **`src/app/game/scenes/PlayScene.ts`** — handler `fog_load` (odtwarza `discovered` Set); timer co 15s wysyła delta kafli przez `fog_update`
- **Supabase SQL** — tabela `players` z kolumnami włącznie z `fog TEXT[]`; tabela `world_config`

### Decisions made
- Fog trzymany poza schematem Colyseus (byłby za duży do synchronizacji) — oddzielna mapa w GameRoom
- `fog_update` wysyła tylko deltę (nowe kafle od ostatniego wysłania) — oszczędność przepustowości
- Goście: brak persistencji (każda sesja świeża), `spawn_at` i `fog_load` pominięte
- maxPayload = 512KB — wystarczy dla największych możliwych fog_update (tysięce kafli)

### Problems encountered
- `@colyseus/ws-transport` domyślny maxPayload = **4KB** — crashował połączenia gości gdy zalogowany gracz wysyłał fog_update >4KB. Fix: jawne ustawienie 512KB w `index.ts`
- Kolumna `fog` w Supabase trzeba było dodać ręcznie: `ALTER TABLE players ADD COLUMN fog TEXT[] DEFAULT '{}'`
- `spawn_at` był wysyłany do gości (przenoszył ich na pozycję zalogowanego gracza) — naprawiono: check `userId !== sessionId`

### Next step
Następna rzecz do zrobienia: dalsza rozbudowa gameplayu (zbieranie, crafting, budowanie) zgodnie z PLAN.md — sprawdź W23 (harvest) lub W24 (crafting).

---

## Session 23 — 2026-03-23 (Session 11)

### What was done
- **Wieczór 23+24 COMPLETE ✅** — food nodes (grzyby + krzaki jagód), harvest, eat
- `server/src/itemConfig.ts` (nowy) — DROP_TABLE dla tree/stone/mushroom/berry_bush
- `server/src/foodConfig.ts` (nowy) — FOOD_CONFIG z hungerRestore/hpRestore dla 5 rodzajów jedzenia
- `MapGenerator.ts` — dodano `foodAtChunk(cx, cy, seed)` + `FOOD_STEP=5`, `FOOD_DENSITY=0.45`; grzyby w lesie, jagody na trawie
- `GameRoom.ts` — `deadFoodNodes: Map<id, respawnAt>`, rozszerzony handler `harvest` (mush_*/berry_*), broadcast `food_dead`/`food_respawn`, respawn po 60s w `respawnNodes`, nowy handler `eat` (usuwa item, dodaje hunger/hp, wywołuje sendStatsToPlayers)
- `PlayScene.ts` — `generateFoodChunksAround`, synthetyczne tekstury Phaser Graphics (food_mushroom zielony, food_berry krzak z czerwonymi jagodami), barrier `foodInitDone`, E harvest food, F eat (priorytet: cooked_meat > cooked_mushroom > mushroom > berries > raw_meat), HUD +4 sloty

### Decisions made
- Food nodes NIE blokują ruchu gracza — tylko resources (drzewa/kamienie) mają footprint w tileToResources
- Harvest detection food: distance ≤48px + inFront check (zamiast tile footprint)
- ID: `mush_cx_cy` / `berry_cx_cy` — nie kolidują z `tree_` / `rock_`
- Synthetyczne tekstury (Phaser Graphics → generateTexture) zamiast sprite sheetów — szybsze, nie wymagają identyfikacji ramek w arkuszach
- F key: zjada pierwszy dostępny pokarm wg priorytetu (gotowane przed surowym)
- Goście: zbieranie i jedzenie działa; brak persistencji jak poprzednio

### Problems encountered
- `this.make.graphics({ add: false })` — TypeScript odrzucił `add` jako nieznane pole w Phaser 3.90; fix: usunięcie `add: false` (obiekt i tak nie jest dodawany do sceny jeśli nie wywołamy `.add()`)

### Next step
**Wieczór 25** — Inventory UI 4×5 grid + kliknięcie slotu + jedzenie przez UI.
Sprawdź PLAN.md pod Wieczór 25.

---

## Session 24 — 2026-03-24 (Session 12)

### What was done
- **Wieczór 25 COMPLETE ✅** — Inventory UI: hotbar 8 slotów + panel 4×5, zastąpienie starych text HUD
- `src/app/game/ui/itemConfig.ts` (nowy) — `ITEM_DEFS` + `ITEM_MAP` dla wszystkich itemów (eatable bool, symbol, color)
- `src/app/game/ui/InventoryUI.ts` (nowy) — klasa Phaser: hotbar z numerkami 1–8 w górnym lewym rogu, panel 4×5 toggle [I], kliknięcie/E do jedzenia, klawisze 1–8 do aktywnego slotu, F key przez `eatFirst()`
- `PlayScene.ts` — usunięto stary `initInventoryHud`/`hudTexts`/`updateInventoryHud`, dodano `invUI: InventoryUI`, `addItems()` wywołuje `invUI.refresh()`
- **Inventory persistence** — inwentarz zapisywany w Supabase (serwer już trzymał `player.inventory`, brakowało tylko `inventory_load` przy reconnect)
- `GameRoom.ts` `request_players` — dodano wysyłanie `inventory_load` (flat array itemów)
- `GameRoom.ts` harvest/eat — `savePlayer` fire-and-forget po każdej akcji
- `PlayScene.ts` — handler `inventory_load` odbudowuje `Map<string,number>` i odświeża UI
- **Gość z persistencją** — `ColyseusClient.ts` generuje `guestId` w `sessionStorage`, wysyła do serwera
- `GameRoom.ts` — gość z `guestId` ma `userId = "guest_xxx"`, pełna persistencja jak zalogowany
- Stale session detection dla gości (F5), fog/inventory/position restore
- Zamknięcie przeglądarki → nowy `guestId` z sessionStorage → świeży start; stary rekord w DB (orphaned)

### Decisions made
- **Brak timer-delete dla gości** — początkowo 10s timer kasował rekord po `onLeave`, ale `setTimeout` przeżywał dispose pokoju i kasował dane aktywnego gracza w nowym pokoju. Usunięto timer — rekordy gości pozostają w DB i są "kasowane" przez utratę `guestId` (sessionStorage cleared na close). Ręczne czyszczenie: `DELETE FROM players WHERE clerk_id LIKE 'guest_%' AND updated_at < now() - interval '7 days'`
- **`sessionStorage` zamiast `localStorage`** — przeżywa F5, kasowane przy zamknięciu karty/przeglądarki = naturalne "wygaśnięcie sesji gościa"
- Inventory format w DB: flat `TEXT[]` — każdy item powtórzony tyle razy ile qty (np. `["wood","wood","stone"]`)
- `deletePlayer` pozostaje w `db.ts` jako utility do przyszłego cleanup job

### Problems encountered
- 10s `setTimeout` w `onLeave` przeżywał room dispose → kasował rekord podczas gdy gracz był już w nowym pokoju. Logi: `[GameRoom] Guest session expired` + `[DB] Deleted player record` podczas aktywnej gry
- Fix: całkowite usunięcie timer-delete; `sessionStorage` cleanly handles session expiry

### Next step
**Wieczór 26** — Enemy drop system (loot table, equippable items, pickup mechanic).
Sprawdź PLAN.md pod Wieczór 26.

---

## Session 25 — 2026-03-24 (Session 13)

### What was done
- **Bug fix**: stale session race condition — pozycja i inwentarz gościa/gracza tracone po szybkim F5
- `server/src/GameRoom.ts` — `onJoin` stale detection (oba bloki: zalogowany + gość) teraz wywołuje `await savePlayer(stale, staleFog)` PRZED `state.players.delete(staleSessionId)`

### Root cause
Stare `onJoin` robiło `state.players.delete(staleSessionId)` synchronicznie, zanim `onLeave` starej sesji miało szansę zapisać. `onLeave` szukał gracza po `client.sessionId` — znajdował `null` → `if (player)` false → `savePlayer` pominięty → tracono pozycję + inwentarz.

### Decisions made
- `await savePlayer` w stale detection (nie fire-and-forget) — gwarantuje zapis przed usunięciem z `state.players`
- Ta sama poprawka dotyczy obu ścieżek: zalogowany gracz (Clerk JWT) + gość (guestId)

### Problems encountered
- Brak — poprawka jednolinijkowa w dwóch miejscach, od razu działała

### Next step
**Wieczór 26** — Enemy drop system (loot table, equippable items, pickup mechanic).
Sprawdź PLAN.md pod Wieczór 26.

---

## Session 26 — 2026-03-24 (Session 14)

### What was done
- **Wieczór 26 COMPLETE ✅** — Enemy drop system + equippable items + inventory UI improvements
- `server/src/lootConfig.ts` (nowy) — 7 gear items, weighted drop pool (bez raw_meat), `rollDrop()` z 30% no-drop
- `GameRoom.ts` — `recalcStats()`, `equip_item`/`unequip_item`/`destroy_item` handlers, `inventory_load` po każdej operacji, `enemy_loot` broadcast, `equipment` w `stats_update`
- `itemConfig.ts` (klient) — `equippable`/`equipSlot`/`rarity`/`attackBonus`/`defenseBonus` w `ItemDef`; 7 gear itemów
- `InventoryUI.ts` — ekwipowanie przez klik/E, przyciski ZNISZCZ (aktywny) + WYRZUĆ (wyszarzony), side info modal (ikona, nazwa, rarity, stat, VS EQUIPPED porównanie ▲/▼)
- `PlayScene.ts` — handler `enemy_loot` z kolorowym floating textem, `updateEquipment()` na stats_update
- `PlayerPanel.tsx` — equipment sloty pokazują nazwę + bonus, klik → unequip

### Decisions made
- raw_meat usunięty z drop pool — huntry droppują tylko gear (bone sword/armor/helmet, iron sword/chain mail/iron helmet, shadow blade)
- `inventory_load` wysyłany po equip/unequip/destroy — gwarantuje sync klienta z serwerem
- Side info modal zamiast tekstu na dole panelu — czytelniejsze, z ikoną, rarity, porównaniem
- `recalcStats` wywoływany też przy ładowaniu z DB (on join) — zapewnia poprawne stats po reconnect

### Problems encountered
- Po unequip item znikał z inventory (klient nie wiedział o powrocie) — fix: `inventory_load` po operacji
- `stats_update` type w PlayScene.ts nie miał `equipment` — naprawiono (runtime działał, ale TS kompilował z ostrzeżeniami)

### Next step
**Wieczór 27** — Drop mechanic (wyrzucanie przedmiotów na ziemię):
- Przycisk WYRZUĆ w inventory aktywny
- Serwer: broadcast pozycji droppowanego itemu
- Klient: sprite itemu na ziemi, pickup przez E

---

## Session 27 — 2026-03-24 (Session 15)

### What was done
- **Wieczór 27 COMPLETE ✅** — Drop mechanic (wyrzucanie itemów na ziemię)
- `server/src/GameRoom.ts` — `DroppedItemData` interface, `droppedItems: Map` (in-memory, room lifetime), `PICKUP_RANGE=64px`, handlery `drop_item` i `pickup_item`, `dropped_items_init` w `request_players`
- `src/app/game/ui/InventoryUI.ts` — aktywacja przycisku WYRZUĆ (niebieski, hover, `onDropClick()`), ESC zamyka panel (`keyEsc`)
- `src/app/game/scenes/PlayScene.ts` — `DroppedItemMsg` interface, `droppedItemData`/`droppedItemSprites` maps, `spawnDroppedItemSprite`/`removeDroppedItemSprite`/`findNearestDrop`, handlery `dropped_items_init`/`item_dropped`/`item_removed`, E key pickup z priorytetem nad harvest
- **Bug fix:** resource generation przy spawn_at — `dead_trees_init`/`dead_rocks_init`/`dead_food_init` generowały zasoby wokół (0,0); goście i gracze z zapisaną pozycją nie widzieli drzew/jedzenia do pierwszego ruchu
- **Fix:** flagi `deadTreesInitDone`/`deadRocksInitDone`, init handlery generują wokół `Math.floor(px/TILE_SIZE)`, `spawn_at` generuje tylko gdy init ready

### Decisions made
- Dropped items żyją przez cały lifetime roomu (nie wygasają) — in-memory `droppedItems` Map, bez persystencji w DB
- Free-for-all pickup — każdy gracz może podnieść item wyrzucony przez innego
- Pickup range: 48px klient, 64px serwer-side validation (bufor na network jitter)
- Sprite: kolorowy krąg (Phaser Graphics) + symbol itemu; nie generuje osobnej tekstury per item (prostsze, flexible)
- ESC zamyka inventory (nie blokuje ruchu gracza, tylko gdy panel jest otwarty)

### Problems encountered
- `spawn_at` fix z poprzedniej sesji (generateTreeChunksAround w spawn_at) generował drzewa przed załadowaniem dead-tree list → martwe drzewa widoczne jako żywe. Fix: flagi `deadTreesInitDone`/`deadRocksInitDone`
- Goście nie widzieli food sprites bo `dead_food_init` generował wokół (0,0) a nie aktualnej pozycji → fix: używamy `this.px/py`

### Next step
**Wieczór 28** — Building system: bonfire (3 wood), placement mechanic, server broadcast budynków.

---

---

## Session 28 — 2026-03-24 (Session 16)

### What was done
- **Wieczór 31 COMPLETE ✅** — Group creation API
- `src/middleware.ts` — dodano `clerkMiddleware()` (brakowało, `auth()` rzucało błąd bez niego)
- `src/lib/supabase.ts` — server-side Supabase admin client (`createClient` z `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, `persistSession: false`)
- `src/app/api/groups/route.ts` — GET (lista grup usera) + POST (tworzenie grupy z losowym 6-znakowym kodem)
- `src/app/api/groups/join/route.ts` — POST dołączanie do grupy po kodzie (idempotent)
- Zaadaptowano do istniejącego schematu Supabase: `player_id UUID` (FK do players), `creator_id UUID` — nie `clerk_id TEXT` jak planowano
- `@supabase/supabase-js` zainstalowany w root package.json

### Decisions made
- API używa `player_id` (UUID z tabeli players) zamiast `clerk_id` — schemat już istniał w Supabase z FK do players
- `group_members` PK jest composite (player_id, group_id) — bez osobnego `id UUID`
- Kod grupy: 6 znaków (ABCDEFGHJKLMNPQRSTUVWXYZ23456789), bez mylących liter (I, O, 0, 1)
- Join jest idempotent — ponowne dołączenie do grupy zwraca 200 z aktualną rolą

### Problems encountered
- `auth()` rzucało błąd bez `clerkMiddleware()` w src/middleware.ts — brakujący plik middleware
- Istniejący schemat tabel różnił się od planowanego (player_id UUID vs clerk_id TEXT, creator_id vs created_by)

### Next step
**Wieczór 32** — Join by link + join by code on start screen (frontend UI do dołączania do grupy).

---

## Session 29 — 2026-03-25 (Session 16)

### What was done
- **Wieczór 31 COMPLETE ✅** — Group creation API (already in previous session log, repeated here for continuity)
- **Wieczór 32 COMPLETE ✅** — Join by link + join by code; per-group Colyseus rooms; game header; EventLog; room history
- `src/app/join/[code]/page.tsx` — client component, calls `/api/groups/join`, redirects to `/game?groupId=...&groupName=...`
- `src/app/HomeAuth.tsx` — GroupSection: list of user's groups (PLAY buttons), join by code form, create group form
- `server/src/index.ts` — `filterBy(["groupId"])` for per-group room isolation; archive cron every 15min
- `server/src/GameRoom.ts` — `groupId` field; deterministic map seed from groupId hash; `player_room_states` overlay on join (clear global inventory, load room-specific); `broadcastRoomEvent()`; death events on hunger drain and enemy attack; loot events for uncommon/rare drops; `DAY_DURATION=14_400_000ms` (4h); `worldTime` in `stats_update`; `_savePlayerState()` routes to `saveRoomState` or `savePlayer`
- `server/src/db.ts` — `loadRoomState`, `saveRoomState`, `insertRoomEvent`, `archiveOldEvents`; `nickname` in `savePlayer` update
- `src/app/game/GameHeader.tsx` — 44px top HUD: room name, online count, day/night cycle + progress bar, day counter, HISTORIA link, leave button
- `src/app/game/EventLog.tsx` — 110px bar below game, `gameRoomEvent` window events, max 40 entries, color-coded
- `src/app/game/page.tsx` — new layout: header + row(game_column + PlayerPanel); game_column = game-container + EventLog
- `src/app/game/PlayerPanel.tsx` — removed ROOM INFO, reduced sizes, no scroll
- `src/app/game/scenes/PlayScene.ts` — dispatches `gameRoomInfo`/`gameStats`/`gameRoomEvent` window events; `playersOnlineText` hidden
- `src/app/room-history/page.tsx` — lists room_history entries per group
- `src/app/api/room-history/route.ts` — GET room history
- **Nickname fix** — `PhaserGame.tsx` builds Clerk display name; `GameRoom.ts` onJoin uses Clerk name with priority over DB
- **Room history back-button fix** — `groupName` passed through header → history URL → back-to-game link so same room is rejoined
- Supabase SQL executed: `player_room_states`, `room_events`, `room_history` tables

### Decisions made
- `filterBy(["groupId"])` — each unique groupId gets its own Colyseus room; guests share rooms without groupId
- Guests join least-populated existing room via `joinById`; if none exist, create temp room via `joinOrCreate` (no error)
- `player_room_states` stores per-room `(player_id, group_id, x, y, inventory)` — character is bound to the room
- ArraySchema MUST be cleared in-place (`splice`) — replacing with `new ArraySchema()` breaks Colyseus schema tracking
- Deterministic map seed: hash groupId to int → unique reproducible map per group; shared rooms use global seed
- Day counter tracked client-side via night→day transitions (not stored in DB)
- `room_events` TTL = 1h, then archived to `room_history` (top 50 events per period); cron every 15min

### Problems encountered
- `auth()` in API routes required `clerkMiddleware()` in `src/middleware.ts` — file was missing, added it
- Supabase tables used `player_id UUID` (FK to players) not `clerk_id TEXT` — adapted API to look up player UUID first
- `new ArraySchema()` on inventory clear broke Colyseus schema sync — fixed with `splice(0, 1)` loop
- After enemy kill, inventory not updating client-side — fixed by adding `client.send("inventory_load", ...)` post-drop
- `groupName` not carried through HISTORIA link → back to game — fixed by passing it in all URL params

### Next step
**Wieczór 33** — Roles (guest vs verified vs group creator): restrict group management to creator, show role badges in PlayerPanel.

---

## Session 30 — 2026-03-25 (hotfix)

### What was done
- **Vercel build fix** — `/game` page failed prerendering because `PlayerPanel` uses `useSearchParams()` without `Suspense`
- `src/app/game/page.tsx` — opakowano `<PlayerPanel />` w `<Suspense fallback={null}>`

### Decisions made
- Każdy komponent używający `useSearchParams` musi być bezpośrednio opakowany w `Suspense` (lub sam zawierać `Suspense`) — Next.js App Router wymaga tego przy statycznym prerenderowaniu

### Problems encountered
- `GameHeader` był już opakowany, `PlayerPanel` — nie; Vercel rzucał `Export encountered an error on /game/page`

### Next step
**Wieczór 33** — Roles (guest vs verified vs group creator).

---

## Session 31 — 2026-03-25 (Session 17)

### What was done
- **Production 404 fix** — `/api/groups` i `/api/groups/join` zwracały 404 na Vercel bo brak rekordu w tabeli `players` (tworzony dopiero przy pierwszym wejściu do gry przez Colyseus). Fix: `getOrCreatePlayerId()` — jeśli gracz nie istnieje, tworzy rekord automatycznie. Dodatkowo zabezpieczono `src/lib/supabase.ts` przed crashem build-time (`!` → `?? ""`).
- **Single active session dla zalogowanych** — mechanizm jak WhatsApp Web: jedna aktywna sesja na zalogowanego użytkownika
  - `server/src/GameRoom.ts` — `pendingTakeovers` Map; w `onJoin` wykrywa czy stara sesja ma aktywny WebSocket (`this.clients.find`): jeśli tak → `session_conflict` do nowego klienta + `session_incoming` do starego + `return` (brak dodania do state); handlery `confirm_takeover` (kickuje stary client, przenosi state) i `decline_takeover` (nowy client wychodzi); `session_ready` wysyłany po poprawnym join
  - `src/app/game/PhaserGame.tsx` — React state `connecting|conflict|playing`; czeka na `session_ready` lub `session_conflict` przed startem Phasera; modal "Konflikt sesji" z przyciskami PRZEJMIJ / ANULUJ
  - `src/app/game/scenes/PlayScene.ts` — handler `session_taken_over`: freeze fizyki, overlay Phaser z info + przycisk powrotu do menu

### Decisions made
- Rozróżnienie F5 vs drugi tab: `this.clients.find(c => c.sessionId === staleSessionId)` — jeśli stary client jest w `this.clients`, WebSocket żyje → prawdziwy konflikt; jeśli nie ma → F5 auto-takeover (stare zachowanie bez zmian)
- `session_ready` jako sygnał do startu Phasera — niezawodne, nie oparte na timeout
- Pending client nie jest dodawany do `state.players` do czasu potwierdzenia — brak ghost playerów w grze
- Stan gracza kopiowany z aktywnej sesji (nie z DB) — najaktualniejsze dane

### Problems encountered
- Supabase `SUPABASE_SERVICE_ROLE_KEY` na Vercel był skopiowany niepełny — stąd oryginalne 404 (RLS blokował wszystkie zapytania anonimowym kluczem)

### Next step
**Wieczór 33** — Role użytkowników (guest vs verified vs group creator).

---

## Session 31b — 2026-03-25 (Session 17, kontynuacja)

### What was done
- **Single active session dla gości** — ten sam mechanizm konfliktu co dla zalogowanych, zastosowany w bloku gościa w `GameRoom.ts` (`onJoin`)
- `src/app/game/network/ColyseusClient.ts` — `guestId` przeniesiony z `sessionStorage` do `localStorage`: `localStorage` jest współdzielony między kartami tej samej przeglądarki → dwie karty jako gość mają ten sam `guestId` → serwer wykrywa konflikt
- `src/app/game/scenes/PlayScene.ts` — fix pozycjonowania overlay `session_taken_over`: dodano `.setScrollFactor(0)` do wszystkich elementów + pozycja relative do `cameras.main.width/height` zamiast hardcoded `(400, 300)` — overlay teraz pokrywa cały ekran niezależnie od pozycji kamery

### Decisions made
- `localStorage` zamiast `sessionStorage` dla `guestId` — `sessionStorage` jest per-tab (każda karta miała inny `guestId`), co uniemożliwiało wykrycie konfliktu. `localStorage` współdzielony między kartami rozwiązuje problem. Sesja gościa trwa teraz dłużej (przeżywa zamknięcie przeglądarki), co jest zgodne z PRD (7-day guest session)
- `setScrollFactor(0)` na elementach Phaser overlay — bez tego elementy scrollowały z kamerą/światem

### Problems encountered
- Dwie karty jako gość pokazywały 2 graczy zamiast modal konfliktu — przyczyna: `sessionStorage` per-tab, każda karta miała inny `guestId`

### Next step
**Wieczór 33** — Role użytkowników (guest vs verified vs group creator): ograniczenie zarządzania grupą tylko do twórcy, badge ról w PlayerPanel.

---

## Session 32 — 2026-03-25 (Session 18)

### What was done
- **PLAN.md reorganizacja** — W33-W35 przemianowane na W51-W53 (przeniesione przed Tydzień 10); stary W51-W55 → W54-W58; zaktualizowano cross-referencje (W34→W52 w W53); nota o W28-30 zaktualizowana; W49 oznaczony [x]; total: 50→58 wieczorów
- **Vercel build fix** — `PhaserGame.tsx`: `removeAllListeners(string)` nie istnieje w typach Colyseus.js; zastąpiono zwracaną funkcją `off` z `r.onMessage(...)` + flaga `done` zapobiegająca podwójnemu resolve

### Decisions made
- `onMessage` w Colyseus.js zwraca funkcję off — to właściwy sposób na jednorazowe listenery
- Wieczory 51-53 (Roles, Onboarding, Safety) wstawione przed W54-58 (Building/Cooking) — platforma musi być kompletna przed mechanikami budowania

### Problems encountered
- Vercel TypeScript error: `removeAllListeners` w colyseus.js nie przyjmuje argumentów (0 expected, got 1)

### Next step
**Wieczór 36** — Monster tint system: `MonsterConfig` interface w `src/shared/monsterConfig.ts`, `configId` w `EnemyState`, tint + scale na spritach wrogów po stronie klienta.

---

## Session 33 — 2026-03-25 (Session 19)

### What was done
- **Wieczór 36 COMPLETE ✅** — MonsterConfig system (tint + scale na wrogach)
- `server/src/monsterConfig.ts` (nowy) — `MonsterConfig` interface + `MONSTER_CONFIG` z 3 wariantami: `hunter` (biały, scale 1.0, hp 30, dmg 10), `fire_hunter` (pomarańczowy 0xff4400, scale 1.1, hp 40, dmg 14), `boss_hunter` (czerwony 0xff0000, scale 1.6, hp 80, dmg 15)
- `src/app/game/monsterConfig.ts` (nowy) — identyczna kopia dla klienta (pattern jak itemConfig/lootConfig)
- `server/src/GameRoom.ts` — dodano `@type("string") configId` do `EnemyState`; `spawnSingleEnemy` przyjmuje `configId`, ładuje config, używa `config.hp`/`config.maxHp`; damage w ataku pobierany z `MONSTER_CONFIG[enemy.configId].damage`; `enemy_update` broadcast rozszerzony o `configId`, `hp`, `maxHp`
- `src/app/game/scenes/PlayScene.ts` — dodano `configId` do `EnemyData`; import `MONSTER_CONFIG`; `createEnemySprites` przyjmuje `tint`/`scale`, aplikuje `setTint` + `setScale(1.5 * scale)` na wszystkich sprite'ach; `addEnemy` lookupuje config i przekazuje tint/scale; handler `enemy_update` przekazuje `configId`, `hp`, `maxHp`
- **W59 dodany do PLAN.md** — Global session conflict detection (cross-room) z `sessionRegistry.ts`

### Decisions made
- Dwa osobne pliki `monsterConfig.ts` (server + client) zamiast shared — zgodnie z istniejącym wzorcem (itemConfig, lootConfig)
- Scale mnożony przez bazowy 1.5 (`setScale(1.5 * config.scale)`) — base scale gracza/wrogów to 1.5, config.scale jest relatywny
- Damage pobierany z config zamiast stałej `ENEMY_ATTACK_DAMAGE` — każdy wariant ma własne obrażenia
- `configId` domyślnie `"hunter"` — bez zmian w zachowaniu dla istniejących roomów

### Problems encountered
- Brak — implementacja przebiegła bez problemów

### Next step
**Wieczór 37** — 6 particle effect presets (fire, ice, poison, electric, shadow, holy) w `src/app/game/effects/particles.ts`.

---

## Session 34 — 2026-03-25 (Session 19, kontynuacja)

### What was done
- **Wieczór 37 COMPLETE ✅** — Elemental weapons + particle effects + status effects
- `src/app/game/effects/particles.ts` (nowy) — `ParticlePreset` type; `createParticleTexture`; `playEffect` (ciągły, follow sprite); `burstEffect` (jednorazowy burst); `EFFECT_COLORS` + `EFFECT_ICONS`; 6 presetów: fire/ice/poison/electric/shadow/holy
- `src/app/game/ui/itemConfig.ts` — `particleEffect?` w `ItemDef`; `ELEMENT_MODIFIERS` (6 żywiołów z nameSuffix/particleEffect/attackBonus); `getItemDef(id)` parsuje warianty `_of_element` dynamicznie
- `server/src/lootConfig.ts` — `ELEMENT_CHANCE` (common 20%, uncommon 50%, rare 80%); `rollDrop` dodaje elemental suffix do broni; `getLootItem(id)` obsługuje warianty
- `server/src/GameRoom.ts` — `statusEffects: MapSchema<float64>` w `EnemyState`; `attack_enemy` parsuje element z equipped weapon, aplikuje status + instant efekty (shadow lifesteal, holy bonus dmg); `tickEnemyAI` przetwarza DoT (fire 5dmg/s, poison 3dmg/s) + wygasanie efektów; `tickEnemyMovement` slow (ice 50%) + stun (electric 0%); `broadcast("enemy_status_update")`; `equip_item` i `recalcStats` używają `getLootItem` zamiast `LOOT_TABLE`
- `server/src/monsterConfig.ts` + kopia klienta — `boss_hunter` dodano `particleEffect: "shadow"`
- `src/app/game/scenes/PlayScene.ts` — `createParticleTexture` w `create()`; `intrinsicEmitter`/`statusEmitters`/`activeEffects` w `EnemyData`; `myEquipment` tracking; `addEnemy` startuje intrinsic emitter; `killEnemy` niszczy emittery; `drawEnemyHpBar` rysuje kolorowe kółka efektów; `enemy_status_update` handler zarządza status emitterami; burst `burstEffect` na SPACE z elemental bronią
- `src/app/game/ui/InventoryUI.ts` — grid 5×6=30 slotów; `refreshGrid` iteruje po inventory Map (fix stackowania elemental itemów); wszystkie `ITEM_MAP` zastąpione `getItemDef`
- `src/app/game/PlayerPanel.tsx` — usunięto hardcoded `LOOT_INFO`; używa `getItemDef` dla nazwy i bonusów

### Decisions made
- `getLootItem` w lootConfig.ts (serwer) zamiast duplikowania element logic — analogia do `getItemDef` po stronie klienta
- `equip_item` handler używa `getLootItem` — bez tej zmiany elemental bronie w ogóle nie mogły być zakładane (LOOT_TABLE miss → early return)
- `recalcStats` używa `getLootItem` — elemental weapon bonus prawidłowo liczony do ataku gracza
- Inventory grid iteruje po Map nie po ITEM_DEFS — każde unikalne ID (w tym `iron_sword_of_fire`) ma własny slot
- Hotbar nadal używa ITEM_DEFS (fixed resources) — gear trafia tylko do gridu

### Problems encountered
- Burst efekty nie pojawiały się — root cause: `equip_item` handler na serwerze robił `LOOT_TABLE[data.itemId]` dla elemental ID → `undefined` → `return` → broń nie była zakładana, więc `myEquipment["weapon"]` był pusty
- `depth` nie istnieje w `ParticleEmitterConfig` Phasera — fix: `emitter.setDepth(11)` po stworzeniu
- TS error w PlayerPanel: `info.attackBonus` possibly undefined → fix: `?? 0`

### Next step
**Wieczór 38** — RuleEngine in Colyseus (deklaratywne reguły: trigger, conditions, effects).

---

## Session 35 — 2026-03-25 (Session 20)

### What was done
- **Wieczór 38+39 COMPLETE ✅** — RuleEngine: deklaratywne reguły w Colyseus
- `server/src/RuleEngine.ts` (nowy) — klasa `RuleEngine`: typy `Rule`/`RuleTrigger`/`RuleCondition`/`RuleEffect`/`RuleContext`; `evaluate(trigger, context)` filtruje reguły, sprawdza warunki (AND, dotted paths, `random`), zwraca efekty; `every_Ns` timer z `_nextFireAt`; `loadRules()` + `applyModRules()` (dla W47 AI pipeline)
- `server/src/defaultRules.ts` (nowy) — 4 reguły: bone z cooked_meat (10%), hunger warning broadcast, night sanity drain all_players, every 60s w nocy spawn boss_hunter
- `server/src/GameRoom.ts` — `WorldState.weather: string = "clear"`; import RuleEngine + DEFAULT_RULES; pola `ruleEngine` + `hungerLowThrottle`; `loadRules(DEFAULT_RULES)` w onCreate; `tickRuleEngine()` w masterTick (między drain a sendStats); metody `tickRuleEngine()`, `applyRuleEffects()`, publiczne `applyModRules()`; trigger `on_eat` w eat handler; trigger `on_hunger_low` (throttle 1/min) w drainHungerAndSanity; trigger `on_enemy_death` z enemy context w attack_enemy; cleanup hungerLowThrottle w onLeave
- `src/app/game/scenes/PlayScene.ts` — handler `rule_message` → dispatchEvent `gameRoomEvent` (type:"rule") → widoczne w EventLog
- `PLAN.md` — W38/W39 zaktualizowane o: `every_Ns`, `qty` w spawn_enemy, `target:'all_players'`, `pool:string[]`, `on_enemy_death`; dodany W60 (MonsterConfig v2 + data-driven AI behaviors)

### Decisions made
- `pool[]` rozwiązywany w `applyRuleEffects` per-target (nie w evaluate) — każdy gracz dostaje inny losowy item z puli
- Boss spawuje blisko losowego gracza online (300–600px) — jeden boss na pokój per trigger, nie per gracz
- `on_tick` reguły modyfikują statystyki bez dodatkowego sendStats — tick i tak wywołuje sendStatsToPlayers zaraz po
- `hungerLowThrottle` czyszczony w onLeave — brak wycieków pamięci przy wielu sesjach
- Dodano W60 (MonsterConfig v2 + data-driven AI) do PLAN.md jako ostatni wieczór (po W59)

### Problems encountered
- Brak — kompilacja czysta po obu stronach (server tsc + Next.js noEmit)
- Testowo zmieniono DAY_DURATION na 120_000ms (2 min) — przywrócono do 14_400_000 po teście
- Reguły działały poprawnie: "Nocny boss nadciąga!" i "Ktoś jest głodny!" widoczne w EventLog

### Next step
**Wieczór 40** — Visual variant system test: 5 wariantów wrogów (orc base, fire_orc, ice_orc, skeleton base, shadow_skeleton) z Pixel Crawler sprite'ami.

---

## Session 36 — 2026-03-25 (Session 21)

### What was done
- **Wieczór 40 ODŁOŻONY** — visual variant system z nowymi sprite'ami (Orc/Skeleton) odkładamy na późnej; sprite'y zostaną wygenerowane przez Pixellab; hunter działa poprawnie z tint/scale/particles
- **Wieczór 41 COMPLETE ✅** — Voice/text input component
- `src/app/components/ModInput.tsx` (nowy) — `'use client'`; textarea 500 znaków + licznik; voice input przez Web Speech API (continuous:false, interimResults:true, lang pl-PL/en-US); graceful fallback gdy przeglądarka nie wspiera; selektor PL/EN; submit button aktywny tylko gdy tekst; własne typy `ISpeechRecognition`/`ISpeechRecognitionEvent`/`SpeechRecognitionWindow` (Web Speech API nie ma typów w standardowym TS DOM)
- `src/app/forge/page.tsx` (nowy) — strona `/forge`; wymaga auth (redirect na `/` dla niezalogowanych); debug box po submit (placeholder na W42 Claude API); styl spójny z resztą projektu

### Decisions made
- Auth enforcement client-side przez `useUser()` + redirect — middleware już globalnie chroni API routes; `/forge` page redirect wystarczy
- Web Speech API: własne interfejsy zamiast `@types/dom-speech-recognition` — zero dependencies, dokładnie tyle ile potrzeba
- Submit button disabled dopóki textarea pusta lub przekracza 500 znaków

### Problems encountered
- TS: `SpeechRecognition`/`SpeechRecognitionEvent` nie istnieją w standardowym DOM lib → własne interfejsy

### Next step
**Wieczór 42** — Claude API: 3 pytania doprecyzowujące (`POST /api/forge/clarify`), wyświetlenie ich na stronie `/forge`.

---

## REMINDER: Update this file before ending every session
Run this prompt when finishing work:
"Update CLAUDE_HISTORY.md with what we did today, decisions made,
problems encountered, and the exact next step for next session."
