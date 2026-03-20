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
import { generateMap, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, type GeneratedMap } from "../world/MapGenerator";
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

// Map animation key → texture key + flip
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

const SPEED = 100; // px/s
const SEND_INTERVAL = 50; // ms

// Direction → tool texture suffix + flipX
const DIR_TO_TOOL: Record<Direction, { suffix: string; flipX: boolean }> = {
  down:  { suffix: "down", flipX: false },
  up:    { suffix: "up",   flipX: false },
  left:  { suffix: "side", flipX: true  },
  right: { suffix: "side", flipX: false },
};

export class PlayScene extends Scene {
  private sprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private toolSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private actionKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private direction: Direction = "down";
  private currentAnim = "idle_down";
  private lastSentAt = 0;
  private room: Room | null = null;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private isActionPlaying = false;
  private playersOnlineText!: Phaser.GameObjects.Text;
  private sessionIdText!: Phaser.GameObjects.Text;
  private playerCount = 1;
  private generatedMap: GeneratedMap | null = null;
  private followTarget!: Phaser.GameObjects.Rectangle;

  // Player world position (starts at map center)
  private px = MAP_WIDTH / 2 * TILE_SIZE;
  private py = MAP_HEIGHT / 2 * TILE_SIZE;

  constructor() {
    super({ key: "PlayScene" });
  }

  preload() {
    this.load.on("loaderror", (file: { src: string }) => {
      console.error("Load error:", file.src);
    });

    // Load as plain image for tilemap (not spritesheet)
    this.load.image("fairy_tiles", "/assets/test/tiles.png");

    const cfg = { frameWidth: 64, frameHeight: 64 };
    this.load.spritesheet("idle_down",  "/assets/player/idle_down.png",  cfg);
    this.load.spritesheet("idle_up",    "/assets/player/idle_up.png",    cfg);
    this.load.spritesheet("idle_side",  "/assets/player/idle_side.png",  cfg);
    this.load.spritesheet("walk_down",  "/assets/player/walk_down.png",  cfg);
    this.load.spritesheet("walk_up",    "/assets/player/walk_up.png",    cfg);
    this.load.spritesheet("walk_side",  "/assets/player/walk_side.png",  cfg);

    preloadToolSprites(this);
  }

