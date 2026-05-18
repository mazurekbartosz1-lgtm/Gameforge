# PM Analysis — 2026-05-18
**Triggered by:** manual
**Previous analysis:** reports/pm-analysis.md (2026-05-04)

---

## 1. Hook Model Audit

No code was changed since the previous analysis (2026-05-04). All previously identified YELLOW flags remain active and unaddressed. The assessment below updates context where relevant.

### Loop 1: Play (join group → explore world → survive)

| Stage | Assessment |
|-------|-----------|
| **Trigger** | Internal: curiosity, belonging ("my group is playing"). External: NotificationBell polling every 30 s — delivers real value (test invite, mod voted). Reasonable frequency. ✅ |
| **Action** | WASD movement, harvest with E, eat with F. Clear and immediate. A 10-year-old can start without instructions. ✅ |
| **Variable Reward** | Enemy drops (skill-based), fog-of-war discovery (exploration-based), elemental weapon suffixes (encounter-based). All tied to player choices, not slot-machine randomness. ✅ |
| **Investment** | Fog persistence, equipment upgrades, shared group map — each session leaves the world richer for the group. Legitimate creative investment. ✅ |

**YELLOW — No session-end signal (unaddressed since 2026-05-04):** The 4-hour real-time day cycle, continuous hunger drain, and 30-second enemy respawn create an open-ended loop with no natural stopping point. A child could play indefinitely with no signal to stop. Violates PM_FRAMEWORK rule: "every session should have natural ending points."

---

### Loop 2: Modify (forge → describe → AI generates → test)

| Stage | Assessment |
|-------|-----------|
| **Trigger** | Internal: creative urge ("I want fire enemies at night"). No external notification pushes children toward /forge unprompted. ✅ |
| **Action** | Text or voice → 3 clarifying questions → ModConfig JSON. Voice input (Web Speech API, pl-PL/en-US) is especially accessible for ages 10–12. ✅ |
| **Variable Reward** | "What will the AI make from my description?" — tied to the child's own language and specificity. The healthiest possible reward type: creative expression shapes the outcome. ✅ |
| **Investment** | Creating a mod = contributing to the group's shared game. Ownership language ("my mod", "our game") is the natural output. ✅ |

**RED FLAGS in Modify loop:** None found.

---

### Loop 3: Vote (submit → group sees → cast hearts)

| Stage | Assessment |
|-------|-----------|
| **Trigger** | External notification when a mod is submitted. Delivers clear value — someone in your group wants input. ✅ |
| **Action** | /forge/glosowanie → see submitted mods → tap ❤. One-tap action. ✅ |
| **Variable Reward** | "Will my vote tip the balance?" Results designed to be hidden until end — healthy suspense tied to group outcome, not individual ranking. ✅ |
| **Investment** | Weekly 3-heart limit creates intentional scarcity. Mild YELLOW: a child with 1 vote remaining and 2 mods they like may feel anxious. Borderline acceptable. |

**YELLOW FLAGS in Vote loop (both unaddressed since 2026-05-04):**
1. **VOTE_THRESHOLD=1 remains in deployed production code.** `src/app/api/forge/vote/route.ts:13`. Any single vote approves a mod instantly. The group deliberation mechanic — the product's entire value proposition — is disabled. This is a known defect documented in Session 26 decisions, the previous PM analysis, and now a third consecutive review.
2. **Vote count visible before voting closes.** The PRD specifies "results hidden until end." Seeing "0 hearts" on a child's mod before voting closes is a public rejection signal. Violates "Dignity always."

---

### Loop 4: Result (mod approved → enters main game)

| Stage | Assessment |
|-------|-----------|
| **Trigger** | NotificationBell `mod_voted` event — creator learns someone voted on their mod. External, delivers real value. ✅ |
| **Action** | "Aktywny — Zobacz →" badge on approved mod. GameHeader AKTYWNE MODY modal shows it's live. ✅ |
| **Variable Reward** | Seeing your mod change the game for everyone in the group. Pure social + creative reward — the strongest healthy reward type. ✅ |
| **Investment** | All approved mods accumulate in the live room. Collective investment, not individual streak. ✅ |

