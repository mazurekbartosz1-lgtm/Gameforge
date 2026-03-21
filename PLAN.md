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

### [~] Wieczór 3: Colyseus Hello World + Railway deploy
*In progress — blocked by Railway outage.*

```
The Colyseus game server in server/ is ready to deploy to Railway but the deploy
is blocked by a Railway outage. When Railway is back online:

1. Go to railway.app, create a new project, and connect the GitHub repo
   mazurekbartosz1-lgtm/Gameforge.
2. Set the root directory to server/ in Railway project settings.
3. Add environment variable: PORT=2567
4. Railway will run: npm install && npm run build && node dist/index.js
   (as configured in server/railway.json and server/Procfile).
5. After deploy succeeds, copy the public Railway URL (e.g. https://gameforge-server-xxx.railway.app).
6. In server/src/index.ts add a GET /health endpoint that returns { status: "ok", room: "game_room" }.
   Use the WebSocketTransport's express option to register the route.
7. Verify the health endpoint responds at https://<railway-url>/health.
8. Update ARCHITECTURE.md — replace "Deployment target: Railway" with the actual Railway URL.

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 4: Phaser in Next.js + first Pixel Crawler sprite

```
Install Phaser 3 in the Next.js project (root package.json, not server/):
  npm install phaser

Then create src/app/game/page.tsx — a Next.js page that hosts a Phaser 3 game canvas.

Requirements:
- The page must dynamically import Phaser (Next.js SSR is incompatible with Phaser's
  window references). Use:
    const Phaser = await import('phaser')
  inside a useEffect, or use next/dynamic with ssr: false on a GameCanvas component.
- Create src/app/game/GameCanvas.tsx — a client component ('use client') that:
  1. Mounts a Phaser.Game inside a useEffect on a <div ref={containerRef}>.
  2. Destroys the game in the useEffect cleanup.
  3. Configures the game: width 800, height 600, renderer Phaser.AUTO,
     backgroundColor '#1a1a2e', parent the container div.
- Create a Phaser Scene called BootScene in src/app/game/scenes/BootScene.ts:
  1. In preload(), load the sprite sheet from:
       public/assets/Pixel Crawler - Free Pack 2.0.4/Pixel Crawler - Free Pack 2.0.4/Characters/Body_A/Body_A.png
     Use this.load.spritesheet('body_a', '/assets/Pixel Crawler - Free Pack 2.0.4/Pixel Crawler - Free Pack 2.0.4/Characters/Body_A/Body_A.png', { frameWidth: 16, frameHeight: 16 })
  2. In create(), add the sprite to the center of the scene at scale 4 (so 16px → 64px).
  3. Create an animation 'idle_down' using frames 0–3 at frameRate 8, repeat -1.
  4. Play the animation on the sprite.
- Navigate to /game in the browser to verify the sprite animates.

Confirm when done and show me what was created.
```

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

### [ ] Wieczór 15: Camera following player + map bounds

```
Polish the camera behavior in src/app/game/scenes/PlayScene.ts.

1. Camera follow with deadzone:
   - this.cameras.main.startFollow(playerSprite, true, 0.1, 0.1)
     (lerp values 0.1 give smooth following)
   - Set a deadzone of 80x60 pixels so the camera only moves when the player
     reaches the edge of the deadzone:
       this.cameras.main.setDeadzone(80, 60)

2. Camera bounds must match map size (already set in Wieczór 12 — verify it works
   so the camera does not scroll beyond the map edge).

3. Add a minimap:
   - Create a second camera (this.cameras.add) at position x:10, y:10, width:150, height:150.
   - Set its zoom to 0.15 (shows the whole 100x100 map at once).
   - Set its background color to #111111.
   - It should NOT follow the player — always show the full map.
   - Draw a small red dot (Graphics object, depth 200) at the player's world position
     to show location on the minimap. Update it in update().
   - Ignore UI elements on the minimap camera by setting layer ignore lists.

4. On mobile (detect via this.sys.game.device.os.android || .iOS):
   - Add virtual joystick using a simple touch drag: track touchstart and touchmove,
     compute direction vector, apply as movement input.

Confirm when done and show me what was created.
```

---

## TYDZIEŃ 4 — Auth and persistence

### [ ] Wieczór 16: Clerk passwordless OTP setup in Next.js

```
Set up Clerk authentication with passwordless OTP (email code) in the Next.js app.

1. Install Clerk:
   npm install @clerk/nextjs

