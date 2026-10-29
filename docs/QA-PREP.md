# GymTrace: Q&A prep

The 15 hardest questions a senior engineer is likely to ask, with answers taken from the code and `docs/PROJECT-REPORT.md`. Where something is a known limit, the answer says so. Don't claim more than these answers do.

---

### 1. Why keep the existing stack instead of rebuilding?
The UI for all three roles existed and worked. The problems were about *where* logic ran (the browser), not how the code was written. Patching would have left payment and entry trusting the browser; a rebuild didn't fit a 2.5-day window. So: keep React/Vite/Firebase, move the trust-critical parts to a server, rewrite the rules. The cost of that choice: I inherited a plain-JS codebase with long page components and no types, and 5 lint warnings in pages I didn't touch.

### 2. Why serverless functions, and why Vercel's rather than Firebase's?
I needed *some* server: prices, payments, QR signing and check-in can't be decided by the client. Firebase Cloud Functions need the paid Blaze plan; Vercel functions were already part of the deployment. The trade-offs, honestly:
- Functions run in Vercel's `iad1` (US East). I haven't confirmed where Firestore lives, so each API call may cross an ocean.
- Cold starts add latency to the first check-in after idle.
- Commercial use would require Vercel Pro, because Hobby forbids it.
- Code is split between `api/` and Firestore rules, so there are two enforcement layers to keep consistent.

### 3. How do the Firestore rules and the API divide responsibility?
The browser still reads and writes Firestore directly for ordinary things (own profile name/phone, bookings, workouts), and the rules constrain it field by field. Anything granting access or recording money (payments, subscriptions, attendance, QR nonces, deactivation) is `allow write: if false` for clients and is written only by the API via `firebase-admin`, which bypasses rules. One exception, found in QA (F3): the `users` rule lets an **admin** account write any profile field directly, including `subscription`, `role` and `status`, with no payment record. Members and trainers can't. Restricting that to the server is a next step. The risk is the usual one: the API is trusted code, so a bug there isn't caught by the rules. That's why the API routes through shared helpers (`requireUser`, `commitPayment`) with tests per endpoint.

### 4. How does the QR code stop screenshots?
Partly. Each code is `GT1.<payload>.<HMAC-SHA256 signature>`; the payload carries member id, a random nonce, and a 60-second expiry. The server verifies the signature before trusting anything, rejects expired codes, and burns the nonce in the same transaction as the check-in, so a code works once. So a screenshot taken yesterday fails; a screenshot used a second time fails.

What it does **not** stop: a member sending a live screenshot to a friend within the same minute. The code isn't bound to a device or face, so the first scan wins. Mitigation is procedural: the scanner shows the member's name, staff compare it to the person, and manual check-in requires seeing the student ID. The thesis (1.5) already says the QR model "minimizes but cannot prevent" sharing.

### 5. What breaks if the API is down?
- **Stops working:** check-in (camera and manual), QR generation, recording payments, deactivation, and (on staging) card payment. In effect the front desk can't admit anyone through the app.
- **Still works:** login, viewing plans/payments/receipts/attendance, booking and cancelling sessions, workout logs, admin lists, because those go straight to Firestore.
- **No fallback exists:** there's no offline mode or paper-override workflow in the app. A real deployment would need a documented manual procedure (staff check ID and the plan on the Members page). If Firestore itself is down, nothing works.

### 6. What's insecure or weak that remains?
Known, not fixed:
- A live QR can be passed to someone else within 60 seconds (Q4).
- Admin accounts can write `subscription`, `role` and `status` on any profile directly (QA F3), bypassing the payment record. Not reachable by members; a stolen admin session could grant a plan with no audit trail.
- Booking and workout rules don't validate content (QA F5/F6): a member can store junk dates or very large strings in their own records. No money or access impact.
- Every staff member is a full admin: they can record payments, deactivate accounts and see all data. There's no attendant role and no approval step.
- A mistaken payment can't be voided in the app; recorded cash/transfer payments rely on staff honesty (each is attributed to the recording account).
- No rate limiting on our own API beyond Firebase Auth's built-in throttling; no App Check; no CAPTCHA on registration.
- The one service-account key per environment lives in Vercel env vars. If it leaks, an attacker has full database access; there's no key rotation process beyond the manual one in the checklist.
- Any signed-in, verified user can read every trainer profile (needed for booking), including emails and phones.
- Dependency audit: I applied the non-breaking fixes. The last successful audit still listed advisories in nested Firebase dependencies (`@grpc/grpc-js`, `uuid`) that need breaking upgrades; the final re-audit failed (registry error), so the current count is unverified.

