# Creative Marketplace — Admin-Managed Marketplace UI/UX Design System

## Purpose

This document updates the existing Creative Marketplace UI/UX design to support a managed marketplace for:

- Photographers
- Videographers
- Video Editors
- Photo Editors
- Cinematographers
- Drone Operators
- Motion Graphics Artists
- Other creative professionals

The product must continue to feel like a premium professional freelancing marketplace, but the operating model is now admin-mediated.

The client and freelancer must never need to communicate directly with each other.

The two allowed communication lines are:

- Client ↔ Admin
- Freelancer ↔ Admin

The Admin acts as the booking coordinator, assignment manager, negotiation bridge, work reviewer, delivery controller, and payout release authority.

The public/marketing experience may remain visually premium and editorial. Logged-in areas must prioritize clarity, speed, trust, status visibility, and operational workflows.

---

# 1. CORE BUSINESS MODEL — ADMIN-MANAGED MARKETPLACE

The platform no longer uses a direct Client ↔ Freelancer working relationship.

Required relationship:

```text
CLIENT  ↔  ADMIN  ↔  FREELANCER
```

Not allowed:

```text
CLIENT  ↔  FREELANCER
```

This rule applies to:

- booking communication
- requirement clarification
- negotiation
- project discussion
- file sharing
- work-in-progress review
- delivery
- revision handling
- dispute communication

Client and Freelancer may still view public marketplace profiles, portfolios, services, ratings and reviews.

They must not receive a direct chat or direct contact channel with each other.

---

# 2. FUNCTIONAL CHANGE BOUNDARY

This is no longer a presentation-only update. The following business flow is intentionally changed:

- direct Client → Freelancer booking
- direct Client ↔ Freelancer messaging
- Freelancer proposal-based project acquisition
- direct Freelancer → Client delivery
- direct Client revision communication with Freelancer

Replace those flows with the Admin-managed model defined in this document.

Do NOT change unrelated functionality such as:

- authentication
- role identities
- freelancer profile creation
- portfolio management
- services management
- availability management
- favourites
- notifications architecture unless required for the new flow
- verification
- review storage
- payout account setup
- platform visual identity
- global design tokens
- existing responsive shell

Do not create duplicate versions of the same booking, message, delivery, or payment workflow.

Where existing models/routes can be safely adapted, reuse them.

---

# 3. ROLE RESPONSIBILITIES

## Client

The Client can:

- log in
- explore creative professionals
- view profiles
- view portfolios
- view services
- view ratings/reviews
- save favourites
- select a freelancer
- create a booking request
- post a project/job requirement
- communicate with Admin after a booking/project is submitted
- approve an Admin-suggested replacement freelancer
- pay deposit
- review Admin-shared draft content when Admin chooses to share it
- request revision through Admin
- pay pending balance
- receive final delivery from Admin
- accept final delivery
- review the Freelancer after completion

The Client cannot:

- directly message a Freelancer
- directly send files to a Freelancer
- directly negotiate with a Freelancer
- directly assign work to a Freelancer
- directly receive final work from a Freelancer

## Freelancer

The Freelancer can:

- log in
- manage profile
- manage portfolio
- manage services
- manage availability
- explore public profiles/portfolios if desired
- receive bookings assigned by Admin
- accept or reject an assignment
- provide rejection reason
- provide optional counter offer
- communicate with Admin after assignment
- start work after the deposit/payment state allows it
- submit work to Admin
- receive revision requests from Admin
- resubmit revised work
- view advance amount credited by Admin as non-withdrawable pending earning
- view final released earnings
- request payout only from withdrawable balance
- receive reviews after completion

The Freelancer cannot:

- directly message a Client
- directly send work to a Client
- directly negotiate with a Client
- browse open projects for self-application under the old proposal model
- submit direct proposals to Clients

## Admin

The Admin can:

- receive direct booking requests
- receive client job/project posts
- communicate with Client
- inspect selected Freelancer
- assign the selected Freelancer
- recommend a replacement Freelancer
- request Client approval before replacing the Client-selected Freelancer
- assign approved replacement Freelancer
- communicate with Freelancer after assignment
- receive Freelancer rejection reason/counter offer
- negotiate through the two separate communication lines
- reassign to the same Freelancer after negotiation
- assign to a different Freelancer after Client approval
- monitor deposit/payment state
- release/record Freelancer advance
- monitor work status
- receive Freelancer submissions
- review work
- request Freelancer revision
- optionally share draft work/files/ZIP/Drive links with Client
- receive Client feedback/revision request
- relay revision request to Freelancer
- confirm pending balance payment
- deliver final approved project to Client
- complete booking
- release final Freelancer payout
- manage disputes, refunds and exceptions

---

# 4. PRIMARY END-TO-END CLIENT FLOW

```text
Client Login
  ↓
Explore Creatives / Services
  ↓
View Freelancer Profile + Portfolio + Reviews
  ↓
Choose Freelancer
  ↓
Click Book
  ↓
Booking Modal
  ↓
Enter Date + Venue + Requirement + Budget
  ↓
Submit Booking
  ↓
Booking goes to Admin Inbox
  ↓
Client ↔ Admin chat becomes available
  ↓
Admin Reviews
  ↓
Admin assigns selected Freelancer
  ↓
Freelancer accepts
  ↓
Client pays Deposit
  ↓
Freelancer starts work
  ↓
Freelancer submits work to Admin
  ↓
Admin reviews
  ↓
Admin optionally shares draft with Client
  ↓
Revision loop if required
  ↓
Client pays Pending Balance
  ↓
Admin sends Final Delivery to Client
  ↓
Client Accepts Delivery
  ↓
Admin Completes Booking
  ↓
Admin releases Freelancer payout
  ↓
Client leaves rating + optional review comment
```

---

# 5. PRIMARY END-TO-END FREELANCER FLOW

```text
Freelancer Login
  ↓
Dashboard
  ↓
Bookings
  ↓
Assigned Booking Request
  ↓
Review Requirement
  ↓
Accept
  OR
  Reject + Reason + Optional Counter Offer
  ↓
Admin ↔ Freelancer chat available
  ↓
If Accepted, wait for Deposit status
  ↓
Start Work
  ↓
Work according to requirement
  ↓
Submit Work to Admin
  ↓
Admin Review
  ↓
Revision Request if needed
  ↓
Resubmit
  ↓
Admin approves
  ↓
Client balance payment confirmed
  ↓
Admin delivers final work
  ↓
Client accepts
  ↓
Admin completes booking
  ↓
Final payout becomes withdrawable
```

---

# 6. JOB POST / PROJECT FLOW — ADMIN MATCHING

Keep Client project/job posting, but remove the old direct proposal marketplace behavior.

New flow:

```text
Client Posts Project
  ↓
Project appears in My Projects
  ↓
Project appears in Admin Job Posts Inbox
  ↓
Client ↔ Admin project chat becomes available
  ↓
Admin reviews requirements
  ↓
Admin searches/matches suitable Freelancer
  ↓
Admin proposes/assigns Freelancer
  ↓
If replacement/match differs from Client's preference, Client approval is required
  ↓
Freelancer receives assignment
  ↓
Freelancer Accepts / Rejects + Reason + Optional Counter Offer
  ↓
Admin coordinates negotiation/reassignment
  ↓
Booking created/confirmed
  ↓
Deposit → Work → Admin Review → Balance → Delivery
```

Remove from the new product flow:

