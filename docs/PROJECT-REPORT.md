# GymTrace: project report

**What this is:** an account of taking over GymTrace, a gym membership, payment and check-in web app for Babcock University Fitness Centre, from a previous developer and bringing it to a working, tested state.
**Period:** Wed 28 Oct 2026, 21:51 → Thu 29 Oct 2026, ~16:00 (37 commits on `rebuild/hybrid`, now also `main`).
**Requirements source:** `docs/thesis.md` (functional requirements FR1–FR19, non-functional NFR1–NFR13, test cases).
**Detailed records:** `docs/assessment.md` (assessment and plans, as written at the time), `docs/production-checklist.md`, `docs/staff-guide.md`.

## Summary

- The inherited app looked complete but trusted the browser for everything that mattered:
  - any member could make themselves an admin
  - any member could mark themselves as paid
  - QR entry codes could be forged
  - the check-in scanner never checked payment
- I kept the existing UI (React/Vite/Firebase) and added a small server layer (Vercel functions) for payments, QR codes, check-in and account management. I rewrote the database rules, and fixed or removed most of the mocked features. A QA pass (`docs/QA-FINDINGS.md`) found leftovers on the member profile page and sidebar (a hardcoded "Premium" plan and expiry); those are now fixed.
- The result runs in two environments, staging and production. It's covered by 155 automated tests plus an end-to-end smoke script that runs against staging. Production holds realistic demo data.

---

## 1. Starting point (commit `8e4d85d`)

A React + Vite single-page app talking directly to Firebase (Auth + Firestore), deployed on Vercel. Screens existed for all three roles (member, trainer, admin).

| Check | Result |
|---|---|
| Build | passed |
| Lint | 14 errors, 7 warnings |
| `npm audit` (production deps) | 7 vulnerabilities (2 critical, 4 high) |
| Automated tests | none |
| Requirements (FR1–FR19) | 6 working, 7 partial, 5 broken, 1 missing (`docs/assessment.md` §3) |

### Security problems (with evidence)

All line references are to commit `8e4d85d`.

| Problem | Evidence | Effect |
|---|---|---|
| A member can make themselves admin | `firestore.rules:26`: `allow write: if isAuthenticated() && (request.auth.uid == userId \|\| isAdmin());` has no field restriction. `RegisterPage.jsx:58` writes `role: data.role` from the form. | One `updateDoc(myProfile, {role: 'admin'})` from the browser console gives full admin rights. Registration could also create an admin directly. |
| A member can mark themselves as paid | `PaymentPage.jsx:39–41`: the browser writes `{ isPremium: true, … }` to the user's own profile with `updateUserDoc(user.uid, updateData)`. There is no payment step. | Free membership from devtools. Payment history was an editable array on the same profile. |
| QR entry codes can be forged | `QRCodePage.jsx:28–30`: the code is plain JSON `{userId, timestamp: Date.now(), validity: "60s"}`, unsigned. | Anyone who knows a member ID (every signed-in user could read all profiles) can print a valid code. |
| Expiry checked only in the browser, and skippable | `ScannerPage.jsx:50`: `if (age > 90)` runs only if a `timestamp` is present; manual entry sends none. | Expired or hand-made codes are accepted. |
| Scanner never checks payment | `ScannerPage.jsx:58`: looks up the user, then `recordCheckIn(uid, …)` straight away. | Unpaid members, trainers and admins are all "checked in". |
| Members can check themselves in | `firestore.rules:32`: attendance create allowed when `memberId == request.auth.uid`. | Attendance records can be fabricated. |
| Role checks only in the UI, with a gap | `ProtectedRoute.jsx:26`: `if (allowedRoles && userData && …)` lets anyone through while the profile is missing or loading. | Admin pages render for non-admins. |
| Over-broad data access | Rules allowed any signed-in user to read every profile (emails, phones); any trainer to edit or delete any member's workouts; any trainer to write any session. | Privacy and integrity problems. |

