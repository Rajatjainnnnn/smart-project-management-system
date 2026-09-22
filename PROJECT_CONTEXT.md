# Smart Project Management System for Student Teams (SPMS)

## 1. Project Identity

**Project Name:** Smart Project Management System for Student Teams (SPMS)

**Project Type:** Full-stack web application

**Inspiration:** Jira-style project and issue management

**Target Users:** MCA, BCA, engineering and other college project teams

**Main Goal:** Manage academic software projects while analyzing team workload, contribution, skills, progress and project risks.

> SPMS combines standard project management with student-focused smart analytics and decision support.

---

## 2. Product Positioning

SPMS is **not simply a Jira clone**.

Jira is a broad professional project and issue management platform. SPMS is specifically optimized for student development teams and adds student-oriented workflows and analytics such as:

- Skill-based task assignment
- Workload analysis
- Workload fairness recommendations
- Contribution scoring
- Explainable project-risk detection
- Academic milestones such as documentation, presentation, viva and final submission

Do not claim that Jira has none of these concepts. The differentiation is the **student-focused combination, workflow, UX and our own algorithms**.

---

## 3. Technology Stack

| Layer | Technology | Language |
|---|---|---|
| Frontend | React.js | JavaScript |
| UI | JSX / HTML + CSS | JavaScript / HTML / CSS |
| Backend | Django | Python |
| API | Django REST Framework | Python |
| Database | MySQL | SQL |
| Communication | REST APIs | JSON |
| Version Control | Git | - |
| Repository | GitHub | - |

### Target Architecture

```text
User
  ↓
React Frontend
  ↓
REST API / JSON
  ↓
Django + Django REST Framework
  ↓
Business Logic / Services
  ↓
MySQL Database
```

### Authentication

Use API-based authentication (preferably JWT) for the React ↔ Django communication unless the existing repository has already standardized on another authentication approach.

---

## 4. Problem We Solve

Student teams commonly need answers to:

- Who is doing which task?
- Who is overloaded?
- Who has the required skill for a task?
- Which tasks are overdue?
- Why is the project getting delayed?
- How much is each member contributing?
- What academic deliverables still need to be completed?

A normal task tracker mainly answers: **What work needs to be done?**

SPMS additionally aims to answer: **Who should do it, is the workload balanced, how is the team contributing, and is the project at risk?**

---

## 5. User Roles

### Admin
- Manage users
- System-level administration
- Manage global settings if required

### Project Manager / Team Leader
- Create and manage projects
- Add/remove project members
- Create tasks and bugs
- Assign/reassign work
- Manage milestones
- View project analytics
- View project risks
- Manage project progress

### Student / Team Member
- View projects
- View assigned work
- Update task status
- Add comments
- Upload attachments
- Manage profile and skills
- View workload and contribution
- Receive notifications

---

## 6. Core Modules

1. Authentication
2. User/Profile Management
3. Project Management
4. Team/Member Management
5. Task Management
6. Bug Management
7. Kanban Board
8. Comments/Collaboration
9. Notifications
10. Academic Milestones
11. Dashboard
12. Analytics
13. Workload Analysis
14. Contribution Score
15. Skill-Based Assignment
16. Project Risk Radar

---

## 7. Authentication

Required capabilities:

- Register
- Login
- Logout
- Profile
- Password change/reset
- Role-aware access
- User skills management

The backend must validate credentials and authorization. The frontend must not store secrets in source code.

---

## 8. Project Management

A project contains:

```text
Project
 ├── Members
 ├── Tasks
 ├── Bugs
 ├── Milestones
 ├── Comments
 ├── Attachments
 ├── Activity
 ├── Analytics
 └── Risks
```

Example project:

```text
Project: Smart E-Commerce Website
Description: MCA software project
Start Date: 01 September
End Date: 30 September
```

---

## 9. Team Management

Each project has a set of members and roles.

Each member should have skills because the smart task assignment feature depends on this information.

Example:

```text
Rajat
  Python, Django, SQL, React

Rahul
  Java, SQL

Priya
  React, JavaScript, UI/UX

Amit
  Python, Machine Learning, Testing
```

---

## 10. Task Management

A task should support at least:

- ID
- Title
- Description
- Type (task / bug)
- Project
- Creator
- Assignee
- Status
- Priority
- Due date
- Estimated effort
- Required skills
- Created date
- Updated date

Example:

```text
TASK-101
Title: Create Login API
Type: Task
Priority: High
Assignee: Rajat
Status: In Progress
Due Date: 25 September
Required Skills: Python, Django, REST API
```

### Default Task Workflow

```text
TO DO → IN PROGRESS → REVIEW → DONE
```

