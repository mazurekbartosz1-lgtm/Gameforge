export interface LootItem {
  id: string;
  name: string;
  slot: "weapon" | "armor" | "helmet" | "item";
  attackBonus: number;
  defenseBonus: number;
  rarity: "common" | "uncommon" | "rare";
}

export const LOOT_TABLE: Record<string, LootItem> = {
  bone_sword:    { id: "bone_sword",    name: "Bone Sword",    slot: "weapon",  attackBonus: 8,  defenseBonus: 0,  rarity: "common"   },
  iron_sword:    { id: "iron_sword",    name: "Iron Sword",    slot: "weapon",  attackBonus: 15, defenseBonus: 0,  rarity: "uncommon" },
  shadow_blade:  { id: "shadow_blade",  name: "Shadow Blade",  slot: "weapon",  attackBonus: 25, defenseBonus: 0,  rarity: "rare"     },
  leather_armor: { id: "leather_armor", name: "Leather Armor", slot: "armor",   attackBonus: 0,  defenseBonus: 5,  rarity: "common"   },
  chain_mail:    { id: "chain_mail",    name: "Chain Mail",    slot: "armor",   attackBonus: 0,  defenseBonus: 10, rarity: "uncommon" },
  bone_helmet:   { id: "bone_helmet",   name: "Bone Helmet",   slot: "helmet",  attackBonus: 0,  defenseBonus: 3,  rarity: "common"   },
  iron_helmet:   { id: "iron_helmet",   name: "Iron Helmet",   slot: "helmet",  attackBonus: 0,  defenseBonus: 7,  rarity: "uncommon" },
};

// Weighted pool: common×3, uncommon×2, rare×1
const HUNTER_POOL: string[] = [
  "bone_sword",    "bone_sword",    "bone_sword",
  "leather_armor", "leather_armor", "leather_armor",
  "bone_helmet",   "bone_helmet",   "bone_helmet",
  "iron_sword",    "iron_sword",
  "chain_mail",    "chain_mail",
  "iron_helmet",   "iron_helmet",
  "shadow_blade",
];

const ENEMY_DROP_POOLS: Record<string, string[]> = {
  hunter: HUNTER_POOL,
};

/** Returns a loot item id or null (30% no-drop). */
export function rollDrop(enemyType: string): string | null {
  if (Math.random() < 0.3) return null;
  const pool = ENEMY_DROP_POOLS[enemyType];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
