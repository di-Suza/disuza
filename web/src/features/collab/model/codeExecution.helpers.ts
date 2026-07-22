import type { CodeRunResult, CodeRunResultCase } from './collab.types';

const toSafeNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getResultCases = (results: CodeRunResult | null): CodeRunResultCase[] => (
  Array.isArray(results?.testCases) ? results.testCases : []
);

const getCodeRunSummary = (results: CodeRunResult | null) => {
  const testCases = getResultCases(results);
  const totalCount = Math.max(toSafeNumber(results?.totalCount) || testCases.length, testCases.length);
  const passedCount = Math.min(Math.max(toSafeNumber(results?.passedCount), 0), totalCount);
  const failedCount = Math.max(totalCount - passedCount, 0);
  const totalTimeSeconds = testCases.reduce((total, testCase) => total + toSafeNumber(testCase.time), 0);

  return {
    failedCount,
    passedCount,
    testCases,
    totalCount,
    totalTimeLabel: `${totalTimeSeconds.toFixed(3)}s`,
  };
};

export { getCodeRunSummary };
