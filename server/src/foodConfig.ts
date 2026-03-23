export interface FoodItem {
  id: string;
  name: string;
  hungerRestore: number;
  hpRestore: number;
  cookable: boolean;
}

export const FOOD_CONFIG: Record<string, FoodItem> = {
  mushroom: {
    id: "mushroom", name: "Mushroom",
    hungerRestore: 15, hpRestore: 0, cookable: true,
  },
  berries: {
    id: "berries", name: "Berries",
    hungerRestore: 10, hpRestore: 5, cookable: false,
  },
  raw_meat: {
    id: "raw_meat", name: "Raw Meat",
    hungerRestore: 5, hpRestore: -5, cookable: true,
  },
  cooked_meat: {
    id: "cooked_meat", name: "Cooked Meat",
    hungerRestore: 40, hpRestore: 10, cookable: false,
  },
  cooked_mushroom: {
    id: "cooked_mushroom", name: "Cooked Mushroom",
    hungerRestore: 25, hpRestore: 5, cookable: false,
  },
};
