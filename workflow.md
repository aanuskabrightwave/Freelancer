# Creative Freelancer Marketplace: Complete User Journey & Manual Testing Guide

This document is a step-by-step user journey and manual testing manual. It is structured for manual testing using a live browser environment. 

---

## 1. Website Overview & Core Roles

The marketplace consists of four roles, navigating the following active user journeys:

### Roles
* **Guest**: Logged-out visitor who can browse landing page grids, search published freelancer directories, and view public portfolios.
* **Client**: Registers to discover talent, books services, submits payments, manages active gigs, and chats with creators.
* **Freelancer**: Sets up professional profiles (skills, equipment, portfolios), lists service packages, responds to bookings, delivers assets, receives payouts, and chats with clients.
* **Admin**: Oversees verifications, platform audit logs, and monitors operations metrics.

### System Workflow Journey Map

```
                    LANDING PAGE (GUEST)
                             ↓
                        SIGNUP / LOGIN
                             ↓
               ┌─────────────┴─────────────┐
         [CLIENT]                    [FREELANCER]
               ↓                           ↓
      Dashboard Overview           Dashboard Overview
               ↓                           ↓
      Explore Creatives / Search   Create Onboarding Profile
               ↓                           ↓
      Open Freelancer Profile      Add Skills & Equipment
               ↓                           ↓
      View Services & Gigs         Add Portfolio Works
               ↓                           ↓
      Create Service Booking       Create Service listings
               ↓                           ↓
      Checkout & Pay               Accept / Decline Booking
               ↓                           ↓
      Chat Portal ←─────────────────────→ Chat Portal (Direct)
               ↓                           ↓
      Workspace Review             Workspace Delivery
               ↓                           ↓
      Approve Output               Ledger Earnings Matured
               ↓                           ↓
      Submit Rating & Review       Request Bank Payout
```

---

## 2. Before Testing Configuration

To perform side-by-side verification of Client and Freelancer handoffs:
1. **Prepare Browser Windows**:
   * Open a **Normal Browser Window** for **Client** activities.
   * Open an **Incognito / Private Window** (or a different browser such as Edge/Firefox) for **Freelancer** activities.
2. **Account Requirements**:
   * You should have at least one test client email (e.g. `client_test@example.com`).
   * You should have at least one test freelancer email (e.g. `freelancer_test@example.com`).
   * The database runs locally on port `3306` with default credentials (`root` / `root`).

---

## 3. Landing Page & CTAs Test Suite

### Landing Page Navigation

* **ROLE**: GUEST / ANY
* **START**: Logged Out
* **GO TO**: URL: `http://localhost:3000/`
* **ACTION**: Verify visual components and click navigation CTAs.
* **EXPECTED**:
  * **Logo & Title**: "CREATIVE MARKETPLACE" must load in the top navbar.
  * **Login / Join CTA Buttons**: Top-right corner displays Login and Signup redirect targets.
  * **How It Works / Explore CTAs**: Main hero banner displays options to explore creators.
  * **Featured Talent Grid**: Dynamically displays cards of published creators (e.g. `Prem f`) with avatar thumbnail, location text, profession tag, and starting price.
  * **City Cards Section**: Section highlighting hotspots (e.g., Mumbai, Delhi). Clicking a card redirects to the explore directory filtered by that city.
  * **Footer**: Bottom links lead to placeholder sections.
* **VERIFY**:
  * Clicking "Explore Creatives" redirects to `/freelancers`.
  * Clicking "Join Marketplace" or "Join as Creator" redirects to `/register`.
  * Clicking "Login" redirects to `/login`.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

---

## 4. Registration System Test Suite

### Client Account Sign-Up

* **ROLE**: GUEST
* **START**: `http://localhost:3000/register`
* **ACTION**: Select account type and submit client registration details.
* **ENTER**:
  * Choose: "I Want to Hire (Client)"
  * Full Name: `Test Client`
  * Email: `test_client_temp@example.com` (use unique emails for each test)
  * Phone Number: `9876543210` (must be unique)
  * Password: `SecurePassword123`
* **EXPECTED**: Submitting should successfully register the account and immediately route to the Client Dashboard.
* **NEXT**: Redirects to `/client/dashboard`.
* **VERIFY**: Check the top-right navbar dropdown shows "test_client_temp@example.com" and role displays as "client".
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Freelancer Account Sign-Up

