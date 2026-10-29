// Display-name check shared by registration and profile edit. Mirrors the
// length limits in firestore.rules (validName: 2 to 80 characters), but
// measured after trimming so a blank name is refused with a clear message.
export const NAME_MIN = 2;
export const NAME_MAX = 80;

export function validateName(raw) {
  const value = String(raw ?? '').trim();
  if (value.length < NAME_MIN) return { ok: false, value, message: `Name must be at least ${NAME_MIN} characters.` };
  if (value.length > NAME_MAX) return { ok: false, value, message: `Name must be ${NAME_MAX} characters or fewer.` };
  return { ok: true, value, message: '' };
}
