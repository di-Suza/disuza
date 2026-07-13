import { AlertCircle, CheckCircle, Clock, Loader, XCircle } from 'lucide-react';

import type { CodeRunResult } from '@/features/collab/model/collab.types';

type ResultsPanelProps = {
  results: CodeRunResult | null;
  isRunning: boolean;
};

const ResultsPanel = ({ results, isRunning }: ResultsPanelProps) => {
  if (isRunning) {
    return (
      <section className="collab-results-panel">
        <div className="collab-results-state">
          <Loader className="spin" size={28} aria-hidden="true" />
          <p>Running test cases...</p>
        </div>
      </section>
    );
  }

  if (!results) {
    return (
      <section className="collab-results-panel">
        <div className="collab-results-state">
          <AlertCircle size={28} aria-hidden="true" />
          <p>Run your code to see results</p>
        </div>
      </section>
    );
  }

  const failedCount = results.totalCount - results.passedCount;
  const totalTime = results.testCases
    ?.map((testCase) => Number(testCase.time || 0))
    .reduce((acc, time) => acc + time, 0);

  return (
    <section className="collab-results-panel">
      <header>
        <h3>Test Results</h3>
        <div>
          <span className="is-pass"><CheckCircle size={15} aria-hidden="true" />{results.passedCount} Passed</span>
          <span className="is-fail"><XCircle size={15} aria-hidden="true" />{failedCount} Failed</span>
          <span><Clock size={15} aria-hidden="true" />{totalTime.toFixed(3)}s</span>
        </div>
      </header>

      <div className="collab-results-list">
        {results.testCases?.map((testCase) => (
          <article key={testCase.index} className={testCase.passed ? 'is-pass' : 'is-fail'}>
            <h4>
              {testCase.passed ? <CheckCircle size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
              Test Case {testCase.index}: {testCase.passed ? 'Passed' : 'Failed'}
            </h4>
            <p><b>Input:</b> <code>{testCase.input}</code></p>
            <p><b>Expected:</b> <code>{testCase.expectedOutput}</code></p>
            <p><b>Output:</b> <code>{testCase.error || testCase.output || '(no output)'}</code></p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ResultsPanel;
