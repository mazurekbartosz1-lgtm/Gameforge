import type { Rule } from './RuleEngine.js'

/**
 * Default rules loaded on room creation.
 * These demonstrate the rule engine and can be replaced via applyModRules().
 */
export const DEFAULT_RULES: Rule[] = [
  // 1. Eating cooked meat has 10% chance to drop a bone
  {
    id: 'bone_from_meat',
    trigger: 'on_eat',
    conditions: [
      { field: 'item.type', operator: '==', value: 'cooked_meat' },
      { field: 'random',    operator: '<',  value: 0.1 },
    ],
    effects: [
      { action: 'add_item', target: 'player', field: 'bone', value: 1 },
    ],
  },

  // 2. Low hunger broadcasts a warning (throttled to once/min per player in GameRoom)
  {
    id: 'hunger_warning',
    trigger: 'on_hunger_low',
    conditions: [],
    effects: [
      { action: 'broadcast_message', value: 'Ktoś jest głodny!' },
    ],
  },

  // 3. Night drains sanity from all players every tick (stacks with passive regen)
  {
    id: 'night_sanity_drain',
    trigger: 'on_tick',
    conditions: [
      { field: 'world.isNight', operator: '==', value: true },
    ],
    effects: [
      { action: 'modify_stat', target: 'all_players', field: 'sanity', value: -0.4 },
    ],
  },

  // 4. Every 60s during night: spawn a boss + announce it
  {
    id: 'night_boss_wave',
    trigger: 'every_Ns',
    intervalMs: 60_000,
    conditions: [
      { field: 'world.isNight', operator: '==', value: true },
    ],
    effects: [
      { action: 'spawn_enemy',       value: 'boss_hunter', qty: 1 },
      { action: 'broadcast_message', value: 'Nocny boss nadciąga!' },
    ],
  },
]
