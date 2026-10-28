// Plain-language reasons why a member has no gym access right now.
export function noAccessMessage(status) {
  if (status.reason === 'used') return "Today's day pass has already been used.";
  if (status.reason === 'expired') {
    return status.plan === 'monthly' ? 'Monthly membership has expired.' : 'Day pass has expired.';
  }
  return 'No active plan. Payment is needed at the front desk.';
}
