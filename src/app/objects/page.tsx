"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetFile {
  url: string;       // e.g. /assets/player/idle_down.png
  name: string;      // idle_down.png
  pack: string;      // Free Pack, Castle, Game: Player, …
  category: string;  // characters | enemies | npcs | actions | tiles | props | items | resources | other
  frameW: number;
  frameH: number;
}

// ─── Path analysis helpers ────────────────────────────────────────────────────

function detectPack(url: string): string {
  if (url.includes("Castle"))       return "Castle";
  if (url.includes("Cemetery"))     return "Cemetery";
  if (url.includes("Desert"))       return "Desert";
  if (url.includes("Fairy Forest")) return "Fairy Forest";
  if (url.includes("Forge"))        return "Forge";
  if (url.includes("Free Pack"))    return "Free Pack";
  if (url.includes("Hideout"))      return "Hideout";
  if (url.includes("Sewer"))        return "Sewer";
  if (url.includes("/player/"))     return "Game: Player";
  if (url.includes("/actions/"))    return "Game: Actions";
  if (url.includes("/resources/"))  return "Game: Resources";
  if (url.includes("/test/"))       return "Game: Tiles";
  return "Other";
}

function detectCategory(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("/social/") || u.includes("mockup") || u.includes("sprite-00")) return "social";
  if (u.includes("/player/") || u.includes("/characters/") || u.includes("body_a")) return "characters";
  if (u.includes("/actions/") || u.includes("slice") || u.includes("crush") || u.includes("pierce") || u.includes("collect")) return "actions";
  if (u.includes("/resources/")) return "resources";
  if (u.includes("/mobs/") || u.includes("/enemies/") || u.includes("/enemy/")
    || u.includes("zombie") || u.includes("orc") || u.includes("skeleton")
    || u.includes("banshee") || u.includes("mummy") || u.includes("rat")
    || u.includes("bandit") || u.includes("elf") || u.includes("stone")
    || u.includes("golem")) return "enemies";
  if (u.includes("/npcs/") || u.includes("knight") || u.includes("rogue") || u.includes("wizard")) return "npcs";
  if (u.includes("tileset") || u.includes("tiles.png") || u.includes("/test/") || u.includes("floor.png") || u.includes("ground.png") || u.includes("sand.png") || u.includes("water.png")) return "tiles";
  if (u.includes("/props") || u.includes("/structures/") || u.includes("/decoration") || u.includes("props.png") || u.includes("graves") || u.includes("light.png") || u.includes("shadow")) return "props";
  if (u.includes("/weapons/") || u.includes("/food/") || u.includes("/items/") || u.includes("weapons.png") || u.includes("bone.png") || u.includes("wood.png")) return "items";
  return "other";
}

function detectFrameSize(url: string): { w: number; h: number } {
  if (url.includes("/player/") || url.includes("Body_A/Animations") || url.includes("/actions/")) return { w: 64, h: 64 };
  if (url.includes("tree_sheet")) return { w: 112, h: 184 };
  return { w: 16, h: 16 };
}

function processFiles(files: string[]): AssetFile[] {
  return files
    .filter(url => {
      const u = url.toLowerCase();
      return !u.includes("/social/") && !u.includes("mockup") && !u.includes("sprite-00") && !u.includes("png_data");
    })
    .map(url => {
      const name = url.split("/").pop() ?? url;
      const { w, h } = detectFrameSize(url);
      return {
        url,
        name,
        pack: detectPack(url),
        category: detectCategory(url),
        frameW: w,
        frameH: h,
      };
    });
}

// ─── SpriteFrames — shows individual frames extracted from a sheet ──────────

interface SheetDim { w: number; h: number; }

