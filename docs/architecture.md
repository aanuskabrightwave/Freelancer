# System Architecture Documentation

This document describes the high-level system components and data flow architecture of the Creative Marketplace application.

## Overview
The application is designed as a decoupled Single Page Application (SPA) frontend communicating with a RESTful backend API, backed by a persistent MySQL relational database.

```text
                    INTERNET
                       |
                       ↓
                  NGINX / HTTPS (Reverse Proxy & Rate Limiter)
                       |
          ┌────────────┴────────────┐
          ↓                         ↓
       Next.js                   FastAPI
      Frontend                    Backend
                                     |
                    ┌────────────────┼────────────────┐
                    ↓                ↓                ↓
                  MySQL           Uploads          External
               (Database)         Storage          Services
                                                     |
                                               ┌─────┴─────┐
                                               ↓           ↓
                                           Razorpay       SMTP
```

## System Components

### 1. Frontend (Next.js)
- Built on Next.js 15 App Router using React Client/Server components and Tailwind CSS.
- Communication with API backend uses Axios with cookie synchronisation for Server components authentication.
- Implements security headers (`X-Frame-Options`, `Content-Security-Policy` with Razorpay scripts integration).

### 2. Backend (FastAPI)
- ASGI FastAPI python application serving endpoints under `/api/v1/*`.
- Integrates custom `RateLimitMiddleware` (in-memory bucket) and request correlation logger tracking (`X-Request-ID`).
- Authenticated routes are protected with JWT tokens signed using HMACS (HS256).

### 3. Database (MySQL 8.0)
- Persistent SQL storage for user states, services, portfolios, bookings, ledger entries, disputes, and notifications.
- Queries are executed using SQLAlchemy ORM connection pooling and eager relationship loading (`joinedload`).

### 4. Uploads Storage
- Decoupled into public static paths (`/uploads/profiles`, `/uploads/portfolios`, `/uploads/services`) and protected workspaces/deliveries paths accessed via authenticated downloads:
  - `GET /api/v1/bookings/workspace/files/{file_id}/download`

### 5. External Services
- **Razorpay**: Handles client checkouts, webhook capture processing, and freelancer payout transfers.
- **SMTP**: System emails (registration verification, bookings confirmations, payouts alerts).
