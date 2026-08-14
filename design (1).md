# Creative Marketplace — UI/UX Design System

## Reference Direction

Primary visual inspiration:
`https://www.luminouslabs.health/redgevity-master`

The goal is to capture the **premium, editorial, cinematic, high-end, spacious and modern visual language** of the reference while keeping the Creative Marketplace product completely original.

This is **NOT** a request to copy the reference site's branding, text, assets, logos, product imagery, or exact layouts.

Use the reference only for visual hierarchy, premium spacing, cinematic presentation, typography scale, section rhythm, strong imagery, polished cards, minimal navigation, dark/light contrast, subtle motion, and refined micro-interactions.

## 1. Critical Product Rule — Do Not Change Functionality

The existing Creative Marketplace functions, routes, APIs, database behavior, authentication, business rules and features must remain unchanged. Do not remove, rename, rebuild or simplify existing features just to match the new design.

Keep all existing functionality including client authentication, freelancer authentication, admin authentication, freelancer onboarding, profiles, portfolio, equipment, skills, services, Basic/Standard/Premium packages, project posting, proposals, bookings, availability, messaging, project workspace, file delivery, revision requests, payments, earnings, payouts, reviews, ratings, favourites, notifications, freelancer verification, admin management, disputes and platform settings.

The task is strictly: **improve UI, UX, visual consistency and usability only.**

## 2. Design Vision

The Creative Marketplace should feel like a premium creative-industry platform rather than a generic freelancing dashboard.

The visual personality should be premium, cinematic, minimal, editorial, elegant, modern, creative, professional, high-trust, image-focused, spacious, calm and user-friendly.

Avoid making it look like a generic admin template, basic Bootstrap site, Fiverr clone, gaming UI, neon cyberpunk interface, overly glassmorphic dashboard or cluttered SaaS application.

The marketplace should feel suitable for professional photographers, wedding photographers, cinematographers, videographers, editors, production houses, agencies, brands and premium clients.

## 3. Core Visual Concept

Use a combination of editorial whitespace, large cinematic imagery, strong typography, soft rounded surfaces, premium dark sections, warm neutral backgrounds, minimal controls and subtle motion.

The design should feel expensive without becoming difficult to use.

## 4. Color System

Primary background:

```css
--background: #F3F1EB;
```

Warm off-white / soft stone. Do not use pure white everywhere.

Surfaces:

```css
--surface: #FAF9F6;
--surface-elevated: #FFFFFF;
```

Primary text:

```css
--text-primary: #161616;
```

Secondary text:

```css
--text-secondary: #696762;
```

Muted text:

```css
--text-muted: #92908A;
```

Border:

```css
--border: rgba(22, 22, 22, 0.10);
```

Dark section:

```css
--dark: #111111;
--dark-soft: #191919;
--text-on-dark: #F7F4EE;
```

Primary accent — sophisticated warm red/coral:

```css
--accent: #E4523D;
--accent-hover: #C94432;
```

Use the accent selectively for primary CTA, active indicators, selected states and small visual details. Do not make the whole interface red.

Supporting colors:

```css
--success: #417A5A;
--warning: #B97728;
--error: #B83D35;
--info: #4A637D;
```

## 5. Dark / Cinematic Sections

The public website should alternate between light editorial sections and deep cinematic dark sections.

Example rhythm:

```text
Light Hero
↓
Light Category Discovery
↓
Dark Featured Creators
↓
Light How It Works
↓
Cinematic Portfolio Showcase
↓
Light Testimonials
↓
Dark CTA
```

Do not make every page dark. Dashboard screens should remain mostly light for usability.

Use dark treatment strategically for hero visual areas, featured creators, premium CTA sections, portfolio showcase, marketing statistics and major promotional sections.

## 6. Typography

Use one clean modern sans-serif family such as Inter, Manrope, Geist or DM Sans. Optional: use a refined display serif only for selected marketing headlines if it integrates cleanly.

Do not mix too many fonts.

Hero typography:

```css
font-size: clamp(64px, 7vw, 112px);
line-height: 0.92;
font-weight: 500;
letter-spacing: -0.05em;
```

Main section heading:

```css
font-size: clamp(40px, 5vw, 72px);
line-height: 0.98;
font-weight: 500;
letter-spacing: -0.04em;
```

Page heading:

```css
font-size: clamp(32px, 4vw, 52px);
```

Card heading: 20–26px, weight 500. Body: 15–18px, line-height 1.6. Metadata: 12–14px. Prefer weights 400, 500 and 600.

## 7. Spacing System