* **ROLE**: GUEST
* **START**: `http://localhost:3000/register`
* **ACTION**: Select account type and submit freelancer registration details.
* **ENTER**:
  * Choose: "I Want to Work (Freelancer)"
  * Full Name: `Test Creator`
  * Email: `test_freelancer_temp@example.com` (must be unique)
  * Phone Number: `9876543211` (must be unique)
  * Password: `SecurePassword123`
* **EXPECTED**: Submitting registers the profile and immediately lands the creator on the Onboarding Wizard.
* **NEXT**: Redirects to `/freelancer/onboarding`.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Registration Constraint Validation

* **ROLE**: GUEST
* **START**: `http://localhost:3000/register`
* **ACTION**: 
  1. Try registering a client using a duplicate email that is already registered.
  2. Try registering a freelancer using a duplicate phone number that is already registered.
* **EXPECTED**: 
  * The form must block submission and display validation alerts (e.g. "Email already registered" or "Phone number already exists").
  * A single user cannot own both a Client and a Freelancer account with the same email/phone.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

---

## 5. Login System Test Suite

### Client Login

* **ROLE**: CLIENT
* **START**: `http://localhost:3000/login`
* **ENTER**: 
  * Email/Phone: `client_test@example.com` (or your registered client)
  * Password: `password`
* **EXPECTED**: Lands user on Client Dashboard.
* **NEXT**: Redirects to `/client/dashboard`.
* **VERIFY**: Check sidebar items. Client items must load (Overview, Explore Creatives, Services, My Projects, Bookings, Messages, Payments, Favourites, Reviews, Settings).
* **REFRESH TEST**: Refresh page; session must persist (does not log out).
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Freelancer Login

* **ROLE**: FREELANCER
* **START**: `http://localhost:3000/login`
* **ENTER**:
  * Email/Phone: `freelancer_test@example.com` (or your registered freelancer)
  * Password: `password`
* **EXPECTED**: Lands user on Freelancer Dashboard.
* **NEXT**: Redirects to `/freelancer/dashboard`.
* **VERIFY**: Check sidebar items. Freelancer items must load (Overview, My Profile, Portfolio, Services, Availability, Browse Projects, My Proposals, Bookings, Messages, Earnings, Payouts, Reviews, Verification, Settings).
* **REFRESH TEST**: Refresh page; session must persist.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Admin Login

* **ROLE**: ADMIN
* **START**: `http://localhost:3000/login`
* **ENTER**:
  * Email: `admin@gmail.com`
  * Password: `admin` (or standard database password)
* **EXPECTED**: Lands user on Admin Dashboard.
* **NEXT**: Redirects to `/admin/dashboard`.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Logout Verification

* **ROLE**: ANY LOGGED IN USER
* **ACTION**: Click the Profile Avatar dropdown in top-right navbar → Click **Logout**.
* **EXPECTED**: Session terminates, cookies are cleared, and user is redirected back to the Landing Page.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

---

## 6. Client Journey: Discover & Book

### Explore Creatives & Search Filters

* **ROLE**: CLIENT
* **START**: `/client/dashboard`
* **GO TO**: Sidebar → **Explore Creatives** (`/freelancers`)
* **ACTION**: Filter list of available creators by Profession, City (Location), and search tags.
* **VERIFY**:
  * Selecting "Photographer" under Profession dropdown re-queries and displays cards matching that profile tag.
  * Typing a city name (e.g. "Mumbai") and clicking "Search Professionals" updates list to match location city.
  * Clicking "View Profile" on a creator card redirects to that creator's public profile details.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Public Freelancer Profile Inspection

* **ROLE**: CLIENT
* **START**: `/freelancers/[id]`
* **VERIFY**:
  * **Profile Details**: Displays Name, Avatar, Professional Title, Location, starting price, rating star, and Bio summary.
  * **Skills Badge List**: Displays skills associated with the creator.
  * **Equipment List**: Lists camera gear, lenses, lighting etc.
  * **Portfolio Showcase**: Displays uploaded photos/thumbnails.
  * **Gigs/Services Section**: Displays active service listing cards.
  * **Trust Badges**: Displays Identity Shield badge if the user is verified.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Client Booking Creation Workflow

* **ROLE**: CLIENT
* **START**: `/freelancers/[id]` (Or via service page `/services/[id]`)
* **ACTION**: Initiate a direct booking order on a Freelancer's active service listing.
* **GO TO**: Choose an active Service package → Click **Order Service** / **Book Professional**
* **ENTER**:
  * Choose Package: Basic / Standard / Premium (price calculates automatically)
  * Scheduled Date: Select a future calendar date.
  * Start/End Time: e.g. 09:00 to 18:00
  * Venue details: Venue Name, City, State, full Address.
  * Requirements answers: Type answers to any required questions specified by the freelancer.
