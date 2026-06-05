// common.jsx — shared UI primitives for Code Arena
const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

// ---- Atmosphere background -------------------------------------------------
function Atmos() {
  return (
    <div className="atmos" aria-hidden="true">
      <div className="atmos-mesh" />
      <div className="atmos-grid" />
      <div className="atmos-scan" />
      <div className="atmos-grain" />
      <div className="atmos-vignette" />
    </div>
  );
}

// ---- Glyph icons (inline, monoline) ---------------------------------------
function Icon({ name, size = 22, stroke = "currentColor", style }) {
  const sw = 1.6;
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", style };
  switch (name) {
    case "lock":
      return (<svg {...common}><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><circle cx="12" cy="15" r="1.2" fill={stroke} stroke="none"/></svg>);
    case "check":
      return (<svg {...common}><path d="M4 12.5l5 5L20 6.5"/></svg>);
    case "enter":
      return (<svg {...common}><path d="M5 12h13"/><path d="M13 6l6 6-6 6"/></svg>);
    case "trophy":
      return (<svg {...common}><path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v1a3 3 0 0 0 3 3"/><path d="M17 6h3v1a3 3 0 0 1-3 3"/><path d="M9 20h6M12 14v6"/></svg>);
    case "bolt":
      return (<svg {...common}><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill={stroke} stroke="none"/></svg>);
    case "flame":
      return (<svg {...common}><path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1 .5-2 1.5 2 2.5 3.5 2.5 6a7 7 0 1 1-14 0c0-4 4-6 4-9 0 0 2 .5 5-2z"/></svg>);
    case "clock":
      return (<svg {...common}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>);
    case "target":
      return (<svg {...common}><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill={stroke} stroke="none"/></svg>);
    case "back":
      return (<svg {...common}><path d="M19 12H6"/><path d="M11 6l-6 6 6 6"/></svg>);
    case "terminal":
      return (<svg {...common}><rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M7 9l3 2.5L7 14"/><path d="M12.5 14.5H16"/></svg>);
    case "logout":
      return (<svg {...common}><path d="M14 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2"/><path d="M18 12H9"/><path d="M15 9l3 3-3 3"/></svg>);
    case "map":
      return (<svg {...common}><path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>);
    default:
      return (<svg {...common}><circle cx="12" cy="12" r="8"/></svg>);
  }
}

// module-type "language" badge glyphs — kept for any legacy references
const TYPE_MARK = {
  html: "</>", css: "#", js: "JS", dom: "{}", py: "py",
  dsa: "Σ", sql: "DB", git: "⎇", net: "::", sec: "🔐"
};

// Map legacy seeder icon keys to new icon keys
const LEGACY_ICON_MAP = {
  html: "code", css: "palette", js: "code", dom: "code", py: "code",
  dsa: "layers", sql: "database", net: "globe", sec: "shield"
};

// Room topic icons — inline SVG, 20 subjects
function RoomIcon({ iconKey, size = 18, stroke = "currentColor" }) {
  const k = LEGACY_ICON_MAP[iconKey] || iconKey;
  const sw = 1.7;
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (k) {
    case "code":
      return (<svg {...p}><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>);
    case "book":
      return (<svg {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>);
    case "database":
      return (<svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>);
    case "globe":
      return (<svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>);
    case "shield":
      return (<svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>);
    case "git":
      return (<svg {...p}><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>);
    case "cpu":
      return (<svg {...p}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M20 15h2M9 2v2M9 20v2M2 9h2M20 9h2"/></svg>);
    case "server":
      return (<svg {...p}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>);
    case "brain":
      return (<svg {...p}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3.14A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3.14A2.5 2.5 0 0 0 14.5 2z"/></svg>);
    case "flask":
      return (<svg {...p}><path d="M9 3h6"/><path d="M9 3v6l-4.5 8A2 2 0 0 0 6.3 20h11.4a2 2 0 0 0 1.8-3L14 9V3"/><line x1="7.5" y1="14" x2="16.5" y2="14"/></svg>);
    case "calculator":
      return (<svg {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="12" x2="8.01" y2="12"/><line x1="12" y1="12" x2="12.01" y2="12"/><line x1="16" y1="12" x2="16.01" y2="12"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="12" y1="16" x2="12.01" y2="16"/><line x1="16" y1="16" x2="16.01" y2="16"/></svg>);
    case "languages":
      return (<svg {...p}><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>);
    case "palette":
      return (<svg {...p}><circle cx="13.5" cy="6.5" r=".5" fill={stroke} stroke="none"/><circle cx="17.5" cy="10.5" r=".5" fill={stroke} stroke="none"/><circle cx="8.5" cy="7.5" r=".5" fill={stroke} stroke="none"/><circle cx="6.5" cy="12.5" r=".5" fill={stroke} stroke="none"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>);
    case "music":
      return (<svg {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>);
    case "map":
      return (<svg {...p}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>);
    case "trophy":
      return (<svg {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>);
    case "zap":
      return (<svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>);
    case "layers":
      return (<svg {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>);
    case "target":
      return (<svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>);
    case "terminal":
      return (<svg {...p}><rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M7 9l3 2.5L7 14"/><path d="M12.5 14.5H16"/></svg>);
    default:
      return (<svg {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);
  }
}

const ICON_OPTIONS = [
  { key: "code",       label: "Code" },
  { key: "book",       label: "Quiz" },
  { key: "database",   label: "Database" },
  { key: "globe",      label: "Web" },
  { key: "shield",     label: "Security" },
  { key: "git",        label: "Git" },
  { key: "cpu",        label: "CS" },
  { key: "server",     label: "API" },
  { key: "brain",      label: "Logic" },
  { key: "flask",      label: "Science" },
  { key: "calculator", label: "Math" },
  { key: "languages",  label: "Language" },
  { key: "palette",    label: "Design" },
  { key: "music",      label: "Music" },
  { key: "map",        label: "Geography" },
  { key: "trophy",     label: "Contest" },
  { key: "zap",        label: "Quick" },
  { key: "layers",     label: "Full Stack" },
  { key: "target",     label: "Focus" },
  { key: "terminal",   label: "CLI" },
];

// ---- Toast system ----------------------------------------------------------
const ToastCtx = createContext(() => {});
function useToast() { return useContext(ToastCtx); }

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, tone = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={tStyles.wrap}>
        {toasts.map((t) => (
          <div key={t.id} className="glass reveal" style={{ ...tStyles.toast, ...toneStyle(t.tone) }}>
            <span style={{ fontSize: 16 }}>{t.tone === "error" ? "✕" : t.tone === "success" ? "✓" : "›"}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
function toneStyle(tone) {
  if (tone === "error") return { borderColor: "color-mix(in srgb, var(--red) 60%, transparent)", boxShadow: "0 0 calc(22px * var(--glow-mult)) color-mix(in srgb, var(--red) 35%, transparent)" };
  if (tone === "success") return { borderColor: "color-mix(in srgb, var(--lime) 60%, transparent)", boxShadow: "0 0 calc(22px * var(--glow-mult)) color-mix(in srgb, var(--lime) 35%, transparent)" };
  return { borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)" };
}
const tStyles = {
  wrap: { position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, alignItems: "center", pointerEvents: "none" },
  toast: { display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", fontSize: 13.5, letterSpacing: "0.04em", maxWidth: "82vw" }
};

// ---- Loading screen --------------------------------------------------------
function LoadingScreen({ label = "BOOTING ARENA" }) {
  return (
    <div className="center-screen">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <div className="spinner" />
        <div className="eyebrow caret" style={{ letterSpacing: "0.35em" }}>{label}</div>
      </div>
    </div>
  );
}

// ---- Count-up number -------------------------------------------------------
function CountUp({ value, duration = 700 }) {
  const [n, setN] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current, to = value, start = performance.now();
    if (from === to) return;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span>{n.toLocaleString()}</span>;
}

// ---- Image upload + downscale ---------------------------------------------
// Reads a File, downscales to maxDim, returns a JPEG/PNG data URL small enough
// for localStorage. Keeps PNG (transparency) only for small images.
function downscaleImageFile(file, maxDim = 420, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) { reject(new Error("Not an image")); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale); height = Math.round(height * scale);
        const cv = document.createElement("canvas");
        cv.width = width; cv.height = height;
        const ctx = cv.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        // gifs/pngs with alpha → png, else jpeg for size
        const out = cv.toDataURL("image/jpeg", quality);
        resolve(out);
      };
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

// drag/click image picker used in the admin editor
function ImagePicker({ value, onChange, label = "ADD IMAGE", compact }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  async function handle(file) {
    if (!file) return;
    setBusy(true);
    try { onChange(await downscaleImageFile(file)); }
    catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); handle(e.dataTransfer.files[0]); }}
      style={{
        position: "relative", borderRadius: 10, border: "1px dashed var(--glass-border)",
        background: "rgba(0,0,0,0.3)", padding: value ? 8 : (compact ? 10 : 18),
        textAlign: "center", cursor: "pointer", transition: "border-color .2s"
      }}
      onClick={() => ref.current && ref.current.click()}
    >
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => handle(e.target.files[0])} />
      {value ? (
        <div style={{ position: "relative" }}>
          <img src={value} alt="" style={{ maxWidth: "100%", maxHeight: compact ? 90 : 160, borderRadius: 6, display: "block", margin: "0 auto" }} />
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(null); }}
            style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 6, border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.7)", color: "var(--red)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>
      ) : (
        <span className="faint" style={{ fontSize: 11, letterSpacing: "0.12em" }}>{busy ? "PROCESSING…" : "⬍ " + label}</span>
      )}
    </div>
  );
}

// ---- Avatar (DiceBear pixel-art) -------------------------------------------
const AVATAR_COLORS = ['#00E5FF', '#FF3DCB', '#5CFF8F', '#FFB000', '#7A5CFF', '#FF4D6D'];

function avatarUrl(name, gender, color) {
  const seed = encodeURIComponent((name || 'user') + (gender === 'f' ? '_f' : '_m'));
  const clothing = (color || '#00E5FF').replace('#', '');
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${seed}&clothingColor=${clothing}&backgroundColor=0d1117&backgroundType=solid&scale=80`;
}

function Avatar({ name, gender, color, size = 32, style: extraStyle }) {
  return (
    <img
      src={avatarUrl(name, gender, color)}
      alt=""
      width={size} height={size}
      style={{ borderRadius: 6, display: 'block', imageRendering: 'pixelated', flexShrink: 0, ...extraStyle }}
    />
  );
}

Object.assign(window, { Atmos, Icon, TYPE_MARK, RoomIcon, ICON_OPTIONS, ToastProvider, useToast, LoadingScreen, CountUp, downscaleImageFile, ImagePicker, avatarUrl, Avatar, AVATAR_COLORS });