Use consistent spacing tokens:

```text
4 8 12 16 24 32 48 64 80 96 128
```

Desktop marketing sections: 96–160px vertical padding. Dashboard sections: 24–40px. Mobile: 48–80px.

Do not stack components tightly unless they are compact data controls.

## 8. Content Width

Use a centered application container:

```css
max-width: 1440px;
margin: 0 auto;
padding-inline: 24px;
```

Large marketing pages may use up to 1600px. Text-heavy sections should stay around 720px maximum width for readability.

## 9. Radius and Shadows

Recommended radii:

```text
Small controls: 10px
Inputs: 12px
Buttons: pill or 12px depending context
Cards: 20px
Large visual cards: 28px
Hero media: 32px
Modals: 24px
```

Avoid strong drop shadows. Prefer subtle borders and gentle depth:

```css
box-shadow:
0 1px 2px rgba(0,0,0,.03),
0 12px 40px rgba(0,0,0,.05);
```

## 10. Public Navigation

Create a clean, minimal navigation.

Desktop example:

```text
LOGO

Explore
Photographers
Videographers
Editors
Projects

                         Search

                  Log In
                  Join as Creative
```

Navigation may be transparent initially and become slightly solid/blurred on scroll. Do not make it visually heavy.

Mobile should use Logo, Search and Menu with a clean full-height or sheet menu.

## 11. Button System

Primary actions include Find a Creative, Post a Project, Book Now and Send Proposal.

Recommended:

```css
height: 48px - 56px;
padding: 0 24px;
border-radius: 999px;
```

Secondary actions should use neutral outline/soft surface. Tertiary actions can use text + arrow, e.g. `View Profile →`.

Hover interaction: slight translateY(-1px), subtle background shift and arrow movement of around 3px. Keep duration around 180–300ms.

## 12. Homepage Hero

The homepage should immediately communicate the product.

Suggested copy structure:

```text
Find the right creative
for every story.

Discover trusted photographers,
videographers and editors for events,
brands and digital projects.

[ Explore Creatives ]
[ Post a Project ]
```

Use premium photography/videography imagery. Avoid a standard SaaS hero with generic gradient cards.

## 13. Hero Search

Make discovery part of the hero:

```text
What do you need?
[ Wedding Photographer ]

Where?
[ Mumbai ]

[ Search Creatives ]
```

Stack fields cleanly on mobile.

## 14. Category Discovery

Use image-led category tiles instead of small generic icon cards.

Example:

```text
[ Large Photography Image ]
Photography
Wedding • Fashion • Product

[ Cinematic Video Image ]
Videography
Events • Commercial • Cinematic

[ Editing Workspace Image ]
Editing
Video • Reels • Color Grading
```

Hover: subtle image scale, overlay adjustment and arrow movement.

## 15. Featured Creatives

Use a dark cinematic section with large portfolio-first cards.

Card priority:

```text
Large portfolio image
Aarav Sharma
Wedding Photographer
Mumbai
4.9 · 126 reviews
Starting at ₹15,000
```

Do not overload cards with biography, skills, equipment or too many actions.

## 16. Freelancer Directory

Desktop layout can use a filter column plus results or a clean responsive filter toolbar.

Filters: Profession, Category, Location, Price, Rating, Availability and Verified.

Use clean pills/selectors and avoid enterprise-style filter panels.

## 17. Freelancer Profile

The profile should feel like a creative portfolio website.

Hero:

```text
Large Cover Image
Profile Photo
Aarav Sharma
Wedding Photographer & Cinematographer
Mumbai, India
4.9 · 126 reviews
Identity Verified
Top Rated

[ Message ] [ Book ]
```

Recommended content order:

```text
Hero
Featured Work
About
Services
Portfolio
Experience & Skills
Equipment
Reviews
Availability
Booking CTA
```

Portfolio must be visually dominant.

## 18. Portfolio Grid

Use an editorial masonry/grid with mixed ratios: landscape, portrait, video thumbnail and featured work. Do not force every image into identical cards.

Clicking opens a clean lightbox/detail view. Video portfolio should use cinematic thumbnails with Play, project title and category overlays. Do not autoplay videos in grids.

## 19. Service Cards

Service cards should look like premium editorial product cards, not crowded Fiverr gig cards.

Example:

```text
[ Large Cover ]
Cinematic Wedding Photography
Aarav Sharma
Mumbai
4.9 (37)
From ₹15,000
```

Optional subtle `ON-SITE` or `REMOTE` label.

## 20. Service Detail

Recommended desktop layout:

```text
Large Gallery                  Sticky Booking Panel

Title
Freelancer
Rating

Description
Packages
Deliverables
About Freelancer
Reviews
```

Booking panel:

```text
Starting at
₹15,000

Basic / Standard / Premium
Delivery
Revisions

[ Continue ]
```

## 21. Package Comparison

Avoid an ugly spreadsheet-like table. Use three elegant cards for Basic, Standard and Premium. Highlight the recommended package subtly rather than with aggressive colors.

## 22. Projects

Project cards should be simple and information-focused:

```text
Wedding Photography & Videography
Mumbai · 20 Dec 2026
₹30K – ₹50K
Wedding Photography · Drone · Cinematography
12 proposals
View Project →
```

Project detail should use editorial text layout with a clear proposal CTA and structured requirements.

## 23. Authentication

Desktop login/register should use a split layout: full-height cinematic image on the left and a clean form on the right.

Example:

```text
Welcome back.
Continue your creative work.

Login ID / Email / Phone
Password

[ Sign In ]

Forgot Password
```

Registration should clearly ask whether the user wants to hire or work. Do not overload auth screens with marketing content.

## 24. Freelancer Onboarding

Use a premium step-by-step wizard.

Example navigation:

```text
01 Profile
02 Profession
03 Location
04 Skills
05 Equipment
06 Portfolio
07 Pricing
08 Review
```

Show `Step 4 of 8` and profile completion. Use progressive disclosure instead of one huge form.

## 25. Client Dashboard

Dashboard style should prioritize clarity over cinematic marketing effects.

Header:

```text
Good morning, Rahul.
Here's what's happening with your projects.
```

Summary cards:

```text
Active Projects
Bookings
Pending Deliveries
Unread Messages
```

Then show Upcoming Bookings, Recent Proposals and Recent Activity. Avoid giant colorful KPI cards.

## 26. Freelancer Dashboard

Header:

```text
Good morning, Aarav.
Your creative business at a glance.
```

Show Upcoming Booking, New Requests, Active Jobs, Pending Deliveries, Earnings, Profile Views and Rating using real API data only.

## 27. Dashboard Cards

Use warm-white surfaces, thin borders, 20px radius, generous padding and minimal icons. Avoid strong gradients.

## 28. Admin Dashboard

Admin should use the same design foundation with lower visual intensity and higher information density.

Use a compact sidebar, light surfaces, clear tables, neutral stat cards and understated status chips.

Do not make admin cinematic at the cost of usability.

## 29. Sidebars

Use simple line icons and restrained active states.

Client example:

```text
Overview
Projects
Bookings
Messages
Payments
Saved
Settings
```

Freelancer example:

```text
Overview
Profile
Portfolio
Services
Projects
Proposals
Bookings
Messages
Earnings
Reviews
Availability
Settings
```

Active item: subtle neutral background, stronger text and small accent indicator.

## 30. Forms

Inputs:

```css
height: 50px - 56px;
border-radius: 12px;
border: 1px solid var(--border);
background: var(--surface);
```

Always use visible labels above fields. Group long forms into meaningful sections using whitespace/cards rather than excessive separators.

## 31. Status Badges

Use understated status chips for Confirmed, Pending, Completed, Cancelled, Verified, Draft and Published. Use muted backgrounds and readable text; avoid highly saturated colors.

## 32. Booking Experience

Booking page should be calm and trustworthy.

```text
Booking Details                  Summary
Date                             Service
Time                             Freelancer
Location                         Package
Requirements                     Price
                                 ₹30,000
                                 [ Continue ]
```

On mobile, move summary below or into a sticky bottom area.

## 33. Availability Calendar

Use clear states for Available, Selected, Booked and Unavailable. Do not rely only on color, and do not make unavailable dates interactive.

## 34. Messaging / Workspace

The workspace should feel like a professional collaboration tool, not a social chat app.

Desktop can use workspace navigation, main content and job summary. Message bubbles should be simple, comfortable and restrained.

## 35. File Delivery

Deliveries should have strong hierarchy:

```text
FINAL DELIVERY
Wedding Film — V3
Submitted 28 Dec
[ Preview ] [ Download ] [ Approve ] [ Request Revision ]
```

## 36. Payment Page

Payment screens should be uncluttered and trust-focused.

Example:

```text
Complete your booking
Wedding Photography
Aarav Sharma
Booking CM-2026-000123

Total
₹30,000

Payment processed securely through Razorpay.

[ Pay ₹30,000 ]
```

Avoid unnecessary animation around payment.