2. Add environment variables to .env.local:
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your key from clerk.com dashboard>
   CLERK_SECRET_KEY=<your secret key>
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/game
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/game

3. Wrap the app in ClerkProvider in src/app/layout.tsx.

4. Create src/middleware.ts using Clerk's clerkMiddleware():
   - Public routes: '/', '/sign-in', '/sign-up', '/join/(.*)'
   - All other routes require authentication.

5. Create src/app/sign-in/[[...sign-in]]/page.tsx using <SignIn /> component.
   Create src/app/sign-up/[[...sign-up]]/page.tsx using <SignUp /> component.

6. In Clerk dashboard:
   - Disable all social login providers.
   - Enable "Email OTP" (one-time passcode) as the only sign-in method.
   - Set OTP expiry to 10 minutes.

7. Update the home page (src/app/page.tsx) to show:
   - If signed in: a "Play" button linking to /game and a "Sign out" button.
   - If signed out: a "Sign in" button linking to /sign-in.
   Use Clerk's useUser() and SignOutButton components.

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 17: Supabase tables setup

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

### [ ] Wieczór 18: Pass Clerk JWT token to Colyseus

```
Pass the Clerk JWT token from the Next.js frontend to the Colyseus server so the
server can identify authenticated players.

CLIENT (src/app/game/network/ColyseusClient.ts):
1. Import useAuth from @clerk/nextjs.
2. Before joining the room, get the JWT token:
     const { getToken } = useAuth()
     const token = await getToken()
3. Pass the token in the room join options:
     room = await client.joinOrCreate('game_room', { token, nickname })

SERVER (server/src/GameRoom.ts):
1. Install the Clerk SDK in server/:
     cd server && npm install @clerk/backend
2. In onJoin(), extract and verify the token:
     import { createClerkClient } from '@clerk/backend'
     const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
     const payload = await clerk.verifyToken(options.token)
     const clerkId = payload.sub
3. Set player.userId = clerkId on the PlayerState.
4. If token is missing or invalid: kick the client with client.leave(4001).
5. Add CLERK_SECRET_KEY to server/.env.example.

Add server/.env to .gitignore if not already present (it is — verify).

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 19: Load player state on join from Supabase

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

### [ ] Wieczór 20: Save player state on leave + auto-save every 60s

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

### [ ] Wieczór 21: Harvest system

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

### [ ] Wieczór 22: Food items config

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

### [ ] Wieczór 23: Inventory UI 4×5 grid + eat action

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

### [ ] Wieczór 24: Enemy drop system

```
Implement enemies and item drops.

SERVER (server/src/GameRoom.ts):
1. In onCreate(), spawn 5 Orc enemies in this.state.enemies:
   EnemyState: type "orc", hp 30, maxHp 30, isAlive true, animKey "idle"
   Place them at hardcoded positions away from the player spawn.

2. Add a 'attack_enemy' message handler:
   - Receives { enemyId: string, damage: number }
   - Validate player is within 60px of enemy.
   - Validate damage <= 10 (cap to prevent cheating).
   - Reduce enemy.hp by damage.
   - If enemy.hp <= 0:
       Set enemy.isAlive = false.
       Drop raw_meat x1 into the attacking player's inventory.
       Schedule respawn: after 120_000ms set enemy.hp = enemy.maxHp, enemy.isAlive = true.
       Send a 'enemy_death' event broadcast: this.broadcast('enemy_death', { enemyId, x: enemy.x, y: enemy.y })

CLIENT:
1. On room.state.enemies.onAdd: spawn Orc sprite using the enemy sprite sheet from:
   public/assets/Pixel Crawler - Free Pack 2.0.4/.../Enemies/Orc/ (check ASSETS_MAP.md for exact path)
   Create idle and walk animations for the Orc.
2. On onChange: hide if isAlive = false, show if true.
3. When player presses SPACE near an Orc (within 60px):
   Send room.send('attack_enemy', { enemyId, damage: 10 }).
   Play 'attack_slice' animation on toolSprite.
4. On 'enemy_death' broadcast: spawn a death particle effect (use Phaser particles
   with a simple circle texture, red color, burst of 10 particles).

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 25: Survival mechanics HUD

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

## TYDZIEŃ 6 — Building and crafting

### [ ] Wieczór 26: BuildingConfig + build mode

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
  workbench: { id: 'workbench', name: 'Workbench', width: 2, height: 1,
    cost: { wood: 8 }, hp: 60, maxHp: 60,
    sprite: 'Pixel Crawler - Free Pack 2.0.4/.../Structures/Workbench.png' },
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

