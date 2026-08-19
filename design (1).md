Creative Marketplace — User-Friendly Freelancing UI/UX Design System

Purpose

This document defines the UI/UX redesign for the existing Creative Marketplace application for:

Photographers

Videographers

Video Editors

Photo Editors

Cinematographers

Drone Operators

Motion Graphics Artists

Other creative professionals

The product must clearly feel like a professional freelancing marketplace, not only a portfolio/marketing website.

The UI may take premium visual inspiration from:
https://www.luminouslabs.health/redgevity-master

However, the logged-in product experience must prioritize:

ease of navigation

freelancing workflows

clear dashboards

role-based sidebars

discoverability

fast access to projects, bookings, messages and earnings

visible help/support

minimal confusion for first-time users

1. ABSOLUTE RULE — DO NOT CHANGE FUNCTIONALITY

This task is UI/UX redesign only.

Do NOT change:

existing backend logic

FastAPI APIs

database behavior

authentication behavior

role permissions

project workflows

proposal workflows

booking workflows

payment logic

commission logic

payout logic

review logic

notification logic

admin permissions

freelancer verification logic

existing routes unless a visual navigation link needs to point to the already existing route

Do NOT delete or rename any feature.

Do NOT replace real API data with mock data.

Do NOT create a second version of existing functionality.

Keep every existing function and feature working exactly as before.

2. MAIN DESIGN GOAL

The platform should feel like:

A modern professional freelancing marketplace for creative work.

The user should immediately understand:

where they are

what they can do

what requires attention

how to navigate

how to hire

how to find work

how to manage bookings

how to communicate

how to get help

The product should combine:

Premium creative appearance
+
Freelancing marketplace usability
+
Simple dashboard navigation
+
Strong portfolio presentation
+
Clear business actions

3. PUBLIC WEBSITE VS LOGGED-IN PRODUCT

Do NOT use the same layout everywhere.

Public Website

The public marketplace may use:

large editorial headings

strong imagery

cinematic sections

large portfolio visuals

spacious design

premium animation

Logged-In Client/Freelancer/Admin Areas

Use:

Sidebar
+
Topbar
+
Main Workspace
+
Contextual Help

Logged-in screens must prioritize usability over cinematic presentation.

Do not put huge marketing hero sections inside dashboards.

4. GLOBAL LOGGED-IN LAYOUT

Use the following structure:

┌─────────────────────────────────────────────────────────────┐
│ Top Header                                                  │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│   SIDEBAR     │              MAIN CONTENT                   │
│               │                                             │
│               │                                             │
│               │                                             │
│               │                                             │
├───────────────┴─────────────────────────────────────────────┤
│ Optional mobile bottom action / contextual support          │
└─────────────────────────────────────────────────────────────┘

Desktop:

Fixed/collapsible sidebar
+
main content

Tablet:

Collapsible sidebar

Mobile:

Drawer sidebar
or
compact bottom navigation for primary items
+
More menu

5. GLOBAL TOP HEADER

Logged-in header should contain:

Page / breadcrumb context

Search

Messages

Notifications

Help

Profile Avatar

Example:

Dashboard

          Search creatives, projects...

                    Messages
                    Notifications
                    Help
                    AN

Do not overcrowd the top bar.

6. HELP MUST ALWAYS BE EASY TO FIND

Every logged-in user should have a visible:

Help & Support

entry.

Desktop:
Put it near the bottom of the sidebar.

Topbar:
Also allow a small Help icon/button.

Mobile:
Include Help inside the main navigation drawer.

Do not hide Help deep inside Settings.

7. HELP & SUPPORT EXPERIENCE

Create a user-friendly help entry using existing support/contact functionality where available.

Navigation label:

Help & Support

The UI can show:

How can we help?

Search Help

Common Topics

Getting Started
Managing Projects
Bookings
Payments
Messages
Deliveries
Reviews
Account & Security

Contact Support

Important:

Do NOT invent new backend support/ticket functionality if it does not already exist.

If there is no support backend yet:

route users to existing contact/help behavior

present help content/front-end guidance only

do not claim that a ticket was created unless a real API exists

8. CLIENT SIDEBAR

The Client sidebar should be extremely clear.

Recommended order:

CREATIVE MARKETPLACE

Overview

DISCOVER
Explore Creatives
Browse Services
Browse Projects

