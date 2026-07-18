import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getAnalyticsBarHeight,
  getIntensityClass,
  getSixMonthDays,
  toContributionDays,
} from '../dist-tests/features/dashboard/ui/components/ContributionHeatmap.helpers.js';

describe('Contribution heatmap helpers', () => {
  it('filters invalid contribution items', () => {
    const days = toContributionDays([{ date: '2026-07-18', totalCount: 2 }, null, 'bad']);

    assert.deepEqual(days, [{ date: '2026-07-18', totalCount: 2 }]);
  });

  it('maps contribution totals to stable intensity classes', () => {
    assert.equal(getIntensityClass(0), 'color-empty');
    assert.equal(getIntensityClass(2), 'color-scale-1');
    assert.equal(getIntensityClass(5), 'color-scale-2');
    assert.equal(getIntensityClass(8), 'color-scale-3');
    assert.equal(getIntensityClass(9), 'color-scale-4');
  });

  it('keeps known days while filling missing heatmap dates', () => {
    const days = getSixMonthDays(
      [{ date: '2026-07-18', totalCount: 5 }],
      new Date('2026-07-18T12:00:00'),
    );

    assert.equal(days.at(-1)?.date, '2026-07-18');
    assert.equal(days.at(-1)?.totalCount, 5);
    assert.ok(days.length >= 180);
  });

  it('keeps analytics bars visible for zero and small values', () => {
    assert.equal(getAnalyticsBarHeight(0, 20), 4);
    assert.equal(getAnalyticsBarHeight(1, 100), 8);
    assert.equal(getAnalyticsBarHeight(50, 100), 50);
  });
});
