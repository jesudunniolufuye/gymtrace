# GymTrace

Membership, payments and QR check-in for a university gym (Babcock University Fitness Centre).
Members pay, show a QR code at the front desk and book trainers. Trainers manage their sessions and availability. Staff record cash and bank-transfer payments, check people in and see who's paid.

This is a showcase project: a broken codebase taken over and finished. See `docs/PROJECT-REPORT.md` for the before/after, the decisions, and the evidence.

## Features

| Role | Can do |
|---|---|
| Member | Register (email verification required), see plan and expiry, pay (simulated card on staging), payment history with printable receipts, entry QR code (signed, changes every minute), book and cancel trainer sessions, log workouts, see attendance |
| Trainer | Switch availability for new bookings, see upcoming sessions and clients, complete or cancel sessions. New trainers can't be booked until the gym approves them. |
| Admin (front desk) | Record cash/transfer payments, receipts, Payments page with daily and monthly totals, QR scanner and manual check-in, members' real plan status, approve trainers, deactivate/reactivate accounts, dashboard and reports |

Plans: **Monthly** (₦25,000, 30 days; renewing early adds 30 days) and **Day Pass** (₦500, one entry, until midnight Lagos time).

## Architecture

```
Browser: React 19 + Vite + Tailwind (src/)
 ├─ Firebase Auth: email/password, verification, password reset
 ├─ Cloud Firestore directly, for ordinary data; access enforced by firestore.rules
 └─ /api: Vercel serverless functions (api/), Node + firebase-admin
      pay · payment-options · admin/record-payment · qr-token · check-in · admin/set-account-status
```

- **The server decides anything that grants access or money:** prices, payments, subscriptions, QR codes, check-ins, deactivation. Ordinary members and trainers can't write those collections or fields; the rules forbid it. **Admin accounts are the exception**: the `users` rule lets an admin write any field on a profile directly (including `subscription`, `role` and `status`), which bypasses the payment record. Restricting that to the server is a next step (QA finding F3, `docs/QA-FINDINGS.md`).
- **QR codes** are HMAC-SHA256-signed tokens: 60-second expiry, single use, verified only on the server.
- **One rules module for both sides:** plan and expiry rules live in `shared/subscription.js`, used by both the browser and the API.

```
api/            Vercel functions (_lib/ = shared server code: auth checks, payments, QR tokens)
shared/         Code used by both browser and server (plans, card checks)
src/            React app (pages/{public,auth,member,trainer,admin,shared}, services/, lib/)
firestore.rules, firestore.indexes.json
scripts/        seed, seed-demo, smoke test, local API server
tests/          unit/, rules/, api/
docs/           report, assessment, production checklist, staff guide, demo script, thesis (requirements)
```

## Running locally (no cloud account needed)

Needs Node 22 and Java (for the Firebase emulators).

```bash
npm install
npm run emulators      # terminal 1: Auth + Firestore emulators (project demo-gymtrace)
npm run dev:api        # terminal 2: the /api functions, wired to the emulators
npm run dev:emu        # terminal 3: the app, open the URL it prints
```

`dev:api` turns the card simulator on and uses a local QR secret. To try production behaviour, run `PAYMENTS_SIMULATOR=off npm run dev:api`.

Create accounts in the emulator. Emulator data is throwaway and is lost when the emulators stop.

```bash
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-gymtrace
SEED_ADMIN_EMAIL=admin@example.test SEED_ADMIN_PASSWORD=change-me npm run seed
DEMO_ADMIN_EMAIL=admin@example.test npm run seed:demo     # optional: realistic demo data
```

Verification emails go nowhere in the emulator. Seeded accounts are already verified; links for new sign-ups appear at http://127.0.0.1:9099/emulator/v1/projects/demo-gymtrace/oobCodes.

## Tests

```bash
npm test                 # unit tests + Firestore rules tests + API tests (starts the emulators itself)
npm run test:unit        # unit tests only (no emulator)
npm run test:old-rules   # the current rules tests run against the ORIGINAL rules: shows the old holes (expected to fail)
npm run lint
```

End-to-end smoke test of the daily loop, against the local emulator with all three terminals running:

```bash
SMOKE_ADMIN_EMAIL=admin@example.test SMOKE_ADMIN_PASSWORD=change-me npm run smoke
```

It can also run against staging (see the header of `scripts/smoke-daily-loop.mjs`). It refuses to run against production.

## Environments

| | Staging | Production |
|---|---|---|
| Git branch | `rebuild/hybrid` (Vercel preview) | `main` |
| Firebase project | `gymtrace-staging` | `gymtrace-prod` |
| Card simulator | on (`PAYMENTS_SIMULATOR=enabled`) | off: payments recorded at the front desk |
| Data | test accounts | demo data (`npm run seed:demo`) |

Release flow:
1. Commit to `rebuild/hybrid` and run `npm test`.
2. Push, which deploys staging. Run the smoke test against staging and check in the browser.
3. If the rules or indexes changed, deploy them to staging, then production: `npx firebase deploy --only firestore --project <project>`.
4. Fast-forward `main`: `git push mine rebuild/hybrid:main`.

Environment variables are listed in `.env.example`. The server needs `FIREBASE_SERVICE_ACCOUNT` and `QR_SIGNING_SECRET` (secrets, set in Vercel), plus `PAYMENTS_SIMULATOR` on staging only. Admin accounts are created with `npm run seed`; see the script header.

## Docs

- `docs/PROJECT-REPORT.md`: state at takeover, decisions, what was built, testing, limits
- `docs/DEMO-SCRIPT.md`: 10-minute walkthrough
- `docs/staff-guide.md`: front-desk guide in plain language
- `docs/production-checklist.md`: what running it for real would take
- `docs/assessment.md`: the original assessment and plans (dated record)
- `docs/thesis.md`: the requirements (FR1–FR19, NFR1–NFR13, test cases)