**YELLOW — "X people liked it: 0" for rejected mods (unaddressed since 2026-05-04):** If a zero vote count is shown publicly rather than only to the mod creator, this violates "Dignity always." The implementation has not been explicitly verified to protect this case.

---

### Hook Model Summary
**RED FLAGS found:** None at architecture level.
**YELLOW FLAGS found (4 — identical to last analysis; none resolved in the two weeks since):**
1. No session-end signal — infinite play possible
2. Vote count visible before vote closes (dignity/shame risk)
3. VOTE_THRESHOLD=1 in production code (breaks group deliberation)
4. Rejected mod count could be shown publicly (dignity risk)

---

## 2. Build Trap Check

### What shipped since last analysis (2026-05-04)?

**Nothing.** No development sessions have occurred since Session 28 (2026-04-07). The codebase has been in a 6-week development freeze. All previously flagged defects are aging in deployed code.

| Session | What shipped | Outcome metric targeted |
|---------|-------------|------------------------|
| — | No new sessions since 2026-04-07 | — |

### Did it move an outcome metric?

No. All outcome metrics remain at baseline zero. Clerk restricted sign-up mode remains active.

| Metric | Status |
|--------|--------|
| Groups active after 7 days | 0 — no external users |
| Mods submitted per active group per week | 0 — no external users |
| Votes cast per week | 0 — no external users |
| Waitlist signups | Table exists; count unknown |
| Ratio mods submitted → mods approved | Meaningless — VOTE_THRESHOLD=1 corrupts the data |
| Time from joining → first mod submitted | Undefined — no users |

### Build Trap signals detected

1. **6-week development freeze with no documented restart plan.** No sessions since 2026-04-07. All 4 ethics gaps from the previous PM analysis remain in deployed code. Development momentum is the hardest thing to recover — the risk of the project not shipping increases every week without a concrete next-session plan.

2. **W49 deployed before W48 completed — reversed safety order.** W49 (Vercel deploy) is marked complete in PLAN.md. W48 (security audit: Supabase RLS policies, Zod validation schemas, server-side stat caps, rate limiting) is still `[ ]`. The product is live with a Supabase database storing player data, nicknames, and game state, but without the hardening that W48 was designed to provide. The intended order was: secure → deploy.

3. **VOTE_THRESHOLD=1 has survived three consecutive PM reviews.** This defect was flagged in Session 26 decisions ("TODO: change to 3 before production"), the 2026-05-04 analysis (Action 1 recommendation), and now this analysis. It is a 1-line, 15-minute fix. The persistence of this defect through three reviews indicates the PM feedback loop is not connected to development decisions.

4. **Zero user outreach despite deployed product and live waitlist.** The /devlog page is public. The waitlist form is collecting emails. Restricted sign-ups are in place. But there is no documented plan for when and how the first real user group will be onboarded. The build-measure-learn cycle has been: **build → pause → pause**.

---

## 3. Four Product Risks

Assessment is for the currently planned work: **W48 (security audit), W50 (pre-launch test), W51 (roles), W52 (onboarding), W53 (safety filter).**

### Value Risk — MEDIUM-HIGH (unchanged)

The "fork → describe to AI → vote" loop is genuinely novel. Voice-based mod creation is compelling for ages 10–12. However, no child has ever used this product. All design decisions — military-style HUD language ("OPERATOR", "TACTICAL_MAP"), difficulty zone names ("Śmiertelnie"), mod flow complexity — are based on adult assumptions about what children want. The value hypothesis is entirely unvalidated.

### Usability Risk — HIGH (escalating)

W52 (onboarding) remains unbuilt. The current first-time experience for any new user:
1. Clerk OTP login screen with no explanation of what the product is
2. Military-style HUD with no guidance toward /forge or group creation
3. No path from "I just logged in" to the core "create a mod" loop without adult assistance

The longer W52 remains unbuilt, the more polished the rest of the product becomes by comparison, making the usability gap feel larger upon launch. W50 (pre-launch test) — the planned mechanism for discovering these gaps — has not been scheduled.

### Feasibility Risk — LOW (unchanged)

W48–W53 are all implementable within the existing stack. No architectural blockers. The security audit (W48) may surface issues, but the Supabase RLS patterns and Colyseus server-authoritative architecture are already in place as a foundation.

