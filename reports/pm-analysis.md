# PM Analysis — 2026-05-04
**Triggered by:** manual
**Previous analysis:** reports/pm-analysis.md (2026-04-23 — placeholder, no prior analysis)

---

## 1. Hook Model Audit

### Loop 1: Play (join group → explore world → survive)

| Stage | Assessment |
|-------|-----------|
| **Trigger** | Internal: curiosity, belonging ("my group is playing"). External: NotificationBell polling every 30 s — delivers real value (test invite, mod voted). Reasonable frequency. |
| **Action** | WASD movement, harvest with E, eat with F. Clear and immediate. A 10-year-old can start without instructions. ✅ |
| **Variable Reward** | Random enemy drops (tied to combat skill), fog-of-war discovery (tied to exploration), random elemental weapon suffixes (tied to enemy encounters). All skill/exploration-based, not slot-machine randomness. ✅ |
| **Investment** | Fog persistence, equipment upgrades, shared group map — every session leaves the world richer for the group. Legitimate creative investment. ✅ |

**RED FLAGS in Play loop:** None found. One YELLOW: no natural session-end signal. The 4-hour real-time day cycle, continuous hunger drain, and 30-second enemy respawn create conditions for open-ended sessions with no natural stopping point. A child could play indefinitely without any nudge to take a break.

---

### Loop 2: Modify (forge → describe → AI generates → test)

| Stage | Assessment |
|-------|-----------|
| **Trigger** | Internal: creative urge ("I want fire enemies at night"). No external notification pushes children toward /forge unprompted. ✅ |
| **Action** | Text or voice → 3 clarifying questions → ModConfig JSON preview. Voice input with interim results is especially accessible for ages 10–14. ✅ |
| **Variable Reward** | "What will the AI make from my description?" — tied to creative expression and specificity. This is the healthiest reward type: the child's own language creates the outcome. ✅ |
| **Investment** | Creating a mod = contributing to the group's shared game. Ownership language ("my mod", "our game") is the natural output. ✅ |

**RED FLAGS in Modify loop:** None found.

---

### Loop 3: Vote (submit → group sees → cast hearts)

| Stage | Assessment |
|-------|-----------|
| **Trigger** | External notification when a mod is submitted. Delivers clear value — someone in your group wants input. ✅ |
| **Action** | /forge/glosowanie → see submitted mods → tap ❤. One-tap action. ✅ |
| **Variable Reward** | "Will my vote tip the balance?" Results are designed to be hidden until end — healthy suspense tied to group outcome, not individual ranking. ✅ |
| **Investment** | Weekly 3-heart limit creates intentional scarcity. Mild YELLOW: could generate anxiety ("I only have 1 heart left this week, which mod deserves it?"). For 10–14 year olds, this is borderline acceptable. |

**RED FLAGS in Vote loop:**
- **YELLOW — Vote count visible before voting closes.** The current implementation shows `licznik głosów` (vote count) live on the vote page. The PRD specifies "results hidden until end." Seeing "0 votes" on a child's mod before voting closes could feel like public rejection. Needs to be fixed before external users join.
- **YELLOW — VOTE_THRESHOLD=1 in production code.** `src/app/api/forge/vote/route.ts:13` still has `VOTE_THRESHOLD=1`. Any single vote approves a mod. This breaks the group deliberation mechanic that is the product's entire value proposition.

---

### Loop 4: Result (mod approved → enters main game)

| Stage | Assessment |
|-------|-----------|
| **Trigger** | NotificationBell `mod_voted` event — creator learns someone voted on their mod. External, delivers real value. ✅ |
| **Action** | See "Aktywny — Zobacz →" badge on approved mod. GameHeader "AKTYWNE MODY" modal shows it's live. ✅ |
| **Variable Reward** | Seeing your mod change the game for everyone in the group. Pure social + creative reward — the strongest healthy reward type. ✅ |
| **Investment** | All approved mods accumulate in the live room. The game becomes richer as more mods are approved. Collective investment, not individual streak. ✅ |

