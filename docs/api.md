# API Documentation Overview

This document summarizes the major endpoint routes, authentication parameters, and serialization conventions utilized by the Creative Marketplace backend.

## Interactive Swagger Documentation
In development, the complete Swagger specifications list is accessible at:
- Swagger: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

In production, documentation visibility is controlled via settings configs:
- `ENABLE_API_DOCS=false`

---

## Endpoint Groups

### 1. Authentication (`/api/v1/auth`)
- `POST /register`: Registers public CLIENT or FREELANCER accounts (guards against ADMIN signup).
- `POST /login`: Authenticates user email/phone; returns access + refresh tokens.
- `POST /refresh`: Uses refresh token to rotate expired access tokens.
- `POST /send-verification`: Sends OTP email validation tokens.
- `POST /verify`: Verifies email/phone challenge hashes.

### 2. Marketplace Directories (`/api/v1/services`, `/api/v1/freelancers`)
- `GET /services`: Lists published marketplace services. Paginated + optimized with eager loading to prevent N+1 queries.
- `GET /freelancers`: Lists public freelancer profiles. Paginated.
- `GET /freelancers/{id}`: Public details for individual creators.

### 3. Client & Freelancer Dashboards
- `/api/v1/client/bookings`: View client booking orders.
- `/api/v1/freelancer/bookings`: View freelancer assignment queues.
- `/api/v1/freelancer/profile/upload`: Securely upload portfolio files/covers.

### 4. Workspaces & Downloads (`/api/v1/bookings`)
- `GET /bookings/{booking_id}/workspace`: Retrieve booking workspace events/details.
- `GET /bookings/{booking_id}/files`: Fetch shared workspace files.
- `GET /bookings/workspace/files/{file_id}/download`: Download workspace deliverables securely (validates client/freelancer/admin participant status).

### 5. Administrative Management (`/api/v1/admin`)
Strictly guarded via `require_role("ADMIN")`.
- `GET /admin/dashboard`: Platform operational counters, registration stats, GVM analytics.
- `GET /admin/users`: Search, filter, and suspend/reactivate user accounts.
- `GET /admin/verifications`: Manage identity documents and award verified trust badges.
- `GET /admin/disputes`: Dispute timeline center and partial/full refund controls.
- `GET /admin/settings`: Platform config modifiers (commissions, payouts hold).
- `GET /admin/audit-logs`: Audit logs feed ledger.
