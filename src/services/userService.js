import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Create the user's profile right after registration.
 * The Firestore rules only accept exactly these fields: role must be
 * member or trainer, and trainers start inactive until an admin activates them.
 */
export const createUserDoc = async (uid, { name, email, role }) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    name,
    email,
    role,
    phone: "",
    status: role === "trainer" ? "inactive" : "active",
    createdAt: serverTimestamp(),
  });
};

/**
 * Fetch the user document from Firestore.
 */
export const getUserDoc = async (uid) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return { uid, ...snap.data() };
};

/**
 * Update fields on an existing user document.
 */
export const updateUserDoc = async (uid, fields) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, fields);
};
