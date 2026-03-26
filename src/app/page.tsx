import HomeAuth from "./HomeAuth";

const EMBER_DATA = [
  { left: "49.5%", bottom: "18%", duration: "4s", delay: "0s", color: "#FF8C00" },
  { left: "50.2%", bottom: "17%", duration: "5s", delay: "1.2s", color: "#FFB347" },
  { left: "50.8%", bottom: "19%", duration: "3.5s", delay: "0.6s", color: "#FF6E84" },
  { left: "49.8%", bottom: "18.5%", duration: "6s", delay: "2.1s", color: "#E67E00" },
  { left: "50.1%", bottom: "17.5%", duration: "4.5s", delay: "1.8s", color: "#FF8C00" },
  { left: "49.2%", bottom: "19.5%", duration: "3.8s", delay: "3.2s", color: "#FFB347" },
  { left: "50.5%", bottom: "17.2%", duration: "5.2s", delay: "0.4s", color: "#FF8C00" },
  { left: "50.3%", bottom: "18.2%", duration: "4.4s", delay: "2.7s", color: "#E67E00" },
  { left: "49.6%", bottom: "19.2%", duration: "4.8s", delay: "3.7s", color: "#f183ff" },
  { left: "50.7%", bottom: "18.7%", duration: "3.9s", delay: "4.3s", color: "#FF8C00" },
];

export default function Home() {
  return (
    <div style={{
      height: "100vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      background: "#0b0c1f",
    }}>
      {/* Full-bleed background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJ-q7fLSyDvFPL2i6wCHGh7xKapptKpIyJArqIPCFSUoxKMgrv78EoMaG_4L_pFyoGb-51q2Q6-SqEzcAPaYnCez7v5wdmujbFYAwuaYe1HRuKAy5trEBm7qTvsRDKtUf-me0Cl4d2o1hMJb3W8KYRnA_91ZdyGXVqIzgWWTJGQzBqq_f0agAYysrwxtUUhsLU--b5wnUOaBJ53VZIecBh43LJyykc2JUdJgfUm66sa0Xay7qgX9ZWtXt2SdzDKGyl8pw9H4Ax1iVm"
          alt="Forest campfire — GameForge"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(11,12,31,0.9) 0%, transparent 50%, rgba(11,12,31,0.3) 100%)",
        }} />
        {/* Embers */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {EMBER_DATA.map((e, i) => (
            <div
              key={i}
              className="ember"
              style={{
                left: e.left,
                bottom: e.bottom,
                animationDuration: e.duration,
                animationDelay: e.delay,
                background: e.color,
                boxShadow: `0 0 6px ${e.color}`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <header style={{
        position: "relative",
        zIndex: 20,
        width: "100%",
        paddingTop: 48,
        textAlign: "center",
        flexShrink: 0,
      }}>
        <h1 style={{
          fontFamily: "var(--font-pixel), 'Press Start 2P', monospace",
          fontSize: "clamp(14px, 2vw, 22px)",
          color: "#FF8C00",
          textShadow: "0 0 20px rgba(255, 140, 0, 0.5), 4px 4px 0 rgba(255,140,0,0.15)",
          textTransform: "uppercase",
          margin: 0,
          lineHeight: 1.6,
          letterSpacing: "0.03em",
        }}>
          Gameforge
        </h1>
        <p style={{
          fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
          color: "#00e3fd",
          letterSpacing: "0.2em",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          marginTop: 4,
          marginBottom: 0,
        }}>
          THE JOURNEY CONTINUES
        </p>
      </header>

      {/* Main area — auth panel anchored to right */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "24px 64px",
        position: "relative",
        zIndex: 10,
        pointerEvents: "none",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 320,
          background: "rgba(28, 29, 54, 0.6)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: 24,
          borderTop: "2px solid #FF8C00",
          borderRight: "2px solid #FF8C00",
          borderBottom: "1px solid rgba(255, 140, 0, 0.2)",
          borderLeft: "1px solid rgba(255, 140, 0, 0.2)",
          boxShadow: "0 0 40px rgba(255, 140, 0, 0.15)",
          overflow: "hidden",
          pointerEvents: "auto",
        }}>
          <HomeAuth />
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        background: "rgba(11, 12, 31, 0.2)",
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 48px",
        zIndex: 50,
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}>
        <span style={{
          fontFamily: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
          fontSize: 9,
          letterSpacing: "0.05em",
          color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase",
        }}>
          © 8-BIT REALMS MMXXIV. ALL RIGHTS RESERVED.
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          {["TERMS", "PRIVACY", "SUPPORT"].map(link => (
            <a key={link} href="#" style={{
              fontFamily: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
              fontSize: 9,
              letterSpacing: "0.05em",
              color: "rgba(255,255,255,0.3)",
              textDecoration: "none",
              textTransform: "uppercase",
            }}>
              {link}
            </a>
          ))}
        </div>
        <span style={{
          fontFamily: "var(--font-body), 'Plus Jakarta Sans', sans-serif",
          fontSize: 9,
          letterSpacing: "0.1em",
          color: "rgba(255, 140, 0, 0.4)",
          fontWeight: 700,
          textTransform: "uppercase",
        }}>
          ENGINE v1.0.4
        </span>
      </footer>
    </div>
  );
}
