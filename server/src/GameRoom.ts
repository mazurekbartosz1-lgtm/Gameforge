import { Room, Client, type RoomOptions } from "@colyseus/core";
import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { verifyToken } from "@clerk/backend";
import { loadPlayer, savePlayer, deletePlayer, loadWorldSeed, saveWorldSeed, loadDeadResources, saveDeadResources, loadRoomState, saveRoomState, insertRoomEvent, submitModToGroup, loadApprovedMods, getGroupAgeDays, getPlayerJoinedGroupAt } from "./db.js";
import { FOOD_CONFIG } from "./foodConfig.js";
import { LOOT_TABLE, rollDrop, getLootItem } from "./lootConfig.js";
import { MONSTER_CONFIG } from "./monsterConfig.js";
import { RuleEngine, type Rule, type RuleEffect } from "./RuleEngine.js";
import { DEFAULT_RULES } from "./defaultRules.js";
import {
  type DifficultyOverrides,
  DEFAULT_DIFFICULTY_LEVELS,
  DEFAULT_DEATH_DROP_THRESHOLDS,
} from "./difficultyConfig.js";

interface GameRoomOptions extends RoomOptions {
  state: WorldState;
}

// ─── Schemas ────────────────────────────────────────────────────────────────

export class PlayerState extends Schema {
  @type("string") sessionId: string = "";
  @type("string") userId: string = "";
  @type("string") nickname: string = "Player";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("int16") hp: number = 100;
  @type("int16") maxHp: number = 100;
  @type("float32") hunger: number = 100;
  @type("float32") sanity: number = 100;
  @type("int16") attack: number = 5;
  @type("int16") defense: number = 2;
  @type(["string"]) inventory: ArraySchema<string> = new ArraySchema<string>();
  @type({ map: "string" }) equipment: MapSchema<string> = new MapSchema<string>();
  @type("uint8") activeSlot: number = 0;
  @type("string") direction: string = "down";
  @type("string") animKey: string = "idle_down";
  @type("boolean") isOnline: boolean = true;
}

export class ResourceNode extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("int16") hp: number = 10;
  @type("int16") maxHp: number = 10;
  @type("float64") respawnAt: number = 0;
  @type("boolean") isAlive: boolean = true;
}

export class FoodNode extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("boolean") isAlive: boolean = true;
  @type("float64") respawnAt: number = 0;
}

export class EnemyState extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = "";
  @type("string") configId: string = "hunter";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("int16") hp: number = 20;
  @type("int16") maxHp: number = 20;
  @type("boolean") isAlive: boolean = true;
  @type("string") animKey: string = "idle";
  @type({ map: "float64" }) statusEffects: MapSchema<number> = new MapSchema<number>();
}

export class BuildingState extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("string") material: string = "wood";
  @type("int16") hp: number = 100;
  @type("int16") maxHp: number = 100;
  @type("string") ownerId: string = "";
}

export class CookingPotState extends Schema {
  @type("string") id: string = "";
  @type("string") buildingId: string = "";
  @type("string") slot1: string = "";
  @type("string") slot2: string = "";
  @type("string") currentRecipe: string = "";
  @type("float64") cookingUntil: number = 0;
  @type("boolean") isReady: boolean = false;
  @type("string") result: string = "";
}

export class WorldState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: ResourceNode }) resources = new MapSchema<ResourceNode>();
  @type({ map: FoodNode }) foods = new MapSchema<FoodNode>();
  @type({ map: EnemyState }) enemies = new MapSchema<EnemyState>();
  @type({ map: BuildingState }) buildings = new MapSchema<BuildingState>();
  @type({ map: CookingPotState }) cookingPots = new MapSchema<CookingPotState>();
  @type("float64") worldTime: number = 0; // 0–1 day cycle
  @type("boolean") isNight: boolean = false;
  @type("uint32") mapSeed: number = 0;    // procedural map seed — same for all players in room
  @type("string")  weather: string = "clear"; // 'clear' | 'rain' | 'storm'
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TICK_RATE = 1000;          // ms between ticks
const DAY_DURATION = 14_400_000; // 4h real time = 1 in-game day (2h day + 2h night)
const HUNGER_DRAIN_PER_SEC  = 0.5 / (TICK_RATE / 1000);
const SANITY_PASSIVE_REGEN  = 0.3 / (TICK_RATE / 1000); // slow regen when not killing
const SANITY_KILL_PENALTY   = 20;   // -20 sanity per enemy kill
const SANITY_HARVEST_BONUS  = 2;    // +2 sanity per resource harvested
const BASE_ATTACK  = 5;
const BASE_DEFENSE = 2;
const PICKUP_RANGE = 64;   // px — max distance to pick up a dropped item

// ─── Difficulty zone boundaries (px from world origin) ───────────────────────
const DEFAULT_ZONE_BOUNDARIES: [number, number, number] = [500, 1500, 3000];
const DEFAULT_DAY_SCALE_FACTOR   = 0.15;
const DEFAULT_ZONE_SCALE_FACTOR  = 0.4;
const DEFAULT_MAX_DIFFICULTY     = 8;
const DEFAULT_NEW_PLAYER_PROTECTION_DAYS = 3;
const NEW_PLAYER_PROTECTION_DMG_MULT = 0.5;

const TILE_PX             = 16;   // pixels per tile (mirrors client TILE_SIZE)
const ENEMY_ZONE_TILES    = 16;   // tiles per enemy spawn zone side (256 px)
const ENEMY_ZONE_PX       = TILE_PX * ENEMY_ZONE_TILES; // 256 px per zone
const ENEMY_SPAWN_RADIUS  = 2;    // zones to activate around player (5×5 = 25 zones)
const ENEMY_SPAWN_CLEAR   = 2;    // zone radius around origin kept empty
const MAX_ALIVE_ENEMIES   = 40;   // soft cap on alive enemy count

const ENEMY_HP             = 30;
const ENEMY_SPEED          = 100;  // px/s — same as player
const ENEMY_MOVE_RATE      = 100;  // ms between movement ticks
const ENEMY_CHASE_RANGE    = 500;  // px — distance to start chasing
const PLAYER_ENEMY_SEP_PX  = 52;   // px — enemies blocked outside this radius around player
const ENEMY_STOP_DIST      = 54;   // px — AI stops enemy here (slightly above SEP so it fires)
const ENEMY_MELEE_RANGE    = 54;   // px — pierce + damage triggers here (= STOP_DIST)
const ENEMY_SEPARATION_PX  = 30;   // px — minimum distance between two enemies
const ENEMY_ATTACK_RANGE   = 64;   // px — max distance for player's own attack (server validates)
const ENEMY_ATTACK_DAMAGE  = 10;   // HP per hit

// ─── Map Collision (ported from client MapGenerator.ts) ───────────────────

const MAP_TREE_STEP          = 10;
const MAP_ROCK_STEP          = 3;
const MAP_TREE_MAX_OFFSET    = 3;
const MAP_ROCK_DENSITY       = 0.375;
const MAP_SPAWN_CLEAR_RADIUS = 16;   // tiles
const MAP_SMOOTH_RADIUS      = 10;
const MAP_SMOOTH_CELLS       = (2 * MAP_SMOOTH_RADIUS + 1) ** 2; // 441
const MAP_FOREST_THRESHOLD   = 0.494;
const MAP_ROCK_BUFFER        = 0.492;

