"use client";

import { useUser, useSession, useClerk, SignIn } from "@clerk/nextjs";
import { useEffect, useState } from "react";

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