* **ACTION**: Click **Confirm and Continue to Payment**
* **EXPECTED**:
  * Redirects to the checkout payment page (`/client/bookings/[id]/payment`).
  * Initiates Payment gateway wrapper.
  * After submitting payment, booking status changes to `REQUESTED` / `PENDING_CONFIRMATION` and appears in the bookings ledger.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

---

## 7. Client ↔ Freelancer Handoff Verification

### Handoff: Booking Submission Check

* **ROLE**: CLIENT / FREELANCER
* **ACTION**:
  1. **As Client**: Complete a checkout payment for a booking request. Verify the booking appears in `/client/bookings` with status `REQUESTED`.
  2. **Switch to Freelancer Browser Window**: Log in as the targeted freelancer.
  3. Go to: Sidebar → **Bookings** (`/freelancer/bookings`).
* **EXPECTED**: 
  * The client's new booking record must immediately appear under the "Requests" tab.
  * Details match title, client name, execution date, agreed price, and intake answers.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

---

## 8. Freelancer Journey: Profile & Offerings Setup

### Onboarding Wizard Journey

* **ROLE**: FREELANCER (New user or user with uncompleted profile)
* **START**: `/freelancer/onboarding`
* **ACTION**: Advance step-by-step through the setup pages.
* **STEPS**:
  * **Step 1**: Basic Profile details (Title, Bio, Profile Photo upload).
  * **Step 2**: Primary Profession selection & years of experience.
  * **Step 3**: Physical location address & willing to travel distance radius.
  * **Step 4**: Associate Skills (choose badges from list).
  * **Step 5**: List Equipment gear (type type/brand/model, add to list).
  * **Step 6**: Portfolio showcase uploads (upload files, add metadata).
  * **Step 7**: Configure default pricing ranges (starting rates).
  * **Step 8**: Review checklists (Requires >= 60% completion and >=1 portfolio item). Click **Finish & Publish Profile**.
* **EXPECTED**: Once published, profile state is set to public. It immediately appears on landing grids and search directories.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Freelancer Profile Verification (Negative Test)
* **ACTION**: Attempt to complete onboarding wizard while profile completion is < 60% or when portfolio items count = 0.
* **EXPECTED**: The wizard must throw an alert and block publication until prerequisites are satisfied.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Skills Manager

* **ROLE**: FREELANCER
* **START**: `/freelancer/profile/edit`
* **ACTION**: Go to Step 4 (Skills selection) or Profile Edit view. Check boxes next to standard skills, then click Save.
* **REFRESH TEST**: Refresh browser tab. Skills must persist on the edit page and display correctly on `/freelancer/profile`.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Equipment Inventory CRUD

* **ROLE**: FREELANCER
* **START**: `/freelancer/profile/edit`
* **ACTION**: 
  1. Add equipment (e.g. Brand: Sony, Model: A7IV, Type: Camera).
  2. Click Edit on an item in the equipment list, change model name, click Update.
  3. Click Delete (Trash icon) to remove an item.
* **VERIFY**: Return to profile preview page. Check list dynamically matches modifications.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Portfolio Showcase CRUD

* **ROLE**: FREELANCER
* **START**: `/freelancer/portfolio` (or Edit Profile Step 6)
* **ACTION**: 
  1. Click **Add Portfolio Item**. Choose file, enter Title, description, category tag, and click Save.
  2. Click **Feature** (Star icon) on an item to set it as featured.
  3. Click **Delete** (Trash icon) to remove.
* **VERIFY**: Public profile visitors (`/freelancers/[id]`) immediately see updated portfolio grid. Featured works appear in the highlights header.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Services Listing Wizard

* **ROLE**: FREELANCER
* **START**: Sidebar → **Services** (`/freelancer/services`)
* **ACTION**: Click **Create New Service**. Follow the mult-step service creation form:
  * **Step 1 (Details)**: Enter Title, short description, long description, service category type, location scope.
  * **Step 2 (Packages)**: Define pricing structures for Basic, Standard, and Premium packages (price, delivery duration, revision limits, and check items).
  * **Step 3 (Media Upload)**: Choose and upload a cover photo.
  * **Step 4 (Intake Requirements)**: Add custom questions that clients must answer when checking out.