### Data and infrastructure problems

- **Missing database indexes.**
  - `firestore.indexes.json` defined 5 composite indexes. One was invalid: a single-field `attendance(checkIn)` entry, which Firestore rejects on deploy.
  - Five queries the app ran had no index: member bookings, workout history, weekly workouts, weekly attendance, and the registration-growth chart. On a real database those pages fail. (All 10 indexes the app now needs are defined and deployed.)
- **Subscription status stored three inconsistent ways** (`isPremium`, `planType`, `plan`). The admin Members page read `plan`, which payments never wrote, so every member showed as "Basic" (FR18 broken).

### Mocked or non-functional features

| Where (commit `8e4d85d`) | What it did |
|---|---|
| `PaymentPage.jsx:123` | "Next billing date: March 24, 2026" hardcoded |
| `PaymentPage.jsx:215` | Hardcoded billing address "123 Freedom Way, Lekki Phase 1" |
| `PaymentPage.jsx:72` | "Add Payment Method" form only showed a success toast |
| `QRCodePage.jsx:163` | Status card hardcoded "Active • Gold • Exp 2025" |
| `QRCodePage.jsx:96` | Upgrade button linked to `/member/payment` (no such route), so it bounced to the landing page |
| `BookingPage.jsx:136`, `TrainerDashboard.jsx:88` | Every trainer shown with a "5.0" rating; no ratings exist |
| `SettingsPage.jsx:154`, `:189` | Price fields labelled "$/month" and a "Maintenance Mode" toggle ("Disable access for all users"); neither had any effect |
| Booking | Members could not cancel (FR16); trainers could not set their own availability (FR13) |
| `origin/segun` branch | Mock "Main Balance ₦0.00 / Top Up" wallet. This is the source of the thesis's "wallet" references, which no requirement covers. |

---

## 2. Decisions

**Options considered:** continue and patch (A); hybrid, keeping what's salvageable and rewriting the rest (B); rebuild from scratch (C). See `docs/assessment.md` for the comparison.

**Chose B (hybrid)**, because:
- Most of the UI for all three roles existed and could be kept. That's the most expensive part to rebuild.
- The security problems came from *where* logic ran (the browser), not from tangled code. Patching (A) would have left payment, QR and check-in trusting the browser.
- A rebuild (C) didn't fit a 2.5-day deadline.

**Key technical decisions**

| Decision | Reason |
|---|---|
| Keep React + Vite + Firebase Auth + Firestore | Working UI and auth; no migration risk. |
| Add a server layer as Vercel functions (`api/`) using `firebase-admin` | Payments, QR signing and check-in must not be decided by the browser. Vercel functions are free on the Hobby plan; Firebase Cloud Functions would need the paid Blaze plan. |
| Rewrite `firestore.rules`: least privilege, field-level checks, server-only collections | The rules are the real access control for everything the browser still writes. |
| QR codes = HMAC-SHA256-signed tokens, 60-second expiry, single use | Can't be forged or replayed; verified only on the server. |
| Prices and plan rules live in one shared module (`shared/subscription.js`) | The browser displays and the server enforces from the same code. |
| Card payments are simulated and behind a server switch (`PAYMENTS_SIMULATOR`), off in production | Live payments were out of scope; production takes payments at the front desk instead. |
| Two environments: staging (`gymtrace-staging`, Vercel preview of `rebuild/hybrid`) and production (`gymtrace-prod`, `main`) | Test on staging first; production only moves forward (fast-forward) after tests pass. |
| Deactivate accounts instead of deleting them | Payment and attendance records must survive; deletion left working logins with no profile. |

---

## 3. What was built

### Architecture

