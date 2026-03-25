"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const S = {
  display: "var(--font-display), 'Space Grotesk', sans-serif",
  body: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
};

export default function JoinPage({ params }: { params: { code: string } }) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace(`/sign-in?redirect_url=/join/${params.code}`);
      return;
    }

    fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: params.code }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
          setStatus("error");
        } else {
          router.replace(`/game?groupId=${data.id}&groupName=${encodeURIComponent(data.name)}`);
        }
      })
      .catch(() => {
        setErrorMsg("Błąd sieci — spróbuj ponownie.");
        setStatus("error");
      });
  }, [isLoaded, isSignedIn, params.code, router]);

  return (
    <div style={{
      height: "100vh",
      background: "#0b0c1f",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: "rgba(28, 29, 54, 0.9)",
        border: "2px solid #FF8C00",
        padding: 32,
        maxWidth: 360,
        width: "100%",
        textAlign: "center",
      }}>
        {status === "loading" ? (
          <>
            <p style={{ fontFamily: S.display, color: "#FF8C00", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 12px" }}>
              Dołączanie do grupy
            </p>
            <p style={{ fontFamily: S.body, color: "#a9a9c2", fontSize: 13, margin: 0 }}>
              Kod: <strong style={{ color: "#e4e3fe" }}>{params.code}</strong>
            </p>
          </>
        ) : (
          <>
            <p style={{ fontFamily: S.display, color: "#ff4444", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 12px" }}>
              Błąd
            </p>
            <p style={{ fontFamily: S.body, color: "#a9a9c2", fontSize: 13, margin: "0 0 20px" }}>
              {errorMsg}
            </p>
            <a
              href="/"
              style={{
                display: "inline-block",
                padding: "10px 24px",
                background: "linear-gradient(to right, #FF8C00, #CC7000)",
                color: "#2a1600",
                fontFamily: S.display,
                fontWeight: 900,
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Wróć do lobby
            </a>
          </>
        )}
      </div>
    </div>
  );
}
