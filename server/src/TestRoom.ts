import { GameRoom, WorldState, PlayerState } from "./GameRoom.js";
import { MONSTER_CONFIG } from "./monsterConfig.js";

const MOVE_RATE = 100; // ms — mirrors GameRoom

interface ModVariant {
  id: string;
  name: string;
  baseSprite?: string;
  tint?: number;
  scale?: number;
  hp: number;
  maxHp: number;
  damage: number;
  particleEffect?: string;
  dropTable?: Array<{ item: string; chance: number; qty: number }>;
}

export class TestRoom extends GameRoom {
  maxClients = 3;
  autoDispose = false; // prevent auto-dispose when 0 clients (room waits for players to join)

  private modVariantIds: string[] = [];

  async onCreate(options: any) {
    this.skipEventPersistence = true; // test rooms are ephemeral — no DB writes
    const modConfig = options.modConfig ?? {};

    const state = new WorldState();
    state.mapSeed = (Math.random() * 2_147_483_647) | 0 || 1;
    this.setState(state);

    this.setSimulationInterval((dt: number) => this.masterTick(dt), MOVE_RATE);
    this.registerMessageHandlers();

    // Register mod monster variants so spawnSingleEnemy can look them up by configId
    const variants: ModVariant[] = modConfig.monsterVariants ?? [];
    for (const v of variants) {
      const configId = `mod_${v.id}`;
      MONSTER_CONFIG[configId] = {
        id: configId,
        name: v.name,
        baseSprite: v.baseSprite ?? "hunter",
        tint: v.tint ?? 0xffffff,
        scale: v.scale ?? 1.0,
        hp: v.hp,
        maxHp: v.maxHp,
        damage: v.damage,
        particleEffect: v.particleEffect,
        dropTable: v.dropTable ?? [],
      };
      this.modVariantIds.push(configId);
    }

    // Load mod rules (replaces default rules)
    const rules = modConfig.rules ?? [];
    if (rules.length > 0) {
      this.ruleEngine.loadRules(rules);
    }

    // Auto-dispose after 30 minutes regardless of client count
    this.clock.setTimeout(() => {
      void this.disconnect();
    }, 30 * 60 * 1000);

    console.log(`[TestRoom] created – roomId: ${this.roomId}, seed: ${state.mapSeed}, variants: ${this.modVariantIds.length}, rules: ${rules.length}`);
  }

  // No-op: test rooms don't persist player state to DB
  async _savePlayerState(_player: PlayerState): Promise<void> {}

  onDispose() {
    for (const id of this.modVariantIds) {
      delete MONSTER_CONFIG[id];
    }
    console.log(`[TestRoom] disposed – roomId: ${this.roomId}`);
  }
}
