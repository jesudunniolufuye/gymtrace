// Security rules tests. Run with `npm run test:rules` (starts the Firestore
// emulator, so Java must be installed). Nothing here touches a real project.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, query,
  serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';

let env;

// Signed-in contexts. `email_verified` mirrors what Firebase Auth puts in the token.
const ctx = (uid, { verified = true, email = `${uid}@test.dev` } = {}) =>
  env.authenticatedContext(uid, { email, email_verified: verified }).firestore();

const seed = async (fn) => env.withSecurityRulesDisabled((c) => fn(c.firestore()));

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-gymtrace',
    firestore: { rules: readFileSync(process.env.RULES_FILE ?? 'firestore.rules', 'utf8') },
  });
});

after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await seed(async (db) => {
    await setDoc(doc(db, 'users/admin1'), { name: 'Admin', email: 'admin1@test.dev', role: 'admin', status: 'active', phone: '' });
    await setDoc(doc(db, 'users/mem1'), { name: 'Member One', email: 'mem1@test.dev', role: 'member', status: 'active', phone: '' });
    await setDoc(doc(db, 'users/mem2'), { name: 'Member Two', email: 'mem2@test.dev', role: 'member', status: 'active', phone: '' });
    await setDoc(doc(db, 'users/tr1'), { name: 'Trainer', email: 'tr1@test.dev', role: 'trainer', status: 'active', phone: '' });
    await setDoc(doc(db, 'users/tr2'), { name: 'Pending Trainer', email: 'tr2@test.dev', role: 'trainer', status: 'inactive', phone: '' });
  });
});

const newProfile = (uid, role, status) => ({
  name: 'New Person', email: `${uid}@test.dev`, role, phone: '', status, createdAt: serverTimestamp(),
});

describe('registration (users create)', () => {
  test('can register as a member (even before verifying email)', async () => {
    await assertSucceeds(setDoc(doc(ctx('n1', { verified: false }), 'users/n1'), newProfile('n1', 'member', 'active')));
  });
  test('trainer must start inactive', async () => {
    await assertSucceeds(setDoc(doc(ctx('n2'), 'users/n2'), newProfile('n2', 'trainer', 'inactive')));
    await assertFails(setDoc(doc(ctx('n3'), 'users/n3'), newProfile('n3', 'trainer', 'active')));
  });
  test('cannot self-register as admin', async () => {
    await assertFails(setDoc(doc(ctx('n4'), 'users/n4'), newProfile('n4', 'admin', 'active')));
  });
  test('cannot add subscription fields at registration', async () => {
    await assertFails(setDoc(doc(ctx('n5'), 'users/n5'), { ...newProfile('n5', 'member', 'active'), isPremium: true }));
  });
  test('cannot create a profile for someone else', async () => {
    await assertFails(setDoc(doc(ctx('n6'), 'users/other'), newProfile('n6', 'member', 'active')));
  });
});

describe('profile updates (privilege escalation)', () => {
  test('member CANNOT make themselves admin', async () => {
    await assertFails(updateDoc(doc(ctx('mem1'), 'users/mem1'), { role: 'admin' }));
  });
  test('member cannot grant themselves a subscription', async () => {
    await assertFails(updateDoc(doc(ctx('mem1'), 'users/mem1'), { isPremium: true }));
    await assertFails(updateDoc(doc(ctx('mem1'), 'users/mem1'), { subscription: { plan: 'monthly' } }));
  });
  test('trainer cannot activate themselves', async () => {
    await assertFails(updateDoc(doc(ctx('tr2'), 'users/tr2'), { status: 'active' }));
  });
  test('member can edit own name and phone', async () => {
    await assertSucceeds(updateDoc(doc(ctx('mem1'), 'users/mem1'), { name: 'Renamed', phone: '0800' }));
  });
  test('member cannot edit another user', async () => {
    await assertFails(updateDoc(doc(ctx('mem1'), 'users/mem2'), { name: 'Hacked' }));
  });
  test('unverified user cannot edit profile', async () => {
    await assertFails(updateDoc(doc(ctx('mem1', { verified: false }), 'users/mem1'), { name: 'X Y' }));
  });
  test('admin can change roles and status', async () => {
    await assertSucceeds(updateDoc(doc(ctx('admin1'), 'users/tr2'), { status: 'active' }));
  });
  test('an unverified admin has no admin powers', async () => {
    await assertFails(updateDoc(doc(ctx('admin1', { verified: false }), 'users/tr2'), { status: 'active' }));
  });
});

