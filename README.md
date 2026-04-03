# Finance Data Processing and Access Control Backend

A backend assignment solution demonstrating:

- User management with roles and status
- Financial records CRUD with filtering
- Dashboard summary and trend APIs
- Role-based access control at API level
- Validation and consistent error handling
- SQLite-based persistence

## Tech Stack

- Node.js + TypeScript
- Express
- SQLite (sqlite3 + sqlite wrapper)
- Zod for validation
- JWT for auth
- Vitest + Supertest for API tests

## Project Structure

- src/server.ts: app bootstrap
- src/app.ts: express app setup and route registration
- src/db.ts: database initialization, schema, and seed users
- src/routes: route handlers
- src/middleware: auth, validation, and error middleware
- src/validators: request body schemas
- tests/api.test.ts: integration tests

## Setup

1. Install dependencies:

   npm install

2. Run in development mode:

   npm run dev

3. Build and run production mode:

   npm run build
   npm start

Default server port is 4000.

## Environment Variables

Optional environment variables:

- PORT: server port (default 4000)
- JWT_SECRET: JWT signing secret (default dev-super-secret-key)
- DB_PATH: SQLite file path (default ./data/finance.db)

## Seeded Users

When database is first initialized, these users are seeded:

- Admin: admin@finance.local / Admin123!
- Analyst: analyst@finance.local / Analyst123!
- Viewer: viewer@finance.local / Viewer123!

Use POST /auth/login to get a Bearer token.

## Role Model

- viewer:
  - Can access dashboard APIs
  - Cannot access records CRUD or user management
- analyst:
  - Can read records
  - Can access dashboard APIs
  - Cannot create/update/delete records or manage users
- admin:
  - Full access to users and records
  - Can access dashboard APIs

## API Summary

### Health

- GET /health

### Auth

- POST /auth/login
  - body: { email, password }
  - returns: { token, user }

### Users (admin only)

- GET /users
- POST /users
- PATCH /users/:id

### Financial Records

- GET /records (analyst, admin)
  - query filters: type, category, startDate, endDate
- POST /records (admin)
- PATCH /records/:id (admin)
- DELETE /records/:id (admin, soft delete)

### Dashboard

- GET /dashboard/summary (viewer, analyst, admin)
  - returns totalIncome, totalExpenses, netBalance, categoryTotals
- GET /dashboard/recent?limit=10 (viewer, analyst, admin)
- GET /dashboard/trends?period=monthly|weekly (viewer, analyst, admin)

## Validation and Error Handling

- Request body validation is enforced with Zod
- Validation issues return 400
- Unauthorized access returns 401
- Forbidden role access returns 403
- Missing resources return 404
- Duplicate email returns 409

## Test

Run:

npm test

Covers:

- RBAC restriction for viewer on record creation
- Admin create record + analyst read records
- Viewer access to dashboard summary

## Assumptions and Tradeoffs

- Authentication is email/password with JWT and no refresh token flow
- Soft delete is implemented for financial records only
- Pagination is not implemented for /records list, but can be added easily
- SQLite is chosen for simplicity and local portability