Tasks should support create/read/update/delete, assignment, status changes, priority, deadlines, comments, attachments and history.

---

## 11. Bug Management

Bugs should reuse the task/issue infrastructure where practical.

Example:

```text
BUG-025
Title: Login fails with incorrect token
Severity: High
Assignee: Rajat
Status: Open
```

Possible workflow:

```text
OPEN → IN PROGRESS → FIXED → TESTING → CLOSED
```

---

## 12. Kanban Board

Default board columns:

```text
TO DO | IN PROGRESS | REVIEW | DONE
```

Users should be able to move tasks between statuses according to their permissions.

---

## 13. Academic Milestones

SPMS is student-focused, so projects can track academic deliverables such as:

- Project Proposal
- Requirements / SRS
- System Design
- ER Diagram
- Development
- Testing
- Documentation
- Presentation
- Viva
- Final Submission

Example:

```text
✅ Proposal
✅ SRS
✅ ER Diagram
🟡 Development
🔴 Testing
🔴 Documentation
🔴 Presentation
🔴 Viva
```

---

## 14. Smart Feature: Skill-Based Task Assignment

When creating a task, a team leader can specify required skills.

Example:

```text
Task: Build ML Model
Required Skills: Python, OpenCV, Machine Learning
```

The system compares the required skills with member skills and produces a transparent match score.

Example:

```text
Amit  → 95% match
Rajat → 72% match
Rahul → 30% match
```

### Basic matching concept

```text
Skill Match Score =
(matched required skills / total required skills) × 100
```

The algorithm may later incorporate workload as a separate factor, but do not hide the reasoning.

---

## 15. Smart Feature: Workload Analysis

The system estimates a member's current workload using factors such as:

- Number of active tasks
- Task priority
- Estimated effort
- Due dates
- Overdue tasks

Example:

```text
Rajat  92%
Rahul  67%
Priya  49%
Amit   25%
```

The exact formula should be centralized in a backend service so it can be changed without rewriting the UI.

---

## 16. Smart Feature: Workload Fairness

Workload fairness goes beyond displaying workload. The system identifies:

- Overloaded members
- Underutilized members
- Qualified members who could receive suitable work

Example recommendation:

```text
Move TASK-42 from Rajat to Amit.

Reason:
- Amit has the required skills
- Amit has available capacity
- Rajat is currently overloaded
```

Recommendations should not silently change assignments unless the project explicitly enables automatic reassignment.

---

## 17. Smart Feature: Contribution Score

The system calculates a project activity/contribution metric.

Possible inputs:

- Completed tasks
- Task complexity
- Task priority
- On-time completion
- Collaboration/activity
- Reviews/comments where appropriate

Conceptually:

```text
Contribution Score =
Completion + Complexity + Timeliness + Collaboration
```

This is a **project activity metric**, not a measurement of a student's intelligence, academic ability or personal worth.

---

## 18. Smart Feature: Project Risk Radar

The system analyzes project risk using information such as:

- Overdue tasks
- Incomplete high-priority tasks
- Blocked tasks
- Dependencies
- Member workload
- Approaching deadlines
- Milestone progress

Example:

```text
PROJECT RISK: HIGH

Reasons:
- 3 critical tasks overdue
- Testing has not started
- Final submission is approaching
- One member has very high workload
```

The system should provide both a risk level and the main reasons behind that level.

---

## 19. Dashboard

The main dashboard should summarize:

- Project progress
- Total/completed/in-progress/to-do/overdue tasks
- Team workload
- Contribution metrics
- Upcoming deadlines
- Academic milestones
- Risk alerts
- Recent activity

Example:

```text
PROJECT: E-Commerce Website
Progress: 72%
Total Tasks: 50
Completed: 36
In Progress: 8
To Do: 4
Overdue: 2
Team Health: 82/100
Project Risk: Medium
```

---

## 20. Notifications

Examples:

- You were assigned TASK-104.
- TASK-108 deadline is tomorrow.
- Your task moved to Review.
- You were mentioned in a comment.
- Project risk increased to High.
- An academic milestone is approaching.

---

## 21. Comments and Activity History

Tasks should support comments and important action history.

Example activity:

```text
Rajat created TASK-101
Rahul assigned TASK-101 to Priya
Priya moved TASK-101 to Review
Amit commented on TASK-101
Rajat completed TASK-101
```

Activity history should be useful to both the UI and analytics.

---

## 22. Frontend Pages

Recommended pages:

1. Landing Page
2. Login
3. Register
4. Forgot Password
5. Dashboard
6. Profile
7. Projects
8. Create Project
9. Project Details
10. Team Members
11. Kanban Board
12. Task Details
13. Create/Edit Task
14. Bug Management
15. Notifications
16. Analytics
17. Workload View
18. Contribution View
19. Risk Radar
20. Academic Milestones
21. Settings

Not all pages must be implemented at the same time. Prioritize the MVP.

---

## 23. Backend Structure

Recommended Django structure:

```text
backend/
├── manage.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── accounts/
├── projects/
├── tasks/
├── analytics/
└── notifications/
```

Typical responsibilities:

```text
accounts      → authentication, profile, roles, skills
projects      → projects, members, milestones
 tasks        → tasks, bugs, comments, assignments, dependencies
analytics     → workload, contribution, risk calculations
notifications → alerts and notifications
```

---

## 24. Database Entities

Core entities:

- User
- Profile
- Skill
- UserSkill
- Project
- ProjectMember
- Milestone
- Task
- TaskSkillRequirement
- TaskAssignment
- TaskDependency
- Comment
- Attachment
- ActivityLog
- Notification
- ContributionMetric
- Risk

These are logical entities. Match them to the existing repository before creating or changing database models.

---

## 25. Important Relationships

```text
User
 ├── Profile
 ├── UserSkill
 └── ProjectMember
          ↓
       Project
       ├── Milestone
       ├── Task
       │    ├── Comment
       │    ├── Attachment
       │    ├── Assignment
       │    ├── Dependency
       │    └── Skill Requirements
       ├── Risk
       └── ActivityLog
```

---

## 26. Logical API Groups

### Authentication

```text
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/profile/
```

### Projects

```text
GET    /api/projects/
POST   /api/projects/
GET    /api/projects/{id}/
PUT    /api/projects/{id}/
DELETE /api/projects/{id}/
```

### Members

```text
GET    /api/projects/{id}/members/
POST   /api/projects/{id}/members/
DELETE /api/projects/{id}/members/{user_id}/
```

### Tasks

```text
GET    /api/tasks/
POST   /api/tasks/
GET    /api/tasks/{id}/
PUT    /api/tasks/{id}/
DELETE /api/tasks/{id}/
PATCH  /api/tasks/{id}/status/
PATCH  /api/tasks/{id}/assign/
```

### Comments

```text
GET  /api/tasks/{id}/comments/
POST /api/tasks/{id}/comments/
```

### Skills

```text
GET  /api/skills/
POST /api/users/me/skills/
```

### Analytics

```text
GET /api/projects/{id}/analytics/
GET /api/projects/{id}/workload/
GET /api/projects/{id}/contribution/
GET /api/projects/{id}/risk/
```

### Notifications

```text
GET   /api/notifications/
PATCH /api/notifications/{id}/read/
```

These API paths are logical contracts and may be adjusted to match the current repository. Do not create duplicates.

---

## 27. MVP vs Optional Features

### MUST HAVE — MVP

- Authentication
- Users/profiles
- Projects
- Team members
- Tasks
- Bugs
- Kanban board
- Task assignment
- Task status
- Priority
- Deadlines
- Comments
- Dashboard
- Notifications
- Academic milestones
- Basic workload analysis

### SMART CORE

- Skill-based task assignment
- Workload fairness
- Contribution score
- Project Risk Radar

### OPTIONAL / FUTURE

- Project Replay
- Advanced NLP
- AI chatbot
- Meeting notes → automatic tasks
- Advanced predictive analytics
- Third-party integrations
- Mobile application

Optional features must not delay the MVP or break the current architecture.

---

## 28. GitHub Team Workflow

Use one shared GitHub repository.

Do not directly develop on `main`.

Suggested branches:

```text
main
feature/authentication
feature/projects
feature/tasks
feature/dashboard
feature/analytics
feature/notifications
```

Workflow:

```text
git pull origin main
        ↓
create/switch to feature branch
        ↓
develop
        ↓
test
        ↓
git add .
        ↓
git commit -m "Meaningful message"
        ↓
git push
        ↓
Pull Request
        ↓
Review
        ↓
Merge to main
```

Do not commit:

```text
.venv/
node_modules/
.env
passwords
API keys
secret keys
large generated files
```

---

## 29. Repository Structure

Target structure:

```text
smart-project-management/
├── frontend/
├── backend/
│   ├── manage.py
│   ├── config/
│   ├── accounts/
│   ├── projects/
│   ├── tasks/
│   ├── analytics/
│   └── notifications/
├── README.md
├── PROJECT_CONTEXT.md
├── .gitignore
└── requirements.txt
```

If the existing repository differs, preserve a working existing structure rather than blindly moving or rewriting everything.