## 37. Reviews

Use an editorial review layout with overall score, rating distribution and clean review cards. Keep `Verified Booking` visible but subtle.

## 38. Favourites

Saved freelancer/service pages should reuse the same public discovery cards. Do not create a separate visual language.

## 39. Notifications

Keep dropdown notifications compact: title, short message/time and clear unread state. Avoid giant cards.

## 40. Search

Global search should feel central. Suggested placeholder:

```text
Search photographers, videographers, editors...
```

Where useful, organize results into Creatives, Services and Projects.

## 41. Empty, Error and Loading States

Use refined empty states with a short explanation and one relevant CTA. Do not leave blank screens.

Use neutral skeleton loaders matching final card shapes. Avoid spinners for every section.

Error example:

```text
We couldn't load your projects.
Please try again.
[ Retry ]
```

Do not expose technical backend details.

## 42. Modals

Desktop: centered modal. Mobile: bottom sheet where appropriate. Use 24px radius, soft backdrop, clear title, one primary action and one secondary action.

Require confirmation for destructive actions such as Cancel Booking, Withdraw Proposal, Delete Portfolio Item, Issue Refund and Suspend User.

## 43. Motion System

Use motion subtly: fade-up, image reveal, slight parallax, card hover and staggered section entrance.

Marketing duration: 300–800ms. Dashboard interaction: 150–250ms.

Animation must never delay actions, block forms, make dashboards feel slow or run continuously without purpose. Respect `prefers-reduced-motion`.

Recommended scroll reveal:

```text
opacity 0 → 1
translateY(24px → 0)
```

Portfolio/service card image hover:

```text
scale 1 → 1.025
```

## 44. Responsive Design

Recommended breakpoints:

```text
Mobile: <640px
Tablet: 640–1024px
Desktop: 1024+
Large: 1440+
```

Use existing Tailwind breakpoints where practical.

Do not simply shrink desktop. On mobile prioritize Search, Image, Name/Title, Price, Primary Action and essential information.

On service/profile pages, consider a mobile bottom sticky action such as:

```text
From ₹15,000        Book
```

Admin tables may scroll horizontally or transform into cards where necessary.

## 45. Icons

Use one icon family only, preferably the existing project library or Lucide React. Keep icons simple, thin/medium and consistent. Do not mix icon families.

## 46. Image Direction

Marketplace imagery is central to the brand.

Use natural, cinematic, professionally composed photography/video stills. Avoid generic corporate stock images.

Never use the reference site's health/product imagery.

Recommended aspect ratios:

```text
Freelancer listing: 4:5
Service listing: 4:3
Hero: 16:9 or wider cinematic
Portfolio: mixed editorial ratios
```

Use subtle dark gradients only when text overlays imagery.

## 47. Accessibility

Maintain accessible contrast, visible keyboard focus, alt text, labelled controls, accessible dialogs, logical tab order, sufficient hit targets, non-color-only status information and reduced-motion support.

Premium styling must never reduce usability.

## 48. Component Consistency

Before creating a component, check whether an equivalent already exists.

Reuse Button, Input, Select, Card, Modal, Tabs, Badge, Avatar, Dropdown, Tooltip, Pagination and Skeleton components.

Do not create multiple inconsistent component versions.

## 49. Central Design Tokens

Use the existing design system if present. Otherwise centralize variables in `src/app/globals.css` or the existing theme file.

```css
:root {
  --background: #F3F1EB;
  --surface: #FAF9F6;
  --surface-elevated: #FFFFFF;
  --text-primary: #161616;
  --text-secondary: #696762;
  --text-muted: #92908A;
  --border: rgba(22,22,22,0.10);
  --accent: #E4523D;
  --accent-hover: #C94432;
  --dark: #111111;
  --dark-soft: #191919;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
}
```

## 50. Homepage Structure

Recommended final order:

```text
Navbar
Hero + Search
Creative Categories
Featured Creatives
Featured Services
Why Use Creative Marketplace
How It Works
Portfolio / Creative Showcase
Popular Locations
Client / Creator Testimonials
Post a Project CTA
Final Dark CTA
Footer
```

How it works — Client:

```text
01 Tell us what you need
02 Find the right creative
03 Book securely
04 Collaborate and receive your work
```

Freelancer:

```text
01 Create your profile
02 Show your work
03 Get hired
04 Deliver and grow
```

## 51. Dark Final CTA

Suggested treatment:

```text
Great work starts
with the right creative.

Find photographers, videographers
and editors for your next project.

[ Explore Creatives ]
```

