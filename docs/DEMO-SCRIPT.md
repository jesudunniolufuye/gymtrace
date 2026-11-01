# GymTrace: 10-minute demo script

Runs against **production** (https://gymtrace-rose.vercel.app) with the seeded demo data, two devices, and one terminal.

---

## Before the demo

1. **Refresh the demo data** on the morning of the demo. Dates are relative to "now", so this gives a fresh "today". It's a production write, so run it yourself:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=~/secrets/gymtrace-prod-sa.json SEED_PROJECT=gymtrace-prod \
   DEMO_ADMIN_EMAIL=molufuye420@gmail.com \
   DEMO_MEMBER_EMAIL=jolufuye+demomember@gmail.com DEMO_TRAINER_EMAIL=jolufuye+demotrainer@gmail.com \
   npm run seed:demo
   ```
   - It resets every demo member's plan and status (e.g. reactivates anyone you deactivated in rehearsal). It never changes passwords.
   - Payments you recorded during rehearsal stay in the Payments list.
   - **Rehearsal side effects.** Re-running the seed restores plans and day-pass entries (e.g. `aisha.bello`'s entry), but check-ins from rehearsal stay in the attendance lists. A second check-in for the same member within 5 minutes shows **Already Checked In** instead of **Access Granted**. So: re-run the seed after rehearsing, and wait 5 minutes after any rehearsal check-in before the live run. If it still appears live, say so: it's the duplicate-scan protection.
2. **Passwords for the two demo log-ins.** Use "Forgot password" on https://gymtrace-rose.vercel.app/forgot-password for:
   - **Tolu Martins** (member): `jolufuye+demomember@gmail.com`
   - **Bisi Lawal** (trainer): `jolufuye+demotrainer@gmail.com`

   **Production emails land in Gmail spam: check spam first**, here and whenever a verification or reset email is needed during the demo.
3. **Browsers.** Each browser holds one login per site.
   - Chrome, normal window: admin, https://gymtrace-rose.vercel.app/admin/login (Michael Olufuye). Open **Check-in Scanner** once and allow the camera.
   - Chrome, incognito window: member **Tolu Martins** (for the console demo).
   - Second browser (e.g. Firefox): trainer **Bisi Lawal**.
   - **Phone:** the production site, logged in as **Tolu Martins**. Screen brightness up.
4. **Terminal** in the repo. Run `npm run demo:old-vs-new` once beforehand: the first run downloads the emulator, and it needs Java. Keep the output on screen as a fallback.
5. Optional: `docs/PROJECT-REPORT.md` open on GitHub.

### Demo accounts and what they show

| Member (email @example.edu) | State | Use it to show |
|---|---|---|
| Tolu Martins (your +demomember Gmail) | Monthly, active; 2 upcoming sessions | QR check-in from the phone, cancel a session |
| `kelechi.nnamdi`, `chinedu.obi` | No plan | Recording a payment |
| `aisha.bello` | Day pass, 1 entry left today | Manual check-in uses the entry |
| `ibrahim.musa` | Day pass already used today | "Today's day pass has already been used." |
| `daniel.okoro`, `temitope.bankole` | Monthly expired | "Monthly membership has expired." |
| `halima.sani` | Deactivated (reason on record) | "Account deactivated. Entry refused." |
| `seun.adebayo` | Monthly, expires within days | Plan column / renewal |
| `ngozi.chukwu` | Monthly, paid at a discount (note on the receipt) | Recorded amount vs. plan price |

| Trainer | State |
|---|---|
| Bisi Lawal (your +demotrainer Gmail) | Approved, available; has clients and upcoming sessions |
| Tunde Bakare | Approved, available |
| Ngozi Eze | Approved, but has **paused** bookings |
| Femi Adeyemi | **Not approved** yet (new sign-up) |

---

## The walkthrough

### 0:00–1:00 · What I inherited
- "The app looked finished: three portals, deployed. But it trusted the browser for everything that mattered."
- Show the security table in `docs/PROJECT-REPORT.md` §1:
  - self-promotion to admin
  - self-marking as paid
  - forgeable QR codes
  - a scanner that never checked payment

### 1:00–3:00 · Live security demo
1. **Incognito window (Tolu) → F12 → Console**, paste:
   ```js
   // GymTrace security demo: run while signed in as a MEMBER on the production site.
   const FIRESTORE = 'https://firestore.googleapis.com/v1/projects/gymtrace-prod/databases/(default)/documents';
   const idb = await new Promise((ok, fail) => { const r = indexedDB.open('firebaseLocalStorageDb'); r.onsuccess = () => ok(r.result); r.onerror = fail; });
   const rows = await new Promise((ok) => { const q = idb.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll(); q.onsuccess = () => ok(q.result); });
   const me = rows.map((r) => r.value).find((v) => v && v.stsTokenManager);
   const headers = { Authorization: `Bearer ${me.stsTokenManager.accessToken}`, 'Content-Type': 'application/json' };
   const patch = (field, value) => fetch(`${FIRESTORE}/users/${me.uid}?updateMask.fieldPaths=${field}`, { method: 'PATCH', headers, body: JSON.stringify({ fields: { [field]: value } }) }).then((r) => r.status);
   const create = (collection, fields) => fetch(`${FIRESTORE}/${collection}`, { method: 'POST', headers, body: JSON.stringify({ fields }) }).then((r) => r.status);
   console.table({
     'make myself admin': await patch('role', { stringValue: 'admin' }),
     'mark myself paid (old isPremium flag)': await patch('isPremium', { booleanValue: true }),
     'give myself a plan until 2030': await patch('subscription', { mapValue: { fields: { plan: { stringValue: 'monthly' }, expiresAt: { timestampValue: '2030-01-01T00:00:00Z' } } } }),
     'check myself in': await create('attendance', { memberId: { stringValue: me.uid }, status: { stringValue: 'Active' }, checkIn: { timestampValue: new Date().toISOString() } }),
     'change my own name (allowed)': await patch('name', { stringValue: 'Tolu Martins' }),
   });
   ```
   Expected: **403** for the four attacks and **200** for the name. The snippet uses the browser's own login session; no password is typed. If you get 401, the session token is stale: reload the page and run it again.
2. **Terminal:** `npm run demo:old-vs-new` (about 20 seconds). The same requests run against the **original** rules and **today's** rules, side by side:
   - on the original rules, make myself admin, mark myself paid, give myself a plan, check in without paying, and read every member's profile are all **200**
   - today they're all **403**

   "Identical requests. The original rules let a student do every one of these."
3. One sentence: "Payments, QR codes, check-in and deactivation now run on the server. The browser can't decide them, and the database rules enforce that."

### 3:00–6:00 · The front-desk loop (two devices)
1. **Admin → Members**, search `kelechi` (no plan) → **Record payment** → Monthly, **Cash**, receipt book number e.g. `RB-777` → **Record ₦25,000**.
2. **View receipt** → point out the receipt number, valid dates and "Recorded by Michael Olufuye" → **Print / Save PDF** (show the dialog, cancel).
3. **Payments** page: the **Today** cash total went up by ₦25,000.
4. **Phone (Tolu):** **Generate Qr**. The code changes every minute: "signed by the server, works once."
5. **Admin → Check-in Scanner**: hold the phone to the camera → **Access Granted · Tolu Martins · Monthly Membership, valid until …**.
6. **Scan Next Member**, then scan the **same** code again → **"This QR code has already been used."**
7. Manual check-in. "In real use: always check the student ID card first." Type each email and click **Check In**:
   - `aisha.bello@example.edu` → Access Granted; her plan line now reads "Day pass used" (one entry, now spent)
   - `ibrahim.musa@example.edu` → "Today's day pass has already been used."
   - `daniel.okoro@example.edu` → "Monthly membership has expired."
   - `halima.sani@example.edu` → "Account deactivated. Entry refused."
   - `nobody@example.edu` → "Member Not Found"
   - Optional: a phone screenshot of a QR code, more than a minute old → "Invalid or Expired QR Code"

### 6:00–7:30 · What the admin sees
1. **Dashboard:**
   - "Active Members" counts members with a valid plan (versus registered)
   - "Active Trainers" counts bookable trainers (Ngozi's pause and Femi's pending approval are excluded)
   - today's check-ins, the 7-day chart, 6 months of registrations
2. **Members:** the Plan column shows active-until, expired, day pass used, deactivated (hover for the reason).
3. **Deactivate** `chinedu.obi` with a reason → status "Deactivated" → **Reactivate**. "Nothing is deleted; the login is disabled and open sessions end at once."
4. **Trainers:** Femi is "Not approved" (Approve for booking); Ngozi is "Trainer has paused bookings".

### 7:30–9:00 · Booking (trainer and member)
1. **Second browser (Bisi):** dashboard → switch **Available for new bookings** off.
2. **Phone (Tolu) → Bookings:** the page doesn't update live, so **reload it** after Bisi switches availability off. Then Bisi is no longer listed, but Tolu's existing session with Bisi still shows under **My upcoming sessions**. **Cancel session** → **Yes, cancel**.
3. **Bisi:** switch availability back on. **Sessions** opens on the **Upcoming** tab, where the cancelled session no longer appears. Click the **Cancelled** tab to show it.

### 9:00–10:00 · How it's tested, and the limits
- Terminal (pre-run output is fine):
  - `npm test` → 35 unit + 45 rules + 53 API tests, all passing
  - `npm run test:old-rules` → 28 of the 45 rules tests fail on the original rules
  - the staging smoke run: 28 end-to-end checks
- `docs/PROJECT-REPORT.md` §6, known limits:
  - no way to void a recorded payment
  - all staff are full admins
  - production emails land in spam
  - real online payments (Paystack) designed but not built

---

## If something goes wrong

| Problem | Do this |
|---|---|
| Camera won't read the QR | Use manual check-in with `jolufuye+demomember@gmail.com` |
| Need a verification or reset email live | **Check Gmail spam first** (production sender) |
| Console snippet shows 401 | Reload the page (fresh session), run again |
| "Your session has expired" anywhere | Sign in again |
| No internet | `npm run demo:old-vs-new` works offline after the first run; walk through screenshots |
| Demo data looks stale (e.g. day passes from yesterday) | Re-run the seed command at the top |
