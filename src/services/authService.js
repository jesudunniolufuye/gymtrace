import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  sendEmailVerification as firebaseSendEmailVerification,
  deleteUser,
} from "firebase/auth";
import { auth } from "../lib/firebase";

export const registerUser = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

export const loginUser = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const logoutUser = () => signOut(auth);

/**
 * Sends Firebase's password-reset email; the link returns to
 * /login?reset=1 (falls back to Firebase's own page if this domain isn't an
 * authorized domain).
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/login?reset=1` });
  } catch (error) {
    if (error.code === "auth/unauthorized-continue-uri" || error.code === "auth/invalid-continue-uri") {
      await sendPasswordResetEmail(auth, email);
    } else {
      throw error;
    }
  }
};

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

/** Removes a just-created auth account (used if profile creation fails). */
export const deleteAuthUser = (user) => deleteUser(user);

/**
 * Sends the Firebase verification email. After clicking the link the user is
 * sent back to /login?verified=1. That only works if the site's domain is in
 * Firebase Auth > Settings > Authorized domains; if it isn't, fall back to
 * Firebase's default page so the email still goes out.
 */
export const sendEmailVerification = async (user) => {
  try {
    await firebaseSendEmailVerification(user, {
      url: `${window.location.origin}/login?verified=1`,
    });
  } catch (error) {
    if (error.code === "auth/unauthorized-continue-uri" || error.code === "auth/invalid-continue-uri") {
      await firebaseSendEmailVerification(user);
    } else {
      throw error;
    }
  }
};
