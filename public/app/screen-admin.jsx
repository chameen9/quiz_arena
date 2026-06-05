// screen-admin.jsx — Instructor / Admin console: manage rooms & questions
const { useState: useStateAd, useEffect: useEffectAd, useRef: useRefAd } = React;

const Q_TYPES = [
  { id: "mcq", label: "MCQ", desc: "Single answer" },
  { id: "msq", label: "MSQ", desc: "Select all" },
  { id: "text", label: "TEXT", desc: "Typed answer" },
  { id: "regex", label: "REGEX", desc: "Command / pattern" }
];
// ICON_OPTIONS is exported from common.jsx via window; reference it directly

function newOption() { return { id: window.api.admin.newId("o"), text: "", image: null }; }
function newQuestion() {
  return {
    id: window.api.admin.newId("q"), type: "mcq", prompt: "", material: "", language: "text",
    image: null, options: [newOption(), newOption()], correct: [], answer: "",
    answer_pattern: "", answer_display: "", hint: "", points: 100, time_limit: 30
  };
}

// ---- CSV bulk-import helpers --------------------------------
function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += c;
  }
  result.push(cur);
  return result.map(s => s.trim());
}

function csvToQuestions(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const questions = [], errors = [];
  const LETTERS = { a: 0, b: 1, c: 2, d: 3 };
  const start = lines.length && /^type/i.test(lines[0]) ? 1 : 0;

  lines.slice(start).forEach((line, li) => {
    const row = li + start + 1;
    const c = parseCsvLine(line);
    const type = (c[0] || 'mcq').toLowerCase();
    if (!['mcq', 'msq', 'text', 'regex'].includes(type)) {
      errors.push(`Row ${row}: unknown type "${c[0] || ''}"`); return;
    }
    const prompt = c[1] || '';
    if (!prompt) { errors.push(`Row ${row}: empty prompt`); return; }

    const rawOpts = [c[2], c[3], c[4], c[5]].map(s => (s || '').trim()).filter(s => s);
    const correctRaw = (c[6] || '').trim();
    const hint = (c[7] || '').trim();
    const points = Math.max(10, Math.min(500, parseInt(c[8]) || 100));
    const time_limit = Math.max(5, Math.min(300, parseInt(c[9]) || 30));

    const q = {
      id: window.api.admin.newId('q'), type, prompt,
      material: '', language: 'text', image: null,
      options: [], correct: [], answer: '',
      answer_pattern: '', answer_display: '',
      hint, points, time_limit,
    };

    if (type === 'mcq' || type === 'msq') {
      if (rawOpts.length < 2) { errors.push(`Row ${row}: need ≥2 options`); return; }
      q.options = rawOpts.map(text => ({ id: window.api.admin.newId('o'), text, image: null }));
      const letters = correctRaw.toLowerCase().split(/[,;+\s]+/).map(l => l.trim()).filter(l => l);
      q.correct = letters.map(l => {
        const idx = LETTERS[l];
        return (idx !== undefined && q.options[idx]) ? q.options[idx].id : null;
      }).filter(Boolean);
      if (!q.correct.length) errors.push(`Row ${row}: no valid correct letter — use A, B, C or D`);
      if (type === 'mcq' && q.correct.length > 1) q.correct = [q.correct[0]];
    } else if (type === 'text') {
      q.answer = correctRaw;
      if (!q.answer) errors.push(`Row ${row}: no answer for text type`);
    } else {
      q.answer_pattern = correctRaw;
      q.answer_display = rawOpts[0] || correctRaw;
      if (!q.answer_pattern) errors.push(`Row ${row}: no pattern for regex type`);
    }
    questions.push(q);
  });
  return { questions, errors };
}