* **ACTION**: Click **Save and Publish**.
* **VERIFY**: Service appears in your dashboard list as `PUBLISHED`. Clients viewing your public profile can now book this service.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Availability Calendar

* **ROLE**: FREELANCER
* **START**: Sidebar → **Availability** (`/freelancer/availability`)
* **ACTION**:
  1. Toggle standard weekly workdays (e.g. check Monday, uncheck Sunday). Set default daily hours (e.g. 09:00 - 18:00).
  2. Scroll down to Date Overrides section. Choose a specific single calendar date and set state to "Busy / Unavailable". Click Save.
* **EXPECTED**: When clients checkout bookings, dates blocked in overrides or disabled in standard schedules must warn or block booking coordination.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

---

## 9. Booking Actions & Flow Verification

Manual testing flows for booking state changes:

```
    [REQUESTED] ──(Accept)──> [CONFIRMED] ──(Start Work)──> [IN_PROGRESS] ──(Deliver Output)──> [DELIVERY_PENDING] ──(Client Approval)──> [COMPLETED]
```

### Freelancer Accepts Booking Request

* **ROLE**: FREELANCER
* **START**: `/freelancer/bookings`
* **GO TO**: Open a booking in `REQUESTED` status → Click **View Details**
* **ACTION**: Click **Accept Request**
* **EXPECTED**:
  * Status updates to `CONFIRMED`.
  * Open Project Workspace button becomes active.
* **OTHER ROLE CHECK**: Logged-in Client reviews the booking status. Status is updated to `CONFIRMED`.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Freelancer Starts Work Job

* **ROLE**: FREELANCER & CLIENT (Collaboration verification)
* **START**: Open the booking workspace page (`/[freelancer/client]/bookings/[id]/workspace`) for a `CONFIRMED` booking.
* **ACTION (Freelancer)**:
  1. On the Overview tab under **Financial Rate summary**, click the bouncing **"Start Work Project"** button and click confirm.
* **EXPECTED**:
  1. Stepper progress bar at the top updates from Step 1 (**Order Confirmed**) to Step 2 (**Work In Progress**).
  2. Workspace Status banner updates to `IN_PROGRESS`.
  3. **"Start Work Project"** action button swaps with **"Submit Delivery Package"**.
  4. Navigate to the **Timeline** tab; the event **"Project Started: Freelancer has started working on this project. Workspace is now active."** is logged.
* **OTHER ROLE CHECK (Client)**:
  1. Log in as Client. Open the booking workspace page.
  2. Verify the progress stepper displays Step 2 (**Work In Progress**) active.
  3. Verify the **Timeline** shows the "Project Started" event.
  4. Refresh the page to verify state remains correct.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Freelancer Delivers Booking Deliverable

* **ROLE**: FREELANCER
* **START**: Open active `IN_PROGRESS` booking.
* **ACTION**: Click **Deliver Output**
* **EXPECTED**: Booking status updates to `DELIVERY_PENDING`.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Client Approves Completion & Handoff

* **ROLE**: CLIENT
* **START**: Logged in as Client. Open the `DELIVERY_PENDING` booking details page.
* **ACTION**: Click **Approve Delivery** (or Approve work).
* **EXPECTED**:
  * Status updates to `COMPLETED`.
  * Triggers rating feedback submission card.
  * Funds mature on freelancer ledger from `PENDING` to `AVAILABLE`.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Booking Reschedule Proposal Flow

* **ROLE**: CLIENT / FREELANCER
* **START**: Open a `CONFIRMED` booking details page.
* **ACTION**:
  1. Click **Reschedule**.
  2. Select a proposed new Date, Start Time, and enter a reason description. Click Submit.
* **EXPECTED**: Booking transitions to `RESCHEDULE_REQUESTED`.
* **OTHER ROLE CHECK**: 
  1. Log in as the other participant. Open the booking details page.
  2. A rescheduling banner appears showing the proposed coordinates.
  3. Click **Accept Reschedule** to confirm changes. Status reverts to `CONFIRMED` with updated dates.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

---

## 10. Complete Messaging & Chat Room Verification

### Booking Messages Exchange Test

* **ROLE**: FREELANCER & CLIENT (Simulated side-by-side using normal and incognito browser tabs)
* **ACTION**:
  1. **As Freelancer**: Log in. Open a booking details page (`/freelancer/bookings/[id]`). Click **Open Chat Room**.
  2. **Verify Navigation**: Redirects to `/freelancer/messages?active={conversation_id}`.
  3. **Action**: Type message `"Freelancer booking workspace update."` and click Send.
  4. **As Client**: Log in in the other browser tab. Go to: Sidebar → **Messages** (`/client/messages`).
