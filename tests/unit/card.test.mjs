import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { TEST_CARDS, cardBrand, expiryValid, luhnValid, validateCard } from '../../shared/card.js';

const NOW = new Date(Date.UTC(2026, 9, 29));
const good = { name: 'Ada Lovelace', number: '4084 0840 8408 4081', expiry: '12/28', cvc: '123' };

describe('card checks', () => {
  test('test cards are Luhn-valid', () => {
    for (const n of Object.values(TEST_CARDS)) assert.equal(luhnValid(n), true, n);
  });
  test('typo in the number fails Luhn', () => {
    assert.equal(luhnValid('4084084084084082'), false);
    assert.equal(luhnValid('1234'), false);
  });
  test('brands', () => {
    assert.equal(cardBrand('4084084084084081'), 'Visa');
    assert.equal(cardBrand('5399830000000008'), 'Mastercard');
    assert.equal(cardBrand('5061460410120223210'), 'Verve');
  });
  test('expiry: current month valid, last month invalid, bad format invalid', () => {
    assert.equal(expiryValid('10/26', NOW), true);
    assert.equal(expiryValid('09/26', NOW), false);
    assert.equal(expiryValid('13/30', NOW), false);
    assert.equal(expiryValid('1/30', NOW), false);
  });
  test('validateCard returns last4 and brand only', () => {
    assert.deepEqual(validateCard(good, NOW), { ok: true, last4: '4081', brand: 'Visa' });
  });
  test('validateCard names the failing field', () => {
    assert.equal(validateCard({ ...good, name: '' }, NOW).field, 'name');
    assert.equal(validateCard({ ...good, number: '4084084084084082' }, NOW).field, 'number');
    assert.equal(validateCard({ ...good, expiry: '01/20' }, NOW).field, 'expiry');
    assert.equal(validateCard({ ...good, cvc: '12' }, NOW).field, 'cvc');
    assert.equal(validateCard(undefined, NOW).ok, false);
  });
});
