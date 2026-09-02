# Admin Department Pending Tasks

This roadmap outlines all remaining tasks required to bring the Admin Department of the Creative Marketplace to 100% completion and production readiness.

---

## 1. P0 — Critical Pending Tasks (Immediate Blockers)


1. **Fix Deliveries Backend 500 Error (`BUG-ADM-001`)**:
   - Location: `backend/app/api/v1/endpoints/admin_management.py:1393`
   - Problem: `from app.models.freelancer import FreelancerProfile` causes a `ModuleNotFoundError`.
   - Resolution: Update import statement to `from app.models.freelancer_profile import FreelancerProfile`.

2. **Fix Completed Jobs Backend 500 Error (`BUG-ADM-002`)**:
   - Location: `backend/app/api/v1/endpoints/admin_management.py:1443` & `1466`
   - Problem: Incorrect module import `from app.models.freelancer import FreelancerProfile` and invalid attribute access `review.rating`.
   - Resolution: Update import to `from app.models.freelancer_profile import FreelancerProfile` and use `review.overall_rating` from the Review model.

---

## 2. P1 — Production-Critical Pending Tasks

3. **Fix Reviews Backend 500 Error (`BUG-ADM-003`)**:
   - Location: `backend/app/api/v1/endpoints/admin_management.py:913`
   - Problem: `r.freelancer_profile.user.full_name` crashes because the relationship in the Review model is named `freelancer`, not `freelancer_profile`.
   - Resolution: Update property access to `r.freelancer.user.full_name`.

4. **Migrate Service Categories in MySQL Database (`BUG-ADM-004`)**:
   - Problem: `service_categories` table contains legacy category `Editing` (id=18) and lacks `Editor`, `3D Animator`, and `Graphics`.
   - Resolution: Run an Alembic migration / SQL script to update the legacy `Editing` row to `Editor` and seed `3D Animator` and `Graphics` categories.

5. **Enable Admin Messages in Sidebar Navigation (`BUG-ADM-005`)**:
   - Location: `frontend/src/components/layout/Sidebar.tsx:52`
   - Problem: "Messages" item is marked `disabled: true`, even though `/admin/messages` is fully built.
   - Resolution: Change to `{ name: "Messages", href: "/admin/messages" }`.

6. **Fix Admin Dashboard Job Posts Preview Link (`BUG-ADM-006`)**:
   - Location: `frontend/src/app/admin/dashboard/page.tsx:394`
   - Problem: "Open Inbox" in the Job Posts card links to `/admin/bookings`.
   - Resolution: Update link href to `/admin/job-posts`.

7. **Implement Submission Review Actions in `/admin/deliveries` UI**:
   - Location: `frontend/src/app/admin/deliveries/page.tsx`
   - Tasks: Add action modals for:
     - Request Revision (triggers `POST /api/v1/revisions/requests`)
     - Approve Work (triggers `POST /api/v1/deliveries/{id}/approve`)
     - Share Draft with Client (triggers `POST /api/v1/deliveries/{id}/share-draft`)
     - Deliver Final Work (triggers `POST /api/v1/deliveries/{id}/deliver-final`)

---

## 3. P2 — Secondary Admin UI Modules

8. **Build Dedicated Financial UI Pages**:
   - Build `/admin/payments/page.tsx` to view client transactions and Razorpay details.
   - Build `/admin/refunds/page.tsx` to review and approve/reject refund requests.
   - Build `/admin/payouts/page.tsx` to monitor creator payout disbursements and initiate processing.
   - Enable `Payments`, `Refunds`, and `Payouts` in `Sidebar.tsx`.

9. **Build Dedicated Directory & Catalog UI Pages**:
   - Build `/admin/clients/page.tsx` for client profile inspection, booking history, and project timeline.
   - Build `/admin/freelancers/page.tsx` for dedicated creator profiles, badge awards, and earnings history.
   - Build `/admin/services/page.tsx` for moderating, hiding, and restoring service listings.
   - Build `/admin/categories/page.tsx` for adding, editing, and deactivating service categories.
   - Build `/admin/reviews/page.tsx` for moderating customer reviews and managing reports.
   - Enable corresponding links in `Sidebar.tsx`.

10. **Build Reports & Export Tooling**:
    - Build `/admin/reports/page.tsx` with date-range filters and CSV/PDF export for marketplace financial volume, booking velocity, and creator performance.