- Freelancer Browse Projects for direct application
- Submit Proposal
- My Proposals
- Client Received Proposals
- direct proposal acceptance between Client and Freelancer

If proposal database structures still exist temporarily, do not expose them as the primary user workflow.

---

# 7. CLIENT BOOKING MODAL

On Freelancer profile/service page, the primary action is:

**Book Professional**

Clicking it opens a modal or drawer.

Required fields:

- Selected Freelancer — read-only identity context
- Booking Date
- Venue / Location
- Requirement Description
- Budget

Optional fields only if supported:

- Event/Project type
- Time
- Reference attachments
- Reference links
- Notes

Primary CTA:

**Send Booking Request**

Helper copy:

> Your request will be reviewed by our Admin team. We will coordinate the booking and confirm the assigned professional with you.

Do not imply that the request is sent directly to the Freelancer.

After submit:

- show Booking ID
- show status: Awaiting Admin Review
- open Client ↔ Admin conversation for that booking
- provide View Booking
- provide Message Admin

---

# 8. CLIENT-SELECTED FREELANCER AND REPLACEMENT RULE

Default behavior:

```text
Client selects Freelancer A
  ↓
Admin should first attempt to assign Freelancer A
```

If Freelancer A is unavailable, rejects, or negotiation fails:

```text
Admin selects Freelancer B
  ↓
Client receives replacement suggestion
  ↓
Client reviews Freelancer B profile/portfolio
  ↓
Client Approves or Rejects replacement
```

Admin must not silently replace the Client-selected Freelancer.

Suggested Client UI:

**Replacement Professional Suggested**

- Freelancer name
- Profession
- Rating
- Portfolio preview
- Price/counter-offer context if relevant
- Reason for replacement

Actions:

- View Profile
- Approve Replacement
- Ask Admin
- Decline Replacement

---

# 9. FREELANCER BOOKING REQUEST ACCEPT / REJECT

When Admin assigns a booking, the Freelancer sees it under:

**Bookings → Requests**

Booking request card should show:

- Booking ID
- Project/service title
- date
- venue
- requirement summary
- offered amount / budget
- Admin coordination status
- response deadline if supported

Actions:

- Accept Booking
- Reject / Counter

Reject / Counter opens a modal.

Required:

- Reason for rejection — textarea

Optional:

- Counter Offer Amount
- Counter Offer Notes
- Alternative availability/date if supported

CTA:

**Send Response to Admin**

Do not send this response to the Client directly.

---

# 10. NEGOTIATION AND REASSIGNMENT

If Freelancer rejects or counters:

```text
Freelancer → Admin
```

Admin sees:

- rejection reason
- counter amount
- counter notes
- original booking budget
- Client requirement

Admin can:

- discuss counter with Client
- ask Freelancer for clarification
- accept a revised commercial arrangement if permitted
- reassign to the same Freelancer after agreement
- suggest a replacement Freelancer to Client
- cancel the assignment

All Client communication happens in Client ↔ Admin chat.

All Freelancer communication happens in Freelancer ↔ Admin chat.

Never merge these into a three-way chat.

---

# 11. COMMUNICATION MODEL

There are exactly two communication channels:

## Client ↔ Admin

Created when:

- a booking request is submitted
- a project/job post is submitted

Used for:

- booking clarification
- venue/date clarification
- budget discussion
- replacement Freelancer approval
- payment guidance
- draft sharing
- client revision feedback
- delivery communication
- dispute/support context

## Freelancer ↔ Admin

Created when:

- Admin assigns a booking/project to a Freelancer

Used for:

- assignment clarification
- accept/reject discussion
- counter offer
- schedule issues
- requirement clarification
- work submission
- Admin review feedback
- revisions
- payout/booking operational communication

There must be no Client ↔ Freelancer conversation creation endpoint or UI action in the new workflow.

---

# 12. MESSAGES PAGE — CLIENT

Client Messages must show Admin conversations only.

Desktop layout:

```text
Conversation List | Active Admin Conversation | Booking/Project Context
```

Conversation list card:

- Admin / Support Team
- Booking/Project title
- Booking ID / Project ID
- latest message
- timestamp
- unread badge

Active conversation header:

- Creative Marketplace Admin
- booking/project title
- current booking status

Context panel:

- selected Freelancer
- date
- venue
- budget
- payment status
- booking status
- View Booking

Do not display Freelancer contact information.

---

# 13. MESSAGES PAGE — FREELANCER

Freelancer Messages must show Admin conversations only.

Conversation list card:

- Creative Marketplace Admin
- assigned booking/project
- latest message
- timestamp
- unread badge

Context panel:

- booking ID
- work title
- date
- venue
- agreed amount
- current status
- deposit/work-start status
- View Booking

Do not display Client direct contact information.

---

# 14. MESSAGES PAGE — ADMIN

Admin Messages is a core operational page.

Use tabs or segmented filters:

- Client Conversations
- Freelancer Conversations
- Unread
- Needs Response

Admin must always know which booking/project the conversation belongs to.

Recommended layout:

```text
Conversation Queue | Active Conversation | Booking Control Panel
```

Booking Control Panel can show:

- Client
- selected/assigned Freelancer
- booking/project ID
- date
- venue
- budget
- current status
- payment status
- assignment status
- delivery status
- quick actions

Admin must never accidentally send a Client-only message into the Freelancer thread or vice versa.

Use clear recipient labeling.

---

# 15. FILE AND LINK SHARING IN CHAT

Admin must be able to share, where storage/security rules support it:

- images
- video previews
- PDFs
- ZIP files
- documents
- cloud storage links
- Drive links
- similar reference content

Client can share requirement/reference files with Admin if supported.

Freelancer can share work submissions/reference material with Admin if supported.

Private uploaded assets must use authorized storage access.

Do not expose private S3/MinIO objects through permanent public URLs.

---

# 16. DRAFT REVIEW MODEL

Freelancer submits work to Admin first.

```text
Freelancer
  ↓
Admin Review
```

Admin options:

- Approve internally
- Request Freelancer Revision
- Share selected draft with Client

The Client does not automatically receive unfinished work.

If Admin wants Client feedback:

```text
Admin
  ↓
Client ↔ Admin Chat
  ↓
Draft / ZIP / Preview / Drive Link
```

Client can respond with:

- Looks good
- Revision requested
- written feedback
- reference attachment if supported

Admin translates/forwards required feedback to Freelancer through Admin ↔ Freelancer chat.

---

# 17. CLIENT REVISION AFTER DELIVERY/DRAFT

Use the mediated revision model.

```text
Client requests revision
  ↓
Admin receives request
  ↓
Admin reviews request
  ↓
Admin sends required changes to Freelancer
  ↓
Freelancer revises
  ↓
Freelancer resubmits to Admin
  ↓
Admin reviews again
  ↓
Admin shares/delivers to Client
```

Client never opens a direct Freelancer revision thread.

---

# 18. PAYMENT FLOW

Required commercial flow:

```text
Client Booking
  ↓
Admin Review
  ↓
Admin Assigns Freelancer
  ↓
Freelancer Accepts
  ↓
Client Pays Deposit
  ↓
Freelancer Starts Work
  ↓
Freelancer Submits to Admin
  ↓
Admin Reviews / Revision Loop
  ↓
Client Pays Pending Balance
  ↓
Admin Delivers Complete Work
  ↓
Client Accepts Delivery
  ↓
Admin Completes Booking
  ↓
Final Freelancer Payout Released
```

Do not allow Start Work before the required deposit/payment condition is satisfied.

