export interface ItemDef {
  id:      string;
  name:    string;
  color:   string;   // hex fill for icon
  symbol:  string;   // 1–2 char glyph drawn on slot
  eatable: boolean;
}

/** All items the player can carry, in hotbar display order. */
export const ITEM_DEFS: ItemDef[] = [
  { id: "wood",            name: "Wood",            color: "#c8a46e", symbol: "W",  eatable: false },
  { id: "stone",           name: "Stone",           color: "#aaaaaa", symbol: "S",  eatable: false },
  { id: "mushroom",        name: "Mushroom",        color: "#88cc44", symbol: "M",  eatable: true  },
  { id: "berries",         name: "Berries",         color: "#ee7788", symbol: "B",  eatable: true  },
  { id: "raw_meat",        name: "Raw Meat",        color: "#e07050", symbol: "RM", eatable: true  },
  { id: "cooked_meat",     name: "Cooked Meat",     color: "#e09040", symbol: "CM", eatable: true  },
  { id: "cooked_mushroom", name: "Cooked Mushroom", color: "#aadd55", symbol: "CS", eatable: true  },
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(
  ITEM_DEFS.map(d => [d.id, d])
);
