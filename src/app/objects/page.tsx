"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetFile {
  url: string;
  name: string;
  pack: string;
  category: string;
  frameW: number;
  frameH: number;
  groupKey: string;
  groupName: string;
  animLabel: string;
  isAnim: boolean; // true only for named animation sheets (Idle-Sheet, Walk_Down, etc.)
}

interface AssetGroup {
  key: string;
  name: string;
  pack: string;
  category: string;
  sheets: AssetFile[];
}

// ─── Path analysis ────────────────────────────────────────────────────────────

// Folders that hold animation sheets but are NOT the character name (go one level up)
const SUB_FOLDER =
  /^(Animations|Idle|Run|Walk|Death|Hit|Attack|Carry|Collect|Idle_Base|Run_Base|Walk_Base|Death_Base|Hit_Base|Carry_Base|Collect_Base|Watering_Base|Fishing_Base|Attack_\d+_Base)$/;

function detectPack(url: string): string {
  if (url.includes("Castle"))       return "Castle";
  if (url.includes("Cemetery"))     return "Cemetery";
  if (url.includes("Desert"))       return "Desert";
  if (url.includes("Fairy Forest")) return "Fairy Forest";
  if (url.includes("Forge"))        return "Forge";
  if (url.includes("Free Pack"))    return "Free Pack";
  if (url.includes("Hideout"))      return "Hideout";
  if (url.includes("Sewer"))        return "Sewer";
  return "Game";
}

function detectCategory(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("/player/") || u.includes("/characters/")) return "characters";
  if (u.includes("/actions/"))                               return "actions";
  if (u.includes("/resources/"))                             return "resources";
  if (u.includes("/mobs/") || u.includes("/enemies/") || u.includes("/enemy/")) return "enemies";
  if (u.includes("/npcs/"))                                  return "npcs";
  if (u.includes("tileset") || u.includes("tiles.png") || u.includes("/test/") || u.includes("floor.png") || u.includes("ground.png")) return "tiles";
  if (u.includes("/props") || u.includes("/structures/") || u.includes("props.png")) return "props";
  if (u.includes("/weapons/") || u.includes("/food/") || u.includes("weapons.png")) return "items";
  return "other";
}

/** True only for sheets that contain sequential animation frames (not tileset grids). */
function isAnimSheet(url: string, name: string): boolean {
  const n = name.toLowerCase();
  // Pixel Crawler convention: animation sheets use a dash before "sheet" (e.g. Idle-Sheet.png)
  if (n.includes("-sheet")) return true;
  // Custom game assets — player animations and action overlays
  if (url.includes("/player/") || url.includes("/actions/")) return true;
  return false;
}

function detectFrameSize(url: string): { w: number; h: number } {
  if (url.includes("tree_sheet")) return { w: 112, h: 184 };
  if (url.includes("/player/") || url.includes("/actions/")) return { w: 64, h: 64 };
  const name = url.split("/").pop()?.toLowerCase() ?? "";
  // For generic animation sheets: return sentinel {0,0} → auto-detect from image height at render time
  if (name.includes("-sheet")) return { w: 0, h: 0 };
  return { w: 16, h: 16 };
}

function detectFps(name: string): number {
  const n = name.toLowerCase();
  if (/slice|crush|pierce|attack/.test(n)) return 12;
  if (/death/.test(n)) return 5;
  return 8;
}

