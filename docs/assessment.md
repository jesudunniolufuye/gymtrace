# GymTrace: Continue-or-Rebuild Assessment (28 Oct 2026)

## Recommendation (TL;DR)

**Option B (Hybrid). Keep the stack: React + Vite + Tailwind, Firebase Auth + Firestore, hosted on Vercel. Add a small server layer of Vercel serverless functions (`/api`, Node, `firebase-admin`) for the three things a browser must not be trusted with: payments, QR token signing, and check-in verification. Lock down the Firestore rules. Keep ~80% of the UI.**

Why:
- **The UI is mostly there.** All three role portals exist, the build passes, and the site deploys. 6 of 19 FRs work and 9 are partial. Rebuilding that UI is the most expensive part of any rewrite.
- **The security model can't be saved as written.** Every business rule runs in the browser:
  - a member can make themselves admin
  - a member can mark themselves paid
  - anyone can forge a QR code
  - the scanner never checks payment status

  "Continue (A)" would leave FR6, FR10 and FR12 insecure, which is indefensible at a defence. These parts need rewriting, not patching.
- **A rebuild (C) does not fit 2.5 days.** Laravel/Django + MySQL would mean three role UIs, auth, email verification, QR scanning, charts, and free MySQL hosting from zero, plus rewriting thesis chapters 3–4 and every screenshot.
- **Vercel functions are free on Hobby.** Firebase Cloud Functions would need the paid Blaze plan.
- **It's easy to defend.** You get a real "backend business logic" tier (NFR13), and HMAC-signed QR tokens are simple to explain.

---

## 1. Repo map

**Branches**
| Branch | State |
|---|---|
| `feature-login-page` (local + `origin/HEAD`) | Latest. 4 commits after merging PR #1. |
| `origin/segun` | Fully merged into `feature-login-page` (ancestor, verified with `git merge-base --is-ancestor`). Nothing unique, safe to ignore. |

**Deployed:** `gymtrace.vercel.app` returns 200. Its bundle contains strings that only exist in HEAD (`"verification link has been sent"`, `oneTimePass`, `billingHistory`). So **`feature-login-page` HEAD is what's live**, on Firebase project **`gymtrace-fae30`**. You don't control the repo (`Osaseye/GYMTRACE`), the Firebase project, or the Vercel project, so we work on a **fork + new Firebase project + new Vercel project**.

