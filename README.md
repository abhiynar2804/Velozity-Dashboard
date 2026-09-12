# Velozity Dashboard

Full-stack dashboard application built with React, TypeScript, Node.js, Express, PostgreSQL, and Prisma.

## Project Structure

```
project/
├── client/          # Frontend React + TypeScript (Vite)
│   └── src/
├── server/          # Backend Express + TypeScript
│   └── src/
│       ├── controllers/
│       ├── services/
│       ├── routes/
│       ├── middleware/
│       ├── validators/
│       ├── utils/
│       ├── websocket/
│       └── jobs/
├── prisma/          # Prisma ORM setup & migrations
│   ├── schema.prisma
│   └── seed.ts
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database

### Environment Variables

Copy `.env.example` to `server/.env` and fill in your PostgreSQL credentials and JWT secrets:

```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/velozity?schema=public"
JWT_ACCESS_SECRET="generate-a-random-secret-at-least-32-characters-long"
JWT_REFRESH_SECRET="generate-a-different-random-secret-at-least-32-characters-long"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

For the frontend, copy `client/.env.example` to `client/.env` and set the deployed API and Socket.IO origins:

```env
VITE_API_URL="https://api.example.com/api"
VITE_SOCKET_URL="https://api.example.com"
```

In production, `CLIENT_URL` is required and must be the exact frontend origin allowed to access the server.

### Installation

1. Install Root Dependencies & Prisma:

   ```bash
   npm install
   npx prisma generate
   ```

2. Install Server Dependencies:

   ```bash
   cd server
   npm install
   ```

3. Install Client Dependencies:

   ```bash
   cd client
   npm install
   ```

4. Apply migrations and load assessment data:

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

   The seed creates Admin, Project Manager, Developer, project, task, overdue-task, activity, and notification fixtures. All seeded users use `Password123!`; the seeded Admin is `admin@velozity.test`.

### Running Development Servers

- **Server**: `cd server && npm run dev`
- **Client**: `cd client && npm run dev`
