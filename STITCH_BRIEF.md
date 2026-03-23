# Gameforge — Stitch Design Brief
*Wszystkie ekrany do zaprojektowania w Google Stitch*

## Design System (obowiązuje na wszystkich stronach)

- **Style:** Pixel art, "Neon Quest" — 16-bit RPG HUD aesthetic
- **Background:** `#0b0c1f` (deep space dark)
- **Surface cards:** `#0e0f22` / `#16172e`
- **Border rule:** Top+Right = 2px solid accent; Bottom+Left = 1px semi-transparent. ZERO border-radius.
- **Primary (fire):** `#FF8C00` / `#ffb151`
- **Secondary (magic):** `#00e3fd` (cyan)
- **Tertiary (neon):** `#f183ff` (magenta)
- **Text:** `#e4e3fe` (primary), `#a9a9c2` (muted), `#46465b` (disabled)
- **Fonts:** Space Grotesk (headlines, 700/900, UPPERCASE) + Plus Jakarta Sans (body, labels)
- **Buttons:** Gradient `#FF8C00 → #CC7000`, color `#2a1600`, NO rounded corners
- **Hover:** Shift -3px/-3px + pixel shadow 4px 4px `#7a4800`
- **Pixel borders on interactive elements:** 2px solid top+right accent color
- **Quest tracker decoration:** Gradient progress bar (orange→cyan→magenta) + ★★□ icons — appears at bottom of every panel

---

## Screen 1 — HOME / LOGIN (`/`)

**Layout:** Full-screen illustrated forest background (pixel art campfire scene), centered header, auth panel bottom-right, footer bar.

**Elements:**
- Background: lush pixel-art forest at night, heroes around campfire, GM with laptop
- Animated ember particles rising from campfire (CSS keyframes)
- Header (top-center): "GAMEFORGE. YOUR GAME, YOUR RULES" in `#FF8C00` with glow, subtitle "THE JOURNEY CONTINUES" in `#00e3fd`
- Auth panel (bottom-right, 320px wide, glassmorphism `rgba(28,29,54,0.6)` + blur):
  - **LoggedOut:** Google sign-in (white button), OR divider, email input "QUEST EMAIL", submit "ENTER THE TAVERN" (orange gradient), "PLAY AS GUEST" link (cyan)
  - **LoggedIn:** User avatar + name + session duration, "⚔ ENTER THE GAME" button, Sign Out text link
  - Quest tracker decoration at bottom
- Footer: © 8-BIT REALMS MMXXIV | TERMS · PRIVACY · SUPPORT | ENGINE v1.0.4

---

## Screen 2 — SYSTEM STATUS (`/status`)

**Layout:** Dark dashboard, single centered column, max 480px.

