# Gameforge — 50-Evening Development Plan

Each evening has a self-contained Claude Code prompt in English.
Run them in order. Read `SESSION_START_PROMPT.md` at the start of every session.

---

## TYDZIEŃ 1 — Setup

### [x] Wieczór 1: Install tools and register accounts
DONE — Node.js, Git, VS Code, GitHub, Railway, Supabase, Clerk accounts set up.

---

### [x] Wieczór 2: Next.js project structure with asset folders
DONE — Next.js project bootstrapped, Pixel Crawler assets in `public/assets/`, `ASSETS_MAP.md` generated.

---

### [x] Wieczór 3: Colyseus Hello World + Railway deploy
DONE — Colyseus 0.17.x deployed on Railway at `gameforge-production-d7c8.up.railway.app` (port 8080). ESM migration required (`rou3` dependency is ESM-only — `"type":"module"` + `module: NodeNext` in server). Root Directory set to `server/` in Railway. `/health` endpoint added via Express middleware.

---

### [x] Wieczór 4: Phaser in Next.js + first Pixel Crawler sprite
DONE — Phaser 3.90.0 installed. `/game` page with `GameLoader.tsx` (ssr:false wrapper) + `PhaserGame.tsx` (useEffect init) + `GameScene.ts`. First Pixel Crawler sprite displayed (Fairy Forest tile 15 = solid grass). Key decisions: named ESM imports (`import { Scene, Game, AUTO } from "phaser"`), `Scale.FIT + CENTER_BOTH`, `pixelArt: true`, `audio: { noAudio: true }`.

---

### [x] Wieczór 5: WorldState Schema
DONE — All schemas defined in server/src/GameRoom.ts: PlayerState, ResourceNode, FoodNode,
EnemyState, BuildingState, CookingPotState, WorldState with MapSchema collections.

---

## TYDZIEŃ 2 — Player character

### [x] Wieczór 6: Player spritesheet Body_A — animations in 4 directions

```
In the Phaser scene at src/app/game/scenes/BootScene.ts (or a new PlayScene.ts),
set up the full animation set for the player character using the Body_A sprite sheet.

The sprite sheet is at:
  public/assets/Pixel Crawler - Free Pack 2.0.4/Pixel Crawler - Free Pack 2.0.4/Characters/Body_A/Body_A.png
Frame size: 16x16. Load it with key 'body_a'.

Inspect the sprite sheet (it is a grid of frames). Pixel Crawler Body_A layout is:
- Row 0 (frames 0–3):   idle down
- Row 1 (frames 4–7):   idle up
- Row 2 (frames 8–11):  idle left  (flip horizontally for idle right)
- Row 3 (frames 12–15): walk down
- Row 4 (frames 16–19): walk up
- Row 5 (frames 20–23): walk left  (flip horizontally for walk right)

Create these Phaser animations (all repeat: -1, frameRate: 8):
  'idle_down'  → frames 0–3
  'idle_up'    → frames 4–7
  'idle_left'  → frames 8–11
  'idle_right' → frames 8–11 (same frames, sprite.setFlipX(true) when playing)
  'walk_down'  → frames 12–15
  'walk_up'    → frames 16–19
  'walk_left'  → frames 20–23
  'walk_right' → frames 20–23 (same frames, sprite.setFlipX(true) when playing)

Create a helper function createPlayerAnimations(scene: Phaser.Scene) in
src/app/game/animations/playerAnimations.ts that registers all animations on the scene.

Add a demo in the scene: cycle through all 8 animations every 1 second to visually verify.

Confirm when done and show me what was created.
```

---

### [x] Wieczór 7: Player movement synchronized via Colyseus

```
Install the Colyseus JavaScript client SDK in the root Next.js project:
  npm install colyseus.js

Create src/app/game/network/ColyseusClient.ts:
- Export a singleton colyseus Room connection.
- Connect to the server at process.env.NEXT_PUBLIC_COLYSEUS_URL (default ws://localhost:2567).
- Join or create a room named "game_room".
- Export the room instance so Phaser scenes can use it.

In src/app/game/scenes/PlayScene.ts, implement player movement:
1. In create(): spawn the player sprite at center, apply Body_A animations.
2. Set up WASD and arrow key input with this.input.keyboard.createCursorKeys() and
   this.input.keyboard.addKeys('W,A,S,D').
3. In update(): read input, move the sprite at 100px/s, play the correct animation
   (walk_down/up/left/right or idle_down/up/left/right based on last direction).
4. When position changes, send a Colyseus message every 50ms (throttled):
     room.send('move', { x: sprite.x, y: sprite.y, direction, animKey })
5. On the server in server/src/GameRoom.ts the 'move' handler already exists —
   verify it updates PlayerState.x, PlayerState.y, direction, animKey correctly.

Use NEXT_PUBLIC_COLYSEUS_URL in src/app/.env.local:
  NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:2567

Confirm when done and show me what was created.
```

---

### [x] Wieczór 8: Render other players + interpolation

```
In src/app/game/scenes/PlayScene.ts, render all other connected players from Colyseus
WorldState and apply linear interpolation for smooth movement.

Requirements:
1. On room.state.players.onAdd((player, sessionId) => ...):
   - If sessionId === room.sessionId, skip (that is the local player).
   - Otherwise create a new Phaser sprite for the remote player at player.x, player.y.
   - Store it in a Map<string, Phaser.GameObjects.Sprite> called remotePlayers.
   - Play the player's current animKey animation on the sprite.

2. On room.state.players.onChange((player, sessionId) => ...):
   - Update the target position in a separate Map<string, {x: number, y: number}>
     called remoteTargets (do NOT set position directly — use interpolation).
   - Update the animation if player.animKey changed.

3. On room.state.players.onRemove((player, sessionId) => ...):
   - Destroy the sprite, remove from remotePlayers and remoteTargets.

4. In update(delta: number):
   - For each remote player sprite, lerp current position toward target:
       sprite.x = Phaser.Math.Linear(sprite.x, target.x, 0.2)
       sprite.y = Phaser.Math.Linear(sprite.y, target.y, 0.2)

5. Add a nickname label (Phaser Text, fontSize 8, color #ffffff) above each remote
   player sprite, offset by -12px on Y. Update its position in the same lerp loop.

Confirm when done and show me what was created.
```

---

### [x] Wieczór 9: Tool and attack animations

```
Pixel Crawler Free Pack includes overlay sprites for tools and attacks.
Find the relevant sprite sheets under:
  public/assets/Pixel Crawler - Free Pack 2.0.4/Pixel Crawler - Free Pack 2.0.4/

Look for files matching: *Slash*, *Crush*, *Pierce*, *Collect*, *Tool*
(check public/assets/ASSETS_MAP.md for exact paths and dimensions).

In src/app/game/animations/toolAnimations.ts:
1. Export a function preloadToolSprites(scene: Phaser.Scene) that loads all found
   tool/attack sprite sheets with frameWidth: 16, frameHeight: 16.
2. Export a function createToolAnimations(scene: Phaser.Scene) that creates:
   - 'attack_slice'   (Slash frames, frameRate 12, repeat 0)
   - 'attack_crush'   (Crush frames, frameRate 12, repeat 0)
   - 'attack_pierce'  (Pierce frames, frameRate 12, repeat 0)
   - 'collect'        (Collect/Tool frames, frameRate 8, repeat 0)

In PlayScene.ts:
1. Add a second Phaser sprite (toolSprite) layered on top of the player sprite,
   offset to align with the player's hands.
2. On pressing SPACE: play 'attack_slice' on toolSprite, then hide toolSprite when
   the animation completes (listen to animationcomplete event).
3. On pressing E: play 'collect' on toolSprite similarly.
4. Send a message to Colyseus: room.send('action', { type: 'attack' | 'collect', x, y })
   (add the handler in server/src/GameRoom.ts — for now just log it).

Confirm when done and show me what was created.
```

---

### [x] Wieczór 10: Multiplayer test with two browser tabs

```
Verify the full multiplayer loop works by running two browser tabs simultaneously.

Steps to test:
1. Ensure the Colyseus server is running: cd server && npm run dev
2. Ensure the Next.js dev server is running: npm run dev (root)
3. Open http://localhost:3000/game in Tab 1 and Tab 2.
4. Move the player in Tab 1 — verify the remote player in Tab 2 moves with interpolation.
5. Move in Tab 2 — verify Tab 1 sees the movement.

If issues are found, fix them. Common problems to check:
- Room state not initializing (call setState in GameRoom.onCreate before any client joins).
- players.onAdd not firing for already-present players — on join, iterate
  room.state.players.forEach() to render existing players.
- CORS errors — in server/src/index.ts, pass { cors: { origin: "http://localhost:3000" } }
  to WebSocketTransport options.
- Animation key mismatch between client and server strings.

After fixes, add a simple in-game overlay (Phaser Text) showing:
- "Players online: N" (top-left, updates on onAdd/onRemove)
- Local player session ID (top-right, small font)

Confirm when done and show me what was created.
```

---

## TYDZIEŃ 3 — World map

### [x] Wieczór 11+12: Procedural map generation (replaced Tiled plan)

```
Create a game map using Tiled Map Editor (https://www.mapeditor.org/).

1. Open Tiled. Create a new map:
   - Orientation: Orthogonal
   - Tile size: 16x16
   - Map size: 100x100 tiles (1600x1600 px)
   - Save as: public/assets/maps/world.tmj (Tiled JSON format)

2. Import the Fairy Forest tileset:
   - Tileset image: public/assets/Pixel Crawler - Fairy Forest 1.7/Pixel Crawler - Fairy Forest 1.7/Assets/Tileset.png
   - Tile size: 16x16
   - Name the tileset "fairy_forest"
   - Save the tileset as: public/assets/maps/fairy_forest.tsj

3. Create these layers in Tiled:
   - "Ground"      (tile layer) — fill with grass tiles
   - "Decoration"  (tile layer) — add trees, rocks, bushes sparsely
   - "Collision"   (object layer) — draw rectangles over trees/rocks to mark collision zones
   - "Spawns"      (object layer) — add point objects: type "player_spawn", type "tree", type "stone", type "food"

4. Paint a basic map: mostly grass, some forest patches, a clearing in the center.

5. Export the map as public/assets/maps/world.tmj (Tiled JSON).

Confirm when done and show me the layer structure and a count of spawn objects placed.
```

---

### [x] Wieczór 12: (merged into Wieczór 11 — procedural map)

```
Load the Tiled map created in Wieczór 11 into the Phaser PlayScene.

In src/app/game/scenes/PlayScene.ts:

1. In preload():
   - Load the tilemap JSON: this.load.tilemapTiledJSON('world', '/assets/maps/world.tmj')
   - Load the tileset image: this.load.image('fairy_forest', '/assets/Pixel Crawler - Fairy Forest 1.7/Pixel Crawler - Fairy Forest 1.7/Assets/Tileset.png')

2. In create():
   - Create the tilemap: const map = this.make.tilemap({ key: 'world' })
   - Add the tileset: const tiles = map.addTilesetImage('fairy_forest', 'fairy_forest')
   - Create tile layers: map.createLayer('Ground', tiles), map.createLayer('Decoration', tiles)
   - Set collision on the Decoration layer for non-empty tiles:
       decorationLayer.setCollisionByExclusion([-1])
   - Add Arcade Physics collider between player sprite and decorationLayer:
       this.physics.add.collider(playerSprite, decorationLayer)
   - Enable Arcade Physics on the player sprite (convert to physics sprite if needed).
   - Set world bounds to map width/height in pixels.

3. Set camera zoom to 2 (so each 16px tile renders as 32px):
     this.cameras.main.setZoom(2)
     this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

4. Make sure physics world bounds match the map:
     this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
   And the player collides with world bounds:
     playerSprite.body.setCollideWorldBounds(true)

Confirm when done and show me what was created.
```

---

### [x] Wieczór 13: Fog of war + persistent discoveries

