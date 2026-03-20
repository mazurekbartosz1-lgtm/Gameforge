import { Scene } from "phaser";
import { createPlayerAnimations } from "./animations/playerAnimations";

// Body_A: frameWidth 64, frameHeight 64
// Idle 256×64 → 4 frames (0–3), Walk 384×64 → 6 frames (0–5)

type AnimStep = { texture: string; anim: string; flipX: boolean };

const SEQUENCE: AnimStep[] = [
  { texture: "idle_down",  anim: "idle_down",  flipX: false },
  { texture: "idle_up",    anim: "idle_up",    flipX: false },
  { texture: "idle_side",  anim: "idle_left",  flipX: false },
  { texture: "idle_side",  anim: "idle_right", flipX: true  },
  { texture: "walk_down",  anim: "walk_down",  flipX: false },
  { texture: "walk_up",    anim: "walk_up",    flipX: false },
  { texture: "walk_side",  anim: "walk_left",  flipX: false },
  { texture: "walk_side",  anim: "walk_right", flipX: true  },
];

export class GameScene extends Scene {
  private sprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private label!: Phaser.GameObjects.Text;
  private step = 0;

  constructor() {
    super({ key: "GameScene" });
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
    // Grass background — tile frame 15 across the full canvas
    this.add.tileSprite(0, 0, 800, 600, "fairy_tiles", 15).setOrigin(0, 0);

    createPlayerAnimations(this);

    // One sprite per unique texture, all at center, only one visible at a time
    const cx = 400;
    const cy = 300;
    const textures = ["idle_down", "idle_up", "idle_side", "walk_down", "walk_up", "walk_side"];

    for (const key of textures) {
      const sprite = this.add.sprite(cx, cy, key);
      sprite.setScale(1.5);
      sprite.setVisible(false);
      this.sprites.set(key, sprite);
    }

    this.label = this.add
      .text(cx, cy - 60, SEQUENCE[0].anim, {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);

    this.showStep(0);

    this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => {
        this.step = (this.step + 1) % SEQUENCE.length;
        this.showStep(this.step);
      },
    });
  }

  private showStep(i: number) {
    const { texture, anim, flipX } = SEQUENCE[i];

    // Hide all sprites
    this.sprites.forEach((s) => s.setVisible(false));

    // Show and play the correct one
    const sprite = this.sprites.get(texture)!;
    sprite.setFlipX(flipX);
    sprite.setVisible(true);
    sprite.play(anim, true);

    this.label.setText(anim + (flipX ? " ↔" : ""));
  }
}
