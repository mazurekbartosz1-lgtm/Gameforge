import { Scene } from "phaser";
import { type Room } from "colyseus.js";
import { createPlayerAnimations } from "../animations/playerAnimations";
import { getRoom } from "../network/ColyseusClient";

type Direction = "down" | "up" | "left" | "right";

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

export class PlayScene extends Scene {
  private sprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private direction: Direction = "down";
  private currentAnim = "idle_down";
  private lastSentAt = 0;
  private room: Room | null = null;

  // All sprites share this position
  private px = 400;
  private py = 300;

  constructor() {
    super({ key: "PlayScene" });
  }

  preload() {
    this.load.on("loaderror", (file: { src: string }) => {
      console.error("Load error:", file.src);
    });

    this.load.spritesheet("fairy_tiles", "/assets/test/tiles.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    const cfg = { frameWidth: 64, frameHeight: 64 };
    this.load.spritesheet("idle_down",  "/assets/player/idle_down.png",  cfg);
    this.load.spritesheet("idle_up",    "/assets/player/idle_up.png",    cfg);
    this.load.spritesheet("idle_side",  "/assets/player/idle_side.png",  cfg);
    this.load.spritesheet("walk_down",  "/assets/player/walk_down.png",  cfg);
    this.load.spritesheet("walk_up",    "/assets/player/walk_up.png",    cfg);
    this.load.spritesheet("walk_side",  "/assets/player/walk_side.png",  cfg);
  }

  create() {
    // Background
    this.add.tileSprite(0, 0, 800, 600, "fairy_tiles", 15).setOrigin(0, 0);

    // Animations
    createPlayerAnimations(this);

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

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    // Colyseus room (already connected via PhaserGame.tsx)
    this.room = getRoom();
  }

  update(time: number, delta: number) {
    const dt = delta / 1000;

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

    // Move all sprites together
    if (moving) {
      this.px += vx * dt;
      this.py += vy * dt;
      this.sprites.forEach((s) => { s.x = this.px; s.y = this.py; });
    }

    // Switch animation if changed
    if (animKey !== this.currentAnim) {
      this.playAnim(animKey);
    }

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
