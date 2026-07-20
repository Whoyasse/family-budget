import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarHeatColors, getCalendarHeatColor } from '../src/data/calendarHeat.js';

test('uses accent heat levels based on operation count', () => {
  assert.equal(getCalendarHeatColor(0), calendarHeatColors.base);
  assert.equal(getCalendarHeatColor(1), calendarHeatColors.low);
  assert.equal(getCalendarHeatColor(2), calendarHeatColors.medium);
  assert.equal(getCalendarHeatColor(3), calendarHeatColors.medium);
  assert.equal(getCalendarHeatColor(4), calendarHeatColors.high);
  assert.equal(getCalendarHeatColor(8), calendarHeatColors.intense);
});