### Viability Risk — MEDIUM-HIGH (escalating from MEDIUM)

- **W49 deployed before W48.** Live Supabase database with player data lacks RLS per-user policies, server-side validation, and Zod-schema API guards. This is a regulatory and ethical liability for a children's platform (GDPR-K, potential COPPA scope).
- **No parental transparency.** Parents of 10-year-olds cannot see who is in their child's group, what mods have been submitted, or how long their child has been playing. This is both an ethics gap (PM_FRAMEWORK: "Parent visibility — never recommend features that parents can't see or understand") and a go-to-market barrier for the school/classroom use case.
- **No session duration guardrails.** No gentle break nudge exists. Multi-hour sessions are possible without any signal.

---

## 4. Threats

**(T1) — VOTE_THRESHOLD=1 is aging in deployed production code** *(Hook Model + Build Trap)*

This defect was introduced in Session 26, documented as a TODO, flagged in 3 separate reviews, and remains in `src/app/api/forge/vote/route.ts:13`. Any real user who joins today experiences the core voting mechanic as broken: one vote instantly approves any mod, eliminating group deliberation entirely. Fix time: 15 minutes. Every day it stays unfixed is a day closer to it being encountered by the first real child user. **Impact: Critical.**

**(T2) — Security audit not done for a deployed product with a live database** *(Viability risk)*

W49 (Vercel deploy) is complete. W48 (RLS policies, Zod schemas, rate limiting, stat caps) is not. The current production Supabase instance is not protected by per-player RLS policies. A malicious actor in a group room could potentially manipulate movement coordinates and inventory without server-side validation. For a product targeting children 10–14, this is a regulatory risk and an ethical obligation regardless of whether real users are currently present. **Impact: High.**

**(T3) — 6-week development freeze with no documented restart plan** *(Build Trap)*

The last session was 2026-04-07. No new sessions, no user outreach, no defect fixes in six weeks. Development momentum is the hardest thing to recover. The longer the freeze continues, the higher the cost of re-establishing context and the lower the probability the product ships before the summer opportunity window closes. **Impact: High.**

**(T4) — No onboarding when restricted sign-ups open** *(Usability risk)*

W52 (onboarding) remains unbuilt. The first cohort of real users — the most important for word-of-mouth — will arrive to a login screen followed by a military HUD with zero guidance. Children who don't immediately understand close the tab and don't return. A broken first impression with a child audience is very difficult to recover from. **Impact: High.**

**(T5) — Summer 2026 window is closing** *(Opportunity risk)*

Children aged 10–14 have maximum free time from June to August. A classroom use case in September requires approaching teachers in June. The waitlist is collecting emails but there is no plan to activate them. Every week without a first real user session is a week closer to the summer window closing without any PMF data. **Impact: Medium-High with hard deadline.**

---

## 5. Opportunities

**(O1) — All 4 ethics gaps can be fixed in a single 2-hour session**

VOTE_THRESHOLD (1 line), hiding vote counts until close (~30 min), verifying rejected count privacy (~30 min), adding a 60-minute play nudge in EventLog (~1 hour). One focused session converts a YELLOW ethics verdict to GREEN and makes the product parent-approvable for a first user test — without any design decisions or architecture changes.

*Hypothesis: fixing all 4 ethics gaps + W48 in two sessions unlocks a parent-approved first user test within the same week.*

**(O2) — Summer 2026 availability window: children have 3 months of free time**

June–August 2026 is peak availability for the target audience. A first real user session in late May or early June positions the product to iterate through the summer with real feedback. A teacher pilot in September requires outreach in June. **This opportunity has a hard deadline: approximately 2–3 weeks before the window begins.**

**(O3) — First real user session unlocks all 6 outcome metrics simultaneously**

One group of 3–5 children playing for 30 minutes produces: qualitative usability insight, time-to-first-mod data, evidence of (or against) ownership language, and the first signal on "groups active after 7 days." No development session can produce this breadth of insight.

*Hypothesis: one observed session with 3 children will produce more actionable product insight than 10 additional development sessions without user feedback.*

**(O4) — Voice mod creation is a demonstrable hero moment for children and parents**