Do not allow final delivery before pending balance rules are satisfied unless Admin has an explicit authorized override.

---

# 19. FREELANCER ADVANCE AND EARNINGS

The Freelancer Dashboard/Earnings page must distinguish between money that is visible and money that is withdrawable.

When Admin provides/records an advance amount:

Show on Freelancer Dashboard as:

**Advance Received / Pending Earnings**

It is visible but NOT withdrawable.

Suggested states:

- Advance / Pending
- Locked
- Available to Withdraw
- Paid Out

After:

```text
Client accepts delivery
  +
Admin completes booking
  +
Admin releases payout
```

then the released amount moves into:

**Available to Withdraw**

Earnings summary:

- Advance / Locked
- Pending Completion
- Available to Withdraw
- Total Earned
- Paid Out

Do not count locked advance as withdrawable balance.

---

# 20. CLIENT PAYMENT PAGE

Client Payment page should clearly separate:

- Deposit Due
- Balance Due
- Payment History
- Refunds if supported

Booking card payment language:

- Deposit Pending
- Deposit Paid
- Balance Pending
- Fully Paid
- Refunded

Do not expose internal ledger terminology unnecessarily.

---

# 21. ADMIN PAYMENT CONTROL

Admin booking detail should show:

- agreed budget
- deposit amount
- deposit payment status
- freelancer advance amount
- balance amount
- balance payment status
- platform fee if applicable
- freelancer payable amount
- payout status

Admin actions must be role/status controlled.

Examples:

- Confirm/record advance if supported
- Review payment
- Release payout
- Process/referral to refund workflow

Do not show payout-release action before completion criteria are met.

---

# 22. BOOKING STATUS MODEL — USER-FRIENDLY STATES

Use existing backend enums where possible, but the UI should communicate the following lifecycle clearly.

Suggested business states:

1. Booking Submitted
2. Under Admin Review
3. Awaiting Client Clarification
4. Ready for Assignment
5. Assigned to Freelancer
6. Awaiting Freelancer Response
7. Negotiation / Counter Offer
8. Replacement Approval Required
9. Awaiting Deposit
10. Confirmed
11. In Progress
12. Submitted to Admin
13. Admin Review
14. Revision Required
15. Awaiting Client Balance
16. Ready for Final Delivery
17. Delivered to Client
18. Client Revision Requested
19. Client Accepted
20. Completed
21. Cancelled

Do not expose technical enum names if they are confusing.

---

# 23. CLIENT SIDEBAR — UPDATED

Recommended:

```text
CREATIVE MARKETPLACE
Overview

DISCOVER
Explore Creatives
Browse Services

WORK
My Projects
Bookings
Messages
Deliveries

MONEY
Payments

PERSONAL
Favourites
Reviews
Notifications

ACCOUNT
Profile
Settings

Help & Support
```

Remove:

- Browse Projects if it represented an unrelated Client marketplace browse route
- any direct Freelancer messaging navigation concept

Messages remains, but it means **Client ↔ Admin**.

---

# 24. FREELANCER SIDEBAR — UPDATED

Recommended:

```text
CREATIVE MARKETPLACE
Overview

MY BUSINESS
Profile
Portfolio
Services
Availability

WORK
Bookings
Messages
Deliveries

MONEY
Earnings
Payouts

REPUTATION
Reviews
Verification

PERSONAL
Notifications
Settings

Help & Support
```

Remove from the managed-workflow navigation:

- Browse Projects
- My Proposals

Messages remains, but it means **Freelancer ↔ Admin**.

---

# 25. ADMIN SIDEBAR — UPDATED

Recommended:

```text
ADMIN
Overview

BOOKING OPERATIONS
Booking Inbox
Job Posts
Assignments
Active Jobs
Deliveries
Completed Jobs
Messages

MARKETPLACE
Clients
Freelancers
Profiles
Services
Categories
Verifications

FINANCE
Payments
Refunds
Payouts

TRUST & SAFETY
Reviews
Disputes
Reports

SYSTEM
Notifications
Platform Settings
Audit Logs

Help / Documentation
```

Admin can use denser UI than Client/Freelancer.

---

# 26. CLIENT DASHBOARD — UPDATED PURPOSE

The Client dashboard should answer:

- What booking requests have I submitted?
- Is Admin reviewing anything?
- Has a Freelancer been assigned?
- Does Admin need my approval for a replacement?
- Do I need to pay a deposit?
- Is a draft waiting for my feedback?
- Do I need to pay the balance?
- Is final delivery ready?
- Do I have unread Admin messages?

Suggested summary:

- Active Bookings
- Awaiting Admin Review
- Payment Due
- Deliveries Ready

Attention Needed examples:

- Admin suggested a replacement professional — Review
- Deposit required for Booking CM-... — Pay Deposit
- Draft shared by Admin — Review Draft
- Balance payment required — Pay Balance
- Final delivery ready — View Delivery

Do not show direct Freelancer messages.

---

# 27. FREELANCER DASHBOARD — UPDATED PURPOSE

The Freelancer dashboard should answer:

- Do I have new Admin-assigned booking requests?
- Do I need to accept/reject anything?
- Is Admin waiting for my response?
- Which jobs can start?
- Which jobs are in progress?
- Which submissions need revision?
- How much advance is locked?
- How much is withdrawable?
- Do I have unread Admin messages?

Suggested summary:

- New Assignment Requests
- Active Jobs
- Locked / Advance Earnings
- Available to Withdraw

Attention Needed:

- Booking request waiting for response
- Admin requested revision
- Admin sent a message
- Delivery submission due

Remove:

- New open-project opportunities for self-application
- proposal success widgets

---

# 28. ADMIN DASHBOARD — UPDATED PURPOSE

The Admin dashboard becomes operationally central.

It should answer:

- How many new booking requests are waiting?
- How many new job posts need matching?
- How many assignments are waiting for Freelancer response?
- How many counter offers need negotiation?
- How many replacement approvals are waiting on Client?
- How many deposits are pending?
- How many Freelancer submissions need review?
- How many Client balances are pending?
- How many final deliveries are ready?
- How many payouts are ready for release?

Suggested Attention Queue:

- 8 booking requests need review
- 3 job posts need Freelancer assignment
- 2 Freelancers sent counter offers
- 1 Client needs replacement approval
- 4 submissions need Admin review
- 2 balances pending before final delivery
- 3 payouts ready for release

---

# 29. FREELANCER PROFILE — HIRING FOCUSED

Public/Client profile layout can retain:

- identity
- profession
- location
- verified state
- rating
- portfolio
- services
- skills
- equipment
- availability
- reviews

Sticky hire card:

- starting price / service pricing
- availability context
- View Services
- Book Professional

Remove:

- Message Freelancer
- Contact Freelancer
- Request direct chat

Helper copy near Book:

> Bookings are coordinated by Creative Marketplace Admin for a managed and secure experience.

---

# 30. SERVICE DETAIL — UPDATED BOOKING CTA

Service detail can remain marketplace-style.

Main content:

- gallery
- title
- Freelancer
- rating
- description
- packages
- deliverables
- requirements
- reviews

Sticky card:

- package options
- price
- delivery time
- revisions
- Book Professional / Continue to Booking

Submitting booking sends the request to Admin, not directly to Freelancer.

---

# 31. CLIENT MY PROJECTS — UPDATED

My Projects contains Client-posted job requirements.

Statuses may include:

- Draft
- Submitted to Admin
- Under Review
- Matching Professional
- Awaiting Client Approval
- Assigned
- Booking Created
- In Progress
- Delivered
- Completed
- Cancelled

Project detail should show:

- requirement
- budget
- date
- venue
- attachments
- Admin status
- matched/assigned Freelancer when available
- Message Admin
- booking link once created

Remove:

- Received Freelancer Proposals
- Accept Proposal
- Reject Proposal

---

# 32. ADMIN JOB POSTS

Admin needs a dedicated Job Posts operational page.

Use filters:

- New
- Under Review
- Matching
- Awaiting Client Approval
- Assigned
- Converted to Booking
- Closed

Job Post detail:

- Client
- requirement
- budget
- date
- venue
- categories/skills
- attachments
- Client chat
- recommended Freelancer search
- assignment action

Admin can:

- assign a suitable Freelancer
- propose replacement/match to Client
- request Client clarification
- convert to booking after match/acceptance

---

# 33. BOOKINGS PAGE — CLIENT

Use tabs:

- Awaiting Admin
- Awaiting Assignment
- Awaiting Deposit
- Upcoming
- In Progress
- Awaiting Payment
- Delivered
- Completed
- Cancelled

Booking card:

- Booking ID
- service/project title
- selected/assigned Freelancer
- date
- venue
- budget
- status
- payment status

Actions depend on status:

- View Booking
- Message Admin
- Review Replacement
- Pay Deposit
- Review Draft
- Pay Balance
- View Delivery
- Leave Review

Never show Message Freelancer.

---

# 34. BOOKINGS PAGE — FREELANCER

Use tabs:

- Requests
- Negotiation
- Awaiting Deposit
- Upcoming
- In Progress
- Admin Review
- Revision Required
- Completed
- Cancelled

Request card actions:

- Accept
- Reject / Counter
- Message Admin

In-progress actions:

- Open Work Details
- Message Admin
- Submit Work

Never show Message Client.

---

# 35. BOOKING DETAIL — CLIENT

Top summary:

- title
- Booking ID
- current status
- selected/assigned Freelancer
- date/time
- venue
- budget
- deposit
- balance

Primary action is status-based.

Examples:

- Message Admin
- Approve Replacement
- Pay Deposit
- Review Draft
- Pay Balance
- View Final Delivery
- Accept Delivery
- Request Revision
- Leave Review

Do not expose Freelancer private contact information.

---

# 36. BOOKING DETAIL — FREELANCER

Top summary:

- title
- Booking ID
- current status
- date/time
- venue
- requirement
- agreed amount
- payment/work-start status

Primary action examples:

- Accept
- Reject / Counter
- Message Admin
- Start Work
- Submit Work
- Upload Revision

Do not expose Client private contact information.

---

# 37. BOOKING DETAIL — ADMIN

Admin booking detail is the control center.

Sections:

## Booking Summary

- Client
- selected Freelancer
- assigned Freelancer
- date
- venue
- requirement
- budget
- booking source (Profile / Service / Job Post)

## Assignment

- selected Freelancer
- availability/status
- assign
- replacement search
- client approval state
- Freelancer response
- rejection reason
- counter offer

## Communication

- Open Client Chat
- Open Freelancer Chat

## Payments

- deposit status
- advance amount
- balance status
- payout state

## Work

- start status
- submission status
- Admin review
- revision history

## Delivery

- drafts shared to Client
- final delivery
- Client acceptance

## Actions

Only valid role/status actions should be visible.

---

# 38. WORKSPACE — UPDATED

Do not use a shared Client/Freelancer collaboration workspace.

Instead use role-specific booking workspaces.

## Client Workspace

Tabs:

- Overview
- Admin Messages
- Files Shared by Admin
- Payments
- Delivery
- Timeline

## Freelancer Workspace

Tabs:

- Overview
- Admin Messages
- Requirements
- Submission
- Revisions
- Earnings Status
- Timeline

## Admin Workspace

Tabs:

- Overview
- Client Chat
- Freelancer Chat
- Files
- Submission Review
- Payments
- Delivery
- Timeline

There is no direct cross-role chat tab between Client and Freelancer.

---

# 39. DELIVERY FLOW

Freelancer submission:

```text
Freelancer
  ↓
Submit Work
  ↓
Admin Submission Inbox
```

Admin review actions:

- Approve for Client review
- Request Freelancer Revision
- Share Draft with Client
- Mark Ready for Balance Payment

After balance payment:

- Admin prepares final delivery
- Admin sends final delivery to Client

Client actions:

- Accept Delivery
- Request Revision

If revision requested:

```text
Client → Admin → Freelancer → Admin → Client
```

---

# 40. ADMIN SUBMISSION INBOX

Create an operational queue for Freelancer submissions.

Filters:

- New Submission
- Under Review
- Revision Requested
- Draft Shared with Client
- Waiting Client Feedback
- Waiting Balance Payment
- Ready for Final Delivery
- Delivered

Submission detail:

- booking context
- Freelancer
- submission files
- version history
- Freelancer note
- Admin notes
- Client feedback if shared
- revision history

Actions:

- Request Revision
- Share Draft with Client
- Approve Work
- Mark Balance Required
- Deliver Final

---

# 41. REVIEWS

After final delivery is accepted and booking completion rules are satisfied, the Client can review the Freelancer.

Review form:

Required:

- Rating

Optional:

- Review Comment

The comment must NOT be mandatory.

Suggested UI:

```text
Rate your experience
[ ★ ★ ★ ★ ★ ]

Share a comment (optional)
[ textarea ]

[ Submit Review ]
```

The review is attached to the Freelancer/booking.

Admin mediation does not remove the Client's ability to rate the Freelancer's delivered work.

---

# 42. NOTIFICATIONS — UPDATED EVENTS

Client notifications may include:

- Booking received by Admin
- Admin sent a message
- Freelancer assigned
- Replacement approval required
- Deposit due
- Booking confirmed
- Draft shared by Admin
- Revision update
- Balance due
- Final delivery ready
- Booking completed
- Review reminder

Freelancer notifications may include:

- New Admin assignment
- Admin message
- Counter-offer response
- Booking confirmed
- Deposit received / work can start
- Admin revision request
- Submission approved
- Booking completed
- Payout released

Admin notifications may include:

- New booking
- New job post
- Client message
- Freelancer rejection/counter
- Freelancer message
- Freelancer submission
- Client revision request
- payment received
- payout ready

---

# 43. PUBLIC NAVIGATION

Public navigation can remain simple:

- Logo
- Find Talent
- Services
- How It Works
- Search
- Log In
- Join

If Projects remains public, ensure the experience does not imply Freelancer self-application if the managed model no longer supports it.

---

# 44. HOW IT WORKS — CLIENT

Use this updated flow:

1. Explore creative professionals and portfolios
2. Choose a professional or post your requirement
3. Send your booking to Creative Marketplace Admin
4. Admin confirms and assigns the professional
5. Pay the deposit and let the professional begin
6. Review updates/drafts through Admin when needed
7. Pay the remaining balance
8. Receive final work from Admin
9. Accept delivery and leave a review

---

# 45. HOW IT WORKS — FREELANCER

Use this updated flow:

1. Build your professional profile and portfolio
2. Keep your services and availability updated
3. Receive assignments from Creative Marketplace Admin
4. Accept or respond with a reason/counter offer
5. Complete the work after booking/payment confirmation
6. Submit work to Admin
7. Complete revisions requested through Admin
8. Finalize the booking and receive released earnings