WORK
My Projects
Bookings
Messages
Deliveries / Workspace if applicable

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

Use existing routes.

If a route does not exist separately, link to the nearest existing functional page instead of creating fake functionality.

9. CLIENT SIDEBAR — VISUAL RULE

Each item should have:

icon
label
optional unread/count badge

Example:

Overview

Explore Creatives
Browse Services
My Projects
Bookings
Messages             3

Payments

Favourites
Reviews

Settings

Help & Support

Use simple Lucide-style icons.

Do not use emoji.

10. CLIENT SIDEBAR — IMPORTANT COUNTS

Where real APIs exist, show useful counts.

Examples:

Messages          3
Bookings          2
Projects          4
Notifications     6

Never show fake counts.

If count endpoint/data does not exist, show no badge.

11. FREELANCER SIDEBAR

Recommended:

CREATIVE MARKETPLACE

Overview

MY BUSINESS
Profile
Portfolio
Services
Availability

FIND WORK
Browse Projects
My Proposals

WORK
Bookings
Messages
Deliveries / Workspace

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

This makes the platform clearly feel like a freelancing website.

12. FREELANCER SIDEBAR PRIORITY

The freelancer should be able to reach the most important actions in one click:

Create Service
Browse Projects
Submit/Manage Proposals
Bookings
Messages
Earnings

Do not bury them in nested menus.

13. ADMIN SIDEBAR

Admin should be operational and compact.

Recommended:

ADMIN

Overview

MARKETPLACE
Users
Freelancers
Verifications
Services
Categories
Projects
Bookings

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

Admin can use denser UI than Client/Freelancer.

14. SIDEBAR COLLAPSE

Desktop sidebar should support:

Expanded
Collapsed

Expanded:

icon + text

Collapsed:

icons only

Show tooltip on hover for collapsed icons.

Do not collapse automatically while user is navigating forms.

15. SIDEBAR ACTIVE STATE

Current page must be obvious.

Use:

soft background
dark text
small accent indicator

Example:

▌ Bookings

Do not use bright solid blocks across the entire sidebar.

16. SIDEBAR GROUP LABELS

Use small muted labels such as:

DISCOVER
WORK
MONEY
ACCOUNT

This helps new users understand the product.

Do not create too many groups.

17. BREADCRUMBS

Use breadcrumbs on deep screens.

Example:

Projects / Wedding Photography / Proposals

Example:

Bookings / CM-2026-000123 / Workspace

Keep breadcrumb subtle.

18. PUBLIC NAVIGATION

Public navigation should remain simple.

Recommended:

Logo

Find Talent
Services
Projects
How It Works

Search

Log In
Join

Optional dropdown under Find Talent:

Photographers
Videographers
Editors

Do not expose dashboard-only links publicly.

19. PUBLIC HOMEPAGE — FREELANCING FIRST

The homepage should explain the marketplace immediately.

Hero:

Hire the right creative
for your next project.

Find photographers, videographers and editors
for events, brands, businesses and digital content.

[ Find Creative Talent ]
[ Post a Project ]

Do not use vague luxury marketing copy that hides what the website does.

20. HERO SEARCH

Make marketplace search visible immediately.

Example:

What are you looking for?

[ Wedding Photographer                     ]

Location

[ Mumbai                                   ]

[ Search ]

Secondary tabs:

Talent
Services
Projects

Only implement tabs if corresponding existing search/list functionality exists.

Do not create fake search behavior.

21. HOMEPAGE SECTIONS

Recommended order:

Navbar

Hero + Search

Popular Categories

Top Creative Professionals

Popular Services

How Hiring Works

Open Projects / Opportunities

Why Use This Marketplace

Featured Portfolio Work

Popular Locations

For Clients / For Freelancers CTA

Testimonials if real

Help / FAQ

Final CTA

Footer

This should clearly communicate that the product is a freelancing marketplace.

22. POPULAR CATEGORIES

Use large but simple category cards.

Recommended:

Photography
Videography
Video Editing
Photo Editing
Cinematography
Drone Services
Reel Editing
Motion Graphics

Each card:

image
category title
short description
Explore →

23. "HOW IT WORKS" — CLIENT

Display clearly:

1. Search or post your requirement
2. Compare profiles, portfolios and prices
3. Book or hire the right freelancer
4. Collaborate and receive your final work

