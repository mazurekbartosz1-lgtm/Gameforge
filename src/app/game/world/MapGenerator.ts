// Infinite procedural world — no fixed width/height
// Every tile coordinate (wx, wy) has a deterministic terrain value from (wx, wy, seed)

export const TILE_SIZE  = 16; // px per tile
export const CHUNK_SIZE = 16; // tiles per chunk side (used for future chunk management)

const SPAWN_CLEAR_RADIUS = 22; // tiles around (0,0) guaranteed to be open
const SMOOTH_RADIUS = 10;       // neighborhood radius for blob-like forest shapes
const SMOOTH_CELLS = (2 * SMOOTH_RADIUS + 1) ** 2; // 441
const FOREST_THRESHOLD = 0.522; // ~56% of world is forest, large clusters

/** Deterministic hash of a world tile position */
function terrainHash(wx: number, wy: number, seed: number): number {
  let h = (seed ^ Math.imul(wx, 374761393) ^ Math.imul(wy, 668265263)) | 0;
  h = (h + 0x6D2B79F5) | 0;
  let t = Math.imul(h ^ (h >>> 15), 1 | h);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Returns true if the world tile at (wx, wy) is forest (blocked).
 * Consistent across any map size — purely a function of position + seed.
 * Uses neighbourhood smoothing to produce organic blob-shaped forests.
 */
export function isForestTile(wx: number, wy: number, seed: number): boolean {
  // Keep spawn area clear
  if (wx * wx + wy * wy < SPAWN_CLEAR_RADIUS * SPAWN_CLEAR_RADIUS) return false;

  let sum = 0;
  for (let dy = -SMOOTH_RADIUS; dy <= SMOOTH_RADIUS; dy++) {
    for (let dx = -SMOOTH_RADIUS; dx <= SMOOTH_RADIUS; dx++) {
      sum += terrainHash(wx + dx, wy + dy, seed);
    }
  }
  return sum / SMOOTH_CELLS > FOREST_THRESHOLD;
}