describe('profile reads', () => {
  test('member reads own profile, not other members', async () => {
    await assertSucceeds(getDoc(doc(ctx('mem1'), 'users/mem1')));
    await assertFails(getDoc(doc(ctx('mem1'), 'users/mem2')));
  });
  test('member can list trainers (for booking)', async () => {
    await assertSucceeds(getDocs(query(collection(ctx('mem1'), 'users'), where('role', '==', 'trainer'))));
  });
  test('member cannot list members', async () => {
    await assertFails(getDocs(query(collection(ctx('mem1'), 'users'), where('role', '==', 'member'))));
  });
  test('admin can list members', async () => {
    await assertSucceeds(getDocs(query(collection(ctx('admin1'), 'users'), where('role', '==', 'member'))));
  });
});

describe('attendance', () => {
  test('member cannot check themselves in', async () => {
    await assertFails(addDoc(collection(ctx('mem1'), 'attendance'), { memberId: 'mem1', memberName: 'M', checkIn: serverTimestamp(), checkOut: null, status: 'Active' }));
  });
  test('admin can record a check-in', async () => {
    await assertSucceeds(addDoc(collection(ctx('admin1'), 'attendance'), { memberId: 'mem1', memberName: 'M', checkIn: serverTimestamp(), checkOut: null, status: 'Active' }));
  });
  test('member can check out of own open record only', async () => {
    await seed((db) => setDoc(doc(db, 'attendance/a1'), { memberId: 'mem1', status: 'Active', checkOut: null }));
    await seed((db) => setDoc(doc(db, 'attendance/a2'), { memberId: 'mem2', status: 'Active', checkOut: null }));
    await assertSucceeds(updateDoc(doc(ctx('mem1'), 'attendance/a1'), { status: 'Completed', checkOut: serverTimestamp() }));
    await assertFails(updateDoc(doc(ctx('mem1'), 'attendance/a2'), { status: 'Completed', checkOut: serverTimestamp() }));
  });
  test('member cannot read others\' attendance', async () => {
    await seed((db) => setDoc(doc(db, 'attendance/a2'), { memberId: 'mem2', status: 'Active' }));
    await assertFails(getDoc(doc(ctx('mem1'), 'attendance/a2')));
  });
});

describe('payments', () => {
  test('member cannot write a payment record', async () => {
    await assertFails(addDoc(collection(ctx('mem1'), 'payments'), { memberId: 'mem1', amount: 25000 }));
  });
});

const booking = (memberId, trainerId) => ({
  memberId, memberName: 'Member One', trainerId, trainerName: 'Trainer',
  date: '2026-11-02', time: '09:00', sessionType: 'Personal Training', status: 'upcoming', createdAt: serverTimestamp(),
});

describe('bookings', () => {
  test('member can book an active trainer', async () => {
    await assertSucceeds(addDoc(collection(ctx('mem1'), 'bookings'), booking('mem1', 'tr1')));
  });
  test('member cannot book an inactive trainer or as someone else', async () => {
    await assertFails(addDoc(collection(ctx('mem1'), 'bookings'), booking('mem1', 'tr2')));
    await assertFails(addDoc(collection(ctx('mem1'), 'bookings'), booking('mem2', 'tr1')));
  });
  test('member may only cancel; trainer may complete', async () => {
    await seed((db) => setDoc(doc(db, 'bookings/b1'), { ...booking('mem1', 'tr1'), createdAt: new Date() }));
    await assertFails(updateDoc(doc(ctx('mem1'), 'bookings/b1'), { status: 'completed' }));
    await assertFails(updateDoc(doc(ctx('mem1'), 'bookings/b1'), { trainerId: 'tr2' }));
    await assertSucceeds(updateDoc(doc(ctx('tr1'), 'bookings/b1'), { status: 'completed' }));
  });
  test('member can cancel own upcoming booking', async () => {
    await seed((db) => setDoc(doc(db, 'bookings/b2'), { ...booking('mem1', 'tr1'), createdAt: new Date() }));
    await assertSucceeds(updateDoc(doc(ctx('mem1'), 'bookings/b2'), { status: 'cancelled' }));
  });
});

describe('workouts', () => {
  test('owner can log; trainer cannot edit or delete it', async () => {
    const ref = await assertSucceeds(addDoc(collection(ctx('mem1'), 'workouts'), {
      memberId: 'mem1', title: 'Leg day', duration: '45 mins', calories: '0 kcal',
      difficulty: 'Intermediate', date: '2026-10-28', exercises: [], createdAt: new Date(),
    }));
    await assertFails(deleteDoc(doc(ctx('tr1'), 'workouts', ref.id)));
    await assertFails(getDoc(doc(ctx('mem2'), 'workouts', ref.id)));
  });
});

describe('removed collections', () => {
  test('sessions collection is closed', async () => {
    await assertFails(addDoc(collection(ctx('tr1'), 'sessions'), { trainerId: 'tr1' }));
  });
});