```
Implement fog of war in the Phaser PlayScene (src/app/game/scenes/PlayScene.ts).

Design:
- The map is hidden by a dark overlay.
- Tiles within 6 tiles (96px at zoom 1) of the player are fully visible.
- Previously discovered tiles are dimly visible (50% opacity overlay).
- Undiscovered tiles are completely hidden (100% opacity).

Implementation:
1. Create a RenderTexture the size of the map:
     const fog = this.add.renderTexture(0, 0, map.widthInPixels, map.heightInPixels)
   Fill it with black (opacity 1).
   Set its depth to 100 (above map layers, below UI).

2. Maintain a Uint8Array discoveredTiles of size (mapWidth * mapHeight).

3. In update():
   - Compute player tile position: tileX = Math.floor(player.x / 16), tileY = Math.floor(player.y / 16)
   - For each tile within radius 6, mark discoveredTiles[tileY * mapWidth + tileX] = 1.
   - Redraw the fog RenderTexture:
       fog.clear()
       fog.fill(0x000000, 1)  // start fully black
       For each discovered tile: draw a transparent square (erase fog) at that tile position.
       For tiles currently in view radius: draw fully transparent.
       For previously discovered tiles outside radius: draw semi-transparent (alpha 0.5).

4. Persist discoveredTiles to localStorage on every 5-second interval:
     localStorage.setItem('fog_' + roomId, JSON.stringify(Array.from(discoveredTiles)))
   Load it on scene create.

Confirm when done and show me what was created.
```

---

### [x] Wieczór 14: ResourceNodes and FoodNodes on map
DONE — Client-side chunk generation (treeAtChunk, rockAtChunk), tree_sheet + rocks sprites,
7×10 tree footprint + 3×3 rock footprint, dead-resource multiplayer sync via
dead_trees_init / dead_rocks_init / tree_dead / rock_dead / rock_respawn messages.
Trees never respawn; rocks respawn after 60s. Collision debug overlay added.
Player box collision (PLAYER_HW=12, PLAYER_HH=20) with sliding + orange attack range viz.

```
Spawn ResourceNodes (trees, stones) and FoodNodes (mushrooms, berries) on the map
based on Tiled spawn objects, and sync their state via Colyseus WorldState.

SERVER (server/src/GameRoom.ts):
1. In onCreate(), parse spawn data passed as options OR hardcode initial nodes for now.
   Create ResourceNode entries in this.state.resources:
   - 20 trees (type: "tree", hp: 5, maxHp: 5, respawnAt: 0, isAlive: true)
   - 15 stones (type: "stone", hp: 3, maxHp: 3)
   Place them at positions corresponding to "tree" and "stone" Spawn objects from the map
   (hardcode the x/y for now, or pass them as room options from the client).
   Do the same for FoodNodes in this.state.foods:
   - 10 mushrooms (type: "mushroom"), 10 berry_bush (type: "berry_bush")

2. Add a message handler 'harvest' that:
   - Receives { nodeId: string, tool: string }
   - Finds the ResourceNode or FoodNode by id.
   - Reduces hp by 1.
   - If hp <= 0: sets isAlive = false, sets respawnAt = Date.now() + 60_000 (1 min).
   - (Item drops will be added in Wieczór 21.)

CLIENT (src/app/game/scenes/PlayScene.ts):
1. In create(), subscribe to room.state.resources.onAdd and room.state.foods.onAdd:
   - Spawn a Phaser sprite for each node using the correct Pixel Crawler sprite:
     - tree → Pixel Crawler - Fairy Forest 1.7/.../Decoration/Tree.png (or nearest match in ASSETS_MAP.md)
     - stone → Pixel Crawler - Free Pack 2.0.4/.../Objects/Rock.png (check ASSETS_MAP.md)
     - mushroom, berry_bush → appropriate food sprites from ASSETS_MAP.md
   - Scale sprites x2 to match camera zoom.
2. On onChange: hide sprite if isAlive = false, show if true.
3. On player pressing E near a node (within 40px): send room.send('harvest', { nodeId, tool: 'hand' }).

Confirm when done and show me what was created.
```

---

### [x] Wieczór 15: Camera deadzone + lerp, minimap, fog of war fix
DONE — `cameras.main.startFollow(followTarget, true, 0.08, 0.08)`, `setDeadzone(200, 140)`. Minimap: `minimapGfx: Graphics`, 160×120px, depth 25, top-right. VISION_RADIUS reduced 60→16 tiles (fog was never visible before — 60 tiles > half screen diagonal). Later migrated to HTML canvas in React sidebar (Session 9).

---

## TYDZIEŃ 4 — Auth and persistence

### [x] Wieczór 16: Clerk auth setup in Next.js
DONE — `@clerk/nextjs` installed, `ClerkProvider` in `layout.tsx`. `AuthButton.tsx` (useClerk openSignIn/signOut). `HomeAuth.tsx`: LoggedIn (avatar, name, email, session time) + LoggedOut (SignIn form). `page.tsx` simplified to `<HomeAuth />`. Clerk dashboard: email OTP only, phone numbers disabled (Polish numbers unsupported). Clerk SignIn overflow fixed with `appearance.elements` API (rootBox/card/cardBox width 100%).

---

### [x] Wieczór 17: Enemy system — Hunter AI + zone spawning
DONE — `EnemyState` schema: id, type, x/y, hp/maxHp, isAlive, animKey. Hunter: 6 sprites (idle/walk/pierce × down/side/up), `HUNTER_ANIM_MAP`, pierce loops `repeat: -1`. Zone-based spawning: world in 256px zones, `enter_chunk` triggers `activateZone(zx, zy)` for radius-2 neighbourhood, up to 8 spawn attempts. Single `setSimulationInterval → masterTick(dt)` at 100ms (Colyseus keeps only last registration). `tickEnemyAI` at 1000ms: chase (`ENEMY_CHASE_RANGE=500px`), attack (`ENEMY_STOP_DIST=54px`), wander. Server map collision ported from MapGenerator. `attack_enemy` handler (64px range). `player_damage` targeted message. `MAX_ALIVE_ENEMIES=40`.

---

### [x] Wieczór 18: Player HUD sidebar, /status page, sanity overhaul
DONE — Layout: flex row (canvas flex:1 + sidebar 216px). `PlayerPanel.tsx` pełny redesign wg Stitch concept: OPERATOR header, DAY N ☀/NIGHT N 🌙 counter (client-side), TACTICAL_MAP section z `<canvas id="minimap-canvas">` + X/Y position. Kafelki COMBAT/OBRONA, sloty ekwipunku jako symbole tekstowe, QUEST_OBJ ★★☆. `/status` strona polling `/health` co 2s (status serwisów, liczba pokoi/graczy). Sanity mechanics: passive regen +0.3/tick, kill −20, harvest +2. `effectiveAttack` = floor(baseAttack/2) przy sanity≤0 (serwer-side). `sendStatsToPlayers` wysyła stats co tick.

---

### [x] Wieczór 19: HUD redesign (Stitch concept) + minimap na HTML canvas
DONE — Stitch projekt "Gameforge — Neon Quest UI" (ID: 11496012017862414056). `minimapGfx` usunięty z Phaser; minimap renderowany na `<canvas id="minimap-canvas">` w React sidebar. `drawMinimap()`: ImageData + putImageData (1 GPU upload vs ~19K fillRect/frame). Mgła: single-pass dim-factor 0.35. Emituje event `gamePosition: {x, y}`. `STITCH_BRIEF.md` — design brief dla 8 ekranów.

---

### [x] Wieczór 20: Supabase tables setup

```
Set up Supabase database schema for Gameforge.

1. Install Supabase client:
   npm install @supabase/supabase-js

2. Add to .env.local:
   NEXT_PUBLIC_SUPABASE_URL=<your project URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service role key — only in server-side code>

3. Create src/lib/supabase.ts exporting:
   - supabase (anon client for client-side)
   - supabaseAdmin (service role client for server-side API routes only)

4. In the Supabase SQL editor, run migrations to create these tables:

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  x FLOAT DEFAULT 400,
  y FLOAT DEFAULT 300,
  hp INT DEFAULT 100,
  max_hp INT DEFAULT 100,
  hunger FLOAT DEFAULT 100,
  sanity FLOAT DEFAULT 100,
  inventory JSONB DEFAULT '[]',
  equipment JSONB DEFAULT '{}',
  active_slot INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  creator_id UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_members (
  player_id UUID REFERENCES players(id),
  group_id UUID REFERENCES groups(id),
  role TEXT DEFAULT 'member',
  PRIMARY KEY (player_id, group_id)
);

CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id),
  type TEXT NOT NULL,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  material TEXT DEFAULT 'wood',
  hp INT NOT NULL,
  max_hp INT NOT NULL,
  owner_id UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE resource_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id),
  type TEXT NOT NULL,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  hp INT NOT NULL,
  max_hp INT NOT NULL,
  respawn_at TIMESTAMPTZ,
  is_alive BOOLEAN DEFAULT true
);

CREATE TABLE food_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id),
  type TEXT NOT NULL,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  is_alive BOOLEAN DEFAULT true,
  respawn_at TIMESTAMPTZ
);

CREATE TABLE cooking_pots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id),
  slot1 TEXT DEFAULT '',
  slot2 TEXT DEFAULT '',
  current_recipe TEXT DEFAULT '',
  cooking_until TIMESTAMPTZ,
  is_ready BOOLEAN DEFAULT false,
  result TEXT DEFAULT ''
);

5. Enable Row Level Security on all tables (ALTER TABLE x ENABLE ROW LEVEL SECURITY).
   Add a permissive policy for now: CREATE POLICY "allow all" ON x FOR ALL USING (true).
   (Tighten in Wieczór 48.)

Confirm when done and show me the table list.
```

---

### [x] Wieczór 20b: Clerk JWT weryfikacja po stronie Colyseus (zrobiona wcześniej)
DONE — `@clerk/backend` zainstalowany w server/. `onJoin` async, `verifyToken(token, { secretKey, jwtKey })`. Valid → `player.userId = payload.sub`. Invalid → `client.leave(4001)`. No token → guest fallback (`userId = sessionId`). `dotenv/config` import w `index.ts` (był brakujący — CLERK_SECRET_KEY był undefined).

---

### [x] Wieczór 21: Load player state on join from Supabase

```
When a player joins the Colyseus room, load their saved state from Supabase
(or create a new record if first-time player).

SERVER (server/src/GameRoom.ts):
1. Install Supabase client in server/:
     cd server && npm install @supabase/supabase-js
2. Add to server/.env.example:
     SUPABASE_URL=
     SUPABASE_SERVICE_ROLE_KEY=
3. Create server/src/db.ts that exports a Supabase admin client using
   process.env.SUPABASE_URL and process.env.SUPABASE_SERVICE_ROLE_KEY.

4. In onJoin(), after verifying the Clerk token, call a loadPlayer(clerkId) function:
   - SELECT * FROM players WHERE clerk_id = clerkId.
   - If found: populate PlayerState fields (x, y, hp, hunger, sanity, inventory, equipment, active_slot).
   - If not found: INSERT a new row with default values, use options.nickname for nickname.
   - Return the player's database UUID and store it on the PlayerState (add a dbId field of type "string").

5. Handle errors gracefully: if Supabase is unreachable, allow the player in with
   default values and log a warning.

Confirm when done and show me what was created.
```

---

### [x] Wieczór 22: Save player state on leave + auto-save every 60s

```
Persist player state to Supabase when they leave the room and every 60 seconds.

SERVER (server/src/GameRoom.ts):
1. Create a savePlayer(player: PlayerState) async function in server/src/db.ts:
   UPDATE players SET
     x = player.x, y = player.y, hp = player.hp,
     hunger = player.hunger, sanity = player.sanity,
     inventory = player.inventory.toArray(),
     equipment = Object.fromEntries(player.equipment),
     active_slot = player.activeSlot,
     updated_at = now()
   WHERE clerk_id = player.userId

2. In onLeave(): call await savePlayer(player). Mark player.isOnline = false.
   Allow reconnection for 30 seconds using this.allowReconnection(client, 30).
   If the client reconnects within 30s, restore their session without re-loading from DB.

3. In GameRoom.onCreate(), set up an auto-save interval using this.clock.setInterval():
   Every 60 seconds, iterate this.state.players and call savePlayer for each online player.
   Use Promise.allSettled() so one failure does not block others.

4. Log save operations: "[GameRoom] Saved player {nickname} ({sessionId})"

Confirm when done and show me what was created.
```

