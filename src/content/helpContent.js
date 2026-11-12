// The user manual, as data. This one file feeds both the in-app Help page
// (/help, with search) and docs/USER-MANUAL.md (npm run manual). Edit it here
// and re-run `npm run manual`; a unit test fails if the two drift apart.
//
// Each topic: { id, q, a: [paragraphs], steps?: [numbered steps], keywords? }
// Keep the words members and staff actually see on screen in **bold**.
import { PLANS } from '../../shared/subscription.js';

const naira = (n) => `₦${n.toLocaleString('en-NG')}`;
const MONTHLY = naira(PLANS.monthly.amount);
const DAY_PASS = naira(PLANS.session.amount);

export const HELP_SECTIONS = [
  {
    id: 'start',
    title: 'Getting started',
    audience: 'everyone',
    intro: 'Creating an account, signing in and passwords. This applies to members and trainers.',
    topics: [
      {
        id: 'create-account',
        q: 'How do I create an account?',
        a: ['Anyone can register as a member or a trainer. Staff accounts are created by the gym, not on this page.'],
        steps: [
          'Open the GymTrace website and click **Register** (or **Create an account**).',
          'Type your full name and your own email address.',
          'Under **I am a...**, choose **Member** or **Trainer**.',
          'Choose a password of at least 6 characters and type it again.',
          'Tick the box to say you have read the **Privacy Notice**, then click **Create Account**.',
          'Open the email GymTrace sends you and click the verification link. You can then log in.',
        ],
        keywords: 'register sign up signup join new account open account enrol',
      },
      {
        id: 'verification-email',
        q: "I didn't get the verification email",
        a: [
          'Check your spam or junk folder first: the email often lands there.',
          'To get a new one, go to the login page and try to log in with your email and password. The page then offers **Resend verification email**.',
          'You cannot log in until you have clicked the link in that email.',
        ],
        keywords: 'verify verification email not received missing spam junk resend confirm link inbox',
      },
      {
        id: 'log-in',
        q: 'How do I log in?',
        a: [
          'Members and trainers: click **Log in**, then type your email and password and click **Login to Dashboard**.',
          'Front-desk staff use a separate page: **Staff log in** (at the bottom of the home page).',
          'If you see **Please verify your email before logging in**, click the link in your verification email first.',
        ],
        keywords: 'login log in sign in signin access enter dashboard cannot',
      },
      {
        id: 'forgot-password',
        q: 'I forgot my password',
        steps: [
          'On the login page, click **Forgot password?**',
          'Type the email address you registered with and send the form.',
          'Open the email and click the link to set a new password. The link works for 1 hour. Check spam if you do not see it.',
        ],
        a: ['Gym staff cannot see or reset your password. Only you can, through this email.'],
        keywords: 'forgot forgotten password reset change lost cannot remember',
      },
      {
        id: 'log-out',
        q: 'How do I sign out?',
        a: [
          'On a computer: click the sign-out icon next to your name at the bottom of the menu on the left.',
          'Member on a phone: tap the circle with your initials at the top right to open **My Profile**, then tap **Sign Out**.',
          'Trainer or staff on a phone: tap the sign-out icon at the top right.',
        ],
        keywords: 'logout log out sign out signout exit leave',
      },
      {
        id: 'deactivated',
        q: 'It says my account is deactivated, or my profile was not found',
        a: [
          'A deactivated account has been blocked by the gym. You cannot log in or enter until the gym reactivates it. Your payments and visits are kept. Speak to the front desk.',
          'If you see **Account profile not found**, click **Sign out** and log in again. If it keeps happening, tell the front desk.',
        ],
        keywords: 'deactivated disabled blocked banned suspended profile not found error',
      },
    ],
  },
  {
    id: 'members',
    title: 'For members',
    audience: 'member',
    intro: 'Paying, getting into the gym, booking a trainer and logging workouts.',
    topics: [
      {
        id: 'plans-prices',
        q: 'What plans are there and what do they cost?',
        a: [
          `**Monthly Membership: ${MONTHLY}.** Unlimited gym entry for 30 days.`,
          `**Day Pass: ${DAY_PASS}.** One gym entry, valid until midnight on the day you pay.`,
          'If you renew a monthly plan early, the 30 days are added to the end of your current plan, so you lose nothing.',
          'You cannot buy a day pass while your monthly membership is active, because you do not need one.',
        ],
        keywords: 'price cost fee how much plan subscription monthly day pass membership naira renew renewal',
      },
      {
        id: 'how-to-pay',
        q: 'How do I pay?',
        a: [
          'Pay at the front desk, by cash or bank transfer. Staff record the payment and your plan starts at once.',
          'There is no online card payment at the moment.',
          'Your payment then appears on your **Payments** page under **Payment History**.',
        ],
        keywords: 'pay payment paying cash transfer bank card online front desk subscribe buy',
      },
      {
        id: 'receipts',
        q: 'Where is my receipt?',
        steps: [
          'Open **Payments**.',
          'Under **Payment History**, find the payment and click **Receipt**.',
          'Click **Print / Save PDF** to print it or keep a copy.',
        ],
        a: ['Every receipt has a number starting with GT-. Quote it if you ever have a question about a payment.'],
        keywords: 'receipt proof of payment invoice print pdf history reference number',
      },
      {
        id: 'enter-gym',
        q: 'How do I get into the gym with my phone?',
        steps: [
          'Log in on your phone and tap **Generate QR** on your dashboard.',
          'Turn your screen brightness up.',
          'Hold the code in front of the front-desk camera until staff see **Access Granted**.',
        ],
        a: [
          'The code changes every minute and each code works once. A screenshot or an old code is refused, so always show the live page.',
          'Tap **New Code Now** if staff ask for a fresh code.',
        ],
        keywords: 'qr code scan check in checkin entry enter access gate door barcode phone',
      },
      {
        id: 'no-gym-access',
        q: 'My QR page says "No Gym Access Right Now"',
        a: [
          'You do not have an active plan: either you have not paid yet, your monthly membership has expired, or your day pass has been used.',
          'Tap **See Plans & Payments** to check your plan, then pay at the front desk.',
        ],
        keywords: 'no gym access no active plan expired cannot get qr code not showing refused denied',
      },
      {
        id: 'qr-not-loading',
        q: 'My QR code will not load or disappeared',
        a: [
          'This is nearly always the internet connection. If you see **Couldn\'t get a new code. Trying again…**, the page keeps the current code while it is still valid and retries by itself.',
          'If you see **Try Again**, check your data or Wi-Fi and tap it.',
          'If your phone cannot get online at all, tell the front desk: staff can check you in with your email address after seeing your ID card.',
        ],
        keywords: 'qr code not working broken stopped loading network error offline no internet data wifi try again blank phone dead battery',
      },
      {
        id: 'book-trainer',
        q: 'How do I book a session with a trainer?',
        steps: [
          'Open **Bookings**.',
          'Find a trainer. You can search by name or filter by specialty.',
          'Click **Book Session**, choose a date and a time, then click **Confirm Booking**.',
        ],
        a: [
          'Sessions start on the hour, from 06:00 to 20:00, and must be in the future.',
          'Only trainers who are approved by the gym and currently taking bookings are listed. If a trainer you expect is missing, they have paused new bookings; reload the page later.',
        ],
        keywords: 'book booking trainer session appointment personal training coach schedule reserve',
      },
      {
        id: 'cancel-booking',
        q: 'How do I cancel a booking?',
        steps: [
          'Open **Bookings**.',
          'Under **My upcoming sessions**, click **Cancel session** next to the booking.',
          'Click **Yes, cancel** to confirm.',
        ],
        a: ['Your trainer sees the cancellation on their side. A trainer can also cancel a session; it then disappears from your upcoming sessions.'],
        keywords: 'cancel booking session trainer remove reschedule change',
      },
      {
        id: 'attendance',
        q: 'Where can I see my gym visits?',
        a: [
          'Open **Attendance**. It lists every visit with the time you checked in, plus your total visits and visits this month.',
          'When you leave the gym you can click **Check Out** on the visit marked **Active** to record your leaving time. It does not affect your plan.',
        ],
        keywords: 'attendance visits history check out checkout record times how many',
      },
      {
        id: 'workouts',
        q: 'How do I log a workout?',
        steps: [
          'Open **Workouts** and click **Log Custom Workout**.',
          'Give it a title (required). Duration, calories and difficulty are optional.',
          'Add your exercises with sets, reps and weight. Click **Add** for another exercise.',
          'Click **Save Workout**.',
        ],
        a: [
          '**Weekly Schedule** shows this week\'s workouts, **History** shows all of them, and **Weekly Goal** counts this week\'s workouts out of 5.',
          'To remove a workout, open **History** and click the bin icon beside it.',
        ],
        keywords: 'workout log exercise training sets reps weight history goal delete remove gym diary',
      },
      {
        id: 'profile',
        q: 'How do I change my name or phone number?',
        steps: [
          'Open **My Profile**: click your name at the bottom of the menu, or on a phone tap the circle with your initials at the top right.',
          'Click **Edit Profile**, change your name or phone number, then click **Save Changes**.',
        ],
        a: ['Your email address cannot be changed here. Ask the front desk if it is wrong.'],
        keywords: 'profile name phone number edit change update details email',
      },
    ],
  },
  {
    id: 'trainers',
    title: 'For trainers',
    audience: 'trainer',
    intro: 'Getting approved, taking bookings and managing your sessions.',
    topics: [
      {
        id: 'trainer-approval',
        q: 'I registered as a trainer. Why can members not book me?',
        a: [
          'New trainer accounts must be approved by the gym first. Until a manager approves you, you can log in but you are not listed for booking.',
          'Ask the gym manager to approve your account. After that, check that **Available for new bookings** is switched on in your dashboard.',
        ],
        keywords: 'trainer approve approval pending not listed not showing new trainer cannot be booked',
      },
      {
        id: 'trainer-availability',
        q: 'How do I pause or resume new bookings?',
        a: [
          'On your **Dashboard**, use the **Available for new bookings** switch.',
          'Switching it off hides you from members who are booking. Sessions already booked are not affected. Switch it on again when you are ready.',
        ],
        keywords: 'available availability pause stop bookings holiday leave busy hide switch toggle',
      },
      {
        id: 'trainer-sessions',
        q: 'How do I see and manage my sessions?',
        a: [
          '**Dashboard** shows your next sessions. **Schedule** shows the week as a timetable; use the arrows to move between weeks.',
          '**Sessions** lists everything under three tabs: **Upcoming**, **Completed** and **Cancelled**.',
          'After a session, click **Mark Complete**. If you cannot make it, click **Cancel**. Both happen at once with no second question, so click carefully.',
        ],
        keywords: 'sessions schedule timetable mark complete completed cancel cancelled upcoming week calendar',
      },
      {
        id: 'trainer-clients',
        q: 'Who are my clients?',
        a: ['**Clients** lists every member who has booked a session with you, with how many sessions they have had and their latest booking.'],
        keywords: 'clients members list who booked',
      },
    ],
  },
  {
    id: 'staff',
    title: 'For front-desk staff',
    audience: 'staff',
    intro: 'Recording payments, checking members in and managing accounts. Use your own account: every payment and check-in records who did it.',
    topics: [
      {
        id: 'staff-first-day',
        q: 'What do I do on my first day?',
        steps: [
          'Go to **Staff log in** and sign in with your own email and password. Never share your account.',
          'Open **General Settings**, find **Your name**, type your full name and click **Save name**. It is printed on receipts as "Recorded by".',
        ],
        keywords: 'first day staff admin setup set up name start new attendant',
      },
      {
        id: 'record-payment',
        q: 'How do I record a payment?',
        steps: [
          'Click **Members** and search for the member by name or email.',
          'Click **Record payment** on their row.',
          `Choose the plan: **Monthly Membership (${MONTHLY})** or **Day Pass (${DAY_PASS})**.`,
          'Under **Paid by**, choose **Cash** or **Bank transfer**.',
          'Check **Amount received**. Only change it if the manager agreed a different amount, and write the reason in **Note**.',
          'Bank transfer: type the transfer reference. Cash: type the paper receipt-book number if you used one.',
          'Click **Record**. You will see **Payment recorded** and a receipt number (GT-…). The plan starts at once.',
        ],
        a: ['A member with an active monthly plan cannot be sold a day pass; the form says so. Paying monthly again adds 30 more days.'],
        keywords: 'record payment take money cash transfer member paid pay collect front desk',
      },
      {
        id: 'payment-mistake',
        q: 'I recorded a payment by mistake',
        a: [
          'Do not record another payment to correct it. A payment cannot be cancelled in GymTrace yet.',
          'Write down the receipt number (GT-…) and tell the manager the same day.',
        ],
        keywords: 'mistake wrong payment error void refund cancel payment undo reverse',
      },
      {
        id: 'print-receipt',
        q: 'How do I print a receipt for a member?',
        a: [
          'Straight after recording: click **View receipt**, then **Print / Save PDF**.',
          'Later: open **Payments**, find the payment, click **Receipt**, then **Print / Save PDF**.',
        ],
        keywords: 'print receipt pdf member copy proof',
      },
      {
        id: 'scan-member',
        q: 'How do I check a member in with their QR code?',
        steps: [
          'Click **Check-in Scanner** (**Scan** on a phone). Allow the camera if the browser asks.',
          'The member taps **Generate QR** on their phone. Hold the phone in front of the camera.',
          'Read the result. **Check that the name on screen is the person in front of you.**',
          'Click **Scan Next Member**.',
        ],
        keywords: 'scan scanner qr check in checkin camera member entry admit',
      },
      {
        id: 'manual-check-in',
        q: 'The member\'s phone is dead. How do I check them in?',
        steps: [
          '**Ask for their student or staff ID card first** and check the name and photo.',
          'On the scanner page, under **Manual Check-in**, type the email address they registered with.',
          'Click **Check In** and read the result as for a QR scan.',
        ],
        a: ['Never check someone in without seeing their ID card. Manual check-in has no QR code to prove who they are.'],
        keywords: 'manual check in checkin email no phone dead battery no data camera broken id card',
      },
      {
        id: 'scanner-messages',
        q: 'What do the scanner messages mean?',
        a: [
          '**Access Granted:** paid up, and the visit is recorded. Let them in.',
          '**Already Checked In:** this member was let in within the last 5 minutes and nothing extra was charged. Check the person is the member named on screen before letting them in.',
          '**Invalid or Expired QR Code:** the code is over a minute old (for example a screenshot). Ask for the live code.',
          '**This QR code has already been used:** ask the member for a new code.',
          '**Member Not Found:** no account with that email. Check the spelling; they may need to register.',
          '**No active plan / membership has expired / day pass has expired:** take a payment, then scan again.',
          '**Today\'s day pass has already been used:** a day pass is one entry. They need another day pass or a monthly plan.',
          '**Account deactivated. Entry refused:** do not let them in. Refer them to the manager.',
          '**Camera Error:** allow the camera for the site (lock icon in the address bar), or use manual check-in.',
          '**Your session has expired:** sign in again. **Network error:** check the internet connection.',
        ],
        keywords: 'scanner message access granted denied already checked in invalid expired used not found camera error refused meaning',
      },
      {
        id: 'deactivate-account',
        q: 'How do I deactivate or reactivate an account?',
        steps: [
          'Open **Members** (or **Trainers**) and find the person.',
          'Click the person-with-a-cross icon (**Deactivate**), write a short reason and click **Deactivate**.',
          'To undo it, click the person-with-a-tick icon (**Reactivate**), then **Reactivate**.',
        ],
        a: [
          'Deactivating signs the person out at once and stops them logging in or checking in. Nothing is deleted: their payments and visits stay on record.',
          'Only deactivate an account when the manager says so.',
        ],
        keywords: 'deactivate reactivate block ban disable enable remove member trainer account suspend delete',
      },
      {
        id: 'approve-trainer',
        q: 'How do I approve a new trainer?',
        a: [
          'Open **Trainers**. A new trainer shows **Not approved**. Click **Approve for booking** so members can book them.',
          '**Hide from booking** removes a trainer from the booking list again. **Trainer has paused bookings** means the trainer switched their own availability off.',
        ],
        keywords: 'approve trainer new trainer hide from booking not approved pending manager',
      },
      {
        id: 'end-of-day',
        q: 'What do I do at the end of the day?',
        a: [
          'Open **Payments**. The **Today** card shows the totals for cash and transfer.',
          'The cash total should match the money in the cash box. Report any difference to the manager the same day.',
        ],
        keywords: 'end of day close cash box total reconcile balance today payments report',
      },
      {
        id: 'dashboard-reports',
        q: 'What do the dashboard and reports show?',
        a: [
          '**Dashboard:** members with an active plan (and how many are registered), trainers who can be booked, today\'s check-ins, a chart of the last 7 days, and recent activity.',
          '**Reports:** attendance for the last 7 days, new registrations for the last 6 months, and bookings.',
        ],
        keywords: 'dashboard reports analytics statistics numbers active members chart overview',
      },
    ],
  },
];

export const AUDIENCES = [
  { id: 'all', label: 'All' },
  { id: 'member', label: 'Members' },
  { id: 'trainer', label: 'Trainers' },
  { id: 'staff', label: 'Front desk' },
];

/** Every topic as a flat list, each carrying its section's id, title and audience. */
export const HELP_TOPICS = HELP_SECTIONS.flatMap((s) =>
  s.topics.map((t) => ({ ...t, sectionId: s.id, sectionTitle: s.title, audience: s.audience })),
);
