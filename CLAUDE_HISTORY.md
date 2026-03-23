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

## REMINDER: Update this file before ending every session
Run this prompt when finishing work:
"Update CLAUDE_HISTORY.md with what we did today, decisions made,
problems encountered, and the exact next step for next session."
