// app.jsx — root: routing, auth/session, tweaks
const { useState: useStateApp, useEffect: useEffectApp, useCallback: useCBApp } = React;

const TOKEN_KEY   = "quiz_arena_token_v1";
const SESSION_KEY = "quiz_arena_session_v1";

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": ["#00E5FF", "#FF3DCB"],
  "layout": "path",
  "bgIntensity": 1,
  "glow": 1,
  "speed": 1
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // apply tweak vars to :root
  useEffectApp(() => {
    const r = document.documentElement;
    const [a1, a2] = Array.isArray(t.accent) ? t.accent : [t.accent, "#FF3DCB"];
    r.style.setProperty("--accent", a1);
    r.style.setProperty("--accent-2", a2);
    r.style.setProperty("--bg-intensity", t.bgIntensity);
    r.style.setProperty("--glow-mult", t.glow);
    r.style.setProperty("--speed", t.speed);
  }, [t]);

  const [route, setRoute] = useStateApp(() => {
    // support bookmarkable hash: #leaderboard or #leaderboard/BATCH
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('leaderboard')) return 'leaderboard';
    return 'map';
  }); // map | room | leaderboard | session-lb
  const [token, setToken] = useStateApp(() => localStorage.getItem(TOKEN_KEY) || null);
  const [rooms, setRooms] = useStateApp([]);
  const [me, setMe] = useStateApp(null);
  const [activeRoom, setActiveRoom] = useStateApp(null);
  const [loadingRooms, setLoadingRooms] = useStateApp(true);
  const [booting, setBooting] = useStateApp(true);
  const [activeSession, setActiveSession] = useStateApp(null);
  const [sessionRestored, setSessionRestored] = useStateApp(false);
  const [testMode, setTestMode] = useStateApp(false);

  // boot splash
  useEffectApp(() => {
    const tm = setTimeout(() => setBooting(false), 900);
    return () => clearTimeout(tm);
  }, []);

  // validate stored session after login
  useEffectApp(() => {
    if (!token) return;
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    let parsed;
    try { parsed = JSON.parse(stored); } catch { localStorage.removeItem(SESSION_KEY); return; }
    window.api.sessions.get(token, parsed.code)
      .then(({ session }) => {
        if (session.status === 'active') {
          setActiveSession(session);
          setSessionRestored(true);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      })
      .catch(() => localStorage.removeItem(SESSION_KEY));
  }, [token]);

  const refresh = useCBApp(async () => {
    if (!token) return;
    setLoadingRooms(true);
    try {
      const [roomsData, summary] = await Promise.all([
        window.api.rooms(token),
        Promise.resolve(window.api.me(token))
      ]);
      setRooms(roomsData.rooms);
      setTestMode(roomsData.test_mode || false);
      setMe(summary);
    } catch (e) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    } finally {
      setLoadingRooms(false);
    }
  }, [token]);

  useEffectApp(() => { if (token) refresh(); }, [token]);

  function onAuthed(tok, role) {
    localStorage.setItem(TOKEN_KEY, tok);
    setToken(tok);
    if (role === "admin") { window.location.hash = 'admin/rooms'; setRoute("admin"); }
    else setRoute("map");
  }
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setActiveSession(null);
    setRooms([]); setMe(null);
  }

  function joinSession(sess) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ code: sess.code }));
    setActiveSession(sess);
    setSessionRestored(false);
  }
  function leaveSession() {
    localStorage.removeItem(SESSION_KEY);
    setActiveSession(null);
    setSessionRestored(false);
  }

  function enterRoom(room, mode = 'fresh') {
    setActiveRoom({ id: room.id, mode });
    setRoute("room");
  }
  function exitRoom() { setRoute("map"); refresh(); }
  function roomCompleted() { setRoute("map"); refresh(); }

  const isAdmin = me && me.role === "admin";

  let screen;
  if (booting) {
    screen = <LoadingScreen label="BOOTING QUIZARENA" />;
  } else if (!token) {
    screen = <AuthScreen onAuthed={onAuthed} />;
  } else if (route === "admin") {
    screen = <AdminConsole token={token} me={me} onExitToGame={() => { window.location.hash = ''; setRoute("map"); refresh(); }} onLogout={logout} />;
  } else if (route === "room") {
    screen = <RoomScreen token={token} roomId={activeRoom?.id} mode={activeRoom?.mode || 'fresh'} userId={me?.id} onExit={exitRoom} onCompleted={roomCompleted} />;
  } else if (route === "leaderboard") {
    screen = <Leaderboard token={token} me={me} onExit={() => { window.location.hash = ''; setRoute("map"); }} />;
  } else if (route === "session-lb") {
    screen = <Leaderboard token={token} me={me} sessionCode={activeSession?.code} onExit={() => setRoute("map")} />;
  } else {
    screen = <RoomMap token={token} rooms={rooms} me={me} loading={loadingRooms}
      layout={t.layout} isAdmin={isAdmin}
      activeSession={activeSession}
      sessionRestored={sessionRestored}
      testMode={testMode}
      onSessionRestoreDismiss={() => setSessionRestored(false)}
      onEnter={enterRoom}
      onLeaderboard={() => { if (!activeSession) window.location.hash = 'leaderboard'; setRoute(activeSession ? "session-lb" : "leaderboard"); }}
      onAdmin={() => { if (!window.location.hash.startsWith('#admin/')) window.location.hash = 'admin/rooms'; setRoute("admin"); }}
      onLogout={logout}
      onRefresh={refresh}
      onJoinSession={joinSession}
      onLeaveSession={leaveSession} />;
  }

  return (
    <>
      <Atmos />
      <div className="app-root">{screen}</div>

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent}
          options={[
            ["#00E5FF", "#FF3DCB"],
            ["#5CFF8F", "#00E5FF"],
            ["#FF3DCB", "#7A5CFF"],
            ["#FFB000", "#FF4D6D"]
          ]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Room Map" />
        <TweakRadio label="Layout" value={t.layout}
          options={["path", "grid"]}
          onChange={(v) => setTweak("layout", v)} />
        <TweakSection label="Atmosphere" />
        <TweakSlider label="Background" value={t.bgIntensity} min={0} max={1.6} step={0.1}
          onChange={(v) => setTweak("bgIntensity", v)} />
        <TweakSlider label="Glow" value={t.glow} min={0} max={2} step={0.1}
          onChange={(v) => setTweak("glow", v)} />
        <TweakSlider label="Motion speed" value={t.speed} min={0.4} max={2} step={0.1} unit="×"
          onChange={(v) => setTweak("speed", v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ToastProvider><App /></ToastProvider>
);
