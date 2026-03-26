"use client";

import { Press_Start_2P } from "next/font/google";
import { useState, useRef, FormEvent } from "react";

const pixelFont = Press_Start_2P({ weight: "400", subsets: ["latin"] });

// ─── Plan progress ────────────────────────────────────────────────────────────
const TOTAL_TASKS = 60;
const DONE_TASKS = 42;
const PROGRESS_PCT = Math.round((DONE_TASKS / TOTAL_TASKS) * 100);
const NEXT_LABEL = "T46 — Voting system";

// ─── Embers ───────────────────────────────────────────────────────────────────
const EMBER_DATA = [
  { left: "20%",  bottom: "12%", duration: "4s",   delay: "0s",   color: "#FF8C00" },
  { left: "35%",  bottom: "10%", duration: "5.5s", delay: "1.2s", color: "#FFB347" },
  { left: "50%",  bottom: "8%",  duration: "3.8s", delay: "0.6s", color: "#FF6E84" },
  { left: "65%",  bottom: "11%", duration: "6s",   delay: "2.1s", color: "#E67E00" },
  { left: "80%",  bottom: "9%",  duration: "4.5s", delay: "1.8s", color: "#FF8C00" },
  { left: "15%",  bottom: "13%", duration: "3.5s", delay: "3.2s", color: "#FFB347" },
  { left: "45%",  bottom: "10%", duration: "5.2s", delay: "0.4s", color: "#FF8C00" },
  { left: "70%",  bottom: "12%", duration: "4.4s", delay: "2.7s", color: "#E67E00" },
  { left: "25%",  bottom: "9%",  duration: "4.8s", delay: "3.7s", color: "#f183ff" },
  { left: "88%",  bottom: "11%", duration: "3.9s", delay: "4.3s", color: "#FF8C00" },
];

// ─── Stack tiles ─────────────────────────────────────────────────────────────
const STACK = [
  {
    label: "FRONTEND",
    color: "#FF8C00",
    items: ["Next.js 16", "TypeScript", "Phaser 3.90", "Tailwind CSS"],
  },
  {
    label: "GAME SERVER",
    color: "#00e3fd",
    items: ["Colyseus 0.17", "Node.js 20", "WebSocket", "@colyseus/schema"],
  },
  {
    label: "AI ENGINE",
    color: "#f183ff",
    items: ["Claude Sonnet 4.6", "Claude Haiku 4.5", "@anthropic-ai/sdk", "RuleEngine"],
  },
  {
    label: "INFRA",
    color: "#00ff7f",
    items: ["Vercel", "Railway", "Supabase", "Clerk Auth"],
  },
];

// ─── Dev log entries — product perspective ────────────────────────────────────
interface Challenge { what: string; how: string }
interface LogEntry {
  date: string;
  tag: string;
  title: string;
  items: string[];
  challenges: Challenge[];
}