"Say what you want to change about the game, and AI will make it happen" — demonstrated live with a real child — is the product's go-to-market story. The feature exists. The moment hasn't been documented. A 60-second video of a 12-year-old saying "I want lava monsters that burn the ground behind them" and seeing it appear in the game is worth more than any feature list.

**(O5) — Safety architecture is a genuine competitive advantage, currently uncommunicated**

OTP-only auth (no passwords), Claude Haiku content filter (planned W53), restricted sign-ups, "dignity always" design principle — these are real differentiators in the children's platform space. They are built or planned but not communicated to parents. A "For Parents" section on the /devlog page could convert skeptical-but-interested waitlist signups.

*Hypothesis: adding a "For Parents" section to /devlog increases waitlist conversion among parent-domain emails by making safety architecture legible to non-technical adults.*

---

## 6. Recommended Next 3 Actions

### Action 1: Fix all 4 ethics gaps before any external user joins

**Problem:** Every child who joins Gameforge today encounters: a broken voting mechanic (VOTE_THRESHOLD=1 means one vote auto-approves any mod), live vote counts that expose zero-heart mods before voting closes (dignity violation), no signal to stop an unlimited play session, and an unverified experience for rejected mod creators. These are not feature gaps — they are implementation gaps in specifications already agreed upon in the PRD. They create the risk that the first child's experience directly contradicts the product's stated values.

**Hypothesis:** If we fix all 4 ethics gaps (VOTE_THRESHOLD=3, hide live vote counts, verify rejected counts are private to creator, add 60-minute gentle break message in EventLog), the product will achieve a GREEN ethics verdict and be parent-approvable for a first user session within the same week.

**Minimum test:**
1. Change `VOTE_THRESHOLD = 1` to `VOTE_THRESHOLD = 3` in `src/app/api/forge/vote/route.ts:13` — 1 line, 5 minutes.
2. Hide `licznik głosów` (vote count) on vote/glosowanie pages until voting period closes — estimated 30 minutes.
3. Confirm `forge/glosowanie/page.tsx` and `forge/vote/[modId]/page.tsx` never display a vote count publicly — estimated 30 minutes to audit and patch.
4. Add one-time passive message in EventLog at 60 minutes: "Grasz już godzinę — może czas na przerwę? 🌿" (no lock, no force stop, just a gentle message) — estimated 45 minutes.
Total: one 2-hour session.

**Risk if wrong:** None. These are defect fixes matching PRD specifications. The only risk is that the 60-minute nudge feels interrupting to returning users — mitigated by showing it once per session rather than recurring.

---

### Action 2: Complete W48 security audit before opening sign-ups

**Problem:** The product is deployed to Vercel and connected to a live Supabase database storing player data (nicknames, positions, inventories, mod descriptions). W48 (server-side stat caps, distance validation, Supabase RLS per-player, Zod schemas on all API routes, rate limiting) was planned to run before W49 (deploy) but the order was reversed. For a platform targeting children 10–14, operating without database-level access control is both a regulatory exposure and an ethical obligation — independent of whether real users are currently present.

**Hypothesis:** If W48 is completed (RLS per-player, Zod on all API routes, server-side distance + stat cap validation, 10-msg/s rate limit per client), the product will be safe to open restricted sign-ups to a first cohort without risking data exposure or game state manipulation.

**Minimum test:** W48 is fully specified in PLAN.md with exact SQL migrations, route-by-route checklist, and example Zod schemas. No design decisions required — just implementation. Estimated: one 3-hour session. Validate by attempting common exploits post-implementation: call an API route without auth, send a move message with coordinates 10,000px away from current position, submit a stat modification via direct message.

**Risk if wrong:** The audit may surface a deeper vulnerability requiring architectural work. Given existing Supabase RLS patterns (already applied to some tables) and Colyseus's server-authoritative architecture, this risk is low. A vulnerability discovered during the audit is far better than one discovered after children are using the product.

---

### Action 3: Run the first real user session with 3–5 children (ages 10–14, parental consent)

**Problem:** After 28+ development sessions and 6 weeks of freeze, no child has used Gameforge. All design decisions — UI language, the 3-question clarify flow, difficulty zones, the voting UX — are based on adult assumptions. The product cannot be validated, iterated on, or grown without observing a real child use it. The 6-week pause is an opportunity to shift from building to learning.