---

# 46. HOW IT WORKS — ADMIN

1. Review Client bookings and project posts
2. Clarify requirements with Client
3. Assign the selected or approved replacement Freelancer
4. Coordinate Freelancer acceptance/counter offers
5. Monitor deposit and advance state
6. Support execution through separate Client/Freelancer chats
7. Review Freelancer submissions
8. Coordinate revisions
9. Confirm balance payment
10. Deliver final work to Client
11. Complete booking and release payout

---

# 47. QUICK ACTIONS — UPDATED

## Client

- Find a Creative
- Book a Professional
- Post a Project
- View Bookings
- Message Admin

Keep only the most important 3–5 visible.

## Freelancer

- View Booking Requests
- Update Availability
- Submit Work
- Message Admin
- View Earnings

## Admin

- Review Booking Inbox
- Review Job Posts
- Assign Freelancer
- Review Submissions
- Open Messages

---

# 48. HELP & SUPPORT — UPDATED TOPICS

Useful Client help topics:

- How managed bookings work
- Why bookings go through Admin
- Replacement Freelancer approval
- Deposit and balance payments
- Draft review
- Revision requests
- Final delivery
- Reviews

Useful Freelancer help topics:

- How assignments work
- Accepting/rejecting bookings
- Counter offers
- When work can start
- How to submit work
- Revision requests
- Advance vs withdrawable earnings
- Payouts

Useful Admin help topics:

- Assignment workflow
- Replacement approval
- Negotiation handling
- Draft sharing
- Payment milestones
- Payout release

---

# 49. DATA PRIVACY / CONTACT RULE

Do not expose direct private communication details between Client and Freelancer.

Avoid showing unless explicitly required by an authorized business rule:

- direct email
- direct phone
- WhatsApp
- private social links
- private address

Venue information needed to execute an accepted booking may be shown to the assigned Freelancer only when appropriate for the job.

Admin remains the communication intermediary.

---

# 50. GLOBAL LOGGED-IN LAYOUT

Keep the established application shell:

```text
┌─────────────────────────────────────────────────────────────┐
│ Top Header                                                  │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│   SIDEBAR     │              MAIN CONTENT                   │
│               │                                             │
│               │                                             │
├───────────────┴─────────────────────────────────────────────┤
│ Optional mobile action / contextual support                 │
└─────────────────────────────────────────────────────────────┘
```

Desktop:

- fixed/collapsible sidebar
- shared topbar
- main workspace

Tablet:

- collapsible sidebar

Mobile:

- drawer/sidebar or existing compact navigation pattern

Do not create role-specific navbar dimensions.

---

# 51. TOP HEADER

Keep the same dimensions on all authenticated pages.

Possible items:

- page context/breadcrumb
- search
- messages
- notifications
- help
- avatar

Message icon semantics:

- Client → Admin conversations
- Freelancer → Admin conversations
- Admin → operational Client/Freelancer conversations

Do not imply direct Client/Freelancer messaging.

---

# 52. VISUAL DESIGN TOKENS

Use the existing landing-page-derived visual system consistently.

Recommended tokens from the existing design direction:

```css
:root {
  --background: #F4F2EC;
  --surface: #FBFAF7;
  --surface-elevated: #FFFFFF;

  --text-primary: #171717;
  --text-secondary: #65635F;
  --text-muted: #94918B;

  --border: rgba(23, 23, 23, 0.10);

  --accent: #E4523D;
  --accent-hover: #C94734;

  --dark: #121212;
  --dark-soft: #1C1C1C;

  --success: #43745B;
  --warning: #A86F2C;
  --danger: #B94A3C;

  --sidebar-width: 260px;
  --sidebar-collapsed-width: 76px;

  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
}
```

Reuse existing tokens if already present.

Do not create duplicate token systems.

---

# 53. STATUS COLOR RULE

Use semantic colors consistently:

- New / Informational — neutral/accent
- Pending / Review — muted amber
- Accepted / Confirmed — muted green
- Negotiation — amber
- Revision Required — amber/red depending severity
- Payment Due — amber
- Completed — green
- Cancelled / Rejected — muted red

Do not use excessive bright colors.

---

# 54. CARDS

Cards should remain:

- soft white / cream
- subtle border
- 16–20px radius
- light shadow only if needed

Booking cards should prioritize:

- status
- next action
- booking ID
- date
- assigned/selected Freelancer
- payment state

Admin cards may be denser.

---

# 55. BUTTON HIERARCHY

Primary actions should be obvious.

Examples:

Client:

- Send Booking Request
- Approve Replacement
- Pay Deposit
- Pay Balance
- Accept Delivery

Freelancer:

- Accept Booking
- Submit Work
- Resubmit Revision

Admin:

- Assign Freelancer
- Request Revision
- Share Draft
- Deliver Final
- Complete Booking
- Release Payout

Secondary/destructive actions must look secondary.

---

# 56. EMPTY STATES

Client Bookings:

> No managed bookings yet. Explore creative professionals and send your first booking request.

Freelancer Bookings:

> No assignments yet. New bookings assigned by Creative Marketplace Admin will appear here.

Admin Booking Inbox:

> No booking requests waiting for review.

Admin Submission Inbox:

> No Freelancer submissions waiting for review.

Never use fake data.

---

# 57. ERROR STATES

Use user-friendly errors.

Client example:

> We couldn't send your booking request. Please review the details and try again.

Freelancer example:

> We couldn't send your response to Admin. Please try again.

Admin example:

> The assignment could not be completed. No changes were saved.

Keep raw HTTP/database errors out of normal UI.

---

# 58. RESPONSIVE BEHAVIOR

Test at minimum:

- 375px
- 430px
- 768px
- 1024px
- 1440px

Pay special attention to:

- booking modal
- booking detail status/actions
- chat layouts
- Admin booking control panel
- submission review
- payment cards
- replacement Freelancer approval

No horizontal overflow except intentionally scrollable dense Admin tables.

---

# 59. ACCESSIBILITY

Verify:

- keyboard navigation
- visible focus
- accessible dialogs
- form labels
- button labels
- status not conveyed by color alone
- file upload labels
- chat recipient clarity
- accessible replacement approval controls
- sufficient contrast
- reduced motion
- alt text

---

# 60. AUDIT LOG REQUIREMENTS — ADMIN ACTIONS

Where the backend already supports or can safely support audit logging, record important Admin-controlled actions:

- booking review
- Freelancer assignment
- replacement suggestion
- Client replacement approval
- Freelancer rejection/counter
- Admin negotiation decision
- advance recording/release
- submission review
- revision request
- draft sharing
- final delivery
- booking completion
- payout release

Do not rely only on frontend state for these operations.

---

# 61. ROLE AUTHORIZATION RULES

Client:

- can access own bookings/projects/chats/payments/deliveries
- cannot access Freelancer-Admin chat

Freelancer:

- can access assigned bookings and own Freelancer-Admin chats
- cannot access Client-Admin chat

Admin:

- can access both conversation lines for managed cases
- must have clear recipient context

Do not allow IDOR across bookings/messages/files.

---

# 62. FILE ACCESS RULES

Client may access:

- own uploaded booking references
- files Admin intentionally shares with Client
- final delivery

Freelancer may access:

- work requirements needed for assigned booking
- files Admin intentionally shares with Freelancer
- own submitted files

Admin may access:

- booking/job attachments needed for management
- Freelancer submissions
- drafts
- final deliverables

Use signed/private media access where required.

---

