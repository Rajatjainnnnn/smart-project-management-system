# Smart Project Management System

SPMS is being actively developed by:

- Rajat Jain
- Parth Bathe
- Himank Yadav
- Atharva Inamdar
- Manan Sharma

This project is a full-stack Django + React student project management system. The current branch focuses on a minimal, production-ready authentication foundation for the app.

## Authentication added in this branch

The project now includes a lightweight authentication system based on Django REST Framework and SimpleJWT.

### Included features

- User registration with hashed passwords
- Login with username and password returning JWT access and refresh tokens
- Protected profile endpoint for the authenticated user
- Logout endpoint that blacklists the refresh token
- Password validation using Django’s built-in validators
- Frontend sign-in/register view that stores JWTs in session storage
- Basic responsive styling aligned with the project’s SPMS branding

### API endpoints

Base path: `/auth/`

- `POST /auth/register/` — create a new user account
- `POST /auth/token/` — issue JWT access and refresh tokens
- `POST /auth/token/refresh/` — refresh an access token
- `GET /auth/profile/` — fetch the current authenticated user
- `POST /auth/logout/` — blacklist a refresh token and end the session

### Project structure relevant to auth

- `config/settings.py` — adds DRF + SimpleJWT configuration
- `config/urls.py` — exposes auth routes under `/auth/`
- `projects/serializers.py` — registration and profile serializers
- `projects/views.py` — registration, profile, and logout logic
- `projects/urls.py` — auth route definitions
- `frontend/src/App.jsx` — login/register UI and session handling

### Validation

The auth flow is covered by Django tests for:

- registration success
- login token issuance
- authenticated profile access
- logout and refresh-token invalidation
- user ownership checks during logout

### Local run instructions

1. Create or activate the project virtual environment.
2. Install dependencies:
   - `pip install -r requirements.txt`
   - `cd frontend && npm install`
3. Start Django:
   - `python manage.py runserver 127.0.0.1:8000`
4. Start Vite frontend:
   - `cd frontend && npm run dev -- --host 127.0.0.1`
5. Open the app in a browser at `http://127.0.0.1:5173/`

For more project context, see `PROJECT_CONTEXT.md`.
