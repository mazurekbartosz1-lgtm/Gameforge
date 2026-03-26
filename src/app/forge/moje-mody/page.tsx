"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ModConfig } from "@/shared/modConfig";
import NotificationBell from "../../components/NotificationBell";
import ForgeNav from "../../components/ForgeNav";
import { useLastGameUrl } from "../../hooks/useLastGameUrl";

interface SavedMod {
  id: string;
  config: ModConfig;
  status: "pending" | "submitted" | "approved" | "rejected" | "deleted";
  votes: number;
  created_at: string;
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending:  { text: "Oczekuje",    color: "#FF8C00" },
  approved: { text: "Zatwierdzony", color: "#4ade80" },
  rejected: { text: "Odrzucony",   color: "#f87171" },
};

export default function MojeModPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const lastGameUrl = useLastGameUrl();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const groupId = searchParams?.get("groupId") ?? null;

  const [mods, setMods] = useState<SavedMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testRoomIds, setTestRoomIds] = useState<Record<string, string>>({});
  const [creatingTestRoomFor, setCreatingTestRoomFor] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  // Player picker
  const [groupPlayers, setGroupPlayers] = useState<{ id: string; nickname: string; clerkId: string }[]>([]);
  const [invitePickerFor, setInvitePickerFor] = useState<string | null>(null); // modId showing picker
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]); // clerkIds
  const [sendingInvites, setSendingInvites] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/forge/mods")
      .then((r) => r.json())
      .then((data) => {
        const mods = data.mods ?? [];
        setMods(mods);
        setSubmittedIds(new Set(mods.filter((m: SavedMod) => m.status === "submitted").map((m: SavedMod) => m.id)));
      })
      .finally(() => setLoading(false));
    // Load group players if groupId present
    if (groupId) {
      fetch(`/api/groups/${groupId}/players`)
        .then((r) => r.json())
        .then((data) => setGroupPlayers(data.players ?? []));
    }
  }, [isLoaded, isSignedIn]);

  async function handleSubmit(modId: string) {
    if (!groupId) { alert("Otwórz tę stronę z poziomu gry (link MOJE MODY w nagłówku gry)"); return; }
    setSubmittingId(modId);
    try {
      const res = await fetch("/api/forge/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modId, groupId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Błąd"); }
      setSubmittedIds((prev) => new Set([...prev, modId]));
      setMods((prev) => prev.map((m) => m.id === modId ? { ...m, status: "submitted" } : m));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd wysyłania");
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleSendInvites(roomId: string) {
    if (selectedInvitees.length === 0) return;
    const modId = invitePickerFor!;
    const modName = mods.find((m) => m.id === modId)?.config.name ?? "Mod";
    setSendingInvites(true);
    try {
      await Promise.all(
        selectedInvitees.map((clerkId) =>
          fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipientClerkId: clerkId,
              type: "test_invite",
              payload: { roomId, modName, inviterName: "Ty" },
            }),
          })
        )
      );
      setInvitePickerFor(null);
      setSelectedInvitees([]);
    } finally {
      setSendingInvites(false);
    }
  }

  function toggleInvitee(clerkId: string) {
    setSelectedInvitees((prev) =>
      prev.includes(clerkId)
        ? prev.filter((id) => id !== clerkId)
        : prev.length < 2 ? [...prev, clerkId] : prev
    );
  }

  async function handleCreateTestRoom(modId: string, modConfig: ModConfig) {
    setCreatingTestRoomFor(modId);
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
      setTestRoomIds((prev) => ({ ...prev, [modId]: raw.roomId as string }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd tworzenia pokoju testowego");
    } finally {
      setCreatingTestRoomFor(null);
    }
  }

  function handleCopyLink(modId: string, roomId: string) {
    const url = `${window.location.origin}/game?mode=test&roomId=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(modId);
    setTimeout(() => setCopiedId((prev) => prev === modId ? null : prev), 2000);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch("/api/forge/mods", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMods((prev) => prev.filter((m) => m.id !== id));
    setDeletingId(null);
  }

  if (!isLoaded || !isSignedIn) {
    return <LoadingScreen />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0c1f", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px" }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 640, marginBottom: 32 }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
          <a href={lastGameUrl} style={linkStyle}>← Gameforge</a>
          <a href="/forge" style={linkStyle}>+ Nowa modyfikacja</a>
          <div style={{ marginLeft: "auto" }}><NotificationBell /></div>
        </div>
        <h1 style={{ fontFamily: "var(--font-pixel), 'Press Start 2P', monospace", fontSize: 13, color: "#FF8C00", textTransform: "uppercase", margin: "0 0 8px", lineHeight: 1.7, letterSpacing: "0.03em" }}>
          My Modifications
        </h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>
          Przeglądaj swoje mody i wysyłaj je do głosowania grupie.
        </p>
        <ForgeNav groupId={groupId} active="moje" />
      </div>

      {/* List */}
      <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 12 }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, letterSpacing: "0.1em" }}>ŁADOWANIE...</span>
          </div>
        )}

        {!loading && mods.length === 0 && (
          <div style={{
            background: "rgba(28,29,54,0.6)", border: "1px solid rgba(255,140,0,0.1)",
            borderRadius: 4, padding: 32, textAlign: "center",
          }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: "0 0 16px" }}>
              Nie masz jeszcze żadnych modyfikacji.
            </p>
            <a href="/forge" style={{ ...primaryBtnStyle, textDecoration: "none", display: "inline-block" }}>
              Stwórz pierwszy mod
            </a>
          </div>
        )}

        {mods.map((mod) => {
          const status = STATUS_LABEL[mod.status] ?? STATUS_LABEL.pending;
          const date = new Date(mod.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });

          return (
            <div key={mod.id} style={{
              background: "rgba(28,29,54,0.8)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,140,0,0.15)", borderLeft: "3px solid #FF8C00",
              borderRadius: 4, padding: "16px 20px",
            }}>
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 900, color: "#fff", margin: "0 0 2px", textTransform: "uppercase" }}>
                    {mod.config.name}
                  </h3>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.4 }}>
                    {mod.config.description}
                  </p>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                  color: status.color, border: `1px solid ${status.color}40`,
                  padding: "3px 8px", borderRadius: 2, flexShrink: 0,
                }}>
                  {status.text}
                </span>
              </div>

              {/* Tags */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {mod.config.monsterVariants.map((v) => (
                  <Tag key={v.id}>
                    <ColorDot tint={v.tint} /> {v.name} HP {v.hp} · dmg {v.damage}{v.particleEffect ? ` · ${v.particleEffect}` : ""}
                  </Tag>
                ))}
                {mod.config.foodVariants.map((f) => (
                  <Tag key={f.id}>{f.id}{f.hungerRestore !== undefined ? ` głód ${f.hungerRestore > 0 ? "+" : ""}${f.hungerRestore}` : ""}{f.hpRestore !== undefined ? ` HP ${f.hpRestore > 0 ? "+" : ""}${f.hpRestore}` : ""}</Tag>
                ))}
                {mod.config.rules.map((r) => (
                  <Tag key={r.id}>{formatTrigger(r.trigger, r.intervalMs)}: {r.effects.map((e) => formatEffect(e)).join(", ")}</Tag>
                ))}
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", alignSelf: "center", marginLeft: "auto" }}>
                  {date}
                </span>
              </div>

              {/* Test room invite link + player picker */}
              {testRoomIds[mod.id] && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
                  <div style={{
                    background: "rgba(0,227,100,0.06)", border: "1px solid rgba(0,227,100,0.2)",
                    borderRadius: 3, padding: "8px 10px",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ fontSize: 11, color: "rgba(0,227,100,0.7)", flex: 1, fontFamily: "monospace", wordBreak: "break-all" }}>
                      {`${typeof window !== "undefined" ? window.location.origin : ""}/game?mode=test&roomId=${testRoomIds[mod.id]}`}
                    </span>
                    <button onClick={() => handleCopyLink(mod.id, testRoomIds[mod.id])} style={{ ...smallBtnStyle, color: copiedId === mod.id ? "#4ade80" : "rgba(0,227,100,0.7)", borderColor: "rgba(0,227,100,0.3)", flexShrink: 0 }}>
                      {copiedId === mod.id ? "✓ Skopiowano" : "Kopiuj"}
                    </button>
                    <a href={`/game?mode=test&roomId=${testRoomIds[mod.id]}`} style={{ ...smallBtnStyle, textDecoration: "none", color: "rgba(0,227,100,0.7)", borderColor: "rgba(0,227,100,0.3)", flexShrink: 0 }}>
                      Wejdź →
                    </a>
                  </div>

                  {/* Player picker — only when groupId known */}
                  {groupPlayers.length > 0 && (
                    <>
                      {invitePickerFor !== mod.id ? (
                        <button onClick={() => { setInvitePickerFor(mod.id); setSelectedInvitees([]); }} style={{ ...smallBtnStyle, alignSelf: "flex-start" }}>
                          + Zaproś graczy z grupy
                        </button>
                      ) : (
                        <div style={{ background: "rgba(0,227,253,0.05)", border: "1px solid rgba(0,227,253,0.15)", borderRadius: 3, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                          <p style={{ margin: 0, fontSize: 11, color: "rgba(0,227,253,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            Wybierz max 2 graczy do zaproszenia
                          </p>
                          {groupPlayers.map((p) => (
                            <label key={p.clerkId} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={selectedInvitees.includes(p.clerkId)}
                                onChange={() => toggleInvitee(p.clerkId)}
                                disabled={!selectedInvitees.includes(p.clerkId) && selectedInvitees.length >= 2}
                              />
                              <span style={{ fontSize: 13, color: "#e4e3fe" }}>{p.nickname}</span>
                            </label>
                          ))}
                          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                            <button
                              onClick={() => handleSendInvites(testRoomIds[mod.id])}
                              disabled={selectedInvitees.length === 0 || sendingInvites}
                              style={selectedInvitees.length > 0 && !sendingInvites ? { ...smallBtnStyle, color: "#00e3fd", borderColor: "rgba(0,227,253,0.4)" } : smallBtnStyle}
                            >
                              {sendingInvites ? "Wysyłam..." : `Wyślij zaproszenia (${selectedInvitees.length})`}
                            </button>
                            <button onClick={() => setInvitePickerFor(null)} style={smallBtnStyle}>Anuluj</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                {mod.status === "approved" ? (
                  <a href={`/forge/vote/${mod.id}${groupId ? `?groupId=${groupId}` : ""}`} style={{ ...disabledSmallBtnStyle, flex: 1, textDecoration: "none", textAlign: "center", color: "#4ade80", borderColor: "rgba(74,222,128,0.3)", cursor: "pointer" }}>
                    Aktywny — Zobacz →
                  </a>
                ) : (
                  <>
                    {submittedIds.has(mod.id) ? (
                      <a href={`/forge/vote/${mod.id}${groupId ? `?groupId=${groupId}` : ""}`} style={{ ...disabledSmallBtnStyle, flex: 1, textDecoration: "none", textAlign: "center", color: "#00e3fd", borderColor: "rgba(0,227,253,0.3)", cursor: "pointer" }}>
                        Zobacz głosowanie →
                      </a>
                    ) : (
                      <button
                        onClick={() => handleSubmit(mod.id)}
                        disabled={submittingId === mod.id || !groupId}
                        title={!groupId ? "Otwórz z poziomu gry (link MOJE MODY w nagłówku)" : "Wyślij do głosowania grupie"}
                        style={groupId && submittingId !== mod.id ? { ...disabledSmallBtnStyle, flex: 1, cursor: "pointer", color: "#FF8C00", borderColor: "rgba(255,140,0,0.4)" } : { ...disabledSmallBtnStyle, flex: 1 }}
                      >
                        {submittingId === mod.id ? "..." : "Wyślij do głosowania"}
                      </button>
                    )}
                    {!testRoomIds[mod.id] ? (
                      <button
                        onClick={() => handleCreateTestRoom(mod.id, mod.config)}
                        disabled={creatingTestRoomFor === mod.id}
                        style={creatingTestRoomFor === mod.id ? disabledSmallBtnStyle : testSmallBtnStyle}
                      >
                        {creatingTestRoomFor === mod.id ? "..." : "Testuj"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCreateTestRoom(mod.id, mod.config)}
                        disabled={creatingTestRoomFor === mod.id}
                        style={{ ...testSmallBtnStyle, opacity: 0.5 }}
                        title="Utwórz nowy pokój testowy"
                      >
                        Nowy test
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(mod.id)}
                      disabled={deletingId === mod.id}
                      style={deleteSmallBtnStyle}
                    >
                      {deletingId === mod.id ? "..." : "Usuń"}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTrigger(trigger: string, intervalMs?: number): string {
  if (trigger === "on_tick") return "Co sekundę";
  if (trigger === "every_Ns" && intervalMs) {
    const min = intervalMs / 60000;
    return min >= 1 ? `Co ${Math.round(min)} min` : `Co ${Math.round(intervalMs / 1000)}s`;
  }
  if (trigger === "on_eat") return "Gdy gracz je";
  if (trigger === "on_cook") return "Gdy gotowanie kończy";
  if (trigger === "on_hunger_low") return "Gdy głodny";
  if (trigger === "on_enemy_death") return "Gdy wróg ginie";
  if (trigger === "on_player_join") return "Gdy dołącza gracz";
  return trigger;
}

function formatEffect(e: { action: string; field?: string; value?: string | number; pool?: string[]; qty?: number; target?: string }): string {
  const who = e.target === "all_players" ? "wszyscy" : "gracz";
  if (e.action === "broadcast_message") return `💬 "${e.value}"`;
  if (e.action === "spawn_enemy") return `pojawia się ${e.value}${e.qty && e.qty > 1 ? ` ×${e.qty}` : ""}`;
  if (e.action === "set_weather") return `pogoda: ${e.value}`;
  if (e.action === "modify_stat") return `${who} ${e.field} ${Number(e.value) > 0 ? "+" : ""}${e.value}`;
  if (e.action === "add_item") return `${who} dostaje ${e.pool ? e.pool.join("/") : e.field}${e.qty && e.qty > 1 ? ` ×${e.qty}` : ""}`;
  return e.action;
}

function ColorDot({ tint }: { tint: number }) {
  const hex = "#" + tint.toString(16).padStart(6, "0");
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: hex, display: "inline-block", verticalAlign: "middle", marginRight: 2 }} />;
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", background: "rgba(255,140,0,0.08)",
      border: "1px solid rgba(255,140,0,0.2)", borderRadius: 2, color: "rgba(255,140,0,0.7)",
    }}>
      {children}
    </span>
  );
}

function LoadingScreen() {
  return (
    <div style={{ height: "100vh", background: "#0b0c1f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, letterSpacing: "0.1em" }}>LOADING...</span>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
  color: "rgba(255,140,0,0.5)", textDecoration: "none", fontWeight: 700,
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "10px 20px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
  textTransform: "uppercase", cursor: "pointer", border: "1px solid #FF8C00",
  background: "rgba(255,140,0,0.15)", color: "#FF8C00", borderRadius: 4,
};

const disabledSmallBtnStyle: React.CSSProperties = {
  padding: "7px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
  textTransform: "uppercase", cursor: "default", border: "1px solid rgba(255,140,0,0.15)",
  background: "rgba(255,140,0,0.04)", color: "rgba(255,140,0,0.3)", borderRadius: 3,
};

const deleteSmallBtnStyle: React.CSSProperties = {
  padding: "7px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
  textTransform: "uppercase", cursor: "pointer", border: "1px solid rgba(248,113,113,0.2)",
  background: "transparent", color: "rgba(248,113,113,0.5)", borderRadius: 3,
};

const testSmallBtnStyle: React.CSSProperties = {
  padding: "7px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
  textTransform: "uppercase", cursor: "pointer", border: "1px solid rgba(0,227,100,0.3)",
  background: "rgba(0,227,100,0.08)", color: "rgba(0,227,100,0.8)", borderRadius: 3,
};

const smallBtnStyle: React.CSSProperties = {
  padding: "4px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
  textTransform: "uppercase", cursor: "pointer", border: "1px solid rgba(169,169,194,0.2)",
  background: "transparent", color: "rgba(169,169,194,0.5)", borderRadius: 2,
};