**RED FLAGS in Result loop:**
- **YELLOW — "X people liked it" for rejected mods.** PRD specifies this message for mods that don't pass the threshold. If `X = 0` is shown publicly, this violates the "no social shame" principle. The dignity of the child who created the mod must be protected: rejected mods should show only the creator their vote count, not broadcast "0 hearts" publicly.

---

### Hook Model Summary
**RED FLAGS found:** None critical at architecture level.
**YELLOW FLAGS found (3):**
1. No session-end signal — infinite play possible
2. Vote count visible before vote closes (shame risk + PRD violation)
3. VOTE_THRESHOLD=1 in production code (breaks group deliberation)

---

## 2. Build Trap Check

### What was shipped since last analysis (Sessions 26–28)

| Session | What shipped | Outcome metric targeted |
|---------|-------------|------------------------|
| Session 26 | Full voting system (votes table, 3/week limit, admin delete, mod deactivation, Aktywne Mody modal) | Votes cast per week, ratio submitted→approved |
| Session 26 | VOTE_THRESHOLD=1 (test shortcut) | — (intentional dev shortcut, not a feature) |
| Session 27 (T-COMBAT) | Hybrid difficulty scaling, death/respawn, new player protection, difficulty zones, DifficultyOverrides in ModConfig | Groups active after 7 days (retention through deeper gameplay) |
| Session 28 | Multiplayer stability: zone_enter handler, catch-all handler, masterTick try/catch, AFK protection, respawn invincibility | Groups active after 7 days (stability) |

### Did it move an outcome metric?

**Honest answer: unknown.** Sign-up mode is still **Restricted** (Clerk dashboard). Zero external users have used the product. All outcome metrics are at baseline zero:

| Metric | Status |
|--------|--------|
| Groups active after 7 days | 0 — no external users |
| Mods submitted per active group per week | 0 — no external users |
| Votes cast per week | 0 — no external users |
| Waitlist signups | Table exists, count unknown |
| Ratio mods submitted → mods approved | 0 — VOTE_THRESHOLD=1 makes this meaningless |
| Time from joining → first mod submitted | Undefined — no users |

### Build Trap signals detected

1. **Complexity before validation.** T-COMBAT (difficulty zones, hybrid scaling formula, death/respawn, AFK protection) adds significant game depth to a product that has never been tested with a child. This is 1+ full sessions of work on a feature layer whose value is unproven with the target user.

2. **Building ahead of onboarding.** W52 (Onboarding — age gate, group code, nickname) is still unbuilt. We have a full AI mod pipeline, voting system, and difficulty scaling, but a new child joining today sees: Clerk login screen → "OPERATOR" header → "TACTICAL_MAP" section → military-style HUD. No explanation of what the product is or how to invite friends.

3. **VOTE_THRESHOLD=1 left in code.** This is a known defect (`TODO: zmienić na 3 przed produkcją`) flagged in Sessions 45 and 46 and still present. It makes the voted-on mods table meaningless for any internal testing.

4. **Restricted sign-ups = zero PMF feedback loop.** Every feature since Session 16 has been built without user validation. The build-measure-learn cycle has been: **build → build → build**.

---

## 3. Four Product Risks

Assessment is for the currently planned work: **W48 (security audit), W50 (pre-launch test), W51 (roles), W52 (onboarding), W53 (safety filter).**

### Value Risk — MEDIUM-HIGH

Will children actually want the current product?

