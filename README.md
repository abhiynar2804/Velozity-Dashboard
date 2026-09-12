# Velozity Dashboard

A full-stack project management dashboard built for the Velozity technical assessment.

The application combines role-based access control, PostgreSQL persistence, real-time activity updates, notifications, presence tracking, offline recovery, and automated overdue-task detection.

## Features

### Authentication and security

- JWT access tokens with short expiration
- Rotating refresh tokens stored in `HttpOnly` cookies
- Hashed refresh tokens in PostgreSQL
- Secure logout and token revocation
- Bcrypt password hashing
- Zod request validation
- Helmet security headers
- Strict CORS configuration
- Server-side RBAC and ownership checks
- Access tokens kept in frontend memory instead of `localStorage`

### Role-based access

| Role                | Access                                                        |
| ------------------- | ------------------------------------------------------------- |
| **Admin**           | Full system access                                            |
| **Project Manager** | Own projects, tasks, team activity, and project data          |
| **Developer**       | Assigned tasks, permitted task updates, and relevant activity |

Authorization is enforced by the API and service layer. Frontend role checks only control the visible UI.

### Project and task management

- Create, view, update, and delete projects
- Associate projects with clients
- Enforce Project Manager ownership
- Create tasks and assign developers
- Update status, priority, due date, and description
- Filter tasks by project, status, priority, and due-date range
- Restrict Developers to their assigned tasks
- Persist overdue state in `Task.isOverdue`

Task statuses:

```text
TODO
IN_PROGRESS
IN_REVIEW
DONE
```

Task priorities:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

### Real-time activity

Real-time functionality uses Socket.IO. The application does not use polling or Server-Sent Events.

When a task status changes:

1. The task is updated in PostgreSQL.
2. An activity record is created in the same transaction.
3. The activity is emitted through an authorized Socket.IO room.
4. Connected clients update their activity feed immediately.

Activity visibility is scoped by role:

- **Admin:** activity from all authorized projects
- **Project Manager:** activity from owned projects
- **Developer:** activity from assigned tasks only

Socket rooms:

| Room                        | Purpose                                 |
| --------------------------- | --------------------------------------- |
| `user:<userId>`             | Personal notifications                  |
| `project:<projectId>`       | Project presence and membership         |
| `project:<projectId>:staff` | Admin and Project Manager activity      |
| `task:<taskId>`             | Developer activity for an assigned task |

### Notifications

- Task assignment notifications
- Task review notifications
- Persistent notification records
- Unread notification count
- Mark one notification as read
- Mark all notifications as read
- Real-time delivery through user-specific rooms

### Presence

- Global online-user count
- Project-level presence
- Online user information
- Duplicate-tab aggregation, so one user counts once

### Offline and reconnect recovery

Activity is persisted in PostgreSQL. After a Socket.IO reconnect, the client:

1. Requests the latest 20 activities from `GET /api/activities`.
2. Receives data already filtered for the authenticated role.
3. Merges and deduplicates activities by ID.
4. Rejoins authorized project rooms.

### Overdue task detection

A server-side scheduler runs every five minutes. It finds incomplete tasks whose due date has passed and marks them as overdue in PostgreSQL. Tasks already marked overdue are skipped on later runs.

## Architecture

```text
React + TypeScript + Vite
          |
          | REST API and Socket.IO
          v
Node.js + Express
  Authentication | RBAC | Validation
  Project / Task APIs
  Activity / Notification APIs
  Socket.IO | Overdue Scheduler
          |
          | Prisma
          v
PostgreSQL
  Users | Clients | Projects | Tasks
  Activities | Notifications | Refresh Tokens
```

## Project structure

```text
Velozity-Dashboard/
├── client/
│   ├── src/
│   │   ├── api/auth.api.ts
│   │   ├── services/socket.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── style.css
│   ├── .env.example
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── jobs/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── socket/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── test-auth-flow.ts
│   │   ├── test-rbac-security.ts
│   │   ├── test-socket-activity-security.ts
│   │   ├── test-presence-aggregation.ts
│   │   └── test-overdue-job.ts
│   ├── .env.example
│   └── package.json
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── .env.example
├── package.json
└── README.md
```

## Database design

Main models:

- `User`
- `Client`
- `Project`
- `Task`
- `Activity`
- `Notification`
- `RefreshToken`

