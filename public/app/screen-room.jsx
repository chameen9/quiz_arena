// screen-room.jsx — in-room challenge gameplay
const { useState: useStateRoom, useEffect: useEffectRoom, useRef: useRefRoom, useCallback: useCBRoom } = React;

const ROOM_PROGRESS_KEY = "quiz_arena_room_progress_v1";

function getRoomProgress(roomId, userId) {
  try {
    const d = JSON.parse(localStorage.getItem(ROOM_PROGRESS_KEY) || "{}");
    return d[`${userId}_${roomId}`] || 0;
  } catch { return 0; }
}
function setRoomProgress(roomId, idx, userId) {
  try {
    const d = JSON.parse(localStorage.getItem(ROOM_PROGRESS_KEY) || "{}");
    d[`${userId}_${roomId}`] = idx;
    localStorage.setItem(ROOM_PROGRESS_KEY, JSON.stringify(d));
  } catch {}
}
function clearRoomProgress(roomId, userId) {
  try {
    const d = JSON.parse(localStorage.getItem(ROOM_PROGRESS_KEY) || "{}");
    delete d[`${userId}_${roomId}`];
    localStorage.setItem(ROOM_PROGRESS_KEY, JSON.stringify(d));
  } catch {}
}

function Timer({ limit, running, onTimeout, resetKey }) {
  const [left, setLeft] = useStateRoom(limit);
  const ref = useRefRoom(null);
  const firedRef = useRefRoom(false);

  useEffectRoom(() => {
    setLeft(limit);
    firedRef.current = false;
  }, [resetKey, limit]);

  useEffectRoom(() => {
    if (!running) { clearInterval(ref.current); return; }
    ref.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 0.1) {
          clearInterval(ref.current);
          if (!firedRef.current) { firedRef.current = true; setTimeout(onTimeout, 0); }
          return 0;
        }
        return Math.max(0, l - 0.1);
      });
    }, 100);
    return () => clearInterval(ref.current);
  }, [running, resetKey]);

  const pct = (left / limit) * 100;
  const danger = left <= 5;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Icon name="clock" size={18} stroke={danger ? "var(--red)" : "var(--accent)"} />
      <div style={rStyles.timerTrack}>
        <div style={{
          ...rStyles.timerFill,
          width: pct + "%",
          background: danger ? "var(--red)" : "linear-gradient(90deg, var(--accent), var(--accent-2))",
          boxShadow: `0 0 calc(12px * var(--glow-mult)) ${danger ? "var(--red)" : "var(--accent)"}`
        }} />
      </div>
      <span className={danger ? "red glow-text" : "cyan"} style={{
        fontVariantNumeric: "tabular-nums", fontWeight: 700, minWidth: 42, textAlign: "right",
        fontSize: 16, animation: danger ? "blink calc(0.6s / var(--speed)) steps(1) infinite" : "none"
      }}>{left.toFixed(1)}s</span>
    </div>
  );
}

