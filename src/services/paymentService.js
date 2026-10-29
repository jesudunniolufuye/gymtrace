import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { apiGet, apiPost } from "./apiClient";

/**
 * Pays for a plan through the server (POST /api/pay). The server decides the
 * price and updates the subscription; the browser cannot.
 */
export const payForPlan = ({ plan, card, idempotencyKey }) =>
  apiPost("pay", { plan, card, idempotencyKey });

/** One payment (for its receipt). Rules allow the member's own, or any for admins. */
export const getPayment = async (paymentId) => {
  const snap = await getDoc(doc(db, "payments", paymentId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/** Which checkout to offer: { cardSimulator: boolean } (off in production). */
export const getPaymentOptions = () => apiGet("payment-options");

/** The member's own payments, newest first (FR7). */
export const getPaymentHistory = async (memberId, max = 50) => {
  const q = query(
    collection(db, "payments"),
    where("memberId", "==", memberId),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