function getGroupInfo(url: string): { groupKey: string; groupName: string } {
  const parts    = url.split("/");
  const filename = parts[parts.length - 1];
  const parent   = parts[parts.length - 2] ?? "";
  const grandp   = parts[parts.length - 3] ?? "";
  const pack     = detectPack(url);

  if (url.includes("/player/")) return { groupKey: "game:player", groupName: "Player" };

  if (url.includes("/actions/")) {
    const base = filename.replace(".png", "").replace(/[_-]?(down|side|up)$/i, "");
    return { groupKey: `game:action:${base}`, groupName: `Action › ${base}` };
  }
  if (url.includes("/resources/")) {
    const base = filename.replace(".png", "");
    if (base.includes("tree")) return { groupKey: "game:res:tree", groupName: "Trees" };
    if (base.includes("rock")) return { groupKey: "game:res:rock", groupName: "Rocks" };
    return { groupKey: `game:res:${base}`, groupName: base };
  }
  if (url.includes("/test/")) return { groupKey: "game:tiles", groupName: "Fairy Forest Tileset" };

  // Characters with sub-folders per animation type (Body_A, A_Hunter)
  if (SUB_FOLDER.test(parent)) {
    return { groupKey: `${pack}:${grandp}`, groupName: grandp };
  }
  // Regular entity folders
  return { groupKey: `${pack}:${parent}`, groupName: parent };
}

// Strip directional suffix to get animation base name (e.g. "Idle_Down-Sheet.png" → "Idle")
function getAnimBase(name: string): string {
  return name
    .replace(/\.png$/i, "")
    .replace(/-Sheet$/i, "")
    .replace(/[_-]*(Down|Side|Up|Top)$/i, "")
    .trim() || name.replace(/\.png$/i, "");
}

// Detect which direction a sheet covers
function getAnimDir(name: string): "down" | "side" | "up" | "none" {
  const n = name.toLowerCase().replace(/\.png$/, "").replace(/-sheet$/, "");
  if (/_down$|-down$/.test(n)) return "down";
  if (/_side$|-side$/.test(n)) return "side";
  if (/_up$|-up$|_top$|-top$/.test(n)) return "up";
  return "none";
}

function getAnimLabel(url: string): string {
  const parts    = url.split("/");
  const filename = parts[parts.length - 1].replace(".png", "").replace(/-Sheet$/i, "");
  const parent   = parts[parts.length - 2] ?? "";
  if (SUB_FOLDER.test(parent)) {
    const label = parent.replace(/_Base$/, "");
    // avoid "Idle › Idle" when folder name === file name
    return filename.toLowerCase() === label.toLowerCase() ? label : `${label} › ${filename}`;
  }
  return filename;
}

function processFiles(files: string[]): AssetFile[] {
  return files
    .filter(url => {
      const u = url.toLowerCase();
      return !u.includes("/social/") && !u.includes("mockup") && !u.includes("sprite-00") && !u.includes("png_data");
    })
    .map(url => {
      const name = url.split("/").pop() ?? "";
      const { w, h } = detectFrameSize(url);
      const { groupKey, groupName } = getGroupInfo(url);
      return {
        url, name,
        pack: detectPack(url),
        category: detectCategory(url),
        frameW: w, frameH: h,
        groupKey, groupName,
        animLabel: getAnimLabel(url),
        isAnim: isAnimSheet(url, name),
      };
    });
}

function buildGroups(assets: AssetFile[]): AssetGroup[] {
  const map = new Map<string, AssetGroup>();
  for (const a of assets) {
    if (!map.has(a.groupKey)) {
      map.set(a.groupKey, { key: a.groupKey, name: a.groupName, pack: a.pack, category: a.category, sheets: [] });
    }
    map.get(a.groupKey)!.sheets.push(a);
  }
  return Array.from(map.values());
}

// ─── Image dimension cache ────────────────────────────────────────────────────

const DIM_CACHE = new Map<string, { w: number; h: number }>();

function useImageDim(url: string): { w: number; h: number } | null {
  const [dim, setDim] = useState<{ w: number; h: number } | null>(DIM_CACHE.get(url) ?? null);
  useEffect(() => {
    if (DIM_CACHE.has(url)) return;
    const img = new Image();
    img.onload = () => {
      const d = { w: img.naturalWidth, h: img.naturalHeight };
      DIM_CACHE.set(url, d);
      setDim(d);
    };
    img.src = encodeURI(url);
  }, [url]);
  return dim;
}

