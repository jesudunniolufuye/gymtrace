import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, CheckCircle, Landmark, Loader2, Receipt, XCircle, CreditCard } from 'lucide-react';
import { getPaymentsSince } from '../../services/paymentService';
import {
  formatDate, formatNaira, paymentMethodLabel, startOfGymDay, startOfGymMonth, toMillis,
} from '../../lib/subscription';

const METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'transfer', label: 'Transfer', icon: Landmark },
  { id: 'card', label: 'Card (test)', icon: CreditCard },
];

/** Sum of successful payments, overall and per method. */
function totals(rows) {
  const byMethod = { cash: 0, transfer: 0, card: 0 };
  let total = 0;
  let count = 0;
  for (const p of rows) {
    if (p.status !== 'success') continue;
    const method = p.method ?? 'card';
    byMethod[method] = (byMethod[method] ?? 0) + p.amount;
    total += p.amount;
    count += 1;
  }
  return { total, count, byMethod };
}

/**
 * Admin payments (FR17 payment summary): this month's payments with today's
 * and the month's totals per method, for reconciling the cash box.
 */
const PaymentsPage = () => {
  const [now] = useState(() => Date.now());
  const monthStart = startOfGymMonth(now);
  const dayStart = startOfGymDay(now);

  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    getPaymentsSince(monthStart)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setState('ready');
      })
      .catch((error) => {
        console.error('Failed to load payments', error);
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [monthStart]);

  const today = totals(rows.filter((p) => (toMillis(p.createdAt) ?? 0) >= dayStart));
  const month = totals(rows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-500">Since {formatDate(monthStart)}. Record new front-desk payments from Members.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard title="Today" data={today} />
        <SummaryCard title="This month" data={month} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Recorded by</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3"><span className="sr-only">Receipt</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {state === 'loading' && (
                <tr><td colSpan="8" className="px-4 py-12 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading payments…</td></tr>
              )}
              {state === 'error' && (
                <tr><td colSpan="8" className="px-4 py-12 text-center text-red-600">Could not load payments. Refresh to try again.</td></tr>
              )}
              {state === 'ready' && rows.length === 0 && (
                <tr><td colSpan="8" className="px-4 py-12 text-center text-gray-500">No payments this month yet.</td></tr>
              )}
              {state === 'ready' &&
                rows.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {formatDate(toMillis(p.createdAt), true)}
                      <div className="text-xs text-gray-400 font-mono">{p.reference}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.memberName}</div>
                      <div className="text-xs text-gray-500">{p.memberEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.planLabel}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">{formatNaira(p.amount)}</span>
                      {p.listPrice != null && p.listPrice !== p.amount && (
                        <div className="text-xs text-amber-700" title={p.note || ''}>price {formatNaira(p.listPrice)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {paymentMethodLabel(p)}
                      {p.externalReference && <div className="text-xs text-gray-400">Ref: {p.externalReference}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.recordedBy?.name || (p.method === 'card' || !p.method ? 'Online' : '—')}</td>
                    <td className="px-4 py-3">
                      {p.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle size={12} /> Paid</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700" title={p.failureReason}><XCircle size={12} /> Failed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'success' && (
                        <Link to={`/receipts/${p.id}`} className="inline-flex items-center gap-1 text-blue-600 font-medium hover:underline">
                          <Receipt size={14} /> Receipt
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {state === 'ready' && rows.length >= 500 && (
          <p className="p-3 text-xs text-gray-500 border-t border-gray-100">Showing the latest 500 payments this month.</p>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ title, data }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
    <p className="text-sm text-gray-500 font-medium">{title}</p>
    <p className="text-3xl font-bold text-gray-900 mt-1">{formatNaira(data.total)}</p>
    <p className="text-xs text-gray-400 mb-4">{data.count} successful payment{data.count === 1 ? '' : 's'}</p>
    <div className="grid grid-cols-3 gap-2">
      {METHODS.map((m) => {
        const Icon = m.icon;
        return (
          <div key={m.id} className="rounded-lg bg-gray-50 p-2">
            <p className="text-xs text-gray-500 flex items-center gap-1"><Icon size={12} />{m.label}</p>
            <p className="text-sm font-semibold text-gray-900">{formatNaira(data.byMethod[m.id] ?? 0)}</p>
          </div>
        );
      })}
    </div>
  </div>
);

export default PaymentsPage;