---

## TYDZIEŃ 5 — Resources, inventory, food, enemies

### [x] Wieczór 23: Harvest system

```
Implement the harvest system — players can collect resources by interacting with
ResourceNodes and FoodNodes.

SERVER (server/src/GameRoom.ts):
1. Update the 'harvest' message handler (added in Wieczór 14):
   - Validate the player is within 50px of the node (server-side distance check).
   - Validate the tool matches the node type:
       tree → requires tool "axe" (or "hand" for slower harvest)
       stone → requires tool "pickaxe"
       mushroom, berry_bush → requires tool "hand"
   - On successful hit (hp > 0): reduce node hp by 1.
   - On node death (hp <= 0):
     - Set isAlive = false, respawnAt = Date.now() + 60_000.
     - Add items to player inventory (push to player.inventory ArraySchema):
         tree → "wood" x2
         stone → "stone" x1
         mushroom → "mushroom" x1
         berry_bush → "berries" x2

2. Create server/src/itemConfig.ts with a plain object defining drop tables:
   export const DROP_TABLE = {
     tree: [{ item: 'wood', qty: 2 }],
     stone: [{ item: 'stone', qty: 1 }],
     mushroom: [{ item: 'mushroom', qty: 1 }],
     berry_bush: [{ item: 'berries', qty: 2 }],
   }

CLIENT (src/app/game/scenes/PlayScene.ts):
- On pressing E near a node, determine the tool from player.equipment.get('hand')
  or 'hand' as default.
- Send room.send('harvest', { nodeId, tool }).
- Play the 'collect' animation on the toolSprite.
- Show a floating "+wood" text above the player that fades out over 1 second
  (Phaser Tween on a Text object).

Confirm when done and show me what was created.
```

---

### [x] Wieczór 24: Food items config

```
Create a food item configuration system.

Create src/shared/foodConfig.ts (shared between client and server — copy to both or
use a shared import path):

export interface FoodItem {
  id: string
  name: string
  hungerRestore: number
  hpRestore: number
  cookable: boolean
  cookResult?: string  // item id of the cooked version
  cookTimeMs: number   // milliseconds to cook
  icon: string         // path relative to /assets/
}

export const FOOD_CONFIG: Record<string, FoodItem> = {
  mushroom: {
    id: 'mushroom', name: 'Mushroom', hungerRestore: 15, hpRestore: 0,
    cookable: true, cookResult: 'cooked_mushroom', cookTimeMs: 10_000,
    icon: 'Pixel Crawler - Free Pack 2.0.4/Pixel Crawler - Free Pack 2.0.4/Items/Food/Mushroom.png'
  },
  berries: {
    id: 'berries', name: 'Berries', hungerRestore: 10, hpRestore: 5,
    cookable: false, cookTimeMs: 0,
    icon: 'Pixel Crawler - Free Pack 2.0.4/Pixel Crawler - Free Pack 2.0.4/Items/Food/Berries.png'
  },
  raw_meat: {
    id: 'raw_meat', name: 'Raw Meat', hungerRestore: 5, hpRestore: -5,
    cookable: true, cookResult: 'cooked_meat', cookTimeMs: 15_000,
    icon: 'Pixel Crawler - Free Pack 2.0.4/Pixel Crawler - Free Pack 2.0.4/Items/Food/Meat_raw.png'
  },
  cooked_meat: {
    id: 'cooked_meat', name: 'Cooked Meat', hungerRestore: 40, hpRestore: 10,
    cookable: false, cookTimeMs: 0,
    icon: 'Pixel Crawler - Free Pack 2.0.4/Pixel Crawler - Free Pack 2.0.4/Items/Food/Meat_cooked.png'
  },
  cooked_mushroom: {
    id: 'cooked_mushroom', name: 'Cooked Mushroom', hungerRestore: 25, hpRestore: 5,
    cookable: false, cookTimeMs: 0,
    icon: 'Pixel Crawler - Free Pack 2.0.4/Pixel Crawler - Free Pack 2.0.4/Items/Food/Mushroom_cooked.png'
  },
}

Check public/assets/ASSETS_MAP.md for the exact icon paths — update them to match
real files found in the Free Pack. If a file does not exist, use the closest match.

Also create server/src/foodConfig.ts as a copy (or symlink if on Linux/Mac).

Confirm when done and show me what was created.
```

---

### [x] Wieczór 25: Inventory UI 4×5 grid + eat action

```
Create an inventory UI in the Phaser game.

In src/app/game/ui/InventoryUI.ts, create a class InventoryUI that:
1. Renders a 4-column × 5-row grid of slots (20 slots total) as Phaser GameObjects.
   Each slot: 32×32px rectangle with border, icon image if item present, count text.
2. Is toggled open/closed by pressing I.
3. Reads from room.state.players.get(room.sessionId).inventory (ArraySchema<string>).
4. Each cell shows the item icon from FOOD_CONFIG[itemId].icon (loaded in preload).
5. Clicking a slot selects it; pressing E while a slot is selected eats the item:
   - Send room.send('eat', { itemId }) to the server.
   - Server handler in GameRoom.ts:
       Find item in FOOD_CONFIG.
       Remove one from player.inventory.
       player.hunger = Math.min(100, player.hunger + item.hungerRestore)
       player.hp = Math.min(player.maxHp, player.hp + item.hpRestore)
6. The bottom hotbar (8 slots, always visible) shows the first 8 inventory items.
   Active slot highlighted in yellow. Switch with keys 1–8.

Also render the active item name above the hotbar.

Confirm when done and show me what was created.
```

---

### [x] Wieczór 26: Enemy drop system + equippable items
DONE (Session 14) — lootConfig.ts (7 gear items, weighted pool bez raw_meat, 30% no-drop), equip_item/unequip_item/destroy_item handlers, recalcStats, inventory_load sync, side info modal z porównaniem statystyk, PlayerPanel equipment slots z bonusami.

```
Implement enemy item drops including equippable gear that modifies player stats.

SERVER — create server/src/lootConfig.ts:

export interface LootItem {
  id: string
  name: string
  slot: 'weapon' | 'armor' | 'helmet' | 'item'  // equipment slot
  attackBonus: number   // added to player.attack when equipped
  defenseBonus: number  // added to player.defense when equipped
  rarity: 'common' | 'uncommon' | 'rare'
}

export const LOOT_TABLE: Record<string, LootItem> = {
  // Weapons
  bone_sword:    { id: 'bone_sword',    name: 'Bone Sword',    slot: 'weapon',  attackBonus: 8,  defenseBonus: 0,  rarity: 'common' },
  iron_sword:    { id: 'iron_sword',    name: 'Iron Sword',    slot: 'weapon',  attackBonus: 15, defenseBonus: 0,  rarity: 'uncommon' },
  shadow_blade:  { id: 'shadow_blade',  name: 'Shadow Blade',  slot: 'weapon',  attackBonus: 25, defenseBonus: 0,  rarity: 'rare' },
  // Armor
  leather_armor: { id: 'leather_armor', name: 'Leather Armor', slot: 'armor',   attackBonus: 0,  defenseBonus: 5,  rarity: 'common' },
  chain_mail:    { id: 'chain_mail',    name: 'Chain Mail',    slot: 'armor',   attackBonus: 0,  defenseBonus: 10, rarity: 'uncommon' },
  // Helmet
  bone_helmet:   { id: 'bone_helmet',   name: 'Bone Helmet',   slot: 'helmet',  attackBonus: 0,  defenseBonus: 3,  rarity: 'common' },
  iron_helmet:   { id: 'iron_helmet',   name: 'Iron Helmet',   slot: 'helmet',  attackBonus: 0,  defenseBonus: 7,  rarity: 'uncommon' },
}

// Drop chances per rarity: common 60%, uncommon 30%, rare 10%
export const ENEMY_DROP_POOL = {
  hunter: ['bone_sword', 'leather_armor', 'bone_helmet', 'iron_sword', 'chain_mail', 'shadow_blade', 'iron_helmet', 'raw_meat'],
  // weights: common×3, uncommon×2, rare×1, raw_meat×4 (most frequent non-gear drop)
}

SERVER (server/src/GameRoom.ts):
1. 'attack_enemy' handler — on enemy death:
   - Roll a random drop from ENEMY_DROP_POOL[enemy.type] using weighted rarity.
   - 30% chance of no drop (enemy drops nothing).
   - Push the drop item id into player.inventory.
   - Broadcast 'enemy_loot' { itemId, itemName, rarity, x: enemy.x, y: enemy.y } to all clients.

2. Add 'equip_item' message handler:
   - Receives { itemId: string }
   - Look up itemId in LOOT_TABLE — must be an equippable slot item.
   - Validate item is in player.inventory.
   - If player already has something in that slot: swap (move current equipped item back to inventory).
   - Set player.equipment.set(slot, itemId), remove itemId from inventory.
   - Recalculate and update player.attack and player.defense:
       player.attack = BASE_ATTACK + (weapon bonus or 0)
       player.defense = BASE_DEFENSE + (armor bonus or 0) + (helmet bonus or 0)
   - Send 'stats_update' immediately after equip.

3. Add 'unequip_item' message handler:
   - Receives { slot: string }
   - Move item from equipment back to inventory.
   - Recalculate attack/defense.

Constants:
  const BASE_ATTACK = 5
  const BASE_DEFENSE = 2

CLIENT (src/app/game/scenes/PlayScene.ts):
1. On 'enemy_loot' broadcast:
   - Show floating loot text above the death position: "+Iron Sword" in color by rarity
     (common=white, uncommon=green, rare=gold).
   - Play a sparkle particle effect at the drop position.

CLIENT — PlayerPanel.tsx (React sidebar):
1. Equipment slots (weapon/armor/helmet/item) now show the actual equipped item name
   and its bonuses (e.g. "Iron Sword +15 ATK").
2. Clicking an equipped slot sends room.send('unequip_item', { slot }) via window event
   dispatched from Phaser or directly via getRoom().
3. Atak/Obrona values in the sidebar update automatically via stats_update (already wired).

Confirm when done and show me what was created.
```

---

### [x] Wieczór 27: Drop mechanic — wyrzucanie itemów na ziemię
DONE (Session 15) — `drop_item`/`pickup_item` handlers na serwerze, dropped items in-memory (room lifetime), sprite kółko z symbolem itemu, E key pickup z priorytetem nad harvest, ESC zamyka inventory, fix resource generation przy spawn_at (deadTreesInitDone/deadRocksInitDone flagi).

```
ORIGINAL PROMPT (nieaktualne — HUD zrobiony w React sidebarze):
```

```
Create the HUD overlay in src/app/game/ui/HUD.ts.

The HUD must be fixed to the camera (depth 1000, scrollFactor 0) and show:

1. HP bar: red bar, width proportional to player.hp / player.maxHp.
   Label "HP" on the left. Numeric value on the right (e.g. "85/100").

2. Hunger bar: orange/yellow bar, width proportional to player.hunger / 100.
   Label "HUNGER". Flash yellow when hunger < 20.

3. Sanity bar: purple bar, proportional to player.sanity / 100.
   Label "SANITY". Flash white when sanity < 20.

4. Active item slot: 40×40px box showing current item icon + name, bottom center.

5. Day/night indicator: top right corner.
   Show a sun icon (draw with Phaser Graphics) during day, moon icon at night.
   Show current time as "DAY 1 — 14:30" (derive from room.state.worldTime and a day counter).

6. Weather indicator: placeholder "☀ Clear" text for now (weather system added later).

All bars update in real time from room.state.players.get(room.sessionId) state changes.
Use room.state.players.onChange() to trigger re-renders.

Add a Phaser Scene called UIScene that runs in parallel with PlayScene
(scene config: { key: 'UIScene', active: false }).
Launch it from PlayScene.create() with this.scene.launch('UIScene', { room }).

Confirm when done and show me what was created.
```

---

