import { Scene } from "phaser";

// Action animation sheets: 512×64 → 8 frames of 64×64 each
// Each action has 3 direction variants: down, up, side (side is flipped for left)

export const ACTION_TYPES = ["slice", "crush", "pierce", "collect"] as const;
export const ACTION_DIRS = ["down", "up", "side"] as const;

export type ActionType = (typeof ACTION_TYPES)[number];
export type ActionDir = (typeof ACTION_DIRS)[number];

const FRAME_RATE: Record<ActionType, number> = {
  slice: 20,
  crush: 20,
  pierce: 20,
  collect: 20,
};

export function preloadToolSprites(scene: Scene): void {
  const cfg = { frameWidth: 64, frameHeight: 64 };
  for (const action of ACTION_TYPES) {
    for (const dir of ACTION_DIRS) {
      scene.load.spritesheet(
        `${action}_${dir}`,
        `/assets/actions/${action}_${dir}.png`,
        cfg
      );
    }
  }
}

export function createToolAnimations(scene: Scene): void {
  const anims = scene.anims;
  for (const action of ACTION_TYPES) {
    for (const dir of ACTION_DIRS) {
      const key = `${action}_${dir}`;
      anims.create({
        key,
        frames: anims.generateFrameNumbers(key, { start: 0, end: 7 }),
        frameRate: FRAME_RATE[action],
        repeat: 0,
      });
    }
  }
}