* **EXPECTED**:
  * The freelancer's thread appears active.
  * The message `"Freelancer booking workspace update."` displays in real time.
  * **Action**: Reply `"Client review completed."` and click Send.
  * **Verify Freelancer Window**: The client's response appears in the freelancer chat view.
* **PERSISTENCE TEST**: Refresh both windows. Message history must remain populated.
* **NEGATIVE TEST**: Access the conversation route URL directly when logged out. Page must redirect to login with no data exposed.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

---

## 11. Platform Management & Financials

### Earnings Ledger Audit

* **ROLE**: FREELANCER
* **START**: Sidebar → **Earnings** (`/freelancer/earnings`)
* **EXPECTED**:
  * Metrics dashboard loads showing: Lifetime Earnings, Pending Clearance, Available for Payout.
  * Transaction history lists payouts debited and gig contracts credited with date stamps.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Bank Account Payout Verification

* **ROLE**: FREELANCER
* **START**: Sidebar → **Payouts** (`/freelancer/earnings/payouts`)
* **ACTION**:
  1. Link Bank account: enter details (IFSC/Account number configurations).
  2. Click **Request Payout**. Enter payout amount.
* **EXPECTED**: 
  * If requested amount is below the minimum allowed ₹500, request is blocked with error alert.
  * If valid, available funds are processed and subtracted from ledger balance.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Client Rating & Feedback Review

* **ROLE**: CLIENT
* **START**: Open a `COMPLETED` bookingdetails page.
* **ACTION**: Rate the service (1-5 stars) and submit review comment details.
* **OTHER ROLE CHECK**: 
  1. Log in as Freelancer → Sidebar → **Reviews** (`/freelancer/reviews`). The client review must appear in list.
  2. Click **Reply** to submit a responder comment.
  3. Check the freelancer's public profile page. The review and freelancer response must display publicly.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Notification In-App Alerts

* **ROLE**: CLIENT / FREELANCER
* **ACTION**: Trigger workspace events (such as client booking checkout, freelancer accepts booking, message sent).
* **EXPECTED**:
  * The recipient displays a red dot badge counter in top header and sidebar (**Notifications** link).
  * Go to `/notifications`. Detailed alert logs are displayed.
  * Clicking an alert redirects to the target page (e.g. details, chat) and sets state to read.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Notification Preferences Settings

* **ROLE**: CLIENT / FREELANCER
* **START**: Sidebar → **Settings**
* **ACTION**: Toggle switches next to notification channels (email alerts, message notifications etc.) and click **Save Preferences**.
* **REFRESH TEST**: Refresh page. Verify configuration settings remain toggled.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Razorpay Webhook & Payment Eligibility Integration

* **ROLE**: CLIENT
* **START**: Open a booking checkout page `/client/bookings/[id]/payment`
* **ACTION**:
  1. Observe the "Total Price Due" panel. It must reflect the eligibility phase (e.g., Initial Deposit vs Remaining Balance).
  2. If the payment is blocked (e.g., waiting on freelancer confirmation), verify that the amber "Payment Not Available" alert displays the blocking reason.
  3. When eligible, click **Simulate Sandbox Checkout Success** or process a test card via the Razorpay gateway.
  4. Ensure the backend `/webhooks/razorpay` captures the successful transaction signature and updates the booking ledger.
* **EXPECTED**: 
  * The frontend gracefully prevents invalid payments.
  * Successful webhook processing transitions the booking state automatically.
* **STATUS**:
  * [ ] NOT TESTED
  * [ ] PASS
  * [ ] FAIL

---

## 12. Admin Management Workspace

### Freelancer Identity Verification Submission

* **ROLE**: FREELANCER
* **START**: Sidebar → **Verification** (`/freelancer/verification`)
* **EXPECTED**:
  * If never submitted, shows status **NOT SUBMITTED** with a **Start Verification** CTA.
  * Click **Start Verification** to display details form.
  * Fill: Full legal name, Government ID type, Government ID number.
  * Upload a valid document (PDF/PNG/JPG). Click **Submit Verification**.
  * The page transitions to **PENDING** state displaying "Under Review" notice. Duplicate submissions are disabled.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Admin Identity Verification Review Queue