**Elements:**
- Eyebrow: "GAMEFORGE ENGINE" in orange
- Title: "SYSTEM STATUS" large bold uppercase
- Decorative gradient line (orange→cyan)
- Refresh ticker: "AUTO-REFRESH EVERY 2 SECONDS"
- 3 service cards, each with:
  - Top border = 2px green (#4ade80) if online, red (#f87171) if offline
  - Status pip (8px square, glowing)
  - Service name (uppercase, bold)
  - "ONLINE" / "OFFLINE" badge (right-aligned)
  - Detail rows: label (muted) / value (monospace)
  - Services: Colyseus Game Server, Clerk Auth, Supabase
- Quest tracker at bottom
- Footer version label

---

## Screen 3 — GAME CANVAS + PLAYER PANEL (`/game`)

**Layout:** Full-screen split — Game canvas (flex:1) left, Player Panel (240px) right.

**Game Canvas:**
- Phaser 3 canvas fills entire left area
- No UI chrome, just the game world (pixel art top-down map)

**Player Panel (right sidebar, 240px):**
- Background: `#0b0c1f`
- Left separator: 2px solid `#16172e`
- **Header card** (orange pixel border):
  - Player name (uppercase bold) + day/night indicator (☀/🌙)
  - "SIGN IN" button for guests (orange gradient)
- **Stats section:**
  - Section label: "STATS" (muted, tiny, uppercase)
  - 3 pixel bars (no border-radius!): HP (red `#f87171`), Hunger (orange `#fb923c`), Sanity (purple `#a78bfa`)
  - Each bar: label left + "value/max" right in monospace
- **Combat section:**
  - "COMBAT" label
  - 2 tiles side-by-side: ATAK (orange number) + OBRONA (cyan number)
  - Atak tile turns red with "↓ LOW" when sanity = 0
- **Equipment section:**
  - "EQUIPMENT" label
  - 2×2 grid of pixel slots (dark bg, subtle border): Weapon ⚔, Armor 🛡, Helmet ⛑, Item +
  - Slots glow on hover
- Quest tracker at bottom

---

## Screen 4 — SPRITE LIBRARY / DEV TOOLS (`/objects`)

**Layout:** Dark page, full-width gallery grid of sprite animations.

**Elements:**
- Header: "ASSET LIBRARY" + pack filter tabs (Free Pack, Cemetery, Fairy Forest, Castle…)
- Category filter: Characters, Environment, Props
- Sprite cards:
  - Dark card with top-orange pixel border
  - Live animated sprite preview (canvas)
  - Character name + animation label (e.g. "Body_A — Idle Down")
  - Pack badge (tiny chip, muted border)
- Empty state: "NO SPRITES FOUND" in large muted text

---

## Screen 5 — INVENTORY / BACKPACK (`/game` overlay or `/inventory`) [W23 — planned]

**Layout:** Overlay on top of game (semi-transparent backdrop), centered panel.

**Elements:**
- Panel title: "BACKPACK" with rucksack icon
- 5×4 grid of item slots (pixel squares, dark bg `#0b0c1f`, 1px border `#22233e`)
- Item hover: slot border becomes `#FF8C00`, tooltip shows item name + stats
- Selected item: 2px solid orange border + item detail panel on right
  - Item name (bold, uppercase)
  - Item type badge (chip: orange for weapon, cyan for armor)
  - Stats: ATK +X / DEF +X
  - "EQUIP" button (orange gradient) + "DROP" button (muted red)
- Equipment slots row at top: Weapon / Armor / Helmet / Item (filled slots glow)
- Close button (X) top-right

---

## Screen 6 — ENEMY LOOT DROP POPUP (in-game overlay) [W24 — planned]

**Layout:** Small popup appearing over dead enemy position, auto-dismiss after 5s.

**Elements:**
- Title: "LOOT DROPPED" in orange
- Item icon (sprite or emoji) + item name + rarity color (common=grey, rare=cyan, epic=magenta)
- "PICK UP" button (orange) + "LEAVE" text link
- Pixel border on popup, subtle glow matching rarity color

---

## Screen 7 — BUILDING MENU (in-game sidebar or overlay) [W20 — planned]

**Layout:** Left panel that slides in when player enters build mode (B key).

**Elements:**
- Title: "BUILD MODE"
- Building categories: Structures / Furniture / Defenses (tab chips)
- Building recipe cards:
  - Building icon (pixel sprite)
  - Name + cost (Wood X / Stone X)
  - Greyed out if resources insufficient
  - Selected state: orange border
- Confirmation: "PLACE" button, ESC to cancel
- Resource counter at bottom: 🪵 Wood: 12 | 🪨 Stone: 5

---

## Screen 8 — LEADERBOARD (optional, `/leaderboard`) [W30+ — planned]

**Layout:** Full-page, centered table, max 600px.

**Elements:**
- Title: "HALL OF LEGENDS"
- Filter tabs: All Time / This Week / Today
- Table rows (no dividers — alternating `#0e0f22` / `#16172e`):
  - Rank (#1 gold, #2 silver, #3 bronze — pixel star icons)
  - Player avatar (24px pixel square)
  - Player name
  - Stats: Days survived / Enemies killed / Score
- Top 3 podium: larger cards with glow (gold `#fcd34d`, silver `#a9a9c2`, bronze `#fb923c`)
- Own player row: highlighted with orange left border

---

## Notes for Stitch

- **All corners MUST be 0px (sharp)** — no border-radius anywhere
- **No 1px grey dividers** — use background color shifts or 2px pixel borders
- **Hover states:** -3px/-3px shift + pixel shadow in darker accent
- **Consistent spacing:** 8px base grid
- **All text in UPPERCASE** for labels/headings; proper case for content
- **Background glow:** subtle `radial-gradient` fire glow at bottom of full-page screens
- Images used: Google Stitch-generated forest campfire scene from previous export
