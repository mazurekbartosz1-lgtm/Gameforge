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
import { isForestTile, treeAtChunk, rockAtChunk, TILE_SIZE, TREE_STEP, ROCK_STEP } from "../world/MapGenerator";
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

interface EnemyData {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  currentAnim: string;
  sprites: Map<string, Phaser.GameObjects.Sprite>;
  hpBar: Phaser.GameObjects.Graphics;
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
const VISION_RADIUS = 16;   // tiles — ~256px radius, fog visible on 800×600 screen
const MAX_WORLD_PX  = 100_000; // soft world edge in pixels from origin
const PLAYER_HW     = 12;   // collision half-width  px (24px total = 1.5 tiles)
const PLAYER_HH     = 20;   // collision half-height px (40px total = 2.5 tiles)
const ENEMY_HW      = 14;   // enemy collision half-width (debug display only)
const ENEMY_HH      = 22;   // enemy collision half-height (debug display only)
const ENEMY_ZONE_PX = 256;  // px per enemy spawn zone (16 tiles × 16px)

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
  private enemies: Map<string, EnemyData> = new Map();
  private resourceSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private resourceData:   Map<string, ResourceNodeData>           = new Map();

  // Tree footprint collision: tile "tx,ty" → set of resource ids (supports overlapping sprites)
  private tileToResources = new Map<string, Set<string>>();

  // Client-side infinite resource generation
  private generatedTreeChunks = new Set<string>();
  private generatedRockChunks = new Set<string>();
  private deadTrees = new Set<string>();
  private deadRocks = new Set<string>();

  private mapSeed = 42;

  // Infinite grass background (GPU-tiled, 1 draw call)
  private grassBg!: Phaser.GameObjects.TileSprite;
  // Light forest zone overlay
  private forestGfx!: Phaser.GameObjects.Graphics;
  // Debug grid
  private gridGfx!: Phaser.GameObjects.Graphics;
  // Collision debug overlay
  private collisionGfx!: Phaser.GameObjects.Graphics;
  // Fog of war
  private fogGraphics!: Phaser.GameObjects.Graphics;
  private discovered   = new Set<string>();
  private lastTileX      = Number.MAX_SAFE_INTEGER;
  private lastTileY      = Number.MAX_SAFE_INTEGER;
  private lastEnemyZoneX = Number.MAX_SAFE_INTEGER;
  private lastEnemyZoneY = Number.MAX_SAFE_INTEGER;

  // Minimap
  private minimapGfx!: Phaser.GameObjects.Graphics;

  private followTarget!: Phaser.GameObjects.Rectangle;
  private playersOnlineText!: Phaser.GameObjects.Text;
  private sessionIdText!: Phaser.GameObjects.Text;
  private playerCount = 1;

  // Inventory
  private inventory = new Map<string, number>();
  private hudTexts  = new Map<string, Phaser.GameObjects.Text>();

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

    // Hunter enemy spritesheets (64×64 frames)
    const hcfg = { frameWidth: 64, frameHeight: 64 };
    this.load.spritesheet("hunter_idle_down",  "/assets/enemy/hunter/hunter_idle_down.png",  hcfg);
    this.load.spritesheet("hunter_idle_side",  "/assets/enemy/hunter/hunter_idle_side.png",  hcfg);
    this.load.spritesheet("hunter_idle_up",    "/assets/enemy/hunter/hunter_idle_up.png",    hcfg);
    this.load.spritesheet("hunter_walk_down",    "/assets/enemy/hunter/hunter_walk_down.png",    hcfg);
    this.load.spritesheet("hunter_walk_side",    "/assets/enemy/hunter/hunter_walk_side.png",    hcfg);
    this.load.spritesheet("hunter_walk_up",      "/assets/enemy/hunter/hunter_walk_up.png",      hcfg);
    this.load.spritesheet("hunter_pierce_down",  "/assets/enemy/hunter/hunter_pierce_down.png",  hcfg);
    this.load.spritesheet("hunter_pierce_side",  "/assets/enemy/hunter/hunter_pierce_side.png",  hcfg);
    this.load.spritesheet("hunter_pierce_up",    "/assets/enemy/hunter/hunter_pierce_up.png",    hcfg);

    // Tree spritesheet: 4 cols × 2 rows of full trees (448×368, frame 112×184)
    this.load.spritesheet("tree_sheet", "/assets/resources/tree_sheet.png", { frameWidth: 112, frameHeight: 184 });
    // Rock spritesheet: 16×16 grid (208×304, frame 16×16)
    this.load.spritesheet("rocks", "/assets/resources/rocks.png", { frameWidth: 16, frameHeight: 16 });
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

    // ── Light forest zone overlay ───────────────────────────────────────────
    this.forestGfx = this.add.graphics().setDepth(1);

    // ── Debug grid ──────────────────────────────────────────────────────────
    this.gridGfx      = this.add.graphics().setDepth(7);
    this.collisionGfx = this.add.graphics().setDepth(6);