function CodeBlock({ material, language }) {
  const lines = (material || "").split("\n");
  return (
    <div style={rStyles.code} className="glass">
      <div style={rStyles.codeBar}>
        <span style={{ display: "flex", gap: 6 }}>
          <i style={{ ...rStyles.dot, background: "var(--red)" }} />
          <i style={{ ...rStyles.dot, background: "var(--accent-2)" }} />
          <i style={{ ...rStyles.dot, background: "var(--lime)" }} />
        </span>
        <span className="faint" style={{ fontSize: 11, letterSpacing: "0.1em" }}>{(language || "code").toUpperCase()}</span>
      </div>
      <pre style={rStyles.pre}>
        {lines.map((ln, i) => (
          <div key={i} style={rStyles.codeLine}>
            <span style={rStyles.lineNo}>{i + 1}</span>
            <code style={{ whiteSpace: "pre-wrap" }}>{ln || " "}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}

function RoomScreen({ token, roomId, mode = 'fresh', userId, onExit, onCompleted }) {
  const toast = window.useToast();
  const [data, setData] = useStateRoom(null);
  const [loading, setLoading] = useStateRoom(true);
  const [idx, setIdx] = useStateRoom(0);
  const [answer, setAnswer] = useStateRoom("");
  const [selected, setSelected] = useStateRoom([]);
  const [startedAt, setStartedAt] = useStateRoom(Date.now());
  const [submitting, setSubmitting] = useStateRoom(false);
  const [result, setResult] = useStateRoom(null); // {correct, ...}
  const [score, setScore] = useStateRoom(0);
  const [streak, setStreak] = useStateRoom(0);
  const [shake, setShake] = useStateRoom(false);
  const [flash, setFlash] = useStateRoom(false);
  const [finished, setFinished] = useStateRoom(null); // summary when room done
  const [resumePrompt, setResumePrompt] = useStateRoom(null); // saved idx to resume from
  const [isTestMode, setIsTestMode] = useStateRoom(false);
  const cardRef = useRefRoom(null);

  useEffectRoom(() => {
    let alive = true;
    setLoading(true);
    window.api._resetRoomBuffer(token, Number(roomId));
    // fresh/practice: wipe stale progress so no resume dialog appears
    if (mode !== 'resume') clearRoomProgress(roomId, userId);
    window.api.room(token, roomId).then((d) => {
      if (!alive) return;
      setData(d);
      setIsTestMode(d.test_mode || mode === 'practice');
      setLoading(false);
      setStartedAt(Date.now());
      // only check saved progress in resume mode
      if (mode === 'resume') {
        const saved = getRoomProgress(roomId, userId);
        if (saved > 0 && saved < (d.challenges || []).length) {
          setResumePrompt(saved);
        }
      }
    }).catch((e) => {
      toast(e.message || "Could not load room", "error");
      onExit();
    });
    return () => { alive = false; };
  }, [roomId]);

  const challenges = data?.challenges || [];
  const ch = challenges[idx];
  const total = challenges.length;
  const isLast = idx === total - 1;

  function resetForNext() {
    setAnswer(""); setSelected([]); setResult(null);
    setStartedAt(Date.now());
  }

  const isChoice = ch && (ch.type === "mcq" || ch.type === "msq");
  function toggleOpt(id) {
    if (ch.type === "msq") setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
    else setSelected([id]);
  }

  async function doSubmit(timedOut) {
    if (submitting || result) return;
    const ans = isChoice ? selected : answer;
    if (!timedOut && isChoice && selected.length === 0) { toast("Pick an option", "info"); return; }
    if (!timedOut && !isChoice && !answer.trim()) { toast("Type an answer", "info"); return; }
    setSubmitting(true);
    const time_taken = timedOut ? ch.time_limit : Math.min(ch.time_limit, (Date.now() - startedAt) / 1000);
    try {
      const res = await window.api.submit(token, ch.id, { answer: timedOut ? "" : ans, time_taken });
      setResult(res);
      if (res.correct) {
        setScore((s) => s + res.points_awarded);
        setStreak((s) => s + 1);
        setFlash(true); setTimeout(() => setFlash(false), 700);
        toast(`+${res.points_awarded} PTS`, "success");
      } else {
        setStreak(0);
        setShake(true); setTimeout(() => setShake(false), 520);
        toast(res.timed_out ? "TIME'S UP" : "INCORRECT", "error");
      }
      if (res.module_completed) {
        setFinished({
          score: score + (res.correct ? res.points_awarded : 0),
          next_room_unlocked: res.next_room_unlocked
        });
      }
    } catch (e) {
      toast(e.message || "Submit failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (finished) { clearRoomProgress(roomId, userId); onCompleted(finished); return; }
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    setRoomProgress(roomId, nextIdx, userId);
    resetForNext();
  }

  if (loading) return (<div style={rStyles.page}><LoadingScreen label="ENTERING ROOM" /></div>);

  if (resumePrompt !== null) {
    // disable Start Over when all attempts are used (starting over can't help, and is confusing)
    const startOverLocked = data?.max_attempts != null && data?.attempts >= data?.max_attempts;
    return (
      <div style={rStyles.page}>
        <div className="center-screen">
          <div className="glass reveal" style={{ width: "min(420px, 92vw)", padding: "28px 26px" }}>
            <div className="eyebrow" style={{ marginBottom: 8, fontSize: 10 }}>PROGRESS FOUND</div>
            <h2 style={{ fontSize: 20, letterSpacing: "0.08em", marginBottom: 10 }}>RESUME ROOM?</h2>
            <p className="faint" style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
              You left off at question <span className="cyan" style={{ fontWeight: 800 }}>{resumePrompt + 1}</span> of <span style={{ fontWeight: 700 }}>{total}</span>.
              {startOverLocked
                ? <span style={{ display: 'block', marginTop: 8, color: 'var(--red)', fontSize: 12, fontWeight: 700 }}>⚠ Last attempt — you must resume from here.</span>
                : ' Resume from there, or restart from Q1.'}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn" disabled={startOverLocked} onClick={() => {
                clearRoomProgress(roomId, userId);
                setResumePrompt(null);
              }} style={{ flex: 1, opacity: startOverLocked ? 0.35 : 1, cursor: startOverLocked ? 'not-allowed' : undefined }}>↺ START OVER</button>
              <button className="btn btn-primary" onClick={() => {
                setIdx(resumePrompt);
                setResumePrompt(null);
              }} style={{ flex: 1 }}>▶ RESUME · Q{resumePrompt + 1}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ch) return null;

  const correctCount = streak; // not exact but fine for HUD vibe
  const progressPct = ((idx + (result ? 1 : 0)) / total) * 100;

  // finish celebration overlay
  if (finished && result) {
    return <RoomComplete module={data.module} summary={finished} streak={streak} onContinue={() => onCompleted(finished)} />;
  }

  return (
    <div style={rStyles.page}>
      {/* top bar */}
      <div style={rStyles.topbar} className="reveal">
        <button className="btn" onClick={() => { setRoomProgress(roomId, idx, userId); onExit(); }} style={{ padding: "10px 14px" }}>
          <Icon name="back" size={16} stroke="currentColor" style={{ verticalAlign: "-3px", marginRight: 6 }} />MAP
        </button>
        <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
          <div className="eyebrow" style={{ fontSize: 9 }}>ROOM {String(data.module.sequence).padStart(2, "0")} · {data.module.type.toUpperCase()}</div>
          <div style={{ fontWeight: 800, letterSpacing: "0.08em", fontSize: 13, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase" }}>{data.module.title}</div>
          {isTestMode && <div style={{ marginTop: 3, fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--accent-2)' }}>🧪 TEST MODE</div>}
        </div>
        <div style={rStyles.miniHud}>
          <div style={rStyles.miniStat}>
            <span className="faint" style={{ fontSize: 9, letterSpacing: "0.1em" }}>SCORE</span>
            <span className="cyan glow-text" style={{ fontWeight: 800, fontSize: 16 }}><CountUp value={score} /></span>
          </div>
          <div style={rStyles.miniStat}>
            <span className="faint" style={{ fontSize: 9, letterSpacing: "0.1em" }}>STREAK</span>
            <span className={streak > 0 ? "mag glow-text" : "faint"} style={{ fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 4 }}>
              {streak > 0 && <Icon name="flame" size={14} stroke="var(--accent-2)" />}{streak}
            </span>
          </div>
        </div>
      </div>

      {/* progress dots */}
      <div style={rStyles.progress} className="reveal">
        <div style={rStyles.progTrack}>
          <div style={{ ...rStyles.progFill, width: progressPct + "%" }} />
        </div>
        <div className="prog-dots-wrap" style={rStyles.progDots}>
          {challenges.map((c, i) => (
            <span key={c.id} style={{
              ...rStyles.progDot,
              background: i < idx ? "var(--lime)" : i === idx ? "var(--accent)" : "rgba(255,255,255,0.12)",
              boxShadow: i === idx ? "0 0 calc(10px * var(--glow-mult)) var(--accent)" : "none"
            }} />
          ))}
        </div>
        <span className="prog-count faint" style={{ fontSize: 11, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{idx + 1} / {total}</span>
      </div>

      {/* challenge card */}
      <div ref={cardRef} className={"glass reveal " + (shake ? "shake" : "") + (flash ? " flash-correct" : "")}
        style={rStyles.card} key={ch.id}>
        <Timer limit={ch.time_limit} running={!result && !submitting} resetKey={ch.id} onTimeout={() => doSubmit(true)} />

        <div style={rStyles.promptRow}>
          <span style={rStyles.qTag}>TASK {String(idx + 1).padStart(2, "0")}</span>
          <span style={rStyles.ptsTag}><Icon name="bolt" size={13} stroke="var(--accent)" style={{ verticalAlign: "-2px" }} /> {ch.points} pts</span>
        </div>
        <h2 style={rStyles.prompt}>{ch.prompt}</h2>

        {ch.material && <CodeBlock material={ch.material} language={ch.language} />}

        {ch.image && (
          <div style={rStyles.stemImg} className="glass">
            <img src={ch.image} alt="question reference" style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 8, display: "block", margin: "0 auto" }} />
          </div>
        )}

        {/* answer input */}
        {!result && (
          isChoice ? (
            <div style={{ marginTop: 18 }}>
              {ch.type === "msq" && <div className="eyebrow" style={{ marginBottom: 10, color: "var(--accent-2)" }}>◧ SELECT ALL THAT APPLY</div>}
              <div style={ch.options.some((o) => o.image) ? rStyles.optionsGrid : rStyles.options}>
                {ch.options.map((opt, i) => (
                  <button key={opt.id} className="opt-btn" data-selected={selected.includes(opt.id)}
                    data-shape={ch.type === "msq" ? "box" : "round"}
                    onClick={() => toggleOpt(opt.id)}>
                    <span className="opt-key">{String.fromCharCode(65 + i)}</span>
                    {opt.image && <img src={opt.image} alt="" style={{ maxWidth: "100%", maxHeight: 140, borderRadius: 6, display: "block" }} />}
                    {opt.text && <code style={{ whiteSpace: "pre-wrap" }}>{opt.text}</code>}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 18 }}>
              <label className="field-label">{ch.type === "regex" ? "ENTER COMMAND" : "YOUR ANSWER"}</label>
              <div style={rStyles.answerWrap}>
                <span className="cyan" style={{ fontWeight: 700 }}>{ch.type === "regex" ? "$" : "›"}</span>
                <input className="field" style={{ border: "none", background: "transparent", padding: "8px 0", boxShadow: "none" }}
                  value={answer} onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") doSubmit(false); }}
                  placeholder={ch.type === "regex" ? "type the command…" : "type your answer…"}
                  autoFocus />
              </div>
            </div>
          )
        )}

        {/* reveal panel */}
        {result && (
          <div className="reveal" style={{
            ...rStyles.reveal,
            borderColor: result.correct ? "color-mix(in srgb, var(--lime) 50%, transparent)" : "color-mix(in srgb, var(--red) 50%, transparent)",
            background: result.correct ? "color-mix(in srgb, var(--lime) 8%, transparent)" : "color-mix(in srgb, var(--red) 8%, transparent)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center",
                background: result.correct ? "var(--lime)" : "var(--red)", color: "#06110a"
              }}>{result.correct ? <Icon name="check" size={18} stroke="#06110a" /> : "✕"}</span>
              <span className={result.correct ? "lime glow-text" : "red glow-text"} style={{ fontWeight: 800, letterSpacing: "0.1em", fontSize: 16 }}>
                {result.correct ? `CORRECT  ·  +${result.points_awarded} PTS` : result.timed_out ? "TIME EXPIRED" : "INCORRECT"}
              </span>
            </div>
            {!result.correct && (
              <div style={{ marginTop: 12 }}>
                <span className="faint" style={{ fontSize: 11, letterSpacing: "0.1em" }}>CORRECT ANSWER</span>
                <div style={rStyles.correctAns}><code style={{ whiteSpace: "pre-wrap" }}>{result.correct_answer}</code></div>
              </div>
            )}
            <div style={{ marginTop: 12, display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span className="cyan" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", flexShrink: 0 }}>HINT ›</span>
              <span className="dim" style={{ fontSize: 13, lineHeight: 1.6 }}>{result.hint}</span>
            </div>
          </div>
        )}

        {/* actions */}
        <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 12 }}>
          {!result ? (
            <button className="btn btn-primary" onClick={() => doSubmit(false)} disabled={submitting} style={{ minWidth: 160 }}>
              {submitting ? "CHECKING…" : "▶ SUBMIT"}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={next} style={{ minWidth: 180 }}>
              {isLast ? "★ FINISH ROOM" : "NEXT TASK →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Room complete celebration -------------------------------------------
function RoomComplete({ module, summary, streak, onContinue }) {
  useEffectRoom(() => {
    const t = setTimeout(onContinue, 4200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={rStyles.page}>
      <div className="center-screen">
        <div style={{ textAlign: "center", maxWidth: 520 }}>
          <div className="reveal" style={rcStyles.ring}>
            <Icon name="check" size={48} stroke="var(--lime)" />
            <div style={rcStyles.ringGlow} />
          </div>
          <div className="eyebrow reveal lime" style={{ animationDelay: ".15s", letterSpacing: "0.35em" }}>ROOM CLEARED</div>
          <h1 className="reveal glow-text lime" style={{ ...rcStyles.title, animationDelay: ".2s" }}>{module.title}</h1>

          <div className="glass reveal" style={{ ...rcStyles.scoreCard, animationDelay: ".3s" }}>
            <div style={rcStyles.scoreItem}>
              <span className="faint" style={rcStyles.scoreLbl}>ROOM SCORE</span>
              <span className="cyan glow-text" style={rcStyles.scoreBig}>+<CountUp value={summary.score} /></span>
            </div>
            <div style={{ width: 1, background: "var(--hairline)" }} />
            <div style={rcStyles.scoreItem}>
              <span className="faint" style={rcStyles.scoreLbl}>BEST STREAK</span>
              <span className="mag glow-text" style={rcStyles.scoreBig}>{streak}🔥</span>
            </div>
          </div>

          {summary.next_room_unlocked ? (
            <div className="reveal" style={{ ...rcStyles.unlock, animationDelay: ".45s" }}>
              <span style={rcStyles.unlockIcon}><Icon name="enter" size={18} stroke="var(--accent)" /></span>
              <span className="cyan glow-text" style={{ fontWeight: 700, letterSpacing: "0.1em" }}>NEXT ROOM UNLOCKED</span>
            </div>
          ) : (
            <div className="reveal faint" style={{ marginTop: 22, fontSize: 13 }}>Already cleared — best score kept.</div>
          )}

          <button className="btn btn-primary reveal" onClick={onContinue}
            style={{ marginTop: 28, animationDelay: ".55s", minWidth: 220 }}>
            ▶ RETURN TO MAP
          </button>
        </div>
      </div>
    </div>
  );
}

const rcStyles = {
  ring: { width: 96, height: 96, margin: "0 auto 22px", borderRadius: "50%", display: "grid", placeItems: "center", position: "relative", border: "2px solid var(--lime)", background: "color-mix(in srgb, var(--lime) 10%, transparent)" },
  ringGlow: { position: "absolute", inset: -8, borderRadius: "50%", boxShadow: "0 0 calc(50px * var(--glow-mult)) color-mix(in srgb, var(--lime) 55%, transparent)", animation: "ringPulse calc(2s / var(--speed)) ease-in-out infinite" },
  title: { fontSize: "clamp(26px, 5vw, 40px)", margin: "10px 0 0", letterSpacing: "0.12em" },
  scoreCard: { display: "flex", gap: 26, padding: "22px 30px", marginTop: 28, justifyContent: "center" },
  scoreItem: { display: "flex", flexDirection: "column", gap: 8, alignItems: "center", minWidth: 130 },
  scoreLbl: { fontSize: 10, letterSpacing: "0.18em" },
  scoreBig: { fontSize: 34, fontWeight: 800, lineHeight: 1 },
  unlock: { marginTop: 24, display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 22px", borderRadius: 999, background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)", boxShadow: "0 0 calc(24px * var(--glow-mult)) color-mix(in srgb, var(--accent) 30%, transparent)" },
  unlockIcon: { display: "grid", placeItems: "center" }
};

const rStyles = {
  page: { width: "min(760px, 94vw)", margin: "0 auto", padding: "20px 0 90px", minHeight: "100vh" },
  topbar: { display: "flex", alignItems: "center", gap: 14, padding: "12px 0 18px" },
  miniHud: { display: "flex", gap: 16 },
  miniStat: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, minWidth: 56 },
  progress: { display: "flex", alignItems: "center", gap: 14, margin: "4px 0 20px" },
  progTrack: { display: "none" },
  progFill: { display: "none" },
  progDots: { display: "flex", gap: 8, flex: 1 },
  progDot: { height: 6, flex: 1, borderRadius: 4, transition: "all .3s ease" },
  card: { padding: "22px 24px 24px" },
  promptRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22 },
  qTag: { fontSize: 11, letterSpacing: "0.14em", color: "var(--text-faint)", fontWeight: 700 },
  ptsTag: { fontSize: 12, letterSpacing: "0.08em", color: "var(--text-dim)" },
  prompt: { fontSize: 19, fontWeight: 700, lineHeight: 1.45, margin: "12px 0 18px", textTransform: "none", letterSpacing: "0.01em" },
  code: { margin: "0 0 4px", padding: 0, overflow: "hidden" },
  codeBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--hairline)", background: "rgba(0,0,0,0.25)" },
  dot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block", opacity: 0.85 },
  pre: { margin: 0, padding: "14px 16px", fontSize: 13.5, lineHeight: 1.7, overflowX: "auto", background: "rgba(0,0,0,0.32)" },
  codeLine: { display: "flex", gap: 16 },
  lineNo: { color: "var(--text-faint)", userSelect: "none", minWidth: 18, textAlign: "right", opacity: 0.6 },
  options: { display: "grid", gap: 10, marginTop: 4 },
  optionsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginTop: 4 },
  stemImg: { marginTop: 14, padding: 10 },
  answerWrap: { display: "flex", alignItems: "center", gap: 12, padding: "6px 16px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--glass-border)", borderRadius: 9 },
  reveal: { marginTop: 18, padding: "16px 18px", borderRadius: 12, border: "1px solid" },
  correctAns: { marginTop: 6, padding: "10px 14px", background: "rgba(0,0,0,0.4)", borderRadius: 8, border: "1px solid var(--hairline)", fontSize: 14, color: "var(--lime)" }
};

window.RoomScreen = RoomScreen;
