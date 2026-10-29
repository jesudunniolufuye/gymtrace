# GymTrace production checklist

What has to be true to run GymTrace for real members, who owns what, and what's left after launch.
Written 29 Oct 2026, for the soft launch on Fri 30 Oct.

Tick items as they're done. **Bold items block opening to all members**; a soft launch with staff and a small pilot group can start before they're all done.

---

## 1. Where things stand

| | Production | Staging (demo / testing) |
|---|---|---|
| URL | https://gymtrace-rose.vercel.app | https://gymtrace-git-rebuild-hybrid-molufuye-devs-projects.vercel.app |
| Git branch | `main` | `rebuild/hybrid` |
| Firebase project | `gymtrace-prod` | `gymtrace-staging` |
| Card simulator | OFF (members pay at the front desk) | ON (test cards; for the thesis demo) |
| Data | Real members only | Test data (smoke-*@example.test accounts, test payments) |

Release rule: change code on `rebuild/hybrid`, check it on staging (`npm test`, then the smoke test, then a browser check), and only then move `main` forward (fast-forward, never force-push).

---

## 2. Before opening to all members

- [ ] **Each staff member has their own admin account** with their real name, set under Settings → Your name. Receipts and check-ins record who did them, so accounts must not be shared.
  Create one (production key; replace the email):
  ```
  GOOGLE_APPLICATION_CREDENTIALS=~/secrets/gymtrace-prod-sa.json SEED_PROJECT=gymtrace-prod \
  SEED_ADMIN_EMAIL=person@babcock.edu.ng SEED_ADMIN_PASSWORD=random npm run seed
  ```
  The person then sets their own password with "Forgot password" on the production site.
- [ ] **Production admin password set** (molufuye420@gmail.com was created with a random password: use Forgot password on production).
- [ ] **Privacy notice completed and reviewed.** Fill in the 7 values in the `DETAILS` block at the top of `src/pages/public/PrivacyPage.jsx` (data controller, contact email, DPO, two retention periods, data location, approval date). Then have Babcock's data protection officer review the whole page. It is a draft, not legal advice.
- [ ] **Vercel Pro for production** (see section 5). The Hobby plan doesn't allow commercial use, and collecting gym fees counts.
- [ ] **Firebase Blaze plan, with a budget alert and daily backups** (see section 4).
- [ ] **Email delivery checked on production:** register a test member, confirm the verification email arrives and its link opens `/login?verified=1`; do a password reset and confirm the link opens `/login?reset=1`. If emails land in spam, see section 6.
- [ ] Staff have read `docs/staff-guide.md` and done one practice run each: record a payment, print a receipt, scan a QR code, do a manual check-in.
- [ ] Front-desk device: a laptop or tablet with a working camera, Chrome, and camera permission allowed for the site.
- [ ] Bank transfer details to give members are agreed (the app shows fixed text: "ask staff for transfer details").

---

## 3. Accounts and ownership

Today everything hangs off one person's accounts. Before handover, make sure at least **two people** can get into each of these, and that they belong to the gym or university rather than a student.

| What | Where | Today | Should be |
|---|---|---|---|
| Code | GitHub `jesudunniolufuye/gymtrace` (fork of `Osaseye/GYMTRACE`) | personal account | transferred to a university/gym GitHub organisation, or a second owner added |
| Hosting | Vercel project (team `molufuye-devs-projects`) | personal team | Pro team owned by the gym, two members |
| Database and logins | Firebase `gymtrace-prod`, `gymtrace-staging` | personal Google account | owned by a university Google account, two Owners (IAM) |
| Server keys | `~/secrets/gymtrace-*-sa.json`; copies in Vercel `FIREBASE_SERVICE_ACCOUNT` | on one laptop | only in Vercel and a password manager; delete unused keys in Google Cloud → IAM → Service accounts |
| Domain (if added) | registrar | none yet | gym or university |

Secrets, per Vercel environment (Settings → Environment Variables):