### [ ] Wieczór 27: Buildings in world with collisions and HP

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

### [ ] Wieczór 28: Bonfire — basic cooking

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

### [ ] Wieczór 29: Crafting UI at Workbench and Anvil

```
Implement crafting recipes and the crafting UI at the Workbench.

Create src/shared/craftingConfig.ts:

export interface CraftingRecipe {
  id: string
  name: string
  station: 'workbench' | 'anvil'
  inputs: Record<string, number>   // { wood: 3, stone: 1 }
  output: string                   // item id
  outputQty: number
  craftTimeMs: number
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  { id: 'axe', name: 'Axe', station: 'workbench',
    inputs: { wood: 3, stone: 2 }, output: 'axe', outputQty: 1, craftTimeMs: 5_000 },
  { id: 'pickaxe', name: 'Pickaxe', station: 'workbench',
    inputs: { wood: 2, stone: 3 }, output: 'pickaxe', outputQty: 1, craftTimeMs: 5_000 },
  { id: 'cooking_pot', name: 'Cooking Pot', station: 'workbench',
    inputs: { stone: 5 }, output: 'cooking_pot_item', outputQty: 1, craftTimeMs: 8_000 },
]

SERVER (server/src/GameRoom.ts):
1. Add 'craft' message handler:
   - Receives { recipeId, buildingId }
   - Validate: player near building, building type matches recipe.station.
   - Validate: player.inventory has all inputs.
   - Deduct inputs from inventory.
   - After craftTimeMs: push output × outputQty to player.inventory.
   - Use this.clock.setTimeout().

CLIENT:
1. When player presses E near a Workbench:
   - Open a crafting UI showing all workbench recipes.
   - Each recipe row: icon, name, required materials (green if available, red if not),
     craft button (disabled if materials missing).
   - On click: send room.send('craft', { recipeId, buildingId }).
   - Show a progress bar that fills over craftTimeMs.

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 29b: Cooking Pot — full recipe system

```
Implement the Cooking Pot with a 2-ingredient slot system and timer.

The CookingPotState schema already exists in server/src/GameRoom.ts with fields:
slot1, slot2, currentRecipe, cookingUntil, isReady, result.

Create src/shared/cookingRecipes.ts:

export interface CookingRecipe {
  id: string
  ingredients: [string, string]  // exactly 2 item ids (order does not matter)
  result: string
  cookTimeMs: number
  hungerBonus: number            // extra hunger on top of base food value
  hpBonus: number
}

export const COOKING_RECIPES: CookingRecipe[] = [
  { id: 'meat_mushroom_stew', ingredients: ['cooked_meat', 'mushroom'],
    result: 'stew', cookTimeMs: 20_000, hungerBonus: 20, hpBonus: 15 },
  { id: 'berry_mushroom_tea', ingredients: ['berries', 'mushroom'],
    result: 'herbal_tea', cookTimeMs: 15_000, hungerBonus: 10, hpBonus: 20 },
]

SERVER (server/src/GameRoom.ts):
1. Add 'pot_add_ingredient' handler: places item into slot1 or slot2 of the CookingPotState.
2. Add 'pot_start_cooking' handler:
   - Match slot1 + slot2 against COOKING_RECIPES (order-insensitive).
   - If match found: set currentRecipe, cookingUntil = Date.now() + cookTimeMs.
   - In the tick loop (or clock.setTimeout): when cookingUntil is reached,
     set isReady = true, result = recipe.result.
3. Add 'pot_collect' handler: move result to player.inventory, reset pot state.

CLIENT:
1. E near Cooking Pot opens a UI showing both ingredient slots and a cook button.
2. Show countdown timer while cooking.
3. When isReady: show "Ready!" and a collect button.

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 30: Save buildings to Supabase + load on room create

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

## TYDZIEŃ 7 — GameForge platform

### [ ] Wieczór 31: Group creation API

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

### [ ] Wieczór 32: Join by link + join by code on start screen

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

### [ ] Wieczór 33: Roles — guest vs verified vs group creator