// ─── AnimatedSprite ────────────────────────────────────────────────────────────

function AnimatedSprite({
  url, frameW, frameH, fps = 8, scale = 2, row = 0, animated = true,
}: {
  url: string; frameW: number; frameH: number; fps?: number; scale?: number; row?: number; animated?: boolean;
}) {
  const dim = useImageDim(url);
  const [frame, setFrame] = useState(0);
  // frameW===0 → auto-detect: use image height as frame size (square frames, single row)
  const fW   = frameW === 0 ? (dim?.h ?? 64) : Math.max(1, frameW);
  const fH   = frameH === 0 ? (dim?.h ?? 64) : Math.max(1, frameH);
  const cols = dim ? Math.max(1, Math.floor(dim.w / fW)) : 1;
  const shouldAnim = animated && cols > 1;

  useEffect(() => { setFrame(0); }, [url]);

  useEffect(() => {
    if (!shouldAnim) return;
    const id = setInterval(() => setFrame(f => (f + 1) % cols), 1000 / fps);
    return () => clearInterval(id);
  }, [shouldAnim, cols, fps]);

  // Static sprite — show the full sheet scaled to fit
  if (!animated) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={encodeURI(url)}
        alt=""
        loading="lazy"
        style={{ imageRendering: "pixelated", maxWidth: 180, maxHeight: 140, objectFit: "contain", display: "block" }}
      />
    );
  }

  if (!dim) {
    return <div style={{ width: 64 * scale, height: 64 * scale }} className="bg-gray-700 animate-pulse rounded" />;
  }

  const pxW = fW * scale;
  const pxH = fH * scale;

  return (
    <div
      style={{
        width: pxW, height: pxH,
        backgroundImage: `url("${encodeURI(url)}")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: `-${frame * fW * scale}px -${row * fH * scale}px`,
        backgroundSize: `${dim.w * scale}px ${dim.h * scale}px`,
        imageRendering: "pixelated",
        flexShrink: 0,
      }}
    />
  );
}

// ─── SpriteFrames — clickable frame grid ─────────────────────────────────────

function SpriteFrames({ url, frameW, frameH }: { url: string; frameW: number; frameH: number }) {
  const dim = useImageDim(url);
  const [copied, setCopied] = useState<number | null>(null);

  if (!dim) return <p className="text-xs text-gray-500 italic p-1">Mierzę…</p>;

  const fW = frameW === 0 ? dim.h : Math.max(1, frameW);
  const fH = frameH === 0 ? dim.h : Math.max(1, frameH);
  const cols  = Math.max(1, Math.floor(dim.w / fW));
  const rows  = Math.max(1, Math.floor(dim.h / fH));
  const total = cols * rows;
  const scale = fW <= 16 ? 4 : fW <= 64 ? 2 : 1;
  const MAX   = 300;

  return (
    <div className="mt-1 space-y-1">
      <p className="text-xs text-gray-400">{cols}×{rows} = {total} klatek — {dim.w}×{dim.h}px</p>
      <div
        className="flex flex-wrap overflow-y-auto rounded"
        style={{ maxHeight: 200, gap: 1, background: "repeating-conic-gradient(#3a3a3a 0% 25%, #252525 0% 50%) 0 0 / 8px 8px" }}
      >
        {Array.from({ length: Math.min(total, MAX) }, (_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          return (
            <div
              key={i}
              title={`Klatka ${i} [${col}, ${row}] — kliknij by skopiować indeks`}
              onClick={() => { navigator.clipboard?.writeText(String(i)); setCopied(i); setTimeout(() => setCopied(null), 1000); }}
              style={{
                width: fW * scale, height: fH * scale,
                backgroundImage: `url("${encodeURI(url)}")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: `-${col * fW * scale}px -${row * fH * scale}px`,
                backgroundSize: `${dim.w * scale}px ${dim.h * scale}px`,
                imageRendering: "pixelated",
                cursor: "pointer",
                flexShrink: 0,
                outline: copied === i ? "2px solid #22d3ee" : undefined,
              }}
              className="hover:outline hover:outline-1 hover:outline-cyan-400"
            />
          );
        })}
        {total > MAX && <span className="text-gray-500 text-xs self-center px-1">+{total - MAX}</span>}
      </div>
      {copied !== null && <p className="text-xs text-cyan-400">✓ Klatka {copied} skopiowana</p>}
    </div>
  );
}

