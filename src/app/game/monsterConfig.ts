export interface MonsterConfig {
  id: string;
  name: string;
  baseSprite: string;
  tint: number;
  scale: number;
  particleEffect?: string;
  hp: number;
  maxHp: number;
  damage: number;
  dropTable: Array<{ item: string; chance: number; qty: number }>;
}

export const MONSTER_CONFIG: Record<string, MonsterConfig> = {
  hunter: {
    id: "hunter", name: "Hunter", baseSprite: "hunter", tint: 0xffffff, scale: 1.0,
    hp: 30, maxHp: 30, damage: 10,
    dropTable: [],
  },
  fire_hunter: {
    id: "fire_hunter", name: "Fire Hunter", baseSprite: "hunter", tint: 0xff4400, scale: 1.1,
    particleEffect: "fire",
    hp: 40, maxHp: 40, damage: 14,
    dropTable: [],
  },
  boss_hunter: {
    id: "boss_hunter", name: "Boss Hunter", baseSprite: "hunter", tint: 0xff0000, scale: 1.6,
    particleEffect: "shadow",
    hp: 80, maxHp: 80, damage: 15,
    dropTable: [],
  },
};
