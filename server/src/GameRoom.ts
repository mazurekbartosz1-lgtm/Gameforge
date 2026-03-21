import { Room, Client, type RoomOptions } from "@colyseus/core";
import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

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
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("int16") hp: number = 20;
  @type("int16") maxHp: number = 20;
  @type("boolean") isAlive: boolean = true;
  @type("string") animKey: string = "idle";
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
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TICK_RATE = 1000;          // ms between ticks
const DAY_DURATION = 600_000;    // 10 min real time = 1 in-game day
const HUNGER_DRAIN_PER_SEC = 0.5 / (TICK_RATE / 1000);
const SANITY_NIGHT_DRAIN = 1.0 / (TICK_RATE / 1000);
const SANITY_DAY_REGEN = 0.5 / (TICK_RATE / 1000);

// ─── Room ────────────────────────────────────────────────────────────────────

export class GameRoom extends Room<GameRoomOptions> {
  maxClients = 16;

  /** Client-generated resources harvested by players: id → respawn timestamp. */
  private deadTrees = new Map<string, number>();
  private deadRocks = new Map<string, number>();

  onCreate(_options: any) {
    const state = new WorldState();
    state.mapSeed = Math.floor(Math.random() * 2_147_483_647); // random uint31
    this.setState(state);
    // Trees and rocks are generated client-side — no server spawning needed.
    this.setSimulationInterval(() => this.tick(), TICK_RATE);
    this.registerMessageHandlers();
    console.log(`[GameRoom] created – roomId: ${this.roomId}, seed: ${state.mapSeed}`);
  }

  onJoin(client: Client, options: { userId?: string; nickname?: string }) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.userId = options.userId ?? client.sessionId;
    player.nickname = options.nickname ?? "Player";
    player.x = 400 + Math.random() * 200;
    player.y = 300 + Math.random() * 200;
    this.state.players.set(client.sessionId, player);
    console.log(`[GameRoom] ${player.nickname} joined (${client.sessionId})`);

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
  }

  onLeave(client: Client, _code?: number) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.isOnline = false;
    }
    this.broadcast("player_remove", { sessionId: client.sessionId });
    console.log(`[GameRoom] ${client.sessionId} left`);
  }

  onDispose() {
    console.log(`[GameRoom] disposed – roomId: ${this.roomId}`);
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  private tick() {
    const now = Date.now();

    this.updateWorldTime(now);
    this.drainHungerAndSanity();
    this.respawnNodes(now);
    // Trees do not respawn (permanent harvest)
    this.respawnDeadRocks(now);
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

      // Sanity
      if (this.state.isNight) {
        player.sanity = Math.max(0, player.sanity - SANITY_NIGHT_DRAIN);
      } else {
        player.sanity = Math.min(100, player.sanity + SANITY_DAY_REGEN);
      }

      // Hunger hurts HP
      if (player.hunger <= 0) {
        player.hp = Math.max(0, player.hp - 1);
      }
    });
  }

  private respawnDeadRocks(now: number) {
    this.deadRocks.forEach((respawnAt, id) => {
      if (now >= respawnAt) {
        this.deadRocks.delete(id);
        this.broadcast("rock_respawn", { id });
      }
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
  }

  private respawnDeadTrees(now: number) {
    this.deadTrees.forEach((respawnAt, id) => {
      if (now >= respawnAt) {
        this.deadTrees.delete(id);
        this.broadcast("tree_respawn", { id });
      }
    });
  }

  // ─── Message Handlers ─────────────────────────────────────────────────────

  private registerMessageHandlers() {
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
    });

    this.onMessage("equip", (client, data: { slot: string; itemId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.equipment.set(data.slot, data.itemId);
    });

    this.onMessage("activeSlot", (client, data: { slot: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.activeSlot = data.slot;
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
      client.send("dead_rocks_init", Array.from(this.deadRocks.keys()));
    });

    this.onMessage("harvest", (client, data: { id: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (data.id.startsWith("tree_")) {
        if (this.deadTrees.has(data.id)) return;
        this.deadTrees.set(data.id, Date.now() + 60_000);
        this.broadcast("tree_dead", { id: data.id });
        console.log(`[GameRoom] ${player?.nickname ?? client.sessionId} harvested ${data.id}`);
      } else if (data.id.startsWith("rock_")) {
        if (this.deadRocks.has(data.id)) return;
        this.deadRocks.set(data.id, Date.now() + 60_000);
        this.broadcast("rock_dead", { id: data.id });
        console.log(`[GameRoom] ${player?.nickname ?? client.sessionId} harvested ${data.id}`);
      }
    });
  }
}