### 7. How do you know the rules are right?
45 rules tests on the Firestore emulator cover who can read/write what. The meaningful check: the same suite run against the *original* rules (`npm run test:old-rules`) fails 28 tests, including "member cannot make themselves admin". That shows the tests detect the old holes, not just that new rules pass. Limits: tests are written by me, from my understanding of the threats; rules tests can't prove there's no path I didn't think of, and there's no independent security review or penetration test.

### 8. What happens with concurrent requests, e.g. two scans at once or a double-clicked payment?
- **Payments:** the document id is `memberId_idempotencyKey` and is created in a transaction with the subscription update; a retry with the same key returns the first result rather than charging twice (tested).
- **Check-in:** nonce burn, day-pass credit decrement and attendance write happen in one Firestore transaction, so two scans of the same code can't both succeed (tested for replay). The "already checked in within 5 minutes" check is read inside the same transaction.
- **Gap:** manual check-in has no nonce, so two staff members entering the same member at the same instant are protected only by that transaction and the 5-minute duplicate window, not by a unique constraint.

### 9. Why are the prices hardcoded rather than configurable?
Because the previous editable price fields did nothing (and said "$"), and an editable price in the database would be a new thing the rules and API must protect. The prices live in `shared/subscription.js` and are used by both browser and server. The cost: changing a price needs a code change and deploy. A price-setting screen for admins, with the server reading it, is a reasonable next step; I didn't build it.

### 10. Why is payment "simulated", and what would real payments take?
The thesis explicitly excludes live gateways (delimitation iv). The simulator is behind a server switch that is **off unless `PAYMENTS_SIMULATOR` is exactly `enabled`**, so a missing or misspelt variable fails safe; production runs with it off and payments are recorded at the front desk. For Paystack, the design is in `docs/production-checklist.md` §8: initialize on the server, confirm via a signed webhook plus a verify call, then reuse the existing `commitPayment` transaction. Designed, not built or tested.

### 11. What does the testing *not* cover?
- **No automated UI tests.** Screens were checked by hand in a browser and by the smoke script, which drives the real API and Firestore rules but not the React components.
- **Camera scanning** was never tested by the automated browser (no camera). The camera submits the same request I tested directly, but a real phone-to-laptop run is the only proof.
- **Production behaviour:** the smoke script deliberately refuses to run against production, so production was checked by reading it, not by end-to-end test.
- **Load:** nothing was load tested. Some admin pages read whole collections (dashboard counts read all members and bookings), which is fine for hundreds of members and wouldn't scale to many thousands.
- **Cross-browser/mobile:** checked in Chrome; not systematically on Safari/Firefox/phones.

### 12. How is data protected and what about privacy?
Passwords are handled by Firebase Auth; card details never reach us (simulator stores brand and last 4 only). The rules limit who reads what: members see their own data; trainers see their bookings, not payments or workouts. There's a privacy notice, but its organisation details are labelled examples, no legal review has happened, and there's no tool to delete a person's data on request: deactivation keeps records. Demo data in production uses `example.edu` addresses and random passwords.

### 13. Production holds demo data. Is it safe to show?
Yes with caveats. Production (`gymtrace-prod`) has seeded demo members and trainers tagged `demo: true`, with random unknown passwords except the two demo log-ins. Anything created during a demo stays. The seed script is idempotent for demo ids and guarded by `SEED_PROJECT` so credentials for one project can't seed another. Production emails (verification, reset) land in Gmail spam, so check spam first.

### 14. What did you get wrong or have to correct along the way?
Worth owning, because it shows how the work was checked:
- I reported "lint clean" twice from the last line of output while errors were above it; fixed and re-verified.
- Looking at realistic data exposed bugs I'd missed: paused trainers counted as bookable, and a second fake "Rating 5.0".
- Missing indexes were found by reading every query, not by running them: the emulator doesn't enforce indexes, so they were only truly verified once deployed to staging.

### 15. What would you do next, in order?
1. **Void/correct payment** (manager-only, keeps the record, reverses plan time): the biggest operational gap.
2. **Attendant role** with fewer powers than admin, and an audit view of who did what.
3. **Rate limiting / App Check** on the API and registration.
4. **Real device test of camera scanning**, plus a manual fallback procedure for API outages.
5. **Paystack** per the written design, with webhook tests.
6. **Admin-editable prices** read by the server.
7. **Housekeeping:** align Vercel's region with Firestore, TTL on `qrNonces`, split the 1.8 MB bundle, add an error boundary, clear the remaining lint warnings and stale files (`gymtrace.md`, `UI/`), add a few UI tests.
8. **Backups and ownership:** Blaze plan with scheduled backups and a tested restore, two owners per account, custom email sender domain (`docs/production-checklist.md`).
