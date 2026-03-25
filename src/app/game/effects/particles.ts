export type ParticlePreset = "fire" | "ice" | "poison" | "electric" | "shadow" | "holy";

interface PresetConfig {
  tint: number[];
  speed: { min: number; max: number };
  angle?: { min: number; max: number };
  lifespan: number;
  scale: { start: number; end: number };
  quantity: number;
  frequency: number;
}

const CONFIGS: Record<ParticlePreset, PresetConfig> = {
  fire:     { tint: [0xff4400, 0xff8800], speed: { min: 20, max: 60  }, angle: { min: 250, max: 290 }, lifespan: 600,  scale: { start: 0.5, end: 0   }, quantity: 3, frequency: 100 },
  ice:      { tint: [0x88ddff, 0xffffff], speed: { min: 10, max: 30  },                                 lifespan: 800,  scale: { start: 0.3, end: 0   }, quantity: 2, frequency: 150 },
  poison:   { tint: [0x44ff44, 0x228822], speed: { min: 5,  max: 20  }, angle: { min: 0,   max: 360 }, lifespan: 1000, scale: { start: 0.4, end: 0   }, quantity: 1, frequency: 200 },
  electric: { tint: [0xffff00, 0x8888ff], speed: { min: 50, max: 100 },                                 lifespan: 200,  scale: { start: 0.6, end: 0   }, quantity: 5, frequency: 50  },
  shadow:   { tint: [0x440044, 0x880088], speed: { min: 5,  max: 20  },                                 lifespan: 1500, scale: { start: 0.5, end: 0.1 }, quantity: 1, frequency: 300 },
  holy:     { tint: [0xffffaa, 0xffffff], speed: { min: 10, max: 40  }, angle: { min: 0,   max: 360 }, lifespan: 1000, scale: { start: 0.3, end: 0.8 }, quantity: 2, frequency: 150 },
};

/** Call once in scene create() — generates the shared "particle_dot" texture. */
export function createParticleTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists("particle_dot")) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture("particle_dot", 8, 8);
  g.destroy();
}

/** Continuous emitter that follows a sprite (for enemy intrinsic/status effects). */
export function playEffect(
  scene: Phaser.Scene,
  preset: ParticlePreset,
  x: number,
  y: number,
  followTarget: Phaser.GameObjects.Sprite,
): Phaser.GameObjects.Particles.ParticleEmitter {
  const cfg = CONFIGS[preset];
  const emitter = scene.add.particles(x, y, "particle_dot", {
    tint: cfg.tint,
    speed: cfg.speed,
    ...(cfg.angle ? { angle: cfg.angle } : {}),
    lifespan: cfg.lifespan,
    scale: cfg.scale,
    quantity: cfg.quantity,
    frequency: cfg.frequency,
    follow: followTarget,
  });
  emitter.setDepth(11);
  return emitter;
}

/** One-shot burst at a position (for weapon hit effects). Auto-destroys after 600ms. */
export function burstEffect(
  scene: Phaser.Scene,
  preset: ParticlePreset,
  x: number,
  y: number,
): void {
  const cfg = CONFIGS[preset];
  const emitter = scene.add.particles(x, y, "particle_dot", {
    tint: cfg.tint,
    speed: cfg.speed,
    ...(cfg.angle ? { angle: cfg.angle } : {}),
    lifespan: cfg.lifespan,
    scale: cfg.scale,
    emitting: false,
  });
  emitter.setDepth(11);
  emitter.explode(12);
  scene.time.delayedCall(cfg.lifespan + 100, () => emitter.destroy());
}

/** Colors for status effect icons (used in PlayScene for drawing). */
export const EFFECT_COLORS: Record<ParticlePreset, number> = {
  fire:     0xff4400,
  ice:      0x88ddff,
  poison:   0x44ff44,
  electric: 0xffff00,
  shadow:   0x880088,
  holy:     0xffffaa,
};

/** Emoji icons for status effect display above enemies. */
export const EFFECT_ICONS: Record<ParticlePreset, string> = {
  fire:     "🔥",
  ice:      "❄",
  poison:   "☠",
  electric: "⚡",
  shadow:   "🌑",
  holy:     "✨",
};