// ─── AnimationRow — one sheet inside an expanded group ───────────────────────

function AnimationRow({ sheet }: { sheet: AssetFile }) {
  const [showFrames, setShowFrames] = useState(false);
  const [urlCopied, setUrlCopied]   = useState(false);
  const fps   = detectFps(sheet.name);
  const scale = sheet.frameW === 0 ? 2 : sheet.frameW <= 16 ? 3 : 1.5;

  const copyUrl = () => {
    navigator.clipboard?.writeText(sheet.url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 1200);
  };

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      <div className="flex items-center gap-2 p-2">
        {/* Mini animated preview */}
        <div
          className="rounded overflow-hidden flex-shrink-0"
          style={{ background: "repeating-conic-gradient(#3a3a3a 0% 25%, #252525 0% 50%) 0 0 / 8px 8px", padding: 2 }}
        >
          <AnimatedSprite url={sheet.url} frameW={sheet.frameW} frameH={sheet.frameH} fps={fps} scale={scale} animated={sheet.isAnim} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-gray-200 font-medium truncate">{sheet.animLabel}</p>
          <p
            className="text-xs text-gray-500 truncate cursor-pointer hover:text-gray-300 transition-colors"
            title={sheet.url}
            onClick={copyUrl}
          >
            {urlCopied ? "✓ skopiowano URL" : sheet.url.split("/").slice(-3).join("/")}
          </p>
        </div>

        <button
          onClick={() => setShowFrames(v => !v)}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 flex-shrink-0 transition-colors"
        >
          {showFrames ? "▲" : "▼ klatki"}
        </button>
      </div>

      {showFrames && (
        <div className="px-2 pb-2">
          <SpriteFrames url={sheet.url} frameW={sheet.frameW} frameH={sheet.frameH} />
        </div>
      )}
    </div>
  );
}

// ─── AnimGroupRow — one animation (all directions) ───────────────────────────

const DIR_LABELS = [
  { key: "right", label: "→", dir: "side" as const, flipX: false },
  { key: "left",  label: "←", dir: "side" as const, flipX: true  },
  { key: "down",  label: "↓", dir: "down" as const, flipX: false },
  { key: "up",    label: "↑", dir: "up"   as const, flipX: false },
];

