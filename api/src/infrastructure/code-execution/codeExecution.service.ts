import env from '../../config/env.js';
import { AppError, BadRequestError } from '../../shared/errors/index.js';

const SUPPORTED_CODE_LANGUAGES = ['javascript', 'python', 'cpp'] as const;

type CodeExecutionLanguage = typeof SUPPORTED_CODE_LANGUAGES[number];

type CodeExecutionTestCase = {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
};

const languageIdMap: Record<CodeExecutionLanguage, number> = {
  javascript: 63,
  python: 71,
  cpp: 54,
};

type Judge0Status = {
  id?: number;
  description?: string;
};

type Judge0Submission = {
  token?: string;
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  message?: string;
  status?: Judge0Status;
  time?: string;
  memory?: number;
};

type TestCaseResult = {
  index: number;
  input: string;
  expectedOutput: string;
  output: string;
  error: string;
  status?: Judge0Status;
  time?: string;
  memory?: number;
  passed: boolean;
  isHidden: boolean;
};

type ExecutionResult = {
  testCases: TestCaseResult[];
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
};

function normalizeOutput(value = '') {
  return value.toString().trim().replace(/\r\n/g, '\n');
}

function encodeBase64(value = '') {
  return Buffer.from(value.toString(), 'utf8').toString('base64');
}

function decodeBase64(value = '') {
  if (!value) return '';
  return Buffer.from(value, 'base64').toString('utf8');
}

function parseTestValue(value: string) {
  const trimmedValue = value.trim();

  if (/^(['"])(?:\\.|(?!\1).)*\1$/s.test(trimmedValue)) {
    return trimmedValue.slice(1, -1);
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
    return Number(trimmedValue);
  }

  if (trimmedValue === 'true') return true;
  if (trimmedValue === 'false') return false;
  if (trimmedValue === 'null') return null;

  const jsonishValue = trimmedValue.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, content: string) => JSON.stringify(content));

  try {
    return JSON.parse(jsonishValue) as unknown;
  } catch {
    return trimmedValue;
  }
}

function normalizeExpectedValue(value: string) {
  const parsed = parseTestValue(value);
  return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
}

function splitTopLevel(value: string) {
  const parts: string[] = [];
  let buffer = '';
  let depth = 0;
  let quote: string | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const previousCharacter = value[index - 1];

    if ((character === '"' || character === "'") && previousCharacter !== '\\') {
      quote = quote === character ? null : quote || character;
    }

    if (!quote) {
      if (['[', '{', '('].includes(character)) depth += 1;
      if ([']', '}', ')'].includes(character)) depth = Math.max(0, depth - 1);

      if (character === ',' && depth === 0) {
        parts.push(buffer.trim());
        buffer = '';
        continue;
      }
    }

    buffer += character;
  }

  if (buffer.trim()) parts.push(buffer.trim());
  return parts;
}

function stripNamedValue(value: string) {
  const parts = value.split('=');
  if (parts.length < 2 || !/^[a-zA-Z_$][\w$.\[\]]*\s*$/.test(parts[0])) return value;
  return parts.slice(1).join('=').trim();
}

function getArgsFromInput(input: string) {
  const trimmedInput = input.trim();
  const topLevelParts = splitTopLevel(trimmedInput);
  const hasNamedParts = topLevelParts.some((part) => /^[a-zA-Z_$][\w$.\[\]]*\s*=/.test(part));

  if (hasNamedParts) {
    return topLevelParts.map((part) => parseTestValue(stripNamedValue(part)));
  }

  if (topLevelParts.length > 1 && !trimmedInput.startsWith('[') && !trimmedInput.startsWith('{')) {
    return topLevelParts.map((part) => parseTestValue(part));
  }

  return [parseTestValue(trimmedInput)];
}

function getJavaScriptCallableName(sourceCode: string) {
  const functionMatch = sourceCode.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
  const arrowMatch = sourceCode.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/);
  return functionMatch?.[1] || arrowMatch?.[1] || 'solution';
}

