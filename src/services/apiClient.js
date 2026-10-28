import { auth } from "../lib/firebase";

/** Error from our API, with a message that is safe to show the user. */
export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Calls /api/<path>. Sends the signed-in user's Firebase ID token when there
 * is one (the server decides whether the route needs it).
 */
async function request(method, path, body) {
  const headers = {};
  const user = auth.currentUser;
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
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

export const apiGet = (path) => request("GET", path);
export const apiPost = (path, body = {}) => request("POST", path, body);