24. "HOW IT WORKS" — FREELANCER

1. Build your professional profile
2. Showcase your portfolio and services
3. Apply for projects or receive bookings
4. Deliver work and earn through the platform

This is important for first-time users.

25. CLIENT DASHBOARD — PURPOSE

The Client dashboard must answer:

What projects do I have?
What bookings are coming?
Did I receive proposals?
Do I have unread messages?
Is anything waiting for my approval?

Do not make the client search around the product for these answers.

26. CLIENT DASHBOARD STRUCTURE

Recommended:

Header
Good afternoon, Rahul.
Here's what needs your attention.

Quick Actions
[ Find a Creative ]
[ Post a Project ]

Attention Needed
- 5 new proposals
- 1 delivery waiting for review
- 2 unread conversations

Summary
Active Projects
Upcoming Bookings
Pending Deliveries
Completed Jobs

Main Columns
Upcoming Bookings
Recent Proposals

Recent Messages
Recent Activity

Use real data.

27. QUICK ACTIONS

Client quick actions:

Find a Creative
Post a Project
View Bookings
Open Messages

Freelancer quick actions:

Create Service
Browse Projects
Update Availability
Open Messages

Do not overwhelm users with 8+ buttons.

28. ATTENTION NEEDED PANEL

This is one of the strongest usability improvements.

Show only actionable items.

Example:

Needs your attention

5 new proposals on Wedding Photography
[ Review Proposals ]

Final delivery ready for CM-2026-000123
[ Review Delivery ]

Payment required for booking CM-2026-000129
[ Pay Now ]

Only display actions supported by existing APIs.

29. FREELANCER DASHBOARD — PURPOSE

The Freelancer dashboard should answer:

Do I have new booking requests?
What work is upcoming?
Are there new projects I can apply to?
What needs delivery?
How much have I earned?
Do I have unread messages?

30. FREELANCER DASHBOARD STRUCTURE

Recommended:

Good afternoon, Aarav.

Quick Actions
[ Create Service ]
[ Browse Projects ]

Needs Attention
- 2 booking requests
- 1 revision requested
- 3 unread conversations
- profile 80% complete

Summary
This Month Earnings
Active Jobs
Upcoming Bookings
Proposal Success / Proposals

Upcoming Work

New Opportunities

Recent Messages

Earnings Snapshot

Profile / Reputation

31. FIRST-TIME USER EXPERIENCE

A new Client should see:

Welcome to Creative Marketplace.

Start by:

1. Find a creative professional
2. Or post your first project

Buttons:

Find Talent
Post Project

A new Freelancer should see:

Let's build your professional presence.

1. Complete your profile
2. Add portfolio work
3. Create your first service
4. Start browsing projects

Show real completion state.

32. PROFILE COMPLETION

For freelancers, always make profile completion easy to understand.

Example:

Profile strength

75%

To improve your profile:
+ Add 2 more portfolio items
+ Add equipment
+ Add pricing

Do not just show "75%" without telling the user what to do.

Use existing profile-completion rules from backend.

33. FREELANCER DIRECTORY

The directory should resemble a freelancing marketplace.

Top:

Find Creative Professionals

Search
Filters
Sort
Result Count

Layout:

Filters        Freelancer Cards
               Freelancer Cards
               Freelancer Cards

Mobile filters open in a drawer.

34. FILTERS

Use clear filters:

Profession
Category
Location
Price Range
Rating
Availability
Verified

Use existing filter capabilities only.

Do not create filters that do nothing.

35. FREELANCER CARD — USER FRIENDLY

Each card should answer:

Who are they?
What do they do?
Where are they?
Are they trusted?
What do they cost?
Can I see their work?

Recommended:

[ Portfolio Image ]

Aarav Sharma
Wedding Photographer

Mumbai

Top Rated · Verified
4.9 (126)

From ₹15,000

[ View Profile ]

Optional Save icon.

Do not overload with skills/equipment.

36. FREELANCER PROFILE — HIRING FOCUSED

Profile should keep portfolio emphasis but add clear hiring structure.

Desktop:

Main profile content             Sticky Hire Card

Sticky Hire Card:

Starting from ₹15,000

Available services

[ View Services ]
[ Message ]

If direct booking is available:

[ Book Now ]

Do not create a booking button if the existing feature does not support it.

