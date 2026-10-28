// Rules for payments and the server-owned subscription field.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

let env;
const ctx = (uid) => env.authenticatedContext(uid, { email: `${uid}@test.dev`, email_verified: true }).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-gymtrace-rules-payments',
    firestore: { rules: readFileSync(process.env.RULES_FILE ?? 'firestore.rules', 'utf8') },
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'users/admin1'), { name: 'Admin', role: 'admin', status: 'active' });
    await setDoc(doc(db, 'users/mem1'), { name: 'M1', role: 'member', status: 'active' });
    await setDoc(doc(db, 'users/tr1'), { name: 'T1', role: 'trainer', status: 'active' });
    await setDoc(doc(db, 'payments/mem1_a'), { memberId: 'mem1', amount: 25000, status: 'success' });
    await setDoc(doc(db, 'payments/mem2_a'), { memberId: 'mem2', amount: 500, status: 'success' });
  });
});

test('member reads own payment history', async () => {
  await assertSucceeds(getDocs(query(collection(ctx('mem1'), 'payments'), where('memberId', '==', 'mem1'))));
  await assertSucceeds(getDoc(doc(ctx('mem1'), 'payments/mem1_a')));
});
test("member cannot read other members' payments or list all", async () => {
  await assertFails(getDoc(doc(ctx('mem1'), 'payments/mem2_a')));
  await assertFails(getDocs(collection(ctx('mem1'), 'payments')));
});
test('trainer cannot read member payments', async () => {
  await assertFails(getDoc(doc(ctx('tr1'), 'payments/mem1_a')));
});
test('admin can list all payments', async () => {
  await assertSucceeds(getDocs(collection(ctx('admin1'), 'payments')));
});
test('nobody can write payments from the client, not even admin', async () => {
  await assertFails(setDoc(doc(ctx('mem1'), 'payments/mem1_b'), { memberId: 'mem1', amount: 1, status: 'success' }));
  await assertFails(updateDoc(doc(ctx('mem1'), 'payments/mem1_a'), { amount: 1 }));
  await assertFails(setDoc(doc(ctx('admin1'), 'payments/x'), { memberId: 'mem1', amount: 1 }));
});
test('member cannot give themselves a subscription', async () => {
  await assertFails(updateDoc(doc(ctx('mem1'), 'users/mem1'), {
    subscription: { plan: 'monthly', expiresAt: new Date(Date.now() + 1e10), sessionCredits: 0 },
  }));
});
test('errorLogs are not readable or writable by clients', async () => {
  await assertFails(getDocs(collection(ctx('admin1'), 'errorLogs')));
  await assertFails(setDoc(doc(ctx('mem1'), 'errorLogs/x'), { message: 'hi' }));
});
