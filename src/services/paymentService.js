import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { apiPost } from "./apiClient";

/**
 * Pays for a plan through the server (POST /api/pay). The server decides the
 * price and updates the subscription; the browser cannot.
 */
export const payForPlan = ({ plan, card, idempotencyKey }) =>
  apiPost("pay", { plan, card, idempotencyKey });

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