```
Browser (React SPA)
 ├─ Firebase Auth (email/password, email verification, password reset)
 ├─ Firestore directly, for ordinary reads/writes, enforced by firestore.rules
 └─ /api (Vercel functions, firebase-admin), for anything that grants access or money
      ├─ POST /api/pay                        simulated card payment (switchable)
      ├─ GET  /api/payment-options            which checkout to show
      ├─ POST /api/admin/record-payment       cash / bank transfer at the front desk
      ├─ POST /api/qr-token                   signed 60-second entry code
      ├─ POST /api/check-in                   verify code or manual entry, payment, account; log attendance
      └─ POST /api/admin/set-account-status   deactivate / reactivate
Every API call verifies the Firebase ID token (including revocation), the verified email,
the profile, the role, and whether the account is deactivated. Roles come from the
server-side profile, never from the request.
```

### By area

- **Authentication and roles (FR1–FR4).**
  - Email verification is required before login.
  - Self-registration can only create a member, or a trainer who starts unapproved.
  - The route guard no longer lets users through with a missing profile.
  - Forgot password doesn't reveal whether an account exists.
- **Payments (FR5–FR7).**
  - Simulated card checkout: test cards, Luhn/expiry checks, only brand and last 4 digits stored, double-submit protection.
  - Admin "Record payment" for cash and bank transfer: reference, a required note when the amount differs from the price, and the staff member who recorded it.
  - Printable receipts, member payment history, and an admin Payments page with daily and monthly totals per method.
  - Day pass = one entry until midnight Lagos time. Monthly = 30 days; renewing early extends from the current expiry.
- **QR check-in (FR8–FR12).**
  - Signed tokens that renew automatically on the member's phone.
  - Server-side check-in, by camera or by manual email/ID.
  - Payment and plan checks, day pass used up on entry, replayed codes refused, repeat scans within 5 minutes not charged again.
  - Attendance can only be created by the server.
- **Booking (FR13–FR16).**
  - Trainers switch their own availability; the rules allow them to change only that field.
  - Only approved, available trainers can be booked.
  - Members see and cancel their upcoming sessions; trainers complete or cancel theirs.
  - No bookings in the past.
- **Admin (FR17–FR18).**
  - Dashboard counts mean what they say: members with an active plan, bookable trainers.
  - The Members page shows each member's real plan and expiry.
  - Deactivate/reactivate: disables the login, ends sessions immediately, and is refused by the rules.
  - Each admin's own name appears on receipts.
  - Prices are shown read-only.
- **Other.**
  - Privacy notice (example organisation details, labelled as such).
  - The broken upgrade link and the dead privacy/terms links fixed; fake ratings and mocked values removed. The member profile page and sidebar still showed a hardcoded "Premium" plan until the QA pass (F1) caught it; they now show the real plan. The landing page footer still has placeholder links.
  - Dependencies trimmed (5 unused packages removed) and audit-fixed for the browser bundle.
- **Operations.**
  - `scripts/seed.mjs`: admins with random passwords, guarded by project id.
  - `scripts/seed-demo.mjs`: realistic demo data.
  - `scripts/smoke-daily-loop.mjs`: end-to-end check (emulator or staging; refuses production).
  - Docs for staff, production readiness, and this report.

---

## 4. How it's tested

| Suite | Count | What it covers | Command |
|---|---|---|---|
| Unit | 55 | Plan and expiry rules (incl. Lagos midnight), card validation, QR signing (tamper, expiry, wrong secret, malformed), plan summary text, QR refresh decisions, name validation | `npm run test:unit` |
| Firestore rules | 45 | Who can read and write what, on the emulator | `npm test` |
| API | 55 | Each endpoint against the Auth + Firestore emulators with real ID tokens: auth, roles, validation, idempotency, plan rules, replay, revocation, deactivation | `npm test` |
| Smoke (end to end) | 28 checks on staging (29 with the simulator off) | The daily loop over real HTTP with the browser SDK, so rules apply: register → verify → admin records payment → receipt/history → QR → check-in → replay refused → deactivate/reactivate → booking/availability/cancel | `npm run smoke` (see the script header for staging) |

