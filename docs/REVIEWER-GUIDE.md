# GymTrace: reviewer guide (10-minute self-guided tour)

**Live site:** https://gymtrace-rose.vercel.app
**Guide in the app:** https://gymtrace-rose.vercel.app/guide

GymTrace is a showcase of a gym access system for Babcock University Fitness Centre: members, trainers and front-desk staff. It uses demo data. No real money moves and no real person's data is held.

## Logins

Log in with the credentials you were sent: **admin at `/admin/login`**, **member and trainer at `/login`**. The emails are below; the passwords were sent to you separately.

| Role | Email | Where to sign in |
|---|---|---|
| Admin (front desk) | `molufuye420+reviewer@gmail.com` | https://gymtrace-rose.vercel.app/admin/login |
| Member (Tolu Martins) | `molufuye420+demomember@gmail.com` | https://gymtrace-rose.vercel.app/login |
| Trainer (Bisi Lawal) | `molufuye420+demotrainer@gmail.com` | https://gymtrace-rose.vercel.app/login |

## The tour

Allow about 10 minutes. You can use one browser for steps (a), (b), (d) and (e), and a phone for step (c).

**(a) Admin dashboard, Members, Payments (2 min)**
1. Sign in as the admin (reviewer) account.
2. **Dashboard:** counts of active members and bookable trainers, today's check-ins, and a 7-day chart.
3. **Members:** the Plan column shows each member's status: active until a date, expired, day pass used, or deactivated.
4. **Payments:** every recorded payment, with today's cash total.

**(b) Record a cash payment and open the receipt (2 min)**
1. **Members**, search `kelechi`. Click **Record payment**.
2. Choose **Monthly**, **Cash**, a receipt-book number such as `RB-777`, and amount ₦25,000. Click **Record**.
3. Open **View receipt**. It shows the receipt number, the validity dates and who recorded it.
4. Back on **Payments**, today's cash total has gone up by ₦25,000.

**(c) Show the member's QR code on a phone (1 min)**
1. On a phone, open https://gymtrace-rose.vercel.app/login and sign in as the member (Tolu Martins).
2. Open **QR** (Access QR Code). The code changes every minute and shows a countdown.
3. Turn the screen brightness up.

**(d) Check the member in (2 min)**
- *With a camera:* in a second browser, sign in as admin, open **Check-in Scanner**, allow the camera, and hold the phone to it. Expect **Access Granted**.
  - Scan the same code again. Expect **This QR code has already been used**.
- *Without a camera:* on the scanner page, type `molufuye420+demomember@gmail.com` into manual check-in and click **Check In**. Expect **Access Granted**.
- Also try `daniel.okoro@example.edu`: **Monthly membership has expired.**

**(e) Trainer view and booking (2 min)**
1. Sign in as the trainer (Bisi Lawal) in a second browser, or on the same phone after signing out.
2. **Dashboard:** switch **Available for new bookings** off, then on again.
3. As the member, open **Bookings**. Book a session with an available trainer. Then cancel it under **My upcoming sessions**.
4. As the trainer, open **Sessions** to see the booking.

**(f) Register a brand-new account (1 min)**
1. Open https://gymtrace-rose.vercel.app/register and register with **your own email address**.
2. The verification email goes to whatever address you registered with, not to the developer. If it doesn't arrive, check your spam folder: it comes from a default sender.
3. Until you click the link, the account cannot sign in. Trainers also need admin approval before they can take bookings.

## What is simulated or limited

- **No real payments.** Online card payment is switched off in production; the front desk records cash and bank transfers. Payments are recorded by staff, not taken from a card.
- **No way to void a recorded payment** in the app.
- **All staff are full admins.** There is no separate attendant role.
- **The privacy notice uses example details** (organisation name, contact, data protection officer). It has not been reviewed by a lawyer.
- **Verification emails** come from a default sender, so they may land in spam.
- **QR codes** are valid for 60 seconds and work once. A live code could still be shown to someone else within that minute; staff are told to check the name on screen.
- **Demo data** is reset on the morning of a demo; the accounts above are demo accounts.