const DEV_LOG: LogEntry[] = [
  {
    date: "2026-03-26",
    tag: "devlog · UI polish",
    title: "Pixel font everywhere — the HUD finally looks like a game",
    items: [
      "Press Start 2P pixel font is now applied consistently across every page: home, forge, voting, room history, status, and the game HUD.",
      "Game header labels (room name, day/night cycle, buttons) all switched to pixel font — the game now has a coherent retro identity.",
      "Player panel stats, combat values, equipment slots, and section headers all use pixel font at small sizes (6–9px).",
      "Devlog launched publicly — anyone can read the project diary without an account. All other pages stay behind login.",
      "Waitlist form added to devlog — players can leave their email to be notified when the game opens.",
    ],
    challenges: [
      {
        what: "Press Start 2P renders much wider than regular sans-serif fonts — the same pixel size as body text caused overflow and layout breaks.",
        how: "We reduced font sizes significantly across the board (e.g. h1 titles from 22px → 13px, stat values from 16px → 13px). The font looks best at 6–14px.",
      },
    ],
  },
  {
    date: "2026-03-26",
    tag: "T44 · T45 · T47",
    title: "Mods go live — no restart, no interruption",
    items: [
      "Players can invite up to 2 group members into a private test room to try a mod before it goes to a vote.",
      "Once a mod is submitted for voting, the whole group gets a notification — a bell icon in the game header shows unread count.",
      "When a mod wins enough votes and gets approved, it activates in the live room automatically — no server restart, no downtime.",
      "Approved mods stack — each winning mod extends the game instead of replacing the previous one.",
      "All submitted mods from a group are listed on one page, one click away from the voting screen.",
    ],
    challenges: [
      {
        what: "New mods entering the game were wiping the default gameplay rules, breaking core mechanics.",
        how: "We changed how rules are added — new mods append to existing rules instead of replacing them.",
      },
    ],
  },
  {
    date: "2026-03-25",
    tag: "T36 · T37 · T38 · T39 · T41 · T42 · T43",
    title: "Describe it in words, AI builds it — The Forge is ready",
    items: [
      "Players can describe their mod idea by voice or text — in Polish or English.",
      "AI asks up to 3 clarifying questions to make the idea specific: what effect, how strong, under what conditions.",
      "Based on the answers, AI generates a ready mod: a new enemy variant with different appearance and stats, new rules (e.g. 'every kill gives all players a bonus'), or new food sources.",
      "Enemies react to elemental weapons — fire leaves burning, ice slows, electricity stuns. Every effect is visible on screen.",
      "Players see a list of their mods with a preview — enemy color, which rules will change, when submitted.",
      "Ideas that can't be built (e.g. dragons) get an alternative suggestion instead of a plain rejection.",
    ],
    challenges: [
      {
        what: "AI was naming mods after the player's original (impossible) idea, e.g. 'Fire Dragon', instead of the actual modification.",
        how: "We updated the AI instruction — the mod name and description must reflect what actually changes in the game.",
      },
    ],
  },
  {
    date: "2026-03-25",
    tag: "T31 · T32 · Hotfix",
    title: "Groups and a shared world — every crew has their own game",
    items: [
      "Each group of players has their own isolated world — map, weather and enemies are shared only within that group.",
      "Joining a group takes one link — send it to friends and everything happens automatically.",
      "Group history: a recap of the most important events from past sessions — who died, who found rare loot.",
      "Day/night cycle visible in the game header — a progress bar and day counter since the group was created.",
      "Only one active session per account at a time — opening the game in a second tab asks whether to take over, instead of spawning a ghost player.",
    ],
    challenges: [
      {
        what: "Opening the game in a new tab as the same guest created two characters at once instead of showing a conflict prompt.",
        how: "We changed the guest identifier to be shared across all tabs in the same browser.",
      },
      {
        what: "In production, every group API call returned 404 even though it worked locally.",
        how: "The database access key was copied incomplete to the production server — we retyped it in full.",
      },
    ],
  },
  {
    date: "2026-03-24",
    tag: "T25 · T26 · T27",
    title: "Gear, loot and trading between players",
    items: [
      "Enemies drop equipment — swords, armor, helmets — each with its own rarity (common, uncommon, rare).",
      "Players can equip a found item and immediately see how their attack and defense changed.",
      "Stats comparison before and after equipping — a side panel shows the difference at a glance.",
      "Drop items on the ground — leave something for a groupmate; the item glows on the map.",
      "8-slot hotbar with keyboard shortcuts 1–8, plus a full equipment panel [I].",
      "Your character remembers its gear between sessions — log out and come back the next day with everything intact.",
    ],
    challenges: [
      {
        what: "Closing the browser right after a quick page reload could cause position and inventory to be lost.",
        how: "Character state now waits for the previous session to be safely closed before removing old data.",
      },
    ],
  },
  {
    date: "2026-03-23",
    tag: "T19 · T20 · T21 · T22 · T23 · T24",
    title: "Your character remembers you — and you can eat a mushroom",
    items: [
      "Your character returns exactly where you left it — with the same explored map and the same inventory.",
      "The world has food: mushrooms in the forest and berry bushes in open areas. Pick them up with E, eat with F.",
      "Guest players (no account) also have persistence — the guest session lasts for the entire browser session.",
      "New game UI based on the Neon Quest design: side panel with tactical map, status bars and equipment slots.",
      "Sign in with Google — secure and no extra password to remember.",
    ],
    challenges: [
      {
        what: "Map data messages were too large for the server's default limits — connections dropped without any error message.",
        how: "We raised the message size limit to 512 KB — enough for even the largest possible map updates.",
      },
    ],
  },
  {
    date: "2026-03-20–22",
    tag: "T3 · T4 · T5–T18",
    title: "A living world — movement, other players, enemies, exploration",
    items: [
      "Players see each other in real time — movement is smooth even on slower connections thanks to interpolation.",
      "Procedurally generated infinite world — each group gets a different map derived from its group code.",
      "Fog of war: new areas are discovered personally — you only see what you have explored yourself.",
      "Trees and rocks to harvest, enemies that chase and attack, character animations in 8 directions.",
      "Camera follows the character with a natural lag; a minimap in the corner shows explored terrain.",
      "The game runs in the browser — no installation, no updates to download.",
    ],
    challenges: [
      {
        what: "The game server wouldn't start on the hosting platform — a WebSocket library forced a module format incompatible with Node.js.",
        how: "We switched the entire server to the modern ESM format — it took several hours of debugging and reading dependency docs.",
      },
    ],
  },
  {
    date: "2026-03-19",
    tag: "T1 · T2",
    title: "Day zero — project decision and first line of code",
    items: [
      "We chose the tech stack: a browser game with AI building modifications from a verbal description.",
      "We collected 357 ready-made pixel art sprites for characters and the world (Pixel Crawler) — none will be AI-generated.",
      "We set up accounts on all required services: frontend hosting, game server hosting, database, authentication.",
      "We wrote a plan of 60 development tasks — each task has a concrete goal and a definition of done.",
    ],
    challenges: [],
  },
];

