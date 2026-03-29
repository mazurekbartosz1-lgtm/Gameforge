// ─── Difficulty system types and defaults ────────────────────────────────────
// Mirrored in src/shared/modConfig.ts (frontend copy).
// Keep in sync when changing structure.

export interface DifficultyLevel {
  minDay: number;   // group age in days when this level activates
  name: string;     // display name e.g. "Niebezpiecznie"
  color: string;    // hex CSS color e.g. "#ffcc00"
}

export interface DeathDropThreshold {
  minDifficulty: number;      // difficulty multiplier floor
  dropChance: number;         // 0–1 probability of any drop occurring
  minDrops: number;           // minimum items dropped (if drop occurs)
  maxDrops: number;           // maximum items dropped (if drop occurs)
}

export interface DifficultyOverrides {
  dayScaleFactor?: number;
  zoneScaleFactor?: number;
  zoneBoundaries?: [number, number, number];
  maxDifficultyMultiplier?: number;
  deathDropThresholds?: DeathDropThreshold[];
  respawnPenalty?: {
    hungerLoss?: number;
    sanityLoss?: number;
  };
  difficultyLevels?: DifficultyLevel[];
  newPlayerProtectionDays?: number;
}

export const DEFAULT_DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { minDay: 0,  name: "Spokojnie",      color: "#4caf50" },
  { minDay: 4,  name: "Niebezpiecznie", color: "#ffcc00" },
  { minDay: 8,  name: "Groźnie",        color: "#ff9800" },
  { minDay: 15, name: "Śmiertelnie",    color: "#f44336" },
];

export const DEFAULT_DEATH_DROP_THRESHOLDS: DeathDropThreshold[] = [
  { minDifficulty: 0,   dropChance: 0.20, minDrops: 1, maxDrops: 1 },
  { minDifficulty: 1.5, dropChance: 0.50, minDrops: 1, maxDrops: 1 },
  { minDifficulty: 2.5, dropChance: 0.80, minDrops: 1, maxDrops: 2 },
  { minDifficulty: 4.0, dropChance: 1.00, minDrops: 2, maxDrops: 3 },
];
