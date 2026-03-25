"use client";

import { useState, useRef, useEffect } from "react";

type Language = "pl" | "en";

// Web Speech API types (not in standard TS DOM lib)
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
}
interface ISpeechRecognitionEvent {
  results: { length: number; [i: number]: { [j: number]: { transcript: string } } };
}
interface SpeechRecognitionWindow {
  webkitSpeechRecognition?: new () => ISpeechRecognition;
  SpeechRecognition?: new () => ISpeechRecognition;
}

interface ModInputProps {
  onSubmit: (description: string, language: Language) => void;
  disabled?: boolean;
}

export default function ModInput({ onSubmit, disabled = false }: ModInputProps) {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<Language>("pl");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const MAX_CHARS = 500;

  useEffect(() => {
    const supported =
      "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
    setVoiceSupported(supported);
  }, []);

  function startListening() {
    const win = window as SpeechRecognitionWindow;
    const SpeechRecognitionCtor = win.webkitSpeechRecognition ?? win.SpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = language === "pl" ? "pl-PL" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += (event.results[i][0] as { transcript: string }).transcript;
      }
      setText(transcript.slice(0, MAX_CHARS));
    };

    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  function handleVoiceClick() {
    if (isListening) stopListening();
    else startListening();
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed, language);
  }

  const charsLeft = MAX_CHARS - text.length;
  const overLimit = charsLeft < 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Language selector */}
      <div style={{ display: "flex", gap: 8 }}>
        {(["pl", "en"] as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            style={{
              padding: "4px 16px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              border: "1px solid",
              borderColor: language === lang ? "#FF8C00" : "rgba(255,255,255,0.15)",
              background: language === lang ? "rgba(255,140,0,0.15)" : "transparent",
              color: language === lang ? "#FF8C00" : "rgba(255,255,255,0.4)",
              borderRadius: 2,
              transition: "all 0.15s",
            }}
          >
            {lang === "pl" ? "Polski" : "English"}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <div style={{ position: "relative" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          placeholder={
            language === "pl"
              ? "Opisz swoją modyfikację... np. \"Chcę żeby w nocy pojawiały się ogniste orki\""
              : "Describe your modification... e.g. \"I want fire orcs to appear at night\""
          }
          rows={5}
          disabled={disabled}
          style={{
            width: "100%",
            resize: "none",
            background: "rgba(11,12,31,0.6)",
            border: `1px solid ${overLimit ? "#ff4444" : "rgba(255,140,0,0.3)"}`,
            borderRadius: 4,
            color: "#fff",
            fontSize: 14,
            padding: "12px 14px",
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
            lineHeight: 1.5,
          }}
        />
        <span style={{
          position: "absolute",
          bottom: 8,
          right: 10,
          fontSize: 11,
          color: overLimit ? "#ff4444" : "rgba(255,255,255,0.3)",
        }}>
          {charsLeft}
        </span>
      </div>

      {/* Buttons row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {/* Voice button */}
        {voiceSupported ? (
          <button
            onClick={handleVoiceClick}
            disabled={disabled}
            title={isListening ? (language === "pl" ? "Zatrzymaj nagrywanie" : "Stop recording") : (language === "pl" ? "Nagraj głos" : "Record voice")}
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              border: `1px solid ${isListening ? "#ff4444" : "rgba(255,140,0,0.4)"}`,
              background: isListening ? "rgba(255,68,68,0.15)" : "rgba(255,140,0,0.08)",
              borderRadius: 4,
              cursor: disabled ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            <MicIcon active={isListening} />
          </button>
        ) : (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
            {language === "pl" ? "(Głos niedostępny w tej przeglądarce)" : "(Voice not available in this browser)"}
          </span>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim() || overLimit}
          style={{
            flex: 1,
            padding: "10px 16px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: disabled || !text.trim() || overLimit ? "default" : "pointer",
            border: "1px solid",
            borderColor: disabled || !text.trim() || overLimit ? "rgba(255,140,0,0.2)" : "#FF8C00",
            background: disabled || !text.trim() || overLimit ? "rgba(255,140,0,0.05)" : "rgba(255,140,0,0.15)",
            color: disabled || !text.trim() || overLimit ? "rgba(255,140,0,0.35)" : "#FF8C00",
            borderRadius: 4,
            transition: "all 0.15s",
          }}
        >
          {language === "pl" ? "Zapytaj Claude o mod" : "Ask Claude to create mod"}
        </button>
      </div>
    </div>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#ff4444" : "#FF8C00"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