```
Implement the three-tier role system: guest, verified, and group creator.

1. Guest users (not signed in via Clerk):
   - Create src/app/api/auth/guest/route.ts:
     POST /api/auth/guest — creates a temporary player record in Supabase
     with clerk_id = 'guest_' + nanoid(), sets a 7-day HttpOnly cookie 'guestId'.
   - In ColyseusClient.ts: if no Clerk token available, call this endpoint to get
     a guest token, pass it as { guestToken } in room options.
   - In server/src/GameRoom.ts onJoin(): handle guestToken case —
     look up the player by the guest ID stored in the cookie/token.
     Set player role = 'guest' on a new field: add @type("string") role to PlayerState.

2. Verified users (signed in via Clerk): role = 'verified'.

3. Group creator: role = 'creator' (from group_members.role in Supabase).
   Load the role in onJoin() when loading player data.

4. Enforce permissions in message handlers:
   - 'place_building': guests can place, verified can place, creator can place.
   - Future: only creator/verified can vote (Wieczór 46).

5. In the UI (UIScene): show a small role badge next to the nickname
   (crown icon for creator, checkmark for verified, no badge for guest).

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 34: Onboarding — 3 steps

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

### [ ] Wieczór 35: Safety filter — Claude Haiku filters nicknames

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
   - POST /api/players/setup (Wieczór 34): validate nickname before saving.
   - POST /api/groups (Wieczór 31): validate group name before saving.
   - Return 400 with { error: "Nickname not allowed", reason: "..." } if unsafe.

5. Add rate limiting: max 10 safety checks per IP per minute using a simple
   in-memory Map<string, { count, resetAt }> in src/lib/rateLimiter.ts.

Confirm when done and show me what was created.
```

---

## TYDZIEŃ 8 — Visual variants and RuleEngine

### [ ] Wieczór 36: Monster tint system

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

### [ ] Wieczór 37: 6 particle effect presets

```
Create 6 reusable particle effect presets in src/app/game/effects/particles.ts.

Use Phaser 3's built-in particle system (this.add.particles or scene.add.particles).
Note: In Phaser 3.60+ the API is scene.add.particles(x, y, texture, config).

Create a ParticleManager class with method:
  playEffect(scene: Phaser.Scene, preset: ParticlePreset, x: number, y: number, followTarget?: Phaser.GameObjects.Sprite): Phaser.GameObjects.Particles.ParticleEmitter

Presets (ParticlePreset type = 'fire' | 'ice' | 'poison' | 'electric' | 'shadow' | 'holy'):

fire:
  - texture: small orange/red circle (use Phaser.GameObjects.Graphics to create a 4px circle)
  - tint: [0xff4400, 0xff8800]
  - speed: { min: 20, max: 60 }, angle: { min: 250, max: 290 } (upward)
  - lifespan: 600, scale: { start: 0.5, end: 0 }, quantity: 3, frequency: 100

ice:
  - tint: [0x88ddff, 0xffffff], speed: { min: 10, max: 30 }
  - lifespan: 800, scale: { start: 0.3, end: 0 }, quantity: 2

poison:
  - tint: [0x44ff44, 0x228822], angle: { min: 0, max: 360 }
  - lifespan: 1000, scale: { start: 0.4, end: 0 }, quantity: 1, frequency: 200

electric:
  - tint: [0xffff00, 0x8888ff], speed: { min: 50, max: 100 }
  - lifespan: 200, scale: { start: 0.6, end: 0 }, quantity: 5, frequency: 50

shadow:
  - tint: [0x440044, 0x220022], speed: { min: 5, max: 20 }
  - lifespan: 1500, scale: { start: 0.5, end: 0.1 }, quantity: 1

holy:
  - tint: [0xffffaa, 0xffffff], angle: { min: 0, max: 360 }
  - lifespan: 1000, scale: { start: 0.3, end: 0.8 }, quantity: 2

All presets: if followTarget is provided, update the emitter position in PlayScene.update().

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 38: RuleEngine in Colyseus

```
Implement a RuleEngine in the Colyseus server that evaluates declarative rules every tick.

Create server/src/RuleEngine.ts:

export interface Rule {
  id: string
  trigger: RuleTrigger
  conditions: RuleCondition[]
  effects: RuleEffect[]
}

export type RuleTrigger =
  | 'on_tick'          // evaluated every server tick
  | 'on_eat'           // when a player eats an item
  | 'on_cook'          // when cooking completes
  | 'on_hunger_low'    // when player.hunger < 20
  | 'on_enemy_death'   // when an enemy dies
  | 'on_player_join'

export interface RuleCondition {
  field: string        // e.g. 'player.hunger', 'world.isNight', 'item.type'
  operator: '<' | '>' | '==' | '!=' | 'includes'
  value: string | number | boolean
}

export interface RuleEffect {
  action: 'modify_stat' | 'add_item' | 'spawn_enemy' | 'broadcast_message' | 'set_weather'
  target: string       // e.g. 'player', 'world'
  field?: string
  value?: string | number
}

