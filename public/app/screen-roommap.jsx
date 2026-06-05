// screen-roommap.jsx — the main screen: rooms along a winding path
const { useState: useStateMap, useEffect: useEffectMap } = React;

// ---- Join Session modal --------------------------------------------------
function JoinSessionModal({ token, onJoin, onCancel }) {
  const [code, setCode] = useStateMap('');
  const [loading, setLoading] = useStateMap(false);
  const [error, setError] = useStateMap('');

  async function join() {
    const c = code.trim().toUpperCase();
    if (!c) { setError('Enter a session code'); return; }
    setLoading(true); setError('');
    try {
      const { session } = await window.api.sessions.join(token, c);
      onJoin(session);
    } catch (e) {
      setError(e.message || 'Session not found or has ended');
    } finally { setLoading(false); }
  }

  return (
    <div style={jsStyles.wrap} onMouseDown={onCancel}>
      <div className="glass reveal" style={jsStyles.box} onMouseDown={e => e.stopPropagation()}>
        <div style={{ padding: '20px 22px 14px', borderBottom: '1px solid var(--hairline)' }}>
          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>ENTER CODE</div>
          <h2 style={{ fontSize: 20, letterSpacing: '0.1em' }}>JOIN SESSION</h2>
        </div>
        <div style={{ padding: '18px 22px 20px' }}>
          <p className="faint" style={{ fontSize: 13, marginBottom: 18, lineHeight: 1.65 }}>
            Enter the 6-character code your instructor shared.
          </p>
          <input className="field" value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            onKeyDown={e => e.key === 'Enter' && join()}
            placeholder="e.g. XK7P2Q"
            autoFocus
            style={{ textAlign: 'center', fontSize: 26, fontWeight: 800, letterSpacing: '0.22em', padding: '14px 16px' }} />
          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>⚠ {error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onCancel}>CANCEL</button>
            <button className="btn btn-primary" onClick={join} disabled={loading || !code.trim()}>
              {loading ? 'JOINING…' : '⚡ JOIN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const jsStyles = {
  wrap: { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(3,6,10,0.75)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 20 },
  box: { width: 'min(420px, 96vw)' },
};

// ---- HUD -----------------------------------------------------------------
function Hud({ me, isAdmin, activeSession, onLeaderboard, onAdmin, onLogout, onJoinSession, onLeaveSession }) {
  return (
    <div className="glass reveal hud-bar" style={hStyles.bar}>
      <div style={hStyles.left}>
        <div style={hStyles.logo}>
          <Icon name="terminal" size={20} stroke="var(--accent)" />
          <span className="glow-text cyan hud-logo-text" style={{ fontWeight: 800, letterSpacing: "0.16em" }}>QUIZ ARENA</span>
        </div>
      </div>
      <div className="hud-stats" style={hStyles.stats}>
        <div style={hStyles.stat}>
          <Icon name="bolt" size={18} stroke="var(--accent)" />
          <div>
            <div style={hStyles.statNum} className="glow-text cyan"><CountUp value={me?.total_points || 0} /></div>
            <div className="eyebrow" style={{ fontSize: 9 }}>POINTS</div>
          </div>
        </div>
        <div style={hStyles.sep} />
        <div style={hStyles.stat}>
          <Icon name="check" size={18} stroke="var(--lime)" />
          <div>
            <div style={hStyles.statNum} className="lime glow-text">{me?.rooms_cleared || 0}<span className="faint" style={{ fontWeight: 400 }}>/10</span></div>
            <div className="eyebrow" style={{ fontSize: 9 }}>CLEARED</div>
          </div>
        </div>
      </div>
      <div style={hStyles.actions}>
        {activeSession ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ padding: '7px 13px', borderRadius: 9, background: 'color-mix(in srgb, var(--lime) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--lime) 40%, transparent)', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--lime)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ⚡ {activeSession.code}
            </div>
            <button className="btn" onClick={onLeaveSession}
              style={{ padding: '9px 13px', fontSize: 11, color: 'var(--text-faint)', borderColor: 'var(--hairline)' }}
              title="Leave session">LEAVE</button>
          </div>
        ) : (
          <button className="btn hud-action-btn" onClick={onJoinSession}
            style={{ color: 'var(--accent-2)', borderColor: 'color-mix(in srgb, var(--accent-2) 40%, transparent)' }}>
            <Icon name="bolt" size={16} stroke="var(--accent-2)" style={{ verticalAlign: '-2px', filter: 'drop-shadow(0 0 6px var(--accent-2))' }} />
            <span className="hud-btn-text" style={{ marginLeft: 7 }}>SESSION</span>
          </button>
        )}
        {isAdmin && (
          <button className="btn hud-action-btn" onClick={onAdmin}
            style={{ borderColor: "color-mix(in srgb, var(--accent-2) 50%, transparent)", color: "var(--accent-2)" }}>
            <Icon name="terminal" size={16} stroke="var(--accent-2)" style={{ verticalAlign: "-2px", filter: 'drop-shadow(0 0 6px var(--accent-2))', marginRight: 0 }} /><span className="hud-btn-text" style={{ marginLeft: 7 }}>ADMIN</span>
          </button>
        )}
        <button className="btn hud-action-btn" onClick={onLeaderboard}
          style={{ color: 'var(--accent)', borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)' }}>
          <Icon name="trophy" size={16} stroke="var(--accent)" style={{ verticalAlign: "-2px", filter: 'drop-shadow(0 0 6px var(--accent))', marginRight: 0 }} /><span className="hud-btn-text" style={{ marginLeft: 7 }}>RANKS</span>
        </button>
        <button className="btn hud-action-btn" onClick={onLogout} title="Log out">
          <Icon name="logout" size={16} stroke="var(--text-dim)" style={{ verticalAlign: "-2px" }} />
        </button>
      </div>
    </div>
  );
}

function RoomNode({ room, isCurrent, side, index, userId, onEnterFresh, onEnterResume, onEnterPractice, onLockedClick }) {
  // exhausted takes priority: exhausted-and-completed → still practice only
  const state = room.exhausted ? "exhausted" : room.completed ? "completed" : room.unlocked ? "unlocked" : "locked";
  const cls = ["room-card", "reveal"];
  if (isCurrent) cls.push("pulse-current");

  const hasProgress = (() => {
    try {
      const d = JSON.parse(localStorage.getItem("quiz_arena_room_progress_v1") || "{}");
      return (d[`${userId}_${room.id}`] || 0) > 0;
    } catch { return false; }
  })();

  return (
    <div className={"room-row room-row--" + side}>
      <div className={"spine-node spine-node--" + (state === "exhausted" ? "unlocked" : state)} aria-hidden="true">
        {state === "completed" ? <Icon name="check" size={14} stroke="#04110a" /> :
         state === "locked" ? <Icon name="lock" size={12} stroke="var(--text-faint)" /> :
         <span style={{ width: 6, height: 6, borderRadius: 99, background: state === "exhausted" ? "var(--accent-2)" : "var(--accent)", display: "block" }} />}
      </div>

      <div
        className={cls.join(" ")}
        data-state={state}
        onClick={state === "locked" ? () => onLockedClick(room) : undefined}
        style={{ animationDelay: (0.12 + index * 0.06) + "s", cursor: state === "locked" ? "pointer" : "default" }}
        data-screen-label={"Room " + String(room.sequence).padStart(2, "0")}
      >
        <div className="room-top">
          <span className="room-seq">{String(room.sequence).padStart(2, "0")}</span>
          <span className="room-mark" data-state={state}><RoomIcon iconKey={room.icon} size={13} stroke="currentColor" /></span>
          {state === "completed" && <span className="room-badge room-badge--done"><Icon name="check" size={12} stroke="currentColor" style={{ verticalAlign: "-2px" }} /> {room.score} pts</span>}
          {state === "unlocked" && <span className="room-badge room-badge--open">{isCurrent ? "● CURRENT" : "OPEN"}</span>}
          {state === "exhausted" && <span className="room-badge" style={{ background: "color-mix(in srgb, var(--accent-2) 15%, transparent)", borderColor: "color-mix(in srgb, var(--accent-2) 50%, transparent)", color: "var(--accent-2)" }}>🧪 PRACTICE</span>}
          {state === "locked" && <span className="room-badge room-badge--lock"><Icon name="lock" size={11} stroke="currentColor" style={{ verticalAlign: "-1px" }} /> LOCKED</span>}
        </div>

        <div className="room-title">{room.title}</div>
        <div className="room-blurb">{room.blurb}</div>

        <div className="room-foot">
          <span className="room-type">
            {room.type.toUpperCase()} · {room.challenge_count} TASKS
            {room.max_attempts ? (
              <span style={{ marginLeft: 6, color: (room.max_attempts - (room.attempts || 0)) <= 1 ? 'var(--red)' : 'var(--accent-2)', fontWeight: 700 }}>
                · {Math.max(0, room.max_attempts - (room.attempts || 0))} attempt{Math.max(0, room.max_attempts - (room.attempts || 0)) !== 1 ? 's' : ''} left
              </span>
            ) : null}
          </span>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {state === "unlocked" && hasProgress && (
              <button className="btn" style={{ fontSize: 11, padding: '5px 10px' }}
                onClick={e => { e.stopPropagation(); onEnterFresh(room); }}>
                ↺ NEW
              </button>
            )}
            {state === "unlocked" && (
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 13px' }}
                onClick={e => { e.stopPropagation(); hasProgress ? onEnterResume(room) : onEnterFresh(room); }}>
                {hasProgress ? '▶ RESUME' : '▶ BEGIN'}
              </button>
            )}
            {state === "completed" && (
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 13px' }}
                onClick={e => { e.stopPropagation(); onEnterFresh(room); }}>
                ↺ REPLAY
              </button>
            )}
            {state === "exhausted" && (
              <button className="btn" style={{ fontSize: 12, padding: '6px 13px', color: 'var(--accent-2)', borderColor: 'color-mix(in srgb, var(--accent-2) 40%, transparent)' }}
                onClick={e => { e.stopPropagation(); onEnterPractice(room); }}>
                🧪 PRACTICE
              </button>
            )}
            {state === "locked" && (
              <span className="room-enter room-enter--lock">SEALED</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomMap({ token, rooms, me, loading, layout, isAdmin, activeSession, sessionRestored, testMode, onSessionRestoreDismiss, onEnter, onLeaderboard, onAdmin, onLogout, onRefresh, onJoinSession, onLeaveSession }) {
  const toast = window.useToast();
  const [joining, setJoining] = useStateMap(false);

  // In session mode: filter to session rooms + unlock all
  const sessionRooms = activeSession
    ? rooms.filter(r => (activeSession.module_ids || []).includes(r.id)).map(r => ({ ...r, unlocked: true }))
    : rooms;

  const sorted = [...sessionRooms].sort((a, b) => a.sequence - b.sequence);
  const current = sorted.find((r) => r.unlocked && !r.completed);

  function lockedClick() {
    toast("Clear the previous room first", "error");
  }

  function handleEnterFresh(room) {
    // fire startAttempt before entering — no race since room loads async after this
    window.api.startAttempt(token, room.id).catch(() => {});
    onEnter(room, 'fresh');
  }
  function handleEnterResume(room) {
    onEnter(room, 'resume');
  }
  function handleEnterPractice(room) {
    onEnter(room, 'practice');
  }

  function handleJoin(sess) {
    setJoining(false);
    onJoinSession(sess);
    toast("Joined session " + sess.code, "success");
  }

  function handleLeave() {
    onLeaveSession();
    toast("Left session", "info");
  }

  const allDone = sorted.length > 0 && sorted.every((r) => r.completed);

  return (
    <div style={mStyles.page}>
      <Hud me={me} isAdmin={isAdmin} activeSession={activeSession}
        onLeaderboard={onLeaderboard} onAdmin={onAdmin} onLogout={onLogout}
        onJoinSession={() => setJoining(true)} onLeaveSession={handleLeave} />

      {/* test mode banner */}
      {testMode && !activeSession && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderRadius: 10, marginBottom: 8, background: 'color-mix(in srgb, var(--accent-2) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 35%, transparent)' }}>
          <span style={{ fontSize: 14, color: 'var(--accent-2)' }}>🧪</span>
          <div>
            <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', color: 'var(--accent-2)' }}>TEST MODE ACTIVE</span>
            <span className="faint" style={{ fontSize: 11, marginLeft: 10 }}>Your scores won't appear on the leaderboard</span>
          </div>
        </div>
      )}

      {/* session restored banner */}
      {sessionRestored && activeSession && (
        <div className="glass reveal" style={{ ...mStyles.sessionBanner, background: 'color-mix(in srgb, var(--accent) 7%, transparent)', borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, color: 'var(--accent)' }}>↩</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.06em', color: 'var(--accent)' }}>SESSION RESUMED · {activeSession.code}</div>
              <div className="faint" style={{ fontSize: 11, marginTop: 1 }}>{activeSession.title} · your progress is intact</div>
            </div>
          </div>
          <button className="btn" onClick={onSessionRestoreDismiss}
            style={{ padding: '6px 12px', fontSize: 11 }}>✓ GOT IT</button>
        </div>
      )}

      {/* session banner */}
      {activeSession && (
        <div className="glass reveal" style={mStyles.sessionBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, color: 'var(--lime)' }}>⚡</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.06em', color: 'var(--lime)' }}>
                SESSION MODE · {activeSession.code}
              </div>
              <div className="faint" style={{ fontSize: 11, marginTop: 1 }}>{activeSession.title} · {sorted.length} room{sorted.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="faint" style={{ fontSize: 11 }}>{activeSession.participants_count} student{activeSession.participants_count !== 1 ? 's' : ''} joined</span>
          </div>
        </div>
      )}

      <div style={mStyles.header} className="reveal">
        <div className="eyebrow">{activeSession ? 'SESSION · ' + activeSession.code : 'MISSION PATH'}</div>
        <h1 style={mStyles.h1}>SELECT&nbsp;YOUR&nbsp;ROOM</h1>
        <p className="dim" style={mStyles.sub}>
          {activeSession
            ? <>{activeSession.title}. {current ? <>Next up: <span className="cyan glow-text">{current.title}</span>.</> : allDone ? <span className="lime glow-text">All session rooms cleared.</span> : null}</>
            : <>Ten sealed chambers. Clear each to break the next lock. {current ? <>Next up: <span className="cyan glow-text">{current.title}</span>.</> : allDone ? <span className="lime glow-text">All rooms cleared — you are legend.</span> : null}</>}
        </p>
      </div>

      {loading ? (
        <LoadingScreen label="MAPPING ROOMS" />
      ) : sorted.length === 0 && activeSession ? (
        <div className="glass reveal" style={{ padding: '40px 24px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
          <span className="faint">No rooms in this session yet.</span>
        </div>
      ) : layout === "grid" ? (
        <div style={mStyles.grid}>
          {sorted.map((room, i) => (
            <RoomNode key={room.id} room={room} index={i} side="grid" userId={me?.id}
              isCurrent={current && current.id === room.id}
              onEnterFresh={handleEnterFresh} onEnterResume={handleEnterResume} onEnterPractice={handleEnterPractice}
              onLockedClick={lockedClick} />
          ))}
        </div>
      ) : (
        <div className="spine-wrap">
          <div className="spine-line" aria-hidden="true" />
          {sorted.map((room, i) => (
            <RoomNode key={room.id} room={room} index={i} userId={me?.id}
              side={i % 2 === 0 ? "left" : "right"}
              isCurrent={current && current.id === room.id}
              onEnterFresh={handleEnterFresh} onEnterResume={handleEnterResume} onEnterPractice={handleEnterPractice}
              onLockedClick={lockedClick} />
          ))}
          <div className="spine-cap" aria-hidden="true">
            <Icon name="trophy" size={20} stroke={allDone ? "var(--lime)" : "var(--text-faint)"} />
          </div>
        </div>
      )}

      {joining && <JoinSessionModal token={token} onJoin={handleJoin} onCancel={() => setJoining(false)} />}
    </div>
  );
}

const hStyles = {
  bar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 18px", position: "sticky", top: 16, zIndex: 50, marginBottom: 8 },
  left: { display: "flex", alignItems: "center" },
  logo: { display: "flex", alignItems: "center", gap: 10, fontSize: 15 },
  stats: { display: "flex", alignItems: "center", gap: 18 },
  stat: { display: "flex", alignItems: "center", gap: 9 },
  statNum: { fontSize: 19, fontWeight: 800, lineHeight: 1, letterSpacing: "0.02em" },
  sep: { width: 1, height: 30, background: "var(--hairline)" },
  actions: { display: "flex", alignItems: "center", gap: 8 }
};

const mStyles = {
  page: { width: "min(1040px, 94vw)", margin: "0 auto", padding: "20px 0 90px" },
  header: { textAlign: "center", margin: "28px 0 30px" },
  h1: { fontSize: "clamp(28px, 5vw, 46px)", letterSpacing: "0.14em", margin: "10px 0 0", fontWeight: 800 },
  sub: { fontSize: 14.5, maxWidth: 560, margin: "14px auto 0", lineHeight: 1.7 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 },
  sessionBanner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 18px', marginBottom: 0, border: '1px solid color-mix(in srgb, var(--lime) 30%, transparent)', background: 'color-mix(in srgb, var(--lime) 5%, transparent)', flexWrap: 'wrap' },
};

window.RoomMap = RoomMap;