* **ROLE**: ADMIN & FREELANCER (Cross-role loop)
* **START**: Logged in as Admin. Sidebar → **Verification** (`/admin/verification`)
* **EXPECTED**:
  * The newly submitted freelancer application appears in the queue with status **PENDING**.
  * Click the queue item to load review panel. Under "Documents", verify the download links work.
* **ACTION 1: REJECT PATH**:
  * Select **Reject** option. Reason: `ID document resolution blurry.`. Click Submit.
  * *Freelancer Check*: Log back in as Freelancer. Verify status is **REJECTED** showing the reason: `ID document resolution blurry.`. Click **Resubmit Verification** to re-enable submission.
* **ACTION 2: APPROVE PATH**:
  * Clear and resubmit as Freelancer.
  * Log back in as Admin. Select **Approve** option. Add notes. Click Submit.
  * *Freelancer Check*: Log back in as Freelancer. Verify status is **VERIFIED** displaying the verified shield badge. Check public profile page. The verified trust badge is active.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

### Platform Audit Logs Viewer

* **ROLE**: ADMIN
* **START**: Sidebar → **Audit Logs** (`/admin/audit`)
* **EXPECTED**: Chronological log of administrative actions (e.g. verifications processed) with action type filters.
* **STATUS**:
  * [ ] NOT TESTED
  * [x] PASS
  * [ ] FAIL

---

## 13. Currently Incomplete / Partially Implemented Features

The following modules contain broken flows or placeholders. Please reference this table during manual testing cycles:

| Feature / Workspace | Current Status | What Happens Now | Expected Final Flow | Blocks E2E Testing? |
| :--- | :--- | :--- | :--- | :--- |
| **Browse Projects / Jobs Feed** | **NOT IMPLEMENTED** | Sidebar "Browse Projects" redirects to the Gig services listing page (`/services`). Legacy sidebar route (`/freelancer/projects`) returns Next.js 404 error. | Freelancer queries client-posted requirements list, views details, and bids on work. | **Yes** (Only direct service order flow is testable). |
| **Proposal Bidding Submission** | **PARTIAL** | Page `/freelancer/proposals` loads proposals from `GET /api/v1/freelancer/proposals`, but submitting a new proposal is blocked because backend routes are placeholders. | Freelancer submits pricing quotes/timelines to active job postings. | **Yes** (Bidding cannot be completed). |
| **Freelancer Document Uploads** | **NOT IMPLEMENTED** | Sidebar "Verification" redirects to `/freelancer/dashboard`. No freelancer-facing document upload page or submit controller exists. | Freelancer uploads identity files (PDF/JPG) on onboarding or settings page. | **Yes** (Admins can process queue, but creators cannot submit claims). |

---

## 14. Complete Client-Freelancer End-to-End Test

Use this script to verify the core marketplace chain from setup to contract fulfillment:

```
[Freelancer onboarding wizard] -> [Publish profile] -> [Setup service] -> [Client search & checkout] -> [Direct Chat] -> [Execution: Start, Deliver] -> [Client payout release]
```

### Action Steps

1. **[Browser A - Freelancer]**: Log in and complete steps 1-8 of Onboarding. Click **Finish & Publish Profile**.
   * *Verify*: Profile starting status is set to public.
2. **[Browser A - Freelancer]**: Go to `/freelancer/services/new`. Complete Service Listing form. Click **Save and Publish**.
   * *Verify*: Service appears in lists with basic/standard/premium packages.
3. **[Browser B - Client]**: Log in. Go to `/freelancers`. Filter location by city or select profession matching Freelancer A.
   * *Verify*: Freelancer A appears in cards grid.
4. **[Browser B - Client]**: Click Freelancer card → Open Public Profile → Choose newly created Service card → Click **Book Professional**.
5. **[Browser B - Client]**: Complete booking checkout (select package, set coordinates, submit payment).
   * *Verify*: redirected to checkout success, status is `REQUESTED`.
6. **[Browser A - Freelancer]**: Go to `/freelancer/bookings`.
   * *Verify*: client booking request appears under "Requests".
7. **[Browser A - Freelancer]**: Open booking → Click **Accept Request** (status -> `CONFIRMED`).
8. **[Browser A - Freelancer]**: Click **Open Chat Room**. Send chat message `"Init chat update"`.
9. **[Browser B - Client]**: Go to `/client/messages`.
   * *Verify*: Chat opens, message matches, type reply `"Received chat update"`.