  create() {
    // Procedural map — seed from server (same for all players in room)
    const seed = (this.room as any)?.state?.mapSeed ?? (getRoom() as any)?.state?.mapSeed ?? 42;
    this.generatedMap = generateMap(seed);

    const map = this.make.tilemap({
      data: this.generatedMap.groundData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage("fairy_tiles", "fairy_tiles", TILE_SIZE, TILE_SIZE, 0, 0);
    map.createLayer(0, tileset!, 0, 0);

    // Forest overlay — dark green rectangles over blocked tiles
    // (replaced by tree sprites in Wieczór 13)
    const forestGfx = this.add.graphics();
    forestGfx.fillStyle(0x0d2b0d, 0.75);
    const col = this.generatedMap.collisionMap;
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (col[y][x]) {
          forestGfx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Camera bounds + follow target (invisible rectangle used for startFollow)
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    this.followTarget = this.add.rectangle(this.px, this.py, 1, 1).setAlpha(0).setScrollFactor(1);
    this.cameras.main.startFollow(this.followTarget, true);
    this.cameras.main.centerOn(this.px, this.py); // initial snap

    // Animations
    createPlayerAnimations(this);
    createToolAnimations(this);

    // One sprite per texture — all at start position, only one visible at a time
    for (const key of Object.keys(ANIM_MAP)) {
      const { texture } = ANIM_MAP[key];
      if (!this.sprites.has(texture)) {
        const s = this.add.sprite(this.px, this.py, texture);
        s.setScale(1.5);
        s.setVisible(false);
        this.sprites.set(texture, s);
      }
    }

    this.playAnim("idle_down");

    // Tool sprites — one per action+dir texture, layered on top, all hidden
    for (const action of ACTION_TYPES) {
      for (const dir of ACTION_DIRS) {
        const key = `${action}_${dir}`;
        const s = this.add.sprite(this.px, this.py, key);
        s.setScale(1.5);
        s.setVisible(false);
        s.setDepth(1);
        this.toolSprites.set(key, s);
      }
    }

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.actionKeys = this.input.keyboard!.addKeys("SPACE,E") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    // Colyseus room (already connected via PhaserGame.tsx)
    this.room = getRoom();

    // Overlay — fixed to camera, depth 10
    const textStyle = { fontSize: "12px", color: "#ffffff", backgroundColor: "#00000088", padding: { x: 6, y: 3 } };
    this.playersOnlineText = this.add.text(8, 8, "Players online: 1", textStyle).setScrollFactor(0).setDepth(10);
    this.sessionIdText = this.add.text(792, 8, this.room?.sessionId ?? "—", { fontSize: "10px", color: "#aaaaaa", backgroundColor: "#00000066", padding: { x: 4, y: 2 } }).setOrigin(1, 0).setScrollFactor(0).setDepth(10);

    if (this.room) {
      this.setupMessageHandlers(this.room);
    }
  }

  private createRemoteSprites(x: number, y: number): Map<string, Phaser.GameObjects.Sprite> {
    const textures = ["idle_down", "idle_up", "idle_side", "walk_down", "walk_up", "walk_side"];
    const sprites = new Map<string, Phaser.GameObjects.Sprite>();
    for (const tex of textures) {
      const s = this.add.sprite(x, y, tex);
      s.setScale(1.5);
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
      if (visible) {
        s.setFlipX(flipX);
        s.play(animKey, true);
      }
    });
  }

  private addRemotePlayer(sessionId: string, data: { x: number; y: number; animKey: string; nickname: string }) {
    if (this.remotePlayers.has(sessionId)) return;
    const sprites = this.createRemoteSprites(data.x, data.y);
    const label = this.add.text(data.x, data.y - 52, data.nickname ?? sessionId, {
      fontSize: "8px",
      color: "#ffffff",
      backgroundColor: "#00000088",
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5);
    const remote: RemotePlayer = {
      sprites,
      label,
      x: data.x,
      y: data.y,
      targetX: data.x,
      targetY: data.y,
      currentAnim: data.animKey ?? "idle_down",
    };
    this.remotePlayers.set(sessionId, remote);
    this.playRemoteAnim(remote, remote.currentAnim);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setupMessageHandlers(room: Room) {
    room.onMessage("players_init", (players: Array<{ sessionId: string; x: number; y: number; animKey: string; nickname: string }>) => {
      players.forEach((p) => this.addRemotePlayer(p.sessionId, p));
      this.playerCount = 1 + players.length;
      this.playersOnlineText.setText(`Players online: ${this.playerCount}`);
    });

    // Request current players now that handlers are ready
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
      if (data.animKey !== remote.currentAnim) {
        this.playRemoteAnim(remote, data.animKey);
      }
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
  }

  private playActionAnim(action: ActionType) {
    if (this.isActionPlaying) return;
    const { suffix, flipX } = DIR_TO_TOOL[this.direction];
    const key = `${action}_${suffix}`;
    const sprite = this.toolSprites.get(key);
    if (!sprite) return;

    this.isActionPlaying = true;
    // Hide body sprites during action — tool sheet includes the full character
    this.sprites.forEach((s) => s.setVisible(false));
    this.toolSprites.forEach((s) => s.setVisible(false));
    sprite.setFlipX(flipX);
    sprite.setVisible(true);
    sprite.play(key);

    sprite.once("animationcomplete", () => {
      sprite.setVisible(false);
      this.isActionPlaying = false;
      // Restore body sprite
      this.playAnim(this.currentAnim);
    });

    if (this.room) {
      this.room.send("action", { type: action, x: this.px, y: this.py });
    }
  }

  update(time: number, delta: number) {
    const dt = delta / 1000;

    // Action keys (one-shot, not repeating)
    if (Phaser.Input.Keyboard.JustDown(this.actionKeys["SPACE"])) {
      this.playActionAnim("slice");
    } else if (Phaser.Input.Keyboard.JustDown(this.actionKeys["E"])) {
      this.playActionAnim("collect");
    }

    const left  = this.cursors.left.isDown  || this.wasd["A"].isDown;
    const right = this.cursors.right.isDown || this.wasd["D"].isDown;
    const up    = this.cursors.up.isDown    || this.wasd["W"].isDown;
    const down  = this.cursors.down.isDown  || this.wasd["S"].isDown;

    let vx = 0;
    let vy = 0;
    if (left)  { vx = -SPEED; this.direction = "left"; }
    if (right) { vx =  SPEED; this.direction = "right"; }
    if (up)    { vy = -SPEED; this.direction = "up"; }
    if (down)  { vy =  SPEED; this.direction = "down"; }

    const moving = vx !== 0 || vy !== 0;
    const animKey = moving
      ? `walk_${this.direction}`
      : `idle_${this.direction}`;

    // Move — check collision against tile grid
    if (moving) {
      const newPx = this.px + vx * dt;
      const newPy = this.py + vy * dt;
      const col = this.generatedMap?.collisionMap;

      const tileX = Math.floor(newPx / TILE_SIZE);
      const tileY = Math.floor(newPy / TILE_SIZE);
      const blocked = col ? (col[tileY]?.[tileX] ?? true) : false;

      if (!blocked) {
        this.px = newPx;
        this.py = newPy;
      }

      this.sprites.forEach((s) => { s.x = this.px; s.y = this.py; });
      this.toolSprites.forEach((s) => { s.x = this.px; s.y = this.py; });
      this.followTarget.setPosition(this.px, this.py);
    }

    // Switch animation if changed
    if (animKey !== this.currentAnim) {
      this.playAnim(animKey);
    }

    // Interpolate remote players
    this.remotePlayers.forEach((remote) => {
      remote.x = Phaser.Math.Linear(remote.x, remote.targetX, 0.2);
      remote.y = Phaser.Math.Linear(remote.y, remote.targetY, 0.2);
      remote.sprites.forEach((s) => { s.x = remote.x; s.y = remote.y; });
      remote.label.x = remote.x;
      remote.label.y = remote.y - 52;
    });

    // Send to Colyseus (throttled)
    if (this.room && time - this.lastSentAt > SEND_INTERVAL) {
      this.room.send("move", {
        x: this.px,
        y: this.py,
        direction: this.direction,
        animKey,
      });
      this.lastSentAt = time;
    }
  }

  private playAnim(animKey: string) {
    this.currentAnim = animKey;
    const { texture, flipX } = ANIM_MAP[animKey];

    this.sprites.forEach((s, key) => {
      const visible = key === texture;
      s.setVisible(visible);
      if (visible) {
        s.setFlipX(flipX);
        s.play(animKey, true);
      }
    });
  }
}