    // ── Resource textures (procedural, no external assets needed) ──────────
    this.createResourceTextures();

    // ── Animations ─────────────────────────────────────────────────────────
    createPlayerAnimations(this);
    createToolAnimations(this);
    this.createHunterAnimations();

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

    // ── Camera — deadzone + lerp follow ───────────────────────────────────
    this.followTarget = this.add.rectangle(this.px, this.py, 1, 1).setAlpha(0);
    this.cameras.main.startFollow(this.followTarget, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(200, 140);

    // ── Fog of war ─────────────────────────────────────────────────────────
    this.fogGraphics = this.add.graphics().setDepth(8);
    this.revealAround(0, 0);

    // ── Minimap ────────────────────────────────────────────────────────────
    this.minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(25);

    // ── UI overlay ─────────────────────────────────────────────────────────
    const ts = { fontSize: "12px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 6, y: 3 } };
    this.playersOnlineText = this.add.text(8, 8, "Players online: 1", ts).setScrollFactor(0).setDepth(20);
    this.sessionIdText = this.add
      .text(792, 8, this.room?.sessionId ?? "—", { fontSize: "10px", color: "#aaaaaa", backgroundColor: "#00000066", padding: { x: 4, y: 2 } })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(20);

    // ── Inventory HUD ───────────────────────────────────────────────────────
    this.initInventoryHud();

    // ── Multiplayer handlers ────────────────────────────────────────────────
    if (this.room) this.setupMessageHandlers(this.room);
    else {
      // offline/solo: no dead-resource list to wait for
      this.generateTreeChunksAround(0, 0);
      this.generateRockChunksAround(0, 0);
    }
  }

  // ── Enemies ───────────────────────────────────────────────────────────────

  private createHunterAnimations() {
    const add = (key: string, tex: string, frames: number, fps: number) => {
      if (!this.anims.exists(key))
        this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { start: 0, end: frames - 1 }), frameRate: fps, repeat: -1 });
    };
    add("hunter_idle_down", "hunter_idle_down", 4, 6);
    add("hunter_idle_side", "hunter_idle_side", 4, 6);
    add("hunter_idle_up",   "hunter_idle_up",   4, 6);
    add("hunter_walk_down", "hunter_walk_down",  6, 8);
    add("hunter_walk_side", "hunter_walk_side",  6, 8);
    add("hunter_walk_up",   "hunter_walk_up",    6, 8);
    // Pierce — loop while enemy is in attack stance
    add("hunter_pierce_down", "hunter_pierce_down", 8, 8);
    add("hunter_pierce_side", "hunter_pierce_side", 8, 8);
    add("hunter_pierce_up",   "hunter_pierce_up",   8, 8);
  }

  private readonly HUNTER_ANIM_MAP: Record<string, { texture: string; flipX: boolean }> = {
    idle_down:  { texture: "hunter_idle_down", flipX: false },
    idle_up:    { texture: "hunter_idle_up",   flipX: false },
    idle_left:  { texture: "hunter_idle_side", flipX: true  },
    idle_right: { texture: "hunter_idle_side", flipX: false },
    walk_down:    { texture: "hunter_walk_down",   flipX: false },
    walk_up:      { texture: "hunter_walk_up",     flipX: false },
    walk_left:    { texture: "hunter_walk_side",   flipX: true  },
    walk_right:   { texture: "hunter_walk_side",   flipX: false },
    pierce_down:  { texture: "hunter_pierce_down", flipX: false },
    pierce_up:    { texture: "hunter_pierce_up",   flipX: false },
    pierce_left:  { texture: "hunter_pierce_side", flipX: true  },
    pierce_right: { texture: "hunter_pierce_side", flipX: false },
  };

  private createEnemySprites(x: number, y: number): Map<string, Phaser.GameObjects.Sprite> {
    const sprites = new Map<string, Phaser.GameObjects.Sprite>();
    for (const tex of ["hunter_idle_down", "hunter_idle_up", "hunter_idle_side", "hunter_walk_down", "hunter_walk_up", "hunter_walk_side", "hunter_pierce_down", "hunter_pierce_up", "hunter_pierce_side"]) {
      const s = this.add.sprite(x, y, tex).setScale(1.5).setDepth(9);
      s.setVisible(false);
      sprites.set(tex, s);
    }
    return sprites;
  }

  private playEnemyAnim(enemy: EnemyData, animKey: string) {
    enemy.currentAnim = animKey;
    const mapped = this.HUNTER_ANIM_MAP[animKey] ?? this.HUNTER_ANIM_MAP["idle_down"];
    // Hunter anim key = texture key (e.g. "hunter_walk_down")
    const hunterAnimKey = mapped.texture;
    enemy.sprites.forEach((s, tex) => {
      const visible = tex === mapped.texture;
      s.setVisible(visible);
      if (visible) { s.setFlipX(mapped.flipX); s.play(hunterAnimKey, true); }
    });
  }

  private addEnemy(data: { id: string; x: number; y: number; animKey: string; hp: number; maxHp: number }) {
    if (this.enemies.has(data.id)) return;
    const sprites = this.createEnemySprites(data.x, data.y);
    const hpBar   = this.add.graphics().setDepth(12);
    const enemy: EnemyData = {
      id: data.id, x: data.x, y: data.y, targetX: data.x, targetY: data.y,
      hp: data.hp, maxHp: data.maxHp, currentAnim: data.animKey, sprites, hpBar,
    };
    this.enemies.set(data.id, enemy);
    this.playEnemyAnim(enemy, data.animKey);
  }

  private drawEnemyHpBar(enemy: EnemyData) {
    const g = enemy.hpBar;
    g.clear();
    if (enemy.hp <= 0) return;
    const w = 40; const h = 4;
    const bx = enemy.x - w / 2; const by = enemy.y - 52;
    g.fillStyle(0x000000, 0.6); g.fillRect(bx, by, w, h);
    const pct = enemy.hp / enemy.maxHp;
    const col = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xffaa00 : 0xcc2222;
    g.fillStyle(col, 1); g.fillRect(bx, by, w * pct, h);
  }

  private killEnemy(id: string) {
    const enemy = this.enemies.get(id);
    if (!enemy) return;
    // Red particle burst
    const particles = this.add.particles(enemy.x, enemy.y, "__DEFAULT", {
      speed: { min: 40, max: 120 }, lifespan: 500, quantity: 12,
      scale: { start: 0.3, end: 0 }, tint: 0xcc2222, emitting: false,
    });
    particles.explode(12);
    this.time.delayedCall(600, () => particles.destroy());
    enemy.sprites.forEach((s) => s.destroy());
    enemy.hpBar.destroy();
    this.enemies.delete(id);
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
      if (!rd) return;
      rd.hp = data.hp;
      if (rd.isAlive && !data.isAlive) this.unregisterFootprint(rd);
      if (!rd.isAlive && data.isAlive) this.registerFootprint(rd);
      rd.isAlive = data.isAlive;
    });

    // Trees: wait for dead list before initial generation
    room.onMessage("dead_trees_init", (ids: string[]) => {
      ids.forEach((id) => this.deadTrees.add(id));
      this.generateTreeChunksAround(0, 0);
    });
    room.send("request_dead_trees", {});

    room.onMessage("tree_dead", (data: { id: string }) => {
      this.deadTrees.add(data.id);
      const rd = this.resourceData.get(data.id);
      if (rd && rd.isAlive) { rd.isAlive = false; this.unregisterFootprint(rd); this.killResourceSprite(data.id); }
    });

    room.onMessage("rock_dead", (data: { id: string }) => {
      this.deadRocks.add(data.id);
      const rd = this.resourceData.get(data.id);
      if (rd && rd.isAlive) { rd.isAlive = false; this.unregisterFootprint(rd); this.killResourceSprite(data.id); }
    });

    room.onMessage("harvest_reward", (data: { drops: Array<{ item: string; qty: number }> }) => {
      this.addItems(data.drops);
    });

    room.onMessage("enemy_update", (data: { id: string; x: number; y: number; animKey: string }) => {
      const enemy = this.enemies.get(data.id);
      if (!enemy) {
        this.addEnemy({ id: data.id, x: data.x, y: data.y, animKey: data.animKey, hp: 30, maxHp: 30 });
        return;
      }
      enemy.targetX = data.x;
      enemy.targetY = data.y;
      if (data.animKey !== enemy.currentAnim) this.playEnemyAnim(enemy, data.animKey);
    });

    room.onMessage("enemy_hit", (data: { id: string; hp: number }) => {
      const enemy = this.enemies.get(data.id);
      if (enemy) enemy.hp = data.hp;
    });

    room.onMessage("enemy_dead", (data: { id: string }) => {
      this.killEnemy(data.id);
    });

    room.onMessage("player_damage", (data: { damage: number; hp: number }) => {
      this.showPickupText(this.px, this.py - 50, `-${data.damage} HP`);
    });
  }

  // ── Inventory ─────────────────────────────────────────────────────────────

  private initInventoryHud() {
    const ITEMS: Array<{ key: string; label: string; color: string }> = [
      { key: "wood",     label: "Wood",  color: "#c8a46e" },
      { key: "stone",    label: "Stone", color: "#aaaaaa" },
      { key: "raw_meat", label: "Meat",  color: "#e07050" },
    ];
    const slotW  = 80;
    const totalW = ITEMS.length * slotW + (ITEMS.length - 1) * 8;
    let x = (800 - totalW) / 2;

    for (const { key, label, color } of ITEMS) {
      const t = this.add.text(x + slotW / 2, 576, `${label}: 0`, {
        fontSize: "13px",
        color,
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 5 },
        stroke: "#000000",
        strokeThickness: 1,
      }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(20);
      this.hudTexts.set(key, t);
      x += slotW + 8;
    }
  }

  private updateInventoryHud() {
    this.hudTexts.forEach((text, key) => {
      const count = this.inventory.get(key) ?? 0;
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      text.setText(`${label}: ${count}`);
    });
  }

  private addItems(drops: Array<{ item: string; qty: number }>) {
    const parts: string[] = [];
    for (const { item, qty } of drops) {
      this.inventory.set(item, (this.inventory.get(item) ?? 0) + qty);
      parts.push(`+${qty} ${item.charAt(0).toUpperCase() + item.slice(1)}`);
    }
    this.updateInventoryHud();
    if (parts.length) this.showPickupText(this.px, this.py - 50, parts.join("  "));
  }

  private showPickupText(x: number, y: number, msg: string) {
    const t = this.add.text(x, y, msg, {
      fontSize: "12px",
      color: "#ffdd44",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 1400,
      ease: "Power1",
      onComplete: () => t.destroy(),
    });
  }

  // ── Forest zone overlay (light, shows biome) ──────────────────────────────

  private drawForest() {
    const cam = this.cameras.main;
    const startX = Math.floor(cam.scrollX / TILE_SIZE) - 1;
    const startY = Math.floor(cam.scrollY / TILE_SIZE) - 1;
    const endX   = startX + Math.ceil(cam.width  / TILE_SIZE) + 2;
    const endY   = startY + Math.ceil(cam.height / TILE_SIZE) + 2;
    this.forestGfx.clear();

    // Light forest biome tint
    this.forestGfx.fillStyle(0x1a4a1a, 0.18);
    for (let ty = startY; ty <= endY; ty++)
      for (let tx = startX; tx <= endX; tx++)
        if (isForestTile(tx, ty, this.mapSeed))
          this.forestGfx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);

    // (footprint debug overlay removed — trunk-only footprints are too small to be useful as guide)
  }

  // ── Resources ─────────────────────────────────────────────────────────────

  private createResourceTextures() {
    // Textures loaded via preload — nothing to generate procedurally
  }

  /** Destroy a resource sprite immediately and remove it from the map. */
  private killResourceSprite(id: string) {
    const sprite = this.resourceSprites.get(id);
    if (sprite) {
      sprite.destroy();
      this.resourceSprites.delete(id);
    }
  }

  /** Register the footprint of a resource for collision + harvest detection. */
  private registerFootprint(rd: ResourceNodeData) {
    const baseTX = Math.floor(rd.x / TILE_SIZE);
    const baseTY = Math.floor(rd.y / TILE_SIZE);
    const add = (key: string) => {
      let s = this.tileToResources.get(key);
      if (!s) { s = new Set(); this.tileToResources.set(key, s); }
      s.add(rd.id);
    };
    if (rd.type === "tree") {
      for (let dy = -9; dy <= 0; dy++)
        for (let dx = -3; dx <= 3; dx++)
          add(`${baseTX + dx},${baseTY + dy}`);
    } else {
      for (let dy = 0; dy <= 2; dy++)
        for (let dx = 0; dx <= 2; dx++)
          add(`${baseTX + dx},${baseTY + dy}`);
    }
  }

  /** Remove footprint when a resource dies. Tiles shared with other resources stay intact. */
  private unregisterFootprint(rd: ResourceNodeData) {
    const baseTX = Math.floor(rd.x / TILE_SIZE);
    const baseTY = Math.floor(rd.y / TILE_SIZE);
    const remove = (key: string) => {
      const s = this.tileToResources.get(key);
      if (!s) return;
      s.delete(rd.id);
      if (s.size === 0) this.tileToResources.delete(key);
    };
    if (rd.type === "tree") {
      for (let dy = -9; dy <= 0; dy++)
        for (let dx = -3; dx <= 3; dx++)
          remove(`${baseTX + dx},${baseTY + dy}`);
    } else {
      for (let dy = 0; dy <= 2; dy++)
        for (let dx = 0; dx <= 2; dx++)
          remove(`${baseTX + dx},${baseTY + dy}`);
    }
  }

  /** First alive resource id covering this tile, or null. */
  private aliveResourceAt(tileKey: string): string | null {
    const s = this.tileToResources.get(tileKey);
    if (!s) return null;
    for (const id of s) {
      if (this.resourceData.get(id)?.isAlive) return id;
    }
    return null;
  }

  /** Spawn tree sprites for all TREE_STEP-chunks within vision radius of (tileX, tileY). */
  private generateTreeChunksAround(tileX: number, tileY: number) {
    const chunkRadius = Math.ceil(VISION_RADIUS / TREE_STEP) + 2;
    const playerCX = Math.floor(tileX / TREE_STEP);
    const playerCY = Math.floor(tileY / TREE_STEP);

    for (let cy = playerCY - chunkRadius; cy <= playerCY + chunkRadius; cy++) {
      for (let cx = playerCX - chunkRadius; cx <= playerCX + chunkRadius; cx++) {
        const key = `${cx},${cy}`;
        if (this.generatedTreeChunks.has(key)) continue;
        this.generatedTreeChunks.add(key);

        const result = treeAtChunk(cx, cy, this.mapSeed);
        if (!result) continue;

        const { wx, wy } = result;
        const id = `tree_${cx}_${cy}`;
        const x = wx * TILE_SIZE + TILE_SIZE / 2;
        const y = wy * TILE_SIZE + TILE_SIZE / 2;
        const isAlive = !this.deadTrees.has(id);
        this.addResourceSprite({ id, type: "tree", x, y, hp: 5, maxHp: 5, isAlive });
      }
    }
  }

  /** Spawn rock sprites for all ROCK_STEP-chunks within vision radius of (tileX, tileY). */
  private generateRockChunksAround(tileX: number, tileY: number) {
    const chunkRadius = Math.ceil(VISION_RADIUS / ROCK_STEP) + 2;
    const playerCX = Math.floor(tileX / ROCK_STEP);
    const playerCY = Math.floor(tileY / ROCK_STEP);

    for (let cy = playerCY - chunkRadius; cy <= playerCY + chunkRadius; cy++) {
      for (let cx = playerCX - chunkRadius; cx <= playerCX + chunkRadius; cx++) {
        const key = `${cx},${cy}`;
        if (this.generatedRockChunks.has(key)) continue;
        this.generatedRockChunks.add(key);

        const result = rockAtChunk(cx, cy, this.mapSeed);
        if (!result) continue;

        const { wx, wy } = result;
        const id = `rock_${cx}_${cy}`;
        const x = wx * TILE_SIZE + TILE_SIZE / 2;
        const y = wy * TILE_SIZE + TILE_SIZE / 2;
        const isAlive = !this.deadRocks.has(id);
        this.addResourceSprite({ id, type: "rock", x, y, hp: 3, maxHp: 3, isAlive });
      }
    }
  }

  /** Check player's adjacent tiles (4 directions) for a harvestable resource. */
  private findAdjacentResource(tileX: number, tileY: number): string | null {
    // Use pixel-based harvest rect in the facing direction so the check accounts
    // for the player's collision box offset (PLAYER_HH=20px > 1 tile, hence
    // simple ±1 tile misses footprints when approaching from above/below).
    const REACH = 48; // px reach forward
    const WIDE  = 24; // px half-width of harvest arc

    let x0: number, x1: number, y0: number, y1: number;
    switch (this.direction) {
      case "down":  x0 = this.px - WIDE; x1 = this.px + WIDE; y0 = this.py + PLAYER_HH; y1 = this.py + PLAYER_HH + REACH; break;
      case "up":    x0 = this.px - WIDE; x1 = this.px + WIDE; y0 = this.py - PLAYER_HH - REACH; y1 = this.py - PLAYER_HH; break;
      case "right": x0 = this.px + PLAYER_HW; x1 = this.px + PLAYER_HW + REACH; y0 = this.py - WIDE; y1 = this.py + WIDE; break;
      case "left":  x0 = this.px - PLAYER_HW - REACH; x1 = this.px - PLAYER_HW; y0 = this.py - WIDE; y1 = this.py + WIDE; break;
    }
    const minTX = Math.floor(x0! / TILE_SIZE);
    const maxTX = Math.floor(x1! / TILE_SIZE);
    const minTY = Math.floor(y0! / TILE_SIZE);
    const maxTY = Math.floor(y1! / TILE_SIZE);

    for (let ty = minTY; ty <= maxTY; ty++)
      for (let tx = minTX; tx <= maxTX; tx++) {
        const id = this.aliveResourceAt(`${tx},${ty}`);
        if (id) return id;
      }
    return null;
  }

  private addResourceSprite(n: ResourceNodeData) {
    if (this.resourceSprites.has(n.id)) return; // already exists — skip to avoid orphaned sprites
    this.resourceData.set(n.id, n);
    if (n.isAlive) this.registerFootprint(n);
    let sprite: Phaser.GameObjects.Image;
    if (n.type === "tree") {
      // Frames 0 (green) and 1 (yellow-green) only — no bare/winter trees.
      // Crop bottom 2 rows (32px) — orange dirt mound below trunk.
      // Shift y+32 so visible bottom stays at n.y despite crop removing the anchor row.
      const variant = n.id.charCodeAt(n.id.length - 1) % 2;
      sprite = this.add.image(n.x, n.y + 32, "tree_sheet", variant)
        .setOrigin(0.5, 1.0)
        .setScale(1.0)
        .setDepth(3);
      sprite.setCrop(0, 0, 112, 152); // 184 - 32 = 152px visible
    } else {
      // Rock: scale 3 → 48×48px = 3×3 tiles. Frame 18 = row 1 col 5 (most opaque pixels).
      const bx = Math.floor(n.x / TILE_SIZE) * TILE_SIZE;
      const by = Math.floor(n.y / TILE_SIZE) * TILE_SIZE;
      sprite = this.add.image(bx, by, "rocks", 18)
        .setOrigin(0, 0)
        .setScale(3.0)
        .setDepth(2);
    }
    sprite.setVisible(false);
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

  // ── Minimap ───────────────────────────────────────────────────────────────

  private drawMinimap(playerTileX: number, playerTileY: number) {
    const MW = 160; const MH = 120; // minimap size px
    const MX = 632; const MY = 8;   // top-left corner (screen coords)
    const SCALE = 4;                 // 1 minimap px = SCALE world tiles
    const g = this.minimapGfx;
    g.clear();

    // Background
    g.fillStyle(0x000000, 0.85);
    g.fillRect(MX, MY, MW, MH);

    // Pass 1 — terrain (discovered tiles only, full brightness)
    for (let my = 0; my < MH; my++) {
      for (let mx = 0; mx < MW; mx++) {
        const tx = Math.floor(playerTileX + (mx - MW / 2) * SCALE);
        const ty = Math.floor(playerTileY + (my - MH / 2) * SCALE);
        if (!this.discovered.has(`${tx},${ty}`)) continue;
        g.fillStyle(isForestTile(tx, ty, this.mapSeed) ? 0x1a6a1a : 0x2a4a2a, 1);
        g.fillPoint(MX + mx, MY + my, 1);
      }
    }

    // Pass 2 — fog overlay (discovered but outside vision radius)
    g.fillStyle(0x000000, 0.65);
    for (let my = 0; my < MH; my++) {
      for (let mx = 0; mx < MW; mx++) {
        const tx = Math.floor(playerTileX + (mx - MW / 2) * SCALE);
        const ty = Math.floor(playerTileY + (my - MH / 2) * SCALE);
        if (!this.discovered.has(`${tx},${ty}`)) continue;
        const dtx = tx - playerTileX; const dty = ty - playerTileY;
        if (dtx * dtx + dty * dty <= VISION_RADIUS * VISION_RADIUS) continue; // in vision — no fog
        g.fillPoint(MX + mx, MY + my, 1);
      }
    }

    // Resources (alive only)
    this.resourceData.forEach((rd) => {
      if (!rd.isAlive) return;
      const mx = Math.round(MW / 2 + (rd.x / TILE_SIZE - playerTileX) / SCALE);
      const my = Math.round(MH / 2 + (rd.y / TILE_SIZE - playerTileY) / SCALE);
      if (mx < 1 || mx >= MW - 1 || my < 1 || my >= MH - 1) return;
      const key = `${Math.floor(rd.x / TILE_SIZE)},${Math.floor(rd.y / TILE_SIZE)}`;
      if (!this.discovered.has(key)) return;
      g.fillStyle(rd.type === "tree" ? 0x44cc44 : 0x888888, 1);
      g.fillPoint(MX + mx, MY + my, 2);
    });

    // Remote players
    this.remotePlayers.forEach((remote) => {
      const mx = Math.round(MW / 2 + (remote.x / TILE_SIZE - playerTileX) / SCALE);
      const my = Math.round(MH / 2 + (remote.y / TILE_SIZE - playerTileY) / SCALE);
      if (mx < 1 || mx >= MW - 1 || my < 1 || my >= MH - 1) return;
      g.fillStyle(0x4488ff, 1);
      g.fillPoint(MX + mx, MY + my, 3);
    });

    // Local player — always center
    g.fillStyle(0xffffff, 1);
    g.fillRect(MX + MW / 2 - 1, MY + MH / 2 - 1, 3, 3);

    // Border
    g.lineStyle(1, 0xffffff, 0.4);
    g.strokeRect(MX, MY, MW, MH);
  }

  // ── Debug grid ────────────────────────────────────────────────────────────

  private drawCollision(px: number, py: number) {
    const cam = this.cameras.main;
    const startX = Math.floor(cam.scrollX / TILE_SIZE) - 1;
    const startY = Math.floor(cam.scrollY / TILE_SIZE) - 1;
    const endX   = startX + Math.ceil(cam.width  / TILE_SIZE) + 2;
    const endY   = startY + Math.ceil(cam.height / TILE_SIZE) + 2;

    this.collisionGfx.clear();

    // Dark red overlay on all blocked resource tiles
    this.collisionGfx.fillStyle(0x660000, 0.35);
    for (let ty = startY; ty <= endY; ty++)
      for (let tx = startX; tx <= endX; tx++)
        if (this.aliveResourceAt(`${tx},${ty}`))
          this.collisionGfx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);

    // Cyan rectangle — player collision box
    this.collisionGfx.fillStyle(0x00ffff, 0.40);
    this.collisionGfx.fillRect(px - PLAYER_HW, py - PLAYER_HH, PLAYER_HW * 2, PLAYER_HH * 2);

    // Red circle — player damage receive range (server ENEMY_MELEE_RANGE = 54px)
    this.collisionGfx.lineStyle(2, 0xff2222, 0.85);
    this.collisionGfx.strokeCircle(px, py, 54);

    // Magenta rectangles — enemy collision boxes
    this.collisionGfx.fillStyle(0xff00ff, 0.35);
    this.enemies.forEach((enemy) => {
      this.collisionGfx.fillRect(enemy.x - ENEMY_HW, enemy.y - ENEMY_HH, ENEMY_HW * 2, ENEMY_HH * 2);
    });

    // Bordeaux circles — enemy melee attack range (64px radius)
    const ENEMY_ATK_R = 64;
    this.collisionGfx.lineStyle(2, 0x8b0000, 0.80);
    this.enemies.forEach((enemy) => {
      this.collisionGfx.strokeCircle(enemy.x, enemy.y, ENEMY_ATK_R);
    });

    // Orange rectangle — slice attack range in front of player
    const atkFwd = 48; // px forward reach (3 tiles)
    const atkSide = 32; // px side reach (2 tiles)
    let atkX: number, atkY: number, atkW: number, atkH: number;
    switch (this.direction) {
      case "down":  atkX = px - atkSide / 2; atkY = py + PLAYER_HH;          atkW = atkSide; atkH = atkFwd; break;
      case "up":    atkX = px - atkSide / 2; atkY = py - PLAYER_HH - atkFwd; atkW = atkSide; atkH = atkFwd; break;
      case "left":  atkX = px - PLAYER_HW - atkFwd; atkY = py - atkSide / 2; atkW = atkFwd; atkH = atkSide; break;
      case "right": atkX = px + PLAYER_HW;           atkY = py - atkSide / 2; atkW = atkFwd; atkH = atkSide; break;
    }
    this.collisionGfx.fillStyle(0xff8800, 0.30);
    this.collisionGfx.fillRect(atkX!, atkY!, atkW!, atkH!);
  }

  private drawGrid() {
    const cam = this.cameras.main;
    const startX = Math.floor(cam.scrollX / TILE_SIZE) * TILE_SIZE;
    const startY = Math.floor(cam.scrollY / TILE_SIZE) * TILE_SIZE;
    const endX   = cam.scrollX + cam.width  + TILE_SIZE;
    const endY   = cam.scrollY + cam.height + TILE_SIZE;

    this.gridGfx.clear();
    this.gridGfx.lineStyle(1, 0xffffff, 0.12);

    for (let x = startX; x <= endX; x += TILE_SIZE) {
      this.gridGfx.beginPath();
      this.gridGfx.moveTo(x, cam.scrollY);
      this.gridGfx.lineTo(x, endY);
      this.gridGfx.strokePath();
    }
    for (let y = startY; y <= endY; y += TILE_SIZE) {
      this.gridGfx.beginPath();
      this.gridGfx.moveTo(cam.scrollX, y);
      this.gridGfx.lineTo(endX, y);
      this.gridGfx.strokePath();
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
    const eJustDown     = Phaser.Input.Keyboard.JustDown(this.actionKeys["E"]);
    const spaceJustDown = Phaser.Input.Keyboard.JustDown(this.actionKeys["SPACE"]);
    if (spaceJustDown) {
      // Find closest enemy in facing direction ≤64px and send attack
      let closest: EnemyData | null = null;
      let closestDist = 64;
      this.enemies.forEach((enemy) => {
        const dx = enemy.x - this.px; const dy = enemy.y - this.py;
        const dist = Math.hypot(dx, dy);
        const inFront =
          (this.direction === "right" && dx > 0 && Math.abs(dy) < 60) ||
          (this.direction === "left"  && dx < 0 && Math.abs(dy) < 60) ||
          (this.direction === "down"  && dy > 0 && Math.abs(dx) < 60) ||
          (this.direction === "up"    && dy < 0 && Math.abs(dx) < 60);
        if (inFront && dist < closestDist) { closestDist = dist; closest = enemy; }
      });
      if (closest && this.room) this.room.send("attack_enemy", { enemyId: (closest as EnemyData).id });
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
      // Slide on X and Y independently for smooth wall-sliding
      const newPx = Phaser.Math.Clamp(this.px + vx * dt, -MAX_WORLD_PX, MAX_WORLD_PX);
      if (!this.isBoxBlocked(newPx, this.py)) this.px = newPx;

      const newPy = Phaser.Math.Clamp(this.py + vy * dt, -MAX_WORLD_PX, MAX_WORLD_PX);
      if (!this.isBoxBlocked(this.px, newPy)) this.py = newPy;

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
      this.generateTreeChunksAround(tileX, tileY);
      this.generateRockChunksAround(tileX, tileY);
    }

    // Enemy zone — trigger server spawn when player enters a new zone
    if (this.room) {
      const zoneX = Math.floor(this.px / ENEMY_ZONE_PX);
      const zoneY = Math.floor(this.py / ENEMY_ZONE_PX);
      if (zoneX !== this.lastEnemyZoneX || zoneY !== this.lastEnemyZoneY) {
        this.lastEnemyZoneX = zoneX;
        this.lastEnemyZoneY = zoneY;
        this.room.send("enter_chunk", { chunkX: zoneX, chunkY: zoneY });
      }
    }

    // Background — sync tile UVs with camera scroll so grass appears to move
    this.grassBg.setTilePosition(this.cameras.main.scrollX, this.cameras.main.scrollY);

    // Overlays — redrawn every frame (only visible tiles)
    this.drawForest();
    this.drawCollision(this.px, this.py);
    this.drawGrid();
    this.drawFog(tileX, tileY);
    this.drawMinimap(tileX, tileY);

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

    // Enemy interpolation + fog of war + HP bars
    this.enemies.forEach((enemy) => {
      enemy.x = Phaser.Math.Linear(enemy.x, enemy.targetX, 0.35);
      enemy.y = Phaser.Math.Linear(enemy.y, enemy.targetY, 0.35);
      enemy.sprites.forEach((s) => { s.x = enemy.x; s.y = enemy.y; });

      const edx = enemy.x - this.px;
      const edy = enemy.y - this.py;
      const inVision = edx * edx + edy * edy <= visionPx * visionPx;
      if (inVision) {
        const { texture, flipX } = this.HUNTER_ANIM_MAP[enemy.currentAnim] ?? this.HUNTER_ANIM_MAP["idle_down"];
        enemy.sprites.forEach((s, key) => {
          s.setVisible(key === texture);
          if (key === texture) s.setFlipX(flipX);
        });
        this.drawEnemyHpBar(enemy);
      } else {
        enemy.sprites.forEach((s) => s.setVisible(false));
        enemy.hpBar.clear();
      }
    });

    // Resource visibility — show only within vision radius
    const visionPxSq = (VISION_RADIUS * TILE_SIZE) ** 2;
    this.resourceData.forEach((rd, id) => {
      const sprite = this.resourceSprites.get(id);
      if (!sprite) return;
      const dx = rd.x - this.px;
      const dy = rd.y - this.py;
      sprite.setVisible(rd.isAlive && (dx * dx + dy * dy) <= visionPxSq);
    });

    // E key: harvest tree/rock adjacent to player (tile-based detection)
    if (eJustDown && !this.isActionPlaying) {
      const harvestId = this.findAdjacentResource(tileX, tileY);
      if (harvestId) {
        // Immediate local update so player can't double-harvest
        if (harvestId.startsWith("tree_")) {
          this.deadTrees.add(harvestId);
          const rd = this.resourceData.get(harvestId);
          if (rd && rd.isAlive) { rd.isAlive = false; this.unregisterFootprint(rd); this.killResourceSprite(harvestId); }
        } else if (harvestId.startsWith("rock_")) {
          this.deadRocks.add(harvestId);
          const rd = this.resourceData.get(harvestId);
          if (rd && rd.isAlive) { rd.isAlive = false; this.unregisterFootprint(rd); this.killResourceSprite(harvestId); }
        }
        if (this.room) {
          this.room.send("harvest", { id: harvestId });
        } else {
          // Offline mode: give items locally
          const isTree = harvestId.startsWith("tree_");
          const item   = isTree ? "wood" : "stone";
          const qty    = isTree ? 2 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
          this.addItems([{ item, qty }]);
        }
        this.playActionAnim("collect");
      }
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

  /** Returns true if any tile overlapping the player AABB (px±HW, py±HH) is blocked. */
  private isBoxBlocked(px: number, py: number): boolean {
    const minTX = Math.floor((px - PLAYER_HW) / TILE_SIZE);
    const maxTX = Math.floor((px + PLAYER_HW - 1) / TILE_SIZE);
    const minTY = Math.floor((py - PLAYER_HH) / TILE_SIZE);
    const maxTY = Math.floor((py + PLAYER_HH - 1) / TILE_SIZE);
    for (let ty = minTY; ty <= maxTY; ty++)
      for (let tx = minTX; tx <= maxTX; tx++)
        if (this.aliveResourceAt(`${tx},${ty}`)) return true;

    // Player is blocked by alive enemies — circular check for symmetric movement
    const ENEMY_BLOCK_R = 28;
    for (const enemy of this.enemies.values()) {
      const dx = px - enemy.x; const dy = py - enemy.y;
      if (dx * dx + dy * dy < ENEMY_BLOCK_R * ENEMY_BLOCK_R) return true;
    }
    return false;
  }
}
