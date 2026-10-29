# GymTrace: adversarial QA findings (Phase 1, report only)

**Date:** Thu 29 Oct 2026 · **Commit tested:** `7e7c82f` (`rebuild/hybrid`; production `main` is `fb80feb`, which differs only by docs)
**Scope:** local emulator and staging freely; production **read-only** (pages, unauthenticated API calls, a read-only look at the demo data; no writes, no seed).
**Nothing was fixed.** The only repo change is `scripts/qa-probe.mjs`, the probe script behind most of the evidence below.

## Status after the fix batch (29 Oct)

| Finding | Status |
|---|---|
| F1, F2, F4, F7 | **Fixed** with regression tests (see git log). F7 is client-side only: the rules still accept a two-space profile name. |
| F3 | **Documented** in README, PROJECT-REPORT, QA-PREP; rules unchanged, tightening is a next step. |
| F11, D1, D2, D3 | **Docs updated** (`staff-guide.md`, `DEMO-SCRIPT.md`). |
| D4 | Still a to-do for the user (set the demo passwords). |
| F5, F6, F8-F10, F12-F17 | **Not fixed**; listed under known limits in `PROJECT-REPORT.md` §6. |

## Summary

- **Blockers: 0.** No way found to get free entry, forge or replay a QR code, escalate a member to admin, or read another member's data.
- **Major: 3**, **Minor: 14**. Several of these contradict statements in my own docs (README, `PROJECT-REPORT.md`, `QA-PREP.md`), which is itself worth fixing before your boss reads them.
- Everything on the demo-script walkthrough behaved as written, except four small mismatches (D1–D4).

| ID | Sev | One line |
|---|---|---|
| F1 | major | Member profile page and sidebar still show hardcoded "Premium" plan and "Expires Dec 31, 2024" |
| F2 | major | One failed QR refresh wipes a still-valid QR code and never retries |
| F3 | major | Admins can write `subscription`, `role` and `status` directly, which contradicts the docs |
| F4 | minor | `record-payment` returns 500 for plan names such as `constructor` |
| F5 | minor | Booking rules accept past dates, junk values, 100 KB strings and spoofed names |
| F6 | minor | Workout rules accept junk and ~750 KB documents |
| F7 | minor | Name validation mismatch: registration shows a generic error; profile edit allows a blank name |
| F8 | minor | Long names stretch the admin table; emoji names get broken initials |
| F9 | minor | Admin Members table needs ~5 screens of sideways scrolling on a phone |
| F10 | minor | Two admins can deactivate each other and lock everyone out |
| F11 | minor | "Already Checked In → let them in" weakens the shared-QR control |
| F12 | minor | Attendance records stay "Active" forever unless the member checks out |
| F13 | minor | Any member can read email and phone of every trainer, including unapproved ones |
| F14 | minor | Same idempotency key with a different body silently returns the first payment |
| F15 | minor | Buying monthly right after a day pass replaces the day pass without credit |
| F16 | minor | A day pass bought late in the day is worth only the minutes left until midnight |
| F17 | minor | Landing page footer still has placeholder links |
| D1–D4 | doc | Demo-script mismatches |

---

## Major

### F1: Hardcoded "Premium" on the member profile page and sidebar
- **Steps:** log in as any member (even one with no plan, e.g. a new sign-up) → open **Profile**, or look at the sidebar.
- **Expected:** the real plan and expiry (or "No active plan").
- **Actual:** `ProfilePage.jsx:67` shows "Premium Plan", `:150–153` shows **"Premium Membership, Expires Dec 31, 2024"** with a dead "Manage Subscription" button; `MemberLayout.jsx:93` shows "Premium Member" in the sidebar for everyone. The Notifications/other settings toggles on that page are static `div`s that do nothing.
- **Evidence:** read from the code; confirmed in the browser as the demo member (profile text starts "…Premium Plan Edit Profile…" on a monthly plan). `PROJECT-REPORT.md` claims "fake ratings and mocked values removed"; this was missed.
- **Why major:** it's visible to every member, contradicts the plan shown on the dashboard, and it's exactly the kind of leftover mock the report says was cleaned.