function mapHash(wx: number, wy: number, seed: number): number {
  let h = (seed ^ Math.imul(wx, 374761393) ^ Math.imul(wy, 668265263)) | 0;
  h = (h + 0x6D2B79F5) | 0;
  let t = Math.imul(h ^ (h >>> 15), 1 | h);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function mapForestDensity(wx: number, wy: number, seed: number): number {
  let sum = 0;
  for (let dy = -MAP_SMOOTH_RADIUS; dy <= MAP_SMOOTH_RADIUS; dy++)
    for (let dx = -MAP_SMOOTH_RADIUS; dx <= MAP_SMOOTH_RADIUS; dx++)
      sum += mapHash(wx + dx, wy + dy, seed);
  return sum / MAP_SMOOTH_CELLS;
}

function mapIsForestTile(wx: number, wy: number, seed: number): boolean {
  if (wx * wx + wy * wy < MAP_SPAWN_CLEAR_RADIUS * MAP_SPAWN_CLEAR_RADIUS) return false;
  return mapForestDensity(wx, wy, seed) > MAP_FOREST_THRESHOLD;
}

function mapTreeAtChunk(cx: number, cy: number, seed: number): { wx: number; wy: number } | null {
  const gx = cx * MAP_TREE_STEP;
  const gy = cy * MAP_TREE_STEP;
  const h1 = mapHash(gx, gy, seed ^ 0x1111);
  const h2 = mapHash(gx, gy, seed ^ 0x2222);
  const wx = gx + Math.floor(h1 * MAP_TREE_MAX_OFFSET);
  const wy = gy + Math.floor(h2 * MAP_TREE_MAX_OFFSET);
  if (!mapIsForestTile(wx, wy, seed)) return null;
  return { wx, wy };
}

function mapRockAtChunk(cx: number, cy: number, seed: number): { wx: number; wy: number } | null {
  const gx = cx * MAP_ROCK_STEP;
  const gy = cy * MAP_ROCK_STEP;
  if (mapHash(gx, gy, seed ^ 0xA55A) > MAP_ROCK_DENSITY) return null;
  // ROCK_MAX_OFFSET=1: floor(h*1)=0, no jitter
  const wx = gx;
  const wy = gy;
  if (wx * wx + wy * wy < MAP_SPAWN_CLEAR_RADIUS * MAP_SPAWN_CLEAR_RADIUS) return null;
  if (mapForestDensity(wx, wy, seed) > MAP_ROCK_BUFFER) return null;
  return { wx, wy };
}

// ─── Dropped items ────────────────────────────────────────────────────────────

interface DroppedItemData {
  id:       string;
  itemId:   string;
  qty:      number;
  x:        number;
  y:        number;
}

// ─── Room ────────────────────────────────────────────────────────────────────

export class GameRoom extends Room<GameRoomOptions> {
  maxClients = 16;

  /** Client-generated trees harvested by players (never respawn). */
  private deadTrees = new Map<string, number>();

  /** Dead rocks harvested by players — excluded from map collision. */
  private deadRocks = new Set<string>();
  /** Dead food nodes: id → respawnAt timestamp (ms). Respawn after 60s. */
  private deadFoodNodes = new Map<string, number>();
  /** Cache of tile-blocked status for enemy map collision. */
  private mapTileBlockedCache = new Map<string, boolean>();

  /** Items dropped on the ground — persist for room lifetime. */
  private droppedItems = new Map<string, DroppedItemData>();

  /** Group ID this room belongs to (null = shared/temp room). */
  private groupId: string | null = null;

  /** Players whose death event has already been fired this session. */
  private deadPlayers = new Set<string>();

  /** Maps sessionId → player UUID in DB (needed for room state save). */
  private playerDbIds = new Map<string, string>();

  /** Clients waiting for session conflict resolution (second tab scenario). */
  private pendingTakeovers = new Map<string, { staleSessionId: string; player: PlayerState; fog: string[]; dbId: string }>();

  /** Fog-of-war tiles discovered per player (sessionId → "tx,ty"[]). */
  private playerFog = new Map<string, string[]>();

  /** Per-enemy velocity decided by AI tick, applied every move tick. */
  private enemyVelocities = new Map<string, { vx: number; vy: number }>();
  /** Tracks which enemy spawn zones have already been activated. */
  private spawnedZones = new Set<string>();
  /** Accumulated ms since last full game tick (hunger, AI decision, etc.). */
  private gameTickAccum = 0;

  /** Declarative rule engine — evaluates triggers and returns effects. */
  protected ruleEngine = new RuleEngine();
  /** When true, room events are broadcast to clients but NOT written to DB (used by TestRoom). */
  protected skipEventPersistence = false;
  /** IDs of approved mods already loaded into this room instance. */
  private loadedModIds = new Set<string>();
  /** Per-mod tracking of what was registered, so we can undo it on deactivation. */
  private loadedModVariantIds = new Map<string, string[]>();
  private loadedModRuleIds = new Map<string, string[]>();
  /** Throttle for on_hunger_low: sessionId → last fired timestamp. */
  private hungerLowThrottle = new Map<string, number>();

  // ─── Difficulty system ────────────────────────────────────────────────────
  /** Active difficulty overrides from the latest approved mod (or defaults). */
  private difficultyOverrides: DifficultyOverrides = {};
  /** Group age in days — cached on room create and refreshed every minute. */
  private groupAgeDays = 0;
  /** Last difficulty level index — used to detect level-up for on_difficulty_increase. */
  private lastDifficultyLevel = 0;
  /** sessionId → Date when that player joined the group. */
  private playerJoinedGroupAt = new Map<string, Date>();

  async onCreate(options: any) {
    this.groupId = options.groupId ?? null;
    const state = new WorldState();

    if (this.groupId) {
      // Group room: deterministic seed derived from groupId (unique map per group)
      let hash = 0;
      for (let i = 0; i < this.groupId.length; i++) {
        hash = Math.imul(31, hash) + this.groupId.charCodeAt(i) | 0;
      }
      state.mapSeed = Math.abs(hash) % 2_147_483_647 || 1;
      console.log(`[GameRoom] Group room seed: ${state.mapSeed} (groupId: ${this.groupId})`);
    } else {
      // Shared/temp room: load persistent seed from Supabase
      const savedSeed = await loadWorldSeed();
      if (savedSeed !== null) {
        state.mapSeed = savedSeed;
        console.log(`[GameRoom] Loaded world seed: ${savedSeed}`);
      } else {
        state.mapSeed = Math.floor(Math.random() * 2_147_483_647);
        await saveWorldSeed(state.mapSeed);
        console.log(`[GameRoom] Generated new world seed: ${state.mapSeed}`);
      }
    }
    this.setState(state);
    // Load persistent dead trees and rocks
    const { deadTrees, deadRocks } = await loadDeadResources();
    deadTrees.forEach(id => this.deadTrees.set(id, 0));
    deadRocks.forEach(id => this.deadRocks.add(id));
    console.log(`[GameRoom] Loaded ${deadTrees.length} dead trees, ${deadRocks.length} dead rocks`);
    // Single interval at ENEMY_MOVE_RATE (100ms); game logic fires every TICK_RATE ms via accumulator.
    this.setSimulationInterval((dt: number) => this.masterTick(dt), ENEMY_MOVE_RATE);
    this.registerMessageHandlers();
    // Auto-save all players every 30 seconds
    this.clock.setInterval(async () => {
      const saves: Promise<void>[] = [];
      this.state.players.forEach((player) => {
        saves.push(this._savePlayerState(player));
      });
      await Promise.allSettled(saves);
    }, 30_000);
    this.ruleEngine.loadRules(DEFAULT_RULES);

    // Load group age and refresh every 60s
    if (this.groupId) {
      this.groupAgeDays = await getGroupAgeDays(this.groupId);
      this.clock.setInterval(async () => {
        const prev = this.groupAgeDays;
        this.groupAgeDays = await getGroupAgeDays(this.groupId!);
        this._checkDifficultyLevelUp(prev);
      }, 60_000);
    }

    // Load all approved mods for this group
    if (this.groupId) {
      const approved = await loadApprovedMods(this.groupId);
      for (const mod of approved) this.applyMod(mod.id, mod.config);
      // Poll for newly approved mods + detect deactivated ones every 60s
      this.clock.setInterval(async () => {
        const latest = await loadApprovedMods(this.groupId!);
        const latestIds = new Set(latest.map((m) => m.id));
        // Apply new mods
        for (const mod of latest) {
          if (!this.loadedModIds.has(mod.id)) this.applyMod(mod.id, mod.config);
        }
        // Deactivate mods no longer approved (deleted/reverted)
        for (const loadedId of [...this.loadedModIds]) {
          if (!latestIds.has(loadedId)) this.deactivateMod(loadedId);
        }
      }, 60_000);
    }

    console.log(`[GameRoom] created – roomId: ${this.roomId}, seed: ${state.mapSeed}`);
  }

  /** Register a mod's monster variants and rules into the live room. */
  protected applyMod(modId: string, config: Record<string, any>): void {
    if (this.loadedModIds.has(modId)) return;
    this.loadedModIds.add(modId);

    const variants: any[] = config.monsterVariants ?? [];
    const variantIds: string[] = [];
    for (const v of variants) {
      const configId = `mod_${v.id}`;
      MONSTER_CONFIG[configId] = {
        id: configId,
        name: v.name,
        baseSprite: v.baseSprite ?? "hunter",
        tint: v.tint ?? 0xffffff,
        scale: v.scale ?? 1.0,
        hp: v.hp,
        maxHp: v.maxHp ?? v.hp,
        damage: v.damage,
        particleEffect: v.particleEffect,
        dropTable: v.dropTable ?? [],
      };
      variantIds.push(configId);
    }
    this.loadedModVariantIds.set(modId, variantIds);

    const rules: any[] = config.rules ?? [];
    if (rules.length > 0) this.ruleEngine.addRules(rules);
    this.loadedModRuleIds.set(modId, rules.map((r) => r.id));

    // Apply difficulty overrides if present
    if (config.difficultyOverrides) {
      this.difficultyOverrides = { ...this.difficultyOverrides, ...config.difficultyOverrides };
      // Enforce minimum new player protection
      if (this.difficultyOverrides.newPlayerProtectionDays !== undefined) {
        this.difficultyOverrides.newPlayerProtectionDays = Math.max(1, this.difficultyOverrides.newPlayerProtectionDays);
      }
      console.log(`[GameRoom] Mod ${modId} applied difficultyOverrides`);
    }

    console.log(`[GameRoom] Applied mod ${modId} — variants: ${variants.length}, rules: ${rules.length}`);
    this.broadcast("mod_activated", { modId, name: config.name ?? modId });
  }

  /** Remove a mod's variants and rules from the live room. */
  protected deactivateMod(modId: string): void {
    if (!this.loadedModIds.has(modId)) return;
    this.loadedModIds.delete(modId);

    const variantIds = this.loadedModVariantIds.get(modId) ?? [];
    for (const configId of variantIds) delete MONSTER_CONFIG[configId];
    this.loadedModVariantIds.delete(modId);

    const ruleIds = this.loadedModRuleIds.get(modId) ?? [];
    if (ruleIds.length > 0) this.ruleEngine.removeRulesByIds(ruleIds);
    this.loadedModRuleIds.delete(modId);

    // Reset difficulty overrides — rebuild from remaining active mods
    this.difficultyOverrides = {};
    for (const [activeModId] of this.loadedModVariantIds) {
      // Re-apply overrides from still-active mods (loaded in MONSTER_CONFIG)
      // Note: full rebuild not needed here — simple reset suffices since
      // difficulty is recalculated live from this.difficultyOverrides each tick.
      void activeModId;
    }

    console.log(`[GameRoom] Deactivated mod ${modId}`);
    this.broadcast("mod_deactivated", { modId });
  }

  async onJoin(client: Client, options: { token?: string; nickname?: string }) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.nickname = options.nickname ?? "Player";
    player.x = 400 + Math.random() * 200;
    player.y = 300 + Math.random() * 200;

    // Verify Clerk JWT if provided; guests fall back to sessionId
    if (options.token) {
      try {
        const payload = await verifyToken(options.token, {
          secretKey: process.env.CLERK_SECRET_KEY,
          jwtKey: process.env.CLERK_JWT_KEY,
        });
        player.userId = payload.sub;

        // If this userId is already in the room (e.g. F5 before onLeave completes),
        // take over their in-memory position and remove the stale session.
        let staleSessionId: string | null = null;
        this.state.players.forEach((p, sid) => {
          if (p.userId === payload.sub) staleSessionId = sid;
        });
        if (staleSessionId) {
          const stale = this.state.players.get(staleSessionId)!;
          const oldClient = this.clients.find(c => c.sessionId === staleSessionId);

          if (oldClient) {
            // Old session is still actively connected — real conflict (second tab/browser)
            const staleFog = this.playerFog.get(staleSessionId) ?? [];
            const staleDbId = this.playerDbIds.get(staleSessionId) ?? "";
            // Copy current state from active player to pending player object
            player.x = stale.x; player.y = stale.y;
            player.hp = stale.hp; player.maxHp = stale.maxHp;
            player.hunger = stale.hunger; player.sanity = stale.sanity;
            player.attack = stale.attack; player.defense = stale.defense;
            player.activeSlot = stale.activeSlot;
            stale.inventory.forEach((item) => player.inventory.push(item));
            stale.equipment.forEach((itemId, slot) => player.equipment.set(slot, itemId));
            this.pendingTakeovers.set(client.sessionId, { staleSessionId, player, fog: staleFog, dbId: staleDbId });
            client.send("session_conflict", {});
            oldClient.send("session_incoming", {});
            console.log(`[GameRoom] Session conflict: ${player.nickname} connecting from second location`);
            return; // Don't add to state — wait for confirm_takeover or decline_takeover
          }

          // Old client is gone (F5 reconnect) — auto-takeover
          player.x = stale.x;
          player.y = stale.y;
          player.hp = stale.hp;
          player.maxHp = stale.maxHp;
          player.hunger = stale.hunger;
          player.sanity = stale.sanity;
          player.attack = stale.attack;
          player.defense = stale.defense;
          player.activeSlot = stale.activeSlot;
          stale.inventory.forEach((item) => player.inventory.push(item));
          stale.equipment.forEach((itemId, slot) => player.equipment.set(slot, itemId));
          // Move fog to new session
          const staleFog = this.playerFog.get(staleSessionId) ?? [];
          // Save stale player before removing — onLeave will find null otherwise
          await this._savePlayerState(stale);
          this.playerFog.set(client.sessionId, staleFog);
          this.playerFog.delete(staleSessionId);
          this.state.players.delete(staleSessionId);
          this.broadcast("player_remove", { sessionId: staleSessionId }, { except: client });
          console.log(`[GameRoom] Took over stale session ${staleSessionId} for ${player.nickname}`);
        } else {
          // Fresh join — load from Supabase
          const saved = await loadPlayer(payload.sub, player.nickname);
          if (saved) {
            // Clerk name takes priority over stored nickname
            player.nickname = (options.nickname?.trim() || saved.nickname);
            player.x = saved.x;
            player.y = saved.y;
            player.hp = saved.hp;
            player.maxHp = saved.max_hp;
            player.hunger = saved.hunger;
            player.sanity = saved.sanity;
            player.attack = saved.attack;
            player.defense = saved.defense;
            if (Array.isArray(saved.inventory)) {
              saved.inventory.forEach((item) => player.inventory.push(item));
            }
            if (saved.equipment && typeof saved.equipment === "object") {
              Object.entries(saved.equipment).forEach(([slot, itemId]) => {
                player.equipment.set(slot, itemId as string);
              });
            }
            this.recalcStats(player);
            player.activeSlot = saved.active_slot;
            // Restore fog
            this.playerFog.set(client.sessionId, Array.isArray(saved.fog) ? saved.fog : []);
            // Per-room state overlay (position + inventory)
            if (this.groupId) {
              this.playerDbIds.set(client.sessionId, saved.id);
              const roomState = await loadRoomState(saved.id, this.groupId);
              // Always clear inventory loaded from global players table — room state is authoritative
              while (player.inventory.length > 0) player.inventory.splice(0, 1);
              if (roomState) {
                player.x = roomState.x;
                player.y = roomState.y;
                if (Array.isArray(roomState.inventory)) {
                  roomState.inventory.forEach((item: string) => player.inventory.push(item));
                }
                console.log(`[GameRoom] Loaded room state for ${player.nickname} in group ${this.groupId}`);
              } else {
                // First time in this room — reset position to spawn
                player.x = 400 + Math.random() * 200;
                player.y = 300 + Math.random() * 200;
                console.log(`[GameRoom] Fresh room state for ${player.nickname} in group ${this.groupId}`);
              }
            }
          } else {
            this.playerFog.set(client.sessionId, []);
            if (this.groupId) this.playerDbIds.set(client.sessionId, "");
          }
          console.log(`[GameRoom] ${player.nickname} joined (clerkId: ${payload.sub})`);
        }
      } catch (err) {
        console.warn(`[GameRoom] invalid token from ${client.sessionId}:`, err);
        client.leave(4001);
        return;
      }
    } else {
      const guestId = (options as any).guestId as string | undefined;
      const userId  = guestId ? `guest_${guestId}` : client.sessionId;
      player.userId = userId;

      // Stale session detection for guests (fast F5 where old WS still open)
      let staleSessionId: string | null = null;
      this.state.players.forEach((p, sid) => {
        if (p.userId === userId) staleSessionId = sid;
      });
      if (staleSessionId) {
        const stale = this.state.players.get(staleSessionId)!;
        const oldClient = this.clients.find(c => c.sessionId === staleSessionId);

        if (oldClient) {
          // Old guest session still active (duplicated tab) — show conflict modal
          const staleFog = this.playerFog.get(staleSessionId) ?? [];
          player.x = stale.x; player.y = stale.y;
          player.hp = stale.hp; player.maxHp = stale.maxHp;
          player.hunger = stale.hunger; player.sanity = stale.sanity;
          player.attack = stale.attack; player.defense = stale.defense;
          player.activeSlot = stale.activeSlot;
          stale.inventory.forEach((item) => player.inventory.push(item));
          stale.equipment.forEach((itemId, slot) => player.equipment.set(slot, itemId));
          this.pendingTakeovers.set(client.sessionId, { staleSessionId, player, fog: staleFog, dbId: "" });
          client.send("session_conflict", {});
          oldClient.send("session_incoming", {});
          console.log(`[GameRoom] Guest session conflict: ${userId}`);
          return;
        }

        // Old client gone (F5) — auto-takeover
        player.x = stale.x; player.y = stale.y;
        player.hp = stale.hp; player.maxHp = stale.maxHp;
        player.hunger = stale.hunger; player.sanity = stale.sanity;
        player.attack = stale.attack; player.defense = stale.defense;
        player.activeSlot = stale.activeSlot;
        stale.inventory.forEach((item) => player.inventory.push(item));
        stale.equipment.forEach((itemId, slot) => player.equipment.set(slot, itemId));
        const staleFog = this.playerFog.get(staleSessionId) ?? [];
        // Save stale player before removing — onLeave will find null otherwise
        await this._savePlayerState(stale);
        this.playerFog.set(client.sessionId, staleFog);
        this.playerFog.delete(staleSessionId);
        this.state.players.delete(staleSessionId);
        this.broadcast("player_remove", { sessionId: staleSessionId }, { except: client });
        console.log(`[GameRoom] Guest took over stale session ${staleSessionId}`);
      } else if (guestId) {
        // Fresh join — try to load from DB
        const saved = await loadPlayer(userId, player.nickname);
        if (saved) {
          player.x = saved.x; player.y = saved.y;
          player.hp = saved.hp; player.maxHp = saved.max_hp;
          player.hunger = saved.hunger; player.sanity = saved.sanity;
          player.attack = saved.attack; player.defense = saved.defense;
          if (Array.isArray(saved.inventory)) {
            saved.inventory.forEach((item) => player.inventory.push(item));
          }
          if (saved.equipment && typeof saved.equipment === "object") {
            Object.entries(saved.equipment).forEach(([slot, itemId]) => {
              player.equipment.set(slot, itemId as string);
            });
          }
          this.recalcStats(player);
          player.activeSlot = saved.active_slot;
          this.playerFog.set(client.sessionId, Array.isArray(saved.fog) ? saved.fog : []);
          console.log(`[GameRoom] Guest ${userId} restored from DB`);
        } else {
          this.playerFog.set(client.sessionId, []);
          console.log(`[GameRoom] ${player.nickname} joined as new guest (${userId})`);
        }
      }
      // No guestId at all = anonymous fallback (old behaviour, no persistence)
    }

    this.state.players.set(client.sessionId, player);
    this._updateMetadata();

    // Load when this player joined the group (for new-player protection)
    if (this.groupId) {
      const dbId = this.playerDbIds.get(client.sessionId);
      if (dbId) {
        const joinedAt = await getPlayerJoinedGroupAt(dbId, this.groupId);
        if (joinedAt) this.playerJoinedGroupAt.set(client.sessionId, joinedAt);
        else this.playerJoinedGroupAt.set(client.sessionId, new Date());
      } else {
        // Guest or unknown — no protection
        this.playerJoinedGroupAt.delete(client.sessionId);
      }
    }

    // Send existing players to the new client
    const existing: object[] = [];
    this.state.players.forEach((p, sid) => {
      if (sid !== client.sessionId) {
        existing.push({ sessionId: sid, x: p.x, y: p.y, animKey: p.animKey, nickname: p.nickname });
      }
    });
    client.send("players_init", existing);

    // Trees and rocks are client-generated; dead state is sent on request.

    // Notify everyone else about the new player
    this.broadcast("player_add", {
      sessionId: client.sessionId,
      x: player.x,
      y: player.y,
      animKey: player.animKey,
      nickname: player.nickname,
    }, { except: client });

    client.send("session_ready", {});
  }

  async onLeave(client: Client, _code?: number) {
    this.pendingTakeovers.delete(client.sessionId);
    this.hungerLowThrottle.delete(client.sessionId);
    this.playerJoinedGroupAt.delete(client.sessionId);
    const player = this.state.players.get(client.sessionId);
    if (player) {
      await this._savePlayerState(player);
      this.playerFog.delete(client.sessionId);
      this.playerDbIds.delete(client.sessionId);
      this.state.players.delete(client.sessionId);
    }
    this.broadcast("player_remove", { sessionId: client.sessionId });
    console.log(`[GameRoom] ${client.sessionId} left`);
    this._updateMetadata();
  }

  /** Broadcast a room event to clients and (unless skipEventPersistence) persist to DB. */
  private broadcastRoomEvent(type: string, playerName: string, message: string) {
    const event = { id: crypto.randomUUID(), type, playerName, message, timestamp: Date.now() };
    this.broadcast("room_event", event);
    if (!this.skipEventPersistence) {
      insertRoomEvent(this.roomId, this.groupId, type, playerName, message).catch(() => {});
    }
  }

  /** Save player — routes to room state table when in a group room. */
  async _savePlayerState(player: PlayerState): Promise<void> {
    const fog = this.playerFog.get(player.sessionId) ?? [];
    if (this.groupId) {
      const dbId = this.playerDbIds.get(player.sessionId);
      if (dbId) {
        await saveRoomState(dbId, this.groupId, player);
        return;
      }
    }
    await savePlayer(player, fog);
  }

  _updateMetadata() {
    let authenticated = 0;
    let guests = 0;
    this.state.players.forEach((p) => {
      p.userId === p.sessionId ? guests++ : authenticated++;
    });
    this.setMetadata({ authenticated, guests, groupId: this.groupId });
  }

  onDispose() {
    console.log(`[GameRoom] disposed – roomId: ${this.roomId}`);
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  protected masterTick(dt: number) {
    // Enemy movement + separation every call (100ms)
    this.tickEnemyMovement();
    this.separateEnemies();

    // Full game logic every TICK_RATE ms
    this.gameTickAccum += dt;
    if (this.gameTickAccum >= TICK_RATE) {
      this.gameTickAccum -= TICK_RATE;
      const now = Date.now();
      this.updateWorldTime(now);
      this.drainHungerAndSanity();
      this.tickRuleEngine();
      this.sendStatsToPlayers();
      this.respawnNodes(now);
      this.tickEnemyAI();
    }
  }

  private updateWorldTime(now: number) {
    this.state.worldTime = (now % DAY_DURATION) / DAY_DURATION;
    this.state.isNight = this.state.worldTime > 0.75 || this.state.worldTime < 0.25;
  }

  private drainHungerAndSanity() {
    this.state.players.forEach((player: PlayerState) => {
      if (!player.isOnline) return;

      // Hunger
      player.hunger = Math.max(0, player.hunger - HUNGER_DRAIN_PER_SEC);

      // Sanity — passive regen (grows by not killing)
      player.sanity = Math.min(100, player.sanity + SANITY_PASSIVE_REGEN);

      // Hunger hurts HP
      if (player.hunger <= 0) {
        const prevHp = player.hp;
        player.hp = Math.max(0, player.hp - 1);
        if (prevHp > 0 && player.hp === 0 && !this.deadPlayers.has(player.sessionId)) {
          this.deadPlayers.add(player.sessionId);
          const c = this.clients.find(cl => cl.sessionId === player.sessionId);
          if (c) this.handlePlayerDeath(player, c);
        }
      }

      // on_hunger_low trigger — throttled to once per minute per player
      if (player.hunger < 20) {
        const now = Date.now();
        const lastFired = this.hungerLowThrottle.get(player.sessionId) ?? 0;
        if (now - lastFired > 60_000) {
          this.hungerLowThrottle.set(player.sessionId, now);
          const effects = this.ruleEngine.evaluate('on_hunger_low', {
            player: { hp: player.hp, maxHp: player.maxHp, hunger: player.hunger, sanity: player.sanity, sessionId: player.sessionId },
            world:  { isNight: this.state.isNight, worldTime: this.state.worldTime, weather: this.state.weather },
          });
          if (effects.length > 0) {
            const c = this.clients.find(c => c.sessionId === player.sessionId);
            this.applyRuleEffects(effects, { client: c, player });
          }
        }
      }
    });
  }

  // ─── Rule Engine ──────────────────────────────────────────────────────────

  private tickRuleEngine() {
    const worldCtx = {
      isNight: this.state.isNight,
      worldTime: this.state.worldTime,
      weather: this.state.weather,
    };
    const tickEffects  = this.ruleEngine.evaluate('on_tick',   { world: worldCtx });
    const timerEffects = this.ruleEngine.evaluate('every_Ns',  { world: worldCtx });
    const allEffects = [...tickEffects, ...timerEffects];
    if (allEffects.length > 0) this.applyRuleEffects(allEffects, {});
  }

  private applyRuleEffects(
    effects: RuleEffect[],
    ctx: { client?: Client; player?: PlayerState }
  ) {
    for (const effect of effects) {
      switch (effect.action) {

        case 'modify_stat': {
          const field = effect.field as 'hp' | 'hunger' | 'sanity';
          if (!field || !['hp', 'hunger', 'sanity'].includes(field)) break;
          const delta = typeof effect.value === 'number' ? effect.value : 0;
          const applyTo = (p: PlayerState) => {
            const max = field === 'hp' ? p.maxHp : 100;
            (p as any)[field] = Math.max(0, Math.min(max, (p as any)[field] + delta));
          };
          if (effect.target === 'all_players') {
            this.state.players.forEach(applyTo);
          } else if (ctx.player) {
            applyTo(ctx.player);
          }
          break;
        }

        case 'add_item': {
          const qty = typeof effect.value === 'number' ? effect.value : 1;
          const pickItem = () =>
            effect.pool && effect.pool.length > 0
              ? effect.pool[Math.floor(Math.random() * effect.pool.length)]
              : (typeof effect.field === 'string' ? effect.field : null);
          if (effect.target === 'all_players') {
            this.state.players.forEach((p) => {
              const itemId = pickItem();
              if (!itemId) return;
              for (let i = 0; i < qty; i++) p.inventory.push(itemId);
              const c = this.clients.find(c => c.sessionId === p.sessionId);
              c?.send('inventory_load', Array.from(p.inventory));
            });
          } else if (ctx.player && ctx.client) {
            const itemId = pickItem();
            if (!itemId) break;
            for (let i = 0; i < qty; i++) ctx.player.inventory.push(itemId);
            ctx.client.send('inventory_load', Array.from(ctx.player.inventory));
          }
          break;
        }

        case 'spawn_enemy': {
          const configId = typeof effect.value === 'string' ? effect.value : 'hunter';
          const count = effect.qty ?? 1;
          const players: Array<{ x: number; y: number }> = [];
          this.state.players.forEach(p => { if (p.isOnline) players.push({ x: p.x, y: p.y }); });
          for (let i = 0; i < count; i++) {
            const base = players.length > 0
              ? players[Math.floor(Math.random() * players.length)]
              : { x: 0, y: 0 };
            const angle = Math.random() * Math.PI * 2;
            const dist  = 300 + Math.random() * 300;
            const ex = base.x + Math.cos(angle) * dist;
            const ey = base.y + Math.sin(angle) * dist;
            const id = `rule_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`;
            this.spawnSingleEnemy(id, ex, ey, configId);
          }
          break;
        }

        case 'broadcast_message': {
          const text = typeof effect.value === 'string' ? effect.value : '';
          if (text) this.broadcast('rule_message', { text });
          break;
        }

        case 'set_weather': {
          const weather = typeof effect.value === 'string' ? effect.value : 'clear';
          this.state.weather = weather;
          this.broadcast('weather_change', { weather });
          break;
        }
      }
    }
  }

  /** Replace active rules — used by AI mod pipeline (Wieczór 47). */
  applyModRules(rules: Rule[]) {
    this.ruleEngine.applyModRules(rules);
    console.log(`[GameRoom] applyModRules: ${rules.length} rule(s) loaded`);
  }

  private recalcStats(player: PlayerState) {
    const weaponId = player.equipment.get("weapon");
    const armorId  = player.equipment.get("armor");
    const helmetId = player.equipment.get("helmet");
    const weaponBonus  = weaponId  ? (getLootItem(weaponId)?.attackBonus  ?? 0) : 0;
    const armorBonus   = armorId   ? (getLootItem(armorId)?.defenseBonus  ?? 0) : 0;
    const helmetBonus  = helmetId  ? (getLootItem(helmetId)?.defenseBonus ?? 0) : 0;
    player.attack  = BASE_ATTACK  + weaponBonus;
    player.defense = BASE_DEFENSE + armorBonus + helmetBonus;
  }

  // ─── Difficulty helpers ───────────────────────────────────────────────────

  /** Returns zone tier 0–3 for a world position. */
  private getDistanceZone(x: number, y: number): 0 | 1 | 2 | 3 {
    const dist = Math.hypot(x, y);
    const [z1, z2, z3] = this.difficultyOverrides.zoneBoundaries ?? DEFAULT_ZONE_BOUNDARIES;
    if (dist < z1) return 0;
    if (dist < z2) return 1;
    if (dist < z3) return 2;
    return 3;
  }

  /** Returns the combined difficulty multiplier (capped). */
  getDifficultyMultiplier(zone: 0 | 1 | 2 | 3, groupDays?: number): number {
    const days = groupDays ?? this.groupAgeDays;
    const daySc  = this.difficultyOverrides.dayScaleFactor  ?? DEFAULT_DAY_SCALE_FACTOR;
    const zoneSc = this.difficultyOverrides.zoneScaleFactor ?? DEFAULT_ZONE_SCALE_FACTOR;
    const cap    = this.difficultyOverrides.maxDifficultyMultiplier ?? DEFAULT_MAX_DIFFICULTY;
    const mult   = (1 + days * daySc) * (1 + zone * zoneSc);
    return Math.min(mult, cap);
  }

  /** Returns current global difficulty level index (0-based). */
  private getCurrentDifficultyLevelIndex(): number {
    const levels = this.difficultyOverrides.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
    let idx = 0;
    for (let i = 0; i < levels.length; i++) {
      if (this.groupAgeDays >= levels[i].minDay) idx = i;
    }
    return idx;
  }

  /** Returns difficulty level info for the current group age. */
  getDifficultyLevelInfo(): { level: number; name: string; color: string; daysToNext: number } {
    const levels = this.difficultyOverrides.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
    const idx = this.getCurrentDifficultyLevelIndex();
    const current = levels[idx];
    const next = levels[idx + 1];
    const daysToNext = next ? Math.max(0, Math.ceil(next.minDay - this.groupAgeDays)) : 0;
    return { level: idx + 1, name: current.name, color: current.color, daysToNext };
  }

  /** Checks if difficulty has leveled up since last check, fires rule trigger if so. */
  private _checkDifficultyLevelUp(prevDays: number): void {
    const prevIdx = this._getDifficultyLevelIndexForDays(prevDays);
    const currIdx = this.getCurrentDifficultyLevelIndex();
    if (currIdx > prevIdx) {
      this.lastDifficultyLevel = currIdx;
      const info = this.getDifficultyLevelInfo();
      this.broadcast("difficulty_increase", { level: info.level, name: info.name, color: info.color });
      const effects = this.ruleEngine.evaluate("on_difficulty_increase", {
        world: { isNight: this.state.isNight, worldTime: this.state.worldTime, weather: this.state.weather },
      });
      if (effects.length > 0) this.applyRuleEffects(effects, {});
    }
  }

  private _getDifficultyLevelIndexForDays(days: number): number {
    const levels = this.difficultyOverrides.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
    let idx = 0;
    for (let i = 0; i < levels.length; i++) {
      if (days >= levels[i].minDay) idx = i;
    }
    return idx;
  }

  /** Returns true if the player is still within their new-player protection window. */
  private isNewPlayerProtected(sessionId: string): boolean {
    const joinedAt = this.playerJoinedGroupAt.get(sessionId);
    if (!joinedAt) return false;
    const protectionDays = Math.max(
      1,
      this.difficultyOverrides.newPlayerProtectionDays ?? DEFAULT_NEW_PLAYER_PROTECTION_DAYS
    );
    const daysInGroup = (Date.now() - joinedAt.getTime()) / 86_400_000;
    return daysInGroup < protectionDays;
  }

  /** Returns remaining protection days for a player (0 if none). */
  private getProtectionDaysLeft(sessionId: string): number {
    const joinedAt = this.playerJoinedGroupAt.get(sessionId);
    if (!joinedAt) return 0;
    const protectionDays = Math.max(
      1,
      this.difficultyOverrides.newPlayerProtectionDays ?? DEFAULT_NEW_PLAYER_PROTECTION_DAYS
    );
    const daysInGroup = (Date.now() - joinedAt.getTime()) / 86_400_000;
    return Math.max(0, Math.ceil(protectionDays - daysInGroup));
  }

  /**
   * Resolves death drops for a player.
   * Returns array of itemIds to drop (may be empty).
   * New players always get minimum penalty.
   */
  private resolveDeathDrops(player: PlayerState, difficulty: number): string[] {
    const thresholds = this.difficultyOverrides.deathDropThresholds ?? DEFAULT_DEATH_DROP_THRESHOLDS;
    const isProtected = this.isNewPlayerProtected(player.sessionId);

    // Find matching threshold (sorted ascending — pick the last that applies)
    let threshold = thresholds[0];
    if (isProtected) {
      // Force minimum penalty for new players
      threshold = thresholds[0];
    } else {
      for (const t of thresholds) {
        if (difficulty >= t.minDifficulty) threshold = t;
      }
    }

    if (Math.random() > threshold.dropChance) return [];

    const count = threshold.minDrops + Math.floor(
      Math.random() * (threshold.maxDrops - threshold.minDrops + 1)
    );

    // Build inventory copy to pick from (exclude equipped items)
    const equipped = new Set<string>();
    player.equipment.forEach((itemId) => equipped.add(itemId));
    const pickable = Array.from(player.inventory).filter((id) => !equipped.has(id));
    if (pickable.length === 0) return [];

    const dropped: string[] = [];
    const available = [...pickable];
    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      dropped.push(available.splice(idx, 1)[0]);
    }
    return dropped;
  }

  /** Handle player death: drop items, respawn at bonfire, apply penalties. */
  private handlePlayerDeath(player: PlayerState, client: Client): void {
    const zone = this.getDistanceZone(player.x, player.y);
    const difficulty = this.getDifficultyMultiplier(zone);

    // Resolve item drops
    const droppedItemIds = this.resolveDeathDrops(player, difficulty);
    const spawnedDrops: DroppedItemData[] = [];
    for (const itemId of droppedItemIds) {
      const idx = player.inventory.indexOf(itemId);
      if (idx !== -1) {
        player.inventory.splice(idx, 1);
        const dropId = `death_drop_${crypto.randomUUID()}`;
        const angle = Math.random() * Math.PI * 2;
        const dropData: DroppedItemData = {
          id: dropId,
          itemId,
          qty: 1,
          x: player.x + Math.cos(angle) * 24,
          y: player.y + Math.sin(angle) * 24,
        };
        this.droppedItems.set(dropId, dropData);
        spawnedDrops.push(dropData);
      }
    }
    if (spawnedDrops.length > 0) {
      this.broadcast("dropped_items_init", [
        ...Array.from(this.droppedItems.values()),
      ]);
    }

    // Apply respawn penalties (capped)
    const penalty = this.difficultyOverrides.respawnPenalty ?? {};
    const hungerLoss = penalty.hungerLoss ?? 0.25;
    const sanityLoss = penalty.sanityLoss ?? 0.20;
    player.hunger = Math.max(0, player.hunger - player.hunger * hungerLoss);
    player.sanity = Math.max(0, player.sanity - 100 * sanityLoss);

    // Find nearest group bonfire
    let respawnX = 400 + Math.random() * 200;
    let respawnY = 300 + Math.random() * 200;
    let nearestBonfireDist = Infinity;
    this.state.buildings.forEach((b: BuildingState) => {
      if (b.type !== "bonfire") return;
      const d = Math.hypot(b.x - player.x, b.y - player.y);
      if (d < nearestBonfireDist) {
        nearestBonfireDist = d;
        respawnX = b.x + 32;
        respawnY = b.y + 32;
      }
    });

    // Restore HP to half
    player.hp = Math.floor(player.maxHp * 0.5);

    // Broadcast death to all, then respawn to the player after 3s
    this.broadcast("player_death", {
      sessionId: player.sessionId,
      nickname: player.nickname,
      droppedItems: droppedItemIds,
      x: player.x,
      y: player.y,
    });
    this.broadcastRoomEvent("death", player.nickname, `☠ ${player.nickname} zginął(a)`);

    // Fire on_player_death rule trigger
    const deathEffects = this.ruleEngine.evaluate("on_player_death", {
      player: { hp: 0, maxHp: player.maxHp, hunger: player.hunger, sanity: player.sanity, sessionId: player.sessionId },
      world: { isNight: this.state.isNight, worldTime: this.state.worldTime, weather: this.state.weather },
    });
    if (deathEffects.length > 0) this.applyRuleEffects(deathEffects, { client, player });

    // Respawn after 3 seconds
    this.clock.setTimeout(() => {
      player.x = respawnX;
      player.y = respawnY;
      this.deadPlayers.delete(player.sessionId);
      client.send("player_respawn", { x: respawnX, y: respawnY, hp: player.hp });
      client.send("inventory_load", Array.from(player.inventory));
      this.sendStatsToPlayers();
      this._savePlayerState(player).catch(() => {});
      console.log(`[GameRoom] ${player.nickname} respawned at bonfire (${respawnX}, ${respawnY})`);
    }, 3_000);
  }

  private sendStatsToPlayers() {
    const diffInfo = this.getDifficultyLevelInfo();
    this.clients.forEach((client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isOnline) return;
      const effectiveAttack = player.sanity <= 0
        ? Math.max(1, Math.floor(player.attack / 2))
        : player.attack;
      const equipment: Record<string, string> = {};
      player.equipment.forEach((itemId, slot) => { equipment[slot] = itemId; });
      client.send("stats_update", {
        hp: player.hp,
        maxHp: player.maxHp,
        hunger: player.hunger,
        sanity: player.sanity,
        attack: effectiveAttack,
        defense: player.defense,
        nickname: player.nickname,
        isNight: this.state.isNight,
        worldTime: this.state.worldTime,
        equipment,
        // Difficulty info
        groupAgeDays: Math.floor(this.groupAgeDays),
        difficultyLevel: diffInfo.level,
        difficultyName: diffInfo.name,
        difficultyColor: diffInfo.color,
        daysToNextLevel: diffInfo.daysToNext,
        newPlayerProtectionDaysLeft: this.getProtectionDaysLeft(client.sessionId),
      });
    });
  }

  private respawnNodes(now: number) {
    this.state.resources.forEach((node: ResourceNode) => {
      if (!node.isAlive && node.respawnAt > 0 && now >= node.respawnAt) {
        node.hp = node.maxHp;
        node.isAlive = true;
        node.respawnAt = 0;
        this.broadcast("resource_update", { id: node.id, hp: node.hp, isAlive: true });
      }
    });

    this.state.foods.forEach((food: FoodNode) => {
      if (!food.isAlive && food.respawnAt > 0 && now >= food.respawnAt) {
        food.isAlive = true;
        food.respawnAt = 0;
      }
    });

    // Respawn client-side food nodes (mushrooms, berry bushes)
    for (const [id, respawnAt] of this.deadFoodNodes) {
      if (now >= respawnAt) {
        this.deadFoodNodes.delete(id);
        this.broadcast("food_respawn", { id });
      }
    }
  }

  private respawnDeadTrees(now: number) {
    this.deadTrees.forEach((respawnAt, id) => {
      if (now >= respawnAt) {
        this.deadTrees.delete(id);
        this.broadcast("tree_respawn", { id });
      }
    });
  }

  // ─── Enemy Spawn Zones ────────────────────────────────────────────────────

  /** Deterministic hash of a zone coordinate. */
  private hashZone(zx: number, zy: number): number {
    const seed = this.state.mapSeed;
    let h = (seed ^ Math.imul(zx, 374761393) ^ Math.imul(zy, 668265263)) | 0;
    h = (h + 0x6D2B79F5) | 0;
    h = Math.imul(h ^ (h >>> 15), 1 | h);
    h = (h + Math.imul(h ^ (h >>> 7), 61 | h)) ^ h;
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  }

  /** Activate a zone: maybe spawn 0–8 enemies deterministically. */
  private activateZone(zx: number, zy: number) {
    const key = `${zx},${zy}`;
    if (this.spawnedZones.has(key)) return;
    this.spawnedZones.add(key);

    // Keep origin area empty
    if (zx * zx + zy * zy < ENEMY_SPAWN_CLEAR * ENEMY_SPAWN_CLEAR) return;

    const h = this.hashZone(zx, zy);
    let count: number;
    if      (h < 0.80) return;         // 80% — empty zone
    else if (h < 0.93) count = 1;      // 13% — lone hunter
    else if (h < 0.98) count = 2;      // 5%  — pair
    else               count = 3;      // 2%  — trio (no large packs)

    let alive = 0;
    this.state.enemies.forEach((e: EnemyState) => { if (e.isAlive) alive++; });

    for (let i = 0; i < count; i++) {
      if (alive >= MAX_ALIVE_ENEMIES) break;
      // Try up to 8 positions — skip any that land on a collision tile
      for (let attempt = 0; attempt < 8; attempt++) {
        const hx = this.hashZone(zx * 1000 + i * 31 + attempt * 13, zy * 7 + 1);
        const hy = this.hashZone(zx * 7 + 1, zy * 1000 + i * 31 + attempt * 13);
        const ex = zx * ENEMY_ZONE_PX + hx * ENEMY_ZONE_PX;
        const ey = zy * ENEMY_ZONE_PX + hy * ENEMY_ZONE_PX;
        if (!this.isEnemyMoveBlocked(ex, ey)) {
          const configId = this._getEnemyConfigForPosition(ex, ey);
          this.spawnSingleEnemy(`e_${zx}_${zy}_${i}`, ex, ey, configId);
          alive++;
          break;
        }
      }
    }
  }

  /** Returns a configId from the zone-appropriate pool. */
  private _getEnemyConfigForPosition(x: number, y: number): string {
    const zone = this.getDistanceZone(x, y);
    const pools: Record<0 | 1 | 2 | 3, string[]> = {
      0: ["hunter"],
      1: ["hunter", "fire_hunter"],
      2: ["fire_hunter", "boss_hunter"],
      3: ["boss_hunter", "boss_hunter", "fire_hunter"],
    };
    const pool = pools[zone];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private spawnSingleEnemy(id: string, x: number, y: number, configId = "hunter") {
    if (this.state.enemies.has(id)) return;
    const config = MONSTER_CONFIG[configId] ?? MONSTER_CONFIG["hunter"];
    const zone = this.getDistanceZone(x, y);
    const mult = this.getDifficultyMultiplier(zone);
    const enemy = new EnemyState();
    enemy.id       = id;
    enemy.type     = "hunter";
    enemy.configId = config.id;
    enemy.x        = x;
    enemy.y        = y;
    enemy.hp       = Math.round(config.hp * mult);
    enemy.maxHp    = Math.round(config.maxHp * mult);
    enemy.isAlive  = true;
    enemy.animKey  = "idle_down";
    this.state.enemies.set(id, enemy);
    this.enemyVelocities.set(id, { vx: 0, vy: 0 });
  }

  // ─── Enemy AI ─────────────────────────────────────────────────────────────

  /** Called every 1000ms — decides each enemy's velocity and attack. */
  private tickEnemyAI() {
    const players: Array<{ x: number; y: number; sessionId: string }> = [];
    this.state.players.forEach((p: PlayerState) => {
      if (p.isOnline) players.push({ x: p.x, y: p.y, sessionId: p.sessionId });
    });

    // px per 100ms move tick
    const moveSpeed = ENEMY_SPEED * (ENEMY_MOVE_RATE / 1000);

    // Process status effects (DoT + expiry)
    const nowTick = Date.now();
    this.state.enemies.forEach((enemy: EnemyState) => {
      if (!enemy.isAlive) return;
      let statusChanged = false;
      const toDelete: string[] = [];
      enemy.statusEffects.forEach((expiry, effect) => {
        if (nowTick > expiry) { toDelete.push(effect); statusChanged = true; return; }
        if (effect === "fire")   { enemy.hp = Math.max(0, enemy.hp - 5); statusChanged = true; }
        if (effect === "poison") { enemy.hp = Math.max(0, enemy.hp - 3); statusChanged = true; }
      });
      for (const k of toDelete) enemy.statusEffects.delete(k);
      if (statusChanged) {
        this.broadcast("enemy_hit", { id: enemy.id, hp: enemy.hp });
        this.broadcast("enemy_status_update", {
          id: enemy.id,
          effects: Object.fromEntries(enemy.statusEffects.entries()),
        });
        if (enemy.hp <= 0 && enemy.isAlive) {
          enemy.isAlive = false;
          enemy.hp = 0;
          this.broadcast("enemy_dead", { id: enemy.id, x: enemy.x, y: enemy.y });
        }
      }
    });

    this.state.enemies.forEach((enemy: EnemyState) => {
      if (!enemy.isAlive) return;

      // Find nearest player
      let nearest: { x: number; y: number; sessionId: string } | null = null;
      let nearestDist = Infinity;
      for (const p of players) {
        const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (d < nearestDist) { nearestDist = d; nearest = p; }
      }

      if (!nearest) return;

      const dx = nearest.x - enemy.x;
      const dy = nearest.y - enemy.y;
      const dir = Math.abs(dx) >= Math.abs(dy)
        ? (dx > 0 ? "right" : "left")
        : (dy > 0 ? "down" : "up");

      if (nearestDist < ENEMY_STOP_DIST) {
        // ── In melee range — stop moving ──────────────────────────────────────
        this.enemyVelocities.set(enemy.id, { vx: 0, vy: 0 });

        if (nearestDist < ENEMY_MELEE_RANGE) {
          // ── Attack (pierce) ─────────────────────────────────────────────────
          enemy.animKey = `pierce_${dir}`;
          const attackedPlayer = this.state.players.get(nearest.sessionId);
          if (attackedPlayer) {
            const prevHp = attackedPlayer.hp;
            const config = MONSTER_CONFIG[enemy.configId] ?? MONSTER_CONFIG["hunter"];
            // Apply new-player protection: halve damage if protected
            const rawDmg = config.damage;
            const dmg = this.isNewPlayerProtected(attackedPlayer.sessionId)
              ? Math.max(1, Math.floor(rawDmg * NEW_PLAYER_PROTECTION_DMG_MULT))
              : rawDmg;
            attackedPlayer.hp = Math.max(0, attackedPlayer.hp - dmg);
            const attackedClient = this.clients.find(c => c.sessionId === nearest!.sessionId);
            attackedClient?.send("player_damage", { damage: dmg, hp: attackedPlayer.hp });
            if (prevHp > 0 && attackedPlayer.hp === 0 && !this.deadPlayers.has(attackedPlayer.sessionId)) {
              this.deadPlayers.add(attackedPlayer.sessionId);
              if (attackedClient) this.handlePlayerDeath(attackedPlayer, attackedClient);
            }
          }
        } else {
          // ── Ready stance — face player ───────────────────────────────────────
          enemy.animKey = `idle_${dir}`;
        }
      } else if (nearestDist < ENEMY_CHASE_RANGE) {
        // ── Chase ─────────────────────────────────────────────────────────────
        this.enemyVelocities.set(enemy.id, { vx: (dx / nearestDist) * moveSpeed, vy: (dy / nearestDist) * moveSpeed });
        enemy.animKey = `walk_${dir}`;
      } else {
        // ── Wander ────────────────────────────────────────────────────────────
        const angle = Math.random() * Math.PI * 2;
        const wanderSpeed = moveSpeed * 0.3;
        this.enemyVelocities.set(enemy.id, { vx: Math.cos(angle) * wanderSpeed, vy: Math.sin(angle) * wanderSpeed });
        if (enemy.animKey.startsWith("walk") || enemy.animKey.startsWith("pierce"))
          enemy.animKey = `idle_${dir}`;
      }
    });
  }

  private isMapTileBlocked(tx: number, ty: number): boolean {
    const key = `${tx},${ty}`;
    const cached = this.mapTileBlockedCache.get(key);
    if (cached !== undefined) return cached;
    const result = this.computeMapTileBlocked(tx, ty);
    this.mapTileBlockedCache.set(key, result);
    return result;
  }

  private computeMapTileBlocked(tx: number, ty: number): boolean {
    const seed = this.state.mapSeed;

    // Tree: footprint [wx-3..wx+3] × [wy-9..wy]. Chunks where wx∈[tx-3,tx+3], wy∈[ty,ty+9].
    // wx = cx*TREE_STEP + jitter(0..2) → cx ∈ [floor((tx-5)/TREE_STEP), floor((tx+3)/TREE_STEP)]
    // wy = cy*TREE_STEP + jitter(0..2) → cy ∈ [floor((ty-2)/TREE_STEP), floor((ty+9)/TREE_STEP)]
    {
      const cxMin = Math.floor((tx - 5) / MAP_TREE_STEP);
      const cxMax = Math.floor((tx + 3) / MAP_TREE_STEP);
      const cyMin = Math.floor((ty - 2) / MAP_TREE_STEP);
      const cyMax = Math.floor((ty + 9) / MAP_TREE_STEP);
      for (let cy = cyMin; cy <= cyMax; cy++) {
        for (let cx = cxMin; cx <= cxMax; cx++) {
          const tree = mapTreeAtChunk(cx, cy, seed);
          if (!tree) continue;
          if (this.deadTrees.has(`tree_${cx}_${cy}`)) continue;
          const { wx, wy } = tree;
          if (tx >= wx - 3 && tx <= wx + 3 && ty >= wy - 9 && ty <= wy) return true;
        }
      }
    }

    // Rock: footprint [wx..wx+2] × [wy..wy+2]. No jitter (ROCK_MAX_OFFSET=1→0).
    // cx ∈ [floor((tx-2)/ROCK_STEP), floor(tx/ROCK_STEP)]
    // cy ∈ [floor((ty-2)/ROCK_STEP), floor(ty/ROCK_STEP)]
    {
      const cxMin = Math.floor((tx - 2) / MAP_ROCK_STEP);
      const cxMax = Math.floor(tx / MAP_ROCK_STEP);
      const cyMin = Math.floor((ty - 2) / MAP_ROCK_STEP);
      const cyMax = Math.floor(ty / MAP_ROCK_STEP);
      for (let cy = cyMin; cy <= cyMax; cy++) {
        for (let cx = cxMin; cx <= cxMax; cx++) {
          const rock = mapRockAtChunk(cx, cy, seed);
          if (!rock) continue;
          if (this.deadRocks.has(`rock_${cx}_${cy}`)) continue;
          const { wx, wy } = rock;
          if (tx >= wx && tx <= wx + 2 && ty >= wy && ty <= wy + 2) return true;
        }
      }
    }

    return false;
  }

  private isEnemyMoveBlocked(px: number, py: number): boolean {
    const HW = 10; // slightly smaller than player for easier navigation
    const HH = 14;
    const minTX = Math.floor((px - HW) / TILE_PX);
    const maxTX = Math.floor((px + HW - 1) / TILE_PX);
    const minTY = Math.floor((py - HH) / TILE_PX);
    const maxTY = Math.floor((py + HH - 1) / TILE_PX);
    for (let ty = minTY; ty <= maxTY; ty++)
      for (let tx = minTX; tx <= maxTX; tx++)
        if (this.isMapTileBlocked(tx, ty)) return true;
    return false;
  }

  /** Called every 100ms — moves enemies by stored velocity and broadcasts positions. */
  private tickEnemyMovement() {
    // Snapshot player positions once for the whole tick
    const players: Array<{ x: number; y: number }> = [];
    this.state.players.forEach((p: PlayerState) => { if (p.isOnline) players.push({ x: p.x, y: p.y }); });

    this.state.enemies.forEach((enemy: EnemyState) => {
      if (!enemy.isAlive) return;
      const vel = this.enemyVelocities.get(enemy.id);
      if (!vel) return;

      const nowMove = Date.now();
      const isStunned = (enemy.statusEffects.get("electric") ?? 0) > nowMove;
      const isSlowed  = (enemy.statusEffects.get("ice")      ?? 0) > nowMove;
      const speedMult = isStunned ? 0 : isSlowed ? 0.5 : 1;
      const nx = enemy.x + vel.vx * speedMult;
      const ny = enemy.y + vel.vy * speedMult;

      // Find nearest player and check if new position would enter separation radius
      let nearestPlayer: { x: number; y: number } | null = null;
      let nearestDist = Infinity;
      for (const p of players) {
        const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
        if (d < nearestDist) { nearestDist = d; nearestPlayer = p; }
      }

      const wouldBeBlocked = nearestPlayer
        ? Math.hypot(nx - nearestPlayer.x, ny - nearestPlayer.y) < PLAYER_ENEMY_SEP_PX
        : false;

      if (!wouldBeBlocked && !this.isEnemyMoveBlocked(nx, ny)) {
        enemy.x = nx;
        enemy.y = ny;
      } else if (wouldBeBlocked && nearestPlayer) {
        // Blocked specifically by player — switch to attack stance
        this.enemyVelocities.set(enemy.id, { vx: 0, vy: 0 });
        if (!enemy.animKey.startsWith("pierce")) {
          const dx = nearestPlayer.x - enemy.x;
          const dy = nearestPlayer.y - enemy.y;
          const dir = Math.abs(dx) >= Math.abs(dy)
            ? (dx > 0 ? "right" : "left")
            : (dy > 0 ? "down" : "up");
          enemy.animKey = `pierce_${dir}`;
        }
      }
      // else: blocked by map object — keep current anim (walk/wander), AI will repath

      this.broadcast("enemy_update", { id: enemy.id, x: enemy.x, y: enemy.y, animKey: enemy.animKey, configId: enemy.configId, hp: enemy.hp, maxHp: enemy.maxHp });
    });
  }

  /** Push overlapping enemies apart. */
  private separateEnemies() {
    const alive: EnemyState[] = [];
    this.state.enemies.forEach((e: EnemyState) => { if (e.isAlive) alive.push(e); });

    // Enemy-enemy separation
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < ENEMY_SEPARATION_PX && dist > 0.01) {
          const push = (ENEMY_SEPARATION_PX - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  // ─── Message Handlers ─────────────────────────────────────────────────────

  protected registerMessageHandlers() {
    this.onMessage("confirm_takeover", async (client) => {
      const pending = this.pendingTakeovers.get(client.sessionId);
      if (!pending) return;
      this.pendingTakeovers.delete(client.sessionId);

      const { staleSessionId, player, fog, dbId } = pending;
      const oldClient = this.clients.find(c => c.sessionId === staleSessionId);
      oldClient?.send("session_taken_over", {});

      const stale = this.state.players.get(staleSessionId);
      if (stale) {
        await this._savePlayerState(stale);
        this.playerFog.delete(staleSessionId);
        this.playerDbIds.delete(staleSessionId);
        this.state.players.delete(staleSessionId);
        this.broadcast("player_remove", { sessionId: staleSessionId }, { except: client });
      }
      oldClient?.leave(4002);

      this.playerFog.set(client.sessionId, fog);
      if (dbId) this.playerDbIds.set(client.sessionId, dbId);
      this.state.players.set(client.sessionId, player);
      this._updateMetadata();

      const existing: object[] = [];
      this.state.players.forEach((p, sid) => {
        if (sid !== client.sessionId)
          existing.push({ sessionId: sid, x: p.x, y: p.y, animKey: p.animKey, nickname: p.nickname });
      });
      client.send("players_init", existing);
      client.send("session_ready", {});
      this.broadcast("player_add", { sessionId: client.sessionId, x: player.x, y: player.y, animKey: player.animKey, nickname: player.nickname }, { except: client });
      console.log(`[GameRoom] Takeover confirmed: ${player.nickname} took over ${staleSessionId}`);
    });

    this.onMessage("decline_takeover", (client) => {
      this.pendingTakeovers.delete(client.sessionId);
      client.leave(4000);
      console.log(`[GameRoom] Takeover declined by ${client.sessionId}`);
    });

    this.onMessage("move", (client, data: { x: number; y: number; direction: string; animKey: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.x = data.x;
      player.y = data.y;
      player.direction = data.direction ?? player.direction;
      player.animKey = data.animKey ?? player.animKey;

      // Broadcast to other clients
      this.broadcast("player_move", {
        sessionId: client.sessionId,
        x: data.x,
        y: data.y,
        animKey: data.animKey,
      }, { except: client });
    });

    this.onMessage("request_players", (client) => {
      const existing: object[] = [];
      this.state.players.forEach((p, sid) => {
        if (sid !== client.sessionId) {
          existing.push({ sessionId: sid, x: p.x, y: p.y, animKey: p.animKey, nickname: p.nickname });
        }
      });
      client.send("players_init", existing);

      const self = this.state.players.get(client.sessionId);
      if (self) {
        // Spawn at saved position — only for authenticated players (guests always start fresh)
        const isAuthenticated = self.userId !== self.sessionId;
        if (isAuthenticated && (self.x !== 0 || self.y !== 0)) {
          client.send("spawn_at", { x: self.x, y: self.y });
        }
        // Restore fog — authenticated get their saved tiles, guests get empty
        const fog = isAuthenticated ? (this.playerFog.get(client.sessionId) ?? []) : [];
        client.send("fog_load", fog);
        // Restore inventory — send flat array (each item repeated qty times)
        client.send("inventory_load", Array.from(self.inventory));
      }
      // Send all currently dropped items on the ground
      client.send("dropped_items_init", Array.from(this.droppedItems.values()));
    });

    this.onMessage("fog_update", (client, tiles: string[]) => {
      if (!Array.isArray(tiles)) return;
      const existing = this.playerFog.get(client.sessionId);
      if (!existing) {
        // Guest — ignore
        return;
      }
      // Merge new tiles into the server-side set
      const merged = new Set(existing);
      for (const t of tiles) merged.add(t);
      this.playerFog.set(client.sessionId, Array.from(merged));
    });

    this.onMessage("equip_item", (client, data: { itemId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const lootItem = getLootItem(data.itemId);
      if (!lootItem) return;
      const idx = player.inventory.indexOf(data.itemId);
      if (idx === -1) return;
      // Swap: if slot already occupied, move current item back to inventory
      const currentInSlot = player.equipment.get(lootItem.slot);
      if (currentInSlot) player.inventory.push(currentInSlot);
      player.inventory.splice(idx, 1);
      player.equipment.set(lootItem.slot, data.itemId);
      this.recalcStats(player);
      this.sendStatsToPlayers();
      client.send("inventory_load", Array.from(player.inventory));
      const fog = this.playerFog.get(client.sessionId) ?? [];
      this._savePlayerState(player).catch((e) => console.warn("[DB] equip save error:", e));
      console.log(`[GameRoom] ${player.nickname} equipped ${data.itemId} in slot ${lootItem.slot}`);
    });

    this.onMessage("unequip_item", (client, data: { slot: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const itemId = player.equipment.get(data.slot);
      if (!itemId) return;
      player.inventory.push(itemId);
      player.equipment.delete(data.slot);
      this.recalcStats(player);
      this.sendStatsToPlayers();
      client.send("inventory_load", Array.from(player.inventory));
      const fog = this.playerFog.get(client.sessionId) ?? [];
      this._savePlayerState(player).catch((e) => console.warn("[DB] unequip save error:", e));
      console.log(`[GameRoom] ${player.nickname} unequipped ${itemId} from slot ${data.slot}`);
    });

    this.onMessage("destroy_item", (client, data: { itemId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const idx = player.inventory.indexOf(data.itemId);
      if (idx === -1) return;
      player.inventory.splice(idx, 1);
      const fog = this.playerFog.get(client.sessionId) ?? [];
      this._savePlayerState(player).catch((e) => console.warn("[DB] destroy save error:", e));
      console.log(`[GameRoom] ${player.nickname} destroyed ${data.itemId}`);
    });

    this.onMessage("activeSlot", (client, data: { slot: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.activeSlot = data.slot;
    });

    this.onMessage("enter_chunk", (_client, data: { chunkX: number; chunkY: number }) => {
      for (let dy = -ENEMY_SPAWN_RADIUS; dy <= ENEMY_SPAWN_RADIUS; dy++)
        for (let dx = -ENEMY_SPAWN_RADIUS; dx <= ENEMY_SPAWN_RADIUS; dx++)
          this.activateZone(data.chunkX + dx, data.chunkY + dy);
    });

    this.onMessage("action", (client, data: { type: string; x: number; y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      console.log(`[GameRoom] action "${data.type}" by ${player.nickname} at (${Math.round(data.x)}, ${Math.round(data.y)})`);
    });

    this.onMessage("request_resources", (client) => {
      const resources: object[] = [];
      this.state.resources.forEach((node) => {
        resources.push({ id: node.id, type: node.type, x: node.x, y: node.y, hp: node.hp, maxHp: node.maxHp, isAlive: node.isAlive });
      });
      client.send("resources_init", resources);
    });

    this.onMessage("request_dead_trees", (client) => {
      client.send("dead_trees_init", Array.from(this.deadTrees.keys()));
    });

    this.onMessage("request_dead_rocks", (client) => {
      client.send("dead_rocks_init", Array.from(this.deadRocks));
    });

    this.onMessage("request_dead_food", (client) => {
      // Send alive dead-food entries (not yet respawned)
      const now = Date.now();
      const deadList = Array.from(this.deadFoodNodes.entries())
        .filter(([, t]) => t > now)
        .map(([id, respawnAt]) => ({ id, respawnAt }));
      client.send("dead_food_init", deadList);
    });

    this.onMessage("harvest", (client, data: { id: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (data.id.startsWith("tree_")) {
        if (this.deadTrees.has(data.id)) return;
        this.deadTrees.set(data.id, 0); // 0 = never respawn
        // Invalidate map collision cache for this tree's tiles
        const tParts = data.id.split("_"); // ["tree", cx, cy]
        const tCx = parseInt(tParts[1]); const tCy = parseInt(tParts[2]);
        const tTree = mapTreeAtChunk(tCx, tCy, this.state.mapSeed);
        if (tTree) {
          for (let dy = -9; dy <= 0; dy++)
            for (let dx = -3; dx <= 3; dx++)
              this.mapTileBlockedCache.delete(`${tTree.wx + dx},${tTree.wy + dy}`);
        }
        this.broadcast("tree_dead", { id: data.id });
        const qty = 2 + Math.floor(Math.random() * 3); // 2–4 wood
        if (player) {
          for (let i = 0; i < qty; i++) player.inventory.push("wood");
          player.sanity = Math.min(100, player.sanity + SANITY_HARVEST_BONUS);
        }
        client.send("harvest_reward", { drops: [{ item: "wood", qty }] });
        console.log(`[GameRoom] ${player?.nickname ?? client.sessionId} harvested ${data.id} → ${qty} wood`);
      } else if (data.id.startsWith("rock_")) {
        this.deadRocks.add(data.id);
        // Invalidate map collision cache for this rock's tiles
        const rParts = data.id.split("_"); // ["rock", cx, cy] (negative coords safe)
        const rCx = parseInt(rParts[1]); const rCy = parseInt(rParts[2]);
        const rRock = mapRockAtChunk(rCx, rCy, this.state.mapSeed);
        if (rRock) {
          for (let dy = 0; dy <= 2; dy++)
            for (let dx = 0; dx <= 2; dx++)
              this.mapTileBlockedCache.delete(`${rRock.wx + dx},${rRock.wy + dy}`);
        }
        this.broadcast("rock_dead", { id: data.id });
        const qty = 1 + Math.floor(Math.random() * 2);
        if (player) {
          for (let i = 0; i < qty; i++) player.inventory.push("stone");
          player.sanity = Math.min(100, player.sanity + SANITY_HARVEST_BONUS);
        }
        client.send("harvest_reward", { drops: [{ item: "stone", qty }] });
        console.log(`[GameRoom] ${player?.nickname ?? client.sessionId} harvested ${data.id} → ${qty} stone`);
      } else if (data.id.startsWith("mush_") || data.id.startsWith("berry_")) {
        if (this.deadFoodNodes.has(data.id)) return;
        const respawnAt = Date.now() + 60_000;
        this.deadFoodNodes.set(data.id, respawnAt);
        this.broadcast("food_dead", { id: data.id, respawnAt });
        const isMushr = data.id.startsWith("mush_");
        const drops = isMushr
          ? [{ item: "mushroom", qty: 1 }]
          : [{ item: "berries",  qty: 2 }];
        if (player) {
          drops.forEach((d) => { for (let i = 0; i < d.qty; i++) player.inventory.push(d.item); });
          player.sanity = Math.min(100, player.sanity + SANITY_HARVEST_BONUS);
        }
        client.send("harvest_reward", { drops });
        console.log(`[GameRoom] ${player?.nickname ?? client.sessionId} harvested ${data.id} → ${isMushr ? "mushroom" : "berries"}`);
      }
      // Persist inventory immediately after every harvest
      if (player) {
        const fog = this.playerFog.get(client.sessionId) ?? [];
        this._savePlayerState(player).catch((e) => console.warn("[DB] harvest save error:", e));
      }
      // Persist dead trees/rocks world state
      if (data.id.startsWith("tree_") || data.id.startsWith("rock_")) {
        saveDeadResources(
          Array.from(this.deadTrees.keys()),
          Array.from(this.deadRocks)
        ).catch((e) => console.warn("[DB] saveDeadResources error:", e));
      }
    });

    this.onMessage("eat", (client, data: { itemId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const food = FOOD_CONFIG[data.itemId];
      if (!food) return;
      const idx = player.inventory.indexOf(data.itemId);
      if (idx === -1) return;
      player.inventory.splice(idx, 1);
      player.hunger = Math.min(100, player.hunger + food.hungerRestore);
      if (food.hpRestore !== 0)
        player.hp = Math.max(0, Math.min(player.maxHp, player.hp + food.hpRestore));
      // on_eat rule trigger
      const eatEffects = this.ruleEngine.evaluate('on_eat', {
        player: { hp: player.hp, maxHp: player.maxHp, hunger: player.hunger, sanity: player.sanity, sessionId: client.sessionId },
        world:  { isNight: this.state.isNight, worldTime: this.state.worldTime, weather: this.state.weather },
        item:   { type: data.itemId, id: data.itemId },
      });
      if (eatEffects.length > 0) this.applyRuleEffects(eatEffects, { client, player });
      this.sendStatsToPlayers();
      console.log(`[GameRoom] ${player.nickname} ate ${data.itemId} (hunger: ${player.hunger.toFixed(0)}, hp: ${player.hp})`);
      // Persist inventory immediately after eat
      const fog = this.playerFog.get(client.sessionId) ?? [];
      this._savePlayerState(player).catch((e) => console.warn("[DB] eat save error:", e));
    });

    this.onMessage("drop_item", (client, data: { itemId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const idx = player.inventory.indexOf(data.itemId);
      if (idx === -1) return;
      player.inventory.splice(idx, 1);
      const id = `drop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const drop: DroppedItemData = { id, itemId: data.itemId, qty: 1, x: player.x, y: player.y };
      this.droppedItems.set(id, drop);
      this.broadcast("item_dropped", drop);
      client.send("inventory_load", Array.from(player.inventory));
      const fog = this.playerFog.get(client.sessionId) ?? [];
      this._savePlayerState(player).catch((e) => console.warn("[DB] drop save error:", e));
      console.log(`[GameRoom] ${player.nickname} dropped ${data.itemId} at (${Math.round(player.x)}, ${Math.round(player.y)})`);
    });

    this.onMessage("pickup_item", (client, data: { id: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const drop = this.droppedItems.get(data.id);
      if (!drop) return;
      const dist = Math.hypot(drop.x - player.x, drop.y - player.y);
      if (dist > PICKUP_RANGE) return;
      for (let i = 0; i < drop.qty; i++) player.inventory.push(drop.itemId);
      this.droppedItems.delete(data.id);
      this.broadcast("item_removed", { id: data.id });
      client.send("inventory_load", Array.from(player.inventory));
      const fog = this.playerFog.get(client.sessionId) ?? [];
      this._savePlayerState(player).catch((e) => console.warn("[DB] pickup save error:", e));
      console.log(`[GameRoom] ${player.nickname} picked up ${drop.itemId} (x${drop.qty})`);
    });

    this.onMessage("attack_enemy", (client, data: { enemyId: string }) => {
      const player = this.state.players.get(client.sessionId);
      const enemy  = this.state.enemies.get(data.enemyId);
      if (!player || !enemy || !enemy.isAlive) return;

      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist > ENEMY_ATTACK_RANGE) return;

      // Elemental weapon effect
      const weaponId = player.equipment.get("weapon") ?? "";
      const elemMatch = weaponId.match(/^.+_of_(\w+)$/);
      const element = elemMatch?.[1];
      let bonusDmg = 0;
      if (element) {
        const now = Date.now();
        switch (element) {
          case "fire":     enemy.statusEffects.set("fire",     now + 5000); break;
          case "ice":      enemy.statusEffects.set("ice",      now + 4000); break;
          case "poison":   enemy.statusEffects.set("poison",   now + 8000); break;
          case "electric": enemy.statusEffects.set("electric", now + 2000); break;
          case "shadow":
            player.hp = Math.min(player.maxHp, player.hp + 10);
            break;
          case "holy":
            bonusDmg = 20;
            break;
        }
        this.broadcast("enemy_status_update", {
          id: enemy.id,
          effects: Object.fromEntries(enemy.statusEffects.entries()),
        });
      }

      const config = MONSTER_CONFIG[enemy.configId] ?? MONSTER_CONFIG["hunter"];
      const baseDmg = Math.ceil(10 * (player.sanity > 0 ? 1 : 0.5));
      enemy.hp -= baseDmg + bonusDmg;
      this.broadcast("enemy_hit", { id: enemy.id, hp: enemy.hp });

      if (enemy.hp <= 0) {
        enemy.isAlive = false;
        enemy.hp = 0;
        this.broadcast("enemy_dead", { id: enemy.id, x: enemy.x, y: enemy.y });
        // Roll loot drop
        const dropId = rollDrop(enemy.type);
        if (dropId) {
          const lootItem = getLootItem(dropId);
          if (lootItem) {
            player.inventory.push(dropId);
            client.send("inventory_load", Array.from(player.inventory));
            if (lootItem.rarity === "rare") {
              this.broadcastRoomEvent("epic_loot", player.nickname, `💎 ${player.nickname} znalazł(a) ${lootItem.name} [RARE]`);
            } else if (lootItem.rarity === "uncommon") {
              this.broadcastRoomEvent("rare_loot", player.nickname, `⚔ ${player.nickname} zdobył(a) ${lootItem.name} [UNCOMMON]`);
            }
            this.broadcast("enemy_loot", {
              itemId: dropId,
              itemName: lootItem.name,
              rarity: lootItem.rarity,
              x: enemy.x,
              y: enemy.y,
            });
          }
        }
        // Killing harms sanity
        player.sanity = Math.max(0, player.sanity - SANITY_KILL_PENALTY);
        // on_enemy_death rule trigger
        const deathEffects = this.ruleEngine.evaluate('on_enemy_death', {
          player: { hp: player.hp, maxHp: player.maxHp, hunger: player.hunger, sanity: player.sanity, sessionId: client.sessionId },
          world:  { isNight: this.state.isNight, worldTime: this.state.worldTime, weather: this.state.weather },
          enemy:  { id: enemy.id, configId: enemy.configId, hp: 0, maxHp: enemy.maxHp },
        });
        if (deathEffects.length > 0) this.applyRuleEffects(deathEffects, { client, player });
        this.sendStatsToPlayers();
        const fog = this.playerFog.get(client.sessionId) ?? [];
        this._savePlayerState(player).catch((e) => console.warn("[DB] kill save error:", e));
        console.log(`[GameRoom] ${player.nickname} killed ${enemy.id} → drop: ${dropId ?? "none"} (sanity: ${player.sanity.toFixed(0)})`);
      }
    });

    this.onMessage("submit_mod", async (client, data: { modId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !this.groupId) return;
      const result = await submitModToGroup(data.modId, this.groupId);
      if (!result) return;
      this.broadcast("mod_submitted", {
        modId: data.modId,
        name: result.name,
        description: result.description,
        createdBy: player.nickname,
      });
      console.log(`[GameRoom] ${player.nickname} submitted mod "${result.name}" to group ${this.groupId}`);
    });
  }
}