---

## 30. Deployment Phase

Current project status: **integration / deployment phase**.

Deployment work can include:

```text
Frontend production build
        ↓
Frontend hosting
        ↓
Django backend deployment
        ↓
MySQL production configuration
        ↓
Environment variables
        ↓
API / CORS configuration
        ↓
Static/media configuration
        ↓
Hosted-environment testing
        ↓
Bug fixing
        ↓
Final deployment
```

Do not describe the application as fully deployed unless it is actually live and tested in the production environment.

---

## 31. Development Rules for All AI Agents

1. Inspect the existing repository before writing code.
2. Never assume a file, model, API or component does not exist without checking.
3. Do not rewrite the whole project.
4. Do not change the technology stack without explicit team approval.
5. Do not introduce Flask, FastAPI, Node/Express or another backend framework when the project architecture is Django.
6. Reuse existing components, models, serializers, services and APIs.
7. Do not create duplicate functionality.
8. Keep frontend and backend API contracts synchronized.
9. Respect the existing folder structure unless there is a strong technical reason to change it.
10. Use environment variables for secrets and configuration.
11. Never commit passwords, API keys or secret keys.
12. Do not commit `.venv`, `node_modules`, `.env` or generated files.
13. Make small, focused changes.
14. Preserve existing functionality.
15. Avoid unnecessary third-party packages.
16. Check whether a feature already exists before adding it.
17. Clearly list all changed files.
18. Explain any database migrations required.
19. Explain how to run and test the changes.
20. Do not invent new product requirements without marking them as optional.
21. Do not rename core project concepts without team approval.
22. If the repository differs from this specification, preserve the working implementation and adapt new work to it.
23. Do not silently change database schemas or API contracts without informing the team.

---

## 32. AI Agent Working Procedure

Whenever an AI agent is asked to implement something:

### Step 1 — Inspect
Identify:
- Existing architecture
- Relevant files
- Existing models
- Existing API endpoints
- Existing components
- Existing database relationships

### Step 2 — Plan
Explain the smallest change required.

### Step 3 — Implement
Make focused changes only.

### Step 4 — Validate
Run relevant tests/builds/lint checks if available.

### Step 5 — Report
Return:
- What changed
- Files changed
- Database migrations, if any
- API changes, if any
- Commands to run
- Tests performed
- Any remaining limitations

Never fabricate repository contents or pretend to have run a command that was not actually run.

---

## 33. End-to-End User Workflow

```text
Register / Login
      ↓
Create Project
      ↓
Add Team Members
      ↓
Members Add Skills
      ↓
Create Academic Milestones
      ↓
Create Tasks / Bugs
      ↓
Define Required Skills
      ↓
Smart Assignment Recommendation
      ↓
Assign Task
      ↓
Team Works on Tasks
      ↓
Update Status / Comments
      ↓
System Records Activity
      ↓
Calculate Progress
      ↓
Analyze Workload
      ↓
Calculate Contribution
      ↓
Detect Project Risk
      ↓
Dashboard / Notifications / Reports
      ↓
Project Completion
```

---

## 34. Official One-Paragraph Project Description

SPMS is a Jira-inspired full-stack project management platform designed specifically for student development teams. It uses React.js and JavaScript for the frontend, Django and Django REST Framework with Python for the backend, and MySQL for data storage. The system provides authentication, project and team management, tasks, bugs, Kanban boards, comments, notifications, deadlines, dashboards and academic milestones. Its smart layer analyzes member skills, workload, contribution and project status to recommend suitable task assignments, identify workload imbalance, calculate project contribution metrics and detect potential project risks with explanations. The overall goal is to help student teams organize their software projects more effectively while providing useful analytics and academic project tracking.

---

## 35. Short Interview Definition

> “Our project is a Jira-inspired Smart Project Management System designed specifically for student teams. It manages projects, teams, tasks, bugs and academic milestones, and adds smart features such as skill-based task assignment, workload analysis, contribution scoring and project-risk detection.”

---

## 36. Team Members

Replace the placeholders below with the actual team members and responsibilities:

```text
Project Lead / Member 1: __________________
Role: __________________

Member 2: __________________
Role: __________________

Member 3: __________________
Role: __________________

Member 4: __________________
Role: __________________
```

---

## 37. Change Control

This file is the **single source of truth** for the project.

When a feature, technology, database model, API contract or workflow is officially changed by the team:

1. Update this file.
2. Commit the change to Git.
3. Inform all team members.
4. Use the updated file as context for future AI-assisted development.

AI agents must treat this document as the current project specification, while still respecting the actual repository as the source of truth for what is already implemented.