function getPythonCallableName(sourceCode: string) {
  return sourceCode.match(/def\s+([A-Za-z_]\w*)\s*\(/)?.[1] || 'solution';
}

function buildJavaScriptHarness(sourceCode: string, args: unknown[]) {
  const callableName = getJavaScriptCallableName(sourceCode);

  return `
${sourceCode}

const __args = ${JSON.stringify(args)};
const __candidate = typeof ${callableName} === "function" ? ${callableName} : (typeof solution === "function" ? solution : null);
if (!__candidate) {
  throw new Error("No callable function found. Define ${callableName}() or solution().");
}
const __result = __candidate(...__args);
if (typeof __result === "undefined") {
  console.log("");
} else if (typeof __result === "string") {
  console.log(__result);
} else {
  console.log(JSON.stringify(__result));
}
`;
}

function buildPythonHarness(sourceCode: string, args: unknown[]) {
  const callableName = getPythonCallableName(sourceCode);

  return `
${sourceCode}

import json
__args = json.loads(${JSON.stringify(JSON.stringify(args))})
__candidate = globals().get("${callableName}") or globals().get("solution")
if __candidate is None:
    raise Exception("No callable function found. Define ${callableName}() or solution().")
__result = __candidate(*__args)
if __result is None:
    print("")
elif isinstance(__result, str):
    print(__result)
else:
    print(json.dumps(__result, separators=(",", ":")))
`;
}

function buildExecutableSource(input: { sourceCode: string; language: CodeExecutionLanguage; testInput: string }) {
  const args = getArgsFromInput(input.testInput);

  if (input.language === 'javascript') return buildJavaScriptHarness(input.sourceCode, args);
  if (input.language === 'python') return buildPythonHarness(input.sourceCode, args);
  if (input.language === 'cpp') {
    throw new BadRequestError('C++ function harness needs problem signature metadata first');
  }

  return input.sourceCode;
}

class CodeExecutionService {
  private getJudge0Config() {
    if (!env.RAPIDAPI_JUDGE0_KEY) {
      throw new AppError('Code execution key is not configured', 500);
    }

    return {
      apiUrl: env.JUDGE0_API_URL,
      rapidApiHost: env.RAPIDAPI_JUDGE0_HOST,
      rapidApiKey: env.RAPIDAPI_JUDGE0_KEY,
    };
  }

  private getJudge0Headers() {
    const { apiUrl, rapidApiHost, rapidApiKey } = this.getJudge0Config();

    return {
      apiUrl,
      headers: {
        'content-type': 'application/json',
        'x-rapidapi-host': rapidApiHost,
        'x-rapidapi-key': rapidApiKey,
      },
    };
  }

  private async createSubmission(input: { sourceCode: string; language: CodeExecutionLanguage; expectedOutput: string }) {
    const { apiUrl, headers } = this.getJudge0Headers();
    const languageId = languageIdMap[input.language];

    if (!languageId) {
      throw new BadRequestError('Unsupported language');
    }

    const response = await fetch(`${apiUrl}/submissions?base64_encoded=true&wait=false&fields=*`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_code: encodeBase64(input.sourceCode),
        language_id: languageId,
        stdin: encodeBase64(''),
        expected_output: encodeBase64(input.expectedOutput),
      }),
    });

    if (!response.ok) {
      throw new AppError('Code execution failed. Please try again.', 502);
    }

    const submission = await response.json() as Judge0Submission;
    if (!submission.token) {
      throw new AppError('Code execution token not received', 502);
    }

    return submission.token;
  }

  private async getSubmission(token: string) {
    const { apiUrl, headers } = this.getJudge0Headers();
    const response = await fetch(`${apiUrl}/submissions/${token}?base64_encoded=true&fields=*`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new AppError('Code execution result fetch failed', 502);
    }

    return response.json() as Promise<Judge0Submission>;
  }

  private async waitForSubmission(token: string) {
    const maxAttempts = 15;
    const delayMs = 700;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const submission = await this.getSubmission(token);
      const statusId = submission.status?.id;

      if (statusId && statusId !== 1 && statusId !== 2) {
        return submission;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }

    throw new AppError('Code execution timed out', 504);
  }

  private async runSubmission(input: { sourceCode: string; language: CodeExecutionLanguage; expectedOutput: string }) {
    const token = await this.createSubmission(input);
    return this.waitForSubmission(token);
  }

  async runTestCases(input: {
    sourceCode: string;
    language: CodeExecutionLanguage;
    testCases: CodeExecutionTestCase[];
  }): Promise<ExecutionResult> {
    if (!Array.isArray(input.testCases) || input.testCases.length === 0) {
      throw new BadRequestError('No test cases found for this problem');
    }

    const results: TestCaseResult[] = [];

    for (const [index, testCase] of input.testCases.entries()) {
      const executableSource = buildExecutableSource({
        sourceCode: input.sourceCode,
        language: input.language,
        testInput: testCase.input,
      });

      const submission = await this.runSubmission({
        sourceCode: executableSource,
        language: input.language,
        expectedOutput: normalizeExpectedValue(testCase.expectedOutput),
      });

      const output = normalizeOutput(decodeBase64(submission.stdout || ''));
      const expectedOutput = normalizeOutput(normalizeExpectedValue(testCase.expectedOutput));
      const errorOutput = normalizeOutput(
        decodeBase64(submission.stderr || '')
        || decodeBase64(submission.compile_output || '')
        || submission.message
        || '',
      );
      const passed = submission.status?.id === 3 && output === expectedOutput && !errorOutput;

      results.push({
        index: index + 1,
        input: testCase.isHidden ? 'Hidden test case' : testCase.input,
        expectedOutput: testCase.isHidden ? 'Hidden expected output' : testCase.expectedOutput,
        output,
        error: errorOutput,
        status: submission.status,
        time: submission.time,
        memory: submission.memory,
        passed,
        isHidden: testCase.isHidden,
      });
    }

    const passedCount = results.filter((result) => result.passed).length;

    return {
      testCases: results,
      passedCount,
      totalCount: results.length,
      allPassed: passedCount === results.length,
    };
  }
}

const codeExecutionService = new CodeExecutionService();

export {
  CodeExecutionService,
  SUPPORTED_CODE_LANGUAGES,
  type CodeExecutionLanguage,
  type CodeExecutionTestCase,
  type ExecutionResult,
  type TestCaseResult,
};
export default codeExecutionService;
