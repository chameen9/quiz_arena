# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Setup
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite   # already present after clone
php artisan migrate --seed

# Dev server
php artisan serve                # http://localhost:8000

# Lint (Laravel Pint)
./vendor/bin/pint

# Tests (PHPUnit — no test files exist yet)
php artisan test
php artisan test --filter TestName

# Reset content + progress to seeded defaults (destructive)
# POST /api/admin/reset  (or via tinker)
php artisan db:seed
```

## Architecture

**Stack:** Laravel 11 REST API + Sanctum token auth + SQLite (default). No frontend build step — React SPA lives in `public/app/` and runs via in-browser Babel.

### Data model

```
Module (room) 1──* Challenge
User 1──* Progress (one row per user/module — stores score, completed, attempts count)
User 1──* ChallengeAttempt (one row per user/challenge — stores best points per attempt)
LeaderboardSeed (intentionally empty — no fake NPC rows)
Batch (admin-managed batch names shown in registration dropdown; has test_mode boolean)
BatchRoomAccess (batch × module_id × max_attempts — which rooms a batch can access + attempt limit)
GameSession (temp session with 6-char code, subset of rooms, active/closed status)
SessionParticipant (session × user join table)
```

`users` table has a `batch` (nullable string) field for student cohort/group. Batch is **required** on registration.

### Request flow

1. Auth: `POST /api/login` → Sanctum personal access token stored in `localStorage` as `quiz_arena_token_v1`.
2. Student loads rooms via `GET /api/rooms` — if the student's batch has entries in `batch_room_access`, only those modules are returned; unlock logic then walks them in `sequence` order.
3. Room gate enforced server-side in `RoomController::show()` via `isUnlocked()` — also respects batch filter. Exhausted rooms (attempts >= max_attempts) are still enterable but return `test_mode: true`.
4. Submit answer via `POST /api/challenges/{challenge}/submit` → `Challenge::grade()` handles mcq/msq/text/regex types → `ChallengeController::submit()` computes speed bonus (up to 30% of base points), upserts `ChallengeAttempt` keeping best score, and marks `Progress.completed` when the **last challenge by `order`** is submitted.
5. Admin routes under `/api/admin/*` are gated by `EnsureAdmin` middleware (checks `users.role = 'admin'`).

### Batch system

- Admin creates named batches in admin console → BATCHES tab.
- Batch names appear as `BatchSelect` custom dropdown on the student registration screen — fetched from public `GET /api/batches`. Batch is required on register.
- Per-batch room access + attempt limits set via `PUT /api/admin/batches/{batch}/access` body: `{rooms:[{module_id, max_attempts}], test_mode}`.
- `max_attempts` per room: stored in `batch_room_access.max_attempts`. null = unlimited. Incremented via `POST /api/rooms/{module}/start-attempt` called client-side on first answer submission or START OVER.
- **Attempt exhaustion → per-room practice mode**: when `progress.attempts >= max_attempts`, that room's `exhausted=true`. Room card shows `🧪 PRACTICE` badge; student can still enter but scores are NOT saved. Only affects that specific room.
- **Batch-level test mode**: admin toggle per batch — ALL rooms in the batch become practice mode regardless of attempts. Scores never saved to leaderboard.
- `RoomController` checks `BatchRoomAccess` to filter modules and build access map. `isUnlocked()` resolves previous room within the batch-allowed set.
- Leaderboard `?view=batch` — same-batch students only, `rooms_total` = batch room count. Test-mode batches excluded from all-time leaderboard.
- Admin BATCHES tab shows: create/delete batches, test mode toggle, per-room max_attempts inputs, collapsible student roster (handle, email, points, rooms cleared, join date, delete button). Unassigned students shown separately.

### Attempt tracking

- `Progress.attempts` incremented by `POST /api/rooms/{module}/start-attempt` (not at room completion).
- Client fires `startAttempt` on: (a) first question submit in a fresh session, (b) START OVER on the resume prompt.
- RESUME (continuing mid-room progress) does NOT fire `startAttempt` — same attempt continues.
- Room progress persisted in `localStorage` as `quiz_arena_room_progress_v1` keyed by room ID. On re-entry: resume prompt shown if saved idx > 0.

### Sessions system

- Admin creates a session (title + subset of rooms) → gets a 6-char uppercase code (e.g. `XK7P2Q`).
- Students enter code via ⚡ SESSION button on room map → joins `session_participants`, enters session mode.
- Session mode: student sees only session rooms (all unlocked), session banner shown, RANKS button shows session leaderboard.
- Session stored in `localStorage` as `quiz_arena_session_v1` (JSON `{code}`). Validated on load; cleared if session is closed. On restore: `↩ SESSION RESUMED` banner shown with dismiss button.
- Session leaderboard (`GET /api/sessions/{code}/leaderboard`) aggregates `ChallengeAttempt` for session participants + session modules only.
- Admin can open/close/delete sessions from SESSIONS tab.

### Key conventions

- `Challenge::toPublicArray()` strips answer keys before sending to students; `toAdminArray()` includes them. Never return raw `Challenge` model to student endpoints.
- `Module::sequence` drives unlock order and is re-packed (1, 2, 3…) on delete/reorder.
- `POST /api/admin/reset` truncates all content/progress tables and re-runs `ModuleSeeder` + `LeaderboardSeeder` — useful for demo resets.
- The `admin` middleware alias is registered in `bootstrap/app.php` (maps to `EnsureAdmin`).
- **Relationship orderBy trap**: `Module::challenges()` defines `->orderBy('order')` ASC. Calling `->orderByDesc('order')` on the relationship yields `ORDER BY order ASC, order DESC` — SQLite gives ASC priority. Always use a fresh query `Challenge::where('module_id', $id)->orderByDesc('order')` when you need DESC.
- **Admin draft sync**: after `saveModule()` returns, call `setDraft(JSON.parse(JSON.stringify(saved)))` to replace temporary string IDs (`"q_abc123"`) with real DB IDs. Without this, subsequent saves will duplicate new questions and delete previously saved ones.
- **Cache busting**: `app.blade.php` uses `filemtime` on all `public/app/*.jsx` and `*.css` files to append `?v=` query params. Changes to any frontend file are picked up on next normal browser refresh.
- **User delete**: `DELETE /api/admin/users/{user}` — guards against self-delete and admin-delete.
- **Progress model `$fillable`**: must include `attempts` — adding new Progress columns requires updating `$fillable` or saves silently drop them.
- **`startAttempt` new record**: `firstOrNew` leaves `score` and `completed` unset on new records — must explicitly set defaults before `save()` to avoid NOT NULL constraint errors.

### Frontend

`public/app/` — React components using in-browser Babel transform. `api-client.js` wraps `fetch()` with Bearer token injection. Not compiled; for production, migrate to a Vite build.

Key shared globals exported via `Object.assign(window, {...})` in `common.jsx`:
- `RoomIcon({ iconKey, size, stroke })` — inline SVG icon component (20 icons). `LEGACY_ICON_MAP` maps old seeder keys (html, css, js, etc.) to current icon keys.
- `ICON_OPTIONS` — array of `{ key, label }` for the admin icon picker.

### Admin console features

- **Tabs**: ROOMS · SESSIONS · BATCHES · RANKINGS
- **RANKINGS tab**: `RankingsPanel` — batch filter dropdown, ranked table, manual refresh + auto-refresh countdown (30s).
- **CSV bulk import**: `BulkImportModal` accepts CSV `type,prompt,opt_a,opt_b,opt_c,opt_d,correct,hint,points,timer`. Appends to draft; does not auto-save.
- **Icon picker**: uses `ICON_OPTIONS` from `common.jsx`; renders inline SVG via `RoomIcon`.
- **Sidebar**: `position: sticky` with `overflowY: auto` + `maxHeight: calc(100vh - 110px)`. `.room-tab` needs `min-width: 0` (set in admin.css) for text-overflow ellipsis to fire as a grid item.
- **Responsive layout**: `ad-split-collapse` grid collapses sidebar to 220px at ≤960px, full single-column at ≤720px.
- **Custom batch dropdown**: `BatchSelect` component in `screen-auth.jsx` — themed dropdown replacing native `<select>`, closes on outside click.

### Student leaderboard

- `GET /api/leaderboard?view=all|batch` — `all` excludes test-mode batch students; `batch` scoped to same-batch only.
- Hash URL: `http://localhost:8000/#leaderboard` opens leaderboard directly after login (bookmarkable/shareable).
- Auto-refresh toggle (⏱) with 30s countdown; manual refresh (↺) button.
- MY BATCH tab shown by default when student has a batch. ALL TIME tab always available.

### Default seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin/Instructor | `admin@codeverse.dev` | `admin123` |
| Student | `student@codeverse.dev` | `student123` |
