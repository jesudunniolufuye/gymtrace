import { apiPost } from "./apiClient";

/**
 * Admin: deactivate or reactivate an account through the server, which also
 * disables/enables the Firebase login and ends open sessions.
 */
export const setAccountStatus = (userId, action, reason = "") =>
  apiPost("admin/set-account-status", { userId, action, reason });
