// screen-leaderboard.jsx — ranked glass list, top 3 emphasized
const { useState: useStateLb, useEffect: useEffectLb, useRef: useRefLb, useCallback: useCBLb } = React;

function Leaderboard({ token, me, sessionCode, onExit }) {
  const hasBatch = !sessionCode && !!me?.batch;
  const [view, setView] = useStateLb(hasBatch ? 'batch' : 'all');
  const [rows, setRows] = useStateLb(null);
  const [meta, setMeta] = useStateLb(null);
  const [loading, setLoading] = useStateLb(true);
  const [autoRefresh, setAutoRefresh] = useStateLb(false);
  const [countdown, setCountdown] = useStateLb(30);
  const timerRef = useRefLb(null);

  const fetchData = useCBLb(() => {
    let alive = true;
    setLoading(true);
    const req = sessionCode
      ? window.api.sessions.leaderboard(token, sessionCode)
      : window.api.leaderboard(token, view);
    req.then((d) => {
      if (!alive) return;
      setRows(d.leaderboard);
      setMeta(d.session || { view: d.view, batch: d.batch, rooms_total: d.rooms_total });
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [view, sessionCode]);

  useEffectLb(() => { fetchData(); }, [fetchData]);

  useEffectLb(() => {
    if (!autoRefresh) { clearInterval(timerRef.current); setCountdown(30); return; }
    setCountdown(30);
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchData(); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, fetchData]);

  const top3 = (rows || []).slice(0, 3);
  const rest = (rows || []).slice(3);
  const empty = rows && rows.length === 0;
  const roomsTotal = meta?.rooms_total ?? 10;

  const medal = ["var(--lime)", "var(--accent)", "var(--accent-2)"];
  const medalLabel = ["1ST", "2ND", "3RD"];

  return (
    <div style={lbStyles.page}>
      {/* topbar */}
      <div style={lbStyles.topbar} className="reveal">
        <button className="btn" onClick={onExit} style={{ padding: "10px 14px" }}>
          <Icon name="back" size={16} stroke="currentColor" style={{ verticalAlign: "-3px", marginRight: 6 }} />
          {sessionCode ? 'ROOMS' : 'MAP'}
        </button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div className="eyebrow" style={{ fontSize: 9 }}>
            {sessionCode
              ? (meta?.title || 'SESSION')
              : view === 'batch'
                ? ('BATCH · ' + (me?.batch || ''))
                : 'ALL-TIME'}
          </div>
          <div style={{ fontWeight: 800, letterSpacing: "0.12em", fontSize: 15, marginTop: 2 }}>
            <Icon name="trophy" size={16} stroke={view === 'batch' || sessionCode ? "var(--lime)" : "var(--accent)"} style={{ verticalAlign: "-3px", marginRight: 8 }} />
            {sessionCode ? 'SESSION LEADERBOARD' : 'LEADERBOARD'}
          </div>
          {sessionCode && (
            <div style={{ fontSize: 11, marginTop: 3, letterSpacing: '0.14em', color: 'var(--lime)', fontWeight: 700 }}>{sessionCode}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn" onClick={fetchData} disabled={loading}
            style={{ padding: '8px 12px', fontSize: 11 }} title="Refresh now">
            {loading ? '…' : '↺'}
          </button>
          <button className="btn" onClick={() => setAutoRefresh(a => !a)}
            style={{ padding: '8px 12px', fontSize: 11, ...(autoRefresh ? { color: 'var(--lime)', borderColor: 'color-mix(in srgb, var(--lime) 50%, transparent)', background: 'color-mix(in srgb, var(--lime) 8%, transparent)' } : {}) }}
            title={autoRefresh ? 'Stop auto-refresh' : 'Auto-refresh every 30s'}>
            {autoRefresh ? `⏱ ${countdown}s` : '⏱'}
          </button>
        </div>
      </div>

      {/* view tabs — only when not in session mode and user has a batch */}
      {!sessionCode && hasBatch && (
        <div className="reveal" style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
          <button className="btn"
            onClick={() => setView('batch')}
            style={{ padding: '9px 20px', fontSize: 12, ...(view === 'batch' ? { background: 'color-mix(in srgb, var(--lime) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--lime) 60%, transparent)', color: 'var(--lime)' } : {}) }}>
            ⚡ MY BATCH
          </button>
          <button className="btn"
            onClick={() => setView('all')}
            style={{ padding: '9px 20px', fontSize: 12, ...(view === 'all' ? { background: 'color-mix(in srgb, var(--accent) 12%, transparent)', borderColor: 'var(--accent)', color: 'var(--accent)' } : {}) }}>
            🌐 ALL TIME
          </button>
        </div>
      )}

      {loading ? (
        <LoadingScreen label="RANKING OPERATIVES" />
      ) : empty ? (
        <div className="glass reveal" style={lbStyles.emptyCard}>
          <Icon name="trophy" size={40} stroke="var(--text-faint)" />
          <div style={{ fontWeight: 700, letterSpacing: "0.1em", marginTop: 16 }}>NO RANKS YET</div>
          <p className="dim" style={{ fontSize: 13, marginTop: 8, maxWidth: 300, lineHeight: 1.6 }}>
            {sessionCode
              ? 'No one has answered yet in this session.'
              : view === 'batch'
                ? 'No other students in your batch have scored yet.'
                : 'Be the first to clear a room and stake your claim on the board.'}
          </p>
        </div>
      ) : (
        <>
          {/* podium */}
          <div style={lbStyles.podium} className="reveal">
            {[1, 0, 2].map((pos, vi) => {
              const r = top3[pos];
              if (!r) return <div key={vi} style={{ flex: 1 }} />;
              const h = pos === 0 ? 150 : pos === 1 ? 116 : 96;
              return (
                <div key={pos} style={{ ...lbStyles.podCol, animationDelay: (0.1 + vi * 0.1) + "s" }} className="reveal">
                  <div style={{ ...lbStyles.podMedal, borderColor: medal[pos], color: medal[pos], boxShadow: `0 0 calc(26px * var(--glow-mult)) color-mix(in srgb, ${medal[pos]} 45%, transparent)` }}>
                    {pos + 1}
                  </div>
                  <div style={{ ...lbStyles.podName, color: r.you ? "var(--accent)" : "var(--text)", maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}{r.you && <span className="cyan" style={{ fontSize: 10 }}> ·YOU</span>}
                  </div>
                  {r.batch && <div className="faint" style={{ fontSize: 10, letterSpacing: "0.08em", marginTop: -2 }}>[{r.batch}]</div>}
                  <div className="faint" style={{ fontSize: 11 }}>{r.rooms_cleared}/{roomsTotal} rooms</div>
                  <div style={{
                    ...lbStyles.podBar, height: h,
                    background: `linear-gradient(to top, color-mix(in srgb, ${medal[pos]} 22%, transparent), color-mix(in srgb, ${medal[pos]} 6%, transparent))`,
                    borderColor: `color-mix(in srgb, ${medal[pos]} 50%, transparent)`,
                    boxShadow: `inset 0 0 30px color-mix(in srgb, ${medal[pos]} 14%, transparent), 0 0 calc(30px * var(--glow-mult)) color-mix(in srgb, ${medal[pos]} 18%, transparent)`
                  }}>
                    <span className="glow-text" style={{ color: medal[pos], fontWeight: 800, fontSize: 22 }}>{r.total_points.toLocaleString()}</span>
                    <span className="faint" style={{ fontSize: 9, letterSpacing: "0.16em", marginTop: 4 }}>{medalLabel[pos]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* list */}
          <div style={lbStyles.list}>
            <div style={lbStyles.listHead} className="reveal">
              <span style={{ width: 44 }}>RANK</span>
              <span style={{ flex: 1 }}>HANDLE</span>
              <span style={{ width: 90, textAlign: "center" }}>ROOMS</span>
              <span style={{ width: 100, textAlign: "right" }}>POINTS</span>
            </div>
            {rest.map((r, i) => (
              <div key={i} className={"glass reveal lb-row" + (r.you ? " lb-row--you" : "")}
                style={{ ...lbStyles.row, animationDelay: (0.2 + i * 0.04) + "s" }}>
                <span style={lbStyles.rank}>{String(i + 4).padStart(2, "0")}</span>
                <span style={{ flex: 1, minWidth: 0, fontWeight: 700, letterSpacing: "0.04em", color: r.you ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.name}
                  {r.batch && view === 'all' && <span className="faint" style={{ fontSize: 10, marginLeft: 8, fontWeight: 400 }}>[{r.batch}]</span>}
                  {r.you && <span className="cyan glow-text" style={{ fontSize: 10, marginLeft: 8 }}>·YOU</span>}
                </span>
                <span style={{ width: 90, textAlign: "center" }} className="dim">{r.rooms_cleared}<span className="faint">/{roomsTotal}</span></span>
                <span style={{ width: 100, textAlign: "right" }} className="cyan glow-text">{r.total_points.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const lbStyles = {
  page: { width: "min(720px, 94vw)", margin: "0 auto", padding: "20px 0 90px", minHeight: "100vh" },
  topbar: { display: "flex", alignItems: "center", gap: 14, padding: "12px 0 20px" },
  emptyCard: { textAlign: "center", padding: "60px 30px", display: "flex", flexDirection: "column", alignItems: "center", marginTop: 30 },
  podium: { display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 34, padding: "0 4px" },
  podCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  podMedal: { width: 40, height: 40, borderRadius: "50%", border: "2px solid", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 18, marginBottom: 4 },
  podName: { fontWeight: 700, letterSpacing: "0.04em", fontSize: 14, textAlign: "center" },
  podBar: { width: "100%", borderRadius: "10px 10px 0 0", border: "1px solid", borderBottom: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginTop: 8, backdropFilter: "blur(10px)" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  listHead: { display: "flex", alignItems: "center", gap: 14, padding: "0 18px 6px", fontSize: 10, letterSpacing: "0.16em", color: "var(--text-faint)" },
  row: { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", fontSize: 14 },
  rank: { width: 44, fontWeight: 800, color: "var(--text-faint)", fontSize: 15 }
};

window.Leaderboard = Leaderboard;