*Wieczóry 28–30 (Building & cooking) przeniesione do Tygodnia 10 (W54–W58) zgodnie z priorytetami.*

---

## TYDZIEŃ 6 — GameForge platform

### [x] Wieczór 31: Group creation API

```
Create the API endpoint for group creation in Next.js.

Create src/app/api/groups/route.ts (Next.js App Router API route):

POST /api/groups
- Requires Clerk authentication (use auth() from @clerk/nextjs/server).
- Body: { name: string }
- Generates a unique 8-character alphanumeric group code (format: ABC-1234).
  Use crypto.randomBytes to generate, ensure uniqueness by checking Supabase.
- Creates a record in the groups table.
- Creates a group_members record linking the creator as role: 'creator'.
- Returns: { groupId, code, name }

GET /api/groups
- Returns all groups the authenticated user is a member of.
- JOIN groups with group_members WHERE player_id = currentPlayer.id.

Create src/app/api/groups/join/route.ts:

POST /api/groups/join
- Body: { code: string }
- Looks up the group by code.
- Adds the player to group_members with role: 'member'.
- Returns: { groupId, code, name }

Add input validation: name max 32 chars, code must match /^[A-Z]{3}-[0-9]{4}$/.
Return proper HTTP status codes (400 for validation errors, 404 for not found, 409 for already member).

Confirm when done and show me what was created.
```

---

### [x] Wieczór 32: Join by link + join by code on start screen

```
Implement the group joining flow in the Next.js frontend.

1. Create src/app/join/[code]/page.tsx:
   - If user is not signed in: redirect to /sign-in?redirect=/join/[code].
   - If signed in: call POST /api/groups/join with the code from the URL.
   - On success: redirect to /game?groupId=[groupId].
   - On error (group not found, already member): show an appropriate message.
   - Loading state while API call is in progress.

2. Update src/app/page.tsx (home/start screen):
   - Add a "Join with code" section with a text input (format hint: "ABC-1234")
     and a Join button.
   - On submit: call POST /api/groups/join, then redirect to /game?groupId=...
   - Add a "Create group" button that calls POST /api/groups with a prompted name,
     then shows the generated code and a shareable link.
   - Display current user's groups (GET /api/groups) with "Play" buttons.

3. In src/app/game/network/ColyseusClient.ts:
   - Read groupId from the URL query parameter.
   - Pass groupId in the room join options: room.joinOrCreate('game_room', { token, nickname, groupId })
   - The server's onJoin already accepts options — verify groupId is stored/used.

Confirm when done and show me what was created.
```

---

### [x] Hotfix / Sesje 30–31b: Production fixes + session conflict detection
DONE — Vercel prerender fix (`<Suspense>` wokół `PlayerPanel`); `getOrCreatePlayerId()` — automatyczne tworzenie rekordu gracza w Supabase gdy brak (fix 404 na `/api/groups`); single active session dla zalogowanych (WhatsApp-style: `session_conflict` → modal PRZEJMIJ/ANULUJ → `confirm_takeover`/`decline_takeover`); single active session dla gości — `guestId` przeniesiony z `sessionStorage` do `localStorage` żeby był współdzielony między kartami; `session_ready` jako sygnał startu Phasera; overlay `session_taken_over` z `.setScrollFactor(0)`.

---

## TYDZIEŃ 7 — Visual variants and RuleEngine

### [x] Wieczór 36: Monster tint system

```
Implement the MonsterConfig system for creating visual variants of enemies.

Create src/shared/monsterConfig.ts:

export interface MonsterConfig {
  id: string
  name: string
  baseSprite: string        // key of the base Phaser sprite (e.g. 'orc')
  tint: number              // hex color applied with sprite.setTint() (e.g. 0xff4444)
  scale: number             // default 1.0
  particleEffect?: string   // particle preset id (see Wieczór 37)
  hp: number
  maxHp: number
  damage: number
  dropTable: Array<{ item: string; chance: number; qty: number }>
}

export const MONSTER_CONFIG: Record<string, MonsterConfig> = {
  orc: {
    id: 'orc', name: 'Orc', baseSprite: 'orc', tint: 0xffffff, scale: 1.0,
    hp: 30, maxHp: 30, damage: 5,
    dropTable: [{ item: 'raw_meat', chance: 1.0, qty: 1 }]
  },
  fire_orc: {
    id: 'fire_orc', name: 'Fire Orc', baseSprite: 'orc', tint: 0xff4400, scale: 1.1,
    particleEffect: 'fire',
    hp: 40, maxHp: 40, damage: 8,
    dropTable: [{ item: 'raw_meat', chance: 1.0, qty: 1 }, { item: 'ember', chance: 0.5, qty: 1 }]
  },
}

SERVER (server/src/GameRoom.ts):
1. Add @type("string") configId to EnemyState (the MonsterConfig id).
2. On spawn, set configId = 'orc' (or the appropriate variant).

CLIENT (src/app/game/scenes/PlayScene.ts):
1. On room.state.enemies.onAdd: look up MONSTER_CONFIG[enemy.configId].
2. Apply config.tint with sprite.setTint(config.tint).
3. Apply config.scale with sprite.setScale(config.scale).
4. Start particle effect if config.particleEffect is set (implemented in Wieczór 37).

Confirm when done and show me what was created.
```

---

### [x] Wieczór 37: Elemental weapons + particle effects + status effects

```
Implement elemental weapon variants, particle effects (enemies + weapons), and a multi-effect
status system on enemies. One enemy can have multiple active effects simultaneously
(e.g., fire + poison from two different players attacking it).

═══ PART 1: Elemental weapon variants ═══

SERVER (server/src/lootConfig.ts):
- After rolling base weapon, roll element based on rarity:
    common (bone_sword):   20% chance of element
    uncommon (iron_sword): 50% chance of element
    rare (shadow_blade):   80% chance of element
- If element rolled: pick random element from ['fire','ice','poison','electric','shadow','holy']
- Append suffix to item ID: e.g. 'iron_sword' → 'iron_sword_of_fire'

CLIENT (src/app/game/ui/itemConfig.ts):
- Add particleEffect?: string to ItemDef
- Add ELEMENT_MODIFIERS: Record<string, { nameSuffix: string; particleEffect: string; attackBonus: number }>
  fire:     { nameSuffix: 'of Fire',     particleEffect: 'fire',     attackBonus: 3 }
  ice:      { nameSuffix: 'of Ice',      particleEffect: 'ice',      attackBonus: 2 }
  poison:   { nameSuffix: 'of Poison',   particleEffect: 'poison',   attackBonus: 2 }
  electric: { nameSuffix: 'of Thunder',  particleEffect: 'electric', attackBonus: 4 }
  shadow:   { nameSuffix: 'of Shadow',   particleEffect: 'shadow',   attackBonus: 5 }
  holy:     { nameSuffix: 'of Holy',     particleEffect: 'holy',     attackBonus: 6 }
- Add getItemDef(id: string): ItemDef — parses elemental suffix, builds ItemDef dynamically
  e.g. 'iron_sword_of_fire' → iron_sword base + fire modifier (name: 'Iron Sword of Fire', attackBonus: 15+3=18)
- Keep ITEM_MAP for base items, use getItemDef() everywhere else in PlayScene

═══ PART 2: Particle effects ═══

NEW FILE src/app/game/effects/particles.ts:

export type ParticlePreset = 'fire' | 'ice' | 'poison' | 'electric' | 'shadow' | 'holy';

export function createParticleTexture(scene: Phaser.Scene): void
  - Use Graphics to draw a 4px white circle, generateTexture('particle_dot'), destroy graphics

export function playEffect(scene, preset, x, y, followTarget: Phaser.GameObjects.Sprite):
  Phaser.GameObjects.Particles.ParticleEmitter
  - Continuous emitter, uses follow: followTarget (Phaser 3.60+ native)
  - Used for: enemy intrinsic effects (fire_hunter, boss_hunter)

export function burstEffect(scene, preset, x, y): void
  - One-shot explode(N), auto-destroys after 600ms
  - Used for: weapon hit effects

Particle configs:
  fire:     tint [0xff4400, 0xff8800], speed 20-60, angle 250-290 (upward), lifespan 600, qty 3, freq 100
  ice:      tint [0x88ddff, 0xffffff], speed 10-30, lifespan 800, qty 2, freq 150
  poison:   tint [0x44ff44, 0x228822], angle 0-360, lifespan 1000, qty 1, freq 200
  electric: tint [0xffff00, 0x8888ff], speed 50-100, lifespan 200, qty 5, freq 50
  shadow:   tint [0x440044, 0x880088], speed 5-20, lifespan 1500, qty 1, freq 300
  holy:     tint [0xffffaa, 0xffffff], angle 0-360, lifespan 1000, qty 2, freq 150

═══ PART 3: Multi-effect status system ═══

SERVER (server/src/GameRoom.ts):

1. EnemyState: add @type({ map: "float64" }) statusEffects: MapSchema<float64>
   - key = effect name ('fire', 'ice', etc.), value = expiry timestamp (Date.now() + duration)
   - Multiple effects coexist — one per element type, each with its own expiry

2. attack_enemy handler changes:
   - Parse element from player.equipment["weapon"]: split on '_of_', take second part
   - If element found, apply status effect:
       fire:     statusEffects.set('fire',     now + 5000)  — also apply 5 dmg immediately
       ice:      statusEffects.set('ice',      now + 4000)
       poison:   statusEffects.set('poison',   now + 8000)
       electric: statusEffects.set('electric', now + 2000)
       shadow:   heal attacker +10 HP (instant, no status stored)
       holy:     +20 bonus damage on this hit (instant, no status stored)

3. In masterTick / tickEnemyAI (runs every 1000ms):
   - For each alive enemy, iterate statusEffects entries:
       fire:     deal 5 damage to enemy
       poison:   deal 3 damage to enemy
       ice:      velocity multiplied by 0.5 in tickEnemyMovement (check statusEffects.has('ice'))
       electric: velocity set to 0 in tickEnemyMovement (check statusEffects.has('electric'))
   - Delete expired effects: if Date.now() > expiry → statusEffects.delete(key)
   - After processing, broadcast updated hp via enemy_hit if changed

CLIENT (src/app/game/scenes/PlayScene.ts):

1. In create(): call createParticleTexture(this)

2. EnemyData: add
   - intrinsicEmitter?: Phaser.GameObjects.Particles.ParticleEmitter  (fire_hunter, boss_hunter)
   - statusEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter>  (applied effects)
   - activeStatusEffects: Set<string>  (for icon display)

3. addEnemy(): if config.particleEffect → playEffect(..., activeSprite) → store in intrinsicEmitter

4. killEnemy(): destroy intrinsicEmitter + all statusEmitters, then existing cleanup

5. Handle statusEffects from state sync (room.state.enemies.onChange or stats broadcast):
   - For each effect in enemy.statusEffects not in statusEmitters → start playEffect, add to statusEmitters
   - For each effect in statusEmitters not in enemy.statusEffects → destroy emitter, remove from map
   - Update activeStatusEffects set

6. Draw status icons above HP bar in drawEnemyHpBar():
   - For each active effect, draw small colored circle + emoji label (🔥❄️☠️⚡🌑✨)
   - Icons stacked horizontally, 14px above HP bar
   - Colors: fire=#ff4400, ice=#88ddff, poison=#44ff44, electric=#ffff00, shadow=#880088, holy=#ffffaa

7. SPACE attack: get equipped weapon → getItemDef(id)?.particleEffect → burstEffect at attack position

═══ PART 4: boss_hunter gets shadow effect ═══

Update server/src/monsterConfig.ts AND src/app/game/monsterConfig.ts:
  boss_hunter: add particleEffect: 'shadow'

Confirm when done and show me what was created.
```

---

### [x] Wieczór 38: RuleEngine in Colyseus

