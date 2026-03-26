// ─── RuleEngine ──────────────────────────────────────────────────────────────
// Declarative rule system: { trigger, conditions[], effects[] }
// Evaluated by GameRoom every tick and on specific game events.

export type RuleTrigger =
  | 'on_tick'         // every TICK_RATE ms (1s)
  | 'every_Ns'        // once every rule.intervalMs ms (timer per rule)
  | 'on_eat'          // when a player eats an item
  | 'on_cook'         // when cooking completes
  | 'on_hunger_low'   // when player.hunger < 20 (throttled: once/min per player)
  | 'on_enemy_death'  // when an enemy dies
  | 'on_player_join'

export interface RuleCondition {
  field: string         // 'player.hunger' | 'world.isNight' | 'item.type' | 'enemy.configId' | 'random'
  operator: '<' | '>' | '==' | '!=' | 'includes'
  value: string | number | boolean
}

export interface RuleEffect {
  action: 'modify_stat' | 'add_item' | 'spawn_enemy' | 'broadcast_message' | 'set_weather'
  // modify_stat: field='hp'|'hunger'|'sanity', value=delta (number), target='player'|'all_players'
  // add_item:    field=itemId OR pool=[...itemIds], value=qty (number, default 1), target='player'|'all_players'
  // spawn_enemy: value=configId (string), qty=count (number, default 1)
  // broadcast_message: value=text (string)
  // set_weather: value='clear'|'rain'|'storm'
  target?: 'player' | 'all_players' | 'world'
  field?: string
  value?: string | number
  pool?: string[]   // for add_item: pick one random element per target instead of using field
  qty?: number      // for spawn_enemy: how many to spawn
}

export interface Rule {
  id: string
  trigger: RuleTrigger
  conditions: RuleCondition[]
  effects: RuleEffect[]
  intervalMs?: number   // for every_Ns: interval in ms (e.g. 7_200_000 = 2h)
  _nextFireAt?: number  // internal: next scheduled fire timestamp
}

export interface RuleContext {
  player?: {
    hp: number
    maxHp: number
    hunger: number
    sanity: number
    sessionId: string
  }
  world?: {
    isNight: boolean
    worldTime: number
    weather: string
  }
  item?: { type: string; id: string }
  enemy?: {
    id: string
    configId: string
    hp: number
    maxHp: number
  }
}

export class RuleEngine {
  private rules: Rule[] = []

  loadRules(rules: Rule[]): void {
    this.rules = rules
    const now = Date.now()
    for (const rule of this.rules) {
      if (rule.trigger === 'every_Ns' && rule.intervalMs) {
        rule._nextFireAt = now + rule.intervalMs
      }
    }
  }

  /** Append rules to existing set (used when applying approved mods to a live room). */
  addRules(rules: Rule[]): void {
    const now = Date.now()
    for (const rule of rules) {
      if (rule.trigger === 'every_Ns' && rule.intervalMs) {
        rule._nextFireAt = now + rule.intervalMs
      }
      this.rules.push(rule)
    }
  }

  /** Replace active rules — called by AI mod pipeline (Wieczór 47). */
  applyModRules(rules: Rule[]): void {
    this.loadRules(rules)
  }

  /**
   * Evaluate all rules matching the given trigger against the context.
   * Returns the list of effects to apply (pool is NOT yet resolved — caller
   * resolves it per target to allow different random picks per player).
   */
  evaluate(trigger: RuleTrigger, context: RuleContext): RuleEffect[] {
    const now = Date.now()
    const effects: RuleEffect[] = []

    for (const rule of this.rules) {
      if (rule.trigger !== trigger) continue

      // Timer gate for every_Ns
      if (trigger === 'every_Ns') {
        if (!rule._nextFireAt || now < rule._nextFireAt) continue
        rule._nextFireAt = now + (rule.intervalMs ?? 60_000)
      }

      // All conditions must pass (AND logic)
      if (!this.checkConditions(rule.conditions, context)) continue

      effects.push(...rule.effects)
    }

    return effects
  }

  private checkConditions(conditions: RuleCondition[], ctx: RuleContext): boolean {
    for (const cond of conditions) {
      const actual = this.resolveField(cond.field, ctx)
      if (!this.testOperator(actual, cond.operator, cond.value)) return false
    }
    return true
  }

  private resolveField(
    field: string,
    ctx: RuleContext
  ): string | number | boolean | undefined {
    if (field === 'random') return Math.random()
    const dot = field.indexOf('.')
    if (dot === -1) return undefined
    const obj = field.slice(0, dot)
    const key = field.slice(dot + 1)
    const source: Record<string, unknown> | undefined = (ctx as Record<string, unknown>)[obj] as any
    return source?.[key] as string | number | boolean | undefined
  }

  private testOperator(
    actual: string | number | boolean | undefined,
    op: RuleCondition['operator'],
    expected: string | number | boolean
  ): boolean {
    if (actual === undefined) return false
    switch (op) {
      case '<':        return (actual as number) < (expected as number)
      case '>':        return (actual as number) > (expected as number)
      case '==':       return actual === expected
      case '!=':       return actual !== expected
      case 'includes': return typeof actual === 'string' && actual.includes(expected as string)
      default:         return false
    }
  }
}
