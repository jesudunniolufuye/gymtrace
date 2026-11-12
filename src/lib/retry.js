/**
 * Run `fn`, trying again after a short wait if it throws. Used for reads that
 * can fail briefly (a dropped connection right after sign-in), so one blip does
 * not strand the person on an error screen.
 */
export async function retry(fn, { attempts = 3, delayMs = 800, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await sleep(delayMs * (i + 1));
    }
  }
  throw lastError;
}
