import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CodeExecutionService } from '../../src/modules/problems/codeExecution.service.js';
import { AppError, BadRequestError } from '../../src/shared/errors/index.js';

describe('CodeExecutionService', () => {
  it('rejects missing test cases and unsupported C++ harness execution', async () => {
    const service = new CodeExecutionService();

    await assert.rejects(() => service.runTestCases({
      sourceCode: 'function solution() {}',
      language: 'javascript',
      testCases: [],
    }), BadRequestError);

    await assert.rejects(() => service.runTestCases({
      sourceCode: 'int main() { return 0; }',
      language: 'cpp',
      testCases: [{ input: '1', expectedOutput: '1', isHidden: false }],
    }), BadRequestError);
  });

  it('normalizes Judge0 output, hidden cases, and pass counts without external network calls', async () => {
    const service = new CodeExecutionService();
    Object.assign(service, {
      runSubmission: async () => ({
        stdout: Buffer.from('[1,2]\n', 'utf8').toString('base64'),
        status: { id: 3, description: 'Accepted' },
        time: '0.01',
        memory: 1024,
      }),
    });

    const result = await service.runTestCases({
      sourceCode: 'function solution() { return [1, 2]; }',
      language: 'javascript',
      testCases: [{ input: '[1,2]', expectedOutput: '[1,2]', isHidden: true }],
    });

    assert.equal(result.allPassed, true);
    assert.equal(result.passedCount, 1);
    assert.equal(result.testCases[0].input, 'Hidden test case');
    assert.equal(result.testCases[0].expectedOutput, 'Hidden expected output');
  });

  it('wraps detected function names and named arguments from seeded problems', async () => {
    const service = new CodeExecutionService();
    const submissions: string[] = [];

    Object.assign(service, {
      runSubmission: async (input: { sourceCode: string; expectedOutput: string }) => {
        submissions.push(input.sourceCode);
        return {
          stdout: Buffer.from(input.expectedOutput, 'utf8').toString('base64'),
          status: { id: 3, description: 'Accepted' },
        };
      },
    });

    const result = await service.runTestCases({
      sourceCode: 'function twoSum(nums, target) { return [0, 1]; }',
      language: 'javascript',
      testCases: [{ input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]', isHidden: false }],
    });

    assert.equal(result.allPassed, true);
    assert.match(submissions[0], /twoSum/);
    assert.match(submissions[0], /\[\[2,7,11,15\],9\]/);
  });

  it('surfaces upstream execution failures without waiting on real network', async () => {
    const service = new CodeExecutionService();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ message: 'failed' }), { status: 502 })) as typeof fetch;

    try {
      await assert.rejects(() => service.runTestCases({
        sourceCode: 'function solution() { return 1; }',
        language: 'javascript',
        testCases: [{ input: '[]', expectedOutput: '1', isHidden: false }],
      }), AppError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