```
Implement a RuleEngine in the Colyseus server that evaluates declarative rules every tick.

Create server/src/RuleEngine.ts:

export interface Rule {
  id: string
  trigger: RuleTrigger
  conditions: RuleCondition[]
  effects: RuleEffect[]
  // For every_Ns trigger:
  intervalMs?: number        // e.g. 7200000 for 2 hours
  _nextFireAt?: number       // internal: Date.now() + intervalMs, set by engine
}

export type RuleTrigger =
  | 'on_tick'          // evaluated every server tick (~100ms)
  | 'every_Ns'         // fires once every rule.intervalMs milliseconds
  | 'on_eat'           // when a player eats an item
  | 'on_cook'          // when cooking completes
  | 'on_hunger_low'    // when player.hunger < 20
  | 'on_enemy_death'   // when an enemy dies
  | 'on_player_join'

export interface RuleCondition {
  field: string        // e.g. 'player.hunger', 'world.isNight', 'item.type', 'random'
  operator: '<' | '>' | '==' | '!=' | 'includes'
  value: string | number | boolean
}

export interface RuleEffect {
  action: 'modify_stat' | 'add_item' | 'spawn_enemy' | 'broadcast_message' | 'set_weather'
  target?: 'player' | 'all_players' | 'world'  // 'all_players' iterates all players in room
  field?: string
  value?: string | number
  pool?: string[]    // if provided, pick one random element instead of using value
  qty?: number       // for spawn_enemy: how many to spawn (default 1)
}

export class RuleEngine {
  private rules: Rule[] = []

  loadRules(rules: Rule[]) {
    this.rules = rules
    // Initialize _nextFireAt for every_Ns rules
    const now = Date.now()
    for (const rule of this.rules) {
      if (rule.trigger === 'every_Ns' && rule.intervalMs) {
        rule._nextFireAt = now + rule.intervalMs
      }
    }
  }

  evaluate(trigger: RuleTrigger, context: RuleContext): RuleEffect[] {
    // Filter rules by trigger, evaluate conditions against context, return effects
    // For every_Ns: only fire if Date.now() >= rule._nextFireAt, then advance _nextFireAt
    // For pool effects: resolve random item from pool before returning
  }
}

export interface RuleContext {
  player?: PlayerState
  world?: WorldState
  item?: { type: string; id: string }
  enemy?: EnemyState
}

In server/src/GameRoom.ts:
1. Instantiate RuleEngine in onCreate().
2. Load default rules (empty array for now).
3. In tick loop: call ruleEngine.evaluate('on_tick', { world: this.state })
   AND ruleEngine.evaluate('every_Ns', { world: this.state }).
4. Apply returned effects:
   - modify_stat on player/all_players: clamp to [0, 100]
   - add_item on player/all_players: add to inventory, send inventory_load
   - spawn_enemy: call spawnSingleEnemy() qty times
   - broadcast_message: this.broadcast("rule_message", { text })
   - set_weather: this.state.weather = value
5. Expose applyModRules(rules: Rule[]) — calls loadRules, used in Wieczór 47.

Confirm when done and show me what was created.
```

---

### [x] Wieczór 39: Rule triggers for food, death and timed loops

```
Add food, enemy death and timed loop triggers to the RuleEngine.

In server/src/GameRoom.ts, fire rule triggers at the appropriate moments:

1. 'on_eat' trigger — fire in the 'eat' message handler after applying base food values:
   ruleEngine.evaluate('on_eat', { player, item: { type: itemId, id: itemId } })

2. 'on_cook' trigger — fire in cook_bonfire and pot_collect handlers:
   ruleEngine.evaluate('on_cook', { player, item: { type: result } })

3. 'on_hunger_low' trigger — fire in tick() when player.hunger < 20:
   ruleEngine.evaluate('on_hunger_low', { player, world: this.state })
   (Only fire once per player per minute — Map<sessionId, lastFiredAt> throttle.)

4. 'on_enemy_death' trigger — fire in the enemy kill handler, pass enemy context:
   ruleEngine.evaluate('on_enemy_death', { player, enemy, world: this.state })
   Apply effects including add_item with target 'all_players' and pool support:
   - target 'player': add item to killer only
   - target 'all_players': iterate this.state.players, add item to each (random from pool per player)
   Send inventory_load to each affected client.

Write 4 example Rule objects in server/src/defaultRules.ts to test the engine:

Rule 1: on_eat cooked_meat → add_item pool:['bone'] (10% chance — condition: random < 0.1)
Rule 2: on_hunger_low → broadcast_message "Jesteś głodny!"
Rule 3: on_tick (world.isNight) → modify_stat all_players sanity -= 0.1 per tick
Rule 4 (timed loop test): every_Ns intervalMs:60000 (1 min), condition world.isNight==true
  → spawn_enemy configId:'boss_hunter' qty:1, broadcast_message "Nocny boss nadciąga!"

Load defaultRules in GameRoom.onCreate().

Confirm when done and show me what was created.
```

---

### [~] Wieczór 40: Visual variant system test — ODŁOŻONY

*Odłożony — nowe sprite'y (Orc, Skeleton i inne warianty) zostaną wygenerowane przez Pixellab w późniejszym etapie. Obecny hunter działa poprawnie z tint/scale/particles. Wrócimy do tego po W60 lub gdy sprite'y będą gotowe.*

---

## TYDZIEŃ 8 — AI modifications

### [x] Wieczór 41: Voice/text input component

```
Create a voice and text input component for entering game modification requests.

Create src/app/components/ModInput.tsx ('use client'):

Features:
1. Text area for typing a mod description (max 500 characters, character counter shown).
2. Voice input button using the Web Speech API:
   - Check browser support: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
   - On click: start recognition, set continuous: false, interimResults: true.
   - Show interim results in the text area as the user speaks.
   - On result: replace textarea content with final transcript.
   - Show microphone icon (active/inactive state).
   - Graceful fallback if not supported: hide voice button, show "(Voice input not available in this browser)".
3. Submit button labeled "Ask Claude to create mod".
4. Language selector: Polish / English (affects the language hint sent to Claude).

Place the component on a new page: src/app/forge/page.tsx
- Title: "GameForge — Create a Modification"
- Show ModInput component.
- Requires authentication (add /forge to protected routes in middleware.ts).
- Pass the submitted text to the API route created in Wieczór 43.

Confirm when done and show me what was created.
```

---

### [x] Wieczór 42: Claude API — 3 clarifying questions

```
Create the first step of the AI mod generation flow: Claude asks 3 clarifying questions.

Install the Anthropic SDK if not already installed:
  npm install @anthropic-ai/sdk

Create src/app/api/forge/clarify/route.ts:

POST /api/forge/clarify
- Body: { description: string, language: 'pl' | 'en' }
- Requires Clerk authentication.
- Calls Claude API (model: claude-sonnet-4-6):

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 500,
  system: `You are a game designer assistant for a 2D survival multiplayer game called Gameforge.
The game has: players, enemies (orc, skeleton), food items (mushroom, berries, raw_meat, cooked_meat),
buildings (bonfire, cooking_pot, wall_wood), and a day/night cycle.
Your job: ask exactly 3 SHORT clarifying questions to better understand what kind of game
modification the user wants. Questions should help determine: monster appearance, food/cooking
rules, or special effects. Reply in ${language === 'pl' ? 'Polish' : 'English'}.
Format: JSON array of 3 question strings.`,
  messages: [{ role: 'user', content: description }]
})

- Parse the JSON array from the response.
- Return: { questions: string[] }

In src/app/forge/page.tsx:
- After submitting the description, call POST /api/forge/clarify.
- Show the 3 questions as text inputs or radio groups.
- Add a "Generate mod" button that sends description + answers to Wieczór 43's endpoint.

Confirm when done and show me what was created.
```

---

### [x] Wieczór 43: Claude API generates ModConfig JSON

```
Create the mod generation endpoint that produces a complete ModConfig JSON.

Create src/shared/modConfig.ts:

export interface ModConfig {
  id: string
  name: string
  description: string
  createdBy: string      // player clerk_id
  createdAt: string
  monsterVariants: MonsterConfig[]
  foodVariants: Record<string, Partial<FoodItem>>
  newRecipes: CookingRecipe[]
  rules: Rule[]
}

Create src/app/api/forge/generate/route.ts:

POST /api/forge/generate
- Body: { description: string, answers: string[], language: 'pl' | 'en' }
- Calls Claude claude-sonnet-4-6 with a detailed system prompt:

system: `You are a game mod generator for Gameforge (2D survival multiplayer).
Generate a ModConfig JSON object with these fields:
- monsterVariants: array of MonsterConfig (use baseSprite 'orc' or 'skeleton',
  set tint as hex number, particleEffect from: fire|ice|poison|electric|shadow|holy)
- foodVariants: override food item stats (hungerRestore, hpRestore)
- newRecipes: CookingRecipe array (ingredients must be existing food item ids)
- rules: Rule array using RuleTrigger and RuleEffect types

Respond ONLY with valid JSON matching the ModConfig schema. No explanations.`

- Parse the JSON response. Validate it has the expected shape.
- Save to Supabase table 'mod_configs':
    CREATE TABLE mod_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID REFERENCES groups(id),
      created_by UUID REFERENCES players(id),
      config JSONB NOT NULL,
      status TEXT DEFAULT 'pending',  -- pending | approved | rejected
      votes INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    )
- Return: { modId, config }

In src/app/forge/page.tsx: show the generated ModConfig as formatted JSON + a human-readable
summary. Add a "Submit for vote" button (Wieczór 45).

Confirm when done and show me what was created.
```

---

### [x] Wieczór 44: Fork system — personal branch test (ZAIMPLEMENTOWANE, zmiany vs plan: maxClients=3 zamiast 1 — zapraszanie max 2 graczy do testu; system notyfikacji test_invite; NotificationBell; pokój tworzony przez HTTP matchmake, nie przez WS client.create)

```
Implement the ability for a player to test a mod locally before submitting to group vote.

CONCEPT: "Fork" = apply a ModConfig to a private Colyseus room for solo testing.
The player's group room is unaffected.

SERVER (server/src/index.ts):
1. Register a second room type 'test_room' that extends GameRoom:
   gameServer.define('test_room', TestRoom)

Create server/src/TestRoom.ts:
- Extends GameRoom.
- maxClients = 1 (solo testing only).
- In onCreate(options): after normal setup, if options.modConfig is provided,
  call this.ruleEngine.loadRules(options.modConfig.rules).
  Apply monster variants: for each variant in options.modConfig.monsterVariants,
  add a new EnemyState using the variant's config.
- Dispose the room after 30 minutes of inactivity (use this.clock.setTimeout).

CLIENT (src/app/forge/page.tsx):
1. "Test mod" button:
   - Connect to a 'test_room' with the ModConfig as join options:
       room = await client.create('test_room', { token, modConfig })
   - Redirect to /game?mode=test to launch the game in test mode.
2. In src/app/game/network/ColyseusClient.ts: detect mode=test from URL params,
   use 'test_room' instead of 'game_room'.
3. Show a banner in the game UI: "TEST MODE — modifications active. Not saved to group."

Confirm when done and show me what was created.
```

---

### [x] Wieczór 45: Submit modification to group vote (ZAIMPLEMENTOWANE, zmiany vs plan: submit przez REST API /api/forge/submit zamiast Colyseus message; player picker z zaproszeniami; ForgeNav + /forge/glosowanie — lista wszystkich submitted modów)

```
Implement the mod submission flow and real-time Colyseus broadcast.

SERVER (server/src/GameRoom.ts):
1. Add 'submit_mod' message handler:
   - Receives { modId: string }
   - Validates the player is a group member (use player.userId to look up group membership).
   - Updates mod_configs SET status = 'pending' WHERE id = modId.
   - Broadcasts to all room clients: this.broadcast('mod_submitted', { modId, name, description, createdBy: player.nickname })

2. Add 'vote_mod' message handler (placeholder, full impl in Wieczór 46):
   - Receives { modId, vote: 'heart' | 'skip' }
   - Log and acknowledge.

CLIENT (src/app/forge/page.tsx):
1. "Submit to group vote" button: send room.send('submit_mod', { modId }).

CLIENT (src/app/game/scenes/PlayScene.ts or UIScene.ts):
1. Listen for 'mod_submitted' broadcast:
   room.onMessage('mod_submitted', (data) => {
     // Show a notification popup: "New mod by [player]: [name]. Go to /forge/vote/[modId] to vote!"
   })
2. Create the notification as a Phaser container (slides in from top, auto-dismisses after 8s).
3. Clicking the notification opens /forge/vote/[modId] in a new tab.

Create src/app/forge/vote/[modId]/page.tsx:
- Shows mod name, description, author, and the generated JSON summary.
- "Cast heart vote" button (Wieczór 46 implements the full voting logic).

Confirm when done and show me what was created.
```

