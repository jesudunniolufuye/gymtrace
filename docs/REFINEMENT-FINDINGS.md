# GymTrace: refinement pass (member, trainer and admin features)

Scope: every page a member, trainer or admin sees, plus the public pages, **except** the QR and check-in code (`api/qr-token`, `api/check-in`, the member QR page, the admin scanner, `qrToken`, attendance logic), which was not changed.

Phase 1 is this report. Phase 2 fixes only what is small and low-risk: wording, spacing, overflow, empty and error states, dead UI. No features, no refactors, no changes to rules or API behaviour. Anything larger is listed as a next step.

## How it was tested, and what was not

- **Walked:** every route for each role at **375 px width**, on the current code running against the local Firebase emulators with the realistic demo data (16 members, 4 trainers, 17 payments, bookings, check-ins, workouts). For each page I recorded page-level sideways overflow, buttons and links with no accessible name, inputs with no label, images without `alt`, placeholder or mock text, and read the visible wording. I also looked at screenshots of the landing and dashboard pages.
- **Staging:** it runs the same code. The final check on staging is listed at the end of this file.
- **Not tested:** real phones and other browsers (phone width was an iframe in desktop Chrome); a keyboard-only walk; a screen reader; colour contrast (not measured: the grey helper text looks low-contrast but I did not measure it); slow-network and offline behaviour outside the QR page; printing; the QR page and scanner (out of scope here).

## Findings

Severity: **major** = a visitor is misled or blocked; **minor** = confusing or untidy; **polish** = small. There are no blockers. "Fix" means planned for Phase 2.

### Major
| ID | Where | Problem | Plan |
|---|---|---|---|
| R1 | Admin → Reports | At 375 px the page itself scrolls sideways (main area 426 px in a 360 px window): the three tab buttons (`px-6`) don't fit. | **Fix** (smaller padding on phones) |
| R2 | Member → Profile | A camera button sits on the avatar and does nothing (no handler). A dead button on a page that is meant to show real data. | **Fix** (remove) |
| R3 | Member → Attendance | **Previous / Next** are permanently disabled, with no pagination behind them. | **Fix** (remove) |
| R4 | Member → Bookings | The specialty filter chips are hard-coded (Bodybuilding, CrossFit, Powerlifting, Nutrition…) and don't match any real trainer's specialty (Personal Training, Strength & Conditioning, Yoga & Mobility, HIIT & Cardio). Most chips return "no trainers". | **Fix** (chips come from the listed trainers) |
| R5 | Admin → Settings | "General Information" (gym name, support email, phone) saves to the database but nothing in the app reads it. It looks like it configures something. | **Fix** (say so on the page) |
| R26 | Trainer layout on a phone | The trainer portal has no sign-out on a phone: the header shows only an initials circle, and the sidebar with Sign out is hidden below the `md` breakpoint (members reach Sign out through Profile; trainers have no Profile page). | **Fix** (sign-out button in the mobile header) |

### Minor
| ID | Where | Problem | Plan |
|---|---|---|---|
| R6 | Member → Dashboard | "Generate Qr" (should be "QR"). The guides quote this label, so they are updated with it. | **Fix** |
| R7 | Member → Dashboard | "Next Booking" shows a raw date (`2026-11-04 · 08:00`); everywhere else dates read "Wed 4 Nov". | **Fix** |
| R8 | Member → Dashboard | A second card titled "Target Plan" repeats the subscription card. "Target" suggests a goal that doesn't exist. | **Fix** (rename to "Membership") |
| R9 | Member → Profile | After the QA fixes the "Settings" card contains only Sign Out. | **Fix** (rename "Account") |
| R10 | Member → Workouts | Empty state promises to "build your streak"; there are no streaks. | **Fix** (wording) |
| R11 | Trainer → Schedule | "Manage your classes and personal training sessions": there are no classes and the page is view-only. | **Fix** (wording) |
| R12 | Trainer → Clients | "Manage and track your assigned clients": clients are members who booked; nobody is assigned. | **Fix** (wording) |
| R13 | Trainer → Sessions / Dashboard | "Upcoming" lists are in the order bookings were created, not soonest first (Fri 6 Nov above Wed 4 Nov). "Track attendance and history" wording is off too. | **Fix** (sort upcoming by date and time; wording) |
| R14 | Admin → Trainers | "Manage trainers and their schedules": the page approves trainers and shows availability; it has no schedules. | **Fix** (wording) |
| R15 | Admin → Members | *Withdrawn.* I thought **Record payment** was usable for a deactivated member. It is already disabled, with a tooltip ("Reactivate the account first"). | none |
| R16 | Admin → Members (QA F8) | A long unbroken name stretches the table; emoji and non-Latin names make a broken initial. | **Fix** (wrap the name; take the first whole character) |
| R17 | All pages, accessibility | The sign-out control in the member and trainer layouts is an icon with a click handler, not a button: no keyboard access, no name. The mobile header sign-out button (admin, trainer) and the schedule's previous/next-week buttons have no accessible name. | **Fix** |
| R18 | Login, register, forgot password, admin login, admin settings | `<label>` elements are not linked to their inputs (no `for`/`id`), so clicking the label does nothing and screen readers read only the placeholder. Search boxes and the dashboard period select have no label either. | **Fix** |