function SpriteFrames({ url, frameW, frameH }: { url: string; frameW: number; frameH: number }) {
  const [dim, setDim] = useState<SheetDim | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    setDim(null);
    const img = new Image();
    img.onload = () => setDim({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setDim({ w: 0, h: 0 });
    img.src = encodeURI(url);
  }, [url, frameW, frameH]);

  if (!dim) return <p className="text-xs text-gray-500 p-2 italic">Measuring…</p>;
  if (!dim.w) return <p className="text-xs text-red-500 p-2">Failed to load</p>;

  const fW = Math.max(1, frameW);
  const fH = Math.max(1, frameH);
  const cols = Math.floor(dim.w / fW);
  const rows = Math.floor(dim.h / fH);
  const total = cols * rows;
  const scale = fW <= 16 ? 4 : fW <= 32 ? 3 : fW <= 64 ? 2 : 1;
  const MAX_SHOWN = 300;

  const copyIndex = (i: number) => {
    navigator.clipboard?.writeText(String(i));
    setCopied(i);
    setTimeout(() => setCopied(null), 1000);
  };

  return (
    <div className="mt-1 space-y-1">
      <p className="text-xs text-gray-400">
        {cols}×{rows} = {total} klatek — arkusz {dim.w}×{dim.h}px
        {total > MAX_SHOWN && <span className="text-yellow-500"> (pokazano {MAX_SHOWN})</span>}
      </p>
      <div
        className="flex flex-wrap overflow-y-auto rounded"
        style={{
          maxHeight: 260,
          gap: 1,
          background: "repeating-conic-gradient(#3a3a3a 0% 25%, #252525 0% 50%) 0 0 / 8px 8px",
        }}
      >
        {Array.from({ length: Math.min(total, MAX_SHOWN) }, (_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          return (
            <div
              key={i}
              title={`Klatka ${i} — [col ${col}, row ${row}]`}
              onClick={() => copyIndex(i)}
              style={{
                width: fW * scale,
                height: fH * scale,
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
      </div>
      {copied !== null && (
        <p className="text-xs text-cyan-400">✓ Skopiowano indeks: {copied}</p>
      )}
    </div>
  );
}

// ─── AssetCard ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  characters: "bg-blue-900 text-blue-300",
  enemies:    "bg-red-900 text-red-300",
  npcs:       "bg-green-900 text-green-300",
  actions:    "bg-orange-900 text-orange-300",
  tiles:      "bg-teal-900 text-teal-300",
  props:      "bg-yellow-900 text-yellow-300",
  items:      "bg-purple-900 text-purple-300",
  resources:  "bg-lime-900 text-lime-300",
  other:      "bg-gray-700 text-gray-300",
};

function AssetCard({ asset }: { asset: AssetFile }) {
  const [expanded, setExpanded] = useState(false);
  const [fW, setFW] = useState(asset.frameW);
  const [fH, setFH] = useState(asset.frameH);
  const [urlCopied, setUrlCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard?.writeText(asset.url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 1200);
  };

  const catCls = CATEGORY_COLORS[asset.category] ?? CATEGORY_COLORS.other;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-500 transition-colors flex flex-col">
      {/* Sheet preview */}
      <div
        className="flex items-center justify-center p-2"
        style={{
          minHeight: 80,
          background: "repeating-conic-gradient(#3a3a3a 0% 25%, #252525 0% 50%) 0 0 / 8px 8px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={encodeURI(asset.url)}
          alt={asset.name}
          loading="lazy"
          style={{ imageRendering: "pixelated", maxWidth: "100%", maxHeight: 100, objectFit: "contain" }}
        />
      </div>

      {/* Info */}
      <div className="p-2 space-y-1.5 flex-1 flex flex-col">
        <p className="font-mono text-xs text-white font-semibold truncate" title={asset.name}>{asset.name}</p>
        <p
          className="font-mono text-xs text-gray-500 truncate cursor-pointer hover:text-gray-300"
          title={asset.url}
          onClick={copyUrl}
        >
          {urlCopied ? "✓ skopiowano" : asset.url}
        </p>

        <div className="flex gap-1 flex-wrap">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${catCls}`}>{asset.category}</span>
          <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded">{asset.pack}</span>
        </div>

        {/* Frame size editor */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-400 mr-0.5">Frame:</span>
          <input
            type="number" min={1} value={fW}
            onChange={e => setFW(Math.max(1, Number(e.target.value)))}
            className="w-11 bg-gray-700 border border-gray-600 text-white px-1 py-0.5 rounded text-center focus:outline-none focus:border-cyan-500"
          />
          <span className="text-gray-500">×</span>
          <input
            type="number" min={1} value={fH}
            onChange={e => setFH(Math.max(1, Number(e.target.value)))}
            className="w-11 bg-gray-700 border border-gray-600 text-white px-1 py-0.5 rounded text-center focus:outline-none focus:border-cyan-500"
          />
          <span className="text-gray-500 text-xs">px</span>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-auto text-xs py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors w-full"
        >
          {expanded ? "▲ ukryj klatki" : "▼ pokaż klatki"}
        </button>

        {expanded && <SpriteFrames url={asset.url} frameW={fW} frameH={fH} />}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const CATEGORIES = ["all", "characters", "enemies", "npcs", "actions", "tiles", "props", "items", "resources", "other"] as const;

export default function ObjectsPage() {
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [pack, setPack] = useState("all");

  useEffect(() => {
    fetch("/api/assets")
      .then(r => r.json())
      .then(({ files }: { files: string[] }) => {
        setAssets(processFiles(files));
        setLoading(false);
      });
  }, []);

  const packs = ["all", ...Array.from(new Set(assets.map(a => a.pack))).sort()];

  const filtered = assets.filter(a => {
    if (category !== "all" && a.category !== category) return false;
    if (pack !== "all" && a.pack !== pack) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.url.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c] = c === "all" ? assets.length : assets.filter(a => a.category === c).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur border-b border-gray-700 p-3 space-y-2">
        <div className="max-w-screen-2xl mx-auto space-y-2">
          {/* Title + search */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold tracking-tight">🎨 Biblioteka Sprite'ów</h1>
            <span className="text-gray-400 text-sm">{filtered.length} / {assets.length} plików</span>
            <a href="/game" className="ml-auto text-xs text-gray-400 hover:text-white border border-gray-700 px-2 py-1 rounded">← gra</a>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj nazwy lub ścieżki…"
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors
                  ${category === c ? "bg-cyan-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
              >
                {c} <span className="opacity-60 ml-0.5">({counts[c] ?? 0})</span>
              </button>
            ))}
          </div>

          {/* Pack chips */}
          <div className="flex gap-1 flex-wrap">
            {packs.map(p => (
              <button
                key={p}
                onClick={() => setPack(p)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors
                  ${pack === p ? "bg-purple-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="max-w-screen-2xl mx-auto p-4">
        {loading ? (
          <div className="text-center text-gray-400 py-20 text-lg">Ładowanie plików PNG…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-20">Brak wyników</div>
        ) : (
          <div className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
          >
            {filtered.map(asset => (
              <AssetCard key={asset.url} asset={asset} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
