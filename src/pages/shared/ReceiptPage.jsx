import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPayment } from '../../services/paymentService';
import { dashboardPath } from '../../lib/roles';
import { PLANS, formatDate, formatNaira, paymentMethodLabel, toMillis } from '../../lib/subscription';
import logo from '../../assets/logo.png';

/**
 * Printable receipt for one payment: online card (simulated) or recorded at
 * the front desk (cash / bank transfer). Members can open their own; admins
 * can open any. Firestore rules enforce that, not this page.
 */
const ReceiptPage = () => {
  const { paymentId } = useParams();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing

  useEffect(() => {
    let cancelled = false;
    getPayment(paymentId)
      .then((p) => {
        if (cancelled) return;
        setPayment(p);
        setState(p ? 'ready' : 'missing');
      })
      .catch((error) => {
        // permission-denied looks the same as not found to the viewer.
        console.error('Failed to load receipt', error);
        if (!cancelled) setState('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const back = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(userData?.role === 'admin' ? '/admin/payments' : '/member/payments');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between mb-4 print:hidden">
          <button onClick={back} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} /> Back
          </button>
          {state === 'ready' && payment.status === 'success' && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 text-sm font-semibold bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              <Printer size={16} /> Print / Save PDF
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 print:shadow-none print:border-0">
          {state === 'loading' && <p className="text-center text-gray-500 py-12">Loading receipt…</p>}

          {state === 'missing' && (
            <div className="text-center py-12">
              <h1 className="text-lg font-bold text-gray-900 mb-2">Receipt not found</h1>
              <p className="text-sm text-gray-500 mb-6">It doesn't exist, or it belongs to another account.</p>
              <button onClick={() => navigate(dashboardPath(userData?.role))} className="text-sm font-semibold text-primary hover:underline">
                Go to dashboard
              </button>
            </div>
          )}

          {state === 'ready' && payment.status !== 'success' && (
            <div className="text-center py-12">
              <h1 className="text-lg font-bold text-gray-900 mb-2">No receipt: this payment failed</h1>
              <p className="text-sm text-gray-500">{payment.failureReason || 'The payment did not go through.'}</p>
            </div>
          )}

          {state === 'ready' && payment.status === 'success' && <ReceiptBody payment={payment} />}
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-6 py-2 text-sm">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className="text-gray-900 text-right">{children}</span>
  </div>
);

const ReceiptBody = ({ payment: p }) => {
  const paidAt = toMillis(p.createdAt);
  const start = toMillis(p.periodStart);
  const end = toMillis(p.periodEnd);
  const simulated = p.gateway === 'simulated';
  const discounted = p.listPrice != null && p.listPrice !== p.amount;

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="h-12 w-auto" />
          <div>
            <p className="font-bold text-gray-900">Babcock University Fitness Centre</p>
            <p className="text-xs text-gray-500">GymTrace</p>
          </div>
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">PAID</span>
      </div>

      <h1 className="text-xl font-bold text-gray-900">Payment Receipt</h1>
      <p className="text-sm text-gray-500 mb-6 font-mono">{p.reference}</p>

      <div className="divide-y divide-gray-100">
        <Row label="Date">{formatDate(paidAt, true)}</Row>
        <Row label="Member">
          {p.memberName}
          <span className="block text-xs text-gray-500">{p.memberEmail}</span>
        </Row>
        <Row label="Plan">{p.planLabel}</Row>
        <Row label="Valid">
          {p.plan === PLANS.monthly.id
            ? `${formatDate(start)} to ${formatDate(end)}`
            : `${formatDate(start)}, one entry, until midnight`}
        </Row>
        <Row label="Payment method">
          {paymentMethodLabel(p)}
          {p.externalReference && <span className="block text-xs text-gray-500">Ref: {p.externalReference}</span>}
        </Row>
        {p.recordedBy && <Row label="Recorded by">{p.recordedBy.name || 'Staff'}</Row>}
        {discounted && <Row label="Plan price">{formatNaira(p.listPrice)}</Row>}
        {p.note && <Row label="Note">{p.note}</Row>}
      </div>

      <div className="flex justify-between items-center border-t-2 border-gray-900 mt-4 pt-4">
        <span className="font-bold text-gray-900">Amount paid</span>
        <span className="text-2xl font-bold text-gray-900">{formatNaira(p.amount)}</span>
      </div>

      {simulated && (
        <p className="mt-6 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Test receipt: this payment used the simulated card gateway. No real money was charged.
        </p>
      )}
      <p className="mt-6 text-xs text-gray-400 text-center">Payment ID: {p.id}</p>
    </>
  );
};

export default ReceiptPage;
