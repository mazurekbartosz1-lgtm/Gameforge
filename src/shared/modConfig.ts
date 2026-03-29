// Shared ModConfig types — used by frontend, API routes, and (via import) Colyseus server

export interface ModMonsterVariant {
  id: string;           // unique key e.g. "fire_orc"
  name: string;
  baseSprite: "hunter"; // only hunter sprite available until Pixellab sprites arrive
  tint: number;         // hex number e.g. 0xff4400
  scale: number;        // relative to base 1.5x, e.g. 1.0 = normal, 1.5 = big
  particleEffect?: "fire" | "ice" | "poison" | "electric" | "shadow" | "holy";
  hp: number;
  maxHp: number;
  damage: number;
  dropTable: Array<{ item: string; chance: number; qty: number }>;
}

export interface ModFoodVariant {
  id: string;           // existing food id to override e.g. "mushroom"
  hungerRestore?: number;
  hpRestore?: number;
  spawnChance?: number; // 0–1
}

export interface DifficultyLevel {
  minDay: number;   // group age in days when this level activates
  name: string;     // display name e.g. "Niebezpiecznie"
  color: string;    // hex CSS color e.g. "#ffcc00"
}

export interface DeathDropThreshold {
  minDifficulty: number;      // difficulty multiplier floor
  dropChance: number;         // 0–1 probability of any drop
  minDrops: number;           // minimum items dropped (if drop occurs)
  maxDrops: number;           // maximum items dropped (if drop occurs)
}

export interface DifficultyOverrides {
  dayScaleFactor?: number;            // default 0.15 — growth per day
  zoneScaleFactor?: number;           // default 0.4 — multiplier per zone tier
  zoneBoundaries?: [number, number, number]; // px [z1, z2, z3], default [500, 1500, 3000]
  maxDifficultyMultiplier?: number;   // hard cap, default 8
  deathDropThresholds?: DeathDropThreshold[];
  respawnPenalty?: {
    hungerLoss?: number;              // fraction 0–1, default 0.25
    sanityLoss?: number;              // fraction 0–1, default 0.20
  };
  difficultyLevels?: DifficultyLevel[];
  newPlayerProtectionDays?: number;   // min 1, default 3
}

export interface ModRule {
  id: string;
  trigger: "on_tick" | "every_Ns" | "on_eat" | "on_cook" | "on_hunger_low" | "on_enemy_death" | "on_difficulty_increase" | "on_player_death" | "on_zone_enter";
  intervalMs?: number;
  conditions: Array<{
    field: string;
    operator: "<" | ">" | "==" | "!=" | "includes";
    value: string | number | boolean;
  }>;
  effects: Array<{
    action: "modify_stat" | "add_item" | "spawn_enemy" | "broadcast_message" | "set_weather";
    target?: "player" | "all_players" | "world";
    field?: string;
    value?: string | number;
    pool?: string[];
    qty?: number;
  }>;
}

export interface ModConfig {
  id?: string;                         // set after DB save
  name: string;
  description: string;
  monsterVariants: ModMonsterVariant[];
  foodVariants: ModFoodVariant[];
  rules: ModRule[];
  difficultyOverrides?: DifficultyOverrides;
}

// ─── Default difficulty config (used when no mod overrides) ──────────────────

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
