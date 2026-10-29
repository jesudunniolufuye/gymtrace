import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logo from '../../assets/logo.png';

// ---------------------------------------------------------------------------
// FILL THESE IN before launch, then have Babcock University's data protection
// contact review the whole notice. Anything still in [square brackets] is
// shown highlighted on the page so it can't be missed.
// ---------------------------------------------------------------------------
const DETAILS = {
  controller: '[Data controller: e.g. Babcock University Fitness Centre, Ilishan-Remo, Ogun State]',
  contactEmail: '[Privacy contact email]',
  dpo: "[Name or office of the university's Data Protection Officer]",
  retentionAccount: '[How long account and attendance records are kept, e.g. while you are a member plus 1 year]',
  retentionPayments: '[How long payment records are kept, e.g. 6 years for accounting]',
  hostingRegion: '[Region where data is stored, as set in Firebase]',
  lastUpdated: '[Date this notice was approved]',
};

/** Shows a value; unfilled [placeholders] are highlighted. */
const V = ({ k }) => {
  const value = DETAILS[k];
  return value.startsWith('[') ? <mark className="bg-amber-100 text-amber-900 px-1 rounded">{value}</mark> : <>{value}</>;
};

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    <div className="text-sm text-slate-700 leading-relaxed space-y-2">{children}</div>
  </section>
);

/**
 * Privacy notice, linked from registration. Describes what GymTrace
 * actually stores. Placeholders above must be completed before launch.
 */
const PrivacyPage = () => (
  <div className="min-h-screen bg-slate-50 py-10 px-4">
    <div className="max-w-3xl mx-auto">
      <Link to="/register" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6">
        <ArrowLeft size={16} /> Back to registration
      </Link>

      <article className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-8">
        <header className="flex items-center gap-4">
          <img src={logo} alt="" className="h-14 w-auto" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Privacy Notice</h1>
            <p className="text-sm text-slate-500">GymTrace · Last updated: <V k="lastUpdated" /></p>
          </div>
        </header>

        <Section title="Who we are">
          <p>
            GymTrace is the membership, payment and check-in system of <V k="controller" />, which is responsible for your
            personal data (the data controller). Questions or requests: <V k="contactEmail" />. Data Protection Officer: <V k="dpo" />.
          </p>
        </Section>

        <Section title="What we collect">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account:</strong> your name, email address, optional phone number, and whether you are a member or trainer. Your password is handled by Google Firebase Authentication; we never see or store it.</li>
            <li><strong>Membership and payments:</strong> your plan and its dates, and for each payment the amount, date, method (cash, bank transfer or card), any transfer or receipt reference, and which staff member recorded it. For card payments we keep only the card brand and last 4 digits, never the full card number.</li>
            <li><strong>Attendance:</strong> the date and time of each check-in and check-out, how you were checked in (QR code or manual), and which staff member did it.</li>
            <li><strong>Bookings:</strong> sessions you book with trainers (trainer, date, time, status).</li>
            <li><strong>Workout logs:</strong> exercises and details you choose to record.</li>
            <li><strong>Technical records:</strong> error logs with timestamps, used to fix problems.</li>
          </ul>
        </Section>

        <Section title="Why we use it">
          <ul className="list-disc pl-5 space-y-1">
            <li>To give you gym access and check that your membership is paid (your entry QR code works only while your plan is active).</li>
            <li>To record payments and issue receipts, and to keep financial records.</li>
            <li>To let you book trainers and keep your workout history.</li>
            <li>To keep the system secure and investigate problems.</li>
          </ul>
          <p>
            We rely on providing the service you signed up for, our legitimate interest in running the Fitness Centre safely,
            and our legal obligations for financial records. We do not sell your data or use it for advertising.
          </p>
        </Section>

        <Section title="Who can see it">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>You:</strong> your profile, plan, payments and receipts, attendance and workouts.</li>
            <li><strong>Fitness Centre staff (administrators):</strong> member details, plans, payments and attendance, to run the gym.</li>
            <li><strong>Trainers:</strong> your name and the sessions you book with them. They cannot see your payments or workout logs.</li>
            <li>
              <strong>Service providers</strong> who store and process data for us: Google Firebase (accounts and database) and
              Vercel (website hosting). Data is stored in <V k="hostingRegion" /> and may be processed outside Nigeria under
              their data protection terms.
            </li>
          </ul>
        </Section>

        <Section title="How long we keep it">
          <p>Account and attendance records: <V k="retentionAccount" />.</p>
          <p>Payment records: <V k="retentionPayments" />.</p>
          <p>If your account is deactivated, your records are kept for these periods and are not deleted straight away.</p>
        </Section>

        <Section title="Your rights">
          <p>Under the Nigeria Data Protection Act 2023 you can ask to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>see the personal data we hold about you;</li>
            <li>correct anything that is wrong (you can edit your name and phone number yourself);</li>
            <li>have your data deleted, unless we must keep it, for example payment records;</li>
            <li>object to or restrict how we use it, or withdraw consent where we rely on it.</li>
          </ul>
          <p>
            Contact <V k="contactEmail" />. If you are not satisfied with our response, you can complain to the
            Nigeria Data Protection Commission (NDPC).
          </p>
        </Section>

        <Section title="How we protect it">
          <p>
            All traffic is encrypted (HTTPS). Access is limited by role, and checked on our server and database, not only in
            the app. Entry QR codes are signed and expire after one minute so they can't be reused or shared.
          </p>
        </Section>

        <Section title="Changes">
          <p>If we change this notice we will update the date above and tell members of significant changes.</p>
        </Section>
      </article>
    </div>
  </div>
);

export default PrivacyPage;