37. FREELANCER PROFILE CONTENT ORDER

Recommended:

Header / Identity

Trust & Rating

Portfolio Highlights

About

Services

Skills

Equipment

Availability

Reviews

Final Hire CTA

38. SERVICE LISTING

Top:

Creative Services

Search services...

Category
Service Type
Location
Price
Rating

Cards:

Cover Image

Wedding Photography

Aarav Sharma
Mumbai

4.9 (37)

From ₹15,000

[ View Service ]

39. SERVICE DETAIL — MARKETPLACE STYLE

Desktop:

Service Information             Sticky Purchase/Booking Card

Main:

Gallery
Title
Freelancer
Rating
Description
Packages
Deliverables
Requirements
Reviews

Sticky:

Basic | Standard | Premium

₹30,000

Delivery
Revisions

[ Continue ]

40. PROJECT DIRECTORY

Freelancer should clearly understand these are job opportunities.

Header:

Find Projects

Discover projects that match your skills.

Filters:

Category
Project Type
Location
Budget
Date
Skills

41. PROJECT CARDS

Recommended:

Wedding Photography & Videography

Mumbai · On-site

₹30,000 – ₹50,000

20 Dec 2026

Wedding Photography
Cinematography
Drone

12 proposals

Posted 2h ago

[ View Project ]

Use text-first layout.

42. PROJECT DETAIL — FREELANCER HELP

Project page should visibly show:

Project Summary
Client Information
Budget
Location
Date
Requirements
Skills
Attachments

Sticky/right card:

Budget
₹30K – ₹50K

You have / have not submitted a proposal

[ Submit Proposal ]

If already submitted:

[ View My Proposal ]

43. PROPOSAL FORM — MAKE IT EASY

Do not show a confusing giant form.

Structure:

Your Proposal

Proposed Price
Estimated Duration

Cover Letter

Relevant Service
Relevant Portfolio

Proposal Summary

[ Submit Proposal ]

Include contextual helper text.

Example:

Tell the client why you're the right person for this project.

44. BOOKINGS PAGE

Use tabs:

Client:

Pending
Upcoming
In Progress
Completed
Cancelled

Freelancer:

Requests
Upcoming
In Progress
Completed
Cancelled

Do not mix every status into one confusing list.

45. BOOKING CARD

Recommended:

CM-2026-000123

Wedding Photography

Aarav Sharma

20 Dec 2026
Mumbai

₹30,000

CONFIRMED

[ View Booking ]

For Freelancer request:

[ Accept ]
[ Reject ]

Only show valid actions for current status.

46. BOOKING DETAIL — ACTION AREA

Use a clear top summary.

Wedding Photography

Booking CM-2026-000123

CONFIRMED
PAID

20 Dec 2026
4 PM – 11 PM
Mumbai

Primary action based on role/status.

Examples:

Client:

Open Workspace
Make Payment
Review Delivery

Freelancer:

Start Job
Open Workspace
Submit Delivery

Never show invalid status actions.

47. MESSAGES PAGE

Make messaging accessible directly from sidebar.

Layout desktop:

Conversation List | Active Conversation | Booking Context

Conversation card:

Aarav Sharma

Wedding Photography
Booking #CM-...

Latest message...

2m
3 unread

48. MESSAGE CONTEXT

Always show which job/project the conversation belongs to.

Example:

Wedding Photography
CM-2026-000123

This prevents confusion when users have multiple jobs.

49. WORKSPACE

Workspace navigation should be obvious.

Use tabs/sidebar:

Overview
Messages
Files
Deliveries
Revisions
Timeline

Do not force users to scroll one huge page.

50. WORKSPACE OVERVIEW

Show:

Booking Status
Payment Status
Date
Deadline
Client/Freelancer
Package / Project
Agreed Amount

Below:

Recent Activity

Latest Files

Open Revision

Delivery Status

51. PAYMENTS — CLIENT

Client payment page/menu should clearly separate:

Pending Payments
Payment History
Refunds

Do not expose internal ledger terminology to clients unnecessarily.

52. EARNINGS — FREELANCER

Freelancer should see:

Available to withdraw / payout
Pending
Total Earned
Paid Out

Then:

Recent Earnings
Payout History
Payout Account

Use real existing data.

53. REVIEWS — CLIENT

