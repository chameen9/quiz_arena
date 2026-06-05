// api-client.js — talks to the real Laravel REST API.
// Same surface as the prototype's mock so the React components are unchanged.
// A Bearer token (from login/register) is sent on every authenticated request.
(function () {
  const BASE = "/api";

  async function request(path, { method = "GET", token = null, body = null } = {}) {
    const headers = { Accept: "application/json" };
    if (body != null) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = "Bearer " + token;

    let res;
    try {
      res = await fetch(BASE + path, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw { status: 0, message: "Network error — is the server running?" };
    }

    let data = null;
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch (e) { data = null; } }

    if (!res.ok) {
      let message = (data && data.message) || res.statusText || "Request failed";
      // surface the first Laravel validation error if present
      if (data && data.errors) {
        const first = Object.values(data.errors)[0];
        if (first && first[0]) message = first[0];
      }
      throw { status: res.status, message };
    }
    return data;
  }

  function genId(p) {
    return (p || "id") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  window.api = {
    // ---- auth ----
    register: (payload) => request("/register", { method: "POST", body: payload }),
    login: (payload) => request("/login", { method: "POST", body: payload }),
    logout: (token) => request("/logout", { method: "POST", token }),

    // ---- student ----
    rooms: (token) => request("/rooms", { token }),
    room: (token, id) => request("/rooms/" + id, { token }),
    submit: (token, cid, body) => request("/challenges/" + cid + "/submit", { method: "POST", token, body }),
    startAttempt: (token, moduleId) => request("/rooms/" + moduleId + "/start-attempt", { method: "POST", token }),
    leaderboard: (token, view) => request("/leaderboard" + (view ? "?view=" + view : ""), { token }),
    me: (token) => request("/me", { token }),

    // no-op kept for component compatibility (server is stateless per submit)
    _resetRoomBuffer: () => {},

    // ---- public ----
    batches: () => request("/batches"),

    // ---- sessions ----
    sessions: {
      join: (token, code) => request("/sessions/join", { method: "POST", token, body: { code } }),
      get: (token, code) => request("/sessions/" + code, { token }),
      leaderboard: (token, code) => request("/sessions/" + code + "/leaderboard", { token }),
    },

    // ---- admin ----
    admin: {
      modules: (token) => request("/admin/modules", { token }),
      saveModule: (token, mod) => request("/admin/modules/" + mod.id, { method: "PUT", token, body: mod }),
      createModule: (token) => request("/admin/modules", { method: "POST", token }),
      deleteModule: (token, id) => request("/admin/modules/" + id, { method: "DELETE", token }),
      reorder: (token, ids) => request("/admin/modules/reorder", { method: "POST", token, body: { ids } }),
      resetAll: (token) => request("/admin/reset", { method: "POST", token }),
      newId: genId,
      sessions: {
        list: (token) => request("/admin/sessions", { token }),
        create: (token, data) => request("/admin/sessions", { method: "POST", token, body: data }),
        update: (token, id, data) => request("/admin/sessions/" + id, { method: "PATCH", token, body: data }),
        delete: (token, id) => request("/admin/sessions/" + id, { method: "DELETE", token }),
      },
      batches: {
        list:         (token)             => request("/admin/batches", { token }),
        create:       (token, name)        => request("/admin/batches", { method: "POST", token, body: { name } }),
        delete:       (token, batch)       => request("/admin/batches/" + encodeURIComponent(batch), { method: "DELETE", token }),
        updateAccess: (token, batch, data) => request("/admin/batches/" + encodeURIComponent(batch) + "/access", { method: "PUT", token, body: data }), // data: {rooms:[{module_id,max_attempts}], test_mode}
      },
      users: {
        delete: (token, id) => request("/admin/users/" + id, { method: "DELETE", token }),
      },
      rankings: (token, batch) => request("/admin/rankings" + (batch ? "?batch=" + encodeURIComponent(batch) : ""), { token }),
    },
  };
})();
