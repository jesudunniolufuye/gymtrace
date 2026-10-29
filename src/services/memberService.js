import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const usersRef = collection(db, "users");

/**
 * Fetch all users whose role === 'member'.
 */
export const getAllMembers = async () => {
  const q = query(usersRef, where("role", "==", "member"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
};

/**
 * Update a member's profile fields (name, phone, status, plan, etc.).
 */
export const updateMember = async (uid, fields) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, fields);
};