**Structure:** a Vite SPA in plain JavaScript (no TypeScript, no Shadcn, despite thesis 1.4 and 3.11). It has 51 source files and about 6,600 lines.
- `src/services/*`: thin Firestore wrappers.
- `src/pages/{public,auth,member,trainer,admin}`: pages, which also hold most of the business logic.
- `src/context/AuthContext.jsx`, `src/components/shared/ProtectedRoute.jsx`: auth state and UI routing guards.
- Root: `firestore.rules`, `firestore.indexes.json`, `vercel.json` (SPA rewrite), `.npmrc` (`legacy-peer-deps=true` only, no secrets).
- Stray files: `UI/` (3 design PNGs, unused), `gymtrace.md` (previous dev's 12-bug audit; BUG-01–05 are fixed in code), a Vite-template `README.md`, and `package.json` named `"solo-project-1"`.

**Dependencies:** all current majors and not badly outdated. Behind on minors: firebase 12.10 (12.19 latest), react-router 7.13 (7.18). Major versions available but not needed: vite 8, tailwind 4, eslint 10.
- `npm audit --omit=dev`: **7 vulns (2 critical, 4 high)**: protobufjs and websocket-driver (via firebase), react-router, zod, grpc-js. All fixable with in-range bumps (`npm audit fix`).
- **Installed but never imported:** `@tanstack/react-query`, `framer-motion`, `clsx`, `tailwind-merge`, `date-fns`, `react-is`.

**Data model as the code actually uses it (Firestore)**
| Collection | Fields written | Written by |
|---|---|---|
| `users/{uid}` | name, email, role (`member`/`trainer`/`admin`), phone, status, isPremium, createdAt; plus `oneTimePass`, `oneTimePassRemaining`, `planType`, `billingHistory[]` (array of strings like "₦25,000") written by PaymentPage; `plan` written by admin MembersPage | **client** |
| `attendance` | memberId, memberName, checkIn, checkOut, status | **client** (scanner page; member checks out) |
| `bookings` | memberId, memberName, trainerId, trainerName, date "YYYY-MM-DD", time, sessionType, status (`upcoming`/`completed`/`cancelled`), createdAt | client |
| `workouts` | memberId, title, duration, calories, difficulty, date, exercises[] | client |
| `settings/global` | gym settings, maintenanceMode | client (admin) |
| `sessions` | rules + `sessionService.js` exist, but **nothing calls it** | dead |

Notes:
- There is **no payments collection** and **no subscription expiry date** anywhere.
- Subscription status is stored three inconsistent ways: `isPremium`, `planType`, and `plan`.

## 2. Build results (clean copy via `git archive` into the scratchpad; your working tree is untouched)

| Step | Result |
|---|---|
| `npm ci` (Node 22.23) | OK, 365 packages |
| Typecheck | **N/A**: the project is plain JS with no TypeScript |
| `eslint .` | **14 errors, 7 warnings**. Mostly unused vars (AdminLoginPage, ScannerPage, ForgotPasswordPage, RegisterPage, AttendancePage, MemberDashboard, Member/TrainerLayout `isSidebarOpen`). Also `react-hooks/set-state-in-effect` in QRCodePage:38, `only-export-components` in AuthContext:7, and 5 exhaustive-deps warnings. |
| `vite build` | **Passes**. One 1.59 MB JS chunk (442 KB gzip) with a chunk-size warning. |

**Env vars needed** (values come from the new Firebase project; none are invented here):
- Client: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`
- New, server-only: `FIREBASE_SERVICE_ACCOUNT` (JSON), `QR_SIGNING_SECRET`

**External services:**
- Firebase project (Spark/free): Auth with email/password and email verification, Firestore.
- Vercel (Hobby/free).

## 3. Requirements audit

| Req | Status | File(s) | Evidence |
|---|---|---|---|
| FR1 Register name/email/pw/role | partial | RegisterPage.jsx, userService.js | Works, but the client writes `role`. Anyone can register as trainer, or as **admin** by editing the request (rules allow it). |
| FR2 Email/password login | partial | LoginPage.jsx | Login works. **No `emailVerified` check**: user is sent to the dashboard straight after registering. Fails TC1 step 2. |
| FR3 Role-based access | **broken** | ProtectedRoute.jsx, firestore.rules | UI-only guard, and it lets anyone through while `userData` is null (`allowedRoles && userData && …`). Rules let a user rewrite their own `role`. |
| FR4 Logout | works | Member/Trainer/AdminLayout, ProfilePage | All call `signOut`. |
| FR5 Choose monthly vs pay-per-session | partial | PaymentPage.jsx | UI exists. It only flips flags on the user doc, with no expiry. "Next billing date: March 24, 2026" is hardcoded. |
| FR6 Simulated gateway, secure | **broken** | PaymentPage.jsx:30-41 | No gateway step. The browser writes `isPremium: true` directly; any member can do it from devtools. |
| FR7 Payment history | partial | PaymentPage.jsx | `billingHistory` array on the user doc, editable by the user. Display amounts are partly hardcoded (`₦509`). |
| FR8 Unique QR on payment | partial | QRCodePage.jsx:26 | Generated only when `isPremium`, so **pay-per-session users get no QR**. |
| FR9 QR encodes id, date, validation | partial | QRCodePage.jsx:27-31 | Plain unsigned JSON `{userId, timestamp, validity}`, trivially forgeable. |
| FR10 Scan verifies payment status | **broken** | ScannerPage.jsx:26-75 | Looks up the user and logs check-in **without checking any payment status**. Accepts trainer and admin UIDs too. |
| FR11 Log attendance with timestamp | works | attendanceService.js | Uses `serverTimestamp`. But members can also create their own attendance (rules). |
| FR12 Reject expired QR by payment type | **broken** | ScannerPage.jsx:48-51 | Only a 90 s client-side timestamp check, skipped if `timestamp` is missing. Manual ID entry skips it entirely. No subscription expiry exists. |
| FR13 Trainer sets own active/inactive | **missing** | TrainersPage.jsx (admin only) | No trainer-facing toggle. |
| FR14 Book trainers | works | BookingPage.jsx | Filters to `status==='active'` trainers. No past-date check. |
| FR15 No slot locking | works | bookingService.js | No locking logic at all. |
| FR16 Members **and** trainers cancel | partial | SessionsPage.jsx; `cancelBooking` unused | Trainer can cancel. **Member has no cancel UI**. |
| FR17 Admin dashboard (users, payments, attendance) | partial | AdminDashboard.jsx, adminService.js | User/attendance/booking counts and charts exist. **No payment summary**. Several queries need composite indexes that aren't in `firestore.indexes.json`, so they probably fail in production (can't verify). |
| FR18 Admin sees users + subscription status | **broken** | MembersPage.jsx:41,156 | Reads `member.plan`, which payments never write, so everyone shows "Basic". |
| FR19 Workout logs | works | WorkoutsPage.jsx, workoutService.js | Create, list, delete. Validation is a toast for a missing title only (TC3 step 3 wants highlighted fields). |
| NFR1 Secure credential handling | works | Firebase Auth | Hashing is handled by Firebase. |
| NFR2 HTTPS | works | Vercel | Live site is HTTPS. |
| NFR3 Input validation / XSS / injection | partial | zod on auth forms only | React escapes output. No server-side or rules-level validation of document shapes. |
| NFR4 Session tokens | works | Firebase Auth | |
| NFR5 Auth rate limiting | partial / can't verify | none | Only Firebase's built-in `auth/too-many-requests` throttling. Nothing app-side. |
| NFR6 Feedback messages | works | sonner toasts (16 files) | |
| NFR7 Modern browsers | can't verify | | Not cross-browser tested. Standard React, so likely fine. |
| NFR8 Responsive | partial | layouts | Mobile header and bottom nav exist. `isSidebarOpen` is unused (unfinished drawer). Not device-tested. |
| NFR9 Intuitive navigation | can't verify | | Subjective. Layouts look conventional. |
| NFR10 Error handling | partial | pages | try/catch + generic toast everywhere. No error boundary. |
| NFR11 Log critical errors with timestamps | **missing** | | `console.error` only. |
| NFR12 Naming / comments | partial | | Services are commented. Pages are long (up to 500 lines) and have lint errors. |
| NFR13 Modular frontend/backend/db | partial | services/ | There's a service layer, but **no backend logic tier**: business rules live in pages. |

**Tally (19 FRs):** 6 work · 7 partial · 5 broken · 1 missing.

## 4. Security review

**Database rules (`firestore.rules`)**
- **A member can change their own role, payment status, or anything else on their profile.** `users/{uid}`: `allow write: if request.auth.uid == userId || isAdmin()` has no field restriction. One `updateDoc(me, {role:'admin'})` gives full admin.
- The same rule lets a member set `isPremium:true`, `oneTimePass:true`, and edit `billingHistory`.
- **Another user's data:**
  - `users`: any signed-in user can **read every** profile (emails, phones).
  - `attendance`: a member can **create their own check-ins** and update their own records.
  - `workouts`: **any trainer** can edit or delete **any** member's workouts.
  - `bookings`: a member can rewrite any field of their booking (e.g. `status:'completed'`, or `trainerId`).
  - `sessions`: any trainer can write anyone's sessions.
- Register-time escalation: `createUserDoc` writes `role` from the form, and rules allow creating your own doc with any role, including `admin`.

**QR codes**
- Generated in the browser as `JSON.stringify({userId, timestamp: Date.now(), validity:"60s"})`, with no signature.
- Validated **only in the admin's browser**, with a 90 s age check that is skipped if `timestamp` is absent. Manual entry builds `{userId}` with no timestamp, so expiry is never checked.
- Anyone who knows a UID (UIDs are readable by every signed-in user) can print a permanent valid QR.
- Payment status is never checked at scan time.

**Role checks**
- **Only in the UI** (`ProtectedRoute`, the AdminLoginPage role check). Rules use `isAdmin()`/`isTrainer()` via the user doc, but since users can rewrite their own role, these checks mean nothing.
- `ProtectedRoute` also passes when the profile hasn't loaded or doesn't exist.

**Secrets**
- No secrets committed. `.npmrc` only has `legacy-peer-deps=true`. `.env*` is gitignored.
- A full-history grep found no keys, private keys or passwords. Firebase web config comes from env vars (and is public by design anyway).
- Appendix A of the thesis has an empty "Administrator Assessment Credentials" heading, which is good: keep real credentials out of the thesis repo.

## 5. Code quality
- **Type safety:** none. Plain JS, no PropTypes. Field-name drift is already causing bugs (`plan` vs `planType` vs `isPremium`; booking `confirmed` vs `upcoming` in gymtrace.md BUG-01).
- **Duplication:**
  - `memberService`, `trainerService` and `userService` all wrap the same `users` CRUD.
  - `getBookingsByTrainer` is identical to `getTrainerBookings`.
  - Each of the three layouts has its own copy of the sidebar, mobile header and bottom-nav markup.
- **Dead code:**
  - all of `sessionService.js` and the `sessions` rules
  - `cancelBooking`, `getBookingsByTrainer`, `lookupMember`
  - `getAnalytics` initialised but unused (it can also throw where unsupported)
  - 6 unused npm packages
- **Stray files:** `UI/*.png` (design mockups, safe to delete or move to `docs/`), `gymtrace.md` (stale bug list; half fixed), Vite-template README.
- **Structure:** reasonable folders, but pages are fat (PaymentPage 435 lines, WorkoutsPage 501). No tests, no error boundary, no code splitting.
- **Verdict:** messy but readable. Nothing is so tangled that it forces a rewrite. The weakness is *where* the logic lives (in the client), not how it's written.

## 6. Thesis contradictions and features not covered by FRs
1. **Wallet balance and session refunds** (4.2 member portal, TC4 step 2 "refunds the session count to the member's wallet"): no FR, no wallet in the data model, and no session-credit purchase. Recommendation: reword TC4 step 2 to "booking marked cancelled and shown to member", and drop "wallet" from 4.2.
2. **"Sends an alert to the affected member"** (TC4 step 2): no notification FR. Recommendation: in-app status only.
3. **Test cases jump from TC4 to TC7.** TC5 and TC6 are missing, and **no test covers payments (FR5–7) or member booking/cancel (FR14–16)**. We'll write TC5 (Payments) and TC6 (Booking).
4. **Two meanings of "expiry".** TC2 is a short-lived QR token. FR12 is "expired based on payment type", i.e. subscription validity. Both are needed; they're different checks.
5. **FR8 "QR upon successful payment"** vs TC2 "dynamic, time-sensitive QR generated on demand". Reconcile as: QR is available only while a payment is valid, and regenerates every 60 s.
6. **FR10 "gym attendants"** is not a role in 3.2. It's implemented as admin. Either say "admin (acting as attendant)" or add a role (not recommended for the deadline).
7. **3.2 "trainers create and manage time slots, accept bookings"**: no FR covers slots or acceptance, and FR15 says no locking. TC4 has "Mark Complete", which also isn't an FR.
8. **FR1 lets anyone self-register as Trainer.** Recommendation: trainers start `inactive` until an admin approves (consistent with FR13/FR18).
9. **TC2 step 4 manual Member-ID check-in** bypasses QR expiry. It must still check payment status server-side.
10. **TC3 step 2 "Weekly Goal progress bar"** and **TC7 step 1 "active members"** go beyond the FRs. The dashboard counts all members, not active ones.
11. **Stack claims vs reality:** 1.4 and 3.11 say TypeScript + Shadcn; the code is JS + hand-rolled Tailwind. 3.4 calls the architecture "three-tier" but says there's no server.
12. **Copy-paste and placeholders:**
    - The 4.2 Trainer Portal paragraph is a copy of the Member Portal one.
    - 3.11 "External Services" still says "(Keep your existing description here)".
    - 4.1 and every TC claim "SUCCESS" for behaviour the code doesn't have (e.g. TC1 step 2, TC2 step 3).
13. **1.5 excludes group training** while FR15 allows many members per slot. Fine, but worth one sentence.
14. Payment record says `method: 'Paystack'`, but 1.5 explicitly excludes Paystack.

## Option comparison (effort vs deadline)
| Option | Effort | Outcome by Fri 30 Oct |
|---|---|---|
| A Continue | ~1.5 days | Bugs fixed, but payment/QR/check-in stay client-trusted. FR6/10/12 unsafe, and an examiner can break it in devtools. |
| **B Hybrid** | **~2–2.5 days** | Secure core (rules + 3–4 API functions). All FRs met or deliberately scoped. Thesis changes are modest. |
| C Rebuild (e.g. Laravel/MySQL) | 4–6 days | Doesn't fit. Free MySQL hosting is also a hurdle. Every screenshot and chapters 3–4 would change. |

**What would change my mind:**
- **If server-side keys can't be used on Vercel** (no service account allowed): fall back to Firebase Cloud Functions (needs Blaze + card), or to a rules-only design with weaker QR (closer to A).
- **If your supervisor requires PHP/MySQL:** C, but only after the deadline.
- **If the new Firebase project can't be created tonight:** develop against the Firestore emulator and deploy Thursday.

## Target design (Option B)
- **Server tier: `api/*.js` Vercel functions** with `firebase-admin`. Each one verifies the caller's Firebase ID token and reads the role from Firestore server-side.
  - `POST /api/pay`: simulated gateway (validates a fake test card, short delay). Writes `payments/{id}` and updates `users/{uid}.subscription`:
    - monthly: `{plan:'monthly', expiresAt: now+30d}`
    - pay-per-session: `{plan:'session', expiresAt: end of today, credits:1}`
  - `GET /api/qr-token`: if the subscription is valid, returns an HMAC-SHA256-signed token `{uid, exp: now+60s, nonce}`.
  - `POST /api/check-in` (admin only): verifies the signature and `exp`, rejects a reused nonce, re-checks subscription (FR10, FR12), consumes a session credit, and writes attendance with a server timestamp. The manual-ID path uses the same function, minus the token.
  - Every function logs failures to an `errorLogs` collection with a timestamp (NFR11).
- **Firestore rules rewrite:**
  - Users may create their own doc only with `role in ['member','trainer']`, no subscription fields, and trainers forced to `status:'inactive'`.
  - Users may update only `name`, `phone`, and (trainer) `status` (`diff().affectedKeys().hasOnly(...)`).
  - Profiles readable by owner, admin, or anyone if `role=='trainer'`.
  - `attendance`, `payments`, `errorLogs`, `qrNonces`: client write `false`.
  - `bookings`: create only with own `memberId`, `status=='upcoming'`, and an active trainer. Member may only set `cancelled`; trainer may set `completed`/`cancelled`.
  - `workouts`: owner only.
  - Remove the `sessions` rules.
- **Keep:** all layouts and pages, AuthContext, routing, the booking/workout/schedule/clients pages, admin charts.
- **Rewrite:**
  - PaymentPage's payment action and history source
  - QRCodePage token fetch
  - ScannerPage verification
  - firestore.rules
  - MembersPage status column
- **Delete:** `sessionService`, duplicate services, unused deps, `UI/`, `gymtrace.md` (after confirming), template README.
- **Thesis sections to update:**
  - 1.4 iii and 3.11: JS not TS, no Shadcn, add Vercel Functions + firebase-admin + HMAC
  - 3.4: add the serverless API tier, which makes "three-tier" true
  - 3.10: ERD with `payments`, `subscription`, no wallet
  - 3.8 Fig 3.5/3.7: sequence diagrams now go through the API
  - 4.2: new screenshots for Payments, QR, Scanner, Trainer status, Members
  - 4.3: fix TC1/TC2/TC4, add TC5/TC6
  - Appendix A: new URL and demo credentials

## Day-by-day plan (deadline: up and running by end of **Fri 30 Oct**)
Ground rules:
- Work on a new branch (e.g. `secure-core`) in your fork. I never push or merge; you push.
- Vercel builds a preview URL for each push, so there is always a working version to show.
- Firestore rules deploys, seeding demo accounts, and any database writes happen **only after you OK each one** (per your CLAUDE.md).

### Wed 28 evening: setup + Phase 1 (Auth & roles) [MUST]
- **You:**
  1. Fork the repo.
  2. Create a Firebase project (enable Email/Password auth and Firestore).
  3. Create a Vercel project from the fork and add the env vars.
  4. Download the service account JSON.
- **Me:**
  - Save `docs/assessment.md`.
  - `npm audit fix` (in-range bumps), remove unused deps, fix lint errors.
  - Rules v1: users field lock, no self-role, trainers start inactive.
  - Login blocks unverified email (with a resend link); register goes to a "check your inbox" screen.
  - Fix ProtectedRoute's null-profile pass-through and the register/profile race.
  - Seed script for one admin plus demo member and trainer (run only with your OK).
- **Covers:** FR1–4, NFR1, NFR4, NFR5 (Firebase throttling + friendly message), NFR6. **TC1 steps 1–6.**
- **Tests:**
  - Rules unit tests with `@firebase/rules-unit-testing` on the Firestore emulator (Java is installed): member can't set role/subscription, can't read others' profiles, can't create admin.
  - Manual TC1 run.

### Thu 29: Phase 2 (Simulated payments) [MUST] → **first deploy by Thursday midday**, Phase 3 (QR check-in) [MUST]
- **Morning:**
  - Push branch → Vercel preview (Phase 1 live).
  - `api/pay` and the `payments` collection.
  - PaymentPage: plan choice → fake card form → API.
  - History from `payments`. Remove hardcoded dates and amounts.
- **Covers (payments):** FR5–7, NFR3 (server-side validation). **New TC5.**
- **Tests (payments):**
  - Node unit tests for the subscription/expiry calculation.
  - Rules test: client can't write `payments` or `subscription`.
  - Manual: buy a day pass and a monthly plan, history shows both, devtools write is denied.
- **Afternoon:**
  - `api/qr-token` and `api/check-in`.
  - QRCodePage fetches a token every 60 s (works for monthly and day-pass users).
  - ScannerPage calls the API for both camera and manual-ID check-ins.
  - Clear "Invalid or Expired QR Code" / "Member Not Found" / "No active payment" messages.
- **Covers (QR):** FR8–12, NFR11 (errorLogs). **TC2 steps 1–5.**
- **Tests (QR):**
  - Unit tests: token sign/verify, tampered payload, expired `exp`, replayed nonce, expired subscription, consumed day pass.
  - Manual: phone shows QR, laptop scans it. A screenshot older than 60 s is rejected. Manual ID works; a bad ID is rejected.
- **End of Thursday:** deployed preview with Phases 1–3. That is the minimum demoable secure system.

### Fri 30: Phases 4–6, then final acceptance
- **Phase 4: Trainer booking [MUST, small] (morning)**
  - Member "Cancel" button; trainer active/inactive toggle; bookings rules.
  - Delete the `sessions` dead code; add a past-date guard.
  - **Covers:** FR13–16. **TC4 step 1**, TC4 step 2 (reworded), **new TC6.**
  - **Tests:** rules tests (member can only set `cancelled`; can't book an inactive trainer); manual two-member same-slot booking.
- **Phase 5: Workout log [SHOULD, cuttable to rules only] (late morning)**
  - Owner-only rules.
  - Required-field highlighting for exercise name, sets, reps, weight (TC3 step 3).
  - Simple weekly-goal bar.
  - **Covers:** FR19. **TC3 steps 1–3.**
  - **Tests:** rules test (trainer can't edit a member's workout); manual TC3.
- **Phase 6: Admin dashboard & analytics [MUST: FR18 fix + indexes; SHOULD: payment summary chart] (afternoon)**
  - Members page reads `subscription` (plan + expiry).
  - Count active members; payment totals card.
  - Add the missing composite indexes (deployed with your OK).
  - Trainer approval toggle.
  - **Covers:** FR17, FR18. **TC7 steps 1–3.**
  - **Tests:** manual TC7 with seeded data; check the browser console for index errors.
- **Late afternoon:**
  - Full acceptance run of TC1–TC7 on the preview URL, on desktop Chrome/Firefox and a phone (NFR7, NFR8).
  - Fix blockers. You merge to your production branch.
  - Record the URL and demo credentials for Appendix A (kept out of git).

**If time runs out, cut in this order:**
1. Phase 5 extras (weekly goal bar)
2. Phase 6 payment chart
3. Error-boundary polish
4. Trainer approval toggle (seed trainers as active instead)

**Never cut:** Phases 1–3, the FR16 member cancel, or the FR18 status fix.

## Verification summary
- `npm run lint` clean, `npm run build` passes, rules tests and API unit tests pass (`npm test`), before each push.
- Each phase ends with its test cases run manually on the Vercel preview URL.
- Security smoke test at the end: as a member, attempt in devtools to (a) set own role, (b) set own subscription, (c) write attendance, (d) forge a QR from a known UID. All four must fail.
