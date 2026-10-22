# SPMS Frontend

React frontend for the Smart Project Management System (SPMS), a Jira-inspired project and task manager for student teams.

## Tech stack

- React 19 with Vite
- JavaScript (not TypeScript)
- Tailwind CSS v4 (imported in `src/index.css`)
- React Router
- The backend is Django + Django REST Framework with SimpleJWT login (see the repository root)

## Getting started

You need Node.js (LTS) and the Django backend running locally.

```bash
# 1. Start the backend (from the repository root)
python manage.py migrate
python manage.py runserver        # serves http://127.0.0.1:8000

# 2. Start the frontend (in a second terminal)
cd frontend
npm install
npm run dev                       # usually http://localhost:5173
```

Requests to `/api` are proxied to `http://127.0.0.1:8000` by `vite.config.js`, so the frontend uses relative URLs such as `/api/projects/`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run lint` | Run ESLint |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |

Run `npm run lint` and `npm run build` before opening a pull request.

## Project structure

```text
src/
├── App.jsx            Routes and the login guard
├── main.jsx           App entry point
├── index.css          Tailwind import and design tokens
├── components/        Shared UI (Sidebar, Navbar)
├── layouts/           DashboardLayout (sidebar + navbar + page area)
├── lib/auth.js        Login storage, API helper and token refresh
├── data/              Demo data and the Dashboard data loader
└── pages/             One file per page
```

## Routes

| Path | Page |
|---|---|
| `/login`, `/register` | Public sign-in and registration |
| `/dashboard` | Dashboard overview |
| `/projects` | Project list and creation |
| `/projects/:projectId/board` | Kanban board for a project |
| `/tasks` | My Tasks |
| `/profile` | Profile, skills and password |

All routes except login and register require a signed-in user. Sidebar items for pages that do not exist yet are shown as "Soon".

## Authentication

- Login state is stored in `localStorage` under `spms-auth`.
- Use `apiRequest` from `src/lib/auth.js` for backend calls. It adds the JWT `Authorization` header and refreshes an expired token once.
- Do not create a second token store or duplicate the refresh logic.

## Design tokens

Colors and the border radius are CSS variables in `src/index.css`. Use them in Tailwind classes, for example `bg-(--primary)` or `text-(--text-muted)`, instead of hard-coding colors.

| Token | Use |
|---|---|
| `--primary` `#2563EB` | Main actions and links |
| `--smart` `#7C3AED` | "Smart" features |
| `--background` / `--surface` | Page and card backgrounds |
| `--text-primary` / `--text-secondary` / `--text-muted` | Text |
| `--border` | Borders |
| `--success` / `--warning` / `--danger` / `--info` | Status colors |

## Data status

Not everything on screen is connected to the backend yet:

- **Dashboard:** demo data, loaded through `src/data/dashboardData.js`. The page shows a "demo data" notice.
- **Projects, My Tasks and the Kanban board:** demo data stored in the browser (`src/data/demoProjects.js` and `demoTasks.js`).
- **Login, registration and Profile:** use the real backend.

Do not describe demo values as live data.

## Working in the team repository

- Never commit directly to `main`. Create a feature branch, for example `feature/dashboard-frontend`.
- Stage only the files you changed (avoid `git add .`).
- Open a pull request and wait for a review before merging.
- Do not commit `node_modules`, `.env` files or secrets.