---

## TYDZIEŃ 9 — Voting and launch

### [x] Wieczór 46: Voting system

```
Implement the full voting system with max 3 hearts per week and hidden results.

DATABASE: Add to Supabase:
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id),
  mod_id UUID REFERENCES mod_configs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (player_id, mod_id)
);

Create src/app/api/forge/vote/route.ts:

POST /api/forge/vote
- Body: { modId: string }
- Requires authentication.
- Check how many votes the player cast this week:
    SELECT count(*) FROM votes WHERE player_id = :id AND created_at > now() - interval '7 days'
  If count >= 3: return 400 { error: "Weekly vote limit reached (3 hearts per week)" }
- Check not already voted on this mod.
- INSERT into votes.
- UPDATE mod_configs SET votes = votes + 1 WHERE id = modId.
- Return: { success: true, votesRemainingThisWeek: 3 - newCount }

Results are hidden until voting closes:
GET /api/forge/vote/results/[modId]
- Only accessible to group creators (check group_members.role = 'creator').
- Returns: { modId, totalVotes, status }

Create src/app/forge/vote/[modId]/page.tsx (update from Wieczór 45):
- Show the vote button. After voting: show "Vote cast! X hearts remaining this week."
- Do not show vote counts to regular members.
- Group creator sees a "Close vote & apply" button that calls Wieczór 47's endpoint.

Confirm when done and show me what was created.
```

---

### [x] Wieczór 47: Apply winning ModConfig to live room without restart (ZAIMPLEMENTOWANE, inne podejście niż plan: zamiast HTTP endpoint + INTERNAL_API_KEY → polling co 60s w GameRoom.onCreate; loadApprovedMods(groupId) z DB; GameRoom.applyMod() + RuleEngine.addRules(); broadcast mod_activated; brak potrzeby external trigger — pokój sam wykrywa nowe approved mody)

```
Apply a winning ModConfig to the live Colyseus room without disconnecting players.

SERVER (server/src/GameRoom.ts):
1. Add an HTTP endpoint (not a WebSocket message) for applying a mod.
   Use the WebSocketTransport express option in server/src/index.ts to add a route:

   app.post('/rooms/:roomId/apply-mod', async (req, res) => {
     const { roomId } = req.params
     const { modConfig, apiKey } = req.body
     // Validate apiKey === process.env.INTERNAL_API_KEY
     const room = matchMaker.getRoomById(roomId)  // check if this API exists in 0.17
     // If not, use: await matchMaker.remoteRoomCall(roomId, 'applyMod', [modConfig])
     res.json({ success: true })
   })

2. Add applyMod(modConfig: ModConfig) method to GameRoom:
   - Call this.ruleEngine.loadRules(modConfig.rules).
   - Apply monsterVariants: update existing EnemyState configId fields, spawn new variants.
   - Broadcast to all clients: this.broadcast('mod_applied', { name: modConfig.name })
   - Update the active mod in Supabase: mod_configs SET status = 'approved'.

CLIENT:
1. On 'mod_applied' broadcast: show a celebratory full-screen message for 3 seconds:
   "[Mod name] is now active! Good luck!" with a particle burst effect.
2. Re-fetch MonsterConfig and apply new tints/particles to existing enemy sprites.

Create src/app/api/forge/apply/route.ts (Next.js → calls the Colyseus HTTP endpoint):
- Validates the caller is a group creator.
- POSTs to the Colyseus server's /rooms/:roomId/apply-mod with INTERNAL_API_KEY.

Confirm when done and show me what was created.
```

---

### [x] T-COMBAT: Hybrid difficulty scaling + death/respawn system
DONE (Session 46 — 2026-03-29) — Pełny system walki: hybrydowe skalowanie trudności, śmierć/odrodzenie gracza, ochrona nowego gracza, strefy wrogów, moddowalna trudność.

**System trudności (hybrydowy):**
- Formuła: `(1 + groupDays × dayScaleFactor) × (1 + distanceZone × zoneScaleFactor)`, capped at maxDifficultyMultiplier (domyślnie 8×)
- 4 strefy na podstawie odległości od originu: [0–500px, 500–1500px, 1500–3000px, 3000px+]
- Poziomy trudności: Spokojnie / Niebezpiecznie / Groźnie / Śmiertelnie z kolorami
- `DifficultyBadge` w GameHeader: nazwa poziomu + pasek postępu do następnego
- GroupAgeDays ładowany przy onCreate, refresh co 60s z wykrywaniem level-up

**Śmierć i odrodzenie:**
- Model knockout: gracz upada (hp=0), ekran śmierci z 3s odliczaniem
- Upuszcza losowe przedmioty (NIE sprzęt) skalowane z poziomem trudności
- Odrodzenie przy najbliższym ognisku lub (0,0), z hp=50% maxHp
- Kara: -25% hunger, -20% sanity (konfigurowalnie)
- Broadcasty: `player_death`, `player_respawn` do wszystkich graczy w pokoju

**Ochrona nowego gracza:**
- Domyślnie 3 dni ochrony od dołączenia do grupy
- 50% redukcja obrażeń od wrogów przez ten okres
- Minimalna kara przy śmierci chronionych graczy
- Badge 🛡️ Ochrona w PlayerPanel z liczbą dni

**Strefy wrogów:**
- Strefa 0: tylko hunter; Strefa 1: hunter + fire_hunter; Strefa 2: fire_hunter + boss_hunter; Strefa 3: boss_hunter×2 + fire_hunter
- Bez nowych sprite'ów — Pixellab później; tint/scale/particles tworzą różnorodność wizualną
- Supabase: `ALTER TABLE group_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT now()`

**DifficultyOverrides (moddowalne):**
- Pola: dayScaleFactor, zoneScaleFactor, zoneBoundaries, maxDifficultyMultiplier, deathDropThresholds, respawnPenalty, difficultyLevels, newPlayerProtectionDays
- Zintegrowane z ModConfig — AI Forge może generować mody zmieniające mechaniki trudności

**Nowe pliki:**
- `server/src/difficultyConfig.ts` — mirror typów DifficultyOverrides dla serwera (tsconfig rootDir constraint)
- `docs/DESIGN_PROPOSALS.md` — propozycje T-COMBAT i T-GOALS z alternatywami

**Zaktualizowane pliki:**
- `src/shared/modConfig.ts` — DifficultyOverrides, DifficultyLevel, DEFAULT_DIFFICULTY_LEVELS, DEFAULT_DEATH_DROP_THRESHOLDS, rozszerzony trigger union
- `server/src/RuleEngine.ts` — nowe triggery: on_difficulty_increase, on_player_death, on_zone_enter; nowy efekt: modify_difficulty
- `server/src/GameRoom.ts` — pełna implementacja difficulty + death/respawn + zone spawning
- `server/src/db.ts` — getGroupAgeDays(), getPlayerJoinedGroupAt()
- `src/app/game/GameHeader.tsx` — DifficultyBadge z level name + progress bar
- `src/app/game/PlayerPanel.tsx` — badge ochrony nowego gracza
- `src/app/game/scenes/PlayScene.ts` — death overlay, zone toast, _checkZoneTransition()
- `src/app/api/forge/generate/route.ts` — rozszerzony SYSTEM_PROMPT o DifficultyOverrides

---

### [ ] Wieczór 48: Security audit

```
Perform a security audit and fix all critical issues.

Go through each area below and fix any vulnerabilities found:

1. SERVER-SIDE VALIDATION (server/src/GameRoom.ts):
   Review every message handler. For each one, verify:
   - Distance checks: player must be within range of target node/building/enemy.
   - Stat caps: damage <= 10, hunger/sanity clamped to [0, 100], hp clamped to [0, maxHp].
   - Inventory limits: player.inventory.length <= 20 before adding items.
   - No client-controlled IDs for new items (always generate on server with crypto.randomUUID()).
   - Rate limiting: no more than 10 messages per second per client. Add a per-client counter
     that resets every second; disconnect client if exceeded.

2. SUPABASE ROW LEVEL SECURITY (replace the permissive "allow all" policies from Wieczór 17):
   ALTER TABLE players ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "players_own" ON players FOR ALL USING (clerk_id = auth.jwt()->>'sub');

   ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "buildings_group" ON buildings FOR ALL USING (
     group_id IN (SELECT group_id FROM group_members WHERE player_id = (
       SELECT id FROM players WHERE clerk_id = auth.jwt()->>'sub'
     ))
   );
   Apply similar policies to resource_nodes, food_nodes, cooking_pots, votes.

3. API ROUTES (src/app/api/**):
   - Verify every route calls auth() from @clerk/nextjs/server and returns 401 if unauthenticated.
   - Add Zod validation schemas for all request bodies. Install: npm install zod
   - Sanitize all string inputs: trim whitespace, enforce max lengths.

4. ENVIRONMENT VARIABLES:
   - Verify SUPABASE_SERVICE_ROLE_KEY is NEVER sent to the client (no NEXT_PUBLIC_ prefix).
   - Verify CLERK_SECRET_KEY is NEVER sent to the client.
   - Verify INTERNAL_API_KEY (for mod apply) is set and validated.

List every issue found and every fix applied.
Confirm when done and show me the full list of changes.
```

---

### [x] Wieczór 49: Deploy frontend to Vercel + environment variables

```
Deploy the Next.js frontend to Vercel.

1. Push all changes to the main branch on GitHub:
   git add . && git commit -m "ready for deploy" && git push

2. Go to vercel.com, import the GitHub repo mazurekbartosz1-lgtm/Gameforge.
   - Set root directory to: . (project root, not server/)
   - Framework preset: Next.js
   - Build command: npm run build (default)
   - Output directory: .next (default)

3. Add all required environment variables in Vercel dashboard:
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   CLERK_SECRET_KEY
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ANTHROPIC_API_KEY
   NEXT_PUBLIC_COLYSEUS_URL  (set to the Railway server URL from Wieczór 3)
   INTERNAL_API_KEY

4. After deploy succeeds:
   - Update ARCHITECTURE.md with the Vercel URL.
   - In Clerk dashboard: add the Vercel URL to allowed redirect URLs.
   - In Supabase dashboard: add the Vercel URL to allowed CORS origins.
   - In Railway: add CORS_ORIGIN env var = the Vercel URL, update server/src/index.ts
     to use process.env.CORS_ORIGIN in WebSocketTransport cors config.

5. Test the deployed app:
   - Sign in via Clerk OTP.
   - Load /game — verify it connects to the Railway Colyseus server.
   - Move the player — verify movement syncs.

Confirm when done and show me the Vercel URL and test results.
```

---

### [ ] Wieczór 50: Pre-launch test with 2–3 real users + fix critical bugs

```
Conduct a pre-launch test session with 2–3 real users and fix critical bugs.

BEFORE THE TEST SESSION:
1. Create a test group via POST /api/groups and share the join link with 2 test users.
2. Ask them to: sign up, complete onboarding, join the game, play for 20 minutes.
3. Observe their screens or ask them to record using a screen recorder.

THINGS TO VERIFY DURING TEST:
- Onboarding flow completes without errors.
- Multiple players visible to each other with smooth movement.
- Harvesting trees/stones adds items to inventory.
- Eating food restores hunger.
- Building placement works (place a bonfire).
- Cooking on bonfire works.
- Day/night cycle visible in HUD.
- No JavaScript errors in browser console.
- Server does not crash (check Railway logs).

AFTER THE TEST SESSION — fix any critical bugs found. Priority order:
1. Crashes / server errors (P0)
2. Features completely broken (P1)
3. UI issues causing confusion (P2)

For each bug fixed, add a note to CLAUDE_HISTORY.md under a new Session 10 entry.

Finally, update CLAUDE_HISTORY.md Session 10 with:
- List of bugs found and fixed.
- Features confirmed working.
- Any remaining known issues.
- Next steps for post-launch (Week 11+).

Then commit: git add . && git commit -m "fix: pre-launch bugs from user testing" && git push

Confirm when done and show me the list of bugs found and fixed.
```

