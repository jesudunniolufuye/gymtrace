import { auth } from "../lib/firebase";

/** Error from our API, with a message that is safe to show the user. */
export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/** POSTs JSON to /api/<path> with the signed-in user's Firebase ID token. */
export async function apiPost(path, body) {
  const user = auth.currentUser;
  if (!user) throw new ApiError("You are signed out. Please sign in again.", 401);
  const token = await user.getIdToken();

  let response;
  try {
    response = await fetch(`/api/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Network error. Check your connection and try again.", 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || `Request failed (${response.status}).`, response.status, data);
  }
  return data;
}
