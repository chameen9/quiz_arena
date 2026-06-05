# Code Arena — Laravel + React

A competitive, escape-room style coding platform for IT-diploma students.
Students log in, progress through sequential **rooms** (course modules), answer
code challenges (MCQ / MSQ / text / regex, with optional images) to earn points,
and climb an all-time leaderboard. Each room unlocks only after the previous one
is cleared. Instructors get an **admin console** to author rooms and questions.

This package is a complete Laravel 11 backend (REST API + database + Sanctum
token auth) serving a React single-page frontend.

---

## Requirements

- PHP **8.2+** with the `pdo_sqlite` extension (bundled with most PHP builds)
- [Composer](https://getcomposer.org)
- (Optional) MySQL or PostgreSQL if you prefer it over SQLite

No Node/npm build step is required: the frontend runs from `public/app/` using the
in-browser Babel transformer. (See **Going to production** for compiling it.)

---

## Quick start

```bash
# 1. Install PHP dependencies
composer install

# 2. Environment
cp .env.example .env
php artisan key:generate

# 3. Database (SQLite by default — the file is already present, but this is safe)
touch database/database.sqlite
php artisan migrate --seed

# 4. Run
php artisan serve
```

Open **http://localhost:8000**.

### Default accounts (created by the seeder)

| Role        | Email                     | Password     |
|-------------|---------------------------|--------------|
| Instructor  | `admin@codeverse.dev`     | `admin123`   |
| Student     | `student@codeverse.dev`   | `student123` |

Or register a brand-new student handle from the auth screen. Admins land on the
**Instructor Console**; students land on the **Room Map**.

### Using MySQL/PostgreSQL instead of SQLite
Edit `.env` — comment `DB_CONNECTION=sqlite` and fill the MySQL/Postgres block,
then re-run `php artisan migrate --seed`.

---

## API contract

All authenticated requests expect `Authorization: Bearer <token>` (Sanctum
personal access token returned by login/register).

| Method & path                         | Purpose                                   |
|---------------------------------------|-------------------------------------------|
| `POST /api/register`                  | `{ token, user:{id,name,role} }`          |
| `POST /api/login`                     | same                                      |
| `POST /api/logout`                    | revoke current token                      |
| `GET  /api/me`                        | current user summary                      |
| `GET  /api/rooms`                     | `{ rooms:[{id,sequence,title,type,unlocked,completed,score,...}] }` |
| `GET  /api/rooms/{module}`            | `{ module, challenges:[…] }` (no answer keys) |
| `POST /api/challenges/{challenge}/submit` | body `{ answer, time_taken }` → `{ correct, points_awarded, correct_answer, hint, module_completed, next_room_unlocked, timed_out }` |
| `GET  /api/leaderboard`               | `{ leaderboard:[{name,rooms_cleared,total_points,you}] }` |

**Admin (role = admin):**

| Method & path                         | Purpose                          |
|---------------------------------------|----------------------------------|
| `GET    /api/admin/modules`           | all rooms with full answer keys  |
| `POST   /api/admin/modules`           | create a blank room              |
| `PUT    /api/admin/modules/{module}`  | save room meta + sync questions  |
| `DELETE /api/admin/modules/{module}`  | delete a room                    |
| `POST   /api/admin/modules/reorder`   | body `{ ids:[…] }`               |
| `POST   /api/admin/reset`             | restore default content + clear progress |

### Question schema
```jsonc
{
  "type": "mcq | msq | text | regex",
  "prompt": "…",
  "material": "optional code block",
  "language": "js",
  "image": "optional data URL (question stem)",
  "options": [{ "id": "o0", "text": "…", "image": null }],  // mcq/msq
  "correct": ["o0"],                                         // mcq = 1, msq = many
  "answer": "flex",                                          // text
  "answer_pattern": "^git\\s+add\\s+\\.$",                   // regex
  "answer_display": "git add .",                             // regex
  "hint": "…", "points": 100, "time_limit": 30
}
```

### Scoring & unlock rules
- Correct answers earn full points plus up to a **30% speed bonus**.
- A room is **completed** when its last challenge (by order) is submitted; the
  room score is the sum of the student's best points per challenge (best score
  kept across replays).
- A room unlocks once the previous room (by `sequence`) is completed.

---

## Project layout

```
app/
  Http/Controllers/Api/        AuthController, RoomController, ChallengeController, LeaderboardController
  Http/Controllers/Api/Admin/  ModuleController (room & question CRUD)
  Http/Middleware/             EnsureAdmin
  Models/                      User, Module, Challenge, Progress, ChallengeAttempt, LeaderboardSeed
database/
  migrations/                  schema
  seeders/                     DatabaseSeeder, ModuleSeeder (10 modules / 30 questions), LeaderboardSeeder
routes/
  api.php                      REST API
  web.php                      serves the SPA
resources/views/app.blade.php  SPA shell
public/app/                    React frontend
  api-client.js                real fetch() wrapper (Bearer token)
  *.jsx, *.css                 screens, components, styles (terminal-cyber-glass)
```

---

## Frontend notes

- The React app (`public/app/`) is the same UI as the prototype, with the mock
  data layer swapped for `api-client.js`, which calls the real API above.
- Aesthetic: "terminal-cyber-glass" — monospace, glassmorphism, neon accents,
  animated grid background. A **Tweaks** panel exposes accent color, room-map
  layout, background/glow intensity and motion speed.
- The token is stored in `localStorage` (`code_arena_token_v1`).

### Going to production
The in-browser Babel transformer is great for hacking but not for production.
To compile: move the `public/app/*.jsx` into a Vite/React setup
(`npm create vite@latest`), import the components as ES modules, drop the
`tweaks-panel`/`common` `window` exports in favour of real imports, and build to
`public/build`. Then reference the built bundle from `app.blade.php`.

---

## License
MIT — yours to extend.
