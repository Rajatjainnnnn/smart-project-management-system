# SPMS Backend API Guide

This guide documents the existing Django REST API and the project-scoped analytics
endpoints included in this patch.

## Authentication

The API uses JWT access tokens. Obtain a token from the configured token endpoint,
then send it with each authenticated request:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

Use the exact endpoint names and payloads configured in `projects/auth_urls.py`.
Never commit access tokens, database passwords, or `.env` files.

## Project analytics endpoints

All project analytics routes require authentication and project membership (owner
or project member). A non-member receives `404 Project not found` so the API does
not disclose whether another user's project exists.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/projects/<project_pk>/analytics/` | Project progress, task counts, milestones, risk, recent activity |
| GET | `/api/projects/<project_pk>/workload/` | Workload summary per project member |
| GET | `/api/projects/<project_pk>/contribution/` | Task-derived contribution indicators and score explanation |
| GET | `/api/projects/<project_pk>/risk/` | Risk level and its contributing indicators |
| GET | `/api/dashboard/` | User-wide dashboard for accessible projects |
| GET | `/api/analytics/` | User-wide analytics for accessible projects |
| GET | `/api/projects/` | List projects the current user can access |
| POST | `/api/projects/` | Create a project; the authenticated user becomes owner |
| GET/PUT/PATCH/DELETE | `/api/projects/<id>/` | Retrieve/update/delete an accessible project, subject to role checks |
| GET/POST | `/api/projects/<project_pk>/tasks/` | List/create project tasks |
| PATCH | `/api/tasks/<id>/status/` | Update task status |
| PATCH | `/api/tasks/<id>/assign/` | Assign or unassign a task |
| GET/POST | `/api/projects/<project_pk>/members/` | List or add project members |
| GET/POST | `/api/projects/<project_pk>/recommendations/` | Skill-based task assignment suggestions |

## Example: project analytics response

```json
{
  "project_id": 12,
  "project_name": "Campus Planner",
  "project_status": "active",
  "total_tasks": 10,
  "completed_tasks": 4,
  "open_tasks": 6,
  "overdue_tasks": 1,
  "completion_percentage": 40.0,
  "status_breakdown": {
    "todo": 2,
    "in_progress": 3,
    "review": 1,
    "done": 4
  },
  "priority_breakdown": {
    "low": 2,
    "medium": 5,
    "high": 3
  },
  "risk_level": "medium",
  "risk_reasons": ["Some deadlines and project milestones need attention."]
}
```

The response above is illustrative; actual values are calculated from database records.

## Example: task creation

```http
POST /api/projects/12/tasks/
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "title": "Connect React to the Django API",
  "description": "Load projects from the backend and handle API errors.",
  "issue_type": "task",
  "status": "todo",
  "priority": "high",
  "estimated_effort": 5,
  "assignee_id": 4,
  "required_skill_ids": []
}
```

The assignee should be a member of the selected project. Verify this rule in the
current serializer/view implementation before exposing task creation to untrusted
clients; a future hardening change should validate membership for every write path.

## Metric definitions

- **Completion percentage** = completed tasks / all tasks × 100. If a project has no
  tasks, the percentage is `0`.
- **Overdue task** = a task with a due date before today's date and a status of
  `todo`, `in_progress`, or `review`.
- **Workload** is a heuristic derived from open task count, estimated effort,
  priority and overdue tasks. It should be used as a planning signal, not a
  clinical or employment evaluation.
- **Contribution** is a heuristic based on completed tasks, task priority, on-time
  completion and comments. It is explainable but should not be treated as a
  definitive ranking of individual effort.
- **Risk level** is a rule-based summary. It is not a predictive model and should
  be reviewed by the team before making project decisions.

## Local setup and verification

From the backend directory, activate the project's virtual environment and install
its pinned requirements, then run:

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py test projects
```

If the repository does not contain a dependency lock/requirements file, first
document and install the versions used by the project rather than guessing a
production dependency set.

## Frontend integration checklist

1. Store the access token using the existing authentication strategy; do not hardcode it.
2. Create a shared API client with a configurable base URL.
3. Attach the bearer token to authenticated requests.
4. Load Projects and My Tasks from the API instead of placeholder arrays.
5. Persist Kanban status changes through `PATCH /api/tasks/<id>/status/`.
6. Display loading, empty, success and error states.
7. Refresh the relevant query after a successful mutation.
8. Handle expired tokens and `401` responses consistently.
9. Test the UI against a local database with multiple users and project permissions.
