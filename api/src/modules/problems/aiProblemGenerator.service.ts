import { z } from 'zod';

import env from '../../config/env.js';
import { BadRequestError } from '../../shared/errors/index.js';
import {
  PROBLEM_DIFFICULTIES,
  type Problem,
} from './problem.model.js';

type GeneratedProblem = Pick<Problem, 'title' | 'description' | 'difficulty' | 'tags' | 'testCases' | 'boilerplate' | 'constraints'>;

type GeminiPart = {
  type?: string;
  text?: string;
};

type GeminiResponse = {
  output_text?: string;
  steps?: Array<{
    type?: string;
    content?: GeminiPart[];
  }>;
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

const generatedProblemSchema = z.object({
  title: z.string().trim().min(6).max(90),
  description: z.string().trim().min(80).max(4000),
  difficulty: z.enum(PROBLEM_DIFFICULTIES),
  tags: z.array(z.string().trim().min(2).max(30)).min(2).max(8),
  constraints: z.array(z.string().trim().min(2).max(180)).min(1).max(8),
  testCases: z.array(z.object({
    input: z.string().trim().min(1).max(800),
    expectedOutput: z.string().trim().min(1).max(800),
    isHidden: z.boolean(),
    explanation: z.string().trim().max(300).optional(),
  })).min(3).max(8),
  boilerplate: z.object({
    javascript: z.string().trim().min(20).max(2000),
    python: z.string().trim().min(12).max(2000),
    cpp: z.string().trim().min(20).max(2400),
  }),
}).strict().refine(
  (problem) => problem.testCases.filter((testCase) => !testCase.isHidden).length >= 2,
  { message: 'At least two visible test cases are required' },
).refine(
  (problem) => problem.testCases.some((testCase) => testCase.isHidden),
  { message: 'At least one hidden test case is required' },
);

const generatedProblemJsonSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'A concise original DSA problem title, 6 to 90 characters.',
    },
    description: {
      type: 'string',
      description: 'A self-contained problem statement with input meaning and expected task.',
    },
    difficulty: {
      type: 'string',
      enum: PROBLEM_DIFFICULTIES,
      description: 'Estimated difficulty.',
    },
    tags: {
      type: 'array',
      minItems: 2,
      maxItems: 8,
      items: { type: 'string' },
      description: 'Searchable algorithm and data-structure tags.',
    },
    constraints: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: { type: 'string' },
      description: 'Problem constraints.',
    },
    testCases: {
      type: 'array',
      minItems: 3,
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Function arguments as a comma-separated value list, for example: nums=[1,2,3], target=4',
          },
          expectedOutput: {
            type: 'string',
            description: 'The exact function return value expected by the code runner.',
          },
          isHidden: {
            type: 'boolean',
            description: 'Whether this case should be hidden from the user.',
          },
          explanation: {
            type: 'string',
            description: 'Optional brief visible-case explanation.',
          },
        },
        required: ['input', 'expectedOutput', 'isHidden'],
      },
    },
    boilerplate: {
      type: 'object',
      properties: {
        javascript: {
          type: 'string',
          description: 'JavaScript starter code exposing a solution(...) function.',
        },
        python: {
          type: 'string',
          description: 'Python starter code exposing a solution(...) function.',
        },
        cpp: {
          type: 'string',
          description: 'C++ starter code for future native runner support.',
        },
      },
      required: ['javascript', 'python', 'cpp'],
    },
  },
  required: ['title', 'description', 'difficulty', 'tags', 'constraints', 'testCases', 'boilerplate'],
};

function buildPrompt(userPrompt: string) {
  return `
Generate one original DSA coding problem for Disuza based on this user request:
"${userPrompt}"

Rules:
- Return only JSON that matches the provided schema.
- Do not copy known platform problem statements.
- Keep the problem deterministic and solvable with a pure function named solution.
- Test case input must be directly parseable as function arguments by this format: nums=[1,2,3], target=4 or n=5.
- expectedOutput must be the exact returned value, not a sentence.
- Include at least two visible test cases and at least one hidden test case.
- JavaScript boilerplate must define function solution(...args) { }.
- Python boilerplate must define def solution(...args):.
- Keep C++ boilerplate reasonable even though the current demo runner focuses on JS/Python function harnesses.
`.trim();
}

function extractJsonText(payload: GeminiResponse) {
  const stepText = payload.steps
    ?.filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content || [])
    .filter((part) => !part.type || part.type === 'text')
    .map((part) => part.text || '')
    .join('')
    .trim();

  const candidateText = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  const text = payload.output_text?.trim() || stepText || candidateText;

  if (!text) {
    throw new BadRequestError('AI problem generation returned an empty response.');
  }

  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function normalizeGeneratedProblem(problem: z.infer<typeof generatedProblemSchema>): GeneratedProblem {
  const seenTags = new Set<string>();
  const tags = problem.tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      const normalizedTag = tag.toLowerCase();
      if (seenTags.has(normalizedTag)) return false;
      seenTags.add(normalizedTag);
      return true;
    });

  return {
    ...problem,
    title: problem.title.trim(),
    description: problem.description.trim(),
    tags,
    constraints: problem.constraints.map((constraint) => constraint.trim()),
    testCases: [...problem.testCases]
      .map((testCase) => ({
        ...testCase,
        input: testCase.input.trim(),
        expectedOutput: testCase.expectedOutput.trim(),
        explanation: testCase.explanation?.trim(),
      }))
      .sort((left, right) => Number(left.isHidden) - Number(right.isHidden)),
    boilerplate: {
      javascript: problem.boilerplate.javascript.trim(),
      python: problem.boilerplate.python.trim(),
      cpp: problem.boilerplate.cpp.trim(),
    },
  };
}

class AIProblemGeneratorService {
  private getEndpoint() {
    return `${env.GEMINI_API_BASE_URL.replace(/\/$/, '')}/interactions`;
  }

  async generateProblem(userPrompt: string): Promise<GeneratedProblem> {
    if (!env.GEMINI_API_KEY) {
      throw new BadRequestError('AI problem generation is not configured yet. Add GEMINI_API_KEY to enable this feature.');
    }

    let response: Response;

    try {
      response = await fetch(this.getEndpoint(), {
        method: 'POST',
        signal: AbortSignal.timeout(env.GEMINI_TIMEOUT_MS),
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          model: env.GEMINI_MODEL,
          input: buildPrompt(userPrompt),
          system_instruction: 'Generate only one schema-valid JSON object. Do not include markdown, commentary, or extra keys.',
          response_format: [
            {
              type: 'text',
              mime_type: 'application/json',
              schema: generatedProblemJsonSchema,
            },
          ],
        }),
      });
    } catch {
      throw new BadRequestError('AI problem generation is currently unavailable. Please try again later.');
    }

    const payload = await response.json().catch(() => ({})) as GeminiResponse;

    if (!response.ok) {
      throw new BadRequestError(payload.error?.message || 'AI problem generation is currently unavailable. Please try again later.');
    }

    let rawProblem: unknown;

    try {
      rawProblem = JSON.parse(extractJsonText(payload));
    } catch {
      throw new BadRequestError('AI problem generation returned invalid JSON. Please try again.');
    }

    const parsedProblem = generatedProblemSchema.safeParse(rawProblem);

    if (!parsedProblem.success) {
      throw new BadRequestError('AI problem generation returned invalid problem data. Please try again.');
    }

    return normalizeGeneratedProblem(parsedProblem.data);
  }
}

const aiProblemGeneratorService = new AIProblemGeneratorService();

export { AIProblemGeneratorService, type GeneratedProblem };
export default aiProblemGeneratorService;
