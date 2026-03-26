"use client";

interface ForgeNavProps {
  groupId?: string | null;
  active?: "moje" | "glosowanie";
}

export default function ForgeNav({ groupId, active }: ForgeNavProps) {
  const qs = groupId ? `?groupId=${groupId}` : "";

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
      <a
        href={`/forge/moje-mody${qs}`}
        style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
          textDecoration: "none", padding: "6px 14px", borderRadius: 3,
          border: active === "moje"
            ? "1px solid #FF8C00"
            : "1px solid rgba(255,140,0,0.3)",
          background: active === "moje"
            ? "rgba(255,140,0,0.15)"
            : "transparent",
          color: active === "moje"
            ? "#FF8C00"
            : "rgba(255,140,0,0.5)",
        }}
      >
        Moje Mody
      </a>
      <a
        href={`/forge/glosowanie${qs}`}
        style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
          textDecoration: "none", padding: "6px 14px", borderRadius: 3,
          border: active === "glosowanie"
            ? "1px solid #FF8C00"
            : "1px solid rgba(255,140,0,0.3)",
          background: active === "glosowanie"
            ? "rgba(255,140,0,0.15)"
            : "transparent",
          color: active === "glosowanie"
            ? "#FF8C00"
            : "rgba(255,140,0,0.5)",
        }}
      >
        Głosowanie
      </a>
    </div>
  );
}