10. **[Browser A - Freelancer]**: Open booking → Click **Start Work Job** (status -> `IN_PROGRESS`).
11. **[Browser A - Freelancer]**: Click **Deliver Output** (status -> `DELIVERY_PENDING`).
12. **[Browser B - Client]**: Open booking details → Click **Approve Delivery** (status -> `COMPLETED`).
13. **[Browser A - Freelancer]**: Go to `/freelancer/earnings`.
    * *Verify*: Gig payment price (minus commission, if applicable) has transitioned to available funds.
14. **[Browser A - Freelancer]**: Go to `/freelancer/earnings/payouts` → Request available payout withdrawal.
    * *Verify*: withdrawal debits ledger.
---

## 15. Negative / Failure Test Scenarios

Verify the website displays clean validation errors during exceptions:

* **Authentication Boundaries**:
  * Try opening `/freelancer/dashboard` or `/client/dashboard` when logged out. Expected: Redirects to `/login`.
  * Logged-in client tries to access `/freelancer/earnings` directly via URL. Expected: Redirects to `/client/dashboard` or throws access error.
* **Form Validation Gates**:
  * Register using duplicate email address. Expected: Validation alert display.
  * Update profile bio to < 30 characters. Expected: Onboarding wizard blocks progression.
* **Direct Messaging Boundaries**:
  * Logged-in freelancer attempts to open chat with themselves (passing own ID). Expected: Backend blocks self-conversation request with `400 Bad Request`.
  * Freelancer tries to message Client with whom no active booking or proposal exists. Expected: Backend blocks request with `403 Forbidden`.
* **Proposals & Bidding Boundaries**:
  * Submit proposal with negative budget or delivery days. Expected: Blocked by form validation boundaries.
  * Attempt to submit a second proposal to the same project brief. Expected: System displays "You have already submitted an active proposal for this project brief."
  * Client B attempts to view or accept proposals submitted to Client A's project listing. Expected: Backend blocks request with `403 Forbidden` response.

---

## 16. Projects & Proposals (Job Board) Test Suite

This suite verifies the client requirements posting, freelancer jobs feed browsing, proposal bidding, and automatic contract generation loops.

### Step 1: Client Posts Project Requirement
* **ROLE**: CLIENT
* **START**: Logged in Client Browser
* **GO TO**: `http://localhost:3000/client/projects/new` (or click "Post a Project" in Client sidebar)
* **ACTION**: Fill out the project brief form:
  * Title: `Cinematic Wedding Reel Editor`
  * Description: `Looking for a reel editor with experience in Color Grading and transitions. Needs to deliver 3 reels from a raw footage file.`
  * Category: Select `Creative Brief` (or specific category)
  * Budget Min: `5000`
  * Budget Max: `15000`
  * Deadline: Select a date in the future
  * Work Mode: `Remote`
* **SUBMIT**: Click **Create Project Listing**
* **EXPECTED**: 
  * Redirects to client dashboard `/client/projects`.
  * Listing appears under "My Projects" with status `OPEN`.

### Step 2: Freelancer Browses Jobs Feed & Filters Listings
* **ROLE**: FREELANCER
* **START**: Logged in Freelancer Browser
* **GO TO**: `http://localhost:3000/freelancer/jobs` (or click "Browse Jobs" in Freelancer sidebar)
* **ACTION**: Verify project listing is present and use filters:
  * Budget min / max filters
  * Search keywords (e.g. `Wedding`)
* **EXPECTED**:
  * The newly posted project `Cinematic Wedding Reel Editor` appears in feed.
  * Displays: Title, Category, Budget range (₹5,000 - ₹15,000), Remote tag, and Date posted.
  * Clicking the card redirects to `/freelancer/jobs/[id]`.

### Step 3: Freelancer Submits Proposal Bid
* **ROLE**: FREELANCER
* **START**: Logged in Freelancer Browser at `/freelancer/jobs/[id]`
* **ACTION**: 
  * Verify job coordinates.
  * Click **Submit Proposal** button to toggle input fields.
  * Bid Price: `12000`
  * Delivery Time: `5` days
  * Cover Pitch: `I have edited over 50 reels using Premiere Pro and Resolve. Here is my proposal.`
  * Click **Submit Bid**
* **EXPECTED**:
  * Success notification banner displays.
  * Sidebar updates to show `Proposal Submitted` state.
  * Redirects automatically to My Proposals overview `/freelancer/proposals`.
  * The proposal card shows status as `PENDING`.