### F2: A failed QR refresh destroys a still-valid code and does not retry
- **Steps:** member QR page with a code showing → lose connectivity (I made `fetch` reject) → tap **New Code Now**, or wait for the automatic refresh 5 s before expiry.
- **Expected:** keep showing the current code until it really expires; retry in the background.
- **Actual:** the code disappears immediately ("Network error. Check your connection and try again. Try Again"), even though it had up to ~50 s left. Restoring the network does not recover it: 6 s later still on the error screen. A **Try Again** tap is needed, and the member must do it at the desk.
- **Evidence:** browser run on the emulator (`QRCodePage.jsx`: on any error `setQr(null)` and `expiresAtRef = null`, which also stops the refresh loop).
- **Why major:** gym Wi-Fi/mobile data is flaky; this is the front-desk moment.

### F3: Admin accounts can write `subscription`, `role` and `status` directly, so the docs overstate the protection
- **Steps:** as an admin user (browser SDK or REST with an admin token), update another user's document.
- **Expected (per README, `PROJECT-REPORT.md` §2–3, `QA-PREP.md` Q3):** "the browser can't write those fields; only the server can".
- **Actual (emulator, current rules):** an admin can set a member's `subscription` to a plan to 2030 with no payment record, promote any member to `admin`, and set a disabled user's `status` back to `active` without enabling the login (inconsistent state). Rules `users`: `allow update: if isAdmin() || …` has no field restriction for admins. Payments are protected (admin delete and payment writes were refused); attendance create is refused; admin update/delete of attendance is allowed by the rules (read, not exercised).
- **Why major:** not a hole for ordinary members, and it's consistent with "admins are trusted". But a stolen or misused admin session can mint paid plans with no audit trail, and the documentation says otherwise. Either restrict admin writes on those fields in the rules, or correct the docs.

---

## Minor

### F4: `record-payment` returns HTTP 500 for plan names that are properties of `Object`
- **Steps:** as admin, `POST /api/admin/record-payment` with `plan` = `constructor` (also `__proto__`, `toString`, `valueOf`, `hasOwnProperty`), valid other fields, a note.
- **Expected:** 400 "Choose a valid plan." **Actual:** 500 "Something went wrong on our side" and an `errorLogs` entry (`TypeError: … reading 'toLocaleString'`). `POST /api/pay` with the same values returns **409** "Unknown plan." (wrong status: should be 400). Nothing is written to payments or the member.
- **Cause (reading the code):** `PLANS[body.plan]` is a lookup on a plain object, so inherited properties pass the "is it a plan" check. Admin-only reach; harmless apart from log noise and a wrong status code.

