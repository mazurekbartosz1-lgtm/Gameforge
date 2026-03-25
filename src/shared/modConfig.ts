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

export interface ModRule {
  id: string;
  trigger: "on_tick" | "every_Ns" | "on_eat" | "on_cook" | "on_hunger_low" | "on_enemy_death";
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
}
