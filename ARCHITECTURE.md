# Gameforge — Architecture

## How to update this file
When starting a new Claude Code session, paste this file as context.
When finishing a session, ask Claude Code to update this file with any
new decisions, installed packages, or structural changes made during the session.

## Last updated
2026-03-24 (Session 13, W25 — stale session race condition fix)

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
- ✅ Wieczór 17: System wrogów — Hunter enemy, AI chase/attack, zone-based spawning, map collision, debug overlays
- ✅ Wieczór 18: Clerk auth — JWT token z frontendu do Colyseus, weryfikacja na serwerze, guest fallback
- ✅ Wieczór 19: Player HUD sidebar, strona /status, HomeAuth, statystyki bojowe (atak/obrona), nowa mechanika sanity
- ✅ UI redesign (Session 9): HUD przebudowany wg Stitch concept — OPERATOR header, TACTICAL_MAP, minimap na HTML canvas, QUEST_OBJ, fix Clerk overflow
- ✅ Wieczór 20–22 (Session 10): Supabase player persistence — load on join, save on leave + auto-save co 30s, fog of war persistence per-player
- ✅ Wieczór 23+24 (Session 11): Food nodes (mushrooms/berry bushes), harvest E, eat F, itemConfig + foodConfig
- ✅ Wieczór 25 (Session 12+13): Inventory UI — hotbar 8 slotów + panel 4×5 [I], numerki 1–8, kliknięcie/E eat; guest persistence (guestId sessionStorage, DB save/load, F5 restore); stale session race condition fix

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

## Wieczór 23+24 additions (Session 11)

### Food nodes — mushrooms & berry bushes
- `server/src/itemConfig.ts` (nowy) — `DROP_TABLE`: wood×2, stone×1, mushroom×1, berries×2
- `server/src/foodConfig.ts` (nowy) — `FOOD_CONFIG`: mushroom/berries/raw_meat/cooked_meat/cooked_mushroom z hungerRestore + hpRestore
- `MapGenerator.ts` — `foodAtChunk(cx, cy, seed)`: `FOOD_STEP=5` tiles, `FOOD_DENSITY=0.45`, mushrooms w lesie / berry bushes na trawie
- `GameRoom.ts` — `deadFoodNodes: Map<id, respawnAt>`, handler `harvest` rozszerzony o `mush_*` i `berry_*`, broadcast `food_dead`/`food_respawn`, respawn po 60s w `respawnNodes`, nowy handler `eat`
- `PlayScene.ts` — generowanie food chunks przy ruchu (`generateFoodChunksAround`), synthetyczne tekstury (`food_mushroom`, `food_berry`) generowane przez Phaser Graphics, `foodInitDone` barrier (jak dead_trees), E zbiera food + local kill, F zjada pierwszą dostępną żywność (priorytet: cooked_meat > cooked_mushroom > mushroom > berries > raw_meat), HUD +4 sloty (Mush/Berries/Meat/C.Meat)

### Klucze i mechaniki
- ID food nodes: `mush_cx_cy` (grzyb) / `berry_cx_cy` (krzak jagód)
- Harvest detection: distance ≤48px + inFront check (nie footprint — food nie blokuje ruchu)
- `eat` message: serwer usuwa item z inventory, dodaje hungerRestore/hpRestore, wywołuje `sendStatsToPlayers`
- Goście: pełna obsługa (zbieranie + jedzenie działa, brak persistencji jak poprzednio)

---

## Wieczór 20–22 additions (Session 10)

### Supabase player persistence (`server/src/db.ts`)
- `loadPlayer(clerkId, nickname)` — SELECT by `clerk_id`; INSERT nowego gracza (x=0, y=0) przy pierwszym logowaniu
- `savePlayer(player, fog[])` — UPDATE pozycji, HP, głód, sanity, atak, obrona, ekwipunek, fog; tylko dla zalogowanych (`userId !== sessionId`)
- `loadWorldSeed()` / `saveWorldSeed(seed)` — UPSERT `world_config { key: 'map_seed' }` — seed wspólny dla wszystkich graczy, persystentny między restartami
- `supabaseAdmin` — `@supabase/supabase-js` service role client (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)