function AnimGroupRow({ label, sheets }: { label: string; sheets: AssetFile[] }) {
  const [showFrames, setShowFrames] = useState(false);

  // Map direction → sheet
  const byDir = new Map<string, AssetFile>();
  for (const s of sheets) byDir.set(getAnimDir(s.name), s);

  // Side view is default fallback (enemy sheets with no direction suffix → "none")
  const sideSheet = byDir.get("side") ?? byDir.get("none") ?? sheets[0];
  const downSheet = byDir.get("down") ?? null;
  const upSheet   = byDir.get("up")   ?? null;

  const fps = detectFps(sheets[0].name);
  const refW = sideSheet.frameW;
  const scale = refW === 0 ? 1.5 : refW <= 16 ? 3 : refW <= 32 ? 2 : 1.5;

  const dirSheets: Record<string, AssetFile | null> = {
    side: sideSheet, down: downSheet, up: upSheet,
  };

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      <div className="flex items-center gap-3 p-2 flex-wrap">
        {/* 4 direction squares */}
        <div className="flex gap-2 flex-shrink-0">
          {DIR_LABELS.map(({ key, label: lbl, dir, flipX }) => {
            const sheet = dirSheets[dir] ?? sideSheet;
            const missing = dir !== "side" && dirSheets[dir] === null;
            return (
              <div key={key} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-gray-500">{lbl}</span>
                <div
                  style={{
                    transform: flipX ? "scaleX(-1)" : undefined,
                    opacity: missing ? 0.3 : 1,
                    background: "repeating-conic-gradient(#3a3a3a 0% 25%, #252525 0% 50%) 0 0 / 8px 8px",
                    borderRadius: 4,
                    padding: 2,
                  }}
                >
                  <AnimatedSprite
                    url={sheet.url} frameW={sheet.frameW} frameH={sheet.frameH}
                    fps={fps} scale={scale} animated={sheet.isAnim}
                  />
                </div>
                {missing && <span className="text-[9px] text-red-500">brak</span>}
              </div>
            );
          })}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-gray-200 font-medium">{label}</p>
          {(downSheet === null || upSheet === null) && (
            <p className="text-[10px] text-yellow-600/70">brak pełnych kierunków</p>
          )}
        </div>

        <button
          onClick={() => setShowFrames(v => !v)}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 flex-shrink-0 transition-colors"
        >
          {showFrames ? "▲" : "▼ klatki"}
        </button>
      </div>

      {showFrames && (
        <div className="px-2 pb-2">
          <SpriteFrames url={sideSheet.url} frameW={sideSheet.frameW} frameH={sideSheet.frameH} />
        </div>
      )}
    </div>
  );
}

// ─── GroupCard ────────────────────────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  characters: "bg-blue-900/60 text-blue-200",
  enemies:    "bg-red-900/60 text-red-200",
  npcs:       "bg-green-900/60 text-green-200",
  actions:    "bg-orange-900/60 text-orange-200",
  tiles:      "bg-teal-900/60 text-teal-200",
  props:      "bg-yellow-900/60 text-yellow-200",
  items:      "bg-purple-900/60 text-purple-200",
  resources:  "bg-lime-900/60 text-lime-200",
  other:      "bg-gray-700 text-gray-300",
};

function pickPreview(sheets: AssetFile[]): AssetFile {
  // Prefer animation sheets; within those, prefer idle_down → idle → walk → run
  const anims = sheets.filter(s => s.isAnim);
  const pool  = anims.length ? anims : sheets;
  const find  = (re: RegExp) => pool.find(s => re.test(s.name.toLowerCase()));
  return find(/idle.*down/) ?? find(/idle/) ?? find(/walk/) ?? find(/run/) ?? pool[0];
}

// GroupPreview: fixed 72×72 container, scale calculated from actual image dims
function GroupPreview({ sheet }: { sheet: AssetFile }) {
  const dim = useImageDim(sheet.url);
  const fps = detectFps(sheet.name);
  const TARGET = 72;
  // Determine actual frame width: auto-detect uses image height, else use declared frameW
  const fW = sheet.frameW === 0 ? (dim?.h ?? 64) : sheet.frameW;
  const scale = fW <= 16 ? Math.min(4, TARGET / fW) : Math.min(2, TARGET / fW);

  return (
    <div
      className="rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
      style={{
        width: TARGET, height: TARGET,
        background: "repeating-conic-gradient(#3a3a3a 0% 25%, #252525 0% 50%) 0 0 / 8px 8px",
      }}
    >
      <AnimatedSprite url={sheet.url} frameW={sheet.frameW} frameH={sheet.frameH} fps={fps} scale={scale} animated={sheet.isAnim} />
    </div>
  );
}

