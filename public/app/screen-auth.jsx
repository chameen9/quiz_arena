// screen-auth.jsx — login / register
const { useState: useStateAuth, useEffect: useEffectAuth, useRef: useRefAuth } = React;
const Avatar = window.Avatar || (() => null);
const AVATAR_COLORS = window.AVATAR_COLORS || ['#00E5FF', '#FF3DCB', '#5CFF8F', '#FFB000', '#7A5CFF', '#FF4D6D'];

function BatchSelect({ value, options, onChange }) {
  const [open, setOpen] = useStateAuth(false);
  const ref = useRefAuth(null);

  useEffectAuth(() => {
    if (!open) return;
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const label = value || '— select batch —';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="field"
        style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: value ? 'var(--text)' : 'var(--text-faint)' }}>
        <span>{label}</span>
        <span style={{ fontSize: 10, opacity: 0.6, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'rgba(6,14,22,0.97)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          {['', ...options].map((opt, i) => (
            <div key={i} onMouseDown={() => { onChange({ target: { value: opt } }); setOpen(false); }}
              style={{ padding: '11px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--mono)', letterSpacing: '0.04em', color: opt === value ? 'var(--accent)' : opt ? 'var(--text)' : 'var(--text-faint)', background: opt === value ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent', borderBottom: i < options.length ? '1px solid var(--hairline)' : 'none', transition: 'background .12s' }}
              onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background = 'transparent'; }}>
              {opt || '— select batch —'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuthScreen({ onAuthed }) {
  const toast = window.useToast();
  const [mode, setMode] = useStateAuth("login"); // 'login' | 'register'
  const [form, setForm] = useStateAuth({ name: "", email: "", password: "", batch: "", gender: "m", avatar_color: "#00E5FF" });
  const [busy, setBusy] = useStateAuth(false);
  const [err, setErr] = useStateAuth(null);
  const [batchOptions, setBatchOptions] = useStateAuth([]);

  useEffectAuth(() => {
    if (mode !== "register") return;
    window.api.batches().then(({ batches }) => setBatchOptions(batches)).catch(() => {});
  }, [mode]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (mode === "register" && !form.name.trim()) { setErr("Enter a handle / name."); return; }
    if (mode === "register" && !form.batch.trim()) { setErr("Select your batch / group."); return; }
    if (!form.email.trim() || !form.password) { setErr("Email and password required."); return; }
    setBusy(true);
    try {
      const res = mode === "login"
        ? await window.api.login({ email: form.email, password: form.password })
        : await window.api.register(form);
      toast(mode === "login" ? "ACCESS GRANTED" : "OPERATIVE REGISTERED", "success");
      onAuthed(res.token, res.user && res.user.role);
    } catch (ex) {
      setErr(ex.message || "Something went wrong.");
      toast(ex.message || "Auth failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div style={aStyles.shell}>
        {/* brand */}
        <div className="reveal" style={{ ...aStyles.brand, animationDelay: "0.05s" }}>
          <div style={aStyles.brandMark}>
            <Icon name="terminal" size={26} stroke="var(--accent)" />
          </div>
          <div>
            <div style={aStyles.brandName} className="glow-text cyan">QUIZ&nbsp;ARENA</div>
            <div className="eyebrow" style={{ marginTop: 4 }}>10 ROOMS · 1 LEADERBOARD · NO MERCY</div>
          </div>
        </div>

        <form onSubmit={submit} className="glass reveal" style={{ ...aStyles.card, animationDelay: "0.16s" }}>
          {/* tab toggle */}
          <div style={aStyles.tabs}>
            <button type="button" onClick={() => { setMode("login"); setErr(null); }}
              style={{ ...aStyles.tab, ...(mode === "login" ? aStyles.tabActive : {}) }}>
              ./login
            </button>
            <button type="button" onClick={() => { setMode("register"); setErr(null); }}
              style={{ ...aStyles.tab, ...(mode === "register" ? aStyles.tabActive : {}) }}>
              ./register
            </button>
            <div style={{ ...aStyles.tabInk, left: mode === "login" ? "4px" : "calc(50% + 0px)" }} />
          </div>

          <div style={aStyles.prompt}>
            <span className="faint">arena@codeverse</span>
            <span className="dim">:~$ </span>
            <span className="cyan">{mode === "login" ? "auth --login" : "auth --new"}</span>
            <span className="caret" />
          </div>

          <div style={{ display: "grid", gap: 16, marginTop: 22 }}>
            {mode === "register" && (
              <div className="reveal">
                <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Handle / Name</span>
                  <span className="faint" style={{ fontSize: 10 }}>{form.name.length}/20</span>
                </label>
                <input className="field" value={form.name} onChange={set("name")}
                  placeholder="e.g. byte_runner" autoComplete="off" maxLength={20} />
              </div>
            )}
            {mode === "register" && (
              <div className="reveal">
                <label className="field-label">Avatar</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ v: 'm', label: '♂ M' }, { v: 'f', label: '♀ F' }].map(({ v, label }) => (
                      <button key={v} type="button" onClick={() => setForm(f => ({ ...f, gender: v }))}
                        className="btn" style={{ padding: '6px 13px', fontSize: 12, ...(form.gender === v ? { background: 'color-mix(in srgb, var(--accent) 16%, transparent)', borderColor: 'var(--accent)', color: 'var(--accent)' } : {}) }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {AVATAR_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                        style={{ width: 24, height: 24, borderRadius: 5, background: c, border: form.avatar_color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
                    ))}
                  </div>
                  {form.name.trim() && <Avatar name={form.name} gender={form.gender} color={form.avatar_color} size={38} style={{ borderRadius: 8, border: '1px solid var(--glass-border)' }} />}
                </div>
              </div>
            )}
            {mode === "register" && (
              <div className="reveal">
                <label className="field-label">Batch / Group <span className="red" style={{ fontSize: 11 }}>*</span></label>
                {batchOptions.length > 0 ? (
                  <BatchSelect value={form.batch} options={batchOptions} onChange={set("batch")} />
                ) : (
                  <input className="field" value={form.batch} onChange={set("batch")}
                    placeholder="e.g. IT-2024-A" autoComplete="off" />
                )}
              </div>
            )}
            <div>
              <label className="field-label">Email</label>
              <input className="field" type="email" value={form.email} onChange={set("email")}
                placeholder="operative@codeverse.dev" autoComplete="off" />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input className="field" type="password" value={form.password} onChange={set("password")}
                placeholder="••••••••" autoComplete="off" />
            </div>
          </div>

          {err && <div style={aStyles.err} className="reveal">⚠ {err}</div>}

          <button type="submit" className="btn btn-primary" disabled={busy}
            style={{ width: "100%", marginTop: 22, padding: "15px" }}>
            {busy ? "AUTHENTICATING…" : mode === "login" ? "▶ ENTER ARENA" : "▶ CREATE & ENTER"}
          </button>

          <div style={aStyles.switch}>
            {mode === "login" ? "No credentials yet?" : "Already an operative?"}{" "}
            <button type="button" className="cyan" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(null); }}
              style={aStyles.link}>
              {mode === "login" ? "register →" : "← login"}
            </button>
          </div>
        </form>

        <div className="reveal faint" style={{ ...aStyles.tip, animationDelay: "0.3s" }}>
          tip: register a new handle — your progress saves to your account.
        </div>
      </div>
    </div>
  );
}

const aStyles = {
  shell: { width: "min(440px, 92vw)", display: "flex", flexDirection: "column", gap: 22 },
  brand: { display: "flex", alignItems: "center", gap: 16 },
  brandMark: { width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 12, background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)", boxShadow: "0 0 calc(22px * var(--glow-mult)) color-mix(in srgb, var(--accent) 35%, transparent)" },
  brandName: { fontSize: 26, fontWeight: 800, letterSpacing: "0.16em" },
  card: { padding: "26px 26px 24px" },
  tabs: { position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", background: "rgba(0,0,0,0.35)", borderRadius: 10, padding: 4, border: "1px solid var(--hairline)" },
  tab: { position: "relative", zIndex: 2, background: "transparent", border: "none", color: "var(--text-dim)", fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.1em", padding: "10px", cursor: "pointer", borderRadius: 7, transition: "color .2s" },
  tabActive: { color: "#fff" },
  tabInk: { position: "absolute", top: 4, bottom: 4, width: "calc(50% - 4px)", background: "color-mix(in srgb, var(--accent) 16%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)", borderRadius: 7, transition: "left .25s cubic-bezier(.22,1,.36,1)", zIndex: 1 },
  prompt: { marginTop: 22, fontSize: 13, padding: "12px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 8, border: "1px solid var(--hairline)", whiteSpace: "nowrap", overflow: "hidden" },
  err: { marginTop: 16, color: "var(--red)", fontSize: 13, padding: "10px 14px", background: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)", borderRadius: 8 },
  switch: { marginTop: 18, textAlign: "center", fontSize: 13, color: "var(--text-dim)" },
  link: { background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.04em", textShadow: "0 0 10px color-mix(in srgb, var(--accent) 60%, transparent)" },
  tip: { textAlign: "center", fontSize: 12, letterSpacing: "0.04em" }
};

window.AuthScreen = AuthScreen;