export class RuleEngine {
  private rules: Rule[] = []

  loadRules(rules: Rule[]) { this.rules = rules }

  evaluate(trigger: RuleTrigger, context: RuleContext): RuleEffect[] {
    // Filter rules by trigger, evaluate conditions against context, return effects
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
3. Call ruleEngine.evaluate('on_tick', { world: this.state }) in the tick loop.
4. Apply returned effects to the world state.
5. Expose a method applyModRules(rules: Rule[]) that replaces active rules —
   used in Wieczór 47 for live mod application.

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 39: Rule triggers for food

```
Add food-related rule triggers to the RuleEngine.

In server/src/GameRoom.ts, fire rule triggers at the appropriate moments:

1. 'on_eat' trigger — fire in the 'eat' message handler after applying base food values:
   ruleEngine.evaluate('on_eat', { player, item: { type: itemId, id: itemId } })
   Apply effects: if effect.action === 'modify_stat' and effect.target === 'player':
     player[effect.field] = Math.max(0, Math.min(100, player[effect.field] + effect.value))

2. 'on_cook' trigger — fire in cook_bonfire and pot_collect handlers:
   ruleEngine.evaluate('on_cook', { player, item: { type: result } })

3. 'on_hunger_low' trigger — fire in tick() when player.hunger < 20:
   ruleEngine.evaluate('on_hunger_low', { player, world: this.state })
   (Only fire once per player per minute — add a Map<sessionId, lastFiredAt> throttle.)

Write 3 example Rule objects in server/src/defaultRules.ts to test the engine:

Rule 1: on_eat cooked_meat → add_item 'bone' (10% chance — add a condition: random < 0.1)
Rule 2: on_hunger_low → broadcast_message "You are starving!"
Rule 3: on_tick (world.isNight) → modify_stat player.sanity -= 0.1 per tick
  (this overlaps with base sanity drain — demonstrate stacking)

Load defaultRules in GameRoom.onCreate().

Confirm when done and show me what was created.
```

---

### [ ] Wieczór 40: Visual variant system test

```
Create 5 monster variants from 2 base sprites to test the full MonsterConfig + tint system.

The 2 base sprites are:
- 'orc' — from public/assets/Pixel Crawler - Free Pack 2.0.4/.../Enemies/Orc/ (check ASSETS_MAP.md)
- 'skeleton' — from public/assets/Pixel Crawler - Cemetery 0.4/.../Enemies/ (check ASSETS_MAP.md)

Add these 5 variants to MONSTER_CONFIG in src/shared/monsterConfig.ts:

1. orc (already exists — base variant, no tint)
2. fire_orc — baseSprite: 'orc', tint: 0xff4400, particleEffect: 'fire', hp: 40
3. ice_orc — baseSprite: 'orc', tint: 0x88ddff, particleEffect: 'ice', hp: 35, damage: 4
4. skeleton (base) — baseSprite: 'skeleton', tint: 0xffffff, hp: 20, damage: 3,
   dropTable: [{ item: 'bone', chance: 0.8, qty: 1 }]
5. shadow_skeleton — baseSprite: 'skeleton', tint: 0x330033, particleEffect: 'shadow',
   hp: 25, damage: 6, dropTable: [{ item: 'bone', chance: 1, qty: 2 }]

SERVER: in onCreate(), spawn one of each variant (5 enemies total) at different positions.

CLIENT: ensure the Phaser sprite correctly:
- Loads both base sprite sheets.
- Applies tint and scale from config.
- Starts the correct particle effect.
- Shows the variant name on hover (Phaser Text, visible on pointer over).

Run the game and take a screenshot to verify all 5 variants render with distinct colors.

Confirm when done and show me what was created.
```

---

## TYDZIEŃ 9 — AI modifications

### [ ] Wieczór 41: Voice/text input component

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

### [ ] Wieczór 42: Claude API — 3 clarifying questions

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
buildings (bonfire, workbench, cooking_pot, wall_wood), and a day/night cycle.
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

### [ ] Wieczór 43: Claude API generates ModConfig JSON

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

### [ ] Wieczór 44: Fork system — personal branch test

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

### [ ] Wieczór 45: Submit modification to group vote

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

## TYDZIEŃ 10 — Voting and launch

### [ ] Wieczór 46: Voting system

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

### [ ] Wieczór 47: Apply winning ModConfig to live room without restart

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

### [ ] Wieczór 49: Deploy frontend to Vercel + environment variables

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

*End of plan. Total: 50 evenings across 10 weeks.*