---

---

## Wieczóry 51–53 — Platform roles and safety

### [ ] Wieczór 51: Roles — guest vs verified vs group creator

```
Implement the three-tier role system: guest, verified, and group creator.

NOTE: Guest session already works via localStorage guestId passed directly to Colyseus.
Do NOT create a /api/auth/guest endpoint or HttpOnly cookie system — that's been superseded.

1. Add @type("string") role to PlayerState in server/src/GameRoom.ts.
   Set on join:
   - No Clerk token (guestId path) → role = 'guest'
   - Clerk token present, not group creator → role = 'verified'
   - Clerk token present + group_members.role = 'creator' for this groupId → role = 'creator'
   Load creator role from Supabase in onJoin() after loading player data:
     SELECT role FROM group_members WHERE player_id = :playerId AND group_id = :groupId

2. Enforce permissions in message handlers (server/src/GameRoom.ts):
   - Only 'creator' role can: reset group code (future), rollback last change (future).
   - Guests CAN harvest, move, eat — no restrictions on core gameplay.
   - Future: only 'verified' and 'creator' can submit mods and vote (Wieczór 45–46).

3. Show role badge in PlayerPanel (src/app/game/PlayerPanel.tsx):
   - 'creator': gold crown icon (👑 or text "CREATOR" with gold color #FFD700)
   - 'verified': cyan checkmark (✓ with color #00e3fd)
   - 'guest': no badge, just nickname
   Role comes from the gameStats window event (add role field to stats_update in PlayScene.ts).

4. Show other players' roles above their head in PlayScene.ts:
   - Remote player label: "[nickname] 👑" for creator, "[nickname] ✓" for verified, "[nickname]" for guest.
   - Update when player.role changes via room.state.players.onChange.

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 52: Onboarding — 3 steps

```
Create a 3-step onboarding flow for new users in Next.js.

Create src/app/onboarding/page.tsx.
This page is shown to any authenticated user who does not have a nickname set in Supabase
(players.nickname IS NULL or empty). Check this in middleware.ts and redirect.

Step 1 — Age gate:
- Question: "How old are you?"
- Three buttons: "Under 13", "13–17", "18+"
- Store selection in React state. If "Under 13": show message "Ask a parent or teacher
  to create your group" and stop the flow. Do not create a player record.

Step 2 — Group code:
- Question: "Do you have a group code?"
- Text input for code (format ABC-1234) + "Join group" button.
- "Skip — I'll join later" link.
- Validate the code via GET /api/groups/join — just check existence, don't join yet.
- Store groupId in state.

Step 3 — Nickname:
- Text input: "Choose a nickname (3–20 characters)"
- The nickname is sent to POST /api/players/setup:
    { nickname, ageGroup, groupCode }
  This API route: creates the player record in Supabase, joins the group if code provided,
  returns { playerId }.
- On success: redirect to /game?groupId=...

Add progress indicator (Step 1 of 3, Step 2 of 3, Step 3 of 3) at the top.
Style simply with Tailwind CSS.

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 53: Safety filter — Claude Haiku filters nicknames

```
Use Claude Haiku to filter nicknames and group descriptions for inappropriate content.

1. Install the Anthropic SDK in the Next.js project:
   npm install @anthropic-ai/sdk

2. Add to .env.local:
   ANTHROPIC_API_KEY=<your key>

3. Create src/lib/safetyFilter.ts:

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function isContentSafe(text: string, context: 'nickname' | 'description'): Promise<{
  safe: boolean
  reason?: string
}> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `You are a content moderator for a children's game (ages 10+).
Is this ${context} appropriate? Reply with JSON only: {"safe": true} or {"safe": false, "reason": "brief reason"}.
${context}: "${text}"`
    }]
  })
  const json = JSON.parse((response.content[0] as any).text)
  return json
}

4. Use safetyFilter in:
   - POST /api/players/setup (Wieczór 52): validate nickname before saving.
   - POST /api/groups (Wieczór 31): validate group name before saving.
   - Return 400 with { error: "Nickname not allowed", reason: "..." } if unsafe.

5. Add rate limiting: max 10 safety checks per IP per minute using a simple
   in-memory Map<string, { count, resetAt }> in src/lib/rateLimiter.ts.

Confirm when done and show me what was created.
```

---

---

## TYDZIEŃ 10 — Building and cooking

### [ ] Wieczór 54: BuildingConfig + build mode

```
Implement building placement with a green/red preview system.

Create src/shared/buildingConfig.ts:

export interface BuildingConfig {
  id: string
  name: string
  width: number   // in tiles
  height: number  // in tiles
  cost: Record<string, number>  // { wood: 5 }
  hp: number
  maxHp: number
  sprite: string  // path relative to /assets/
}

export const BUILDING_CONFIG: Record<string, BuildingConfig> = {
  wall_wood: { id: 'wall_wood', name: 'Wood Wall', width: 1, height: 1,
    cost: { wood: 2 }, hp: 50, maxHp: 50,
    sprite: 'Pixel Crawler - Free Pack 2.0.4/.../Structures/Wall_wood.png' },
  bonfire: { id: 'bonfire', name: 'Bonfire', width: 1, height: 1,
    cost: { wood: 5 }, hp: 30, maxHp: 30,
    sprite: 'Pixel Crawler - Free Pack 2.0.4/.../Structures/Bonfire.png' },
  cooking_pot: { id: 'cooking_pot', name: 'Cooking Pot', width: 1, height: 1,
    cost: { stone: 5 }, hp: 40, maxHp: 40,
    sprite: 'Pixel Crawler - Free Pack 2.0.4/.../Structures/Pot.png' },
}

Check public/assets/ASSETS_MAP.md for exact sprite paths; update to match real files.

CLIENT (src/app/game/scenes/PlayScene.ts):
1. Press B to enter build mode. A build menu (simple Phaser UI) shows available buildings.
2. On selecting a building: show a ghost sprite following the mouse cursor.
   - Green tint (setTint(0x00ff00)) if placement is valid (no collision with existing buildings/tiles).
   - Red tint (setTint(0xff0000)) if invalid.
3. On left-click: validate cost (check player.inventory), then send:
     room.send('place_building', { type, x, y })
4. Press Escape to exit build mode.

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 55: Buildings in world with collisions and HP

```
Render buildings from Colyseus WorldState and add physics collisions.

SERVER (server/src/GameRoom.ts):
1. Add 'place_building' message handler:
   - Validate player has required resources (check player.inventory).
   - Validate no existing building within 16px at that position.
   - Deduct resources from player.inventory.
   - Create a BuildingState and add to this.state.buildings.
   - Assign a unique id: crypto.randomUUID() (import crypto from 'node:crypto').

2. Add 'damage_building' message handler:
   - Receives { buildingId, damage }
   - Reduces building.hp by damage.
   - If hp <= 0: remove from this.state.buildings (buildings.delete(id)).

CLIENT (src/app/game/scenes/PlayScene.ts):
1. On room.state.buildings.onAdd(building):
   - Spawn a sprite at building.x, building.y with the correct sprite from BUILDING_CONFIG.
   - Add the sprite to a staticGroup for Arcade Physics:
       this.physics.add.staticGroup()
   - Add a collider between the player and the staticGroup.
2. On room.state.buildings.onRemove(building):
   - Remove the sprite and refresh the staticGroup.
3. Show an HP bar above each building sprite that updates on HP change.

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 56: Bonfire — basic cooking

```
Implement the Bonfire cooking station (no recipe system — just convert raw food to cooked).

SERVER (server/src/GameRoom.ts):
1. Add 'cook_bonfire' message handler:
   - Receives { buildingId, itemId }
   - Validate: building type === 'bonfire', player within 60px, item is cookable
     (FOOD_CONFIG[itemId].cookable === true).
   - Remove itemId x1 from player.inventory.
   - After FOOD_CONFIG[itemId].cookTimeMs / 2 ms (bonfire is faster — half time):
     push FOOD_CONFIG[itemId].cookResult into player.inventory.
   - Use this.clock.setTimeout() for the delay.
   - Broadcast 'cooking_started' event with { buildingId, itemId, playerId: client.sessionId }.

CLIENT:
1. When player presses E near a Bonfire:
   - Open a small UI (Phaser container) showing:
       "Cook what?" and a list of cookable items in player inventory.
   - On selecting an item: send room.send('cook_bonfire', { buildingId, itemId }).
2. On 'cooking_started' broadcast: play a fire particle effect on the bonfire sprite.
3. The cooked item automatically appears in inventory when done (inventory onChange fires).

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 57: ~~Crafting~~ — USUNIĘTY (na razie)

*Krafting (Workbench, Anvil, receptury craftingu) usunięty z planu na ten etap.*

---

### [ ] Wieczór 58: Save buildings to Supabase + load on room create

```
Persist buildings to Supabase and reload them when a Colyseus room is created.

SERVER (server/src/db.ts):
1. Add saveBuildings(buildings: MapSchema<BuildingState>, groupId: string):
   - UPSERT all buildings to the buildings table.
   - Use supabaseAdmin.from('buildings').upsert([...]).

2. Add loadBuildings(groupId: string): Promise<BuildingState[]>
   - SELECT * FROM buildings WHERE group_id = groupId.
   - Map rows to BuildingState objects.

3. Add deleteBuilding(buildingId: string):
   - DELETE FROM buildings WHERE id = buildingId.

SERVER (server/src/GameRoom.ts):
1. In onCreate(options): call loadBuildings(options.groupId ?? 'default').
   Populate this.state.buildings with loaded data.
   If no groupId, use a hardcoded default group UUID for development.

2. In the 'place_building' handler: after adding to state, call saveBuildings().
3. In the 'damage_building' handler: after removing from state, call deleteBuilding().

4. Add auto-save for buildings in the 60-second clock interval (alongside player saves).

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 59: Global session conflict detection (cross-room)

```
Currently the session conflict/takeover mechanism only works within a single Colyseus room.
If a user is in Room A and opens Room B, no conflict is detected. Fix this with a global registry.

SERVER — new file server/src/sessionRegistry.ts:

export interface ActiveSession {
  client: import("@colyseus/core").Client;
  sessionId: string;
  roomId: string;
  saveAndDisconnect: () => Promise<void>;
}

export const sessionRegistry = new Map<string, ActiveSession>();
// key: userId (clerk id or "guest_xxx")

SERVER — server/src/GameRoom.ts:

1. Import sessionRegistry from "./sessionRegistry.js".

2. In onJoin, after userId is determined (both auth + guest blocks):
   - Check sessionRegistry.get(userId) BEFORE the existing same-room stale check.
   - If found AND entry.roomId !== this.roomId (cross-room conflict):
     a. Copy player stats from DB state (not in-memory, since different room).
     b. Store in pendingTakeovers with crossRoom: true.
     c. client.send("session_conflict", {}).
     d. entry.client.send("session_incoming", {}).
     e. return (don't add to state.players).
   - If found AND entry.roomId === this.roomId: fall through to existing same-room logic.

3. After a successful join (at the end of onJoin, where session_ready is sent):
   sessionRegistry.set(userId, {
     client,
     sessionId: client.sessionId,
     roomId: this.roomId,
     saveAndDisconnect: async () => {
       const p = this.state.players.get(client.sessionId);
       if (p) await this._savePlayerState(p);
       client.leave(4001);
     }
   });

4. In confirm_takeover handler:
   - If pending.crossRoom === true:
     a. await pending.saveAndDisconnect() — saves old client to DB and kicks them.
     b. Load fresh player state from DB (same as a normal first join).
     c. Add player to state.players, send session_ready.
   - If pending.crossRoom === false: existing same-room behavior (copy in-memory state).

5. In onLeave:
   - const reg = sessionRegistry.get(userId for this client);
   - if (reg && reg.sessionId === client.sessionId) sessionRegistry.delete(userId);
   - This prevents deleting a registry entry that already belongs to the new session.

No frontend changes needed — PhaserGame.tsx and PlayScene.ts already handle
session_conflict / session_incoming / session_taken_over / session_ready correctly.

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 60: MonsterConfig v2 — data-driven enemy AI

```
Rewrite enemy AI to be fully data-driven via MonsterConfig. Currently tickEnemyAI and
tickEnemyMovement have hardcoded logic. This wieczór makes enemy behavior configurable
per variant — enabling rule-driven AI modifications in the future.