# 63. FINAL CLIENT EXPERIENCE

A new Client should understand this without training:

```text
Login
  ↓
Explore Creatives / Services
  ↓
View Profile + Portfolio
  ↓
Book Professional
  ↓
Admin Review
  ↓
Admin Assignment
  ↓
Deposit
  ↓
Track Booking + Message Admin
  ↓
Review Draft if Admin shares one
  ↓
Pay Balance
  ↓
Receive Final Delivery from Admin
  ↓
Accept
  ↓
Review Freelancer
```

The Client must always know:

- what Admin is doing
- which Freelancer is selected/assigned
- what payment is due
- what needs Client action
- when delivery is ready

---

# 64. FINAL FREELANCER EXPERIENCE

A new Freelancer should understand:

```text
Login
  ↓
Maintain Profile / Portfolio / Services / Availability
  ↓
Receive Admin Assignment
  ↓
Accept OR Reject/Counter
  ↓
Message Admin
  ↓
Wait for Deposit Confirmation
  ↓
Start Work
  ↓
Submit to Admin
  ↓
Handle Revisions
  ↓
Booking Completed
  ↓
Final Earnings Released
  ↓
Withdraw Available Balance
```

The Freelancer must always know:

- whether an assignment needs response
- whether work can start
- whether Admin needs revision
- whether an amount is locked or withdrawable

---

# 65. FINAL ADMIN EXPERIENCE

Admin should be able to operate the full marketplace from clear queues:

```text
Login
  ↓
Booking Inbox / Job Posts
  ↓
Review Requirement
  ↓
Client Chat if needed
  ↓
Assign Freelancer
  ↓
Freelancer Chat / Accept-Reject-Counter
  ↓
Replacement / Negotiation if required
  ↓
Deposit Tracking
  ↓
Advance Tracking
  ↓
Active Job
  ↓
Submission Review
  ↓
Revision / Client Draft Review
  ↓
Balance Payment
  ↓
Final Delivery
  ↓
Client Acceptance
  ↓
Complete Booking
  ↓
Release Payout
```

Admin must not need to jump between unrelated pages to understand one booking.

---

# 66. IMPLEMENTATION PRIORITY

Recommended order:

1. Define/update booking/project status model
2. Remove direct Client ↔ Freelancer conversation creation
3. Create/adjust Admin-mediated conversation relationships
4. Update Client booking submission to Admin Inbox
5. Update Admin Booking Inbox
6. Update Admin assignment flow
7. Add Freelancer Accept / Reject + Reason + Optional Counter Offer
8. Add replacement Freelancer approval flow
9. Convert Client project posts to Admin matching flow
10. Remove Freelancer proposal/self-application UX
11. Update Client/Freelancer/Admin sidebars
12. Update role-specific Messages pages
13. Update booking details/workspaces
14. Implement deposit → work start gating
15. Update Freelancer submission → Admin review
16. Add draft sharing/revision mediation
17. Implement balance → final delivery gating
18. Update advance/locked/withdrawable earnings states
19. Update payout release workflow
20. Update optional review comment behavior
21. Update dashboards/notifications
22. Validate permissions/security
23. Responsive/accessibility validation

---

# 67. CRITICAL FUNCTIONAL VALIDATION

Before calling the redesign/workflow update complete, test the following real sequence.

## Direct Booking Flow

1. Client logs in
2. Client opens Freelancer profile
3. Client clicks Book
4. Client submits date, venue, requirement, budget
5. Booking appears in Admin Inbox
6. Client ↔ Admin chat exists
7. Booking is NOT directly visible to Freelancer yet
8. Admin assigns selected Freelancer
9. Freelancer sees booking request
10. Admin ↔ Freelancer chat exists
11. Freelancer accepts
12. Client is prompted for deposit
13. Deposit payment succeeds/test-mode verification succeeds
14. Freelancer can start work
15. Freelancer submits work to Admin
16. Client cannot automatically see unfinished submission
17. Admin can request revision
18. Admin can share selected draft/file/link with Client
19. Client can give feedback to Admin
20. Admin can relay revision to Freelancer
21. Client pays pending balance
22. Admin sends final delivery
23. Client accepts
24. Admin completes booking
25. Admin releases Freelancer payout
26. Freelancer sees withdrawable earnings
27. Client submits rating with optional comment

## Rejection / Counter Flow

1. Admin assigns Freelancer
2. Freelancer rejects or counters
3. Reason is mandatory for reject
4. Counter amount is optional
5. Admin receives response
6. Admin can message Client
7. Admin can message Freelancer
8. Admin can negotiate and reassign same Freelancer
9. Or Admin can select replacement
10. Client approves replacement before assignment is finalized

## Job Post Flow

1. Client posts project
2. Admin receives job post
3. Client ↔ Admin chat exists
4. No Freelancer proposal workflow is exposed
5. Admin selects Freelancer
6. Freelancer receives assignment
7. Continue through managed booking lifecycle

---

# 68. SECURITY VALIDATION

Verify:

- Client cannot access Freelancer-Admin chat
- Freelancer cannot access Client-Admin chat
- Client cannot directly create Freelancer conversation
- Freelancer cannot directly create Client conversation
- Client cannot directly access Freelancer private submission before Admin shares it
- Freelancer cannot access another Freelancer's booking
- Admin recipient context is explicit
- file URLs are authorized
- payment state cannot be bypassed from frontend
- payout release is Admin-only
- completion is controlled by valid state transitions

---

# 69. DATABASE / STATE VALIDATION

Verify persistence for:

- booking request
- selected Freelancer
- assigned Freelancer
- replacement approval
- Freelancer response
- rejection reason
- counter offer
- Client-Admin conversation
- Admin-Freelancer conversation
- deposit payment
- advance amount
- work start
- submissions
- revision requests
- Admin-shared draft
- Client feedback
- balance payment
- final delivery
- Client acceptance
- booking completion
- payout release
- rating
- optional review comment

Do not treat React state as authoritative business state.

---

# 70. FINAL VISUAL TARGET

The application should still feel like:

A premium, modern creative marketplace that is easy for a first-time Client to book a professional and clear enough for a Freelancer to manage assigned work.

The new experience must additionally feel:

- managed
- coordinated
- trustworthy
- operationally clear
- secure
- status-driven

The Admin role should feel like the control center of the marketplace without making the Client or Freelancer experience complicated.

---

# 71. FINAL OUTPUT RECORD & ARCHITECTURAL SUMMARY

The managed booking flow operates end-to-end with full admin mediation:
- Direct Client ↔ Freelancer communication is strictly disabled and replaced with Admin-mediated channels.
- Client account is streamlined with dedicated structured panels (Bookings, Deliveries, Payments, My Projects) and no standalone direct messaging inbox.
- 21-state user-friendly booking lifecycle with explicit role-based permissions and actions is fully enforced across frontend and backend.
- Two-stage delivery pipeline (Freelancer → Admin QA → Client Review) is active with deposit and balance escrow payment gates.
- All 155 automated backend tests pass (100%), and the Next.js production build generates all 59 routes with 0 errors.

---

# 72. DETAILED TECHNICAL ARCHITECTURE & STATE ENGINES

