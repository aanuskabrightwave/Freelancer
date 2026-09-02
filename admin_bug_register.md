# Admin Department Bug Register

This register details all bugs, exceptions, regressions, and schema/model mismatches detected during the Full Admin Department Audit on the live application.

---

## 1. Critical & High-Priority Bugs (P0 / P1)

| Bug ID | Severity | Module / Area | Endpoint / Component | Root Cause & Description | Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-ADM-001** | **P0 - Critical** | Deliveries Inbox | `GET /api/v1/admin/deliveries` (`admin_management.py:1393`) | `ModuleNotFoundError: No module named 'app.models.freelancer'`. Inside `list_deliveries`, imports from non-existent module `app.models.freelancer` instead of `app.models.freelancer_profile`. | Causes a 500 Internal Server Error when Admin opens `/admin/deliveries`. Admin cannot inspect or review creator submissions. |
| **BUG-ADM-002** | **P0 - Critical** | Completed Jobs | `GET /api/v1/admin/completed-jobs` (`admin_management.py:1443`) | `ModuleNotFoundError: No module named 'app.models.freelancer'`. Inside `list_completed_jobs`, imports from non-existent module `app.models.freelancer` instead of `app.models.freelancer_profile`. Also accesses `review.rating` instead of `review.overall_rating`. | Causes a 500 Internal Server Error when Admin opens `/admin/completed-jobs`. Completed bookings history is inaccessible. |
| **BUG-ADM-003** | **P1 - High** | Reviews Moderation | `GET /api/v1/admin/reviews` (`admin_management.py:913`) | `AttributeError: 'Review' object has no attribute 'freelancer_profile'`. In the Review model, the relationship is named `freelancer`, not `freelancer_profile`. Accessing `r.freelancer_profile.user.full_name` crashes with a 500 error when reviews exist in DB. | Causes a 500 Internal Server Error when Admin queries reviews API. |
| **BUG-ADM-004** | **P1 - High** | Service Categories | `service_categories` MySQL table | Database contains outdated category `(18, 'Editing', 'editing', True)` and is missing the required modern categories: `Editor`, `3D Animator`, and `Graphics`. | Category taxonomy drift; marketplace categorization and filtering are inconsistent. |

---

## 2. Navigation & UI Mismatches (P2)

| Bug ID | Severity | Module / Area | Endpoint / Component | Root Cause & Description | Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-ADM-005** | **P2 - Medium** | Admin Sidebar | `Sidebar.tsx:52` | "Messages" item is marked `disabled: true` with a "Soon" badge, even though the `/admin/messages` page and backend endpoints (`/admin/conversations`, `/messages/conversations/{id}`) are fully implemented and working. | Admin cannot click into the Messages console from the sidebar; must manually navigate to `/admin/messages`. |
| **BUG-ADM-006** | **P2 - Medium** | Admin Dashboard | `src/app/admin/dashboard/page.tsx:394` | The "Open Inbox" link in the Recent Job Posts card links to `/admin/bookings` instead of `/admin/job-posts`. | Inconvenient redirect; clicking on a Job Post preview redirects to Booking Inbox instead of Job Posts. |
| **BUG-ADM-007** | **P2 - Medium** | Admin Sidebar | `Sidebar.tsx:58-79` | Sidebar has 11 disabled ("Soon") items: `Messages`, `Clients`, `Freelancers`, `Profiles`, `Services`, `Categories`, `Payments`, `Refunds`, `Payouts`, `Reviews`, `Reports`. Several corresponding backend APIs exist (`/admin/freelancers`, `/admin/services`, `/admin/payments`, `/admin/refunds`, `/admin/payouts`) but have no dedicated UI pages. | Core admin tools are hidden from the sidebar and have partial or missing UI pages. |

---

## 3. Summary of Bug Counts

- **Total Detected Runtime / Schema Bugs**: 7
- **P0 (Critical Blockers)**: 2 (`BUG-ADM-001`, `BUG-ADM-002`)
- **P1 (High Priority)**: 2 (`BUG-ADM-003`, `BUG-ADM-004`)
- **P2 (Medium / UX)**: 3 (`BUG-ADM-005`, `BUG-ADM-006`, `BUG-ADM-007`)
