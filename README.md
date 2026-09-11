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
Copy `.env.example` to `.env` and fill in your PostgreSQL credentials:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/velozity?schema=public"
```

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

### Running Development Servers
- **Server**: `cd server && npm run dev`
- **Client**: `cd client && npm run dev`
