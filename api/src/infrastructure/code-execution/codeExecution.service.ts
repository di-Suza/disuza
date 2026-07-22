import env from '../../config/env.js';
import { AppError, BadRequestError } from '../../shared/errors/index.js';

const SUPPORTED_CODE_LANGUAGES = ['javascript', 'python', 'cpp'] as const;

type CodeExecutionLanguage = typeof SUPPORTED_CODE_LANGUAGES[number];

type CodeExecutionTestCase = {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
};

const pistonLanguageMap: Record<CodeExecutionLanguage, { language: string; version: string; fileName: string }> = {
  javascript: { language: 'javascript', version: '*', fileName: 'main.js' },
  python: { language: 'python', version: '*', fileName: 'main.py' },
  cpp: { language: 'cpp', version: '*', fileName: 'main.cpp' },
};

type ExecutionStatus = {
  id?: number;
  description?: string;
  code?: number | null;
  signal?: string | null;
  provider?: 'piston';
};

type PistonStage = {
  stdout?: string;
  stderr?: string;
  output?: string;
  code?: number | null;
  signal?: string | null;
};

type PistonExecutionResponse = {
  language?: string;
  version?: string;
  run?: PistonStage;
  compile?: PistonStage;
  message?: string;
};

type TestCaseResult = {
  index: number;
  input: string;
  expectedOutput: string;
  output: string;
  error: string;
  status?: ExecutionStatus;
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
  private getPistonConfig() {
    return {
      apiUrl: env.PISTON_API_URL.replace(/\/$/, ''),
      runTimeoutMs: env.PISTON_RUN_TIMEOUT_MS,
      compileTimeoutMs: env.PISTON_COMPILE_TIMEOUT_MS,
    };
  }

  private getPistonHeaders() {
    const { apiUrl, runTimeoutMs, compileTimeoutMs } = this.getPistonConfig();
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    return {
      apiUrl,
      headers,
      runTimeoutMs,
      compileTimeoutMs,
    };
  }

  private buildExecutionStatus(execution: PistonExecutionResponse): ExecutionStatus {
    const compileFailed = execution.compile?.code !== undefined
      && execution.compile.code !== null
      && execution.compile.code !== 0;
    const runFailed = execution.run?.code !== undefined
      && execution.run.code !== null
      && execution.run.code !== 0;
    const signal = execution.compile?.signal || execution.run?.signal || null;
    const failed = compileFailed || runFailed || Boolean(signal) || Boolean(execution.message);

    return {
      id: failed ? 4 : 3,
      description: failed ? 'Execution Error' : 'Accepted',
      code: execution.compile?.code ?? execution.run?.code ?? null,
      signal,
      provider: 'piston',
    };
  }

  private getExecutionError(execution: PistonExecutionResponse) {
    const compileError = execution.compile?.stderr || execution.compile?.output;
    const runError = execution.run?.stderr;
    const runFailedOutput = execution.run?.code && execution.run.code !== 0 ? execution.run.output : '';

    return normalizeOutput(compileError || runError || execution.message || runFailedOutput || '');
  }

  private async runSubmission(input: { sourceCode: string; language: CodeExecutionLanguage; expectedOutput: string }) {
    const { apiUrl, headers, runTimeoutMs, compileTimeoutMs } = this.getPistonHeaders();
    const runtime = pistonLanguageMap[input.language];

    if (!runtime) {
      throw new BadRequestError('Unsupported language');
    }

    const response = await fetch(`${apiUrl}/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [
          {
            name: runtime.fileName,
            content: input.sourceCode,
          },
        ],
        stdin: '',
        args: [],
        compile_timeout: compileTimeoutMs,
        run_timeout: runTimeoutMs,
        compile_memory_limit: -1,
        run_memory_limit: -1,
      }),
    });

    if (!response.ok) {
      throw new AppError('Code execution failed. Please try again.', 502);
    }

    const execution = await response.json() as PistonExecutionResponse;
    if (!execution.run && !execution.compile && !execution.message) {
      throw new AppError('Code execution returned an invalid response', 502);
    }

    return execution;
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

      const execution = await this.runSubmission({
        sourceCode: executableSource,
        language: input.language,
        expectedOutput: normalizeExpectedValue(testCase.expectedOutput),
      });

      const output = normalizeOutput(execution.run?.stdout || '');
      const expectedOutput = normalizeOutput(normalizeExpectedValue(testCase.expectedOutput));
      const errorOutput = this.getExecutionError(execution);
      const status = this.buildExecutionStatus(execution);
      const passed = status.id === 3 && output === expectedOutput && !errorOutput;

      results.push({
        index: index + 1,
        input: testCase.isHidden ? 'Hidden test case' : testCase.input,
        expectedOutput: testCase.isHidden ? 'Hidden expected output' : testCase.expectedOutput,
        output,
        error: errorOutput,
        status,
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
