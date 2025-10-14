Employee Management System (EMS)

A small full-stack Employee Management System using PostgreSQL, Node.js (Express) and a simple HTML + Bootstrap frontend.
This repository includes a ready-to-run minimal backend API, SQL migration, and a responsive UI that lets you add / edit / deactivate employees — with departments and roles created automatically when entered.

What’s included

migrations/001_init.sql — SQL to create tables and triggers (roles, departments, employees, attendance, payroll).

src/ — Node.js backend:

src/index.js — Express server (serves public/ + API).

src/db.js — PostgreSQL connection helper.

src/routes/employees.js — REST API for employees (supports department_name / role_name auto-creation).

public/ — Frontend:

index.html — Bootstrap UI (forms, modal, table).

app.js — Frontend logic calling the API.

.env.example — sample env file for DB credentials.

package.json — scripts: npm run dev (nodemon), npm start.

README (this file).

Quick start (development)
Prerequisites

Node.js + npm (LTS recommended)

PostgreSQL (local or cloud). You can also use pgAdmin to manage it.

(Optional) Docker Desktop if you prefer running Postgres in a container.

1 — Clone & open
git clone <repo-url>
cd ems
code .

2 — Configure environment

Copy .env.example to .env and edit if needed:

PORT=3000
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=ems

3 — Create the database & run migration

Option A — using psql (if installed):

# create the database (if not exists)
createdb -h $PGHOST -p $PGPORT -U $PGUSER ems

# run migration
psql "postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/postgres" -f migrations/001_init.sql


Option B — pgAdmin:

Create database ems.

Open Query Tool on ems and run the contents of migrations/001_init.sql.

Option C — Docker (if you prefer):

docker compose up -d   # if you provided a docker-compose.yml
# then run migration via docker exec or a DB client


After migration, verify tables exist:

SELECT tablename FROM pg_tables WHERE schemaname = 'public';

4 — Install dependencies & start backend
npm install
npm run dev     # dev (nodemon) or npm start


Server should log:

Server listening on http://localhost:3000

5 — Open UI

Visit: http://localhost:3000
Use the Add Employee modal to create employees. Department/role names typed in the form will be created automatically in the DB.

API (summary)

Base: http://localhost:3000/api/employees

GET /api/employees
Returns list of employees (joined with department_name, role_name).

GET /api/employees/:id
Employee detail.

POST /api/employees
Create employee. JSON body (examples):

{
  "first_name": "Alice",
  "last_name": "Smith",
  "email": "alice@example.com",
  "phone": "9999999999",
  "hire_date": "2024-10-01",
  "department_name": "Engineering",
  "role_name": "Engineer",
  "salary": 50000,
  "is_active": true
}


If department_name/role_name provided and missing in DB, server will create them.

PUT /api/employees/:id
Partial update. Accepts same body keys as POST. Also accepts department_name/role_name.

DELETE /api/employees/:id
Soft-delete (sets is_active = false).

Example curl:

curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","email":"t@example.com","hire_date":"2025-01-01","department_name":"Eng","role_name":"Dev"}'

DB Schema (short)

roles (id, name UNIQUE, permissions JSONB)

departments (id, name UNIQUE, manager_id FK -> employees.id)

employees (id, first_name, last_name, email UNIQUE, phone, hire_date, department_id FK, role_id FK, salary NUMERIC, is_active, created_at, updated_at)

attendance (id, employee_id FK, date, status, checkin_time, checkout_time)

payroll (id, employee_id FK, period_from, period_to, gross_pay, deductions, net_pay, paid_on)

The migration file includes triggers to update updated_at and useful indexes.

Seed data

If you want some demo rows, run in pgAdmin or psql:

INSERT INTO departments (name) VALUES ('Engineering'), ('Sales'), ('Marketing');
INSERT INTO roles (name, permissions) VALUES ('Engineer', '{}'), ('Sales Rep', '{}'), ('HR Manager', '{}');

Troubleshooting
npm or node not recognized

Close & reopen terminal after install. On Windows ensure Node was installed with PATH option checked.

Verify:

node -v
npm -v

psql: command not found

Install PostgreSQL client tools or use pgAdmin or run migration from inside DB admin UI.

Server cannot connect to DB (connect ECONNREFUSED)

Ensure Postgres is running and .env credentials match.

If using Docker, check docker ps and logs.

Duplicate department/role names

Your schema has UNIQUE on departments.name and roles.name. The server code checks before insert but a race condition could create duplicates in extreme concurrency — acceptable for this small app. If needed, we can make name comparison case-insensitive.

UI not showing changes

Clear browser cache / hard refresh (Ctrl+Shift+R). Check browser console and network tab for API errors.

Next recommended improvements (pick any)

Add authentication (JWT) and protect write endpoints.

Add server-side validation (express-validator).

Add tests (Jest + Supertest).

Add Dockerfile for the Node app and a production docker-compose.yml.

Improve search with server-side ILIKE and pagination.

Export CSV / PDF payslip generation.

Tell me which improvement you’d like and I’ll give exact code or instructions.

Useful commands

Start server:

npm run dev
# or
npm start


Run migration (psql example):

psql "postgresql://postgres:postgres@localhost:5432/ems" -f migrations/001_init.sql


Check server health:

curl http://localhost:3000/health

License & credit

This project is free to use for learning and prototyping. Built as a compact learning project (Postgres + Node + Bootstrap).