### Supabase tables
- `players` — `id, clerk_id, nickname, x, y, hp, max_hp, hunger, sanity, attack, defense, inventory TEXT[], equipment JSONB, active_slot, fog TEXT[], updated_at`
- `world_config` — `key TEXT PRIMARY KEY, value TEXT` (trzyma `map_seed`)

### Session deduplication (F5 fix)
- `onJoin` sprawdza czy `userId` już istnieje w pokoju (stale session) — jeśli tak, kopiuje stan do nowej sesji i usuwa starą; broadcast `player_remove` dla starego sessionId
- **Race condition fix (Session 13)**: `onJoin` teraz wywołuje `await savePlayer(stale, staleFog)` PRZED `state.players.delete(staleSessionId)`. Bez tego: `onLeave` starej sesji znajdowało `null` w `state.players` → `savePlayer` nie był wywoływany → pozycja/inventarz tracone po szybkim F5

### Fog of war persistence
- `playerFog: Map<sessionId, string[]>` w GameRoom — trzyma "tx,ty" kafle per gracz w pamięci
- Przy fresh join: ładuje `saved.fog` z Supabase do `playerFog`
- `request_players` → serwer wysyła `fog_load` (zapisane kafle) do klienta; klient odtwarza `discovered` Set
- Klient wysyła `fog_update` (delta nowych kafli) co 15 sekund; serwer merguje do `playerFog`
- `savePlayer` zapisuje `fog[]` do Supabase co 30s (auto-save) i przy `onLeave`

### Gość vs. zalogowany
- `spawn_at` wysyłany tylko zalogowanym (goście zawsze startują na x=0, y=0)
- `fog_load` wysyła `[]` dla gości (każda sesja świeża)
- `fog_update` od gości ignorowany (brak wpisu w `playerFog`)

### WebSocket maxPayload fix
- Domyślny maxPayload `@colyseus/ws-transport` = **4KB** — za mały dla fog_update
- Ustawiono `WebSocketTransport({ maxPayload: 512 * 1024 })` — 512KB

### Environment variables added (Session 10)
| Variable | Where |
|----------|-------|
| `SUPABASE_URL` | `server/.env`, Railway |
| `SUPABASE_SERVICE_ROLE_KEY` | `server/.env`, Railway |

---

## Game server schemas (GameRoom.ts)
- `PlayerState` — sessionId, userId, nickname, x/y, hp, maxHp, hunger, sanity, attack (base 5), defense (base 2), inventory, equipment, activeSlot, direction, animKey, isOnline
- `ResourceNode` — id, type, x/y, hp, respawnAt, isAlive
- `FoodNode` — id, type, x/y, isAlive, respawnAt
- `EnemyState` — id, type, x/y, hp, isAlive, animKey
- `BuildingState` — id, type, x/y, material, hp, ownerId
- `CookingPotState` — id, buildingId, slot1/2, currentRecipe, cookingUntil, isReady, result
- `WorldState` — MapSchema collections of all above + worldTime (0–1 day cycle) + isNight

## Tick loop (1 s interval)
1. Update `worldTime` and `isNight` (10-min real-time day cycle)
2. Drain hunger (0.5/s); passive sanity regen (+0.3/s)
3. Respawn dead ResourceNodes and FoodNodes when `respawnAt` passes

## Sanity mechanics
- Passive regen: +0.3/tick (slow, ~5 min to fill from 0)
- Kill enemy: −20 sanity
- Harvest resource (tree/rock): +2 sanity
- Build (future): +5 sanity
- Sanity ≤ 0 → effectiveAttack = floor(baseAttack / 2), shown in red in UI

## UI Redesign — Session 9 (2026-03-23)

### Stitch design brief
- `STITCH_BRIEF.md` — pełny design brief dla 8 ekranów (Home, Status, Game, Objects, Inventory, Loot, Build, Leaderboard)
- Projekt w Stitch: "Gameforge — Neon Quest UI" (ID: `11496012017862414056`) — wygenerowany design system (Space Grotesk + Plus Jakarta Sans, paleta kolorów, asymetryczne pixel-bordery)