Use large typography with a cinematic background or subtle abstract texture.

## 52. Footer

Keep it spacious with columns such as Explore, For Clients, For Creatives, Company and Support. Bottom row: Terms, Privacy and Copyright.

## 53. UI Copy Style

Use human language.

Instead of `Initiate Freelancer Booking Transaction`, use `Book this service`.
Instead of `Proposal Submission Successful`, use `Proposal sent`.
Instead of `No entities found`, use `No projects found`.

Do not change backend terminology or functionality solely for copy.

## 54. User Feedback

Use lightweight toast/inline feedback for actions such as Profile saved, Proposal sent, Service published, Booking request sent and Review submitted. Do not use browser `alert()` for normal UX.

## 55. Role Consistency

Client and freelancer experiences must belong to the same product.

Client: discovery-focused, visual and booking-oriented.
Freelancer: business-focused, portfolio-first and operational.

Shared: typography, colors, buttons, cards, spacing and navigation behavior.

Admin uses the same foundation with lower visual intensity and higher information density.

## 56. Do Not Change

Do NOT rename routes unnecessarily, change API behavior, change database schema solely for UI, remove features, remove role checks, remove backend-required fields, replace real API calls with mock data, introduce fake reviews/ratings/earnings/admin metrics, bypass authentication, alter payment/commission logic, alter booking/proposal/verification workflows or weaken admin permissions.

## 57. Do Not Copy the Reference Site

Do not copy Luminous Labs branding, Redgevity branding, exact text, product images, health content, proprietary sections, assets, source code or unique illustrations.

Use the site only as **visual inspiration**. The marketplace must remain visually original and appropriate for a creative freelancing product.

## 58. Implementation Approach

Before changing UI:

1. Audit existing pages.
2. List existing reusable components.
3. Identify shared layouts.
4. Identify functional forms/actions that must remain intact.
5. Create/update design tokens.
6. Update global typography.
7. Update navigation.
8. Redesign public pages.
9. Redesign authentication.
10. Redesign client dashboard.
11. Redesign freelancer dashboard.
12. Redesign workspace.
13. Redesign payments/reviews.
14. Redesign admin.
15. Perform responsive audit.
16. Perform accessibility audit.
17. Run build/tests.

Do not redesign by creating duplicate replacement pages unless absolutely required.

## 59. Priority Order

Priority 1 — public marketplace:

```text
/
/freelancers
/freelancers/[id]
/services
/services/[id]
/projects
/projects/[id]
```

Priority 2 — authentication:

```text
/login
/register
/forgot-password
```

Priority 3 — freelancer experience:

```text
/freelancer/dashboard
/freelancer/profile
/freelancer/portfolio
/freelancer/services
/freelancer/projects
/freelancer/bookings
```

Priority 4 — client experience:

```text
/client/dashboard
/client/projects
/client/bookings
/client/favourites
/client/payments
```

Priority 5 — workspace/messages/delivery/revisions.

Priority 6 — admin.

## 60. Final Quality Target

The final result should feel like a premium creative platform, not a template.

It should have the visual confidence of a modern luxury product website while retaining the usability required for a large marketplace application.

The design should be especially strong when showcasing photography, cinematography, video work, creative portfolios and premium services.

## 61. Final Validation

Before completing the redesign verify:

```text
All existing functionality still works
All API integrations remain connected
Client login works
Freelancer login works
Admin login works
Public freelancer listing works
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
Revision flow works
Payment flow works
Review flow works
Favourites work
Notifications work
Admin functionality works
No fake data introduced
No backend business rules changed
Desktop responsive
Tablet responsive
Mobile responsive
Keyboard navigation works
Forms remain accessible
Loading states exist
Empty states exist
Error states exist
No major visual overflow
No broken images
No broken routes
No TypeScript errors caused by redesign
Production build succeeds
```

## 62. Required Final Output from the Coding Agent

After implementation provide:

1. Existing pages audited
2. Components reused
3. Components created
4. Pages redesigned
5. Global design tokens added/changed
6. Typography changes
7. Navigation changes
8. Homepage redesign summary
9. Freelancer/profile redesign summary
10. Service redesign summary
11. Project redesign summary
12. Dashboard redesign summary
13. Workspace redesign summary
14. Admin redesign summary
15. Responsive improvements
16. Accessibility improvements
17. Animations introduced
18. Files modified
19. Files created
20. Build/test result
21. Confirmation that no functionality/business logic was intentionally changed

Do not say the redesign is complete unless the application was actually built and the existing critical flows were checked.