// ─── Waitlist form ────────────────────────────────────────────────────────────
type WaitlistState = "idle" | "loading" | "success" | "duplicate" | "error";

function WaitlistForm() {
  const [state, setState] = useState<WaitlistState>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const email = inputRef.current?.value ?? "";
    setState("loading");

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.status === 201) { setState("success"); return; }
    if (res.status === 409) { setState("duplicate"); return; }
    setState("error");
  }

  const MESSAGES: Record<WaitlistState, { text: string; color: string } | null> = {
    idle:      null,
    loading:   null,
    success:   { text: "✓ You're on the list! We'll email you on launch day.", color: "#00ff7f" },
    duplicate: { text: "◈ This email is already on the list.", color: "#00e3fd" },
    error:     { text: "! Something went wrong. Please try again.", color: "#f183ff" },
  };

  const msg = MESSAGES[state];

  return (
    <div>
      <p style={{
        fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
        color: "#a9a9c2", fontSize: 14, lineHeight: 1.8, margin: "0 0 20px",
      }}>
        Leave your email — we&apos;ll send you a message the day Gameforge opens its doors to players.
      </p>

      {state === "success" ? (
        <p className={pixelFont.className} style={{ fontSize: 10, color: "#00ff7f", lineHeight: 1.9 }}>
          ✓ YOU&apos;RE ON THE LIST!<br />
          <span style={{ fontSize: 8, color: "#a9a9c2" }}>We&apos;ll email you on launch day.</span>
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            ref={inputRef}
            type="email"
            required
            placeholder="your@email.com"
            disabled={state === "loading"}
            style={{
              flex: 1,
              minWidth: 220,
              background: "rgba(0,0,0,0.6)",
              border: "2px solid rgba(0,227,253,0.3)",
              borderBottom: "2px solid #00e3fd",
              color: "#e4e3fe",
              fontSize: 14,
              fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
              padding: "12px 16px",
              outline: "none",
              letterSpacing: "0.03em",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "#00e3fd"; }}
            onBlur={e => {
              e.currentTarget.style.borderColor = "rgba(0,227,253,0.3)";
              e.currentTarget.style.borderBottomColor = "#00e3fd";
            }}
          />
          <button
            type="submit"
            disabled={state === "loading"}
            style={{
              background: state === "loading" ? "rgba(0,227,253,0.2)" : "#00e3fd",
              border: "2px solid #00e3fd",
              color: state === "loading" ? "#00e3fd" : "#0b0c1f",
              cursor: state === "loading" ? "wait" : "pointer",
              padding: "12px 20px",
              boxShadow: "2px 2px 0 rgba(0,227,253,0.25)",
            }}
          >
            <span className={pixelFont.className} style={{ fontSize: 9, letterSpacing: "0.1em" }}>
              {state === "loading" ? "..." : "NOTIFY ME"}
            </span>
          </button>
        </form>
      )}

      {msg && state !== "success" && (
        <p style={{
          fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
          color: msg.color, fontSize: 13, marginTop: 12, lineHeight: 1.7,
        }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

// ─── Accordion ────────────────────────────────────────────────────────────────
function Accordion({
  title,
  defaultOpen = false,
  children,
  accentColor = "#FF8C00",
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: open ? "rgba(255,140,0,0.08)" : "rgba(255,255,255,0.03)",
          border: "none",
          borderLeft: `4px solid ${accentColor}`,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          color: accentColor,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          textAlign: "left",
          gap: 12,
        }}
      >
        <span className={pixelFont.className} style={{ fontSize: 11, letterSpacing: "0.1em", lineHeight: 1.8 }}>
          {title}
        </span>
        <span className={pixelFont.className} style={{ fontSize: 12, color: open ? accentColor : "rgba(255,255,255,0.3)", flexShrink: 0 }}>
          {open ? "[-]" : "[+]"}
        </span>
      </button>

      {open && (
        <div style={{
          borderLeft: `4px solid ${accentColor}`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.25)",
          padding: "24px 28px",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DevLogPage() {
  const progressBlocks = 30;
  const filledBlocks = Math.round((DONE_TASKS / TOTAL_TASKS) * progressBlocks);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0c1f", position: "relative" }}>

      {/* Fixed background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJ-q7fLSyDvFPL2i6wCHGh7xKapptKpIyJArqIPCFSUoxKMgrv78EoMaG_4L_pFyoGb-51q2Q6-SqEzcAPaYnCez7v5wdmujbFYAwuaYe1HRuKAy5trEBm7qTvsRDKtUf-me0Cl4d2o1hMJb3W8KYRnA_91ZdyGXVqIzgWWTJGQzBqq_f0agAYysrwxtUUhsLU--b5wnUOaBJ53VZIecBh43LJyykc2JUdJgfUm66sa0Xay7qgX9ZWtXt2SdzDKGyl8pw9H4Ax1iVm"
          alt="Forest campfire"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center bottom" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(11,12,31,0.97) 0%, rgba(11,12,31,0.82) 50%, rgba(11,12,31,0.72) 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {EMBER_DATA.map((e, i) => (
            <div key={i} className="ember" style={{
              left: e.left, bottom: e.bottom,
              animationDuration: e.duration, animationDelay: e.delay,
              background: e.color, boxShadow: `0 0 6px ${e.color}`,
            }} />
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 900, margin: "0 auto", padding: "64px 28px 96px" }}>

        {/* Masthead */}
        <div style={{ marginBottom: 52, textAlign: "center" }}>
          <p className={pixelFont.className} style={{ fontSize: 10, color: "#00e3fd", letterSpacing: "0.3em", marginBottom: 16 }}>
            // DEVELOPER LOG //
          </p>
          <h1 className={pixelFont.className} style={{
            fontSize: "clamp(18px, 3vw, 28px)",
            color: "#FF8C00",
            textShadow: "0 0 20px rgba(255,140,0,0.5), 4px 4px 0 rgba(255,140,0,0.15)",
            letterSpacing: "0.05em",
            lineHeight: 1.5,
            margin: "0 0 12px",
          }}>
            GAMEFORGE
          </h1>
          <p style={{
            fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
            color: "#a9a9c2", fontSize: 14, letterSpacing: "0.2em",
            textTransform: "uppercase", margin: 0,
          }}>
            The making of Your Game, Your Rules
          </p>
        </div>

        {/* Progress bar */}
        <div style={{
          marginBottom: 44,
          border: "2px solid rgba(255,140,0,0.3)",
          borderLeft: "4px solid #FF8C00",
          padding: "22px 28px",
          background: "rgba(0,0,0,0.4)",
          boxShadow: "4px 4px 0 rgba(255,140,0,0.08)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <span className={pixelFont.className} style={{ fontSize: 10, color: "#FF8C00" }}>
              PROJECT PROGRESS
            </span>
            <span className={pixelFont.className} style={{ fontSize: 10, color: "#a9a9c2" }}>
              {DONE_TASKS} / {TOTAL_TASKS} TASKS
            </span>
          </div>

          <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
            {Array.from({ length: progressBlocks }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 18,
                background: i < filledBlocks ? "#FF8C00" : "rgba(255,140,0,0.1)",
                boxShadow: i < filledBlocks ? "0 0 6px rgba(255,140,0,0.4)" : "none",
              }} />
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{
              fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
              fontSize: 13, color: "#a9a9c2", letterSpacing: "0.08em",
            }}>
              NEXT: <span style={{ color: "#00e3fd" }}>{NEXT_LABEL}</span>
            </span>
            <span className={pixelFont.className} style={{ fontSize: 18, color: "#FF8C00" }}>
              {PROGRESS_PCT}%
            </span>
          </div>
        </div>

        {/* Accordions */}
        <div style={{ marginBottom: 44, display: "flex", flexDirection: "column", gap: 0 }}>

          <Accordion title="NOTIFY ME ON LAUNCH" defaultOpen={false} accentColor="#00e3fd">
            <WaitlistForm />
          </Accordion>

          <Accordion title="MISSION" defaultOpen accentColor="#FF8C00">
            <p style={{
              fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
              color: "#e4e3fe", fontSize: 15, lineHeight: 1.9, margin: "0 0 28px",
            }}>
              Gameforge is a multiplayer retro pixel art browser game for kids aged 10–14 — a
              shared survival world where every player sees each other in real time. Each group
              also shapes their own version of the game together, by voice or text, without
              writing any code. AI turns ideas into game mechanics. Kids propose changes, vote
              on the best ones, and winning modifications go live in the shared world.
              No adult moderator needed.
            </p>
            <div>
              <p className={pixelFont.className} style={{ fontSize: 9, color: "#a9a9c2", marginBottom: 14, letterSpacing: "0.15em" }}>
                CORE LOOP
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {["FORK", "DESCRIBE", "ITERATE", "SUBMIT", "VOTE", "LIVE"].map((step, i, arr) => (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      background: "rgba(255,140,0,0.12)",
                      border: "2px solid #FF8C00",
                      padding: "8px 14px",
                      boxShadow: "2px 2px 0 rgba(255,140,0,0.2)",
                    }}>
                      <span className={pixelFont.className} style={{ fontSize: 9, color: "#FF8C00" }}>{step}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <span className={pixelFont.className} style={{ fontSize: 10, color: "#a9a9c2" }}>→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Accordion>

          <Accordion title="VALUES" defaultOpen={false} accentColor="#00e3fd">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
              {[
                {
                  icon: "◈", title: "SAFETY", color: "#FF8C00",
                  text: "Safety built into every layer — not added as a filter at the end. Every architectural decision accounts for child protection.",
                },
                {
                  icon: "◆", title: "POSITIVE REINFORCEMENT", color: "#00e3fd",
                  text: "The system rewards good behavior, not just punishes bad. Experiment without fear of failure. Every idea can win a vote.",
                },
                {
                  icon: "◉", title: "DIGNITY", color: "#f183ff",
                  text: "No platform mechanism can publicly humiliate a player. Vote results are hidden until the end. A rejected mod is private information.",
                },
              ].map((v) => (
                <div key={v.title} style={{
                  border: `2px solid ${v.color}`,
                  borderTop: `4px solid ${v.color}`,
                  padding: "18px",
                  background: "rgba(0,0,0,0.3)",
                  boxShadow: `4px 4px 0 ${v.color}22`,
                }}>
                  <div style={{ marginBottom: 10 }}>
                    <span className={pixelFont.className} style={{ fontSize: 16, color: v.color }}>{v.icon}</span>
                  </div>
                  <p className={pixelFont.className} style={{ fontSize: 9, color: v.color, marginBottom: 12, lineHeight: 1.9 }}>
                    {v.title}
                  </p>
                  <p style={{
                    fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
                    color: "#a9a9c2", fontSize: 13, lineHeight: 1.85, margin: 0,
                  }}>
                    {v.text}
                  </p>
                </div>
              ))}
            </div>
          </Accordion>

          <Accordion title="SAFETY FILTER" defaultOpen={false} accentColor="#f183ff">
            <p style={{
              fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
              color: "#e4e3fe", fontSize: 15, lineHeight: 1.9, margin: "0 0 22px",
            }}>
              Every mod idea passes through a two-stage AI filter before it reaches the voting screen.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                {
                  step: "01", label: "CONTENT FILTER", color: "#FF8C00",
                  text: "Rejects content inappropriate for children — violence, hate speech, sexual content, personal data, external links.",
                },
                {
                  step: "02", label: "BYPASS DETECTION", color: "#f183ff",
                  text: "Detects attempts to circumvent the filter: disguised language, leetspeak (4=a, 3=e), Unicode characters substituted for letters, commands injected into the mod description (prompt injection).",
                },
              ].map((s) => (
                <div key={s.step} style={{
                  display: "flex", gap: 18,
                  borderLeft: `4px solid ${s.color}`,
                  padding: "14px 18px",
                  background: "rgba(0,0,0,0.2)",
                }}>
                  <span className={pixelFont.className} style={{ fontSize: 12, color: s.color, flexShrink: 0 }}>
                    {s.step}
                  </span>
                  <div>
                    <p className={pixelFont.className} style={{ fontSize: 9, color: s.color, marginBottom: 10, lineHeight: 1.9 }}>
                      {s.label}
                    </p>
                    <p style={{
                      fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
                      color: "#a9a9c2", fontSize: 13, lineHeight: 1.85, margin: 0,
                    }}>
                      {s.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p style={{
              fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
              color: "#f183ff", fontSize: 13, marginTop: 18,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              ◈ No mod reaches the vote without passing both stages.
            </p>
          </Accordion>

          <Accordion title="TECH STACK" defaultOpen={false} accentColor="#00ff7f">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
              {STACK.map((s) => (
                <div key={s.label} style={{
                  border: `1px solid ${s.color}44`,
                  borderTop: `3px solid ${s.color}`,
                  padding: "16px 18px",
                  background: "rgba(0,0,0,0.3)",
                }}>
                  <p className={pixelFont.className} style={{ fontSize: 9, color: s.color, marginBottom: 14, lineHeight: 1.8 }}>
                    {s.label}
                  </p>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {s.items.map((item) => (
                      <li key={item} style={{
                        fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
                        color: "#e4e3fe", fontSize: 13, lineHeight: 2.1,
                      }}>
                        <span style={{ color: s.color, marginRight: 8 }}>▸</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Accordion>
        </div>

        {/* Dev Log */}
        <div>
          <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 16 }}>
            <span className={pixelFont.className} style={{ fontSize: 12, color: "#FF8C00" }}>
              == DEV LOG
            </span>
            <div style={{ flex: 1, height: 2, background: "linear-gradient(to right, #FF8C00, transparent)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {DEV_LOG.map((entry, idx) => (
              <div key={idx} style={{
                border: "1px solid rgba(255,255,255,0.06)",
                borderLeft: "4px solid #FF8C00",
                background: "rgba(0,0,0,0.35)",
                boxShadow: "4px 4px 0 rgba(0,0,0,0.3)",
              }}>
                {/* Header */}
                <div style={{
                  display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 16,
                  padding: "16px 24px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <span className={pixelFont.className} style={{ fontSize: 9, color: "#00e3fd" }}>
                    [{entry.date}]
                  </span>
                  <span className={pixelFont.className} style={{ fontSize: 9, color: "#FF8C00" }}>
                    {entry.tag}
                  </span>
                </div>

                {/* Title */}
                <div style={{ padding: "16px 24px 4px" }}>
                  <p className={pixelFont.className} style={{ fontSize: 11, color: "#e4e3fe", lineHeight: 1.9, marginBottom: 16 }}>
                    {entry.title}
                  </p>
                </div>

                {/* Items */}
                <div style={{ padding: "0 24px 20px" }}>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {entry.items.map((item, i) => (
                      <li key={i} style={{
                        fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
                        color: "#e4e3fe", fontSize: 14, lineHeight: 1.9,
                        display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 4,
                      }}>
                        <span style={{ color: "#00ff7f", flexShrink: 0, marginTop: 3 }}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Challenges */}
                {entry.challenges.length > 0 && (
                  <div style={{
                    margin: "0 24px 20px",
                    borderLeft: "3px solid #f183ff",
                    padding: "12px 16px",
                    background: "rgba(241,131,255,0.04)",
                  }}>
                    <p className={pixelFont.className} style={{ fontSize: 8, color: "#f183ff", marginBottom: 12, letterSpacing: "0.15em" }}>
                      ! WHAT WAS HARD
                    </p>
                    {entry.challenges.map((c, i) => (
                      <div key={i} style={{ marginBottom: i < entry.challenges.length - 1 ? 14 : 0 }}>
                        <p style={{
                          fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
                          color: "#f183ff", fontSize: 13, margin: "0 0 5px", lineHeight: 1.8,
                        }}>
                          <span style={{ opacity: 0.55, textTransform: "uppercase", fontSize: 11 }}>Problem: </span>
                          {c.what}
                        </p>
                        <p style={{
                          fontFamily: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
                          color: "#00e3fd", fontSize: 13, margin: 0, lineHeight: 1.8,
                        }}>
                          <span style={{ opacity: 0.55, textTransform: "uppercase", fontSize: 11 }}>Solution: </span>
                          {c.how}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 64, textAlign: "center" }}>
          <p className={pixelFont.className} style={{ fontSize: 8, color: "rgba(255,140,0,0.3)", letterSpacing: "0.2em" }}>
            © 8-BIT REALMS MMXXIV · ALL RIGHTS RESERVED
          </p>
        </div>
      </div>
    </div>
  );
}
