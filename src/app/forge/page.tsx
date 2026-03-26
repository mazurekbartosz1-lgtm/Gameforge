"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ModInput from "../components/ModInput";
import type { ModConfig } from "@/shared/modConfig";

type Language = "pl" | "en";
type Stage = "input" | "loading_clarify" | "questions" | "loading_generate" | "generated" | "error";

export default function ForgePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("input");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<Language>("pl");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [redirect, setRedirect] = useState<string | null>(null);
  const [modConfig, setModConfig] = useState<ModConfig | null>(null);
  const [savedModId, setSavedModId] = useState<string | null>(null);
  const [testRoomId, setTestRoomId] = useState<string | null>(null);
  const [creatingTestRoom, setCreatingTestRoom] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div style={{ height: "100vh", background: "#0b0c1f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, letterSpacing: "0.1em" }}>LOADING...</span>
      </div>
    );
  }

  async function handleSubmit(desc: string, lang: Language) {
    setDescription(desc);
    setLanguage(lang);
    setStage("loading_clarify");
    setErrorMsg("");
    try {
      const res = await fetch("/api/forge/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc, language: lang }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setQuestions(data.questions);
      setRedirect(data.redirect ?? null);
      setAnswers(["", "", ""]);
      setStage("questions");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStage("error");
    }
  }

  async function handleGenerate() {
    setStage("loading_generate");
    setErrorMsg("");
    try {
      const res = await fetch("/api/forge/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, questions, answers, language }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setModConfig(data.config);
      setSavedModId(data.modId ?? null);
      setStage("generated");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStage("error");
    }
  }

  function handleAnswerChange(i: number, value: string) {
    setAnswers((prev) => { const next = [...prev]; next[i] = value; return next; });
  }

  function handleBack() {
    setStage("input");
    setQuestions([]);
    setAnswers(["", "", ""]);
    setModConfig(null);
    setTestRoomId(null);
  }

  async function handleCreateTestRoom() {
    if (!modConfig) return;
    setCreatingTestRoom(true);
    try {
      const colyseusHttp = (process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567")
        .replace(/^wss:\/\//, "https://")
        .replace(/^ws:\/\//, "http://");
      const raw = await fetch(`${colyseusHttp}/matchmake/create/test_room`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ modConfig }),
      }).then((r) => r.json());
      if (!raw.roomId) throw new Error("No roomId returned");
      setTestRoomId(raw.roomId as string);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStage("error");
    } finally {
      setCreatingTestRoom(false);
    }
  }

  const allAnswered = answers.every((a) => a.trim().length > 0);
  const isLoading = stage === "loading_clarify" || stage === "loading_generate";

  const L = {
    backBtn: language === "pl" ? "← Zmień opis" : "← Edit description",
    generateBtn: language === "pl" ? "Generuj modyfikację" : "Generate modification",
    answerPlaceholder: language === "pl" ? "Twoja odpowiedź..." : "Your answer...",
    errorTitle: language === "pl" ? "Błąd" : "Error",
    retryBtn: language === "pl" ? "Spróbuj ponownie" : "Try again",
    submitVoteBtn: language === "pl" ? "Wyślij do głosowania" : "Submit for vote",
    loadingClarify: language === "pl" ? "Claude zadaje pytania..." : "Claude is thinking...",
    loadingGenerate: language === "pl" ? "Claude generuje modyfikację..." : "Claude is generating...",
    yourDesc: language === "pl" ? "Twój opis" : "Your description",
    startOver: language === "pl" ? "← Zacznij od nowa" : "← Start over",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0c1f", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px" }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 600, marginBottom: 32 }}>
        <a href="/" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,140,0,0.5)", textDecoration: "none", fontWeight: 700 }}>
          ← Gameforge
        </a>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.01em", color: "#FF8C00", textTransform: "uppercase", marginTop: 16, marginBottom: 4 }}>
          Create a Modification
        </h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em", margin: 0 }}>
          Describe what you want to change — Claude will help you design it.
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 600,
        background: "rgba(28,29,54,0.8)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,140,0,0.2)", borderTop: "2px solid #FF8C00",
        borderRadius: 4, padding: 24,
      }}>
        {/* input */}
        {stage === "input" && <ModInput onSubmit={handleSubmit} />}

        {/* loading */}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 0" }}>
            <Spinner />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>
              {stage === "loading_clarify" ? L.loadingClarify : L.loadingGenerate}
            </span>
          </div>
        )}

        {/* questions */}
        {stage === "questions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ borderLeft: "2px solid rgba(255,140,0,0.4)", paddingLeft: 12 }}>
              <p style={{ fontSize: 11, color: "rgba(255,140,0,0.6)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px" }}>{L.yourDesc}</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.5 }}>{description}</p>
            </div>

            {/* Redirect notice — when Claude proposes an alternative */}
            {redirect && (
              <div style={{
                background: "rgba(255,200,0,0.07)",
                border: "1px solid rgba(255,200,0,0.3)",
                borderLeft: "3px solid #ffc800",
                borderRadius: 4,
                padding: "10px 14px",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>💡</span>
                <p style={{ fontSize: 13, color: "rgba(255,220,100,0.9)", margin: 0, lineHeight: 1.5 }}>
                  {redirect}
                </p>
              </div>
            )}
            {questions.map((q, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, color: "#fff", lineHeight: 1.4 }}>
                  <span style={{ color: "#FF8C00", fontWeight: 700, marginRight: 6 }}>{i + 1}.</span>{q}
                </label>
                <input
                  type="text"
                  value={answers[i]}
                  onChange={(e) => handleAnswerChange(i, e.target.value)}
                  placeholder={L.answerPlaceholder}
                  style={{
                    background: "rgba(11,12,31,0.6)", border: "1px solid rgba(255,140,0,0.25)",
                    borderRadius: 4, color: "#fff", fontSize: 13, padding: "9px 12px",
                    outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={handleBack} style={secondaryBtnStyle}>{L.backBtn}</button>
              <button onClick={handleGenerate} disabled={!allAnswered} style={allAnswered ? primaryBtnStyle : disabledBtnStyle}>
                {L.generateBtn}
              </button>
            </div>
          </div>
        )}

        {/* generated */}
        {stage === "generated" && modConfig && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Name + description */}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "#FF8C00", margin: "0 0 6px", textTransform: "uppercase" }}>
                {modConfig.name}
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.5 }}>
                {modConfig.description}
              </p>
            </div>

            {/* Monster variants */}
            {modConfig.monsterVariants.length > 0 && (
              <Section title={language === "pl" ? "Nowi wrogowie" : "New enemies"}>
                {modConfig.monsterVariants.map((v) => (
                  <Row key={v.id}>
                    <ColorDot tint={v.tint} />
                    <span style={{ color: "#fff", fontSize: 13 }}>{v.name}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                      HP {v.hp} · dmg {v.damage}{v.particleEffect ? ` · ${v.particleEffect}` : ""}
                    </span>
                  </Row>
                ))}
              </Section>
            )}

            {/* Food variants */}
            {modConfig.foodVariants.length > 0 && (
              <Section title={language === "pl" ? "Zmienione jedzenie" : "Modified food"}>
                {modConfig.foodVariants.map((f) => (
                  <Row key={f.id}>
                    <span style={{ color: "#fff", fontSize: 13 }}>{f.id}</span>
                    {f.hungerRestore !== undefined && <Chip>{language === "pl" ? "głód" : "hunger"} {f.hungerRestore > 0 ? "+" : ""}{f.hungerRestore}</Chip>}
                    {f.hpRestore !== undefined && <Chip>HP {f.hpRestore > 0 ? "+" : ""}{f.hpRestore}</Chip>}
                  </Row>
                ))}
              </Section>
            )}

            {/* Rules */}
            {modConfig.rules.length > 0 && (
              <Section title={language === "pl" ? "Nowe zasady" : "New rules"}>
                {modConfig.rules.map((r) => (
                  <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <Chip>{formatTrigger(r.trigger, r.intervalMs, language)}</Chip>
                    <div style={{ paddingLeft: 8, display: "flex", flexDirection: "column", gap: 2 }}>
                      {r.effects.map((e, i) => (
                        <span key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>
                          → {formatEffect(e, language)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {/* Test room — invite link */}
            {testRoomId && (
              <div style={{
                background: "rgba(0,227,100,0.07)", border: "1px solid rgba(0,227,100,0.25)",
                borderLeft: "3px solid #00e364", borderRadius: 4, padding: "12px 14px",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <p style={{ fontSize: 11, color: "rgba(0,227,100,0.8)", margin: 0, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
                  {language === "pl" ? "Pokój testowy gotowy" : "Test room ready"}
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "monospace", wordBreak: "break-all", flex: 1 }}>
                    {typeof window !== "undefined" ? `${window.location.origin}/game?mode=test&roomId=${testRoomId}` : ""}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/game?mode=test&roomId=${testRoomId}`)}
                    style={{ ...secondaryBtnStyle, padding: "6px 10px", fontSize: 11, flexShrink: 0 }}
                  >
                    {language === "pl" ? "Kopiuj" : "Copy"}
                  </button>
                </div>
                <a
                  href={`/game?mode=test&roomId=${testRoomId}`}
                  style={{ ...primaryBtnStyle, textDecoration: "none", textAlign: "center", color: "#00e364", borderColor: "rgba(0,227,100,0.5)", background: "rgba(0,227,100,0.1)" }}
                >
                  {language === "pl" ? "Wejdź do testu →" : "Enter test →"}
                </a>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
              <button onClick={handleBack} style={secondaryBtnStyle}>{L.startOver}</button>
              {savedModId && (
                <a href="/forge/moje-mody" style={{ ...primaryBtnStyle, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {language === "pl" ? "Moje Mody →" : "My Mods →"}
                </a>
              )}
              {!testRoomId && (
                <button
                  onClick={handleCreateTestRoom}
                  disabled={creatingTestRoom}
                  style={creatingTestRoom ? disabledBtnStyle : { ...primaryBtnStyle, borderColor: "rgba(0,227,100,0.5)", color: "#00e364", background: "rgba(0,227,100,0.1)" }}
                >
                  {creatingTestRoom
                    ? (language === "pl" ? "Tworzę pokój..." : "Creating room...")
                    : (language === "pl" ? "Testuj mod" : "Test mod")}
                </button>
              )}
              <button
                style={disabledBtnStyle}
                title={language === "pl" ? "Dostępne w W45" : "Coming in W45"}
              >
                {L.submitVoteBtn}
              </button>
            </div>
          </div>
        )}

        {/* error */}
        {stage === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
            <p style={{ fontSize: 13, color: "#ff6b6b", margin: 0 }}>{L.errorTitle}: {errorMsg}</p>
            <button onClick={handleBack} style={primaryBtnStyle}>{L.retryBtn}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ width: 32, height: 32, border: "3px solid rgba(255,140,0,0.15)", borderTop: "3px solid #FF8C00", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,140,0,0.6)", margin: "0 0 8px" }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{children}</div>;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(255,140,0,0.12)", border: "1px solid rgba(255,140,0,0.25)", borderRadius: 2, color: "#FF8C00", fontWeight: 600 }}>
      {children}
    </span>
  );
}

function formatTrigger(trigger: string, intervalMs?: number, language: "pl" | "en" = "pl"): string {
  const pl = language === "pl";
  if (trigger === "on_tick") return pl ? "Co sekundę" : "Every second";
  if (trigger === "every_Ns" && intervalMs) {
    const sec = intervalMs / 1000;
    const min = sec / 60;
    if (min >= 1) return pl ? `Co ${Math.round(min)} min` : `Every ${Math.round(min)} min`;
    return pl ? `Co ${Math.round(sec)}s` : `Every ${Math.round(sec)}s`;
  }
  if (trigger === "on_eat") return pl ? "Gdy gracz je" : "When player eats";
  if (trigger === "on_cook") return pl ? "Gdy gotowanie się kończy" : "When cooking ends";
  if (trigger === "on_hunger_low") return pl ? "Gdy gracz jest głodny" : "When player is hungry";
  if (trigger === "on_enemy_death") return pl ? "Gdy wróg ginie" : "When enemy dies";
  if (trigger === "on_player_join") return pl ? "Gdy gracz dołącza" : "When player joins";
  return trigger;
}

function formatEffect(e: { action: string; field?: string; value?: string | number; pool?: string[]; qty?: number; target?: string }, language: "pl" | "en" = "pl"): string {
  const pl = language === "pl";
  const who = e.target === "all_players" ? (pl ? "wszyscy gracze" : "all players") : (pl ? "gracz" : "player");
  if (e.action === "broadcast_message") return `💬 "${e.value}"`;
  if (e.action === "spawn_enemy") return pl ? `Pojawia się wróg: ${e.value}${e.qty && e.qty > 1 ? ` ×${e.qty}` : ""}` : `Spawn enemy: ${e.value}${e.qty && e.qty > 1 ? ` ×${e.qty}` : ""}`;
  if (e.action === "set_weather") return pl ? `Pogoda zmienia się na: ${e.value}` : `Weather changes to: ${e.value}`;
  if (e.action === "modify_stat") {
    const sign = Number(e.value) > 0 ? "+" : "";
    const stat = e.field === "hp" ? "HP" : e.field === "hunger" ? (pl ? "głód" : "hunger") : e.field === "sanity" ? (pl ? "zdrowie psych." : "sanity") : e.field;
    return pl ? `${who}: ${stat} ${sign}${e.value}` : `${who}: ${stat} ${sign}${e.value}`;
  }
  if (e.action === "add_item") {
    const item = e.pool ? e.pool.join("/") : (e.field ?? "?");
    return pl ? `${who} dostaje: ${item}${e.qty && e.qty > 1 ? ` ×${e.qty}` : ""}` : `${who} gets: ${item}${e.qty && e.qty > 1 ? ` ×${e.qty}` : ""}`;
  }
  return e.action;
}

function ColorDot({ tint }: { tint: number }) {
  const hex = "#" + tint.toString(16).padStart(6, "0");
  return <span style={{ width: 12, height: 12, borderRadius: "50%", background: hex, display: "inline-block", flexShrink: 0, border: "1px solid rgba(255,255,255,0.2)" }} />;
}

const primaryBtnStyle: React.CSSProperties = {
  flex: 1, padding: "10px 16px", fontSize: 12, fontWeight: 700,
  letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
  border: "1px solid #FF8C00", background: "rgba(255,140,0,0.15)",
  color: "#FF8C00", borderRadius: 4, transition: "all 0.15s",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "10px 16px", fontSize: 12, fontWeight: 700,
  letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.15)", background: "transparent",
  color: "rgba(255,255,255,0.4)", borderRadius: 4,
};

const disabledBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  cursor: "default",
  borderColor: "rgba(255,140,0,0.2)",
  background: "rgba(255,140,0,0.05)",
  color: "rgba(255,140,0,0.35)",
};