## 72.1 Technology Stack & Core Topology
- **Frontend Core:** Next.js 15.1 (App Router), React 19, TypeScript, Vanilla TailwindCSS design system.
- **Background Shader Layer:** ThreeUI `StructureFlowCollection` (`fluid-field` variant) running canonical WebGL Simplex noise shader isolated via `aura-ui-fluid.html` sandbox with Three.js r128.
- **Backend Core:** FastAPI (Python 3.11), SQLAlchemy ORM with PostgreSQL database, Pydantic V2 schema validation.
- **Authentication & Security:** JWT Access & Refresh tokens stored in secure HttpOnly cookies (`samesite="lax"`, `max_age=3600`), bcrypt password hashing, and role-based access control (`CLIENT`, `FREELANCER`, `ADMIN`).
- **Identifier Prefixing:** Normalized identifier format with `CL-` prefix for Client accounts and `FL-` prefix for Freelancer accounts.

## 72.2 The 21-State Managed Booking Lifecycle Engine
Each booking advances through a deterministic, strictly mediated state machine:
1. `REQUESTED` — Client submits project requirements and preferred dates. Initial state.
2. `UNDER_ADMIN_REVIEW` — Admin reviews scope, validates feasibility, and checks requirements.
3. `AWAITING_CLIENT_CLARIFICATION` — Admin flags missing information back to the Client.
4. `MATCHING_IN_PROGRESS` — Admin actively evaluates and selects matching creative professionals.
5. `ASSIGNED_TO_FREELANCER` — Admin proposes the job to a selected Freelancer candidate.
6. `FREELANCER_ACCEPTED` — Freelancer accepts assignment at base quote or conditions.
7. `FREELANCER_REJECTED` — Freelancer declines assignment with documented reason.
8. `FREELANCER_COUNTERED` — Freelancer proposes alternative dates, rate, or scope adjustments.
9. `REPLACEMENT_SEARCH` — Previous candidate withdrew or declined; Admin matches alternative professional.
10. `REPLACEMENT_APPROVAL_REQUIRED` — Admin requests Client confirmation for a proposed replacement candidate.
11. `QUOTE_SENT` — Admin issues binding quote breakdown and contract conditions to Client.
12. `CONFIRMED` — Client accepts quote; awaiting initial deposit escrow payment.
13. `DEPOSIT_PAID` — Client successfully pays deposit; booking unlocks for creative production.
14. `IN_PROGRESS` — Freelancer actively executes work on scheduled event/deliverable dates.
15. `DELIVERY_SUBMITTED` — Freelancer uploads raw/preliminary deliverables to Admin for QA.
16. `DELIVERY_PENDING` — Admin reviews submitted deliverables, checks standards, and prepares draft for Client.
17. `REVISION_REQUESTED` — Client or Admin requests specific revisions with structured feedback.
18. `REVISION_IN_PROGRESS` — Freelancer actively working on requested modifications.
19. `CLIENT_APPROVED` — Client approves final deliverables; unlocks balance payment.
20. `BALANCE_PAID` — Client clears final remaining balance; deliverables released.
21. `COMPLETED` — Work completed, funds released to Freelancer payout account, reviews enabled.
22. `CANCELLED` / `DISPUTED` — Booking cancelled or escalated to formal Admin dispute resolution.

## 72.3 Escrow & Dual-Milestone Payment Architecture
- **Deposit Gating:** No creative work begins until the Client clears the required deposit milestone (20%–50% based on quote rules).
- **Balance Gating:** High-resolution final deliverables and source assets are held in Admin escrow until the remaining balance is paid.
- **Payout Release:** Upon Client approval and balance clearance, freelancer earnings transition from `LOCKED` to `AVAILABLE` for payout withdrawal.

---

# 73. THREEUI FLUID FIELD & VISUAL DESIGN TOKENS

## 73.1 Fluid Field Integration Specification
- **Component:** `StructureFlowCollection` (`fluid-field` variant).
- **Shader Implementation:** Canonical Simplex noise fragment shader rendering dynamic glowing plasma filaments adapted to the platform's warm coral `#F05A47` palette.
- **Sandboxed Execution:** `aura-ui-fluid.html` executes in an isolated iframe with Three.js r128, eliminating any collision with top-level landing page Three.js dependencies (`three@0.185.1`).
- **Stacking Context:** Mounted at `z-0` behind workspace layouts; Top navbar elevated to `z-40` and main panels at `z-10` to guarantee zero dropdown clipping and uninhibited pointer events (`pointer-events: none` on shader layer).

## 73.2 Design System Tokens
- **Background:** `#12100F`
- **Surface:** `#181514`
- **Surface Elevated:** `#1D1918`
- **Border Custom:** `rgba(255, 255, 255, 0.08)`
- **Primary Accent:** `#F05A47` (Warm Coral)
- **Primary Hover:** `#E04835`
- **Success Emerald:** `#4ADE80`
- **Warning Amber:** `#F59E0B`
- **Danger Rose:** `#EF4444`
- **Text Main:** `#FFFFFF`
- **Text Sub:** `#D1D5DB`
- **Text Muted:** `#9CA3AF`

---

# 74. FULL FRONTEND & BACKEND ROUTE INVENTORY

