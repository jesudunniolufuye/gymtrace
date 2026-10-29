// Browser-side helpers around the shared plan rules (shared/subscription.js).
import { PLANS, getSubscriptionStatus } from "../../shared/subscription.js";

export { PLANS, getSubscriptionStatus, toMillis } from "../../shared/subscription.js";

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
export const formatNaira = (amount) => naira.format(amount ?? 0);

export const formatDate = (ms, withTime = false) =>
  ms == null
    ? "—"
    : new Date(ms).toLocaleString("en-GB", {
        timeZone: "Africa/Lagos",
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      });

export const formatTime = (ms) =>
  ms == null ? "—" : new Date(ms).toLocaleTimeString("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" });

/** How a payment was made, e.g. "Visa •••• 4081", "Cash", "Bank transfer". */
export const paymentMethodLabel = (p) => {
  const method = p?.method ?? "card";
  if (method === "cash") return "Cash";
  if (method === "transfer") return "Bank transfer";
  return p?.cardBrand ? `${p.cardBrand} •••• ${p.cardLast4}` : "Card";
};

/** One-line description of a member's plan for dashboards and lists. */
export const describeSubscription = (subscription, nowMs = Date.now()) => {
  const s = getSubscriptionStatus(subscription, nowMs);
  if (s.active && s.plan === "monthly") return `${PLANS.monthly.label}, valid until ${formatDate(s.expiresAt)}`;
  if (s.active && s.plan === "session") return `${PLANS.session.label}: ${s.credits} entr${s.credits === 1 ? "y" : "ies"} left today`;
  if (s.reason === "expired") {
    return s.plan === "monthly" ? `${s.label} expired on ${formatDate(s.expiresAt)}` : "Day pass expired";
  }
  if (s.reason === "used") return "Day pass used";
  return "No active plan";
};