**The rules tests catch the original holes.** Running the same 45 rules tests against the original `firestore.rules` (`npm run test:old-rules`): **28 fail**. These are security failures:
- "member CANNOT make themselves admin"
- "cannot self-register as admin"
- "member cannot grant themselves a subscription"
- "member cannot check themselves in"
- "member reads own profile, not other members"
- "member cannot list members"
- "member cannot read others' attendance"
- "owner can log; trainer cannot edit or delete it"
- "member may only cancel; trainer may complete"

The remainder test features that didn't exist (deactivation, trainer availability).

**Other checks**
- **Browser checks:** every feature built in this project was clicked through on the local emulator, and the main flows on the deployed staging site, with a person typing real logins: registration, verification email, admin recording a payment, receipt, history, QR.
- **Process:** each change was tested, pushed to `rebuild/hybrid` (staging), and production (`main`) fast-forwarded only after the suite passed. Database rules and indexes were deployed to staging before production.
- **Final state:** lint 0 errors (5 warnings in untouched pages), build passing, all suites passing.

---

## 5. Requirements status now

| Area | FRs | Status |
|---|---|---|
| Accounts and access | FR1–FR4 | Working |
| Payments | FR5–FR7 | Working (simulated card on staging; cash/transfer recording everywhere) |
| QR check-in | FR8–FR12 | Working (FR10's "attendant" is the admin role) |
| Booking | FR13–FR16 | Working |
| Admin | FR17–FR18 | Working (payment summaries as totals, not charts) |
| Workouts | FR19 | Working; the form only requires a title (thesis TC3 step 3 expects every field to be highlighted) |

NFRs: HTTPS, Firebase-managed credentials and sessions, server-side validation, error logging (`errorLogs`), clear user messages. Auth rate limiting is Firebase's built-in throttling only (NFR5).

## 6. Known limits and next steps

- **Admins can write some profile fields directly (QA F3).** The rules let an admin account update any field on a user profile, including `subscription`, `role` and `status`, without a payment record. Members and trainers cannot. The payments collection is protected from everyone, but a stolen or misused admin session could grant a plan with no audit trail. Tightening this so only the server changes those fields is a next step; the rules were deliberately not changed in the QA fix batch.
- **Found by the QA pass and not fixed** (details and repro steps in `docs/QA-FINDINGS.md`):
  - F5/F6: booking and workout rules don't validate content (past or junk dates, very large strings); the checks are UI-only. No money or access impact.
  - F10: two admins can deactivate each other and lock everyone out; recovery needs the developer.
  - F12: attendance records stay "Active" unless the member checks out.
  - F8, F9: long names stretch admin tables; the Members table needs sideways scrolling on a phone.
  - F13: members can read trainers' email and phone.
  - F14: reusing an idempotency key with a different body returns the first payment.
  - F15, F16: a monthly plan bought after a day pass loses the day pass; a late-bought day pass is worth only the time until midnight.
  - Also remaining from F7: the rules still accept a two-space profile name (the app now refuses it).
- **No way to void a recorded payment** in the app. Staff must note the receipt number and tell a manager.
- **All staff are full admins**; there's no separate attendant role.
- **A shared QR code** could be used once by someone else within its 60 seconds. Staff compare the name on screen with the person, and check ID cards for manual check-in.
- **Production emails land in Gmail spam** (Firebase's default sender). A custom sender domain is needed (`docs/production-checklist.md` §6).
- **Hosting:** the API runs in Vercel's `iad1` (US East). Commercial use would need Vercel Pro. Backups need Firebase Blaze.
- **Housekeeping:** 5 lint warnings in untouched pages, a 1.8 MB JavaScript bundle (no code-splitting), the unused `sessionService.js`, and the stale `gymtrace.md` / `UI/` folder.
- **Real payments (Paystack):** a design is written up in `docs/production-checklist.md` §8, reusing the existing payment transaction. Estimated 1–2 days.
- **Thesis inconsistencies** found during the assessment are listed in `docs/assessment.md` §6: wallet references, the missing TC5/TC6, the stack described as TypeScript/Shadcn.
