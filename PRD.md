# GameForge — Product Requirements Document

## Vision
Web platform for children 10-14 to create browser games using natural language (voice or text). Children develop the game together in groups: they modify it, vote on the best changes, and winning modifications enter the main game. Groups are self-organizing — no adult moderator needed.

## Design Philosophy
Safety by design — security built into every layer, not added as a filter at the end.

Three principles:
- Default privacy — children's data is not publicly visible without conscious consent
- Positive reinforcement — system rewards good behavior, not only punishes bad
- Dignity always — no platform mechanism can publicly humiliate a child

## Target Users

### Personas
1. Child Creator (age 10-14) — starts a group, sets game type, first to modify
2. Verified Player — has email/phone account, can submit mods and vote
3. Guest — joined with group code, can play but cannot vote or submit mods

### User Roles
- Guest: plays main game, creates personal branch, session 7 days (cookie)
- Verified Player: everything guest can + submit modifications (max 2/week) + vote (max 3 hearts/week)
- Group Creator: everything verified + rollback last change (24h window) + see member list + reset group code

## Core Loop
1. Fork — child clicks "make your version" → personal copy of main game
2. Describe — text or voice input, AI asks max 3 clarifying questions
3. Iterate — unlimited changes on personal branch, nobody else sees
4. Submit — one sentence: what changed and why, group gets notification
5. Vote — 7 days, results hidden until end
6. Result — 50%+ hearts → enters main game, less → "X people liked it"
7. Rollback — group creator can revert last change within 24h

## Game Template (MVP)
Don't Starve-like survival game with:

### World
- Open map with fog of war — player explores and discovers
- Shared world state — map, weather, enemies identical for all players in group
- Day/night cycle (8 min = 1 day), weather system (clear/rain/storm)

### Player Mechanics
- HP, hunger (drains over time), sanity (drains at night)
- Persistent state between sessions (position, inventory, HP, fog discoveries)

### Resources
- Trees (axe → wood), rocks (pickaxe → stone)
- Food plants (hand → mushroom, herb, apple, corn) — respawn 60s
- Enemy drops (Orc → raw meat)

### Building
- Bonfire (3 wood) — basic cooking station
- Wooden house (8 wood), Stone house (6 stone)
- Workbench — craft tools and weapons
- Anvil — craft advanced weapons
- Cooking Station (4 wood + 2 stone) — advanced recipes
- Sawmill, Furnace — resource processing

### Crafting & Cooking
- Bone/Wood weapons → Iron weapons (via Furnace + Anvil)
- Bonfire: single ingredient cooking (meat → cooked meat, mushroom → cooked mushroom)
- Cooking Station: 2-ingredient recipes with timer
  - mushroom + herb → mushroom soup (+70 hunger, +20 HP)
  - corn + raw meat → corn stew (+80 hunger, +25 HP)
  - apple + herb → herb tea (+30 hunger, +10 HP)

### Enemies
- Orc Crew (Base/Rogue/Shaman/Warrior) — drop raw meat
- Skeleton Crew (Base/Mage/Rogue/Warrior) — no food drop
- All enemies: idle, run, death animations from Pixel Crawler

## AI Modification System

### What AI Can Change
1. Parameters — spawn rate, weather, movement speed, hunger rate
2. Monster variants — baseSprite + tint (hex color) + particle effect + name + stats
3. Rules — {trigger, conditions[], effects[]} evaluated every game tick
4. Food variants — new food node with custom hunger/HP values and spawn conditions

### Rule Engine
Triggers: every_Ns, on_kill, on_build, on_cook, on_eat, on_night, on_hunger_low
Conditions: is_night, is_raining, player_hp_below_X, hunger_below_X
Effects: spawn_enemy, buff_player, steal_resource, broadcast_message, spawn_food_node, food_bonus

### Monster Variant System
6 particle presets: fire, ice, poison, electric, shadow, holy
Base sprites: orc, orc_rogue, orc_shaman, orc_warrior, skeleton_base, skeleton_mage, skeleton_rogue, skeleton_warrior
Tint: any hex color applied via Phaser setTint()

### AI Flow
1. Child describes modification (voice or text)
2. Claude API (Sonnet) asks max 3 clarifying questions
3. Claude generates ModConfig JSON: {params, monsterVariant, foodVariant, rules}
4. Child tests on personal branch
5. Submit to group vote

## Safety System

### Content Filter (Claude Haiku)
Applied to: nicknames, mod descriptions, chat messages
Blocks: violence/gore, sexual content, hate speech, personal data, external links
Response style: always positive, always suggests alternative, never says "you did something wrong"

### Auth
- Passwordless OTP only — no passwords in the system
- Email magic link (Resend, free tier 3000/month)
- SMS OTP fallback (Twilio)
- Guest session: 7 days cookie
- Verified session: persistent, returns via OTP

### Groups
- Code format: [3 letters]-[4 digits] e.g. KOT-7823
- Join by link: gameforge.pl/join/KOT-7823
- Join by code: manual entry on start screen
- Group inactive after 7 days without verified creator

## Technical Constraints
- Browser only — no install required
- Shared world state — all players in group see same map/weather/enemies/buildings
- Player state persists — position, inventory, HP, fog discoveries saved between sessions
- Cooking Pot is shared — if player A puts meat in, player B can collect cooked result

## Stack
- Frontend: Next.js + Phaser 3
- Game server: Colyseus on Railway
- Database: Supabase (PostgreSQL + Row Level Security)
- Auth: Clerk (passwordless OTP)
- Email: Resend
- AI: Claude API (Sonnet for mod generation, Haiku for safety filter)
- Assets: Pixel Crawler Complete Collection (commercial license confirmed)

## MVP Scope (10 weeks, 50 evenings)
Single game genre (Don't Starve-like survival), single group per session,
Polish language UI, max 20 players per group, desktop browser only.

## Out of Scope for MVP
- Multiple game genres
- Mobile app
- Public game gallery
- Monetization
- Analytics dashboard for parents/teachers
