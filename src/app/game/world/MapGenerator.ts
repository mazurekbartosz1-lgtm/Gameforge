// Infinite procedural world — no fixed width/height
// Every tile coordinate (wx, wy) has a deterministic terrain value from (wx, wy, seed)

export const TILE_SIZE  = 16; // px per tile
export const CHUNK_SIZE = 16; // tiles per chunk side (used for future chunk management)
export const TREE_STEP  = 10; // tiles between tree grid cells — sprite 7w×9.5h, occasional ≤1.5-tile overlap
export const ROCK_STEP  =  3; // tiles between rock grid cells — ~6× denser than step=5

const SPAWN_CLEAR_RADIUS = 16; // tiles around (0,0) guaranteed to be open (smaller = forest starts sooner)
const SMOOTH_RADIUS = 10;       // neighborhood radius for blob-like forest shapes
const SMOOTH_CELLS = (2 * SMOOTH_RADIUS + 1) ** 2; // 441
const FOREST_THRESHOLD = 0.494; // very low threshold → most of the world is dense forest
const ROCK_BUFFER      = 0.492; // density threshold for "near forest" buffer — rocks excluded above this

/** Deterministic hash of a world tile position */
function terrainHash(wx: number, wy: number, seed: number): number {
  let h = (seed ^ Math.imul(wx, 374761393) ^ Math.imul(wy, 668265263)) | 0;
  h = (h + 0x6D2B79F5) | 0;
  let t = Math.imul(h ^ (h >>> 15), 1 | h);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ── Tree chunks ──────────────────────────────────────────────────────────────

const TREE_MAX_OFFSET = 3; // jitter 0–2 tiles → occasional 1–1.5-tile overlap when neighbors shift toward each other

/**
 * Returns the world-tile position of the tree in grid-chunk (chunkX, chunkY),
 * or null if that chunk has no tree (open area or spawn zone).
 * Deterministic for a given seed — same result on every client.
 */
export function treeAtChunk(chunkX: number, chunkY: number, seed: number): { wx: number; wy: number } | null {
  const gx = chunkX * TREE_STEP;
  const gy = chunkY * TREE_STEP;
  const h1 = terrainHash(gx, gy, seed ^ 0x1111);
  const h2 = terrainHash(gx, gy, seed ^ 0x2222);
  const wx = gx + Math.floor(h1 * TREE_MAX_OFFSET);
  const wy = gy + Math.floor(h2 * TREE_MAX_OFFSET);
  if (!isForestTile(wx, wy, seed)) return null;
  return { wx, wy };
}

// ── Rock chunks ──────────────────────────────────────────────────────────────

const ROCK_MAX_OFFSET = 1; // no jitter at step=3 — floor(h*1)=0, rocks on exact grid
const ROCK_DENSITY    = 0.375; // ~37% of open chunks carry a rock (half of original 75%)

/**
 * Returns the world-tile (top-left) position of a rock in grid-chunk (chunkX, chunkY),
 * or null if the chunk has no rock (too dense forest, spawn zone, or low probability).
 * Deterministic for a given seed.
 */
export function rockAtChunk(chunkX: number, chunkY: number, seed: number): { wx: number; wy: number } | null {
  const gx = chunkX * ROCK_STEP;
  const gy = chunkY * ROCK_STEP;

  // Cheap probability gate — skip 65 % of chunks immediately
  if (terrainHash(gx, gy, seed ^ 0xA55A) > ROCK_DENSITY) return null;

  // Small jitter within the chunk
  const h1 = terrainHash(gx, gy, seed ^ 0x3333);
  const h2 = terrainHash(gx, gy, seed ^ 0x4444);
  const wx = gx + Math.floor(h1 * ROCK_MAX_OFFSET);
  const wy = gy + Math.floor(h2 * ROCK_MAX_OFFSET);

  // Keep spawn area clear
  if (wx * wx + wy * wy < SPAWN_CLEAR_RADIUS * SPAWN_CLEAR_RADIUS) return null;

  // Expensive: compute forest density and exclude tiles near/inside forest
  let sum = 0;
  for (let dy = -SMOOTH_RADIUS; dy <= SMOOTH_RADIUS; dy++)
    for (let dx = -SMOOTH_RADIUS; dx <= SMOOTH_RADIUS; dx++)
      sum += terrainHash(wx + dx, wy + dy, seed);
  if (sum / SMOOTH_CELLS > ROCK_BUFFER) return null;

  return { wx, wy };
}

// ── Forest query ─────────────────────────────────────────────────────────────

/**
 * Returns true if the world tile at (wx, wy) is forest (blocked by trees).
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
