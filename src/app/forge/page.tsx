"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ModInput from "../components/ModInput";

export default function ForgePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [submitted, setSubmitted] = useState<{ description: string; language: string } | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div style={{ height: "100vh", background: "#0b0c1f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, letterSpacing: "0.1em" }}>LOADING...</span>
      </div>
    );
  }

  function handleSubmit(description: string, language: "pl" | "en") {
    // W42 will hook up the Claude API here
    console.log("[Forge] Submit:", { description, language });
    setSubmitted({ description, language });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b0c1f",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 24px",
    }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 600, marginBottom: 32 }}>
        <a
          href="/"
          style={{
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,140,0,0.5)",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Gameforge
        </a>
        <h1 style={{
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "-0.01em",
          color: "#FF8C00",
          textTransform: "uppercase",
          marginTop: 16,
          marginBottom: 4,
        }}>
          Create a Modification
        </h1>
        <p style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.05em",
          margin: 0,
        }}>
          Describe what you want to change — Claude will help you design it.
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: "100%",
        maxWidth: 600,
        background: "rgba(28,29,54,0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,140,0,0.2)",
        borderTop: "2px solid #FF8C00",
        borderRadius: 4,
        padding: 24,
      }}>
        <ModInput onSubmit={handleSubmit} />
      </div>

      {/* Debug preview — will be replaced in W42 */}
      {submitted && (
        <div style={{
          marginTop: 24,
          width: "100%",
          maxWidth: 600,
          background: "rgba(0,227,253,0.05)",
          border: "1px solid rgba(0,227,253,0.2)",
          borderRadius: 4,
          padding: 16,
        }}>
          <p style={{ fontSize: 11, color: "#00e3fd", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>
            Submitted — Claude API coming in W42
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: 0 }}>
            [{submitted.language.toUpperCase()}] {submitted.description}
          </p>
        </div>
      )}
    </div>
  );
}