### F5: Booking rules don't validate the booking contents
- **Steps (emulator, as a verified member, direct Firestore writes):** create bookings with `date: "AAAAAAAAAA"`, `date: "2001-01-01"`, `time: "not a time"`, a 100 KB `sessionType`, and spoofed `memberName: "Gym Owner"`, `trainerName: "Famous Trainer"`.
- **Expected:** refused (the booking page refuses past dates).
- **Actual:** all **ALLOWED**; the "no bookings in the past" rule exists only in the UI. The rules only check types/length of date (10) and time (≤10), the trainer's role/status/availability, and that `memberId` is the caller. A hostile member could also create unlimited bookings. Impact: junk on the trainer's pages, storage abuse; no money or access impact. (Not allowed: reading others' bookings, un-cancelling, cancelling twice, changing `trainerId`: all verified refused.)

### F6: Workout rules accept junk and very large documents
- Verified member can create a workout with 50 exercises of 15 KB each (~750 KB) and with `duration: {}`, `difficulty: 5`, `date: "1900-01-01"`. Only `title` (≤100) and `exercises` count (≤50) are checked. Same class as F5.

### F7: Name validation is inconsistent between registration, profile and rules
- **Registration:** a 90-character name or a whitespace-only name passes the form (min 2 chars, no max, no trim) but is refused by the rules (2–80 after trim) → the user sees only the generic **"Registration failed. Please try again."** with no hint. (The half-created auth account *is* cleaned up: verified no orphan.) Unicode and emoji emails are rejected with a clear message; `a b"c@…` too.
- **Profile edit:** a name of two spaces is **accepted** by the rules (size ≥ 2 without trimming) → blank name displayed.

### F8: Long and exotic names in the admin lists
- A 75-character name with no spaces made the Members name cell **968 px** wide (no wrap/truncate), so the table needs even more sideways scrolling. An emoji name ("😀 <b>Bold</b> & …") renders its avatar initials as a broken character (`�<`), because the code takes the first UTF-16 unit. Markup in names is displayed literally and **not** executed (no XSS).

### F9: Admin Members table on a phone
- At 375 px the table's content is 1629 px wide in a 326 px window, so the **Record payment** and **Deactivate** buttons (last column) are about five screens of sideways scrolling away. The staff guide suggests the scanner is used on a phone; recording payments realistically needs a laptop/tablet. Other admin, trainer and member pages show no horizontal overflow at 375 px (tested all routes; see "Tested").

### F10: Two admins can deactivate each other and lock everyone out
- **Steps:** two admins call `set-account-status` (`deactivate`) on each other at the same moment. Both return 200 and both profiles end up `disabled` (emulator). Self-deactivation is blocked, but there is no "last active admin" protection, and an admin can deactivate every other admin.
- **Recovery** needs the developer (seed script with the service-account key). Low likelihood, high impact.

### F11: "Already Checked In: let them in" makes a shared code harder to spot
- A member can mint several live codes (each valid 60 s, each single-use). A second scan of the same member within 5 minutes returns **"Already Checked In"** (amber), and `docs/staff-guide.md` says to let them in. So a friend using a second code within 5 minutes of the member's own entry is waved through. It's the already-documented "sharing" limit, but the staff-guide wording makes it worse; it should say to check the person matches the name.

### F12: Attendance stays "Active" forever
- The scanner creates records with `status: "Active"`; only the member's own **Check Out** button closes them. Nobody is told to, so real-use records stay Active indefinitely (the demo data sets them Completed, so you won't see this there). Cosmetic for access, but it skews attendance durations.

