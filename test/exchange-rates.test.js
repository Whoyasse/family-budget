import test from 'node:test';
import assert from 'node:assert/strict';
import { EXCHANGE_RATE_TTL, isExchangeRateCacheFresh } from '../src/utils/exchangeRates.js';

test('exchange-rate cache stays valid for one hour only', () => {
  const now = 1_000_000;
  assert.equal(isExchangeRateCacheFresh({ savedAt: now - EXCHANGE_RATE_TTL + 1 }, now), true);
  assert.equal(isExchangeRateCacheFresh({ savedAt: now - EXCHANGE_RATE_TTL }, now), false);
});

test('exchange-rate cache rejects missing snapshots', () => {
  assert.equal(isExchangeRateCacheFresh(null), false);
  assert.equal(isExchangeRateCacheFresh({}), false);
});
