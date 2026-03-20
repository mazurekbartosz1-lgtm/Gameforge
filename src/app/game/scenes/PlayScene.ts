import { Scene } from "phaser";
import { type Room } from "colyseus.js";
import { createPlayerAnimations } from "../animations/playerAnimations";
import {
  preloadToolSprites,
  createToolAnimations,
  ACTION_TYPES,
  ACTION_DIRS,
  type ActionType,
} from "../animations/toolAnimations";
import { isForestTile, TILE_SIZE } from "../world/MapGenerator";
import { getRoom } from "../network/ColyseusClient";

type Direction = "down" | "up" | "left" | "right";

interface RemotePlayer {
  sprites: Map<string, Phaser.GameObjects.Sprite>;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  currentAnim: string;
}

interface ResourceNodeData {
  id: string;
  type: "tree" | "rock";
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isAlive: boolean;
}

const ANIM_MAP: Record<string, { texture: string; flipX: boolean }> = {
  idle_down:  { texture: "idle_down",  flipX: false },
  idle_up:    { texture: "idle_up",    flipX: false },
  idle_left:  { texture: "idle_side",  flipX: true  },
  idle_right: { texture: "idle_side",  flipX: false },
  walk_down:  { texture: "walk_down",  flipX: false },
  walk_up:    { texture: "walk_up",    flipX: false },
  walk_left:  { texture: "walk_side",  flipX: true  },
  walk_right: { texture: "walk_side",  flipX: false },
};

const DIR_TO_TOOL: Record<Direction, { suffix: string; flipX: boolean }> = {
  down:  { suffix: "down", flipX: false },
  up:    { suffix: "up",   flipX: false },
  left:  { suffix: "side", flipX: true  },
  right: { suffix: "side", flipX: false },
};

const SPEED         = 100;  // px/s
const SEND_INTERVAL = 50;   // ms
const VISION_RADIUS = 10;   // tiles
const MAX_WORLD_PX  = 100_000; // soft world edge in pixels from origin

export class PlayScene extends Scene {
  // Player world position — starts at world origin (tile 0,0)
  private px = 0;
  private py = 0;

  private sprites:     Map<string, Phaser.GameObjects.Sprite> = new Map();
  private toolSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private cursors!:    Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!:       Record<string, Phaser.Input.Keyboard.Key>;
  private actionKeys!: Record<string, Phaser.Input.Keyboard.Key>;

  private direction    = "down" as Direction;
  private currentAnim  = "idle_down";
  private lastSentAt   = 0;
  private isActionPlaying = false;

  private room: Room | null = null;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private resourceSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private resourceData:   Map<string, ResourceNodeData>           = new Map();

  private mapSeed = 42;

  // Infinite grass background (GPU-tiled, 1 draw call)
  private grassBg!: Phaser.GameObjects.TileSprite;
  // Forest overlay — redrawn per frame for camera-visible area
  private forestGfx!: Phaser.GameObjects.Graphics;
  // Fog of war
  private fogGraphics!: Phaser.GameObjects.Graphics;
  private discovered   = new Set<string>();
  private lastTileX    = Number.MAX_SAFE_INTEGER;
  private lastTileY    = Number.MAX_SAFE_INTEGER;

  private followTarget!: Phaser.GameObjects.Rectangle;
  private playersOnlineText!: Phaser.GameObjects.Text;
  private sessionIdText!: Phaser.GameObjects.Text;
  private playerCount = 1;

  constructor() {
    super({ key: "PlayScene" });
  }

  preload() {
    this.load.on("loaderror", (file: { src: string }) => {
      console.error("Load error:", file.src);
    });

    // Load as spritesheet so TileSprite can use a specific frame
    this.load.spritesheet("fairy_tiles", "/assets/test/tiles.png", {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });

    const cfg = { frameWidth: 64, frameHeight: 64 };
    this.load.spritesheet("idle_down",  "/assets/player/idle_down.png",  cfg);
    this.load.spritesheet("idle_up",    "/assets/player/idle_up.png",    cfg);
    this.load.spritesheet("idle_side",  "/assets/player/idle_side.png",  cfg);
    this.load.spritesheet("walk_down",  "/assets/player/walk_down.png",  cfg);
    this.load.spritesheet("walk_up",    "/assets/player/walk_up.png",    cfg);
    this.load.spritesheet("walk_side",  "/assets/player/walk_side.png",  cfg);

    preloadToolSprites(this);

    this.load.image("tree_1", "/assets/resources/tree_1.png");
    this.load.image("tree_2", "/assets/resources/tree_2.png");
    this.load.image("tree_3", "/assets/resources/tree_3.png");
  }