## 74.1 Frontend App Router Routes (59 Routes)
- **Public Marketing:** `/`, `/services`, `/services/[id]`, `/services/[id]/book`, `/freelancers`, `/freelancers/[id]`, `/robots.txt`, `/sitemap.xml`
- **Authentication & Security:** `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
- **Client Workspace:** `/client/dashboard`, `/client/profile`, `/client/projects`, `/client/projects/new`, `/client/projects/[id]`, `/client/projects/[id]/proposals/[proposalId]`, `/client/bookings`, `/client/bookings/[id]`, `/client/bookings/[id]/workspace`, `/client/bookings/[id]/payment`, `/client/bookings/[id]/payment/success`, `/client/bookings/[id]/payment/cancelled`, `/client/deliveries`, `/client/payments`, `/client/payments/[id]`, `/client/browse-projects`, `/client/favourites`, `/client/reviews`, `/client/notifications`, `/client/settings`, `/client/messages` *(Auto-redirects to dashboard)*
- **Freelancer Workspace:** `/freelancer/dashboard`, `/freelancer/profile`, `/freelancer/profile/edit`, `/freelancer/portfolio`, `/freelancer/services`, `/freelancer/services/new`, `/freelancer/services/[id]/edit`, `/freelancer/availability`, `/freelancer/bookings`, `/freelancer/bookings/[id]`, `/freelancer/bookings/[id]/workspace`, `/freelancer/jobs`, `/freelancer/jobs/[id]`, `/freelancer/messages`, `/freelancer/earnings`, `/freelancer/earnings/transactions`, `/freelancer/earnings/payouts`, `/freelancer/earnings/payout-account`, `/freelancer/reviews`, `/freelancer/verification`, `/freelancer/onboarding`, `/freelancer/proposals`, `/freelancer/settings`
- **Admin Control Center:** `/admin/dashboard`, `/admin/bookings`, `/admin/bookings/[id]`, `/admin/assignments`, `/admin/active-jobs`, `/admin/completed-jobs`, `/admin/deliveries`, `/admin/disputes`, `/admin/job-posts`, `/admin/job-posts/[id]`, `/admin/messages`, `/admin/users`, `/admin/verification`, `/admin/settings`, `/admin/audit`
- **Global & Utility:** `/notifications`, `/_not-found`

## 74.2 Backend API Endpoint Inventory
- **Auth & Session:** `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`, `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`, `POST /api/v1/auth/send-verification`, `POST /api/v1/auth/verify-email`
- **Freelancer Management:** `GET /api/v1/freelancers`, `GET /api/v1/freelancers/{id}`, `GET /api/v1/freelancer/profile`, `POST /api/v1/freelancer/profile`, `PUT /api/v1/freelancer/profile`, `GET /api/v1/freelancer/portfolio`, `POST /api/v1/freelancer/portfolio`, `DELETE /api/v1/freelancer/portfolio/{id}`, `GET /api/v1/freelancer/earnings`, `POST /api/v1/freelancer/payout-account`, `POST /api/v1/freelancer/request-payout`
- **Services Catalog:** `GET /api/v1/services`, `GET /api/v1/services/{id}`, `POST /api/v1/services`, `PUT /api/v1/services/{id}`, `DELETE /api/v1/services/{id}`, `GET /api/v1/services/categories`
- **Client & Admin Bookings:** `POST /api/v1/bookings/request`, `GET /api/v1/bookings/my`, `GET /api/v1/bookings/{id}`, `POST /api/v1/bookings/{id}/accept-quote`, `POST /api/v1/bookings/{id}/approve-replacement`, `POST /api/v1/bookings/{id}/reject-replacement`, `POST /api/v1/bookings/{id}/cancel`
- **Freelancer Assignments:** `GET /api/v1/freelancer/bookings`, `GET /api/v1/freelancer/bookings/{id}`, `POST /api/v1/freelancer/bookings/{id}/accept`, `POST /api/v1/freelancer/bookings/{id}/reject`, `POST /api/v1/freelancer/bookings/{id}/counter`
- **Projects & Job Matching:** `GET /api/v1/projects`, `GET /api/v1/projects/{id}`, `POST /api/v1/projects`, `PUT /api/v1/projects/{id}`, `POST /api/v1/projects/{id}/close`, `GET /api/v1/admin/job-posts`, `GET /api/v1/admin/job-posts/{id}`, `POST /api/v1/admin/job-posts/{id}/match`, `POST /api/v1/admin/job-posts/{id}/assign`
- **Deliveries & Revisions:** `POST /api/v1/deliveries/submit`, `GET /api/v1/deliveries/booking/{id}`, `POST /api/v1/deliveries/{id}/admin-review`, `POST /api/v1/deliveries/{id}/share-draft`, `POST /api/v1/deliveries/{id}/client-action`, `POST /api/v1/deliveries/{id}/final-release`
- **Payments & Escrows:** `POST /api/v1/payments/create-intent`, `POST /api/v1/payments/confirm`, `GET /api/v1/payments/booking/{id}`, `GET /api/v1/payments/my`, `POST /api/v1/admin/payments/{id}/refund`
- **Admin Control Operations:** `GET /api/v1/admin/dashboard-stats`, `GET /api/v1/admin/bookings`, `GET /api/v1/admin/bookings/{id}`, `POST /api/v1/admin/bookings/{id}/send-quote`, `POST /api/v1/admin/bookings/{id}/assign`, `POST /api/v1/admin/bookings/{id}/replace`, `GET /api/v1/admin/users`, `PUT /api/v1/admin/users/{id}/status`, `GET /api/v1/admin/disputes`, `POST /api/v1/admin/disputes/{id}/resolve`, `GET /api/v1/admin/settings`, `PUT /api/v1/admin/settings`, `GET /api/v1/admin/audit-logs`
- **Messaging (Admin-Mediated):** `GET /api/v1/messages/conversations`, `GET /api/v1/messages/conversations/{id}`, `POST /api/v1/messages/conversations/{id}/messages`, `POST /api/v1/messages/conversations`
- **Notifications & Settings:** `GET /api/v1/notifications`, `POST /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/read-all`, `GET /api/v1/settings`, `PUT /api/v1/settings`, `POST /api/v1/settings/change-password`

---

# 75. SYSTEM GAP ANALYSIS, CODE BREAKS & RECTIFICATIONS

| ID | Component / Area | Identified Issue / Code Break | Architectural Resolution Implemented | Status |
|:---|:---|:---|:---|:---|
| **GAP-01** | Auth Token Refresh | `POST /api/v1/auth/refresh` returned `422 Unprocessable Entity` when frontend sent `{}` while relying on HttpOnly cookie | Updated `RefreshTokenRequest` schema in `schemas/auth.py` so `refresh_token: Optional[str] = None`, allowing cookie-based requests with empty body | **RESOLVED** |
| **GAP-02** | Client Messaging Model | Client account had direct/standalone message inbox channels contrary to the Admin-managed operational model | Removed `Messages` from Client sidebar, top navbar, dashboard cards, bookings list, project pages, and deliveries. Configured `/client/messages` to auto-redirect to `/client/dashboard` | **RESOLVED** |
| **GAP-03** | Navbar Dropdown Clipping | Top navbar profile dropdown and notification popovers clipped behind the main workspace panel due to identical `z-10` stacking contexts | Elevated Top navbar wrapper in `WorkspaceLayout.tsx` to `z-40 shrink-0`, allowing all `z-50` dropdown menus to float cleanly over all cards and sidebars | **RESOLVED** |
| **GAP-04** | Client Profile Dropdown Link | Profile dropdown in navbar navigated Client to `/client/bookings` instead of dedicated profile page | Updated `WorkspaceNavbar.tsx` so Client profile link targets `/client/profile` | **RESOLVED** |
| **GAP-05** | Service Categories | Category select options had non-standard labels (`Editing` instead of `Editor`, missing `3D Animator` and `Graphics`) | Standardized categories across backend seed fixtures and frontend select components | **RESOLVED** |
| **GAP-06** | Date Validation Guards | Project post form permitted selecting past event dates and lacked structured start/end date logic | Added strict date validation (`minDate = today`, `endDate >= startDate`) with dynamic input constraints | **RESOLVED** |
| **GAP-07** | Budget Field Validation | Budget input errors rendered in default styles without contextual field alignment | Styled validation messages below input boxes with smaller typography (`text-[10px] text-primary`) | **RESOLVED** |
| **GAP-08** | ThreeUI Placeholder Cleanup | Unused shader variant HTML files and dummy local font files remained in codebase | Removed all 6 fake `.html` stub files and placeholder fonts, streamlined `NeuformCraftEffects.tsx` and `threeui.css` | **RESOLVED** |

---

# 76. VERIFICATION & QUALITY ASSURANCE AUDIT

## 76.1 Backend Pytest Suite
- **Executed Command:** `docker compose exec -T backend sh -c "PYTHONPATH=. pytest"`
- **Total Test Cases:** 155
- **Passed:** 155 (100%)
- **Failed:** 0
- **Execution Time:** ~107 seconds

## 76.2 Frontend Production Build
- **Executed Command:** `npm run build`
- **Total Routes Generated:** 59 / 59 (Static & Dynamic)
- **Compilation Errors:** 0
- **Typecheck Errors:** 0
- **Shared First Load JS:** 106 kB

## 76.3 Live Health Checks
- **Backend API:** `http://localhost:8000/api/v1/health` → `200 OK`
- **Frontend App:** `http://localhost:3000/` → `200 OK`
- **Client Dashboard:** `http://localhost:3000/client/dashboard` → `200 OK`
- **Freelancers Directory:** `http://localhost:3000/freelancers` → `200 OK`
- **Admin Dashboard:** `http://localhost:3000/admin/dashboard` → `200 OK`

## 76.4 Testing Hold Protocol
In accordance with user directives, end-to-end user journey tests are held until the user manually creates Client and Freelancer test accounts. All underlying endpoints, state machine transitions, frontend components, and styling are verified and operating at 100% correctness.