Client:

Reviews to Write
My Reviews

Make pending reviews visible after completed jobs.

54. REVIEWS — FREELANCER

Freelancer:

Overall Rating

4.8
126 Reviews

Rating Breakdown

Recent Reviews

Your Responses

55. NOTIFICATIONS

Notifications should not be a confusing feed.

Group by:

Today
Yesterday
Earlier

Add filter:

All
Projects
Bookings
Messages
Payments

Only if existing notification types can support it.

56. HELP SIDEBAR / DRAWER

In addition to Help link, provide a contextual help drawer if easy to implement without backend changes.

Trigger:

? Help

Drawer example:

Help with Bookings

• How booking requests work
• How rescheduling works
• What each booking status means

Need more help?
[ Contact Support ]

The content can change based on current page.

Important:
This is UI/help content only.

Do not create new business behavior.

57. CONTEXTUAL HELP EXAMPLES

On Project creation page:

Need help?

A strong project brief should include:
• location
• date
• budget
• required professionals
• examples/references

On Freelancer Service creation:

Tip

Use a clear title, strong cover image and package details to help clients understand what you offer.

On Payments:

Payments are processed through the platform using the configured payment provider.

Do not use legally inaccurate escrow language.

58. TOOLTIP SYSTEM

Use short tooltips for unfamiliar features.

Example:

Profile Completion [?]

Tooltip:

Complete your profile to improve how clients understand your services.

Do not add tooltips to obvious buttons.

59. UI COPY — FREELANCING LANGUAGE

Use user-friendly freelancing language.

Prefer:

Find Talent
Find Projects
Hire
Book
Send Proposal
My Projects
My Services
Earnings
Messages
Deliver Work

Avoid unnecessarily technical language:

Marketplace Entity
Transaction Object
Initiate Proposal
Professional Resource

Frontend text can be simplified without changing APIs.

60. EMPTY STATES MUST GUIDE USER

Bad:

No data.

Good Client:

No projects yet.

Post your first project and start receiving proposals from creative professionals.

[ Post a Project ]

Good Freelancer:

You haven't created a service yet.

Show clients what you offer by creating your first service.

[ Create Service ]

61. ERROR STATES MUST GUIDE USER

Bad:

400 Bad Request

Good:

We couldn't submit your booking.

Please review the highlighted information and try again.

Keep technical details out of normal UI.

62. SEARCH EVERYWHERE IT HELPS

Use search on:

Freelancers
Services
Projects
Messages
Admin users
Admin bookings

Do not add search where backend does not support it unless filtering can happen safely on already-loaded small datasets.

63. PAGE HEADERS

Every dashboard page should have:

Page Title
Short useful description
Primary action

Example:

My Services

Manage the services clients can discover and book.

[ Create Service ]

64. TABLES VS CARDS

Use cards for:

freelancers
services
projects
bookings on client/freelancer pages

Use tables for:

admin
financial transaction history
dense management pages

This keeps the marketplace approachable.

65. USER-FRIENDLY COLORS

Use:

Background: warm off-white
Surface: white / soft cream
Text: near black
Accent: warm coral/red
Dark: charcoal
Success: muted green
Warning: muted amber
Danger: muted red

Do not use too many colors.

66. VISUAL TOKENS

Recommended:

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

Reuse existing tokens if present.

Do not create duplicate token systems.

67. TYPOGRAPHY

Use a readable modern sans-serif.

Recommended:

Geist
Inter
Manrope

Marketing headings can be large.

Dashboard headings should remain practical.

Example dashboard:

Page title: 28–36px
Section title: 20–24px
Body: 14–16px
Metadata: 12–14px

68. DASHBOARD DENSITY

Dashboard should not have giant empty areas.

Use:

24–32px section gaps
16–24px card padding

Marketing pages may remain much more spacious.

69. CARD DESIGN

Cards:

soft white
subtle border
16–20px radius
very light shadow if needed

Avoid excessive glassmorphism.

70. PRIMARY CTA RULE

Each page should usually have only one dominant action.

Examples:

Create Service
Post Project
Submit Proposal
Book Now
Pay Now
Submit Delivery

Secondary actions should look secondary.

71. MOBILE NAVIGATION — CLIENT

Recommended bottom nav:

Home
Explore
Projects
Messages
More

More drawer:

