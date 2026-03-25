"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ModInput from "../components/ModInput";

type Language = "pl" | "en";
type Stage = "input" | "loading" | "questions" | "error";

export default function ForgePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("input");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<Language>("pl");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
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
    setStage("loading");
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
      setAnswers(["", "", ""]);
      setStage("questions");
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
  }

  const allAnswered = answers.every((a) => a.trim().length > 0);

  const label = {
    generating: language === "pl" ? "Claude myśli..." : "Claude is thinking...",
    backBtn: language === "pl" ? "← Zmień opis" : "← Edit description",
    generateBtn: language === "pl" ? "Generuj modyfikację" : "Generate modification",
    answerPlaceholder: language === "pl" ? "Twoja odpowiedź..." : "Your answer...",
    errorTitle: language === "pl" ? "Błąd połączenia z Claude" : "Claude connection error",
    retryBtn: language === "pl" ? "Spróbuj ponownie" : "Try again",
  };

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

        {/* Stage: input */}
        {stage === "input" && (
          <ModInput onSubmit={handleSubmit} />
        )}

        {/* Stage: loading */}
        {stage === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 0" }}>
            <Spinner />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>
              {label.generating}
            </span>
          </div>
        )}

        {/* Stage: questions */}
        {stage === "questions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Description recap */}
            <div style={{ borderLeft: "2px solid rgba(255,140,0,0.4)", paddingLeft: 12 }}>
              <p style={{ fontSize: 11, color: "rgba(255,140,0,0.6)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px" }}>
                {language === "pl" ? "Twój opis" : "Your description"}
              </p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.5 }}>
                {description}
              </p>
            </div>

            {/* Questions */}
            {questions.map((q, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, color: "#fff", lineHeight: 1.4 }}>
                  <span style={{ color: "#FF8C00", fontWeight: 700, marginRight: 6 }}>{i + 1}.</span>
                  {q}
                </label>
                <input
                  type="text"
                  value={answers[i]}
                  onChange={(e) => handleAnswerChange(i, e.target.value)}
                  placeholder={label.answerPlaceholder}
                  style={{
                    background: "rgba(11,12,31,0.6)",
                    border: "1px solid rgba(255,140,0,0.25)",
                    borderRadius: 4,
                    color: "#fff",
                    fontSize: 13,
                    padding: "9px 12px",
                    outline: "none",
                    fontFamily: "inherit",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={handleBack} style={secondaryBtnStyle}>
                {label.backBtn}
              </button>
              <button
                disabled={!allAnswered}
                onClick={() => {
                  // W43 will handle generation
                  console.log("[Forge] Generate:", { description, language, questions, answers });
                }}
                style={allAnswered ? primaryBtnStyle : disabledBtnStyle}
              >
                {label.generateBtn}
              </button>
            </div>
          </div>
        )}

        {/* Stage: error */}
        {stage === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
            <p style={{ fontSize: 13, color: "#ff6b6b", margin: 0 }}>
              {label.errorTitle}: {errorMsg}
            </p>
            <button onClick={handleBack} style={primaryBtnStyle}>
              {label.retryBtn}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 32, height: 32,
      border: "3px solid rgba(255,140,0,0.15)",
      borderTop: "3px solid #FF8C00",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
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
  color: "rgba(255,255,255,0.4)", borderRadius: 4, transition: "all 0.15s",
};

const disabledBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  cursor: "default",
  borderColor: "rgba(255,140,0,0.2)",
  background: "rgba(255,140,0,0.05)",
  color: "rgba(255,140,0,0.35)",
};