  create() {
    this.room    = getRoom();
    this.mapSeed = (this.room as any)?.state?.mapSeed ?? 42;

    // ── Infinite grass background ──────────────────────────────────────────
    // TileSprite fixed to camera viewport — tilePosition synced in update()
    this.grassBg = this.add
      .tileSprite(0, 0, 800, 600, "fairy_tiles", 15)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(0);

    // ── Forest overlay — redrawn per frame (camera-visible tiles only) ─────
    this.forestGfx = this.add.graphics().setDepth(1);

    // ── Resource textures (procedural, no external assets needed) ──────────
    this.createResourceTextures();

    // ── Animations ─────────────────────────────────────────────────────────
    createPlayerAnimations(this);
    createToolAnimations(this);

    // ── Player sprites (one per texture, only one visible at a time) ───────
    for (const key of Object.keys(ANIM_MAP)) {
      const { texture } = ANIM_MAP[key];
      if (!this.sprites.has(texture)) {
        const s = this.add.sprite(this.px, this.py, texture);
        s.setScale(1.5).setDepth(9);
        s.setVisible(false);
        this.sprites.set(texture, s);
      }
    }
    this.playAnim("idle_down");

    // ── Tool sprites ───────────────────────────────────────────────────────
    for (const action of ACTION_TYPES) {
      for (const dir of ACTION_DIRS) {
        const key = `${action}_${dir}`;
        const s = this.add.sprite(this.px, this.py, key);
        s.setScale(1.5).setDepth(10);
        s.setVisible(false);
        this.toolSprites.set(key, s);
      }
    }

    // ── Input ──────────────────────────────────────────────────────────────
    this.cursors    = this.input.keyboard!.createCursorKeys();
    this.wasd       = this.input.keyboard!.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;
    this.actionKeys = this.input.keyboard!.addKeys("SPACE,E")  as Record<string, Phaser.Input.Keyboard.Key>;

    // ── Camera — no bounds, follows invisible target ───────────────────────
    this.followTarget = this.add.rectangle(this.px, this.py, 1, 1).setAlpha(0);
    this.cameras.main.startFollow(this.followTarget, true);

    // ── Fog of war ─────────────────────────────────────────────────────────
    this.fogGraphics = this.add.graphics().setDepth(8);
    this.revealAround(0, 0);

    // ── UI overlay ─────────────────────────────────────────────────────────
    const ts = { fontSize: "12px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 6, y: 3 } };
    this.playersOnlineText = this.add.text(8, 8, "Players online: 1", ts).setScrollFactor(0).setDepth(20);
    this.sessionIdText = this.add
      .text(792, 8, this.room?.sessionId ?? "—", { fontSize: "10px", color: "#aaaaaa", backgroundColor: "#00000066", padding: { x: 4, y: 2 } })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(20);

    // ── Multiplayer handlers ────────────────────────────────────────────────
    if (this.room) this.setupMessageHandlers(this.room);
  }

  // ── Remote players ────────────────────────────────────────────────────────

  private createRemoteSprites(x: number, y: number): Map<string, Phaser.GameObjects.Sprite> {
    const sprites = new Map<string, Phaser.GameObjects.Sprite>();
    for (const tex of ["idle_down", "idle_up", "idle_side", "walk_down", "walk_up", "walk_side"]) {
      const s = this.add.sprite(x, y, tex).setScale(1.5).setDepth(9);
      s.setVisible(false);
      sprites.set(tex, s);
    }
    return sprites;
  }

  private playRemoteAnim(remote: RemotePlayer, animKey: string) {
    remote.currentAnim = animKey;
    const { texture, flipX } = ANIM_MAP[animKey] ?? ANIM_MAP["idle_down"];
    remote.sprites.forEach((s, key) => {
      const visible = key === texture;
      s.setVisible(visible);
      if (visible) { s.setFlipX(flipX); s.play(animKey, true); }
    });
  }

  private addRemotePlayer(sessionId: string, data: { x: number; y: number; animKey: string; nickname: string }) {
    if (this.remotePlayers.has(sessionId)) return;
    const sprites = this.createRemoteSprites(data.x, data.y);
    const label = this.add.text(data.x, data.y - 52, data.nickname ?? sessionId, {
      fontSize: "8px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(11);
    this.remotePlayers.set(sessionId, { sprites, label, x: data.x, y: data.y, targetX: data.x, targetY: data.y, currentAnim: data.animKey ?? "idle_down" });
    this.playRemoteAnim(this.remotePlayers.get(sessionId)!, data.animKey ?? "idle_down");
  }

  private setupMessageHandlers(room: Room) {
    room.onMessage("players_init", (players: Array<{ sessionId: string; x: number; y: number; animKey: string; nickname: string }>) => {
      players.forEach((p) => this.addRemotePlayer(p.sessionId, p));
      this.playerCount = 1 + players.length;
      this.playersOnlineText.setText(`Players online: ${this.playerCount}`);
    });
    room.send("request_players", {});

    room.onMessage("player_add", (p: { sessionId: string; x: number; y: number; animKey: string; nickname: string }) => {
      this.addRemotePlayer(p.sessionId, p);
      this.playerCount++;
      this.playersOnlineText.setText(`Players online: ${this.playerCount}`);
    });

    room.onMessage("player_move", (data: { sessionId: string; x: number; y: number; animKey: string }) => {
      const remote = this.remotePlayers.get(data.sessionId);
      if (!remote) return;
      remote.targetX = data.x;
      remote.targetY = data.y;
      if (data.animKey !== remote.currentAnim) this.playRemoteAnim(remote, data.animKey);
    });

    room.onMessage("player_remove", (data: { sessionId: string }) => {
      const remote = this.remotePlayers.get(data.sessionId);
      if (!remote) return;
      remote.sprites.forEach((s) => s.destroy());
      remote.label.destroy();
      this.remotePlayers.delete(data.sessionId);
      this.playerCount = Math.max(1, this.playerCount - 1);
      this.playersOnlineText.setText(`Players online: ${this.playerCount}`);
    });

    room.onMessage("resources_init", (nodes: ResourceNodeData[]) => {
      nodes.forEach((n) => this.addResourceSprite(n));
    });
    room.send("request_resources", {});

    room.onMessage("resource_update", (data: { id: string; hp: number; isAlive: boolean }) => {
      const rd = this.resourceData.get(data.id);
      if (rd) { rd.hp = data.hp; rd.isAlive = data.isAlive; }
    });
  }

  // ── Resources ─────────────────────────────────────────────────────────────

  private createResourceTextures() {
    // Rock: gray with lighter highlight (still procedural — no rock sprite yet)
    const rockTex = this.textures.createCanvas("res_rock", 32, 32)!;
    const rc = rockTex.getContext();
    rc.fillStyle = "#808080";
    rc.beginPath(); rc.ellipse(16, 18, 13, 9, 0, 0, Math.PI * 2); rc.fill();
    rc.fillStyle = "#b0b0b0";
    rc.beginPath(); rc.ellipse(11, 13, 6, 4, 0, 0, Math.PI * 2); rc.fill();
    rockTex.refresh();
  }

  private addResourceSprite(n: ResourceNodeData) {
    this.resourceData.set(n.id, n);
    let tex: string;
    let scale: number;
    let originY: number;
    if (n.type === "tree") {
      // Pick one of 3 tree models based on id hash for visual variety
      const variant = (n.id.charCodeAt(n.id.length - 1) % 3) + 1;
      tex = `tree_${variant}`;
      scale = 0.25;
      originY = 1.0; // anchor at base so trunk sits on ground
    } else {
      tex = "res_rock";
      scale = 1.0;
      originY = 0.5;
    }
    const sprite = this.add.image(n.x, n.y, tex)
      .setOrigin(0.5, originY)
      .setScale(scale)
      .setDepth(2)
      .setVisible(false);
    this.resourceSprites.set(n.id, sprite);
  }

  // ── Fog of war ────────────────────────────────────────────────────────────

  private revealAround(tileX: number, tileY: number) {
    for (let dy = -VISION_RADIUS; dy <= VISION_RADIUS; dy++) {
      for (let dx = -VISION_RADIUS; dx <= VISION_RADIUS; dx++) {
        if (dx * dx + dy * dy <= VISION_RADIUS * VISION_RADIUS) {
          this.discovered.add(`${tileX + dx},${tileY + dy}`);
        }
      }
    }
  }

  private drawFog(playerTileX: number, playerTileY: number) {
    const cam = this.cameras.main;
    const startX = Math.floor(cam.scrollX / TILE_SIZE) - 1;
    const startY = Math.floor(cam.scrollY / TILE_SIZE) - 1;
    const endX   = startX + Math.ceil(cam.width  / TILE_SIZE) + 2;
    const endY   = startY + Math.ceil(cam.height / TILE_SIZE) + 2;

    this.fogGraphics.clear();

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        const dx = tx - playerTileX;
        const dy = ty - playerTileY;
        if (dx * dx + dy * dy <= VISION_RADIUS * VISION_RADIUS) continue; // visible

        const disc = this.discovered.has(`${tx},${ty}`);
        this.fogGraphics.fillStyle(0x000000, disc ? 0.6 : 0.70);
        this.fogGraphics.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // ── Forest overlay ────────────────────────────────────────────────────────

  private drawForest() {
    const cam = this.cameras.main;
    const startX = Math.floor(cam.scrollX / TILE_SIZE) - 1;
    const startY = Math.floor(cam.scrollY / TILE_SIZE) - 1;
    const endX   = startX + Math.ceil(cam.width  / TILE_SIZE) + 2;
    const endY   = startY + Math.ceil(cam.height / TILE_SIZE) + 2;

    this.forestGfx.clear();
    this.forestGfx.fillStyle(0x0d2b0d, 0.78);

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        if (isForestTile(tx, ty, this.mapSeed)) {
          this.forestGfx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private playActionAnim(action: ActionType) {
    if (this.isActionPlaying) return;
    const { suffix, flipX } = DIR_TO_TOOL[this.direction];
    const key    = `${action}_${suffix}`;
    const sprite = this.toolSprites.get(key);
    if (!sprite) return;

    this.isActionPlaying = true;
    this.sprites.forEach((s) => s.setVisible(false));
    this.toolSprites.forEach((s) => s.setVisible(false));
    sprite.setFlipX(flipX).setVisible(true).play(key);

    sprite.once("animationcomplete", () => {
      sprite.setVisible(false);
      this.isActionPlaying = false;
      this.playAnim(this.currentAnim);
    });

    this.room?.send("action", { type: action, x: this.px, y: this.py });
  }

  // ── Update loop ───────────────────────────────────────────────────────────

  update(time: number, delta: number) {
    const dt = delta / 1000;

    // Action keys
    const eJustDown = Phaser.Input.Keyboard.JustDown(this.actionKeys["E"]);
    if (Phaser.Input.Keyboard.JustDown(this.actionKeys["SPACE"])) {
      this.playActionAnim("slice");
    }

    // Movement
    const left  = this.cursors.left.isDown  || this.wasd["A"].isDown;
    const right = this.cursors.right.isDown || this.wasd["D"].isDown;
    const up    = this.cursors.up.isDown    || this.wasd["W"].isDown;
    const down  = this.cursors.down.isDown  || this.wasd["S"].isDown;

    let vx = 0, vy = 0;
    if (left)  { vx = -SPEED; this.direction = "left";  }
    if (right) { vx =  SPEED; this.direction = "right"; }
    if (up)    { vy = -SPEED; this.direction = "up";    }
    if (down)  { vy =  SPEED; this.direction = "down";  }

    const moving = vx !== 0 || vy !== 0;
    const animKey = moving ? `walk_${this.direction}` : `idle_${this.direction}`;

    if (moving) {
      const newPx = Phaser.Math.Clamp(this.px + vx * dt, -MAX_WORLD_PX, MAX_WORLD_PX);
      const newPy = Phaser.Math.Clamp(this.py + vy * dt, -MAX_WORLD_PX, MAX_WORLD_PX);
      const tileX = Math.floor(newPx / TILE_SIZE);
      const tileY = Math.floor(newPy / TILE_SIZE);

      if (!isForestTile(tileX, tileY, this.mapSeed)) {
        this.px = newPx;
        this.py = newPy;
      }

      this.sprites.forEach((s) => { s.x = this.px; s.y = this.py; });
      this.toolSprites.forEach((s) => { s.x = this.px; s.y = this.py; });
      this.followTarget.setPosition(this.px, this.py);
    }

    if (animKey !== this.currentAnim) this.playAnim(animKey);

    // Fog + discovery
    const tileX = Math.floor(this.px / TILE_SIZE);
    const tileY = Math.floor(this.py / TILE_SIZE);
    if (tileX !== this.lastTileX || tileY !== this.lastTileY) {
      this.lastTileX = tileX;
      this.lastTileY = tileY;
      this.revealAround(tileX, tileY);
    }

    // Background — sync tile UVs with camera scroll so grass appears to move
    this.grassBg.setTilePosition(this.cameras.main.scrollX, this.cameras.main.scrollY);

    // Terrain + fog — redrawn every frame (only visible tiles)
    this.drawForest();
    this.drawFog(tileX, tileY);

    // Remote player interpolation + visibility (hidden by fog outside vision)
    const visionPx = VISION_RADIUS * TILE_SIZE;
    this.remotePlayers.forEach((remote) => {
      remote.x = Phaser.Math.Linear(remote.x, remote.targetX, 0.2);
      remote.y = Phaser.Math.Linear(remote.y, remote.targetY, 0.2);
      remote.sprites.forEach((s) => { s.x = remote.x; s.y = remote.y; });
      remote.label.x = remote.x;
      remote.label.y = remote.y - 52;

      const dx = remote.x - this.px;
      const dy = remote.y - this.py;
      const inVision = dx * dx + dy * dy <= visionPx * visionPx;
      if (inVision) {
        // Restore correct sprite visibility based on current animation
        const { texture, flipX } = ANIM_MAP[remote.currentAnim] ?? ANIM_MAP["idle_down"];
        remote.sprites.forEach((s, key) => {
          s.setVisible(key === texture);
          if (key === texture) s.setFlipX(flipX);
        });
      } else {
        remote.sprites.forEach((s) => s.setVisible(false));
      }
      remote.label.setVisible(inVision);
    });

    // Resource visibility + harvest on E key
    const visionPxSq = (VISION_RADIUS * TILE_SIZE) ** 2;
    const harvestRangeSq = (3 * TILE_SIZE) ** 2;
    let nearestId: string | null = null;
    let nearestDistSq = Infinity;

    this.resourceData.forEach((rd, id) => {
      const sprite = this.resourceSprites.get(id);
      if (!sprite) return;
      const dx = rd.x - this.px;
      const dy = rd.y - this.py;
      const distSq = dx * dx + dy * dy;
      const inVision = distSq <= visionPxSq;
      sprite.setVisible(rd.isAlive && inVision);
      if (rd.isAlive && inVision && distSq <= harvestRangeSq && distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestId = id;
      }
    });

    if (eJustDown && nearestId && !this.isActionPlaying) {
      this.room?.send("harvest", { id: nearestId });
      this.playActionAnim("collect");
    }

    // Colyseus send (throttled)
    if (this.room && time - this.lastSentAt > SEND_INTERVAL) {
      this.room.send("move", { x: this.px, y: this.py, direction: this.direction, animKey });
      this.lastSentAt = time;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private playAnim(animKey: string) {
    this.currentAnim = animKey;
    const { texture, flipX } = ANIM_MAP[animKey];
    this.sprites.forEach((s, key) => {
      const visible = key === texture;
      s.setVisible(visible);
      if (visible) { s.setFlipX(flipX); s.play(animKey, true); }
    });
  }
}
