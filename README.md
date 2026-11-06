# Nudle Learn

A web-based learning platform that lets educational institutions manage learners, assign interactive learning activities and monitor performance. Built for **Challenge One – Build the Learning Platform**.

## Features

### Administrator
- **Dashboard** – total learners, active learners, assigned activities, completion rate, average score, assignment status breakdown (completed / in progress / not started / overdue), completion by subject, per-activity completion statistics and recent completions.
- **Learner management** – add, edit (incl. password reset), live search by name/email, filter by status and cohort, deactivate/reactivate. Deactivated learners cannot log in.
- **Activities** – create, edit and delete three activity types:
  - **Lesson** – content sections plus optional check-your-understanding questions
  - **Quiz** – multiple-choice questions
  - **Simulation** – interactive projectile-motion lab (configurable target distance and tolerance) plus optional questions
- **Assignment** – assign to individual learners and/or a whole cohort, with an optional due date.
- **Learner progress** – per-learner page with stats, every assignment's status/best score/attempts, and full attempt history.
- **Activity statistics** – per-activity page with completion rate, average score and each assignee's progress.

### Learner
- Secure login to a learner dashboard with personal stats.
- View assigned activities (To do / Completed / All), with due dates and overdue flags.
- Launch and complete activities: read lessons, answer questions, run the physics simulation. Immediate feedback shows correct answers; activities can be retried.
- **My progress** – overall completion, progress by subject, completion history and every attempt.

## Tech stack

| Layer     | Choice |
|-----------|--------|
| Back end  | Node.js 22 + Express 4, REST JSON API |
| Database  | SQLite via Node's built-in `node:sqlite` (no native build step) |
| Auth      | scrypt-hashed passwords, HMAC-signed bearer tokens (12 h), role-based route guards |
| Front end | Dependency-free single-page app (vanilla JS, hash routing), responsive CSS, canvas simulation |
| Tests     | Node's built-in test runner (`node:test`) – API integration tests |

Design decisions:
- **Grading happens on the server.** Correct answers are never sent to the learner's browser, and the simulation result is recomputed from the submitted angle/speed with projectile physics – so scores can't be tampered with.
- A learner can only see and submit their own assignments (enforced in SQL by `learner_id`).
- Zero build tooling keeps the project easy to run and review: `npm install && npm start`.

## Running locally

Requirements: **Node.js 22.5 or newer** (for built-in SQLite).

```bash
npm install
```

```bash
npm start
```

Open http://localhost:3000. On first start the database (`data/nudle.db`) is created and seeded with demo data.

| Role          | Email             | Password     |
|---------------|-------------------|--------------|
| Administrator | admin@nudle.edu   | `admin123`   |
| Learner       | amara@nudle.edu   | `learner123` |

All seeded learners (liam@, sofia@, noah@, priya@ …@nudle.edu) use `learner123`; ethan@nudle.edu is seeded as deactivated. The login page has one-click buttons to fill in the demo accounts.

Other scripts:

```bash
npm test        # run the API test suite (in-memory database)
```

```bash
npm run dev     # restart automatically on file changes
```

```bash
npm run reset   # delete the local database; it is re-seeded on next start
```

Environment variables (all optional): `PORT` (default 3000), `DB_FILE` (database path), `APP_SECRET` (token signing secret – set this in production so sessions survive restarts).

## Deployment

Any Node 22 host works (Render, Railway, Fly.io, a VPS). Build command `npm install`, start command `npm start`, set `APP_SECRET`, and mount persistent storage at `data/` (or point `DB_FILE` at it) so data survives redeploys.

## Project structure

```
server/
  index.js   entry point: open DB, seed, start server
  app.js     Express app: auth, admin & learner API, grading, static hosting
  db.js      schema + password hashing
  seed.js    demo learners, activities and progress
public/
  index.html, styles.css
  app.js     single-page front end (admin + learner views, simulation)
test/
  api.test.js
```

## API overview

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/login` | – | Log in, returns token |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/admin/stats` | admin | Dashboard metrics |
| GET/POST | `/api/learners` | admin | List (`q`, `status`, `cohort`) / create |
| GET/PUT | `/api/learners/:id` | admin | Progress detail / update |
| PATCH | `/api/learners/:id/status` | admin | Activate / deactivate |
| GET | `/api/cohorts` | admin | Distinct cohorts |
| GET/POST | `/api/activities` | admin | List with stats / create |
| GET/PUT/DELETE | `/api/activities/:id` | admin | Stats detail / update / delete |
| POST | `/api/activities/:id/assign` | admin | Assign to learners and/or cohort |
| DELETE | `/api/assignments/:id` | admin | Remove an assignment |
| GET | `/api/me/assignments` | learner | My assignments + summary |
| GET | `/api/me/assignments/:id` | learner | Activity content (answers hidden) |
| POST | `/api/me/assignments/:id/start` | learner | Mark in progress |
| POST | `/api/me/assignments/:id/submit` | learner | Submit; graded on server |
| GET | `/api/me/history` | learner | All my attempts |

Data model: `users` (admin/learner, cohort, active) → `assignments` (learner × activity, status, best score, attempts, due date) ← `activities` (type, content JSON, pass mark); each submission is stored in `attempts`.

## Possible next steps
- More simulation types and a richer content editor (images, video)
- CSV import of learners, bulk actions, and exportable reports
- Password self-service and email notifications for new assignments
