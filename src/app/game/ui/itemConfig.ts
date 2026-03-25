export interface ItemDef {
  id:              string;
  name:            string;
  color:           string;   // hex fill for icon
  symbol:          string;   // 1–2 char glyph drawn on slot
  eatable:         boolean;
  equippable:      boolean;
  equipSlot?:      "weapon" | "armor" | "helmet" | "item";
  rarity?:         "common" | "uncommon" | "rare";
  attackBonus?:    number;
  defenseBonus?:   number;
  particleEffect?: string;
}

export interface ElementModifier {
  nameSuffix:     string;
  particleEffect: string;
  attackBonus:    number;
}

export const ELEMENT_MODIFIERS: Record<string, ElementModifier> = {
  fire:     { nameSuffix: "of Fire",    particleEffect: "fire",     attackBonus: 3 },
  ice:      { nameSuffix: "of Ice",     particleEffect: "ice",      attackBonus: 2 },
  poison:   { nameSuffix: "of Poison",  particleEffect: "poison",   attackBonus: 2 },
  electric: { nameSuffix: "of Thunder", particleEffect: "electric", attackBonus: 4 },
  shadow:   { nameSuffix: "of Shadow",  particleEffect: "shadow",   attackBonus: 5 },
  holy:     { nameSuffix: "of Holy",    particleEffect: "holy",     attackBonus: 6 },
};

/** Returns ItemDef for base or elemental variant (e.g. "iron_sword_of_fire"). */
export function getItemDef(id: string): ItemDef | undefined {
  if (ITEM_MAP[id]) return ITEM_MAP[id];
  const match = id.match(/^(.+)_of_(\w+)$/);
  if (!match) return undefined;
  const [, baseId, element] = match;
  const base = ITEM_MAP[baseId];
  const mod  = ELEMENT_MODIFIERS[element];
  if (!base || !mod) return undefined;
  return {
    ...base,
    id,
    name:            `${base.name} ${mod.nameSuffix}`,
    attackBonus:     (base.attackBonus ?? 0) + mod.attackBonus,
    particleEffect:  mod.particleEffect,
  };
}

/** All items the player can carry, in hotbar display order. */
export const ITEM_DEFS: ItemDef[] = [
  // Consumables / resources (hotbar slots 1–7)
  { id: "wood",            name: "Wood",            color: "#c8a46e", symbol: "W",  eatable: false, equippable: false },
  { id: "stone",           name: "Stone",           color: "#aaaaaa", symbol: "S",  eatable: false, equippable: false },
  { id: "mushroom",        name: "Mushroom",        color: "#88cc44", symbol: "M",  eatable: true,  equippable: false },
  { id: "berries",         name: "Berries",         color: "#ee7788", symbol: "B",  eatable: true,  equippable: false },
  { id: "raw_meat",        name: "Raw Meat",        color: "#e07050", symbol: "RM", eatable: true,  equippable: false },
  { id: "cooked_meat",     name: "Cooked Meat",     color: "#e09040", symbol: "CM", eatable: true,  equippable: false },
  { id: "cooked_mushroom", name: "Cooked Mushroom", color: "#aadd55", symbol: "CS", eatable: true,  equippable: false },
  // Gear — weapons
  { id: "bone_sword",      name: "Bone Sword",      color: "#d4c080", symbol: "⚔",  eatable: false, equippable: true, equipSlot: "weapon",  rarity: "common",   attackBonus: 8  },
  { id: "iron_sword",      name: "Iron Sword",      color: "#88aacc", symbol: "⚔",  eatable: false, equippable: true, equipSlot: "weapon",  rarity: "uncommon", attackBonus: 15 },
  { id: "shadow_blade",    name: "Shadow Blade",    color: "#cc66ff", symbol: "⚔",  eatable: false, equippable: true, equipSlot: "weapon",  rarity: "rare",     attackBonus: 25 },
  // Gear — armor
  { id: "leather_armor",   name: "Leather Armor",   color: "#a87848", symbol: "🛡",  eatable: false, equippable: true, equipSlot: "armor",   rarity: "common",   defenseBonus: 5  },
  { id: "chain_mail",      name: "Chain Mail",      color: "#99bbdd", symbol: "🛡",  eatable: false, equippable: true, equipSlot: "armor",   rarity: "uncommon", defenseBonus: 10 },
  // Gear — helmets
  { id: "bone_helmet",     name: "Bone Helmet",     color: "#d4c080", symbol: "⛑",  eatable: false, equippable: true, equipSlot: "helmet",  rarity: "common",   defenseBonus: 3 },
  { id: "iron_helmet",     name: "Iron Helmet",     color: "#88aacc", symbol: "⛑",  eatable: false, equippable: true, equipSlot: "helmet",  rarity: "uncommon", defenseBonus: 7 },
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(
  ITEM_DEFS.map(d => [d.id, d])
);