### Step 4: Client Reviews Proposal List & Details
* **ROLE**: CLIENT
* **START**: Logged in Client Browser
* **GO TO**: `http://localhost:3000/client/projects/[id]` (Client Project Details Page)
* **ACTION**: Verify received proposals section.
* **EXPECTED**:
  * Under "Received Proposals", cards display Freelancer name, bid amount (₹12,000), delivery timeline (5 days), and pitch preview.
  * Clicking **View Proposal** redirects to `/client/projects/[projectId]/proposals/[proposalId]`.

### Step 5: Client Rejects Proposal Bid (Verify History Flow)
* **ROLE**: CLIENT
* **START**: Logged in Client Browser at `/client/projects/[projectId]/proposals/[proposalId]` (e.g. create a second test freelancer proposal for this validation)
* **ACTION**: Click **Reject Bid**
* **EXPECTED**:
  * Success message displays. Status changes to `REJECTED`.
  * Project listing status remains `OPEN`.

### Step 6: Client Accepts Proposal Bid (Generate Contract Booking)
* **ROLE**: CLIENT
* **START**: Logged in Client Browser at `/client/projects/[projectId]/proposals/[proposalId]`
* **ACTION**:
  * Click **Award Project** to expand the booking details form.
  * Scheduled Date: Choose a valid date (e.g. next week)
  * Start Time: `10:00`
  * End Time: `18:00`
  * City / State / Venue details: Optional
  * Click **Confirm & Award Contract**
* **EXPECTED**:
  * Success message displays. Redirects client to `/client/bookings`.
  * New booking appears in client's dashboard with status `CONFIRMED` and price match (₹12,000).
  * Project listing status updates to `AWARDED`.
  * Freelancer's bid status updates to `ACCEPTED`.
  * Other pending bids on that project are marked as `REJECTED` automatically.

### Step 7: Verify Booking Access in Freelancer Panel
* **ROLE**: FREELANCER
* **START**: Logged in Freelancer Browser
* **GO TO**: `http://localhost:3000/freelancer/bookings`
* **EXPECTED**:
  * The newly generated contract booking displays under "Active Gigs" list with matching coordinates (₹12,000, Confirmed).

---

## 17. Master Testing Checklist

### Landing Page & Visitor
- [x] Navbar CTAs
- [x] Featured Creatives Grid
- [x] Hotspot City Cards Redirects
- [x] Footer Links

### Authentication
- [x] Client Signup Form
- [x] Freelancer Signup Form
- [x] Unique Email constraint checks
- [x] Unique Phone constraint checks
- [x] Client Login
- [x] Freelancer Login
- [x] Admin Login
- [x] Session persistence after refresh
- [x] Logout Redirect

### Projects & Proposals (Job Board)
- [x] Client Posts Project requirement (`/client/projects/new`)
- [x] Freelancer Job Feed Feed queries (`/freelancer/jobs`)
- [x] Job Feed keyword search & budget filters
- [x] Freelancer submits Proposal Bid (Proposed Price, Delivery Days, Cover pitch)
- [x] Proposal duplicate bid protection check
- [x] Freelancer withdraws pending bid (`/freelancer/proposals`)
- [x] Client reviews Received Bids list (`/client/projects/[id]`)
- [x] Client inspects Bid Details & clicks Freelancer profile link
- [x] Client Rejects Proposal Bid (status transitions to REJECTED)
- [x] Client Awards Project & completes scheduling parameters form
- [x] Auto-generation of Booking contract matching proposal bid details
- [x] Auto-rejection of other competing pending bids on the same project
- [x] Auto-transition of Project status to AWARDED

### Freelancer Workspace
- [x] Onboarding Wizard Completeness check
- [x] Edit Profile details
- [x] Add / Remove Skills
- [x] Equipment list CRUD
- [x] Add / Feature Portfolio items
- [x] Create Service Gig (Pricing/Packages/Intake)
- [x] Edit / Archive Service Listings
- [x] Weekly schedules calendar
- [x] Overrides availability dates
- [x] Earnings dashboard ledger
- [x] Payout Bank linking
- [x] Balance withdrawal request
- [x] Review reply submission
- [x] Settings (Notification preferences)

### Client Workspace
- [x] Explore Creatives Directory filters
- [x] Public Freelancer profiles visibility
- [x] Service order checkout
- [ ] Razorpay Checkout & Webhook Processing
- [x] Bookings history details
- [x] Chat conversation portal
- [x] Workspace delivery approval
- [x] Rating review submission
- [x] Settings (Notification preferences)

### Admin Panel
- [x] Operations metrics summary
- [x] Identity Verifications list
- [x] Verification claim Approve/Reject
- [x] Audit logs listing