We have not validated whether 10–14 year olds find the "fork → describe to AI → vote" loop compelling. The AI mod generation is genuinely novel, but the game template (Don't Starve-like survival with military UI terminology) may not resonate with the lower end of the age range. W52's onboarding step "how old are you?" is a signal that we know the age range is wide; the product experience hasn't been differentiated for it.

*Specifically unvalidated:* Does a 10-year-old understand "you can change this game using words" without being shown? Does voice input reduce the barrier enough? Does seeing their mod go live feel like ownership or like a feature toggle?

### Usability Risk — HIGH

Can a 10-year-old figure it out without help?

- Current UI language: "OPERATOR", "TACTICAL_MAP", "QUEST_OBJ ★★☆", "TRYB TESTOWY" — these are developer/military metaphors, not child language.
- No onboarding exists (W52 unbuilt). First-time users join a multiplayer game with no guidance.
- The /forge flow has 4 states (input → loading → questions → error) which is clean for a developer but untested with children.
- Group code format (ABC-1234) is good — simple, shareable via chat.

W52 addresses this, but even W52's plan uses adult-focused language ("Do you have a group code?") — the copy needs to be written for the actual user, not a generic new-user form.

### Feasibility Risk — LOW

W48 (security audit) is straightforward — existing Zod + RLS work, no architectural changes. W51–W53 (roles, onboarding, safety filter) are all implementable within the existing stack. No feasibility blockers identified.

### Viability Risk — MEDIUM

Does this fit the ethical constraints (safety-first design)?

W53 adds Claude Haiku safety filter for nicknames — good. But larger viability gaps remain:

- **No parental visibility.** Parents of 10-year-olds cannot see what their child is doing in the group, what mods they submitted, what was voted on, or who else is in their group. The PRD lists "parent visibility" as an ethics rule. This is unaddressed.
- **No session duration awareness.** No feature discourages multi-hour sessions. For a children's platform, this is a regulatory risk (KOSA in US, GDPR-K in EU) and a trust risk with parents.
- **Clerk restricted sign-up mode blocks the teacher/parent use case.** The most natural onboarding path for ages 10–14 is through a teacher or parent. Restricted mode means this requires direct outreach, which doesn't scale.

---

## 4. Threats

**(T1) — Zero user validation after 28 sessions of development** *(Build Trap)*

The entire product has been built without a single child user. Every design decision — UI language, mod flow complexity, vote thresholds, difficulty progression — is based on adult assumptions about what children want. The longer this continues, the more expensive course corrections become. **Impact: Critical.**

**(T2) — No onboarding means first impressions are broken** *(Usability risk)*

When sign-ups open, children and parents landing on the product will see a restricted, developer-facing UI with no explanation. A broken first impression with a child audience is very hard to recover from — children do not tolerate confusion; they close the tab. **Impact: High.**

**(T3) — VOTE_THRESHOLD=1 corrupts the core mechanic** *(Build Trap + Hook Model)*

The group vote is the moment of collective ownership — the central value proposition. VOTE_THRESHOLD=1 means one player can instantly approve their own mod (once a second player votes). This removes the tension, negotiation, and collective decision-making that makes the product unique. It's a known defect in production code. **Impact: High.**

**(T4) — No parental transparency creates trust risk** *(Viability risk)*

For children aged 10–14, parents are co-decision makers on what platforms they use. There is currently no parent-facing view, no notification to parents when a child joins or submits content, and no visibility into group membership. This is both an ethical gap and a go-to-market barrier (especially for the school/classroom use case). **Impact: Medium-High.**

**(T5) — Complexity creep before core loop is proven** *(Build Trap)*

T-COMBAT adds difficulty zones, hybrid scaling formulas, and death mechanics to a product whose core "fork → modify → vote → result" loop hasn't been validated. If the core loop doesn't work for children, T-COMBAT depth is irrelevant — and it adds cognitive load that may obscure the creative mechanic entirely. **Impact: Medium.**

---

## 5. Opportunities

**(O1) — First real user group is one group code away**

The waitlist form is live. The group system is built. One conversation with a teacher or parent could produce 3–5 children playing together within the week. This is the highest-leverage action available: it unlocks all outcome metrics simultaneously and produces qualitative insight that no amount of internal testing can replace. *Hypothesis: one validated test group → first "we decide how this game works" testimonial within 2 weeks.*

**(O2) — Voice input is a genuine differentiator for this age group**

Web Speech API for mod description is already built. For children who find typing frustrating (especially ages 10–12), saying "I want ice zombies that slow you down when it's raining" and seeing AI interpret it is magical. This should be the hero moment of onboarding, not buried on /forge. *Hypothesis: prominently featuring voice-first mod creation in onboarding will reduce time-to-first-mod from unknown → under 10 minutes.*

**(O3) — The teacher/classroom use case is unaddressed but naturally suited**

A teacher who gives one group code to a class of 20 students has: self-organizing groups, creative writing/coding motivation, peer feedback via voting, and AI literacy. The product already supports this (group code, max 20 players per group). A single teacher testimonial would be worth 100 individual signups for the waitlist and press narrative. *Hypothesis: one classroom pilot produces ownership language from students within 3 sessions.*

**(O4) — Safety architecture is a competitive moat**

OTP-only auth, no passwords, Claude Haiku content filter, restricted sign-ups, "dignity always" design principle — these are real differentiators in the children's platform space where safety is a known parent concern. These features are built but not communicated. The devlog doesn't clearly surface them as parent-facing trust signals. *Hypothesis: adding a "For Parents" section to the devlog increases waitlist conversion among parent emails.*

**(O5) — Mod accumulation creates a living world narrative**

All approved mods stack in the live room. After 4 weeks, a group's game is genuinely different from the original template — it's theirs. This "living game" narrative is the strongest retention and referral mechanic in the product, but it requires groups to stay active long enough for multiple mod cycles. The 7-day group inactivity threshold and the 3-vote-per-week limit are the natural cadence. *Hypothesis: groups that reach 3+ approved mods are retained past 30 days.*

---

## 6. Recommended Next 3 Actions

### Action 1: Fix VOTE_THRESHOLD before any external user touches the product

**Problem:** Every group creator who tests Gameforge has had their mod auto-approved after 1 vote since Session 26. The group deliberation mechanic — the heart of the product — is broken in the production codebase. When a child votes on a friend's mod and it immediately goes live, the group dynamic collapses into "who submits first wins."

**Hypothesis:** If `VOTE_THRESHOLD = 3` (matching the PRD spec), groups will develop real voting behavior over 7 days, and the "groups active after 7 days" metric will show natural return visits as children come back to cast remaining votes.

**Minimum test:** Change one constant in `src/app/api/forge/vote/route.ts:13`. Validate with a 3-device internal test (creator + 2 voters). Takes 15 minutes. Zero risk.

**Risk if wrong:** None — this is a defect fix, not a hypothesis. The only risk is waiting longer, which pollutes any data collected from test users.

---

### Action 2: Run the first real user session (3–5 children, ages 10–14, with parental consent)

**Problem:** The product's target user — a child aged 10–14 — has never used Gameforge. All 28 sessions of development have been built on adult assumptions. We have zero answers to: Does a child understand how to use /forge? Do they use ownership language after their mod goes live? Do they come back tomorrow?

**Hypothesis:** If 3 children in the same group complete one full loop (join → explore → create mod → vote → see mod in game), at least 1 will spontaneously describe the experience using ownership language ("we made this", "our game", "I changed the monsters") rather than player language ("I played for X minutes").

**Minimum test:** No code changes required beyond fixing VOTE_THRESHOLD (Action 1). Steps: (1) create a group with a memorable code, (2) ask 1 parent to invite 2–4 children over a weekend, (3) observe via shared screen recording for 30 min. Document every moment of confusion, every word they use to describe the product, every time they stop.

**Risk if wrong:** Children don't complete the loop because onboarding is too confusing → we learn we must build W52 before opening access. This is the most valuable possible failure: it prioritizes the backlog correctly and avoids building features no child will discover.

---

### Action 3: Build W52 Onboarding with child-appropriate language before opening sign-ups

**Problem:** When sign-ups open, a new child lands on a page with "OPERATOR" headers, a "TACTICAL_MAP" section, and military-style UI with zero explanation of what the product is, what they can do, or how to invite friends. A 10-year-old who doesn't immediately understand closes the tab and never returns.

**Hypothesis:** If we add a 3-step onboarding (age gate → group code → nickname) with the copy written in a child's voice — "What's your name in the game?", "Got a code from a friend? Enter it here", "You can change this game using words or your voice" — then time from account creation to first mod submitted will drop below 15 minutes.

**Minimum test:** Before writing a line of code: write the copy for all 3 steps, print it on paper, and read it to 1 child (a neighbor, sibling, or child of a friend). Watch whether they understand the product. Rewrite based on what confuses them. The copy is the product at this stage — validating it costs zero engineering time.

**Risk if wrong:** The onboarding flow adds friction for players who already know the product (e.g., returning after the app is shared). Mitigated by skipping onboarding for users who already have a nickname in Supabase (already the planned implementation in W52).

---

## 7. Ethics Check

### FOMO mechanics
**YELLOW.** The weekly 3-heart vote limit creates mild artificial scarcity ("I only have 1 vote left this week"). This is borderline for ages 10–14. The weekly reset removes the "streak break" pattern (no penalty for absence), which is good. However, a child who sees 2 mods they like with 1 vote remaining may feel anxious. Mitigation: consider displaying votes as "this week you can support 3 mods" (abundance framing) rather than a countdown.

### Shame/humiliation risk
**YELLOW.** Two specific risks:
1. Vote count displayed live on the vote page violates the PRD principle "results hidden until end" and creates public rejection risk ("0 hearts" visible to everyone before voting closes).
2. Rejected mods: if "X people liked it: 0" is broadcast to the group rather than shown only to the creator, this violates "Dignity always." The current implementation needs explicit checking — the PRD specifies this message exists, but the implementation must ensure the count is never shown publicly when zero.

### Infinite loops
**YELLOW.** No natural session-end point exists. The game has continuous hunger drain, 30-second enemy respawn, persistent fog, and no "good stopping point" mechanic. A child could play for 3+ hours without any signal to stop. This is a direct violation of the PM_FRAMEWORK ethics rule: "every session should have natural ending points." Minimum mitigation: a "you've been playing for 60 minutes, take a break?" notification (not a lock — a gentle signal).

### Artificial urgency
**GREEN.** No countdown timers on votes (the vote page shows no deadline). NotificationBell delivers actual value. The AFK protection system actively protects children who step away — this is an exemplary design choice. No "your friend is waiting for you" mechanics found.

### Dark patterns
**GREEN.** No registration gates before fun (guests can play without signing up). No loot boxes or spinner rewards. No streaks that punish absence. No real-money mechanics. No misleading UI. The soft-delete pattern on mods is transparent. The ADMIN_EMAILS mechanism is appropriately privileged.

---

### Ethics Verdict: YELLOW

The product philosophy is sound and the architecture reflects genuine ethical care. Three issues prevent a GREEN rating:

1. **No session end signals** — children can play indefinitely. Requires a gentle break nudge (not a forced stop).
2. **Vote count visible before votes close** — must be hidden until voting period ends to protect dignity of mod creators.
3. **Rejected mod "0 hearts" messaging** — must be shown only to the mod creator, never broadcast to the group.

None of these are dark patterns or manipulative mechanics. They are implementation gaps in an otherwise ethical design. All three are fixable without changing the product architecture. A parent reading this analysis would agree these are reasonable concerns, not disqualifying flaws.

**The success signal is close but not yet earned:** Until at least one child uses this product and says "we decide how this game works" — not "I played for X minutes" — we are building hypotheses, not a product. The next 2 weeks should be defined by one goal: getting that first sentence from a real child.
