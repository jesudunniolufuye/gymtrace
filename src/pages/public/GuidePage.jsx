import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logo from '../../assets/logo.png';

// Public reviewer guide. Mirrors docs/REVIEWER-GUIDE.md: keep the two in step.
const LOGINS = [
  { role: 'Admin (front desk)', email: 'molufuye420+reviewer@gmail.com', href: '/admin/login' },
  { role: 'Member (Tolu Martins)', email: 'molufuye420+demomember@gmail.com', href: '/login' },
  { role: 'Trainer (Bisi Lawal)', email: 'molufuye420+demotrainer@gmail.com', href: '/login' },
];

const STEPS = [
  {
    title: '(a) Admin dashboard, Members, Payments',
    minutes: 2,
    items: [
      'Sign in as the admin (reviewer) account.',
      'Dashboard: active members, bookable trainers, today\'s check-ins and a 7-day chart.',
      'Members: the Plan column shows active until a date, expired, day pass used, or deactivated.',
      'Payments: every recorded payment, with today\'s cash total.',
    ],
  },
  {
    title: '(b) Record a cash payment and open the receipt',
    minutes: 2,
    items: [
      'Members, search "kelechi", then Record payment.',
      'Choose Monthly, Cash, a receipt-book number such as RB-777, amount ₦25,000, then Record.',
      'Open View receipt: receipt number, validity dates, and who recorded it.',
      'Back on Payments, today\'s cash total has gone up by ₦25,000.',
    ],
  },
  {
    title: '(c) Show the member\'s QR code on a phone',
    minutes: 1,
    items: [
      'On a phone, sign in as the member (Tolu Martins).',
      'Open QR (Access QR Code). The code changes every minute. Turn brightness up.',
    ],
  },
  {
    title: '(d) Check the member in',
    minutes: 2,
    items: [
      'With a camera: in a second browser, sign in as admin, open Check-in Scanner, allow the camera and hold the phone to it. Expect "Access Granted". Scan the same code again: "This QR code has already been used".',
      'Without a camera: on the scanner page, type molufuye420+demomember@gmail.com into manual check-in. Expect "Access Granted".',
      'Try daniel.okoro@example.edu: "Monthly membership has expired."',
    ],
  },
  {
    title: '(e) Trainer view and booking',
    minutes: 2,
    items: [
      'Sign in as the trainer (Bisi Lawal). On the dashboard, switch "Available for new bookings" off, then on again.',
      'As the member, open Bookings and book a session with an available trainer. Cancel it under "My upcoming sessions".',
      'As the trainer, open Sessions to see the booking.',
    ],
  },
  {
    title: '(f) Register a brand-new account',
    minutes: 1,
    items: [
      'Open Register with any email address you control.',
      'You are asked to check your inbox for a verification link. Look in spam too.',
      'Until you click the link the account cannot sign in. Trainers also need admin approval before they can take bookings.',
    ],
  },
];

const LIMITS = [
  'No real payments. Online card payment is off in production; staff record cash and bank transfers.',
  'A recorded payment cannot be voided in the app.',
  'All staff are full admins. There is no separate attendant role.',
  'The privacy notice uses example details and has not been reviewed by a lawyer.',
  'Verification and reset emails land in spam.',
  'A QR code is valid for 60 seconds and works once. A live code could still be shown to someone else within that minute; staff check the name on screen.',
  'Demo data is reset before demonstrations.',
];

const GuidePage = () => (
  <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
    <header className="bg-white border-b border-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="GYMTRACE" className="h-7 w-auto" />
          <span className="font-bold tracking-tight">GYMTRACE</span>
        </Link>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <ArrowLeft size={14} /> Back to home
        </Link>
      </div>
    </header>

    <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-black text-slate-900">Reviewer guide</h1>
        <p className="text-slate-600 leading-relaxed">
          GymTrace is a showcase of a gym access system for Babcock University Fitness Centre: members, trainers and
          front-desk staff. It uses demo data. No real money moves and no real person's data is held.
        </p>
        <p className="text-slate-600 leading-relaxed">
          Set a password for each account with <strong>Forgot password</strong> on the login page.
          <br />
          <span className="text-amber-700 font-medium">Emails land in spam. Check the spam folder first.</span>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Logins</h2>
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
          {LOGINS.map((l) => (
            <div key={l.email} className="p-4 flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="font-semibold">{l.role}</span>
              <span className="text-sm text-slate-600 break-all">{l.email}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-500">
          Admin sign-in: <code>/admin/login</code>. Member and trainer sign-in: <code>/login</code>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">A 10-minute tour</h2>
        {STEPS.map((s) => (
          <div key={s.title} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex justify-between items-baseline gap-4">
              <h3 className="font-bold text-slate-900">{s.title}</h3>
              <span className="text-xs text-slate-400 whitespace-nowrap">about {s.minutes} min</span>
            </div>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
              {s.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">What is simulated or limited</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          {LIMITS.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </section>

      <section className="space-y-2 text-sm text-slate-600 leading-relaxed">
        <h2 className="text-xl font-bold text-slate-900">Where to read more</h2>
        <p>
          The project report (what was built, how it was tested, security findings and known limits) is at{' '}
          <a className="text-emerald-700 underline" href="https://github.com/jesudunniolufuye/gymtrace/blob/main/docs/PROJECT-REPORT.md">
            docs/PROJECT-REPORT.md
          </a>.
        </p>
      </section>
    </main>
  </div>
);

export default GuidePage;