| Variable | Production | Preview (staging) | Notes |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID` | prod web config | staging web config | public values, not secrets |
| `FIREBASE_SERVICE_ACCOUNT` | prod key JSON | staging key JSON | **secret**, mark Sensitive |
| `QR_SIGNING_SECRET` | its own random value | a different value | **secret**, at least 32 characters |
| `PAYMENTS_SIMULATOR` | **not set** | `enabled` | anything other than exactly `enabled` means off |

- If a service-account key leaks: create a new key, update Vercel, delete the old key.
- Rotating `QR_SIGNING_SECRET` only invalidates QR codes shown in the last 60 seconds. It's safe to do at any time.

---

## 4. Backups and data

- [ ] **Upgrade both Firebase projects to Blaze** (pay-as-you-go). The free quotas still apply, so a small gym should pay little or nothing, but Firestore scheduled backups need Blaze.
- [ ] **Budget alert**: Google Cloud → Billing → Budgets, e.g. alert at ₦5,000 per month.
- [ ] **Scheduled backups for `gymtrace-prod`**: daily, kept for 14 days; optionally a weekly one kept for 14 weeks (the maximum). Firebase console → Firestore → Disaster recovery.
- [ ] **Test a restore once**: restore into a new database, check payments are there, then delete it.
- [ ] **Delete protection** on the production database (Firestore → database settings).
- [ ] **TTL policy** on collection `qrNonces`, field `expireAt` (Firestore → TTL). These are used-QR markers that are safe to delete after a day; without TTL they just accumulate.
- [ ] Decide the retention periods (they go in the privacy notice) and how a "delete my data" request is handled. Today: deactivate the account. There is no deletion tool yet: deleting personal data means the developer editing the records by hand, keeping payment records as long as the law requires.
- [ ] Look at `errorLogs` (Firestore) and Vercel → Logs weekly for the first month.

Payment records are the gym's financial records. Never delete them to "clean up". Deactivate accounts instead.

---

## 5. Vercel plan and hosting

- [ ] **Production on Vercel Pro.** Vercel's Fair Use Guidelines limit Hobby to non-commercial personal use and list "requesting or processing payment from visitors" as commercial. The staging/demo deployment can stay on Hobby. The alternative, later, is moving to Firebase Hosting plus Cloud Functions on Blaze, which would mean porting the `api/` folder (about a day).
- [ ] **Deployment Protection**: production must be public. Staging is currently public too. Turn protection back on for staging after the defence if you don't want outsiders on it.
- [ ] **Function region**: Vercel runs the API in `iad1` (Washington DC). Check the Firestore location in Firebase console → Firestore → (default) database. If Firestore is in Europe, set the same region in `vercel.json` (`"regions": ["lhr1"]` or similar) for faster check-ins. Put the actual location in the privacy notice.
- [ ] Optional: a proper domain (e.g. `gym.babcock.edu.ng`). Add it in Vercel and in Firebase Authentication → Settings → Authorized domains.

---

## 6. Email sender (verification and password reset)

Members can't log in until they click the verification link, so these emails must arrive.

- [ ] Today emails come from Firebase's default sender (`noreply@gymtrace-prod.firebaseapp.com`), which often lands in spam. Until this is fixed, tell members at sign-up: "check your spam folder".
- [ ] Set up a custom sender domain: Firebase console → Authentication → Templates → edit a template → "Customize domain". Add the DNS records it gives you (needs a domain from section 5), wait for verification, and send yourself a test.
- [ ] Edit the template text (sender name "Babcock Fitness Centre", subject lines) for both verification and password reset.
- [ ] Every domain the site is reached on must be in Authentication → Settings → Authorized domains, or the links won't return to the app (they fall back to Firebase's own page).

---

## 7. Running it day to day

- **Reconciling cash:** Payments page → "Today" card shows cash, transfer and card totals. Compare with the cash box at closing.
- **Lost admin access:** create a new admin with the seed command above (needs the production key).
- **Compromised or departed staff account:** another admin deactivates it (Members/Trainers → Deactivate). Deactivation ends sessions immediately.
- **Member says "my QR doesn't work":** check Members → their plan. Expired or used day passes are the usual cause. Use manual check-in by email after checking their ID card.
- **Free quotas** (Spark/Blaze free tier): about 50,000 database reads and 20,000 writes per day. A gym of a few hundred members is far below this; the budget alert covers surprises.
- **Release:** `npm test` → push `rebuild/hybrid` → `npm run smoke` against staging (command in `scripts/smoke-daily-loop.mjs`) → browser check → deploy rules if changed (`npx firebase deploy --only firestore --project gymtrace-prod`) → fast-forward `main`.

---

## 8. Future: real online payments (Paystack)

Out of scope for launch (thesis delimitation iv). This is how to add it without weakening anything:

1. **Accounts**: Paystack business account in the gym's or university's name, verified, with the settlement bank account. Test keys go in staging and live keys in production only, as Vercel secrets (`PAYSTACK_SECRET_KEY`).
2. **Start a payment on the server**: a new `POST /api/paystack/initialize` that, like `api/pay.js`, decides the price on the server. It calls Paystack `POST /transaction/initialize` with the amount in **kobo** (₦25,000 → 2500000), the member's email, and `reference` = our payment ID. It returns the authorization URL, or uses Paystack Popup. Card details never touch GymTrace.
3. **Confirm on the server, never from the browser**:
   - a webhook endpoint checks the `x-paystack-signature` header (HMAC-SHA512 of the raw body with the secret key)
   - it then calls `GET /transaction/verify/:reference`
   - only if the status is `success` and the amount and currency match does it call the existing `commitPayment(...)`, with `method: 'paystack'`
   - the reference makes it idempotent: Paystack retries webhooks.
4. **Keep `PAYMENTS_SIMULATOR` off in production.** The simulated gateway stays for staging and the demo.
5. **Reconcile** weekly against the Paystack dashboard. Refunds happen in Paystack; record them in GymTrace.

Rough effort: 1–2 days including tests.

---

## 9. Post-launch work list

Not done before the deadline; none of these block a soft launch.

- [ ] **Void/correct a recorded payment** (today a mistake can't be undone in the app: staff note the receipt number and tell the manager; fixing it needs the developer). Should be a manager-only "void" that keeps the record and reverses the plan time.
- [ ] Workout form: highlight missing fields in red (TC3 step 3; currently only the title is checked).
- [ ] Payment filters (date range, method) on the admin Payments page; it shows the current month only.
- [ ] Separate front-desk "attendant" role (fewer powers than admin).
- [ ] Emailed receipts (today: on screen and printable).
- [ ] Editable bank-transfer instructions in Settings.
- [ ] Data-deletion tool for privacy requests (section 4).
- [ ] Trainers editing their own specialty/phone (admins can do it today).
- [ ] Cleanup: unused `sessionService.js`, the 5 remaining lint warnings, the stale `gymtrace.md` and `UI/` folder, Vite template README, an unused icon import in `MemberDashboard.jsx`.
- [ ] Error boundary (a friendly page if something crashes) and splitting the 1.8 MB JavaScript bundle.
- [ ] Weekly-goal bar and new charts (cut from the thesis scope; reword TC3 step 2).
- [ ] Thesis updates: 1.4, 3.4, 3.8, 3.10, 3.11, 4.2 and 4.3 (listed in `docs/assessment.md`), plus FR20–FR23 for recorded payments, receipts, deactivation and password reset.

## Known limitations (say these at the defence)

- A QR code shared within its 60 seconds could be used once by someone else. Staff compare the name shown with the person (and the ID card for manual check-in). Thesis 1.5 acknowledges this.
- Recorded cash/transfer payments rely on staff honesty; each is attributed to the staff account that recorded it.
- A day pass is one entry and ends at midnight Lagos time. Deactivating an account does not pause a monthly plan.
- All staff are full admins until the attendant role exists.