═══ PART 1: Extend MonsterConfig ═══

In server/src/monsterConfig.ts AND src/app/game/monsterConfig.ts, add to MonsterConfig:

  // Movement & combat params
  moveSpeed?: number          // default: ENEMY_SPEED constant (currently ~80)
  visionRange?: number        // tiles — default: 10
  attackRange?: number        // px — default: ATTACK_RANGE constant
  fleeThreshold?: number      // 0–1, flee when hp/maxHp < this — default: 0 (never flees)

  // Behavior mode
  behavior?: 'aggressive' | 'passive' | 'patrol' | 'coward'
  // aggressive (default): always chases nearest player in visionRange
  // passive: only attacks if attacked first (track damagedBy Set per enemy)
  // patrol: random walk when no player in range, chase when player enters visionRange
  // coward: flees from players (inverse of aggressive)

Update existing variants with explicit values (use current hardcoded constants as defaults
so behavior is identical to before — no gameplay change unless config is modified):
  hunter: behavior:'aggressive', moveSpeed:80, visionRange:10, fleeThreshold:0
  fire_hunter: behavior:'aggressive', moveSpeed:90, visionRange:12, fleeThreshold:0
  boss_hunter: behavior:'aggressive', moveSpeed:60, visionRange:14, fleeThreshold:0.15

═══ PART 2: Refactor tickEnemyAI in GameRoom.ts ═══

Replace hardcoded logic with config-driven behavior:

function tickEnemyAI(enemy: EnemyState, config: MonsterConfig, players: MapSchema<PlayerState>) {
  switch (config.behavior ?? 'aggressive') {
    case 'aggressive': chaseNearest(enemy, config, players); break
    case 'passive':    if (enemy.damagedBy?.size > 0) chaseNearest(enemy, config, players); break
    case 'patrol':     patrolOrChase(enemy, config, players); break
    case 'coward':     fleeFromNearest(enemy, config, players); break
  }
  if (config.fleeThreshold && enemy.hp / enemy.maxHp < config.fleeThreshold) {
    fleeFromNearest(enemy, config, players)
  }
}

Extract helpers: chaseNearest, patrolOrChase, fleeFromNearest.
Use config.moveSpeed instead of ENEMY_SPEED, config.visionRange instead of hardcoded tiles,
config.attackRange instead of ATTACK_RANGE constant.

Add damagedBy: Set<string> to in-memory enemy tracking (not in schema — no sync needed).
Populate it in the attack_enemy handler: enemyDamagedBy.get(enemyId)?.add(attackerSessionId).

═══ PART 3: patrol behavior ═══

patrolOrChase: if no player within visionRange → move toward patrolTarget (random point
within 5 tiles of spawn position). When patrolTarget reached, pick new random patrolTarget.
Store patrolTarget per enemy in a Map<string, {x,y}> in GameRoom (in-memory).

═══ PART 4: Verify no gameplay regression ═══

All existing variants use 'aggressive' behavior with same speed/range as before.
Run the game and confirm enemies behave identically to pre-W60 for hunter/fire_hunter/boss_hunter.
Then manually test: add a temporary 'patrol' skeleton variant in MONSTER_CONFIG and verify patrol.

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 61: Pixellab sprite generation — player character (walk + death, 8 directions)

```
Generate custom pixel art player sprites using the Pixellab API to replace the
current Body_A sprite sheet from Pixel Crawler.

Read these files first:
- src/app/game/scenes/PlayScene.ts — how Body_A is loaded and animated
- public/assets/ASSETS_MAP.md — current sprite sheet dimensions
- src/app/game/animations/ or PlayScene anim definitions — existing anim keys

═══ PART 1: Setup Pixellab client ═══

Install the Pixellab Python SDK:
  pip install pixellab pillow

Create `scripts/generate_player_sprites.py` — standalone Python script
(not part of Next.js build, run manually from repo root).

The script uses:
  PIXELLAB_API_KEY — read from .env.local (or env var)
  client = pixellab.Client(secret=API_KEY)

Target sprite size: 64×64 px per frame
Output directory: public/assets/generated/player/

═══ PART 2: Generate base character ═══

Use `client.generate_image_pixflux()` to generate a single base character frame:
  description: "pixel art top-down RPG human adventurer, brown leather armor,
                holding sword, neutral idle pose, transparent background"
  image_size: {width: 64, height: 64}
  view: "high top-down"
  direction: "south"
  no_background: True
  shading: "basic shading"
  detail: "medium detail"

Save the result as `public/assets/generated/player/base_south.png`.

═══ PART 3: Rotate to 8 directions ═══

Use `client.rotate()` to generate all 8 directions from the base south frame:
  directions: ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"]
  from_direction: "south"
  to_direction: <each>
  view: "high top-down"
  image_size: {width: 64, height: 64}

Save each as `base_{direction}.png` (e.g. base_north.png, base_north-east.png...).
Use the same seed for all rotations for visual consistency.

═══ PART 4: Generate walk animation — 8 directions ═══

For each of the 8 directions, call `client.animate_with_text()`:
  action: "walk"
  n_frames: 8  (model generates 4 frames per call — make 2 calls per direction:
                 call A: start_frame_index=0, call B: start_frame_index=4)
  view: "high top-down"
  direction: <current direction>
  reference_image: base_{direction}.png
  image_size: {width: 64, height: 64}

Assemble the 8 frames into a single horizontal sprite sheet PNG:
  walk_{direction}.png — 512×64 px (8 frames × 64px wide)

Save all 8 to public/assets/generated/player/walk/.

═══ PART 5: Generate death animation — 8 directions ═══

Same as walk but action: "death" with n_frames: 6 (single call, start_frame_index=0).
Assemble into death_{direction}.png — 384×64 px (6 frames × 64px wide).
Save to public/assets/generated/player/death/.

═══ PART 6: Load in Phaser (smoke test) ═══

In PlayScene.ts, add a temporary preload for walk_south.png and death_south.png
at frameWidth=64, frameHeight=64. Add a temp animation key "player_walk_south"
and verify it plays correctly in the browser before proceeding to W62.

DO NOT yet replace the main Body_A player sprite — only load the new sheets
alongside existing ones and test one animation in isolation.

Confirm when done. Show the directory tree of public/assets/generated/player/
and the approximate API credit cost (log usage.usd per call).
```

---

### [ ] Wieczór 62: Pixellab sprite generation — player attack animations (sword/axe/pickaxe) + full Phaser integration

```
Generate the remaining player animations and replace Body_A entirely in PlayScene.

Read these files first:
- src/app/game/scenes/PlayScene.ts — all existing animation keys and preload calls
- public/assets/generated/player/ — output from W61

═══ PART 1: Generate attack animations — 8 directions × 3 action types ═══

For each direction × action, call client.animate_with_text():
  actions: ["sword attack", "axe swing", "pickaxe hit"]
  n_frames: 6 per action (single call per direction per action)
  view: "high top-down"
  reference_image: base_{direction}.png (from W61)
  image_size: {width: 64, height: 64}

Total calls: 8 directions × 3 actions = 24 animate_with_text calls.

Output:
  public/assets/generated/player/sword/sword_{direction}.png  — 384×64
  public/assets/generated/player/axe/axe_{direction}.png      — 384×64
  public/assets/generated/player/pickaxe/pickaxe_{direction}.png — 384×64

═══ PART 2: Replace Body_A in PlayScene.ts ═══

Map Pixellab direction names → game directions:
  "south"      → facing down  (was "down" in Body_A)
  "north"      → facing up
  "east"       → facing right
  "west"       → facing left
  "south-east" → diagonal
  ... etc.

Update PlayScene.ts:
- Remove Body_A preload, replace with preload of all generated sheets
  (walk × 8, sword × 8, axe × 8, pickaxe × 8, death × 8 = 40 sprite sheets)
- Update all animation definitions:
    "player_walk_south"    → walk/walk_south.png, frames 0–7, repeat -1
    "player_sword_south"   → sword/sword_south.png, frames 0–5, repeat 0
    ... (all 40 combos)
- Update `playAnim(direction, action)` lookup table — maps current 4-dir system
  (up/down/left/right) to new 8-dir system; diagonals used when moving at 45°
  (check both X and Y velocity components for diagonal detection)
- Update `PLAYER_HW`/`PLAYER_HH` if needed for 64px frame size

═══ PART 3: Diagonal movement detection ═══

In PlayScene update loop, when both X and Y velocity are non-zero,
pick the closest cardinal/diagonal direction from 8 options.
Example: moving right+down → "south-east".

This enables full 8-directional animation playback.

═══ PART 4: Browser test ═══

Verify in browser:
- Walk in all 8 directions — correct animation plays
- Attack with sword/axe/pickaxe — correct animation + returns to walk after
- Death — plays once on HP=0, character freezes on last frame

Confirm when done. List any visual glitches.
```

---

### [ ] Wieczór 63: Pixellab sprite generation — monsters (orc + skeleton, walk + attack, 8 directions)

```
Generate monster sprites to replace hunter/enemy sprites in PlayScene.

Read these files first:
- src/app/game/scenes/PlayScene.ts — createEnemySprites(), addEnemy(), EnemyData interface
- server/src/monsterConfig.ts — MONSTER_CONFIG variants (hunter, fire_hunter, boss_hunter)
- public/assets/generated/player/base_south.png — use as style reference for consistent art style

═══ PART 1: Generate orc base sprites ═══

Generate 2 base orc characters (normal + boss variant) using generate_image_pixflux():
  orc_base: "pixel art top-down RPG orc warrior, green skin, leather armor, aggressive pose,
             transparent background, consistent with existing player art style"
  orc_boss: same but "large orc, red armor, glowing eyes, scarred face"

Both at 64×64, view: "high top-down", direction: "south", no_background: True.
Rotate both to all 8 directions (16 rotate calls total).
Save to public/assets/generated/enemies/orc/.

═══ PART 2: Generate skeleton base sprites ═══

skeleton_base: "pixel art top-down RPG skeleton warrior, white bones, wielding sword,
               transparent background"
At 64×64, rotate to 8 directions.
Save to public/assets/generated/enemies/skeleton/.

═══ PART 3: Generate enemy animations ═══

For each monster type (orc_base, orc_boss, skeleton_base) × each direction:
  - walk: animate_with_text action="walk", n_frames=6
  - attack: animate_with_text action="melee attack", n_frames=6

Total: 3 types × 8 directions × 2 actions = 48 animate_with_text calls.

Save:
  public/assets/generated/enemies/{type}/walk/walk_{direction}.png  — 384×64
  public/assets/generated/enemies/{type}/attack/attack_{direction}.png — 384×64

═══ PART 4: Update enemy rendering in PlayScene.ts ═══

Update createEnemySprites() to load the appropriate sprite sheet based on
enemy.configId from MONSTER_CONFIG:
  "hunter"      → orc_base sprites
  "fire_hunter" → orc_base sprites with Phaser setTint(0xff4400) (keep tint system)
  "boss_hunter" → orc_boss sprites

Remove the hardcoded Body_A enemy sprite.
Update addEnemy() and all enemy animation keys similarly to W62 player update.

Enemy AI direction:
  Enemy velocity vector → closest of 8 directions → play walk_{direction}
  On attack → play attack_{direction} once, then resume walk

═══ PART 5: Browser test ═══

Verify:
- Orc enemies walk toward player with correct directional animation
- On attack range, attack animation plays
- Boss uses larger orc_boss sprite
- Tint still works on fire_hunter variant

Confirm when done. Note approximate total API credit cost for W61+W62+W63.
```

---

*End of plan. Total: 63 evenings across ~11 weeks.*