Important indexes cover user roles and email, project ownership, task assignment and filtering, activity recovery, notification unread state, and refresh-token expiration.

## Getting started

### Prerequisites

- Node.js 18 or newer
- PostgreSQL
- npm

### 1. Install dependencies

From the project root:

```bash
npm install
npm run db:seed
```

Install package dependencies for each workspace if needed:

```bash
cd server
npm install
cd ../client
npm install
cd ..
```

### 2. Configure the server

Copy `server/.env.example` to `server/.env` and set the database URL and secrets:

```env
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/velozity?schema=public"
JWT_ACCESS_SECRET="generate-a-random-access-secret-at-least-32-characters-long"
JWT_REFRESH_SECRET="generate-a-different-refresh-secret-at-least-32-characters-long"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

JWT secrets must be at least 32 characters long.

### 3. Configure the client

Copy `client/.env.example` to `client/.env`:

```env
VITE_API_URL="http://localhost:5000/api"
VITE_SOCKET_URL="http://localhost:5000"
```

### 4. Apply migrations and seed the database

```bash
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

The seed is rerunnable and creates:

- 1 Admin
- 2 Project Managers
- 4 Developers
- 3 Projects
- 5 tasks per project
- 2 overdue tasks
- 15 activity records
- Assignment and review notifications

Seed credentials:

```text
Admin: admin@velozity.test
Password: Password123!
```

Other seeded accounts:

```text
pm.one@velozity.test
pm.two@velozity.test
developer.one@velozity.test
developer.two@velozity.test
developer.three@velozity.test
developer.four@velozity.test
```

All seeded accounts use `Password123!`.

### 5. Run the application

Backend:

```bash
npm run dev
```

Frontend, in a second terminal:

```bash
npm run dev:client
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

## Testing

Run focused tests from the `server` directory:

```bash
npm run test:auth
npm run test:security
npm run test:socket-security
npm run test:presence
npm run test:overdue
```

Run the complete test suite:

```bash
npm run test:all
```

The aggregate suite covers:

1. Authentication flow
2. API RBAC security
3. Socket activity authorization
4. Unique presence aggregation
5. Overdue scheduler behavior

## Production build

Build the server:

```bash
cd server
npm run build
npm start
```

Build the frontend:

```bash
cd client
npm run build
```

The generated frontend bundle is written to `client/dist`.

## Production configuration

Backend production variables:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `CLIENT_URL`
- `NODE_ENV`
- `PORT`

Frontend production variables:

- `VITE_API_URL`
- `VITE_SOCKET_URL`

`CLIENT_URL` must exactly match the deployed frontend origin. HTTPS should be enabled in production, and seeded credentials should be changed or removed before a real deployment.

## Assessment coverage

| Requirement            | Implementation                                        |
| ---------------------- | ----------------------------------------------------- |
| React and TypeScript   | React, TypeScript, and Vite client                    |
| Node and Express       | Express backend                                       |
| PostgreSQL and Prisma  | Relational schema, migrations, and Prisma services    |
| JWT authentication     | Short-lived access tokens and rotating refresh tokens |
| Refresh-token security | HttpOnly cookie and hashed database token             |
| RBAC                   | API and service-level authorization                   |
| Project ownership      | Server-side Project Manager ownership checks          |
| Developer isolation    | Assigned-task checks and task-scoped socket rooms     |
| Task workflow          | Status, priority, due date, assignment, and filtering |
| Activity history       | Persistent `Activity` model                           |
| Real-time activity     | Authorized Socket.IO events                           |
| Offline recovery       | Latest 20 role-relevant activities after reconnect    |
| Presence               | Unique-user Socket.IO presence aggregation            |
| Notifications          | Persistent, real-time, read/unread notifications      |
| Overdue detection      | Five-minute server-side scheduler                     |
| Seed data              | Assessment-ready Prisma seed                          |
| Security tests         | Auth, RBAC, Socket.IO, presence, and scheduler tests  |

## Known limitations

- Socket.IO state is process-local. Multi-instance deployments need a shared adapter such as Redis.
- Presence is process-local and also needs shared infrastructure for horizontal scaling.
- The project is optimized for the assessment scope rather than a multi-region production deployment.

## Author

Abhay Narkhede

Full-Stack Developer and Computer Engineering Student