// ============================================================
//  QUESTION EDITOR (modal)
// ============================================================
function QuestionEditor({ initial, index, onSave, onCancel }) {
  const [q, setQ] = useStateAd(() => JSON.parse(JSON.stringify(initial)));
  const set = (k, v) => setQ((p) => ({ ...p, [k]: v }));
  const isChoice = q.type === "mcq" || q.type === "msq";

  function setType(t) {
    setQ((p) => {
      const next = { ...p, type: t };
      if ((t === "mcq" || t === "msq") && (!p.options || !p.options.length))
        next.options = [newOption(), newOption()];
      if (t === "mcq" && p.correct && p.correct.length > 1) next.correct = [p.correct[0]];
      return next;
    });
  }
  function setOpt(id, patch) { setQ((p) => ({ ...p, options: p.options.map((o) => o.id === id ? { ...o, ...patch } : o) })); }
  function addOpt() { setQ((p) => ({ ...p, options: [...p.options, newOption()] })); }
  function delOpt(id) { setQ((p) => ({ ...p, options: p.options.filter((o) => o.id !== id), correct: (p.correct || []).filter((c) => c !== id) })); }
  function toggleCorrect(id) {
    setQ((p) => {
      if (p.type === "mcq") return { ...p, correct: [id] };
      const has = (p.correct || []).includes(id);
      return { ...p, correct: has ? p.correct.filter((c) => c !== id) : [...(p.correct || []), id] };
    });
  }

  function validate() {
    if (!q.prompt.trim()) return "Add a prompt.";
    if (isChoice) {
      if (q.options.filter((o) => o.text.trim() || o.image).length < 2) return "Add at least 2 options.";
      if (!q.correct || q.correct.length === 0) return "Mark the correct option(s).";
    }
    if (q.type === "text" && !q.answer.trim()) return "Add the correct answer.";
    if (q.type === "regex" && !q.answer_pattern.trim()) return "Add a regex pattern.";
    return null;
  }
  function save() {
    const err = validate();
    if (err) { window.__adminToast ? window.__adminToast(err, "error") : alert(err); return; }
    onSave(q);
  }

  return (
    <div style={adStyles.modalWrap} onMouseDown={onCancel}>
      <div className="glass" style={adStyles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={adStyles.modalHead}>
          <div>
            <div className="eyebrow">{index == null ? "NEW QUESTION" : "EDIT QUESTION " + String(index + 1).padStart(2, "0")}</div>
            <h2 style={{ fontSize: 18, marginTop: 4 }}>QUESTION BUILDER</h2>
          </div>
          <button className="btn" onClick={onCancel} style={{ padding: "9px 13px" }}>✕</button>
        </div>

        <div style={adStyles.modalBody}>
          {/* type */}
          <label className="field-label">Question type</label>
          <div style={adStyles.typeRow}>
            {Q_TYPES.map((t) => (
              <button key={t.id} onClick={() => setType(t.id)} className="type-chip" data-on={q.type === t.id}>
                <span style={{ fontWeight: 800, letterSpacing: "0.08em" }}>{t.label}</span>
                <span className="faint" style={{ fontSize: 10 }}>{t.desc}</span>
              </button>
            ))}
          </div>

          {/* prompt */}
          <label className="field-label" style={{ marginTop: 20 }}>Prompt</label>
          <textarea className="field" rows={2} value={q.prompt} onChange={(e) => set("prompt", e.target.value)}
            placeholder="What is the question?" style={{ resize: "vertical", lineHeight: 1.5 }} />

          {/* code material + language */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 12, marginTop: 16 }}>
            <div>
              <label className="field-label">Code / material <span className="faint">(optional)</span></label>
              <textarea className="field" rows={3} value={q.material} onChange={(e) => set("material", e.target.value)}
                placeholder="Optional code block shown to the student" style={{ resize: "vertical", fontSize: 13, lineHeight: 1.6 }} />
            </div>
            <div>
              <label className="field-label">Language</label>
              <input className="field" value={q.language} onChange={(e) => set("language", e.target.value)} placeholder="js, py, sql…" />
            </div>
          </div>

          {/* stem image */}
          <label className="field-label" style={{ marginTop: 16 }}>Question image <span className="faint">(optional)</span></label>
          <ImagePicker value={q.image} onChange={(v) => set("image", v)} label="DROP / CLICK TO ADD IMAGE" />

          {/* answer area */}
          {isChoice ? (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label className="field-label" style={{ margin: 0 }}>
                  Options — {q.type === "mcq" ? "pick ONE correct" : "tick ALL correct"}
                </label>
                <button className="btn" onClick={addOpt} style={{ padding: "7px 12px", fontSize: 11 }}>+ OPTION</button>
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {q.options.map((o, i) => (
                  <div key={o.id} className="opt-edit" data-on={(q.correct || []).includes(o.id)}>
                    <button onClick={() => toggleCorrect(o.id)} className="opt-mark"
                      data-shape={q.type === "msq" ? "box" : "round"} data-on={(q.correct || []).includes(o.id)}
                      title="Mark correct">
                      {(q.correct || []).includes(o.id) ? "✓" : String.fromCharCode(65 + i)}
                    </button>
                    <div style={{ flex: 1, display: "grid", gap: 8 }}>
                      <input className="field" value={o.text} onChange={(e) => setOpt(o.id, { text: e.target.value })}
                        placeholder={"Option " + String.fromCharCode(65 + i) + " text"} style={{ padding: "10px 12px" }} />
                      <ImagePicker value={o.image} onChange={(v) => setOpt(o.id, { image: v })} label="OPTION IMAGE" compact />
                    </div>
                    <button className="opt-del" onClick={() => delOpt(o.id)} title="Remove" disabled={q.options.length <= 2}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          ) : q.type === "text" ? (
            <div style={{ marginTop: 20 }}>
              <label className="field-label">Correct answer <span className="faint">(case-insensitive)</span></label>
              <input className="field" value={q.answer} onChange={(e) => set("answer", e.target.value)} placeholder="e.g. flex" />
            </div>
          ) : (
            <div style={{ marginTop: 20 }}>
              <label className="field-label">Regex pattern</label>
              <input className="field mono" value={q.answer_pattern} onChange={(e) => set("answer_pattern", e.target.value)}
                placeholder="^git\\s+add\\s+\\.$" />
              <label className="field-label" style={{ marginTop: 12 }}>Shown answer <span className="faint">(human-readable)</span></label>
              <input className="field mono" value={q.answer_display} onChange={(e) => set("answer_display", e.target.value)}
                placeholder="git add ." />
            </div>
          )}

          {/* hint */}
          <label className="field-label" style={{ marginTop: 16 }}>Hint <span className="faint">(revealed after answering)</span></label>
          <input className="field" value={q.hint} onChange={(e) => set("hint", e.target.value)} placeholder="A nudge in the right direction" />

          {/* points + timer */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <div>
              <label className="field-label">Points <span className="cyan">{q.points}</span></label>
              <input type="range" min="50" max="500" step="10" value={q.points}
                onChange={(e) => set("points", +e.target.value)} className="ad-range" />
            </div>
            <div>
              <label className="field-label">Timer <span className="cyan">{q.time_limit}s</span></label>
              <input type="range" min="10" max="180" step="5" value={q.time_limit}
                onChange={(e) => set("time_limit", +e.target.value)} className="ad-range" />
            </div>
          </div>
        </div>

        <div style={adStyles.modalFoot}>
          <button className="btn" onClick={onCancel}>CANCEL</button>
          <button className="btn btn-primary" onClick={save}>✓ SAVE QUESTION</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  BULK IMPORT MODAL
// ============================================================
function BulkImportModal({ onImport, onCancel }) {
  const [csv, setCsv] = useStateAd('');
  const [parsed, setParsed] = useStateAd(null);

  const SAMPLE = [
    'type,prompt,opt_a,opt_b,opt_c,opt_d,correct,hint,points,timer',
    'mcq,What is Python?,Programming language,A snake,A game,A database,A,Python is a high-level language,100,30',
    'msq,"Which are valid Python data types?",int,str,loop,bool,"A,B,D",Multiple correct answers here,100,60',
    'text,What file extension does Python use?,,,,,.py,Python source files end in .py,100,30',
    'mcq,Python is case-sensitive?,True,False,,,A,Python distinguishes upper/lower case,100,20',
  ].join('\n');

  function tryParse() { setParsed(csvToQuestions(csv)); }

  const ok = parsed && parsed.questions.length > 0;

  return (
    <div style={adStyles.modalWrap} onMouseDown={onCancel}>
      <div className="glass" style={{ ...adStyles.modal, width: "min(740px, 96vw)" }} onMouseDown={e => e.stopPropagation()}>
        <div style={adStyles.modalHead}>
          <div>
            <div className="eyebrow">BULK IMPORT</div>
            <h2 style={{ fontSize: 18, marginTop: 4 }}>CSV QUESTION IMPORT</h2>
          </div>
          <button className="btn" onClick={onCancel} style={{ padding: "9px 13px" }}>✕</button>
        </div>

        <div style={adStyles.modalBody}>
          <div style={{ marginBottom: 16, padding: "11px 14px", background: "rgba(0,0,0,0.35)", borderRadius: 9, border: "1px solid var(--hairline)", fontSize: 11, lineHeight: 1.8 }}>
            <code className="cyan" style={{ display: "block", marginBottom: 6, letterSpacing: "0.04em" }}>
              type, prompt, opt_a, opt_b, opt_c, opt_d, correct, hint, points, timer
            </code>
            <span className="faint">
              <b>type</b>: mcq / msq / text / regex &nbsp;·&nbsp;
              <b>correct</b>: A/B/C/D for mcq · "A,C" for msq · answer text for text<br />
              opt_c, opt_d, hint are optional &nbsp;·&nbsp; points default 100 &nbsp;·&nbsp; timer default 30s
            </span>
          </div>

          <label className="field-label">PASTE CSV DATA</label>
          <textarea className="field" rows={13} value={csv}
            onChange={e => { setCsv(e.target.value); setParsed(null); }}
            placeholder={"type,prompt,opt_a,opt_b,opt_c,opt_d,correct,hint,points,timer\nmcq,What is Python?,Language,Snake,Game,Database,A,High-level language,100,30"}
            style={{ fontSize: 12, lineHeight: 1.65, resize: "vertical" }} />

          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => { setCsv(SAMPLE); setParsed(null); }}
              style={{ fontSize: 11, padding: "8px 14px" }}>↓ LOAD SAMPLE</button>
            <button className="btn" onClick={tryParse}
              style={{ fontSize: 11, padding: "8px 14px" }}>◎ PREVIEW / VALIDATE</button>
          </div>

          {parsed && (
            <div className="reveal" style={{
              marginTop: 14, padding: "13px 16px", borderRadius: 9,
              border: `1px solid ${ok ? "color-mix(in srgb, var(--lime) 45%, transparent)" : "color-mix(in srgb, var(--red) 45%, transparent)"}`,
              background: ok ? "color-mix(in srgb, var(--lime) 6%, transparent)" : "color-mix(in srgb, var(--red) 6%, transparent)"
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: parsed.errors.length ? 8 : 0 }}>
                {ok
                  ? <span className="lime">✓ {parsed.questions.length} question{parsed.questions.length !== 1 ? 's' : ''} ready</span>
                  : <span className="red">✕ No valid questions found</span>}
              </div>
              <div style={{ display: "grid", gap: 3 }}>
                {parsed.errors.map((e, i) => (
                  <div key={i} className="faint" style={{ fontSize: 11 }}>⚠ {e}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={adStyles.modalFoot}>
          <button className="btn" onClick={onCancel}>CANCEL</button>
          <button className="btn btn-primary" disabled={!ok}
            onClick={() => ok && onImport(parsed.questions)}
            style={{ minWidth: 220 }}>
            {ok ? `▶ ADD ${parsed.questions.length} QUESTIONS TO ROOM` : "▶ IMPORT"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  ROOM EDITOR
// ============================================================
function RoomEditor({ token, module, onSaved, onDeleted }) {
  const toast = window.useToast();
  const [draft, setDraft] = useStateAd(() => JSON.parse(JSON.stringify(module)));
  const [editing, setEditing] = useStateAd(null); // { q, index }
  const [saving, setSaving] = useStateAd(false);
  const [dirty, setDirty] = useStateAd(false);
  const [importing, setImporting] = useStateAd(false);

  useEffectAd(() => { setDraft(JSON.parse(JSON.stringify(module))); setDirty(false); }, [module.id]);

  const setMeta = (k, v) => { setDraft((p) => ({ ...p, [k]: v })); setDirty(true); };

  function saveQuestion(q) {
    setDraft((p) => {
      const list = p.challenges.slice();
      if (editing.index == null) list.push(q);
      else list[editing.index] = q;
      return { ...p, challenges: list };
    });
    setDirty(true);
    setEditing(null);
  }
  function delQuestion(i) {
    if (!confirm("Delete this question?")) return;
    setDraft((p) => ({ ...p, challenges: p.challenges.filter((_, idx) => idx !== i) }));
    setDirty(true);
  }
  function moveQuestion(i, dir) {
    setDraft((p) => {
      const list = p.challenges.slice();
      const j = i + dir;
      if (j < 0 || j >= list.length) return p;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...p, challenges: list };
    });
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const { module: saved } = await window.api.admin.saveModule(token, draft);
      toast("ROOM SAVED", "success");
      setDraft(JSON.parse(JSON.stringify(saved))); // sync real DB ids back into draft
      setDirty(false);
      onSaved(saved);
    } catch (e) { toast(e.message || "Save failed", "error"); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!confirm('Delete room "' + draft.title + '" and all its questions?')) return;
    try { await window.api.admin.deleteModule(token, draft.id); toast("ROOM DELETED", "info"); onDeleted(draft.id); }
    catch (e) { toast(e.message || "Delete failed", "error"); }
  }

  return (
    <div style={adStyles.editor}>
      <div className="ad-editor-head" style={adStyles.editorHead}>
        <div className="eyebrow">ROOM {String(draft.sequence).padStart(2, "0")} · EDITING</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={remove} style={{ color: "var(--red)", borderColor: "color-mix(in srgb, var(--red) 40%, transparent)" }}>DELETE ROOM</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !dirty}>
            {saving ? "SAVING…" : dirty ? "✓ SAVE CHANGES" : "SAVED"}
          </button>
        </div>
      </div>

      {/* meta */}
      <div className="glass" style={adStyles.metaCard}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 16 }}>
          <div>
            <label className="field-label">Room title</label>
            <input className="field" value={draft.title} onChange={(e) => setMeta("title", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Type label</label>
            <input className="field" value={draft.type} onChange={(e) => setMeta("type", e.target.value)} placeholder="mixed" />
          </div>
        </div>
        <label className="field-label" style={{ marginTop: 14 }}>Description</label>
        <input className="field" value={draft.blurb} onChange={(e) => setMeta("blurb", e.target.value)} placeholder="Short room description" />
        <label className="field-label" style={{ marginTop: 14 }}>Icon</label>
        <div style={adStyles.iconGrid}>
          {ICON_OPTIONS.map((opt) => (
            <button key={opt.key} className="icon-pick" data-on={draft.icon === opt.key} onClick={() => setMeta("icon", opt.key)}>
              <RoomIcon iconKey={opt.key} size={16} stroke="currentColor" />
              <span className="faint" style={{ fontSize: 9 }}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* questions */}
      <div className="ad-q-head" style={adStyles.qHead}>
        <div>
          <h3 style={{ fontSize: 15 }}>QUESTIONS</h3>
          <span className="faint" style={{ fontSize: 11 }}>{draft.challenges.length} in this room · students answer in order</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setImporting(true)} style={{ padding: "9px 14px", fontSize: 11 }}>⬆ IMPORT CSV</button>
          <button className="btn btn-primary" onClick={() => setEditing({ q: newQuestion(), index: null })}>+ ADD QUESTION</button>
        </div>
      </div>

      {draft.challenges.length === 0 ? (
        <div className="glass" style={adStyles.qEmpty}>
          <span className="faint">No questions yet. Add the first one to fill this room.</span>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {draft.challenges.map((q, i) => (
            <div key={q.id} className="glass q-row">
              <span className="q-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="q-type" data-t={q.type}>{q.type.toUpperCase()}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={adStyles.qPrompt}>{q.prompt ? (q.prompt.length > 72 ? q.prompt.slice(0, 70) + '…' : q.prompt) : <span className="faint">— no prompt —</span>}</div>
                <div className="faint" style={{ fontSize: 11, marginTop: 3 }}>
                  {q.points} pts · {q.time_limit}s
                  {(q.type === "mcq" || q.type === "msq") && q.options ? " · " + q.options.length + " options" : ""}
                  {q.image ? " · 🖼 image" : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="q-icon" onClick={() => moveQuestion(i, -1)} disabled={i === 0} title="Up">↑</button>
                <button className="q-icon" onClick={() => moveQuestion(i, 1)} disabled={i === draft.challenges.length - 1} title="Down">↓</button>
                <button className="q-icon" onClick={() => setEditing({ q, index: i })} title="Edit">✎</button>
                <button className="q-icon" onClick={() => delQuestion(i)} title="Delete" style={{ color: "var(--red)" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <QuestionEditor initial={editing.q} index={editing.index}
          onSave={saveQuestion} onCancel={() => setEditing(null)} />
      )}
      {importing && (
        <BulkImportModal
          onImport={(qs) => { setDraft((p) => ({ ...p, challenges: [...p.challenges, ...qs] })); setDirty(true); setImporting(false); }}
          onCancel={() => setImporting(false)}
        />
      )}
    </div>
  );
}

// ============================================================
//  BATCHES PANEL
// ============================================================
function StudentRow({ student, onDelete }) {
  const initials = (student.handle || '?').slice(0, 2).toUpperCase();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--hairline)' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 18%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.handle}</div>
        <div className="faint" style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</div>
      </div>
      {student.batch && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, border: '1px solid var(--hairline)', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{student.batch}</span>}
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap', minWidth: 54, textAlign: 'right' }}>{(student.total_points || 0).toLocaleString()} <span className="faint" style={{ fontWeight: 400, fontSize: 10 }}>pts</span></span>
      <span className="faint" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{student.rooms_cleared || 0} rooms</span>
      <div className="faint" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{student.joined}</div>
      <button className="q-icon" onClick={() => onDelete(student)}
        style={{ color: 'var(--red)', borderColor: 'color-mix(in srgb, var(--red) 35%, transparent)', width: 26, height: 26, fontSize: 12 }}
        title="Delete student">✕</button>
    </div>
  );
}

function BatchesPanel({ token, modules }) {
  const toast = window.useToast();
  const [batches, setBatches] = useStateAd(null);
  const [unassigned, setUnassigned] = useStateAd([]);
  const [loading, setLoading] = useStateAd(true);
  const [saving, setSaving] = useStateAd({});
  const [dirty, setDirty] = useStateAd({});
  const [newName, setNewName] = useStateAd('');
  const [creating, setCreating] = useStateAd(false);
  const [expanded, setExpanded] = useStateAd({});

  async function load() {
    setLoading(true);
    try {
      const { batches, unassigned } = await window.api.admin.batches.list(token);
      setBatches(batches);
      setUnassigned(unassigned || []);
    } catch (e) { toast(e.message || 'Load failed', 'error'); }
    finally { setLoading(false); }
  }
  useEffectAd(() => { load(); }, []);

  async function deleteUser(student) {
    if (!confirm('Delete student "' + student.handle + '"?\nThis removes all their progress and attempts.')) return;
    try {
      await window.api.admin.users.delete(token, student.id);
      setBatches(prev => prev.map(b => ({ ...b, students: b.students.filter(s => s.id !== student.id), student_count: b.students.filter(s => s.id !== student.id).length })));
      setUnassigned(prev => prev.filter(s => s.id !== student.id));
      toast('STUDENT DELETED', 'info');
    } catch (e) { toast(e.message || 'Delete failed', 'error'); }
  }

  function toggle(batch, moduleId) {
    setBatches(prev => prev.map(b => {
      if (b.batch !== batch) return b;
      const ids = (b.module_ids || []);
      const next = ids.includes(moduleId) ? ids.filter(x => x !== moduleId) : [...ids, moduleId];
      return { ...b, module_ids: next };
    }));
    setDirty(d => ({ ...d, [batch]: true }));
  }

  function selectAll(batch) {
    const allIds = modules.map(m => m.id);
    setBatches(prev => prev.map(b => b.batch !== batch ? b : { ...b, module_ids: allIds }));
    setDirty(d => ({ ...d, [batch]: true }));
  }

  function clearAll(batch) {
    setBatches(prev => prev.map(b => b.batch !== batch ? b : { ...b, module_ids: [], rooms: [] }));
    setDirty(d => ({ ...d, [batch]: true }));
  }

  async function createBatch() {
    const name = newName.trim();
    if (!name) { toast('Enter a batch name', 'error'); return; }
    setCreating(true);
    try {
      const { batch } = await window.api.admin.batches.create(token, name);
      setBatches(prev => [...(prev || []), batch].sort((a, b) => a.batch.localeCompare(b.batch)));
      setNewName('');
      toast('BATCH CREATED', 'success');
    } catch (e) { toast(e.message || 'Failed', 'error'); }
    finally { setCreating(false); }
  }

  async function deleteBatch(batchName) {
    if (!confirm('Delete batch "' + batchName + '"? Room access for this batch will also be removed.')) return;
    try {
      await window.api.admin.batches.delete(token, batchName);
      setBatches(prev => prev.filter(b => b.batch !== batchName));
      toast('BATCH DELETED', 'info');
    } catch (e) { toast(e.message || 'Failed', 'error'); }
  }

  function toggleTestMode(batchName) {
    setBatches(prev => prev.map(b => b.batch !== batchName ? b : { ...b, test_mode: !b.test_mode }));
    setDirty(d => ({ ...d, [batchName]: true }));
  }

  function setMaxAttempts(batchName, moduleId, val) {
    const num = Math.max(0, parseInt(val) || 0);
    setBatches(prev => prev.map(b => {
      if (b.batch !== batchName) return b;
      const rooms = (b.rooms || []);
      const exists = rooms.find(r => r.module_id === moduleId);
      const next = exists
        ? rooms.map(r => r.module_id === moduleId ? { ...r, max_attempts: num } : r)
        : [...rooms, { module_id: moduleId, max_attempts: num }];
      return { ...b, rooms: next };
    }));
    setDirty(d => ({ ...d, [batchName]: true }));
  }

  async function save(batchData) {
    setSaving(s => ({ ...s, [batchData.batch]: true }));
    try {
      const rooms = (batchData.module_ids || []).map(id => {
        const r = (batchData.rooms || []).find(x => x.module_id === id);
        return { module_id: id, max_attempts: r?.max_attempts || 0 };
      });
      await window.api.admin.batches.updateAccess(token, batchData.batch, {
        rooms,
        test_mode: batchData.test_mode || false,
      });
      toast('BATCH SAVED', 'success');
      setDirty(d => ({ ...d, [batchData.batch]: false }));
    } catch (e) { toast(e.message || 'Save failed', 'error'); }
    finally { setSaving(s => ({ ...s, [batchData.batch]: false })); }
  }

  const sorted = [...modules].sort((a, b) => a.sequence - b.sequence);

  if (loading) return <LoadingScreen label="LOADING BATCHES" />;

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* create batch */}
      <div className="glass" style={{ padding: '16px 18px' }}>
        <div className="eyebrow" style={{ fontSize: 10, marginBottom: 12 }}>CREATE BATCH</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="field" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createBatch()}
            placeholder="e.g. IT-2024-A" style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={createBatch} disabled={creating || !newName.trim()}
            style={{ padding: '11px 18px', whiteSpace: 'nowrap' }}>
            {creating ? 'CREATING…' : '+ ADD BATCH'}
          </button>
        </div>
        <div className="faint" style={{ fontSize: 11, marginTop: 8 }}>
          Batch names appear as a dropdown on the student registration screen.
        </div>
      </div>

      {(!batches || batches.length === 0) ? (
        <div className="glass" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <span className="faint">No batches yet. Create one above.</span>
        </div>
      ) : (
        <>
          <div className="faint" style={{ fontSize: 12, lineHeight: 1.7, padding: '0 2px' }}>
            Enable rooms per batch. Students see only enabled rooms (sequential unlock still applies).
            Leave all unchecked = student sees all rooms.
          </div>
          {batches.map(b => (
        <div key={b.batch} className="glass" style={{ padding: 18 }}>
          {/* batch header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.06em' }}>{b.batch}</span>
                {b.test_mode && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, border: '1px solid color-mix(in srgb, var(--accent-2) 50%, transparent)', color: 'var(--accent-2)', fontWeight: 800, letterSpacing: '0.1em' }}>TEST MODE</span>}
              </div>
              <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>
                {b.student_count} student{b.student_count !== 1 ? 's' : ''} ·{' '}
                {(b.module_ids || []).length === 0 ? 'all rooms visible' : (b.module_ids || []).length + ' rooms enabled'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => selectAll(b.batch)} style={{ fontSize: 10, padding: '6px 10px' }}>ALL</button>
              <button className="btn" onClick={() => clearAll(b.batch)} style={{ fontSize: 10, padding: '6px 10px' }}>NONE</button>
              <button className="btn btn-primary" onClick={() => save(b)} disabled={saving[b.batch] || !dirty[b.batch]}
                style={{ fontSize: 11, padding: '8px 16px' }}>
                {saving[b.batch] ? 'SAVING…' : dirty[b.batch] ? '✓ SAVE' : 'SAVED'}
              </button>
              <button className="btn" onClick={() => deleteBatch(b.batch)}
                style={{ fontSize: 11, padding: '8px 12px', color: 'var(--red)', borderColor: 'color-mix(in srgb, var(--red) 40%, transparent)' }}
                title="Delete batch">✕</button>
            </div>
          </div>

          {/* test mode toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 9, cursor: 'pointer', marginBottom: 12, background: b.test_mode ? 'color-mix(in srgb, var(--accent-2) 8%, transparent)' : 'rgba(0,0,0,0.2)', border: `1px solid ${b.test_mode ? 'color-mix(in srgb, var(--accent-2) 45%, transparent)' : 'var(--hairline)'}`, transition: 'all .15s' }}>
            <input type="checkbox" checked={!!b.test_mode} onChange={() => toggleTestMode(b.batch)}
              style={{ accentColor: 'var(--accent-2)', width: 15, height: 15, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: b.test_mode ? 'var(--accent-2)' : 'var(--text-dim)', letterSpacing: '0.06em' }}>TEST MODE</div>
              <div className="faint" style={{ fontSize: 10, marginTop: 1 }}>Students can practice freely — scores hidden from all leaderboards</div>
            </div>
          </label>

          {/* room list with attempt limits */}
          <div style={{ display: 'grid', gap: 7 }}>
            {sorted.map(m => {
              const on = (b.module_ids || []).includes(m.id);
              const roomRow = (b.rooms || []).find(r => r.module_id === m.id);
              const maxAtt = roomRow?.max_attempts || 0;
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 8, background: on ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'rgba(0,0,0,0.25)', border: `1px solid ${on ? 'color-mix(in srgb, var(--accent) 50%, transparent)' : 'var(--hairline)'}`, transition: 'all .14s' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                    <input type="checkbox" checked={on} onChange={() => toggle(b.batch, m.id)}
                      style={{ accentColor: 'var(--accent)', width: 14, height: 14, flexShrink: 0 }} />
                    <RoomIcon iconKey={m.icon} size={13} stroke={on ? 'var(--accent)' : 'currentColor'} />
                    <span style={{ fontSize: 12, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: on ? 'var(--text)' : 'var(--text-dim)' }}>
                      {String(m.sequence).padStart(2, '0')} · {m.title}
                    </span>
                  </label>
                  {on && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span className="faint" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>max attempts</span>
                      <input type="number" min="0" max="99" value={maxAtt || ''}
                        onChange={e => setMaxAttempts(b.batch, m.id, e.target.value)}
                        placeholder="∞"
                        style={{ width: 48, padding: '4px 6px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--hairline)', borderRadius: 6, color: maxAtt > 0 ? 'var(--accent)' : 'var(--text-faint)', fontSize: 12, fontFamily: 'var(--mono)', textAlign: 'center' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* students section */}
          <div style={{ marginTop: 14, borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
            <button type="button" onClick={() => setExpanded(e => ({ ...e, [b.batch]: !e[b.batch] }))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0, color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em' }}>
              <span style={{ transition: 'transform .2s', transform: expanded[b.batch] ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>▶</span>
              STUDENTS · {b.student_count}
            </button>
            {expanded[b.batch] && (
              <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                {b.students.length === 0
                  ? <div className="faint" style={{ fontSize: 12, padding: '6px 4px' }}>No students in this batch yet.</div>
                  : b.students.map(s => <StudentRow key={s.id} student={s} onDelete={deleteUser} />)}
              </div>
            )}
          </div>
        </div>
      ))}

          {/* unassigned students */}
          {unassigned.length > 0 && (
            <div className="glass" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.06em', color: 'var(--text-faint)' }}>UNASSIGNED</div>
                  <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>{unassigned.length} student{unassigned.length !== 1 ? 's' : ''} with no batch or unknown batch</div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {unassigned.map(s => <StudentRow key={s.id} student={s} onDelete={deleteUser} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
//  RANKINGS PANEL
// ============================================================
function RankingsPanel({ token }) {
  const [rows, setRows] = useStateAd([]);
  const [roomsTotal, setRoomsTotal] = useStateAd(10);
  const [batches, setBatches] = useStateAd([]);
  const [selBatch, setSelBatch] = useStateAd('');
  const [loading, setLoading] = useStateAd(true);
  const [countdown, setCountdown] = useStateAd(30);
  const [autoRefresh, setAutoRefresh] = useStateAd(false);
  const timerRef = useRefAd(null);

  async function load(batch) {
    setLoading(true);
    try {
      const data = await window.api.admin.rankings(token, batch || '');
      setRows(data.leaderboard);
      setRoomsTotal(data.rooms_total);
    } catch (e) {}
    finally { setLoading(false); }
  }

  useEffectAd(() => {
    // load batch list for filter
    window.api.admin.batches.list(token).then(({ batches }) => {
      setBatches(batches.map(b => b.batch));
    }).catch(() => {});
    load('');
  }, []);

  useEffectAd(() => {
    if (!autoRefresh) { clearInterval(timerRef.current); setCountdown(30); return; }
    setCountdown(30);
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { load(selBatch); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, selBatch]);

  function handleBatch(b) {
    setSelBatch(b);
    load(b);
    if (autoRefresh) setCountdown(30);
  }

  const medal = ['var(--lime)', 'var(--accent)', 'var(--accent-2)'];

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 760 }}>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.08em' }}>
            <Icon name="trophy" size={15} stroke="var(--accent)" style={{ verticalAlign: '-2px', marginRight: 8 }} />
            RANKINGS {selBatch ? '· ' + selBatch : '· ALL STUDENTS'}
          </div>
        </div>
        {/* batch filter */}
        <select value={selBatch} onChange={e => handleBatch(e.target.value)}
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--hairline)', borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12, padding: '8px 12px', cursor: 'pointer' }}>
          <option value="">All Students</option>
          {batches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {/* manual refresh */}
        <button className="btn" onClick={() => load(selBatch)} disabled={loading}
          style={{ padding: '8px 14px', fontSize: 11 }}>
          {loading ? '…' : '↺ REFRESH'}
        </button>
        {/* auto-refresh toggle */}
        <button className="btn" onClick={() => setAutoRefresh(a => !a)}
          style={{ padding: '8px 14px', fontSize: 11, ...(autoRefresh ? { color: 'var(--lime)', borderColor: 'color-mix(in srgb, var(--lime) 50%, transparent)', background: 'color-mix(in srgb, var(--lime) 8%, transparent)' } : {}) }}>
          {autoRefresh ? `⏱ ${countdown}s` : '⏱ AUTO'}
        </button>
      </div>

      {loading ? <LoadingScreen label="LOADING RANKINGS" /> : rows.length === 0 ? (
        <div className="glass" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <span className="faint">No students yet.</span>
        </div>
      ) : (
        <div className="glass" style={{ overflow: 'hidden' }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', borderBottom: '1px solid var(--hairline)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-faint)' }}>
            <span style={{ width: 36 }}>RANK</span>
            <span style={{ flex: 1 }}>STUDENT</span>
            {!selBatch && <span style={{ width: 100 }}>BATCH</span>}
            <span style={{ width: 80, textAlign: 'center' }}>ROOMS</span>
            <span style={{ width: 90, textAlign: 'right' }}>POINTS</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < rows.length - 1 ? '1px solid var(--hairline)' : 'none', background: i < 3 ? `color-mix(in srgb, ${medal[i]} 4%, transparent)` : 'transparent' }}>
              <span style={{ width: 36, fontWeight: 800, fontSize: 16, color: i < 3 ? medal[i] : 'var(--text-faint)', textShadow: i < 3 ? `0 0 12px ${medal[i]}` : 'none' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              {!selBatch && <span style={{ width: 100, fontSize: 11 }} className="faint">{r.batch || '—'}</span>}
              <span style={{ width: 80, textAlign: 'center', fontSize: 12 }} className="dim">{r.rooms_cleared}<span className="faint">/{roomsTotal}</span></span>
              <span style={{ width: 90, textAlign: 'right', fontWeight: 800, fontSize: 14, color: i < 3 ? medal[i] : 'var(--accent)' }}>{r.total_points.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
//  SESSIONS PANEL
// ============================================================
function SessionsPanel({ token, modules }) {
  const toast = window.useToast();
  const [sessions, setSessions] = useStateAd([]);
  const [loading, setLoading] = useStateAd(true);
  const [title, setTitle] = useStateAd('');
  const [selectedMods, setSelectedMods] = useStateAd([]);
  const [creating, setCreating] = useStateAd(false);
  const [newSession, setNewSession] = useStateAd(null);

  async function load() {
    setLoading(true);
    try {
      const { sessions } = await window.api.admin.sessions.list(token);
      setSessions(sessions);
    } catch (e) { toast(e.message || 'Load failed', 'error'); }
    finally { setLoading(false); }
  }
  useEffectAd(() => { load(); }, []);

  async function create() {
    if (!title.trim()) { toast('Add a session title', 'error'); return; }
    if (!selectedMods.length) { toast('Select at least one room', 'error'); return; }
    setCreating(true);
    try {
      const { session } = await window.api.admin.sessions.create(token, {
        title: title.trim(), module_ids: selectedMods,
      });
      setNewSession(session);
      setSessions(s => [session, ...s]);
      setTitle(''); setSelectedMods([]);
      toast('SESSION CREATED', 'success');
    } catch (e) { toast(e.message || 'Failed', 'error'); }
    finally { setCreating(false); }
  }

  async function toggleStatus(sess) {
    const next = sess.status === 'active' ? 'closed' : 'active';
    try {
      const { session } = await window.api.admin.sessions.update(token, sess.id, { status: next });
      setSessions(s => s.map(x => x.id === session.id ? session : x));
    } catch (e) { toast(e.message || 'Failed', 'error'); }
  }

  async function remove(sess) {
    if (!confirm('Delete session "' + sess.title + '"?')) return;
    try {
      await window.api.admin.sessions.delete(token, sess.id);
      setSessions(s => s.filter(x => x.id !== sess.id));
      toast('SESSION DELETED', 'info');
    } catch (e) { toast(e.message || 'Failed', 'error'); }
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code).then(() => toast('Code copied!', 'success'));
  }

  const sorted = [...modules].sort((a, b) => a.sequence - b.sequence);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* create form */}
      <div className="glass" style={{ padding: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 14, fontSize: 11 }}>CREATE SESSION</div>
        <label className="field-label">Session title</label>
        <input className="field" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Python Quiz – Batch A" style={{ marginBottom: 16 }} />
        <label className="field-label">Rooms to include</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginTop: 8, marginBottom: 16 }}>
          {sorted.map(m => {
            const on = selectedMods.includes(m.id);
            return (
              <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 9, cursor: 'pointer', background: on ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'rgba(0,0,0,0.28)', border: `1px solid ${on ? 'var(--accent)' : 'var(--hairline)'}`, transition: 'all .15s' }}>
                <input type="checkbox" checked={on}
                  onChange={e => setSelectedMods(s => e.target.checked ? [...s, m.id] : s.filter(x => x !== m.id))}
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14, flexShrink: 0 }} />
                <RoomIcon iconKey={m.icon} size={13} stroke="currentColor" />
                <span style={{ fontSize: 12, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {String(m.sequence).padStart(2, '0')} · {m.title}
                </span>
              </label>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-primary" onClick={create} disabled={creating}>
            {creating ? 'CREATING…' : '+ CREATE SESSION'}
          </button>
          {selectedMods.length > 0 && <span className="faint" style={{ fontSize: 11 }}>{selectedMods.length} room{selectedMods.length !== 1 ? 's' : ''} selected</span>}
        </div>
      </div>

      {/* new session code reveal */}
      {newSession && (
        <div className="glass reveal" style={{ padding: '16px 20px', border: '1px solid color-mix(in srgb, var(--lime) 50%, transparent)', background: 'color-mix(in srgb, var(--lime) 6%, transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div className="eyebrow lime" style={{ fontSize: 9, marginBottom: 4 }}>SESSION CREATED — SHARE THIS CODE</div>
              <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--lime)', lineHeight: 1 }} className="glow-text">{newSession.code}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <button className="btn" onClick={() => copyCode(newSession.code)} style={{ fontSize: 11, padding: '9px 14px' }}>⎘ COPY CODE</button>
              <button className="btn" onClick={() => setNewSession(null)} style={{ padding: '9px 12px' }}>✕</button>
            </div>
          </div>
          <div className="faint" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
            Students enter this code using the ⚡ SESSION button on the room map.
          </div>
        </div>
      )}

      {/* sessions list */}
      {loading ? <LoadingScreen label="LOADING SESSIONS" /> : sessions.length === 0 ? (
        <div className="glass" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <span className="faint">No sessions yet. Create one above.</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="eyebrow" style={{ padding: '0 4px', marginBottom: 4, fontSize: 10 }}>
            {sessions.length} SESSION{sessions.length !== 1 ? 'S' : ''}
          </div>
          {sessions.map(sess => (
            <div key={sess.id} className="glass" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.18em', color: sess.status === 'active' ? 'var(--lime)' : 'var(--text-faint)', minWidth: 76, fontFamily: 'var(--mono)' }}>
                {sess.code}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sess.title}</div>
                <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>
                  {sess.participants_count ?? 0} student{(sess.participants_count ?? 0) !== 1 ? 's' : ''} · {(sess.module_ids || []).length} room{(sess.module_ids || []).length !== 1 ? 's' : ''}
                </div>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', border: '1px solid', color: sess.status === 'active' ? 'var(--lime)' : 'var(--text-faint)', borderColor: sess.status === 'active' ? 'color-mix(in srgb, var(--lime) 45%, transparent)' : 'var(--hairline)', background: sess.status === 'active' ? 'color-mix(in srgb, var(--lime) 8%, transparent)' : 'transparent' }}>
                {sess.status.toUpperCase()}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn" onClick={() => copyCode(sess.code)} style={{ padding: '8px 12px', fontSize: 11 }}>⎘ CODE</button>
                <button className="btn" onClick={() => toggleStatus(sess)}
                  style={{ padding: '8px 12px', fontSize: 11, color: sess.status === 'active' ? 'var(--red)' : 'var(--lime)', borderColor: sess.status === 'active' ? 'color-mix(in srgb, var(--red) 40%, transparent)' : 'color-mix(in srgb, var(--lime) 40%, transparent)' }}>
                  {sess.status === 'active' ? '⏹ CLOSE' : '▶ REOPEN'}
                </button>
                <button className="btn" onClick={() => remove(sess)} style={{ padding: '8px 12px', fontSize: 11, color: 'var(--red)', borderColor: 'color-mix(in srgb, var(--red) 40%, transparent)' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
//  ADMIN CONSOLE (shell)
// ============================================================
function AdminConsole({ token, me, onExitToGame, onLogout }) {
  const toast = window.useToast();
  const [modules, setModules] = useStateAd(null);
  const [selId, setSelId] = useStateAd(null);
  const [loading, setLoading] = useStateAd(true);
  const [consoleTab, setConsoleTab] = useStateAd(() => {
    const seg = window.location.hash.replace('#', '').replace('admin/', '');
    return ['rooms', 'sessions', 'batches', 'rankings'].includes(seg) ? seg : 'rooms';
  });

  function switchTab(tab) {
    window.location.hash = 'admin/' + tab;
    setConsoleTab(tab);
  }

  useEffectAd(() => { window.__adminToast = toast; }, [toast]);

  async function load(selectFirst) {
    setLoading(true);
    try {
      const { modules } = await window.api.admin.modules(token);
      setModules(modules);
      if (selectFirst || !selId) setSelId(modules[0] ? modules[0].id : null);
    } catch (e) { toast(e.message || "Load failed", "error"); }
    finally { setLoading(false); }
  }
  useEffectAd(() => { load(true); }, []);

  async function addRoom() {
    try { const { module } = await window.api.admin.createModule(token); await load(); setSelId(module.id); toast("ROOM CREATED", "success"); }
    catch (e) { toast(e.message || "Failed", "error"); }
  }
  async function moveRoom(id, dir) {
    const arr = modules.slice().sort((a, b) => a.sequence - b.sequence);
    const i = arr.findIndex((m) => m.id === id);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    await window.api.admin.reorder(token, arr.map((m) => m.id));
    await load();
  }
  function onSaved(saved) { setModules((ms) => ms.map((m) => m.id === saved.id ? saved : m)); }
  async function onDeleted(id) { await load(true); }

  const sorted = (modules || []).slice().sort((a, b) => a.sequence - b.sequence);
  const selected = sorted.find((m) => m.id === selId);

  return (
    <div style={adStyles.page}>
      {/* header */}
      <div className="glass" style={adStyles.bar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="terminal" size={20} stroke="var(--accent-2)" />
          <div>
            <div style={{ fontWeight: 800, letterSpacing: "0.14em", fontSize: 14 }} className="glow-text mag">INSTRUCTOR CONSOLE</div>
            <div className="eyebrow" style={{ fontSize: 9, marginTop: 2 }}>QUIZARENA · CONTENT STUDIO</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => { if (confirm("Reset ALL rooms & progress to defaults?")) window.api.admin.resetAll(token).then(() => load(true)).then(() => toast("RESET TO DEFAULTS", "info")); }}>RESET</button>
          <button className="btn" onClick={onExitToGame}><Icon name="map" size={15} stroke="currentColor" style={{ verticalAlign: "-3px", marginRight: 6 }} />VIEW GAME</button>
          <button className="btn" onClick={onLogout} title="Log out" style={{ padding: "11px 13px" }}><Icon name="logout" size={15} stroke="currentColor" /></button>
        </div>
      </div>

      {/* tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className="btn" data-on={consoleTab === 'rooms'}
          onClick={() => switchTab('rooms')}
          style={{ padding: '9px 18px', ...(consoleTab === 'rooms' ? { background: 'color-mix(in srgb, var(--accent) 15%, transparent)', borderColor: 'var(--accent)', color: 'var(--accent)' } : {}) }}>
          <Icon name="map" size={14} stroke="currentColor" style={{ verticalAlign: '-2px', marginRight: 7 }} />ROOMS
        </button>
        <button className="btn" data-on={consoleTab === 'sessions'}
          onClick={() => switchTab('sessions')}
          style={{ padding: '9px 18px', ...(consoleTab === 'sessions' ? { background: 'color-mix(in srgb, var(--lime) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--lime) 60%, transparent)', color: 'var(--lime)' } : {}) }}>
          <Icon name="bolt" size={14} stroke="currentColor" style={{ verticalAlign: '-2px', marginRight: 7 }} />SESSIONS
        </button>
        <button className="btn" data-on={consoleTab === 'batches'}
          onClick={() => switchTab('batches')}
          style={{ padding: '9px 18px', ...(consoleTab === 'batches' ? { background: 'color-mix(in srgb, var(--accent-2) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-2) 60%, transparent)', color: 'var(--accent-2)' } : {}) }}>
          <Icon name="check" size={14} stroke="currentColor" style={{ verticalAlign: '-2px', marginRight: 7 }} />BATCHES
        </button>
        <button className="btn" data-on={consoleTab === 'rankings'}
          onClick={() => switchTab('rankings')}
          style={{ padding: '9px 18px', ...(consoleTab === 'rankings' ? { background: 'color-mix(in srgb, var(--accent) 12%, transparent)', borderColor: 'var(--accent)', color: 'var(--accent)' } : {}) }}>
          <Icon name="trophy" size={14} stroke="currentColor" style={{ verticalAlign: '-2px', marginRight: 7 }} />RANKINGS
        </button>
      </div>

      {loading || !modules ? (
        <LoadingScreen label="LOADING CONTENT" />
      ) : consoleTab === 'sessions' ? (
        <SessionsPanel token={token} modules={modules} />
      ) : consoleTab === 'batches' ? (
        <BatchesPanel token={token} modules={modules} />
      ) : consoleTab === 'rankings' ? (
        <RankingsPanel token={token} />
      ) : (
        <div style={adStyles.split} className="ad-split-collapse">
          {/* sidebar: rooms */}
          <div style={adStyles.sidebar}>
            <div style={adStyles.sideHead}>
              <span className="eyebrow">ROOMS · {sorted.length}</span>
              <button className="btn" onClick={addRoom} style={{ padding: "7px 11px", fontSize: 11 }}>+ ADD</button>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {sorted.map((m, i) => (
                <div key={m.id} className="room-tab" data-on={m.id === selId} onClick={() => setSelId(m.id)}>
                  <span className="room-tab-mark"><RoomIcon iconKey={m.icon} size={16} stroke="currentColor" /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="room-tab-title">{String(m.sequence).padStart(2, "0")} · {m.title}</div>
                    <div className="faint" style={{ fontSize: 10 }}>{m.challenges.length} questions</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button className="q-icon q-icon--sm" onClick={(e) => { e.stopPropagation(); moveRoom(m.id, -1); }} disabled={i === 0}>↑</button>
                    <button className="q-icon q-icon--sm" onClick={(e) => { e.stopPropagation(); moveRoom(m.id, 1); }} disabled={i === sorted.length - 1}>↓</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* editor */}
          <div style={{ minWidth: 0 }}>
            {selected ? <RoomEditor key={selected.id} token={token} module={selected} onSaved={onSaved} onDeleted={onDeleted} />
              : <div className="glass" style={adStyles.qEmpty}><span className="faint">No rooms. Add one to begin.</span></div>}
          </div>
        </div>
      )}
    </div>
  );

}

const adStyles = {
  page: { width: "min(1180px, 96vw)", margin: "0 auto", padding: "20px 0 80px" },
  bar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 18px", position: "sticky", top: 16, zIndex: 50, marginBottom: 20 },
  split: { display: "grid", gridTemplateColumns: "300px 1fr", gap: 28, alignItems: "start" },
  sidebar: { position: "sticky", top: 92, overflowX: "hidden", overflowY: "auto", maxHeight: "calc(100vh - 110px)", padding: "3px 0 6px" },
  sideHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" },
  editor: { minWidth: 0, overflow: "hidden" },
  editorHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  metaCard: { padding: 18, marginBottom: 22 },
  iconGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(58px, 1fr))", gap: 8, marginTop: 8 },
  qHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  qEmpty: { padding: "40px 20px", textAlign: "center" },
  qPrompt: { fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text)" },
  // modal
  modalWrap: { position: "fixed", inset: 0, zIndex: 200, background: "rgba(3,6,10,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 },
  modal: { width: "min(620px, 96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column" },
  modalHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 22px 14px", borderBottom: "1px solid var(--hairline)" },
  modalBody: { padding: "18px 22px", overflowY: "auto", overflowX: "hidden" },
  modalFoot: { display: "flex", justifyContent: "flex-end", gap: 12, padding: "14px 22px", borderTop: "1px solid var(--hairline)" },
  typeRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }
};

Object.assign(window, { QuestionEditor, RoomEditor, AdminConsole });
