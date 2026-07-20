import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInviteCode } from '../src/utils/inviteCode.js';

test('normalizes invitation code case, spaces and hyphens', () => {
  assert.equal(normalizeInviteCode(' ab8d - q2k9 '), 'AB8D-Q2K9');
});

test('keeps short invite input usable while typing', () => {
  assert.equal(normalizeInviteCode('ab8'), 'AB8');
});
