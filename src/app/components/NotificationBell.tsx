"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

interface Notification {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

const S = {
  display: "var(--font-display), 'Space Grotesk', sans-serif",
  body: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
};

function formatNotification(n: Notification): { label: string; action?: string } {
  if (n.type === "test_invite") {
    const inviter = n.payload.inviterName as string ?? "Ktoś";
    const modName = n.payload.modName as string ?? "moda";
    const roomId = n.payload.roomId as string;
    return {
      label: `${inviter} zaprasza do testu: ${modName}`,
      action: roomId ? `/game?mode=test&roomId=${roomId}` : undefined,
    };
  }
  if (n.type === "mod_voted") {
    const modName = n.payload.modName as string ?? "Twój mod";
    const votes = n.payload.currentVotes as number ?? 1;
    return { label: `${modName} dostał ${votes} głos${votes === 1 ? "" : votes < 5 ? "y" : "ów"}` };
  }
  return { label: n.type };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "teraz";
  if (min < 60) return `${min} min temu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h temu`;
  return `${Math.floor(h / 24)}d temu`;
}

export default function NotificationBell() {
  const { isSignedIn } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  async function fetchNotifications() {
    try {
      const data = await fetch("/api/notifications").then((r) => r.json());
      if (Array.isArray(data)) setNotifications(data);
    } catch {}
  }

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  }

  useEffect(() => {
    if (!isSignedIn) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [isSignedIn]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!isSignedIn) return null;

  return (
    <div ref={dropRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "relative", background: "transparent",
          border: "1px solid rgba(169,169,194,0.2)", padding: "5px 10px",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          color: unread > 0 ? "#00e3fd" : "rgba(169,169,194,0.5)",
        }}
        title="Powiadomienia"
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>🔔</span>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            background: "#ff4444", color: "#fff",
            fontSize: 9, fontWeight: 900, lineHeight: 1,
            minWidth: 14, height: 14, borderRadius: 7,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          width: 300, maxHeight: 360, overflowY: "auto",
          background: "#0d0e22", border: "1px solid rgba(169,169,194,0.2)",
          borderTop: "2px solid #00e3fd", zIndex: 999,
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(169,169,194,0.1)" }}>
            <span style={{ fontFamily: S.display, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(169,169,194,0.5)" }}>
              Powiadomienia
            </span>
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: "20px 12px", textAlign: "center", color: "rgba(169,169,194,0.3)", fontSize: 12 }}>
              Brak powiadomień
            </div>
          ) : (
            notifications.map((n) => {
              const { label, action } = formatNotification(n);
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    markRead(n.id);
                    if (action) window.location.href = action;
                    else setOpen(false);
                  }}
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(169,169,194,0.07)",
                    cursor: action ? "pointer" : "default",
                    background: n.read ? "transparent" : "rgba(0,227,253,0.05)",
                    display: "flex", flexDirection: "column", gap: 3,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (action) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = n.read ? "transparent" : "rgba(0,227,253,0.05)"; }}
                >
                  {!n.read && (
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e3fd", alignSelf: "flex-start", flexShrink: 0, display: "inline-block", marginBottom: 2 }} />
                  )}
                  <span style={{ fontSize: 12, color: "#e4e3fe", lineHeight: 1.4 }}>{label}</span>
                  <span style={{ fontSize: 10, color: "rgba(169,169,194,0.4)", fontFamily: S.body }}>{timeAgo(n.created_at)}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