Bookings
Payments
Favourites
Reviews
Notifications
Settings
Help

Only use bottom navigation if it fits current application cleanly.

72. MOBILE NAVIGATION — FREELANCER

Recommended:

Home
Projects
Bookings
Messages
More

More:

Profile
Portfolio
Services
Proposals
Availability
Earnings
Reviews
Notifications
Settings
Help

73. MOBILE PRIMARY ACTION

Where useful use floating/sticky primary action.

Examples:

Post Project
Create Service
Submit Proposal
Book

Do not cover content.

74. ONBOARDING HELP

Freelancer onboarding should include help text below complicated fields.

Example:

Professional Title:

Describe what clients should hire you for.
Example: Wedding Photographer & Cinematographer

Service Radius:

How far you're normally willing to travel for on-site work.

75. FORM PROGRESS

For long multi-step workflows show:

Step 3 of 8

and:

Back
Save & Continue

Do not lose user progress.

76. FORM VALIDATION

Errors should be shown directly below the field.

Example:

Email
[ bad email ]

Enter a valid email address.

Do not show all validation errors only in a toast.

77. SAVE STATE

Show clear state:

Saving...
Saved

where autosave exists.

Do not claim autosave if the backend does not support it.

78. TRUST SIGNALS

Display trust signals where they help hiring decisions:

Verified
Top Rated
Completed Jobs
Reviews

Do not over-display badges everywhere.

79. PAYMENT TRUST SIGNAL

Near payment CTA:

Payment processed securely through Razorpay.

Do not claim unsupported escrow.

80. SUPPORT LINKS IN CRITICAL FLOWS

Include Help link near:

Payment
Booking cancellation
Dispute
Verification
Payout setup

Example:

Need help with this payment?
View payment help

81. ROLE SWITCHING

Do NOT add role switching unless existing functionality supports it.

A CLIENT should not suddenly become FREELANCER through UI only.

Keep existing role logic.

82. PUBLIC FOOTER

Recommended:

Explore
- Find Talent
- Services
- Projects

For Clients
- How it Works
- Post a Project

For Creatives
- Join as Freelancer
- Find Projects

Support
- Help
- Contact

Company
- About
- Terms
- Privacy

Use existing routes.

83. DESIGN INSPIRATION RULE

Use Luminous Labs reference for:

premium typography
spacing
visual polish
subtle motion
high quality image treatment
strong contrast

Do NOT copy the reference site's:

brand
health theme
exact page layout
copy
images
assets
source code

The final product must clearly be a freelancing marketplace.

84. DO NOT OVER-ANIMATE DASHBOARDS

Marketing:

subtle scroll reveals
image zoom
editorial motion

Dashboard:

150–250ms hover/focus/state transitions

Avoid scroll-jacking.

Respect prefers-reduced-motion.

85. IMPLEMENTATION PRIORITY

Redesign in this order:

1. Global design tokens
2. Logged-in shell
3. Client sidebar
4. Freelancer sidebar
5. Admin sidebar
6. Topbar
7. Help & Support navigation
8. Client dashboard
9. Freelancer dashboard
10. Freelancer directory
11. Freelancer profile
12. Services
13. Projects
14. Proposals
15. Bookings
16. Messages/workspace
17. Payments/earnings
18. Reviews/notifications
19. Admin
20. Public homepage/auth
21. Responsive/mobile
22. Accessibility

86. EXISTING COMPONENT AUDIT

Before creating new components:

Check for existing:

Sidebar
Navbar
Header
Button
Card
Input
Select
Tabs
Badge
Modal
Dropdown
Avatar
Tooltip
Pagination
Skeleton
Toast

Reuse or refactor existing components.

Do not create Sidebar2, NewSidebar, SidebarFinal, etc.

87. SUGGESTED SHARED LAYOUT COMPONENTS

Use or create only if needed:

AppShell
RoleSidebar
TopHeader
PageHeader
Breadcrumbs
QuickActions
AttentionPanel
HelpButton
HelpDrawer
StatCard
EmptyState
ErrorState
StatusBadge

88. ROUTE SAFETY

Navigation should use current route structure.

Do not rename routes just for design.

If a sidebar item maps to:

/client/projects

continue using that route.

If functionality exists inside one page rather than multiple routes, use tabs/sections without inventing backend functions.

89. DO NOT CHANGE FEATURES