### PlayerPanel.tsx — pełny redesign wg Stitch concept
- Szerokość 216px (było 240px)
- **OPERATOR** eyebrow label nad nazwą gracza
- **DAY N ☀ / NIGHT N 🌙** — licznik dni po stronie klienta (inkrementowany przy przejściu `isNight: true → false`)
- Sekcja **TACTICAL_MAP** z `<canvas id="minimap-canvas" width=160 height=120>` i wyświetlaniem X/Y pozycji
- Etykiety sekcji: `#a9a9c2` (jaśniejsze niż poprzednie `#46465b`)
- Kafelki COMBAT: pixel-border `2px solid accent` top+right; OBRONA: poprawny `#00e3fd`
- Sloty ekwipunku: kolorowe symbole tekstowe (✕ orange, ◆ cyan, ◉ magenta, + muted) zamiast emoji
- Sekcja: **QUEST_OBJ** + ★★☆
- Nasłuchuje eventów: `gameStats` (istniejący) + `gamePosition` (nowy, X/Y od PlayScene)

### PlayScene.ts — minimap migracja na HTML canvas
- `minimapGfx: Phaser.GameObjects.Graphics` **usunięty** całkowicie
- Nowe pola: `minimapCanvas: HTMLCanvasElement | null` i `minimapCtx: CanvasRenderingContext2D | null` — lazy-cache (DOM lookup tylko raz)
- `drawMinimap()` przepisany:
  - Używa `ImageData` + `putImageData` (1 draw call dla terenu zamiast ~19 200 `fillRect`) — znacznie wydajniejszy
  - Mgła: dim-factor `0.35` dla odkrytych ale zafoggowanych kafelków (jeden pass zamiast dwóch)
  - Emituje event `gamePosition: { x: tileX, y: tileY }` co klatkę
  - Pomarańczowy border minimapy (`rgba(255,140,0,0.5)`)

### HomeAuth.tsx + page.tsx — fix Clerk SignIn overflow
- Clerk `<SignIn>` wychodził poza 320px kontener panelu
- Fix: `appearance.elements` → `rootBox: {width:"100%"}`, `card: {width:"100%", maxWidth:"100%", background:"transparent", boxShadow:"none", padding:0}`, `cardBox: {width:"100%", boxShadow:"none"}`
- `page.tsx` panel: dodano `overflow: hidden` jako dodatkowe zabezpieczenie

## Wieczór 19 additions

### Player HUD sidebar
- Layout zmieniony na `flex row`: canvas (flex:1) + prawy sidebar (240px)
- `src/app/game/PlayerPanel.tsx` — pionowy panel z: nickname/Gość, przycisk "Zaloguj się" dla gości (useClerk), paski HP/Głód/Zdrowie psych., kafelki Atak/Obrona
- Atak czerwony + napis "↓ obniżony" gdy sanity ≤ 0

### Status page
- `src/app/status/page.tsx` — client component, polling `/health` co 2s
- Pokazuje: status Colyseus/Clerk/Supabase, liczbę pokoi, graczy online, zalogowanych vs. gości

### Home page auth
- `src/app/HomeAuth.tsx` — `LoggedIn` (avatar, imię, e-mail, czas sesji) + `LoggedOut` (SignIn modal)
- `src/app/page.tsx` — uproszczone do samego `<HomeAuth />`

### Message handlers (client → server)
- `move` — x, y, direction, animKey
- `equip` — slot, itemId
- `activeSlot` — slot index
- `harvest` — id (drzewo/kamień → nagroda + sanity +2)
- `attack_enemy` — enemyId (zabicie → sanity −20)
- `request_players`, `request_resources`, `request_dead_trees`, `enter_chunk`

## Wieczór 18 additions

