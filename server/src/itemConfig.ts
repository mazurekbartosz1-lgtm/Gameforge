/** Drop tables — items given to player on harvest */
export const DROP_TABLE: Record<string, Array<{ item: string; qty: number }>> = {
  tree:       [{ item: "wood",     qty: 2 }],
  stone:      [{ item: "stone",    qty: 1 }],
  mushroom:   [{ item: "mushroom", qty: 1 }],
  berry_bush: [{ item: "berries",  qty: 2 }],
};
