// Procedural map generator — deterministic from seed
// Tiles.png: 208×320, 13 cols × 20 rows (260 tiles total)
// Confirmed: tile 15 = solid grass

export const MAP_WIDTH  = 80; // tiles
export const MAP_HEIGHT = 80; // tiles
export const TILE_SIZE  = 16; // px

// Grass variants (row 1 in the tileset, all similar)
const GRASS = [15, 14, 14, 15, 15, 15, 16, 15]; // weighted toward 15

// Darker ground used for forest floor (row 2 same column)
const FOREST_FLOOR = 28; // tile 28 = row 2, col 2 — same column as grass

export interface GeneratedMap {
  groundData: number[][];
  collisionMap: boolean[][];
}

/** Fast, seedable PRNG (mulberry32) */
function makePrng(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMap(seed: number): GeneratedMap {
  const rng = makePrng(seed);
  const W = MAP_WIDTH;
  const H = MAP_HEIGHT;

  // Ground layer — grass with slight noise variation
  const groundData: number[][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => GRASS[Math.floor(rng() * GRASS.length)])
  );

  // Collision map — false = walkable
  const collisionMap: boolean[][] = Array.from({ length: H }, () =>
    new Array<boolean>(W).fill(false)
  );

  // Perimeter is always solid (keeps players inside world)
  for (let x = 0; x < W; x++) {
    collisionMap[0][x] = true;
    collisionMap[H - 1][x] = true;
  }
  for (let y = 0; y < H; y++) {
    collisionMap[y][0] = true;
    collisionMap[y][W - 1] = true;
  }

  // Forest patches — circular clusters scattered around the map
  const centerX = W / 2;
  const centerY = H / 2;
  const SPAWN_CLEAR_RADIUS = 14; // tiles kept open near center

  const patchCount = 18;
  for (let i = 0; i < patchCount; i++) {
    const cx = 2 + Math.floor(rng() * (W - 4));
    const cy = 2 + Math.floor(rng() * (H - 4));
    const radius = 3 + Math.floor(rng() * 5); // 3–7

    // Keep center area clear
    if (Math.hypot(cx - centerX, cy - centerY) < SPAWN_CLEAR_RADIUS) continue;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1) continue;
        collisionMap[ty][tx] = true;
        groundData[ty][tx] = FOREST_FLOOR; // visually different ground
      }
    }
  }

  return { groundData, collisionMap };
}
