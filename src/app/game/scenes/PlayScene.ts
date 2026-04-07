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
import { isForestTile, treeAtChunk, rockAtChunk, foodAtChunk, TILE_SIZE, TREE_STEP, ROCK_STEP, FOOD_STEP } from "../world/MapGenerator";
import { getRoom } from "../network/ColyseusClient";
import { InventoryUI } from "../ui/InventoryUI";
import { ITEM_MAP } from "../ui/itemConfig";
import { MONSTER_CONFIG } from "../monsterConfig";
import { createParticleTexture, playEffect, burstEffect, EFFECT_COLORS, type ParticlePreset } from "../effects/particles";
import { getItemDef } from "../ui/itemConfig";

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
  configId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  currentAnim: string;
  sprites: Map<string, Phaser.GameObjects.Sprite>;
  hpBar: Phaser.GameObjects.Graphics;
  intrinsicEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  statusEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter>;
  activeEffects: Set<string>;
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

interface FoodNodeData {
  id: string;
  type: "mushroom" | "berry_bush";
  x: number;
  y: number;
  isAlive: boolean;
}

interface DroppedItemMsg {
  id:     string;
  itemId: string;
  qty:    number;
  x:      number;
  y:      number;
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
  private myEquipment: Record<string, string> = {};
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private enemies: Map<string, EnemyData> = new Map();
  private resourceSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private resourceData:   Map<string, ResourceNodeData>           = new Map();

  // Tree footprint collision: tile "tx,ty" → set of resource ids (supports overlapping sprites)
  private tileToResources = new Map<string, Set<string>>();

  // Client-side infinite resource generation
  private generatedTreeChunks = new Set<string>();
  private generatedRockChunks = new Set<string>();
  private generatedFoodChunks = new Set<string>();
  private deadTrees = new Set<string>();
  private deadRocks = new Set<string>();
  private deadTreesInitDone = false;
  private deadRocksInitDone = false;
  // Food nodes: id → respawnAt (0 = alive)
  private deadFoodNodes = new Map<string, number>();
  private foodNodeData  = new Map<string, FoodNodeData>();
  private foodSprites   = new Map<string, Phaser.GameObjects.Image>();
  private foodInitDone  = false;

  // Dropped items on the ground
  private droppedItemData    = new Map<string, DroppedItemMsg>();
  private droppedItemSprites = new Map<string, { gfx: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }>();

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

  // Minimap — rendered to the HTML canvas #minimap-canvas in the React sidebar
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapCtx: CanvasRenderingContext2D | null = null;

  private followTarget!: Phaser.GameObjects.Rectangle;
  private playersOnlineText!: Phaser.GameObjects.Text;
  private sessionIdText!: Phaser.GameObjects.Text;
  private playerCount = 1;

  // Inventory
  private inventory = new Map<string, number>();
  private invUI!: InventoryUI;

  // Difficulty / death / zone
  private isDead = false;
  private deathOverlay: Phaser.GameObjects.Container | null = null;
  private deathCountdownTimer: Phaser.Time.TimerEvent | null = null;
  private invincibleUntil = 0; // timestamp ms — player ignores damage until this time
  private afkIndicator: Phaser.GameObjects.Text | null = null;
  private _afkVisibilityHandler: (() => void) | null = null;
  private currentZone: 0 | 1 | 2 | 3 = 0;
  private lastZoneToastZone = -1;
  private zoneBoundaries: [number, number, number] = [500, 1500, 3000];

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
    createParticleTexture(this);

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
    this.actionKeys = this.input.keyboard!.addKeys("SPACE,E,F")  as Record<string, Phaser.Input.Keyboard.Key>;

