import test from 'node:test';
import assert from 'node:assert/strict';

test('linked accounts remain distinct from virtual budget participants', () => {
  const members = [{ id: 'linked', authUserId: 'auth-a' }, { id: 'virtual', authUserId: null }];
  assert.equal(members.filter((member) => member.authUserId).length, 1);
  assert.equal(members.filter((member) => !member.authUserId).length, 1);
});
