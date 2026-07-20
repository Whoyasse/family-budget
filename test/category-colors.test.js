import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextCategoryColor, getStableCategoryColor, resolveCategoryColor } from '../src/utils/categoryColors.js';

test('new categories use a free palette color instead of the grey fallback', () => {
  const color = getNextCategoryColor([{ color: '#4ADE80' }, { color: '#F59E0B' }]);
  assert.notEqual(color, '#94A3B8');
  assert.notEqual(color, '#4ADE80');
  assert.notEqual(color, '#F59E0B');
});

test('legacy grey category has a stable non-grey analytics color', () => {
  const color = resolveCategoryColor({ name: 'Рестик', color: '#94A3B8' });
  assert.equal(color, getStableCategoryColor('Рестик'));
  assert.notEqual(color, '#94A3B8');
});
