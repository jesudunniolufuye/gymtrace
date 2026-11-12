import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AUDIENCES, HELP_SECTIONS, HELP_TOPICS } from '../../content/helpContent';
import { searchHelp } from '../../lib/helpSearch';
import { dashboardPath } from '../../lib/roles';
import logo from '../../assets/logo.png';

const AUDIENCE_FOR_ROLE = { member: 'member', trainer: 'trainer', admin: 'staff' };

/** Renders text with **bold** parts. */
const Rich = ({ text }) =>
  text.split('**').map((part, i) => (i % 2 ? <strong key={i} className="font-semibold text-slate-900">{part}</strong> : <React.Fragment key={i}>{part}</React.Fragment>));

const Topic = ({ topic, open = false, showSection = false }) => (
  <details open={open} className="group bg-white rounded-2xl border border-slate-100">
    <summary className="flex items-start justify-between gap-3 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
      <span className="min-w-0">
        <span className="block font-semibold text-slate-900">{topic.q}</span>
        {showSection && <span className="block text-xs text-slate-500 mt-0.5">{topic.sectionTitle}</span>}
      </span>
      <ChevronDown size={18} className="shrink-0 mt-1 text-slate-400 transition-transform group-open:rotate-180" />
    </summary>
    <div className="px-4 pb-4 space-y-3 text-sm text-slate-700 leading-relaxed break-words">
      {topic.steps?.length > 0 && (
        <ol className="list-decimal pl-5 space-y-1.5">
          {topic.steps.map((step) => <li key={step}><Rich text={step} /></li>)}
        </ol>
      )}
      {(topic.a ?? []).map((p) => <p key={p}><Rich text={p} /></p>)}
    </div>
  </details>
);

/**
 * Help: the user manual with a search box. Public, so it also works before
 * logging in. Content comes from src/content/helpContent.js.
 */
const HelpPage = () => {
  const { userData } = useAuth();
  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState(null); // null = follow the signed-in role
  const activeAudience = audience ?? AUDIENCE_FOR_ROLE[userData?.role] ?? 'all';
  const searching = query.trim().length > 0;
  const results = useMemo(() => searchHelp(HELP_TOPICS, query, activeAudience), [query, activeAudience]);
  const visibleIds = useMemo(() => new Set(results.map((t) => t.id)), [results]);
  const back = userData?.role ? { to: dashboardPath(userData.role), label: 'Back to dashboard' } : { to: '/', label: 'Back to home' };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="" className="h-7 w-auto" />
            <span className="font-bold tracking-tight">GYMTRACE</span>
          </Link>
          <Link to={back.to} className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft size={14} /> {back.label}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <section className="space-y-4">
          <h1 className="text-3xl font-black text-slate-900">Help</h1>
          <p className="text-slate-600">Type a few words about your problem, or browse the manual below.</p>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search help"
              placeholder="e.g. forgot password"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Show help for">
            {AUDIENCES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAudience(a.id)}
                aria-pressed={activeAudience === a.id}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeAudience === a.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </section>

        {searching ? (
          <section className="space-y-3" aria-live="polite">
            <p className="text-sm text-slate-600">
              {results.length === 0 ? 'No answers found.' : `${results.length} answer${results.length === 1 ? '' : 's'} found`}
            </p>
            {results.map((t, i) => <Topic key={t.id} topic={t} open={i === 0} showSection />)}
            {results.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 text-sm text-slate-600 space-y-2">
                <p>Try fewer or different words, for example “receipt” or “booking”.</p>
                <p>If you still can't find it, ask at the gym's front desk.</p>
                <button type="button" onClick={() => setQuery('')} className="text-emerald-700 font-semibold underline">
                  Show the whole manual
                </button>
              </div>
            )}
          </section>
        ) : (
          HELP_SECTIONS.filter((s) => s.topics.some((t) => visibleIds.has(t.id))).map((s) => (
            <section key={s.id} className="space-y-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{s.title}</h2>
                <p className="text-sm text-slate-600">{s.intro}</p>
              </div>
              {HELP_TOPICS.filter((t) => t.sectionId === s.id).map((t) => <Topic key={t.id} topic={t} />)}
            </section>
          ))
        )}
      </main>
    </div>
  );
};

export default HelpPage;
