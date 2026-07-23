import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

import { getCodeRunSummary } from '../dist-tests/features/collab/model/codeExecution.helpers.js';
import ResultsPanel from '../dist-tests/features/collab/ui/components/ResultsPanel.js';

describe('Collab code execution results', () => {
  it('summarizes pass, fail, and execution time safely', () => {
    const summary = getCodeRunSummary({
      passedCount: 1,
      totalCount: 2,
      allPassed: false,
      testCases: [
        { index: 1, input: '[1]', expectedOutput: '1', output: '1', passed: true, isHidden: false, time: '0.015' },
        { index: 2, input: '[2]', expectedOutput: '4', output: '3', passed: false, isHidden: false, time: '0.020' },
      ],
    });

    assert.equal(summary.passedCount, 1);
    assert.equal(summary.failedCount, 1);
    assert.equal(summary.totalTimeLabel, '0.035s');
  });

  it('renders empty, running, and completed result states', () => {
    assert.match(
      renderToStaticMarkup(React.createElement(ResultsPanel, { results: null, isRunning: false })),
      /Run your code to see results/,
    );
    assert.match(
      renderToStaticMarkup(React.createElement(ResultsPanel, { results: null, isRunning: true })),
      /Running test cases/,
    );
    assert.match(
      renderToStaticMarkup(React.createElement(ResultsPanel, {
        isRunning: false,
        results: {
          passedCount: 1,
          totalCount: 1,
          allPassed: true,
          testCases: [
            { index: 1, input: '[1]', expectedOutput: '1', output: '1', passed: true, isHidden: false, time: '0.010' },
          ],
        },
      })),
      /1 Passed/,
    );
  });
});