Repeat critical instruction:

Do NOT change:

Authentication
Client role
Freelancer role
Admin role

Freelancer profile functionality

Portfolio functionality

Services and package functionality

Project posting

Proposals

Bookings

Availability

Messaging

Workspace

Files

Delivery

Revision

Payments

Commission

Payouts

Reviews

Favourites

Notifications

Verification

Disputes

Admin management

Only improve presentation and navigation.

90. FINAL CLIENT EXPERIENCE

The Client should be able to understand this flow without training:

Login
  ↓
Dashboard
  ↓
Find Talent / Post Project
  ↓
Compare
  ↓
Hire / Book
  ↓
Pay
  ↓
Message
  ↓
Receive Delivery
  ↓
Review

Every step should be easy to find from navigation.

91. FINAL FREELANCER EXPERIENCE

Login
  ↓
Dashboard
  ↓
Complete Profile
  ↓
Portfolio / Services
  ↓
Browse Projects
  ↓
Send Proposal
  ↓
Booking
  ↓
Workspace
  ↓
Deliver Work
  ↓
Earnings
  ↓
Reviews

Every step should be visible from sidebar.

92. FINAL ADMIN EXPERIENCE

Login
  ↓
Dashboard
  ↓
Users / Marketplace / Finance / Trust
  ↓
Search / Filter
  ↓
Inspect
  ↓
Take controlled action
  ↓
Audit

93. FINAL USABILITY VALIDATION

Before calling the redesign complete, test whether a new user can answer:

CLIENT:

Where do I find photographers?
How do I post a project?
Where are my proposals?
Where are my bookings?
Where do I pay?
Where do I message the freelancer?
Where do I review delivered work?
Where can I get help?

FREELANCER:

Where do I complete my profile?
Where do I add portfolio?
Where do I create a service?
Where do I find jobs?
Where are my proposals?
Where are booking requests?
Where do I deliver work?
Where are my earnings?
Where can I get help?

If any answer requires guessing, the UI is not complete.

94. FUNCTIONAL VALIDATION

Verify after redesign:

Client login works
Freelancer login works
Admin login works

All dashboards work

All sidebars navigate correctly

All existing routes remain valid

Freelancer profile works
Portfolio works
Services work
Packages work

Project posting works
Proposal flow works

Booking works
Availability works

Messaging works
Workspace works
File delivery works
Revision works

Payment works
Earnings/payouts work

Reviews work
Favourites work
Notifications work

Verification works
Disputes work
Admin actions work

Help navigation works without pretending unsupported backend features exist

No fake data added
No API removed
No business logic changed

95. RESPONSIVE VALIDATION

Test at minimum:

375px
430px
768px
1024px
1440px

Check:

Sidebar
Topbar
Cards
Tables
Filters
Forms
Modals
Workspace
Chat
Payment
Admin

No horizontal overflow except intentionally scrollable admin tables.

96. ACCESSIBILITY VALIDATION

Verify:

Keyboard navigation
Visible focus
Correct labels
Accessible sidebar toggle
Accessible mobile drawer
Accessible modal focus
Button labels
Icon tooltips
Contrast
Reduced motion
Alt text

97. FINAL VISUAL TARGET

The application should feel like:

A premium, modern creative freelancing marketplace that is easy enough for a first-time client to hire a photographer and clear enough for a freelancer to manage their entire business from the sidebar.

The interface must be:

premium
professional
creative
simple
clear
trustworthy
easy to navigate

Usability is more important than visual experimentation.

98. FINAL OUTPUT FROM CODING AGENT

After implementation provide:

Existing layout audited

Existing navigation audited

Client sidebar structure implemented

Freelancer sidebar structure implemented

Admin sidebar structure implemented

Topbar implemented

Help & Support navigation implemented

Contextual help implemented, if used

Client dashboard usability changes

Freelancer dashboard usability changes

Public marketplace changes

Freelancer directory/profile changes

Service page changes

Project/proposal page changes

Booking page changes

Messaging/workspace changes

Payment/earnings changes

Review/notification changes

Admin usability changes

Mobile navigation changes

Accessibility changes

Components reused

Components created

Files modified

Files created

Build result

Critical flow test result

Confirmation that no business functionality was intentionally changed

Do not claim completion unless the project builds successfully and critical routes were checked.