### Clerk authentication
- `@clerk/nextjs` installed in root, `ClerkProvider` wrapping layout
- `src/app/AuthButton.tsx` — client component: `useClerk().openSignIn()` / `signOut()`, shows based on `useUser().isSignedIn`
- `src/app/page.tsx` — AuthButton in header (sign in / sign out)
- `ColyseusClient.ts` — `connectRoom(token?, nickname?)` passes token in matchmake body
- `PhaserGame.tsx` — `useAuth().getToken()` called before `connectRoom`, token passed through
- `server/src/GameRoom.ts` — `onJoin` async, verifies token via `verifyToken(token, { secretKey, jwtKey })`
  - Valid token → `player.userId = payload.sub` (Clerk user ID)
  - Invalid token → `client.leave(4001)`
  - No token → guest fallback: `player.userId = client.sessionId`
- `server/src/index.ts` — `import "dotenv/config"` added (was missing — caused `CLERK_SECRET_KEY` to be undefined)
- `server/.env.example` — added `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`

### Environment variables added
| Variable | Where |
|----------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local`, Vercel |
| `CLERK_SECRET_KEY` | `.env.local`, `server/.env`, Vercel, Railway |
| `CLERK_JWT_KEY` | `server/.env`, Railway (optional — used if JWKS fetch fails) |

## Wieczór 17 additions

### Enemy system (Hunter)
- `EnemyState` schema: id, type, x/y, hp/maxHp, isAlive, animKey
- 6 sprites per enemy (`idle/walk/pierce × down/side/up`), visibility toggled via `HUNTER_ANIM_MAP`
- Pierce animations loop (`repeat: -1`)

### Zone-based dynamic spawning
- World divided into 256px zones; `enter_chunk` message triggers `activateZone(zx, zy)` for radius-2 neighbourhood
- Up to 8 spawn attempts per enemy — skips positions blocked by trees/rocks (`isEnemyMoveBlocked`)
- `MAX_ALIVE_ENEMIES = 40`, `ENEMY_SPAWN_RADIUS = 2` enemies per zone

### Server tick architecture
- Single `setSimulationInterval` → `masterTick(dt)` at 100ms (Colyseus only keeps last registration)
- `gameTickAccum` accumulator fires full AI + hunger + worldTime logic every 1000ms
- `tickEnemyMovement()` at 100ms: applies velocity, blocks on map objects, switches to pierce anim when stopped by player
- `tickEnemyAI()` at 1000ms: chase (`ENEMY_CHASE_RANGE=500px`), stop+attack (`ENEMY_STOP_DIST=54px`), wander
- `separateEnemies()` at 100ms: enemy-enemy separation only (player push removed)

### Map collision on server
- `mapHash / mapIsForestTile / mapTreeAtChunk / mapRockAtChunk` — ported from `MapGenerator.ts` with same constants
- `mapTileBlockedCache: Map<string,boolean>` — per-tile cache (invalidated on rock harvest)
- Tree footprint: `[wx-3..wx+3] × [wy-9..wy]`; Rock footprint: `[wx..wx+2] × [wy..wy+2]`

### Player ↔ enemy interaction
- `attack_enemy` message: validates dist < `ENEMY_ATTACK_RANGE=64px`, deals 10 damage, broadcasts kill
- `player_damage` targeted message sent to client when enemy reaches player
- Client SPACE attack range: 64px in facing direction
- Client collision: circular check radius 28px (enemy blocks player, not vice versa)

### Debug overlays (collisionGfx)
- Magenta rectangles — enemy collision boxes (ENEMY_HW=14, ENEMY_HH=22)
- Bordeaux circles — enemy attack range (64px radius)
- Red circle — player damage receive range (54px radius)

## Wieczór 16 additions

### Camera deadzone + lerp
- `cameras.main.startFollow(followTarget, true, 0.08, 0.08)` — płynne śledzenie (lerp)
- `cameras.main.setDeadzone(200, 140)` — gracz porusza się swobodnie w centrum bez ruszania kamerą

### Minimap (PRZENIESIONA w Session 9 — patrz wyżej)
- Pierwotnie: `minimapGfx: Graphics` w Phaser canvas, prawy górny róg `(632, 8)`, `160×120px`
- Po redesignie: renderowana na `<canvas id="minimap-canvas">` w React sidebarze

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