### Polish and next steps (not fixed)
| ID | Where | Problem | Why not now |
|---|---|---|---|
| R19 | Admin → Members, Payments (QA F9) | The tables scroll sideways inside their container (about 975 px and 1000 px wide at 375 px), so **Record payment** is several screens away on a phone. | Needs a card layout for phones: a redesign, not a small fix. Front-desk staff should use a laptop or tablet. |
| R20 | Member → Bookings (QA F13) | Every member can read all trainers' emails and phones (the booking cards show the phone number). | Hiding it in the UI wouldn't stop the data being readable; the real fix is in the rules, which are out of scope. |
| R21 | Trainer → Sessions | **Cancel** and **Mark Complete** act at once, with no "are you sure?". | Adding a confirm step changes behaviour. |
| R22 | Member attendance, trainer dashboard / schedule / sessions | These tables and the week grid scroll sideways inside their own container at 375 px (about 680, 480, 800 and 710 px wide). The page itself does not overflow. The attendance table also has a fixed "Main Gym" column. | Cosmetic; needs card layouts. |
| R23 | All pages | The browser tab title is "GYMTRACE" on every page. | Per-page titles need a small helper in every page. |
| R24 | Everywhere | Colour contrast of the grey helper text has not been measured. | Needs a proper audit. |
| R25 | Auth, layouts | No visible keyboard-focus styles were checked beyond the landing menu button. | Needs a keyboard walk. |

### Already fixed during this review (landing page)
The landing page was rewritten to describe the app as a demo project (see the commit "landing: honest demo-project copy"). It no longer claims live occupancy, classes or "thousands of members", no longer shows a stranger's photo, and the footer's dead links are gone. The favicon pointed at a file that didn't exist and now points at the logo. `/guide` no longer links to the repository.

## Phase 2 status

Each fix has a source-level regression test (`tests/unit/refinement.test.mjs`, `display.test.mjs`); the layout fixes were also measured at 375 px in the browser on the local build (emulators + demo data).

| ID | Result |
|---|---|
| R1 | **Fixed.** Reports page no longer overflows at 375 px; the three tabs fit. |
| R2, R3 | **Fixed.** Dead camera button and disabled Previous/Next removed. |
| R4 | **Fixed.** Chips now list the specialties the available trainers really have (e.g. "Personal Training", "Strength & Conditioning"). |
| R5 | **Fixed (wording).** Settings says the general details are stored but not shown anywhere else yet. |
| R6–R10 | **Fixed.** "Generate QR"; next booking reads "Wed 4 Nov"; "Membership" card; "Account" heading; workout empty-state text. The staff guide and demo script use the new label. |
| R11–R14 | **Fixed.** Schedule, clients (including the empty state), sessions and trainers wording; upcoming sessions sorted soonest first on the trainer dashboard and Sessions page. |
| R15 | Withdrawn (not a problem). |
| R16 | **Fixed (F8).** Long names wrap in the Members table; initials use whole characters ("😀L"). |
| R17, R18 | **Fixed.** Sign-out controls are real buttons (or `role=button` with a name and keyboard support) in all three layouts; week buttons named; form labels linked to inputs on login, register, forgot password, admin login, profile and settings; search boxes and the period select have names. |
| R26 | **Fixed.** Trainers can sign out on a phone. |
| R19–R25 | **Not fixed**, listed above as next steps (F9 table layout on phones, F13 needs the rules, confirm steps, per-page titles, contrast and keyboard audits). |

### Not changed
The QR and check-in code (`api/qr-token`, `api/check-in`, the member QR page, the scanner, QR token and attendance logic), `firestore.rules` and API behaviour were not touched in this pass. The admin scanner's phone layout was fixed separately, before this pass.
