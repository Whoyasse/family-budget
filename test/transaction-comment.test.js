import test from 'node:test';
import assert from 'node:assert/strict';
import { isVisibleTransactionComment, normalizeTransactionComment } from '../src/utils/transactionComment.js';

test('keeps a transaction comment for create and update payloads', () => {
  assert.equal(normalizeTransactionComment('Покупки на неделю'), 'Покупки на неделю');
});

test('allows creating a transaction without a comment', () => {
  assert.equal(normalizeTransactionComment(undefined), '');
  assert.equal(normalizeTransactionComment(null), '');
});

test('allows removing an existing transaction comment with an empty value', () => {
  assert.equal(normalizeTransactionComment(''), '');
});

test('does not render empty comments and preserves long comment text', () => {
  const longComment = 'Комментарий '.repeat(40);
  assert.equal(isVisibleTransactionComment('   '), false);
  assert.equal(isVisibleTransactionComment(longComment), true);
  assert.equal(normalizeTransactionComment(longComment), longComment);
});
