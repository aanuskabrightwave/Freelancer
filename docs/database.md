# Database Schema Documentation

This document summarizes the primary MySQL database tables, relational constraints, and index optimizations applied to support Phase 1-11 components.

## Core Schema Tables

### `users`
- **Purpose**: Stores authentication credentials, contact coordinates, status, and role rules.
- **Indexes**:
  - `ix_users_email` (unique)
  - `ix_users_phone` (unique)
  - `ix_users_role` (fast role-based routing checks)

### `freelancer_profiles`
- **Purpose**: Freelancer bios, experience levels, location details, starting rates, and verification metrics.
- **Indexes**:
  - `ix_freelancer_profiles_user_id` (unique)
  - `ix_freelancer_profiles_primary_profession`
  - `ix_freelancer_profiles_city`

### `services`
- **Purpose**: Service directories, pricing rates, category links, and ratings.
- **Indexes**:
  - `ix_services_slug` (unique)
  - `ix_services_status`
  - `ix_services_category_id`
  - `ix_services_freelancer_profile_id`

### `projects` & `proposals`
- **Purpose**: Client requests and freelancer bids.
- **Indexes**:
  - `ix_projects_status`
  - `ix_projects_client_id`
  - `ix_proposals_project_id`
  - `ix_proposals_freelancer_profile_id`

### `bookings`
- **Purpose**: Order contracts holding scheduled date details, deadlines, agreed totals, and current status flags.
- **Indexes**:
  - `ix_bookings_booking_number` (unique)
  - `ix_bookings_client_id`
  - `ix_bookings_freelancer_profile_id`
  - `ix_bookings_status`
  - `ix_bookings_scheduled_date`

### `messages`
- **Purpose**: Chat logs.
- **Indexes**:
  - `ix_messages_conversation_id`
  - `ix_messages_created_at` (fast sorting for timelines)

### `payments`
- **Purpose**: Order transaction logs linked to Razorpay receipts.
- **Indexes**:
  - `ix_payments_payment_number` (unique)
  - `ix_payments_booking_id`
  - `ix_payments_provider_order_id` (unique)
  - `ix_payments_provider_payment_id` (unique)
  - `ix_payments_status`

### `ledger_entries`
- **Purpose**: Holds double-entry credit/debit balances for payouts.
- **Indexes**:
  - `ix_ledger_entries_freelancer_profile_id`
  - `ix_ledger_entries_status`

### `disputes`
- **Purpose**: Conflict resolutions.
- **Indexes**:
  - `ix_disputes_dispute_number` (unique)
  - `ix_disputes_status`