### F13: Members can read every trainer's email and phone, including unapproved/deactivated trainers
- Needed for booking, but the rule is `role == 'trainer'` for any verified user. Verified in the emulator. Privacy note (the privacy notice says trainers' data is limited to bookings).

### F14: Same idempotency key + different request body returns the first payment
- `record-payment` with a reused key but a different plan/amount returns **200 with the first payment** (e.g. "Monthly ₦25,000") and records nothing new. The UI creates a new key per attempt, so only API clients can hit it. Should be 409/422.

### F15: Monthly right after a day pass discards the day pass
- Day pass (credit 1) then monthly: subscription becomes `monthly`, credits `0`. The ₦500 entry is not carried. Harmless for access (monthly covers entry), a small money-value question.

### F16: Day pass worth is the time left until Lagos midnight
- Verified at the boundary: bought 1 ms before midnight → valid 1 ms; at exactly midnight → 24 h. As designed and written on the plan card ("until midnight"), but a pass bought at 23:30 gives 30 minutes with no warning. Monthly boundary is correct (active at day 30 − 1 ms, expired at day 30).

### F17: Landing page footer has placeholder links
- Known (listed in the report): Features/Pricing/API/Careers/Blog/social links go to `#`.

---

## Demo-script mismatches

- **D1.** §7:30 "**Bisi: Sessions shows the cancellation**": the trainer **Sessions** page opens on **Upcoming**; the cancelled session is under the **Cancelled** tab, and it only appears after a reload.
- **D2.** §7:30 "Tolu → Bookings: Bisi is no longer listed": the booking page loads trainers once on open. If the page was already open it needs a reload to reflect the change.
- **D3.** Rehearsal side effects: manual check-ins consume Aisha's day-pass entry and add attendance rows that survive a re-seed; re-running the same check-in within 5 minutes shows **"Already Checked In"** instead of the messages the script lists. Re-seed between rehearsal and the live demo and don't rehearse the last step minutes before.
- **D4.** The two demo log-ins have **never signed in** (`lastSignIn: never` in production): their passwords must be set via Forgot password (production emails go to spam), as the script already says.

Verified as written: every manual check-in message (Tolu granted; same code again "already been used"; Aisha granted → "Day pass used"; Ibrahim "already been used"; Daniel/Temitope "expired"; Halima "Account deactivated. Entry refused."; unknown email "Member Not Found"), the console snippet (4 attacks 403, name change 200), `npm run demo:old-vs-new` output, dashboard counts, trainer states.

---

## What passed (hostile-user attempts that failed, as intended)

- **Privilege escalation:** member cannot set `role`, `status`, `subscription`, `available`; cannot create admin/trainer-active profiles; cannot read others' profiles, payments, bookings, attendance; cannot create attendance or payments (browser console on the emulator and rules tests).
- **Endpoint × role matrix** (`/api/qr-token`, `pay`, `record-payment`, `check-in`, `set-account-status`; actors: no token, member, trainer, admin, unverified, deactivated member, deactivated admin, garbage token): every unauthorised combination returned 401/403; only the intended role got 200. `payment-options` is public by design.
- **QR tokens:** forged signature, unsigned legacy JSON, expired (>60 s), malformed/oversized tokens rejected; the same token sent six times in parallel → one 200, five 409, **one** attendance record.
- **Races:** six parallel scans with *different* tokens against a 1-entry day pass → one attendance record, credits 0, no double charge; six parallel payments with the same key → one payment; four parallel payments with *different* keys all succeed (120 days; by design, since keys are per attempt).
- **Tampered bodies:** amounts −5, 0, 1e7+1, 25000.5, `"25000"`, `null`, 2^53 → 400 with the field named; `amount: 1` accepted only with a note (by design); wrong plan names handled (except F4); wrong methods → 405; non-JSON/array bodies → 400.
- **Boundaries:** day-pass and monthly boundaries (F16); deactivate twice, reactivate an active user, deactivate self (400); payment for a deactivated member refused.
- **UI:** back button after logout redirects to `/login`; direct protected URLs while logged out redirect; camera permission denied shows a clear message and manual check-in still works; markup in names is not executed; unicode/space emails rejected with a clear message.
- **Real Firestore (staging):** all 17 query shapes the app uses run without a missing-index error, so the report's index claim holds.
- **Production (read-only):** all public pages 200; unauthenticated API calls 401/403 (wrong method 405); `payment-options` reports the simulator off; demo data present and consistent (21 users, 17 payments, 63 check-ins, 16 bookings, 18 workouts; plan states 8 active monthly / 1 active day pass / 1 used / 3 expired / 2 none / 1 deactivated); `errorLogs` empty.

---

## What I did NOT test

- **Production while logged in:** no passwords for the demo accounts, and I'm not writing there. The console snippet was run on the emulator against both rule sets, not on production (only confirmed production returns a clean 403 to unauthenticated Firestore calls from its own origin).
- **Real camera/phone scanning**, and the phone-to-laptop QR flow. The automated browser has no camera; only the denied-permission path was simulated.
- **Real email delivery** (verification/reset) on staging or production, and the reset link landing on `/login?reset=1` in a real inbox.
- **Phone width was emulated** with a 375 px iframe, not a real device or touch interaction; no landscape, tablet, or Safari/Firefox/Edge runs.
- **Vercel-specific behaviour:** cold-start latency, the function region vs Firestore location, request-body size limits (the 16 KB guard only applies to the local server), concurrency limits. Race tests ran against the emulator's transactions, not Firestore at scale.
- **Offline/slow network** beyond forcing `fetch` to fail on the QR page; no throttled-network run of other pages.
- **Printing/PDF output** of receipts; accessibility (keyboard, screen reader, contrast); time-zone behaviour on a device not set to Lagos; clock skew; a live midnight rollover; session expiry after an hour idle.
- **Load/volume** (admin pages read whole collections), data migration, backup/restore, and the Paystack design.
- **Scheduled/long-lived behaviour** such as the `qrNonces` TTL (not configured).
- **Security depth:** no dependency/CVE re-audit (the last `npm audit` re-run failed), no pen test, no review of Vercel/Firebase console configuration (e.g. authorized domains, key restrictions).

## Suggested order for Phase 2 (your call)

1. **F1** (visible leftovers), **F2** (QR refresh), **F3** (restrict admin field writes, or fix the docs), then the doc fixes **D1–D4** and the wording in F11.
2. Cheap, low-risk next: **F4**, **F5/F6** (add field checks to the rules), **F7**, **F14**.
3. Leave as documented limits unless you want them: F9, F10, F12, F13, F15, F16, F17.
