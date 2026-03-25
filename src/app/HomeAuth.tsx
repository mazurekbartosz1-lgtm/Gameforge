"use client";

import { useUser, useSession, useClerk, SignIn } from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";

const S = {
  display: "var(--font-display), 'Space Grotesk', sans-serif",
  body: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
};

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} godz. ${minutes} min.`;
  if (minutes > 0) return `${minutes} min.`;
  return "mniej niż minutę";
}

interface Group {
  id: string;
  name: string;
  code: string;
  role: string;
}

function GroupSection() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [newName, setNewName] = useState("");
  const [mode, setMode] = useState<"idle" | "join" | "create">("idle");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/groups").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setGroups(data);
    });
  }, []);

  useEffect(() => {
    if (mode !== "idle") setTimeout(() => inputRef.current?.focus(), 50);
  }, [mode]);

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode.trim() }),
    }).then((r) => r.json());
    setBusy(false);
    if (res.error) { setMsg(res.error); return; }
    window.location.href = `/game?groupId=${res.id}&groupName=${encodeURIComponent(res.name)}`;
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    }).then((r) => r.json());
    setBusy(false);
    if (res.error) { setMsg(res.error); return; }
    setGroups((prev) => [...prev, { ...res, role: "owner" }]);
    setMode("idle");
    setNewName("");
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,140,0,0.4)",
    color: "#e4e3fe",
    fontFamily: S.body,
    fontSize: 12,
    padding: "6px 8px",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  };

  const btnStyle = (accent: boolean): React.CSSProperties => ({
    background: accent ? "linear-gradient(to right, #FF8C00, #CC7000)" : "rgba(0,0,0,0.3)",
    border: accent ? "none" : "1px solid rgba(255,140,0,0.3)",
    color: accent ? "#2a1600" : "#FF8C00",
    fontFamily: S.display,
    fontWeight: 900,
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    padding: "7px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,140,0,0.15)" }} />

      {/* Group list */}
      {groups.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {groups.map((g) => (
            <div key={g.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,140,0,0.15)",
              padding: "6px 8px",
            }}>
              <div>
                <span style={{ fontFamily: S.display, color: "#e4e3fe", fontSize: 11, fontWeight: 700 }}>{g.name}</span>
                <span style={{ fontFamily: S.body, color: "rgba(169,169,194,0.5)", fontSize: 9, marginLeft: 6 }}>{g.code}</span>
              </div>
              <a href={`/game?groupId=${g.id}&groupName=${encodeURIComponent(g.name)}`} style={{
                ...btnStyle(true),
                fontSize: 9,
                padding: "4px 10px",
                textDecoration: "none",
                display: "inline-block",
              }}>PLAY</a>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {mode === "idle" && (
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ ...btnStyle(false), flex: 1 }} onClick={() => setMode("join")}>+ Dołącz</button>
          <button style={{ ...btnStyle(false), flex: 1 }} onClick={() => setMode("create")}>+ Nowa</button>
        </div>
      )}

      {/* Join form */}
      {mode === "join" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              ref={inputRef}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="KOD GRUPY"
              maxLength={8}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button style={btnStyle(true)} onClick={handleJoin} disabled={busy}>OK</button>
            <button style={btnStyle(false)} onClick={() => { setMode("idle"); setMsg(""); }}>✕</button>
          </div>
          {msg && <p style={{ fontFamily: S.body, color: "#ff6666", fontSize: 10, margin: 0 }}>{msg}</p>}
        </div>
      )}

      {/* Create form */}
      {mode === "create" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="NAZWA GRUPY"
              maxLength={32}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button style={btnStyle(true)} onClick={handleCreate} disabled={busy}>OK</button>
            <button style={btnStyle(false)} onClick={() => { setMode("idle"); setMsg(""); }}>✕</button>
          </div>
          {msg && <p style={{ fontFamily: S.body, color: "#ff6666", fontSize: 10, margin: 0 }}>{msg}</p>}
        </div>
      )}
    </div>
  );
}

function LoggedIn() {
  const { user } = useUser();
  const { session } = useSession();
  const { signOut } = useClerk();
  const [duration, setDuration] = useState("");
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!session?.createdAt) return;
    const update = () => setDuration(formatDuration(Date.now() - session.createdAt.getTime()));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [session?.createdAt]);

  const name = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.emailAddresses[0]?.emailAddress ?? "Gracz";
  const email = user?.emailAddresses[0]?.emailAddress;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Label */}
      <p style={{
        fontFamily: S.display,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: "rgba(255, 140, 0, 0.8)",
        margin: 0,
      }}>
        Welcome back
      </p>

      {/* Player card */}
      <div style={{
        background: "rgba(0,0,0,0.4)",
        borderTop: "1px solid rgba(255,140,0,0.3)",
        borderLeft: "1px solid rgba(255,140,0,0.1)",
        borderRight: "1px solid rgba(255,140,0,0.1)",
        borderBottom: "1px solid rgba(255,140,0,0.1)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.imageUrl}
              alt="avatar"
              style={{ width: 36, height: 36, border: "1px solid rgba(255,140,0,0.4)", display: "block" }}
            />
          )}
          <div>
            <p style={{ fontFamily: S.display, color: "#e4e3fe", fontWeight: 700, fontSize: 14, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {name}
            </p>
            {email && (
              <p style={{ fontFamily: S.body, color: "#a9a9c2", fontSize: 11, margin: "2px 0 0" }}>
                {email}
              </p>
            )}
          </div>
        </div>
        {duration && (
          <p style={{ fontFamily: S.body, color: "#a9a9c2", fontSize: 11, margin: 0 }}>
            Session active:{" "}
            <span style={{ color: "#FF8C00" }}>{duration}</span>
          </p>
        )}
      </div>

      {/* CTA */}
      <a
        href="/game"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "block",
          textAlign: "center",
          padding: "14px 24px",
          background: "linear-gradient(to right, #FF8C00, #CC7000)",
          color: "#2a1600",
          fontFamily: S.display,
          fontWeight: 900,
          fontSize: 12,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          border: "none",
          textDecoration: "none",
          cursor: "pointer",
          filter: hover ? "brightness(1.1)" : "brightness(1)",
          transition: "filter 0.1s",
        }}
      >
        ⚔ ENTER THE GAME
      </a>

      <GroupSection />

      {/* Quest tracker decoration */}
      <div style={{ paddingTop: 4 }}>
        <div style={{ height: 2, width: "100%", background: "rgba(34,35,62,0.5)", overflow: "hidden" }}>
          <div style={{ height: "100%", background: "linear-gradient(to right, #FF8C00, #00e3fd, #f183ff)", width: "66%" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "0 2px" }}>
          <span style={{ color: "#FF8C00", fontSize: 10 }}>★</span>
          <span style={{ color: "#FF8C00", fontSize: 10 }}>★</span>
          <span style={{ color: "rgba(70,70,91,0.5)", fontSize: 10 }}>□</span>
        </div>
      </div>

      <button
        onClick={() => signOut()}
        style={{
          background: "none",
          border: "none",
          color: "rgba(169,169,194,0.5)",
          fontFamily: S.body,
          fontSize: 9,
          cursor: "pointer",
          textAlign: "center",
          padding: 0,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

function LoggedOut() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <SignIn
        routing="hash"
        appearance={{
          layout: {
            socialButtonsVariant: "blockButton",
            socialButtonsPlacement: "top",
          },
          elements: {
            rootBox: { width: "100%" },
            card: {
              width: "100%",
              maxWidth: "100%",
              background: "transparent",
              boxShadow: "none",
              padding: 0,
              margin: 0,
            },
            cardBox: { width: "100%", boxShadow: "none" },
          },
        }}
      />

      {/* PLAY AS GUEST */}
      <div style={{ textAlign: "center", paddingTop: 8 }}>
        <a
          href="/game"
          style={{
            fontFamily: S.body,
            fontSize: 10,
            color: "rgba(0, 227, 253, 0.7)",
            textDecoration: "none",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            fontWeight: 700,
          }}
        >
          PLAY AS GUEST
        </a>
      </div>

      {/* Quest tracker decoration */}
      <div style={{ paddingTop: 12 }}>
        <div style={{ height: 2, width: "100%", background: "rgba(34,35,62,0.5)", overflow: "hidden" }}>
          <div style={{ height: "100%", background: "linear-gradient(to right, #FF8C00, #00e3fd, #f183ff)", width: "33%" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "0 2px" }}>
          <span style={{ color: "#FF8C00", fontSize: 10 }}>★</span>
          <span style={{ color: "rgba(70,70,91,0.5)", fontSize: 10 }}>□</span>
          <span style={{ color: "rgba(70,70,91,0.5)", fontSize: 10 }}>□</span>
        </div>
      </div>
    </div>
  );
}

export default function HomeAuth() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return (
    <div style={{
      height: 160,
      background: "rgba(0,0,0,0.3)",
      animation: "pulse 1.5s ease-in-out infinite",
    }} />
  );
  if (isSignedIn) return <LoggedIn />;
  return <LoggedOut />;
}