**Hypothesis:** If 3 children in the same group complete one full loop (join → explore → create mod → vote → see mod in game), at least 1 will spontaneously use ownership language ("we made this", "our game", "I changed the monsters") rather than player language ("I played for X minutes"). This is the product-market fit signal defined in PM_FRAMEWORK.md — and the earliest possible moment to verify whether 28 sessions of work are on the right track.

**Minimum test:** Complete Actions 1 and 2 first. Then:
1. Create a group with a memorable code (e.g., LATO-2026).
2. Ask one parent to invite 2–4 children over a weekend afternoon.
3. Observe via shared screen or screen recording for 30–45 minutes without intervening.
4. Document every moment of confusion, every word used to describe the product, every time a child stops.

No new code required beyond Actions 1 and 2.

**Risk if wrong:** Children fail to complete the loop because W52 (onboarding) is not built and first-time navigation is too confusing. This is the most valuable possible failure — it proves W52 must be the next development session, directly before any broader access. Either outcome moves the product forward: success gives PMF evidence; failure clarifies the build order. The session is never wasted.

---

## 7. Ethics Check

### FOMO mechanics
**YELLOW.** The weekly 3-heart vote limit creates mild artificial scarcity. The weekly reset prevents streak-break anxiety — a good design choice. However, the current display (❤❤❤ filled/empty as countdown) frames remaining votes as depletion rather than opportunity. For children 10–14, "you can still support 2 mods this week" (abundance framing) is less anxiety-inducing than "1 heart left" (scarcity countdown). No change since last analysis.

### Shame/humiliation risk
**YELLOW.** Two specific risks remain unaddressed:
1. **Vote count visible before voting closes.** A child's mod showing "0 hearts" publicly before voting ends is a visible rejection signal that violates the PRD principle "results hidden until end" and the "no social shame" ethics rule.
2. **Rejected mod "X people liked it: 0."** If broadcast to the group rather than shown only to the creator, this violates "Dignity always." The code path has not been explicitly verified to protect this case.

Neither risk has been encountered by a real user yet (restricted sign-ups). Both will be encountered the moment the first group votes on a mod.

### Infinite loops
**YELLOW.** No session-end mechanism exists. Continuous hunger drain, 30-second enemy respawn, persistent fog-of-war exploration, and the day/night cycle collectively produce an engagement loop with no natural "good stopping point." For a 10-year-old, ending a session requires an adult to interrupt rather than the product offering a natural exit. Violates PM_FRAMEWORK: "every session should have natural ending points."

### Artificial urgency
**GREEN.** No countdown timers on votes. NotificationBell delivers actual value. AFK protection actively defends children who step away. No "your friend is waiting for you" mechanics. The strongest ethics area of the product — unchanged.

### Dark patterns
**GREEN.** No loot boxes, no streak penalties, no real-money mechanics, no misleading UI, no registration gate before fun (guests can play without signing up). Admin delete is appropriately privileged. No changes since last analysis.

---

### Ethics Verdict: YELLOW (escalating urgency)

The product philosophy is sound and the architecture reflects genuine ethical care. The same four implementation gaps flagged on 2026-05-04 remain unaddressed two weeks later:

1. **No session-end signal** — a child can play indefinitely
2. **Vote count visible before voting closes** — dignity violation on first real use
3. **Rejected mod count could be public** — dignity violation on first real use
4. **VOTE_THRESHOLD=1** — group deliberation is disabled; one friend can auto-approve any mod

New since last analysis: **W48 security audit not completed for a deployed product storing player data.** For a platform handling any data from children aged 10–14, operating without per-player RLS policies is a regulatory exposure (GDPR-K, COPPA scope considerations).

None of these are manipulative dark patterns. All are fixable in one to two focused sessions. The product would achieve GREEN with:
- VOTE_THRESHOLD set to 3 (1 line)
- Vote counts hidden until voting period ends
- Rejected mod counts shown only to the creator
- A gentle 60-minute play nudge in EventLog
- W48 security audit completed

**The success signal remains unearned.** No child has yet said "we decide how this game works." The next action that brings this signal closer is not another development feature — it is fixing the four ethics gaps and getting real children in front of the product before the summer window closes.