    // ── Camera — deadzone + lerp follow ───────────────────────────────────
    this.followTarget = this.add.rectangle(this.px, this.py, 1, 1).setAlpha(0);
    this.cameras.main.startFollow(this.followTarget, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(200, 140);

    // ── Fog of war ─────────────────────────────────────────────────────────
    this.fogGraphics = this.add.graphics().setDepth(8);
    this.revealAround(0, 0);

    // ── Minimap — uses the HTML canvas in the React sidebar ───────────────

    // ── UI overlay ─────────────────────────────────────────────────────────
    const ts = { fontSize: "12px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 6, y: 3 } };
    this.playersOnlineText = this.add.text(8, 8, "", ts).setScrollFactor(0).setDepth(20).setVisible(false);
    this.sessionIdText = this.add
      .text(792, 8, this.room?.sessionId ?? "—", { fontSize: "10px", color: "#aaaaaa", backgroundColor: "#00000066", padding: { x: 4, y: 2 } })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(20);

    // ── Inventory UI ────────────────────────────────────────────────────────
    this.invUI = new InventoryUI(this, this.inventory, this.room);

    // ── Multiplayer handlers ────────────────────────────────────────────────
    if (this.room) {
      this.setupMessageHandlers(this.room);
      this._setupAfkDetection(this.room);
    } else {
      // offline/solo: no dead-resource list to wait for
      this.generateTreeChunksAround(0, 0);
      this.generateRockChunksAround(0, 0); // offline: generate immediately (no dead state)
      this.foodInitDone = true;
      this.generateFoodChunksAround(0, 0);
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

  private createEnemySprites(x: number, y: number, tint = 0xffffff, scale = 1.0): Map<string, Phaser.GameObjects.Sprite> {
    const sprites = new Map<string, Phaser.GameObjects.Sprite>();
    for (const tex of ["hunter_idle_down", "hunter_idle_up", "hunter_idle_side", "hunter_walk_down", "hunter_walk_up", "hunter_walk_side", "hunter_pierce_down", "hunter_pierce_up", "hunter_pierce_side"]) {
      const s = this.add.sprite(x, y, tex).setScale(1.5 * scale).setDepth(9).setTint(tint);
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

  private addEnemy(data: { id: string; configId?: string; x: number; y: number; animKey: string; hp: number; maxHp: number }) {
    if (this.enemies.has(data.id)) return;
    const configId = data.configId ?? "hunter";
    const config = MONSTER_CONFIG[configId] ?? MONSTER_CONFIG["hunter"];
    const sprites = this.createEnemySprites(data.x, data.y, config.tint, config.scale);
    const hpBar   = this.add.graphics().setDepth(12);
    const enemy: EnemyData = {
      id: data.id, configId, x: data.x, y: data.y, targetX: data.x, targetY: data.y,
      hp: data.hp, maxHp: data.maxHp, currentAnim: data.animKey, sprites, hpBar,
      statusEmitters: new Map(),
      activeEffects:  new Set(),
    };
    // Intrinsic particle effect (e.g. fire_hunter flames, boss_hunter shadow)
    if (config.particleEffect) {
      const activeSprite = sprites.get("hunter_idle_down")!;
      enemy.intrinsicEmitter = playEffect(this, config.particleEffect as ParticlePreset, data.x, data.y, activeSprite);
    }
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
    // Status effect icons — colored circles above HP bar
    const effects = Array.from(enemy.activeEffects);
    effects.forEach((effect, i) => {
      const color = EFFECT_COLORS[effect as ParticlePreset] ?? 0xffffff;
      const cx = enemy.x - (effects.length - 1) * 7 + i * 14;
      const cy = by - 10;
      g.fillStyle(0x000000, 0.5); g.fillCircle(cx, cy, 6);
      g.fillStyle(color, 1);      g.fillCircle(cx, cy, 5);
    });
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
    enemy.intrinsicEmitter?.destroy();
    enemy.statusEmitters.forEach((e) => e.destroy());
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
    room.onLeave((code) => {
      import("../network/ColyseusClient").then(({ clearRoom }) => clearRoom());
      const cx = this.cameras.main.width / 2;
      const cy = this.cameras.main.height / 2;
      this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.85).setDepth(2000).setScrollFactor(0);
      const box = this.add.rectangle(cx, cy, 460, 200, 0x0d0d1a).setDepth(2001).setScrollFactor(0);
      box.setStrokeStyle(1, 0xff4444);
      this.add.text(cx, cy - 60, "ROZŁĄCZONO OD SERWERA", { fontFamily: "Courier New", fontSize: "11px", color: "#ff4444", letterSpacing: 3 }).setOrigin(0.5).setDepth(2002).setScrollFactor(0);
      this.add.text(cx, cy - 25, `Połączenie zostało przerwane (kod: ${code}).\nOdśwież stronę, aby ponownie się połączyć.`, { fontFamily: "Courier New", fontSize: "12px", color: "#a9a9c2", align: "center", lineSpacing: 6 }).setOrigin(0.5).setDepth(2002).setScrollFactor(0);
      const btn = this.add.text(cx, cy + 55, "[ ODŚWIEŻ ]", { fontFamily: "Courier New", fontSize: "13px", color: "#00e3fd" }).setOrigin(0.5).setDepth(2002).setScrollFactor(0).setInteractive({ useHandCursor: true });
      btn.on("pointerup", () => window.location.reload());
    });

    room.onMessage("session_taken_over", () => {
      // Another tab/browser took over this session — freeze the game and show overlay
      this.physics?.pause();
      const cx = this.cameras.main.width / 2;
      const cy = this.cameras.main.height / 2;
      const overlay = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.85).setDepth(1000).setScrollFactor(0);
      const box = this.add.rectangle(cx, cy, 420, 180, 0x0d0d1a).setDepth(1001).setScrollFactor(0);
      box.setStrokeStyle(1, 0x00e3fd);
      this.add.text(cx, cy - 50, "SESJA PRZEJĘTA", { fontFamily: "Courier New", fontSize: "11px", color: "#00e3fd", letterSpacing: 3 }).setOrigin(0.5).setDepth(1002).setScrollFactor(0);
      this.add.text(cx, cy - 15, "Twoja sesja została przejęta\nprzez inne okno przeglądarki.", { fontFamily: "Courier New", fontSize: "13px", color: "#ffffff", align: "center" }).setOrigin(0.5).setDepth(1002).setScrollFactor(0);
      const btn = this.add.text(cx, cy + 40, "[ WRÓĆ DO MENU ]", { fontFamily: "Courier New", fontSize: "13px", color: "#00e3fd" }).setOrigin(0.5).setDepth(1002).setScrollFactor(0).setInteractive({ useHandCursor: true });
      btn.on("pointerup", () => { window.location.href = "/"; });
    });

    room.onMessage("players_init", (players: Array<{ sessionId: string; x: number; y: number; animKey: string; nickname: string }>) => {
      players.forEach((p) => this.addRemotePlayer(p.sessionId, p));
      this.playerCount = 1 + players.length;
      this.playersOnlineText.setText(`Players online: ${this.playerCount}`);
      window.dispatchEvent(new CustomEvent("gameRoomInfo", { detail: { playerCount: this.playerCount, roomId: room.roomId } }));
    });

    room.onMessage("spawn_at", (data: { x: number; y: number }) => {
      this.px = data.x;
      this.py = data.y;
      this.sprites.forEach((s) => { s.x = this.px; s.y = this.py; });
      this.toolSprites.forEach((s) => { s.x = this.px; s.y = this.py; });
      this.followTarget.setPosition(this.px, this.py);
      // Regenerate resources around new spawn position (only when dead-state lists are ready)
      const tileX = Math.floor(this.px / TILE_SIZE);
      const tileY = Math.floor(this.py / TILE_SIZE);
      if (this.deadTreesInitDone) this.generateTreeChunksAround(tileX, tileY);
      if (this.deadRocksInitDone) this.generateRockChunksAround(tileX, tileY);
      if (this.foodInitDone) this.generateFoodChunksAround(tileX, tileY);
    });

    room.onMessage("fog_load", (tiles: string[]) => {
      if (Array.isArray(tiles)) {
        tiles.forEach((t) => this.discovered.add(t));
      }
    });

    room.send("request_players", {});

    // Send newly discovered fog tiles to server every 15 seconds
    let lastFogSnapshot = new Set<string>();
    this.time.addEvent({
      delay: 15_000,
      loop: true,
      callback: () => {
        const newTiles: string[] = [];
        this.discovered.forEach((t) => { if (!lastFogSnapshot.has(t)) newTiles.push(t); });
        if (newTiles.length > 0) {
          room.send("fog_update", newTiles);
          newTiles.forEach((t) => lastFogSnapshot.add(t));
        }
      },
    });

    room.onMessage("player_add", (p: { sessionId: string; x: number; y: number; animKey: string; nickname: string }) => {
      this.addRemotePlayer(p.sessionId, p);
      this.playerCount++;
      this.playersOnlineText.setText(`Players online: ${this.playerCount}`);
      window.dispatchEvent(new CustomEvent("gameRoomInfo", { detail: { playerCount: this.playerCount, roomId: room.roomId } }));
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
      window.dispatchEvent(new CustomEvent("gameRoomInfo", { detail: { playerCount: this.playerCount, roomId: room.roomId } }));
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
      this.deadTreesInitDone = true;
      this.generateTreeChunksAround(Math.floor(this.px / TILE_SIZE), Math.floor(this.py / TILE_SIZE));
    });
    room.send("request_dead_trees", {});

    // Rocks: same — wait for dead list before generating
    room.onMessage("dead_rocks_init", (ids: string[]) => {
      ids.forEach((id) => this.deadRocks.add(id));
      this.deadRocksInitDone = true;
      this.generateRockChunksAround(Math.floor(this.px / TILE_SIZE), Math.floor(this.py / TILE_SIZE));
    });
    room.send("request_dead_rocks", {});

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

    // Food nodes (mushrooms, berry bushes) — client-side generated, server tracks dead state
    room.onMessage("dead_food_init", (deadList: Array<{ id: string; respawnAt: number }>) => {
      deadList.forEach(({ id, respawnAt }) => this.deadFoodNodes.set(id, respawnAt));
      this.foodInitDone = true;
      // Generate around current player position (not origin) — fixes missing food after spawn_at
      this.generateFoodChunksAround(Math.floor(this.px / TILE_SIZE), Math.floor(this.py / TILE_SIZE));
    });
    room.send("request_dead_food", {});

    room.onMessage("food_dead", (data: { id: string; respawnAt: number }) => {
      this.deadFoodNodes.set(data.id, data.respawnAt);
      const fn = this.foodNodeData.get(data.id);
      if (fn && fn.isAlive) { fn.isAlive = false; this.killFoodSprite(data.id); }
    });

    room.onMessage("food_respawn", (data: { id: string }) => {
      this.deadFoodNodes.delete(data.id);
      const fn = this.foodNodeData.get(data.id);
      if (fn) {
        fn.isAlive = true;
        this.spawnFoodSprite(fn);
      }
    });

    room.onMessage("enemy_update", (data: { id: string; configId?: string; x: number; y: number; animKey: string; hp: number; maxHp: number }) => {
      const enemy = this.enemies.get(data.id);
      if (!enemy) {
        this.addEnemy({ id: data.id, configId: data.configId, x: data.x, y: data.y, animKey: data.animKey, hp: data.hp, maxHp: data.maxHp });
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

    room.onMessage("enemy_loot", (data: { itemId: string; itemName: string; rarity: string; x: number; y: number }) => {
      const color = data.rarity === "rare" ? "#FFD700" : data.rarity === "uncommon" ? "#44ff88" : "#ffffff";
      this.showPickupText(data.x, data.y - 32, `+ ${data.itemName}`, color);
    });

    room.onMessage("player_damage", (data: { damage: number; hp: number }) => {
      this.showPickupText(this.px, this.py - 50, `-${data.damage} HP`);
    });

    room.onMessage("player_death", (data: { sessionId: string; nickname: string; droppedItems: string[]; x: number; y: number }) => {
      // Only show death overlay for own player
      if (this.room && data.sessionId === (this.room as any).sessionId) {
        this.isDead = true;
        this._showDeathOverlay();
      } else {
        // Show death notification in event log for other players
        window.dispatchEvent(new CustomEvent("gameRoomEvent", { detail: {
          id: `death_${Date.now()}`, type: "death",
          playerName: data.nickname, message: `☠ ${data.nickname} zginął(a)`, timestamp: Date.now(),
        }}));
      }
    });

    room.onMessage("player_respawn", (data: { x: number; y: number; hp: number }) => {
      this.isDead = false;
      this._hideDeathOverlay();
      this.px = data.x;
      this.py = data.y;
      this.sprites.forEach((s) => { s.x = this.px; s.y = this.py; });
      this.showPickupText(this.px, this.py - 50, "Odrodzono przy ognisku", "#4ade80");

      // 3-second post-respawn invincibility
      const INVINCIBILITY_MS = 3000;
      this.invincibleUntil = Date.now() + INVINCIBILITY_MS;
      this._showInvincibilityIndicator(INVINCIBILITY_MS);
      // Blink player sprites during invincibility window
      this.sprites.forEach((s) => {
        this.tweens.add({ targets: s, alpha: 0.3, duration: 150, yoyo: true, repeat: 9,
          onComplete: () => { if (s.active) s.setAlpha(1); } });
      });
    });

    room.onMessage("difficulty_increase", (data: { level: number; name: string; color: string }) => {
      this._showZoneToast(`⬆ Poziom trudności: ${data.name}`, data.color, 5000);
    });

    room.onMessage("room_event", (data: { id: string; type: string; playerName: string; message: string; timestamp: number }) => {
      window.dispatchEvent(new CustomEvent("gameRoomEvent", { detail: data }));
    });

    room.onMessage("rule_message", (data: { text: string }) => {
      window.dispatchEvent(new CustomEvent("gameRoomEvent", { detail: {
        id: `rule_${Date.now()}`, type: "rule", playerName: "⚙ System", message: data.text, timestamp: Date.now(),
      }}));
    });

    room.onMessage("mod_submitted", (data: { modId: string; name: string; createdBy: string }) => {
      window.dispatchEvent(new CustomEvent("gameRoomEvent", { detail: {
        id: `mod_${Date.now()}`, type: "mod_submitted",
        playerName: data.createdBy,
        message: `🔧 ${data.createdBy} zgłosił "${data.name}" do głosowania → /forge/vote/${data.modId}`,
        timestamp: Date.now(),
      }}));
    });

    room.onMessage("stats_update", (data: { hp: number; maxHp: number; hunger: number; sanity: number; attack: number; defense: number; nickname: string; isNight: boolean; worldTime: number; equipment?: Record<string, string> }) => {
      window.dispatchEvent(new CustomEvent("gameStats", { detail: data }));
      if (data.equipment) { this.myEquipment = data.equipment; this.invUI.updateEquipment(data.equipment); }
    });

    room.onMessage("enemy_status_update", (data: { id: string; effects: Record<string, number> }) => {
      const enemy = this.enemies.get(data.id);
      if (!enemy) return;
      const now = Date.now();
      const activeKeys = new Set(Object.keys(data.effects).filter(k => data.effects[k] > now));
      // Start emitters for new effects
      activeKeys.forEach((effect) => {
        if (!enemy.statusEmitters.has(effect)) {
          const activeSprite = enemy.sprites.get("hunter_idle_down")!;
          const emitter = playEffect(this, effect as ParticlePreset, enemy.x, enemy.y, activeSprite);
          enemy.statusEmitters.set(effect, emitter);
        }
      });
      // Remove emitters for expired effects
      enemy.statusEmitters.forEach((emitter, effect) => {
        if (!activeKeys.has(effect)) { emitter.destroy(); enemy.statusEmitters.delete(effect); }
      });
      enemy.activeEffects = activeKeys;
    });

    room.onMessage("inventory_load", (items: string[]) => {
      // Convert flat array ["wood","wood","stone"] → Map {wood:2, stone:1}
      this.inventory.clear();
      for (const item of items) {
        this.inventory.set(item, (this.inventory.get(item) ?? 0) + 1);
      }
      this.invUI.refresh();
    });

    room.onMessage("dropped_items_init", (drops: DroppedItemMsg[]) => {
      drops.forEach((d) => this.spawnDroppedItemSprite(d));
    });

    room.onMessage("item_dropped", (data: DroppedItemMsg) => {
      this.spawnDroppedItemSprite(data);
    });

    room.onMessage("item_removed", (data: { id: string }) => {
      this.removeDroppedItemSprite(data.id);
    });
  }

  // ── Inventory ─────────────────────────────────────────────────────────────

  private addItems(drops: Array<{ item: string; qty: number }>) {
    const parts: string[] = [];
    for (const { item, qty } of drops) {
      this.inventory.set(item, (this.inventory.get(item) ?? 0) + qty);
      parts.push(`+${qty} ${item.charAt(0).toUpperCase() + item.slice(1)}`);
    }
    this.invUI.refresh();
    if (parts.length) this.showPickupText(this.px, this.py - 50, parts.join("  "));
  }

  private showPickupText(x: number, y: number, msg: string, color = "#ffdd44") {
    const t = this.add.text(x, y, msg, {
      fontSize: "12px",
      color,
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
    // Generate synthetic food textures (16×16 px, 2× scale = 32px on screen)
    if (!this.textures.exists("food_mushroom")) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x884422, 1); g.fillRect(6, 10, 4, 6); // stem
      g.fillStyle(0x44aa22, 1); g.fillCircle(8, 8, 7);   // cap
      g.fillStyle(0xffffff, 0.3); g.fillCircle(5, 6, 2); // highlight
      g.generateTexture("food_mushroom", 16, 16);
      g.destroy();
    }
    if (!this.textures.exists("food_berry")) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x226622, 1); g.fillCircle(8, 9, 7);   // bush
      g.fillStyle(0xdd3344, 1);
      g.fillCircle(5, 7, 2.5);  // berries
      g.fillCircle(10, 6, 2);
      g.fillCircle(8, 12, 2.5);
      g.generateTexture("food_berry", 16, 16);
      g.destroy();
    }
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

  /** Spawn food sprites for all FOOD_STEP-chunks within vision radius of (tileX, tileY). */
  private generateFoodChunksAround(tileX: number, tileY: number) {
    const chunkRadius = Math.ceil(VISION_RADIUS / FOOD_STEP) + 2;
    const playerCX = Math.floor(tileX / FOOD_STEP);
    const playerCY = Math.floor(tileY / FOOD_STEP);

    for (let cy = playerCY - chunkRadius; cy <= playerCY + chunkRadius; cy++) {
      for (let cx = playerCX - chunkRadius; cx <= playerCX + chunkRadius; cx++) {
        const key = `${cx},${cy}`;
        if (this.generatedFoodChunks.has(key)) continue;
        this.generatedFoodChunks.add(key);

        const result = foodAtChunk(cx, cy, this.mapSeed);
        if (!result) continue;

        const { wx, wy, type } = result;
        const prefix = type === "mushroom" ? "mush" : "berry";
        const id = `${prefix}_${cx}_${cy}`;
        const x = wx * TILE_SIZE + TILE_SIZE / 2;
        const y = wy * TILE_SIZE + TILE_SIZE / 2;
        const isAlive = !this.deadFoodNodes.has(id);
        const fn: FoodNodeData = { id, type, x, y, isAlive };
        this.foodNodeData.set(id, fn);
        if (isAlive) this.spawnFoodSprite(fn);
      }
    }
  }

  private spawnFoodSprite(fn: FoodNodeData) {
    if (this.foodSprites.has(fn.id)) return;
    const texKey = fn.type === "mushroom" ? "food_mushroom" : "food_berry";
    const sprite = this.add.image(fn.x, fn.y, texKey)
      .setScale(2)
      .setDepth(2)
      .setVisible(false); // visibility managed in update
    this.foodSprites.set(fn.id, sprite);
  }

  private killFoodSprite(id: string) {
    const sprite = this.foodSprites.get(id);
    if (sprite) { sprite.destroy(); this.foodSprites.delete(id); }
  }

  private spawnDroppedItemSprite(data: DroppedItemMsg) {
    if (this.droppedItemSprites.has(data.id)) return;
    this.droppedItemData.set(data.id, data);
    const def   = ITEM_MAP[data.itemId];
    const color = def ? Phaser.Display.Color.HexStringToColor(def.color).color : 0xffffff;
    const symbol = def?.symbol ?? "?";

    const gfx = this.add.graphics().setDepth(4);
    gfx.fillStyle(color, 0.7);
    gfx.fillCircle(data.x, data.y, 10);
    gfx.lineStyle(2, 0xffffff, 0.9);
    gfx.strokeCircle(data.x, data.y, 10);
    gfx.setVisible(false);

    const label = this.add.text(data.x, data.y - 16, symbol, {
      fontSize: "9px", color: "#ffffff", stroke: "#000000", strokeThickness: 2, fontStyle: "bold",
    }).setOrigin(0.5).setDepth(5).setVisible(false);

    this.droppedItemSprites.set(data.id, { gfx, label });
  }

  private removeDroppedItemSprite(id: string) {
    const s = this.droppedItemSprites.get(id);
    if (!s) return;
    s.gfx.destroy();
    s.label.destroy();
    this.droppedItemSprites.delete(id);
    this.droppedItemData.delete(id);
  }

  /** Find nearest dropped item within 48px pickup range. */
  private findNearestDrop(): string | null {
    const REACH = 48;
    let best: string | null = null;
    let bestDistSq = REACH * REACH;
    for (const [id, data] of this.droppedItemData) {
      const dx = data.x - this.px;
      const dy = data.y - this.py;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDistSq) { bestDistSq = dSq; best = id; }
    }
    return best;
  }

  /** Find nearest alive food node within harvest reach (48px) in facing direction. */
  private findAdjacentFood(): string | null {
    const REACH = 48;
    for (const [id, fn] of this.foodNodeData) {
      if (!fn.isAlive) continue;
      const dx = fn.x - this.px;
      const dy = fn.y - this.py;
      if (dx * dx + dy * dy > REACH * REACH) continue;
      // Check it's roughly in front
      const inFront =
        (this.direction === "right" && dx > -16) ||
        (this.direction === "left"  && dx < 16)  ||
        (this.direction === "down"  && dy > -16) ||
        (this.direction === "up"    && dy < 16);
      if (inFront) return id;
    }
    return null;
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

  // ── Minimap — draws to #minimap-canvas in the React sidebar ─────────────

  private drawMinimap(playerTileX: number, playerTileY: number) {
    const MW = 160; const MH = 120;
    const SCALE = 4; // 1 minimap px = SCALE world tiles

    // Emit position for X/Y display in the sidebar
    window.dispatchEvent(new CustomEvent("gamePosition", { detail: { x: playerTileX, y: playerTileY } }));

    // Lazy-acquire canvas reference (DOM lookup once, then cached)
    if (!this.minimapCanvas) {
      this.minimapCanvas = document.getElementById("minimap-canvas") as HTMLCanvasElement | null;
      this.minimapCtx = this.minimapCanvas?.getContext("2d") ?? null;
    }
    const ctx = this.minimapCtx;
    if (!ctx) return;

    // Build pixel data in one pass (terrain + fog combined) for performance
    const imageData = ctx.createImageData(MW, MH);
    const d = imageData.data;

    for (let my = 0; my < MH; my++) {
      for (let mx = 0; mx < MW; mx++) {
        const tx = Math.floor(playerTileX + (mx - MW / 2) * SCALE);
        const ty = Math.floor(playerTileY + (my - MH / 2) * SCALE);
        const i = (my * MW + mx) * 4;
        if (!this.discovered.has(`${tx},${ty}`)) {
          // Undiscovered — black
          d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 217;
          continue;
        }
        const dtx = tx - playerTileX; const dty = ty - playerTileY;
        const inVision = dtx * dtx + dty * dty <= VISION_RADIUS * VISION_RADIUS;
        const forest = isForestTile(tx, ty, this.mapSeed);
        // Dim discovered-but-fogged tiles
        const bright = inVision ? 1 : 0.35;
        d[i]     = Math.round((forest ? 0x1a : 0x2a) * bright);
        d[i + 1] = Math.round((forest ? 0x6a : 0x4a) * bright);
        d[i + 2] = Math.round((forest ? 0x1a : 0x2a) * bright);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Resources (alive, discovered)
    this.resourceData.forEach((rd) => {
      if (!rd.isAlive) return;
      const mx = Math.round(MW / 2 + (rd.x / TILE_SIZE - playerTileX) / SCALE);
      const my = Math.round(MH / 2 + (rd.y / TILE_SIZE - playerTileY) / SCALE);
      if (mx < 1 || mx >= MW - 1 || my < 1 || my >= MH - 1) return;
      if (!this.discovered.has(`${Math.floor(rd.x / TILE_SIZE)},${Math.floor(rd.y / TILE_SIZE)}`)) return;
      ctx.fillStyle = rd.type === "tree" ? "#44cc44" : "#888888";
      ctx.fillRect(mx, my, 2, 2);
    });


    // Remote players
    this.remotePlayers.forEach((remote) => {
      const mx = Math.round(MW / 2 + (remote.x / TILE_SIZE - playerTileX) / SCALE);
      const my = Math.round(MH / 2 + (remote.y / TILE_SIZE - playerTileY) / SCALE);
      if (mx < 1 || mx >= MW - 1 || my < 1 || my >= MH - 1) return;
      ctx.fillStyle = "#4488ff";
      ctx.fillRect(mx, my, 3, 3);
    });

    // Local player — always center
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(MW / 2 - 1, MH / 2 - 1, 3, 3);

    // Orange border
    ctx.strokeStyle = "rgba(255,140,0,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MW, MH);
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

    // Skip input processing while dead
    if (this.isDead) return;

    // Zone transition check (every frame, cheap Math.hypot)
    this._checkZoneTransition();

    // Action keys
    const eJustDown        = Phaser.Input.Keyboard.JustDown(this.actionKeys["E"]);
    const fJustDown        = Phaser.Input.Keyboard.JustDown(this.actionKeys["F"]);
    // Inventory UI handles I/1-8/E; must run before harvest to consume E if panel open
    const eConsumedByUI = this.invUI.handleInput();
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
      if (closest && this.room) {
        this.room.send("attack_enemy", { enemyId: (closest as EnemyData).id });
        // Weapon particle burst
        const weaponId = this.myEquipment["weapon"];
        const def = weaponId ? getItemDef(weaponId) : undefined;
        if (def?.particleEffect) {
          const REACH = 40;
          const ax = this.px + (this.direction === "right" ? REACH : this.direction === "left" ? -REACH : 0);
          const ay = this.py + (this.direction === "down"  ? REACH : this.direction === "up"   ? -REACH : 0);
          burstEffect(this, def.particleEffect as ParticlePreset, ax, ay);
        }
      }
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
      if (this.foodInitDone || !this.room) this.generateFoodChunksAround(tileX, tileY);
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

    // Food node visibility
    this.foodNodeData.forEach((fn, id) => {
      const sprite = this.foodSprites.get(id);
      if (!sprite) return;
      const dx = fn.x - this.px;
      const dy = fn.y - this.py;
      sprite.setVisible(fn.isAlive && (dx * dx + dy * dy) <= visionPxSq);
    });

    // Dropped item visibility
    this.droppedItemData.forEach((data, id) => {
      const s = this.droppedItemSprites.get(id);
      if (!s) return;
      const dx = data.x - this.px;
      const dy = data.y - this.py;
      const visible = dx * dx + dy * dy <= visionPxSq;
      s.gfx.setVisible(visible);
      s.label.setVisible(visible);
    });

    // E key: pickup dropped item (highest priority), then harvest tree/rock/food
    if (eJustDown && !this.isActionPlaying && !eConsumedByUI) {
      const dropId = this.findNearestDrop();
      if (dropId && this.room) {
        this.room.send("pickup_item", { id: dropId });
        const def = ITEM_MAP[this.droppedItemData.get(dropId)?.itemId ?? ""];
        this.showPickupText(this.px, this.py - 50, `+ ${def?.name ?? dropId}`, "#88ddff");
        this.removeDroppedItemSprite(dropId); // optimistic local removal
      } else {
      const harvestId = this.findAdjacentResource(tileX, tileY) ?? this.findAdjacentFood();
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
        } else if (harvestId.startsWith("mush_") || harvestId.startsWith("berry_")) {
          const fn = this.foodNodeData.get(harvestId);
          if (fn && fn.isAlive) { fn.isAlive = false; this.killFoodSprite(harvestId); }
        }
        if (this.room) {
          this.room.send("harvest", { id: harvestId });
        } else {
          // Offline mode: give items locally
          if (harvestId.startsWith("tree_"))        this.addItems([{ item: "wood",     qty: 2 + Math.floor(Math.random() * 3) }]);
          else if (harvestId.startsWith("rock_"))   this.addItems([{ item: "stone",    qty: 1 + Math.floor(Math.random() * 2) }]);
          else if (harvestId.startsWith("mush_"))   this.addItems([{ item: "mushroom", qty: 1 }]);
          else if (harvestId.startsWith("berry_"))  this.addItems([{ item: "berries",  qty: 2 }]);
        }
        this.playActionAnim("collect");
      }
      } // else (no drop nearby)
    }

    // F key: eat first available food
    if (fJustDown) {
      this.invUI.eatFirst((itemId) => {
        this.showPickupText(this.px, this.py - 50, `Zjedono: ${itemId.replace("_", " ")}`);
      });
    }
    if (eConsumedByUI) return;

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
  // ── Death overlay ─────────────────────────────────────────────────────────

  private _showDeathOverlay(): void {
    if (this.deathOverlay) return;
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const bg = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.65)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(200);
    const skull = this.add.text(cx, cy - 40, "☠", { fontSize: "48px", color: "#f87171" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(201);
    const msg = this.add.text(cx, cy + 20, "Poleciałeś...", {
      fontSize: "14px", color: "#e4e3fe",
      fontFamily: "var(--font-pixel), 'Press Start 2P', monospace",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    const countdown = this.add.text(cx, cy + 55, "Odrodzenie za 3...", {
      fontSize: "10px", color: "#a9a9c2",
      fontFamily: "var(--font-pixel), 'Press Start 2P', monospace",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.deathOverlay = this.add.container(0, 0, [bg, skull, msg, countdown]).setDepth(200);

    let count = 3;
    this.deathCountdownTimer = this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        if (!this.deathOverlay) return; // overlay already destroyed — stop silently
        count--;
        if (count > 0) countdown.setText(`Odrodzenie za ${count}...`);
        else countdown.setText("Odrodzono!");
      },
    });
  }

  private _setupAfkDetection(room: Room): void {
    const sendAfk = (isAfk: boolean) => {
      try { room.send("afk", { isAfk }); } catch { /* room may be closed */ }
    };

    this._afkVisibilityHandler = () => {
      const hidden = document.hidden;
      sendAfk(hidden);
      if (hidden) {
        if (!this.afkIndicator) {
          const cx = this.cameras.main.width / 2;
          this.afkIndicator = this.add.text(cx, 32, "💤 AFK — OCHRONA AKTYWNA", {
            fontSize: "9px", color: "#facc15",
            fontFamily: "var(--font-pixel), 'Press Start 2P', monospace",
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: { x: 8, y: 4 },
          }).setOrigin(0.5).setScrollFactor(0).setDepth(190);
        }
      } else {
        if (this.afkIndicator) { this.afkIndicator.destroy(); this.afkIndicator = null; }
      }
    };

    document.addEventListener("visibilitychange", this._afkVisibilityHandler);

    // Clean up listener when scene shuts down and notify server
    this.events.once(Phaser.Core.Events.DESTROY, () => {
      if (this._afkVisibilityHandler) {
        document.removeEventListener("visibilitychange", this._afkVisibilityHandler);
        this._afkVisibilityHandler = null;
      }
      sendAfk(true); // leaving /game = AFK
    });
  }

  private _showInvincibilityIndicator(durationMs: number): void {
    const cx = this.cameras.main.width / 2;
    const shield = this.add.text(cx, 32, "🛡 NIETYKALNY", {
      fontSize: "9px", color: "#4ade80",
      fontFamily: "var(--font-pixel), 'Press Start 2P', monospace",
      backgroundColor: "rgba(0,0,0,0.6)",
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(190).setAlpha(1);

    // Blink in last second, then destroy
    this.time.delayedCall(durationMs - 1000, () => {
      if (!shield.active) return;
      this.tweens.add({
        targets: shield,
        alpha: 0,
        duration: 200,
        yoyo: true,
        repeat: 4,
        onComplete: () => { if (shield.active) shield.destroy(); },
      });
    });
    this.time.delayedCall(durationMs, () => { if (shield.active) shield.destroy(); });
  }

  private _hideDeathOverlay(): void {
    if (this.deathCountdownTimer) {
      this.deathCountdownTimer.destroy();
      this.deathCountdownTimer = null;
    }
    if (!this.deathOverlay) return;
    this.deathOverlay.destroy();
    this.deathOverlay = null;
  }

  // ── Zone toast ────────────────────────────────────────────────────────────

  private _showZoneToast(message: string, color: string, duration = 3000): void {
    const cx = this.cameras.main.width / 2;
    const toastBg = this.add.rectangle(cx, 70, 320, 36, 0x0b0c1f, 0.92)
      .setScrollFactor(0).setDepth(150);
    const toastBorder = this.add.rectangle(cx, 70, 320, 36)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(color).color, 1)
      .setScrollFactor(0).setDepth(150).setFillStyle(0, 0);
    const toastText = this.add.text(cx, 70, message, {
      fontSize: "9px", color,
      fontFamily: "var(--font-pixel), 'Press Start 2P', monospace",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(151);

    this.time.delayedCall(duration, () => {
      toastBg.destroy(); toastBorder.destroy(); toastText.destroy();
    });
  }

  /** Called from update — checks if player crossed a zone boundary. */
  private _checkZoneTransition(): void {
    const dist = Math.hypot(this.px, this.py);
    const [z1, z2, z3] = this.zoneBoundaries;
    let zone: 0 | 1 | 2 | 3;
    if      (dist < z1) zone = 0;
    else if (dist < z2) zone = 1;
    else if (dist < z3) zone = 2;
    else                zone = 3;

    if (zone !== this.currentZone) {
      this.currentZone = zone;
      if (zone !== this.lastZoneToastZone) {
        this.lastZoneToastZone = zone;
        const zoneNames = ["Bezpieczna strefa", "Strefa 1 — Niebezpiecznie", "Strefa 2 — Groźnie", "Strefa 3 — Śmiertelnie"];
        const zoneColors = ["#4caf50", "#ffcc00", "#ff9800", "#f44336"];
        this._showZoneToast(`⚠ ${zoneNames[zone]}`, zoneColors[zone]);
        // Notify server for on_zone_enter rule trigger
        this.room?.send("zone_enter", { zone });
      }
    }
  }

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