function GroupCard({ group }: { group: AssetGroup }) {
  const [expanded, setExpanded] = useState(false);
  const preview = pickPreview(group.sheets);
  const catCls  = CAT_COLOR[group.category] ?? CAT_COLOR.other;
  const multi   = group.sheets.length > 1;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-500 transition-colors flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <GroupPreview sheet={preview} />

        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-semibold text-white text-sm leading-tight truncate" title={group.name}>{group.name}</p>
          <div className="flex gap-1 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${catCls}`}>{group.category}</span>
            <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded truncate max-w-[120px]">{group.pack}</span>
          </div>
          {multi && (
            <p className="text-xs text-gray-500">{group.sheets.length} animacji</p>
          )}
        </div>
      </div>

      {/* Expand button */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="text-xs py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-400 border-t border-gray-700 transition-colors w-full"
      >
        {expanded ? "▲ zwiń" : multi ? `▼ rozwiń wszystkie animacje (${group.sheets.length})` : "▼ pokaż klatki"}
      </button>

      {/* Expanded: all animation rows */}
      {expanded && (
        <div className="p-2 border-t border-gray-700 space-y-1.5 max-h-[600px] overflow-y-auto">
          {(() => {
            // Group sheets by animation base name (e.g. Idle_Down + Idle_Side + Idle_Up → "Idle")
            const animGroups = new Map<string, AssetFile[]>();
            for (const sheet of group.sheets) {
              const base = getAnimBase(sheet.name);
              if (!animGroups.has(base)) animGroups.set(base, []);
              animGroups.get(base)!.push(sheet);
            }
            return Array.from(animGroups.entries()).map(([base, sheets]) => (
              <AnimGroupRow key={base} label={base} sheets={sheets} />
            ));
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const CATEGORIES = ["all", "characters", "enemies", "npcs", "actions", "tiles", "props", "items", "resources", "other"] as const;

export default function ObjectsPage() {
  const [groups, setGroups]   = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [category, setCategory] = useState("all");
  const [pack, setPack]       = useState("all");

  useEffect(() => {
    fetch("/api/assets")
      .then(r => r.json())
      .then(({ files }: { files: string[] }) => {
        setGroups(buildGroups(processFiles(files)));
        setLoading(false);
      });
  }, []);

  const packs      = ["all", ...Array.from(new Set(groups.map(g => g.pack))).sort()];
  const totalSheets = groups.reduce((n, g) => n + g.sheets.length, 0);

  const filtered = groups.filter(g => {
    if (category !== "all" && g.category !== category) return false;
    if (pack     !== "all" && g.pack     !== pack)     return false;
    if (search) {
      const q = search.toLowerCase();
      return g.name.toLowerCase().includes(q) || g.sheets.some(s => s.url.toLowerCase().includes(q));
    }
    return true;
  });

  const catCounts = Object.fromEntries(
    CATEGORIES.map(c => [c, c === "all" ? groups.length : groups.filter(g => g.category === c).length])
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur border-b border-gray-700 p-3 space-y-2">
        <div className="max-w-screen-2xl mx-auto space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold tracking-tight">🎨 Sprite Library</h1>
            <span className="text-gray-400 text-sm">{filtered.length} grup / {totalSheets} arkuszy</span>
            <a href="/game" className="ml-auto text-xs text-gray-400 hover:text-white border border-gray-700 px-2 py-1 rounded transition-colors">← gra</a>
            <input
              type="search" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj postaci, animacji…"
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors
                  ${category === c ? "bg-cyan-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                {c} <span className="opacity-50">({catCounts[c] ?? 0})</span>
              </button>
            ))}
          </div>

          {/* Pack chips */}
          <div className="flex gap-1 flex-wrap">
            {packs.map(p => (
              <button key={p} onClick={() => setPack(p)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors
                  ${pack === p ? "bg-purple-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-screen-2xl mx-auto p-4">
        {loading ? (
          <p className="text-center text-gray-400 py-20 text-lg">Ładowanie sprite'ów…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-20">Brak wyników</p>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {filtered.map(g => <GroupCard key={g.key} group={g} />)}
          </div>
        )}
      </main>
    </div>
  );
}
