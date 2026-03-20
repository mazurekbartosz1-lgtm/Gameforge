import { Scene } from "phaser";

// Body_A actual frame layout (verified from sprite sheet images):
// Idle sheets: 256×64 → frameWidth 64, frameHeight 64 → 4 frames (0–3)
// Walk sheets: 384×64 → frameWidth 64, frameHeight 64 → 6 frames (0–5)
// idle_right / walk_right reuse side sheet — caller sets setFlipX(true)

export function createPlayerAnimations(scene: Scene): void {
  const anims = scene.anims;

  anims.create({
    key: "idle_down",
    frames: anims.generateFrameNumbers("idle_down", { start: 0, end: 3 }),
    frameRate: 8,
    repeat: -1,
  });

  anims.create({
    key: "idle_up",
    frames: anims.generateFrameNumbers("idle_up", { start: 0, end: 3 }),
    frameRate: 8,
    repeat: -1,
  });

  anims.create({
    key: "idle_left",
    frames: anims.generateFrameNumbers("idle_side", { start: 0, end: 3 }),
    frameRate: 8,
    repeat: -1,
  });

  anims.create({
    key: "idle_right",
    frames: anims.generateFrameNumbers("idle_side", { start: 0, end: 3 }),
    frameRate: 8,
    repeat: -1,
  });

  anims.create({
    key: "walk_down",
    frames: anims.generateFrameNumbers("walk_down", { start: 0, end: 5 }),
    frameRate: 8,
    repeat: -1,
  });

  anims.create({
    key: "walk_up",
    frames: anims.generateFrameNumbers("walk_up", { start: 0, end: 5 }),
    frameRate: 8,
    repeat: -1,
  });

  anims.create({
    key: "walk_left",
    frames: anims.generateFrameNumbers("walk_side", { start: 0, end: 5 }),
    frameRate: 8,
    repeat: -1,
  });

  anims.create({
    key: "walk_right",
    frames: anims.generateFrameNumbers("walk_side", { start: 0, end: 5 }),
    frameRate: 8,
    repeat: -1,
  });
}
